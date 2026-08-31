export const PAGE_LIMIT = 100;

export const parsePage = (pageQuery: unknown) => {
    const parsedPage = Number(pageQuery);
    return Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
};
