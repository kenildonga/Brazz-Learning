import type { IReelUser } from '../models/FinanceReel';
import { publicThumbnailUrl } from './thumbnail';

const toId = (value: unknown) => String(value ?? '');

const toIdArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((id) => String(id));
};

const toIso = (value: unknown): string | undefined => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value) return value;
  return undefined;
};

const toNumberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

function asRecord(doc: object): Record<string, unknown> {
  return doc as Record<string, unknown>;
}

export function serializeAdmin(doc: object) {
  const value = asRecord(doc);
  return {
    _id: toId(value._id),
    name: String(value.name || ''),
    email: String(value.email || ''),
    role: 'admin' as const,
    createdAt: toIso(value.createdAt),
    updatedAt: toIso(value.updatedAt),
  };
}

export function serializeCategory(doc: object, videoCount = 0) {
  const value = asRecord(doc);
  return {
    _id: toId(value._id),
    slug: String(value.slug || ''),
    name: String(value.name || ''),
    videoCount,
    createdAt: toIso(value.createdAt),
  };
}

export function serializePerson(doc: object) {
  const value = asRecord(doc);
  return {
    _id: toId(value._id),
    slug: String(value.slug || ''),
    name: String(value.name || ''),
    createdAt: toIso(value.createdAt),
  };
}

export function serializeVideo(doc: object, personIdField: 'influencerIds' | 'pornstarIds') {
  const value = asRecord(doc);
  const video: Record<string, unknown> = {
    _id: toId(value._id),
    slug: String(value.slug || ''),
    scrappedSlug: String(value.scrappedSlug || ''),
    movieId: String(value.movieId || ''),
    title: String(value.title || ''),
    duration: toNumberOrNull(value.duration),
    thumbnail: publicThumbnailUrl(value.thumbnail),
    description: String(value.description || ''),
    metaTitle: String(value.metaTitle || ''),
    metaDescription: String(value.metaDescription || ''),
    categoryIds: toIdArray(value.categoryIds),
    createdAt: toIso(value.createdAt),
  };
  video[personIdField] = toIdArray(value[personIdField]);
  return video;
}

export function serializeDevice(doc: object) {
  const value = asRecord(doc);
  return {
    _id: toId(value._id),
    deviceUniqueId: String(value.deviceUniqueId || ''),
    appUniqueId: String(value.appUniqueId || ''),
    appStyle: value.appStyle === 'adult' ? 'adult' : 'finance',
    selectedCategories: toIdArray(value.selectedCategories),
    createdAt: toIso(value.createdAt),
  };
}

export function serializeReel(doc: object) {
  const value = asRecord(doc);
  const rawUser =
    value.user && typeof value.user === 'object' ? (value.user as Record<string, unknown>) : {};
  const avatar = rawUser.avatar;
  const user: IReelUser = {
    id: String(rawUser.id || ''),
    username: String(rawUser.username || ''),
    displayName: String(rawUser.displayName || ''),
    avatar: typeof avatar === 'string' && avatar ? avatar : null,
    verified: Boolean(rawUser.verified),
  };
  return {
    id: toId(value._id ?? value.id),
    videoUrl: String(value.videoUrl || ''),
    thumbnailUrl: publicThumbnailUrl(value.thumbnailUrl),
    title: String(value.title || ''),
    description: String(value.description || ''),
    tags: Array.isArray(value.tags) ? value.tags.map((tag) => String(tag)) : [],
    duration: typeof value.duration === 'number' ? value.duration : 0,
    width: toNumberOrNull(value.width),
    height: toNumberOrNull(value.height),
    userId: String(value.userId || user.id),
    createdAt: toIso(value.createdAt),
    updatedAt: toIso(value.updatedAt),
    user,
  };
}
