import mongoose from 'mongoose';
import { getAppModels } from '../models/appModels';
import { publicThumbnailUrl } from './thumbnail';

export const NAME_PROJECTION = { name: 1 };

export const getVideoModel = (appStyle: 'finance' | 'adult') => {
  const { Video, Category, Pornstar, personIdField } = getAppModels(appStyle);
  return {
    videoModel: Video as unknown as mongoose.Model<Record<string, unknown>>,
    categoryModel: Category,
    personModel: Pornstar,
    personIdField,
  };
};

// Finance lessons without their own HTTPS media stay out of public lists until an admin adds one.
export const playableFilter = (appStyle: 'finance' | 'adult') =>
  appStyle === 'finance' ? { playbackUrl: { $regex: '^https://' } } : {};

export const toObjectIdArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
};

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Video count per category id. Counts are optional, so a failed or slow aggregation yields none. */
export const countVideosByCategory = async (
  videoModel: mongoose.Model<Record<string, unknown>>,
  categoryIds: mongoose.Types.ObjectId[],
) => {
  const counts = new Map<string, number>();
  if (!categoryIds.length) return counts;
  try {
    const rows = await videoModel
      .aggregate([
        { $match: { categoryIds: { $in: categoryIds } } },
        { $unwind: '$categoryIds' },
        { $match: { categoryIds: { $in: categoryIds } } },
        { $group: { _id: '$categoryIds', count: { $sum: 1 } } },
      ])
      .option({ maxTimeMS: 10000 });
    for (const row of rows) {
      counts.set(String(row._id), row.count as number);
    }
  } catch {
    // Callers still return the categories without counts.
  }
  return counts;
};

const toPeople = (names: string[]) => {
  if (names.length === 0) {
    return ['unknown'];
  }
  if (names.length <= 2) {
    return names;
  }
  return [names[0], names[1], `+${names.length - 2}`];
};

export const attachPeople = async (
  videos: Record<string, unknown>[],
  personModel: {
    find: (
      filter: Record<string, unknown>,
      projection: typeof NAME_PROJECTION,
    ) => { lean: () => Promise<Array<{ _id: unknown; name?: string }>> };
  },
  personIdField: 'pornstarIds' | 'influencerIds',
) => {
  const ids = [
    ...new Set(videos.flatMap((video) => toObjectIdArray(video[personIdField]).map(String))),
  ];
  const people = ids.length
    ? await personModel.find({ _id: { $in: ids } }, NAME_PROJECTION).lean()
    : [];
  const nameById = new Map(people.map((person) => [String(person._id), String(person.name || '')]));

  return videos.map((video) => {
    const { pornstarIds: _pornstarIds, influencerIds: _influencerIds, ...rest } = video;
    const names = toObjectIdArray(video[personIdField])
      .map((id) => nameById.get(String(id)))
      .filter((name): name is string => Boolean(name));

    return {
      ...rest,
      thumbnail: publicThumbnailUrl(video.thumbnail),
      people: toPeople(names),
    };
  });
};

export const parseSearchQuery = (value: unknown) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim();
  }
  return '';
};
