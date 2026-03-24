export function getPagination(query: { page?: string; limit?: string }) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : 10;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}
