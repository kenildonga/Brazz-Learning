import { Response } from 'express';
import mongoose, { Model, Types } from 'mongoose';
import { AuthRequest, type AppStyle } from '../../middleware/auth';
import { getAppModels } from '../../models/appModels';
import { sendCaught, sendError, sendOk } from '../../utils/http';
import { PAGE_LIMIT, paginationMeta, parsePage } from '../../utils/pagination';
import { serializeCategory, serializePerson, serializeVideo } from '../../utils/serialize';
import { escapeRegex, parseSearchQuery } from '../../utils/video';

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

function readId(req: AuthRequest) {
  const raw = req.params.id;
  const id = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return id;
}

async function videoCounts(videoModel: DocModel, categoryIds: Types.ObjectId[]) {
  const countMap = new Map<string, number>();
  if (!categoryIds.length) return countMap;
  try {
    const counts = await videoModel
      .aggregate([
        { $match: { categoryIds: { $in: categoryIds } } },
        { $unwind: '$categoryIds' },
        { $match: { categoryIds: { $in: categoryIds } } },
        { $group: { _id: '$categoryIds', count: { $sum: 1 } } },
      ])
      .option({ maxTimeMS: 10000 });
    for (const row of counts) {
      countMap.set(String(row._id), row.count as number);
    }
  } catch {
    // Counts are optional; still return categories.
  }
  return countMap;
}

type ResolvedIds = { ok: true; ids: Types.ObjectId[] } | { ok: false; error: string };

async function resolveIds(model: DocModel, ids: string[], label: string): Promise<ResolvedIds> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const objectIds: Types.ObjectId[] = [];
  for (const id of unique) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { ok: false, error: `Invalid ${label} id` };
    }
    objectIds.push(new mongoose.Types.ObjectId(id));
  }
  if (objectIds.length) {
    const found = await model.countDocuments({ _id: { $in: objectIds } });
    if (found !== objectIds.length) {
      return { ok: false, error: `One or more ${label} were not found` };
    }
  }
  return { ok: true, ids: objectIds };
}

class AdminContentService {
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
      const counts = await videoCounts(
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
      const id = readId(req);
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
      const id = readId(req);
      if (!id) return sendError(res, 400, 'Invalid category id');
      const { categoryModel } = modelsFor(req.appStyle as AppStyle);
      const deleted = await categoryModel.findByIdAndDelete(id);
      if (!deleted) return sendError(res, 404, 'Category not found');
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
      const id = readId(req);
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
      const id = readId(req);
      if (!id) return sendError(res, 400, 'Invalid person id');
      const { personModel } = modelsFor(req.appStyle as AppStyle);
      const deleted = await personModel.findByIdAndDelete(id);
      if (!deleted) return sendError(res, 404, 'Person not found');
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
      const id = readId(req);
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
      const id = readId(req);
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
      const id = readId(req);
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
  const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds.map(String) : [];
  const rawPeople = body[personIdField];
  const personIds = Array.isArray(rawPeople) ? rawPeople.map(String) : [];
  const categories = await resolveIds(categoryModel, categoryIds, 'category');
  if (!categories.ok) return categories;
  const people = await resolveIds(personModel, personIds, 'person');
  if (!people.ok) return people;

  return {
    ok: true,
    doc: {
      slug: body.slug,
      scrappedSlug: body.scrappedSlug,
      movieId: body.movieId,
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
