export const PAGE_LIMIT = 100;

export function paginationMeta(page: number, total: number, limit = PAGE_LIMIT) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  };
}

export const parsePage = (pageQuery: unknown) => {
  const parsedPage = Number(pageQuery);
  return Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
};
