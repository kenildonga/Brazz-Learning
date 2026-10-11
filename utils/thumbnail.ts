const THUMBNAIL_BASE_URL =
  process.env.THUMBNAIL_BASE_URL || 'https://pub-ad93fab2bd244c4397c55ab05d543fd0.r2.dev';

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
