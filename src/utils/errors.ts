/**
 * AppError — Custom error class for API errors.
 * Follows the contract error format: { error: { code, message } }
 */
export class AppError extends Error {
    public statusCode: number;
    public code: string;
    public isOperational: boolean;

    constructor(statusCode: number, code: string, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        // Capture stack trace, excluding constructor call from it
        Error.captureStackTrace(this, this.constructor);
    }
}

// ─── Common Error Factories ─────────────────────────────────────────

export const Errors = {
    notFound: (resource: string = 'Resource') =>
        new AppError(404, 'RESOURCE_NOT_FOUND', `${resource} not found.`),

    unauthorized: (message: string = 'Authentication required.') =>
        new AppError(401, 'UNAUTHORIZED', message),

    forbidden: (message: string = 'Access denied.') =>
        new AppError(403, 'FORBIDDEN', message),

    badRequest: (message: string = 'Invalid request.') =>
        new AppError(400, 'BAD_REQUEST', message),

    conflict: (message: string = 'Resource already exists.') =>
        new AppError(409, 'CONFLICT', message),

    validationError: (message: string = 'Validation failed.') =>
        new AppError(422, 'VALIDATION_ERROR', message),

    internal: (message: string = 'Internal server error.') =>
        new AppError(500, 'INTERNAL_ERROR', message),

    tooManyRequests: (message: string = 'Too many requests.') =>
        new AppError(429, 'TOO_MANY_REQUESTS', message),
};
