/**
 * Pagination Utilities
 * Cursor-based pagination helpers
 */

/**
 * Default pagination limit
 */
export const DEFAULT_LIMIT = 20;

/**
 * Maximum pagination limit
 */
export const MAX_LIMIT = 100;

/**
 * Minimum pagination limit
 */
export const MIN_LIMIT = 1;

/**
 * Parse pagination parameters from URL search params
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {{limit: number, cursor: string|null}} Parsed pagination params
 */
export function parsePaginationParams(searchParams) {
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(MIN_LIMIT, Number(searchParams.get('limit') || DEFAULT_LIMIT))
  );
  const cursor = searchParams.get('cursor') || null;

  return { limit, cursor };
}

/**
 * Validate pagination parameters
 * @param {number} limit - Limit value
 * @param {string|null} cursor - Cursor value
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validatePaginationParams(limit, cursor) {
  const errors = [];

  if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
    errors.push(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }

  if (cursor && typeof cursor !== 'string') {
    errors.push('Cursor must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create pagination response
 * @param {Array} items - Array of items
 * @param {string|null} cursor - Next cursor value
 * @param {boolean} hasMore - Whether there are more items
 * @param {number} limit - Limit used
 * @returns {object} Pagination response object
 */
export function createPaginationResponse(items, cursor, hasMore, limit = null) {
  return {
    items,
    pagination: {
      cursor: cursor || null,
      hasMore: hasMore || false,
      limit: limit || items.length,
    },
  };
}

/**
 * Extract cursor from item (for date-based pagination)
 * @param {object} item - Item object
 * @param {string} dateField - Date field name (default: 'created_at')
 * @returns {string|null} ISO date string or null
 */
export function extractCursorFromItem(item, dateField = 'created_at') {
  if (!item || !item[dateField]) {
    return null;
  }
  
  const date = item[dateField];
  return date instanceof Date ? date.toISOString() : date;
}

/**
 * Build SQL query with pagination
 * @param {object} options - Query options
 * @param {string} baseQuery - Base SQL query
 * @param {Array} baseParams - Base query parameters
 * @param {string|null} cursor - Cursor value
 * @param {string} cursorField - Field to use for cursor (default: 'created_at')
 * @param {number} limit - Limit value
 * @param {string} orderBy - ORDER BY clause (default: 'created_at DESC')
 * @returns {{query: string, params: Array, hasMore: boolean}} Query result
 */
export function buildPaginatedQuery(options = {}) {
  const {
    baseQuery,
    baseParams = [],
    cursor,
    cursorField = 'created_at',
    limit,
    orderBy = 'created_at DESC',
  } = options;

  let query = baseQuery;
  const params = [...baseParams];
  let paramIndex = params.length + 1;

  // Add cursor condition
  if (cursor) {
    query += ` AND ${cursorField} < $${paramIndex}`;
    params.push(new Date(cursor));
    paramIndex++;
  }

  // Add ORDER BY
  query += ` ORDER BY ${orderBy}`;

  // Add LIMIT (fetch one extra to check if there are more)
  query += ` LIMIT $${paramIndex}`;
  params.push(limit + 1);

  return { query, params };
}

/**
 * Process paginated results
 * @param {Array} rows - Database rows
 * @param {number} limit - Requested limit
 * @param {string} dateField - Date field for cursor (default: 'created_at')
 * @returns {{items: Array, cursor: string|null, hasMore: boolean}} Processed results
 */
export function processPaginatedResults(rows, limit, dateField = 'created_at') {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const cursor = hasMore && items.length > 0
    ? extractCursorFromItem(items[items.length - 1], dateField)
    : null;

  return { items, cursor, hasMore };
}

