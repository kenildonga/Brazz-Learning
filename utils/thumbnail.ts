const THUMBNAIL_BASE_URL = 'https://pub-eb51b7d86c7d4f4c92d04fc9cf87c04e.r2.dev';

export const publicThumbnailUrl = (thumbnail: unknown) => {
  const value = String(thumbnail ?? '').trim();
  if (!value) {
    return '';
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `${THUMBNAIL_BASE_URL}/${value.replace(/^\/+/, '')}`;
};
