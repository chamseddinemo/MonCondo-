const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const parseNumber = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const getPaginationParams = (query = {}, options = {}) => {
  const {
    defaultLimit = DEFAULT_LIMIT,
    maxLimit = MAX_LIMIT,
    allowedSortFields = ['createdAt'],
    defaultSortField = 'createdAt',
    defaultOrder = 'desc'
  } = options;

  const page = Math.max(parseNumber(query.page, DEFAULT_PAGE), 1);
  const limit = Math.min(
    Math.max(parseNumber(query.limit, defaultLimit), 1),
    maxLimit
  );

  const sortField = allowedSortFields.includes(query.sort)
    ? query.sort
    : defaultSortField;

  const sortOrder =
    (query.order || defaultOrder).toString().toLowerCase() === 'asc' ? 1 : -1;

  return { page, limit, sortField, sortOrder };
};

const buildPaginationMeta = ({ page, limit, total }) => {
  const safeLimit = Math.max(limit, 1);
  const pageCount = Math.max(Math.ceil(total / safeLimit), 1);

  return {
    page,
    limit: safeLimit,
    total,
    pageCount,
    hasMore: page < pageCount
  };
};

module.exports = {
  getPaginationParams,
  buildPaginationMeta
};


