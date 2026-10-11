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

export const toObjectIdArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
};

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
