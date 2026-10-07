const THUMBNAIL_BASE_URL = 'https://image.porndear.com';

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
