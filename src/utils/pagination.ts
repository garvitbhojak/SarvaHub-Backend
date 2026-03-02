/**
 * Pagination helper utility.
 * Builds the standard pagination response wrapper from the API contract.
 */
export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginationResult {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
}

/**
 * Parses page and limit from query params with sensible defaults.
 */
export function parsePagination(query: Record<string, any>): PaginationParams {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    return { page, limit };
}

/**
 * Builds the pagination metadata object.
 */
export function buildPagination(
    page: number,
    limit: number,
    totalItems: number
): PaginationResult {
    const totalPages = Math.ceil(totalItems / limit) || 1;
    return {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
    };
}

/**
 * Wraps data and pagination into the standard response shape.
 */
export function paginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    totalItems: number
) {
    return {
        data,
        pagination: buildPagination(page, limit, totalItems),
    };
}
