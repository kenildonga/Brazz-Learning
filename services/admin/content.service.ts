import { Response } from 'express';
import mongoose, { Model, Types } from 'mongoose';
import { AuthRequest, type AppStyle } from '../../middleware/auth';
import { getAppModels } from '../../models/appModels';
import { readIdParam, sendCaught, sendError, sendOk } from '../../utils/http';
import { PAGE_LIMIT, paginationMeta, parsePage } from '../../utils/pagination';
import { serializeCategory, serializePerson, serializeVideo } from '../../utils/serialize';
import { countVideosByCategory, escapeRegex, parseSearchQuery } from '../../utils/video';

type DocModel = Model<Record<string, unknown>>;
type PersonField = 'influencerIds' | 'pornstarIds';

function modelsFor(appStyle: AppStyle) {
  const { Category, Video, Pornstar, personIdField } = getAppModels(appStyle);
  return {
    categoryModel: Category as unknown as DocModel,
    videoModel: Video as unknown as DocModel,
    personModel: Pornstar as unknown as DocModel,
    personIdField,
  };
}

// Video saves and category/person deletes coordinate through short leases on the referenced row,
// which works on a standalone MongoDB server. A save holds referenceLeaseUntil while it writes; a
// delete holds deleteLeaseUntil while it checks for references. Neither can start while the other
// is live, and a crashed request's lease simply expires.
const LEASE_MS = 30_000;

const leaseFree = (field: 'referenceLeaseUntil' | 'deleteLeaseUntil', now: Date) => ({
  $or: [{ [field]: null }, { [field]: { $lte: now } }],
});

type ResolvedIds = { ok: true; ids: Types.ObjectId[] } | { ok: false; error: string };

async function claimIds(
  model: DocModel,
  ids: string[],
  label: string,
  now: Date,
): Promise<ResolvedIds> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const objectIds: Types.ObjectId[] = [];
  for (const id of unique) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { ok: false, error: `Invalid ${label} id` };
    }
    objectIds.push(new mongoose.Types.ObjectId(id));
  }
  if (objectIds.length) {
    const claimed = await model.updateMany(
      { _id: { $in: objectIds }, ...leaseFree('deleteLeaseUntil', now) },
      { $max: { referenceLeaseUntil: new Date(now.getTime() + LEASE_MS) } },
      { timestamps: false },
    );
    if (claimed.matchedCount !== objectIds.length) {
      return { ok: false, error: `One or more ${label} were not found` };
    }
  }
  return { ok: true, ids: objectIds };
}

type DeleteResult = 'deleted' | 'missing' | 'in-use' | 'busy';

async function deleteUnreferenced(
  model: DocModel,
  videoModel: DocModel,
  field: string,
  id: string,
): Promise<DeleteResult> {
  if (await videoModel.exists({ [field]: id })) return 'in-use';
  const now = new Date();
  const lease = new Date(now.getTime() + LEASE_MS);
  const claimed = await model.findOneAndUpdate(
    {
      _id: id,
      $and: [leaseFree('referenceLeaseUntil', now), leaseFree('deleteLeaseUntil', now)],
    },
    { $set: { deleteLeaseUntil: lease } },
    { timestamps: false },
  );
  if (!claimed) return (await model.exists({ _id: id })) ? 'busy' : 'missing';
  const release = () =>
    model.updateOne(
      { _id: id, deleteLeaseUntil: lease },
      { $unset: { deleteLeaseUntil: 1 } },
      { timestamps: false },
    );
  // Re-check under the lease: a save that started before the claim has finished writing by now.
  if (await videoModel.exists({ [field]: id })) {
    await release();
    return 'in-use';
  }
  // Refuse if this lease expired and a save claimed the row in the meantime.
  const deleted = await model.deleteOne({
    _id: id,
    deleteLeaseUntil: lease,
    ...leaseFree('referenceLeaseUntil', new Date()),
  });
  if (deleted.deletedCount) return 'deleted';
  await release();
  return 'busy';
}

class AdminContentService {
  listOptions = async (req: AuthRequest, res: Response) => {
    try {
      const { categoryModel, personModel } = modelsFor(req.appStyle as AppStyle);
      const kind = req.params.kind;
      if (kind !== 'categories' && kind !== 'people')
        return sendError(res, 400, 'Invalid option kind');
      const model = kind === 'categories' ? categoryModel : personModel;
      const ids = typeof req.query.ids === 'string' ? req.query.ids.split(',').filter(Boolean) : [];
      if (ids.length > 100 || ids.some((id) => !mongoose.Types.ObjectId.isValid(id)))
        return sendError(res, 400, 'Invalid option ids');
      const q = parseSearchQuery(req.query.q).slice(0, 120);
      const page = parsePage(req.query.page);
      const filter = ids.length
        ? { _id: { $in: ids } }
        : q
          ? { name: { $regex: escapeRegex(q), $options: 'i' } }
          : {};
      const [rows, total] = await Promise.all([
        model
          .find(filter, { name: 1 })
          .sort({ name: 1, _id: 1 })
          .skip((page - 1) * PAGE_LIMIT)
          .limit(PAGE_LIMIT)
          .lean(),
        model.countDocuments(filter),
      ]);
      return sendOk(
        res,
        'Options fetched',
        rows.map((row) => ({ value: String(row._id), label: String(row.name) })),
        paginationMeta(page, total),
      );
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  listCategories = async (req: AuthRequest, res: Response) => {
    try {
      const { categoryModel, videoModel } = modelsFor(req.appStyle as AppStyle);
      const page = parsePage(req.query.page);
      const skip = (page - 1) * PAGE_LIMIT;
      const q = parseSearchQuery(req.query.q);
      const filter = q
        ? {
            $or: [
              { name: { $regex: escapeRegex(q), $options: 'i' } },
              { slug: { $regex: escapeRegex(q), $options: 'i' } },
            ],
          }
        : {};
      const [rows, total] = await Promise.all([
        categoryModel.find(filter).sort({ name: 1 }).skip(skip).limit(PAGE_LIMIT).lean(),
        categoryModel.countDocuments(filter),
      ]);
      const counts = await countVideosByCategory(
        videoModel,
        rows.map((row) => row._id as Types.ObjectId),
      );
      return sendOk(
        res,
        'Categories fetched successfully',
        rows.map((row) => serializeCategory(row, counts.get(String(row._id)) || 0)),
        paginationMeta(page, total),
      );
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  createCategory = async (req: AuthRequest, res: Response) => {
    try {
      const { categoryModel } = modelsFor(req.appStyle as AppStyle);
      const created = await categoryModel.create({
        slug: req.body.slug,
        name: req.body.name,
      });
      return sendOk(res, 'Category created successfully', serializeCategory(created.toObject(), 0));
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  updateCategory = async (req: AuthRequest, res: Response) => {
    try {
      const id = readIdParam(req);
      if (!id) return sendError(res, 400, 'Invalid category id');
      const { categoryModel, videoModel } = modelsFor(req.appStyle as AppStyle);
      const updated = await categoryModel
        .findByIdAndUpdate(
          id,
          { slug: req.body.slug, name: req.body.name },
          { new: true, runValidators: true },
        )
        .lean();
      if (!updated) return sendError(res, 404, 'Category not found');
      const videoCount = await videoModel.countDocuments({ categoryIds: updated._id });
      return sendOk(res, 'Category updated successfully', serializeCategory(updated, videoCount));
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  deleteCategory = async (req: AuthRequest, res: Response) => {
    try {
      const id = readIdParam(req);
      if (!id) return sendError(res, 400, 'Invalid category id');
      const { categoryModel, videoModel } = modelsFor(req.appStyle as AppStyle);
      const result = await deleteUnreferenced(categoryModel, videoModel, 'categoryIds', id);
      if (result === 'in-use')
        return sendError(res, 409, 'Remove this category from its videos before deleting it');
      if (result === 'busy')
        return sendError(res, 409, 'A video save is using this category. Try again in 30 seconds');
      if (result === 'missing') return sendError(res, 404, 'Category not found');
      return sendOk(res, 'Category deleted successfully', null);
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  listPeople = async (req: AuthRequest, res: Response) => {
    try {
      const { personModel } = modelsFor(req.appStyle as AppStyle);
      const page = parsePage(req.query.page);
      const skip = (page - 1) * PAGE_LIMIT;
      const q = parseSearchQuery(req.query.q);
      const filter = q
        ? {
            $or: [
              { name: { $regex: escapeRegex(q), $options: 'i' } },
              { slug: { $regex: escapeRegex(q), $options: 'i' } },
            ],
          }
        : {};
      const [rows, total] = await Promise.all([
        personModel.find(filter).sort({ name: 1 }).skip(skip).limit(PAGE_LIMIT).lean(),
        personModel.countDocuments(filter),
      ]);
      return sendOk(
        res,
        'People fetched successfully',
        rows.map((row) => serializePerson(row)),
        paginationMeta(page, total),
      );
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  createPerson = async (req: AuthRequest, res: Response) => {
    try {
      const { personModel } = modelsFor(req.appStyle as AppStyle);
      const created = await personModel.create({
        slug: req.body.slug,
        name: req.body.name,
      });
      return sendOk(res, 'Person created successfully', serializePerson(created.toObject()));
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  updatePerson = async (req: AuthRequest, res: Response) => {
    try {
      const id = readIdParam(req);
      if (!id) return sendError(res, 400, 'Invalid person id');
      const { personModel } = modelsFor(req.appStyle as AppStyle);
      const updated = await personModel
        .findByIdAndUpdate(
          id,
          { slug: req.body.slug, name: req.body.name },
          { new: true, runValidators: true },
        )
        .lean();
      if (!updated) return sendError(res, 404, 'Person not found');
      return sendOk(res, 'Person updated successfully', serializePerson(updated));
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  deletePerson = async (req: AuthRequest, res: Response) => {
    try {
      const id = readIdParam(req);
      if (!id) return sendError(res, 400, 'Invalid person id');
      const { personModel, videoModel, personIdField } = modelsFor(req.appStyle as AppStyle);
      const result = await deleteUnreferenced(personModel, videoModel, personIdField, id);
      if (result === 'in-use')
        return sendError(res, 409, 'Remove this person from their videos before deleting them');
      if (result === 'busy')
        return sendError(res, 409, 'A video save is using this person. Try again in 30 seconds');
      if (result === 'missing') return sendError(res, 404, 'Person not found');
      return sendOk(res, 'Person deleted successfully', null);
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  listVideos = async (req: AuthRequest, res: Response) => {
    try {
      const { videoModel, personIdField } = modelsFor(req.appStyle as AppStyle);
      const page = parsePage(req.query.page);
      const skip = (page - 1) * PAGE_LIMIT;
      const q = parseSearchQuery(req.query.q);
      const filter = q ? { title: { $regex: escapeRegex(q), $options: 'i' } } : {};
      const [rows, total] = await Promise.all([
        videoModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(PAGE_LIMIT).lean(),
        videoModel.countDocuments(filter),
      ]);
      return sendOk(
        res,
        'Videos fetched successfully',
        rows.map((row) => serializeVideo(row, personIdField)),
        paginationMeta(page, total),
      );
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  getVideo = async (req: AuthRequest, res: Response) => {
    try {
      const id = readIdParam(req);
      if (!id) return sendError(res, 400, 'Invalid video id');
      const { videoModel, personIdField } = modelsFor(req.appStyle as AppStyle);
      const video = await videoModel.findById(id).lean();
      if (!video) return sendError(res, 404, 'Video not found');
      return sendOk(res, 'Video fetched successfully', serializeVideo(video, personIdField));
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  createVideo = async (req: AuthRequest, res: Response) => {
    try {
      const appStyle = req.appStyle as AppStyle;
      const { videoModel, categoryModel, personModel, personIdField } = modelsFor(appStyle);
      const built = await buildVideoDoc(req.body, categoryModel, personModel, personIdField);
      if (!built.ok) return sendError(res, 400, built.error);
      const created = await videoModel.create(built.doc);
      return sendOk(
        res,
        'Video created successfully',
        serializeVideo(created.toObject(), personIdField),
      );
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  updateVideo = async (req: AuthRequest, res: Response) => {
    try {
      const id = readIdParam(req);
      if (!id) return sendError(res, 400, 'Invalid video id');
      const appStyle = req.appStyle as AppStyle;
      const { videoModel, categoryModel, personModel, personIdField } = modelsFor(appStyle);
      const built = await buildVideoDoc(req.body, categoryModel, personModel, personIdField);
      if (!built.ok) return sendError(res, 400, built.error);
      const updated = await videoModel
        .findByIdAndUpdate(id, built.doc, { new: true, runValidators: true })
        .lean();
      if (!updated) return sendError(res, 404, 'Video not found');
      return sendOk(res, 'Video updated successfully', serializeVideo(updated, personIdField));
    } catch (error) {
      return sendCaught(res, error);
    }
  };

  deleteVideo = async (req: AuthRequest, res: Response) => {
    try {
      const id = readIdParam(req);
      if (!id) return sendError(res, 400, 'Invalid video id');
      const { videoModel } = modelsFor(req.appStyle as AppStyle);
      const deleted = await videoModel.findByIdAndDelete(id);
      if (!deleted) return sendError(res, 404, 'Video not found');
      return sendOk(res, 'Video deleted successfully', null);
    } catch (error) {
      return sendCaught(res, error);
    }
  };
}

type VideoBuild = { ok: true; doc: Record<string, unknown> } | { ok: false; error: string };

async function buildVideoDoc(
  body: Record<string, unknown>,
  categoryModel: DocModel,
  personModel: DocModel,
  personIdField: PersonField,
): Promise<VideoBuild> {
  if (
    personIdField === 'influencerIds' &&
    (typeof body.playbackUrl !== 'string' || !/^https:\/\/[^\s]+$/i.test(body.playbackUrl))
  ) {
    return { ok: false, error: 'A valid HTTPS playback URL is required for finance videos' };
  }
  const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds.map(String) : [];
  const rawPeople = body[personIdField];
  const personIds = Array.isArray(rawPeople) ? rawPeople.map(String) : [];
  const now = new Date();
  const categories = await claimIds(categoryModel, categoryIds, 'category', now);
  if (!categories.ok) return categories;
  const people = await claimIds(personModel, personIds, 'person', now);
  if (!people.ok) return people;
  // The caller writes right after this returns; leave most of the lease as a safety margin.
  if (Date.now() - now.getTime() > LEASE_MS / 2) {
    return { ok: false, error: 'Saving took too long. Try again' };
  }

  return {
    ok: true,
    doc: {
      slug: body.slug,
      scrappedSlug: body.scrappedSlug,
      movieId: body.movieId,
      ...(personIdField === 'influencerIds' ? { playbackUrl: body.playbackUrl } : {}),
      title: body.title,
      duration: typeof body.duration === 'number' ? body.duration : null,
      thumbnail: typeof body.thumbnail === 'string' ? body.thumbnail : '',
      description: typeof body.description === 'string' ? body.description : '',
      metaTitle: typeof body.metaTitle === 'string' ? body.metaTitle : '',
      metaDescription: typeof body.metaDescription === 'string' ? body.metaDescription : '',
      categoryIds: categories.ids,
      [personIdField]: people.ids,
    },
  };
}

export default new AdminContentService();
