import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

/**
 * Global error handler middleware.
 * Formats all errors to the contract shape: { error: { code, message } }
 */
export function errorHandler(
    err: Error | AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    // If it's our custom AppError, use its properties
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
            },
        });
        return;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        res.status(422).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: err.message,
            },
        });
        return;
    }

    // Mongoose duplicate key error
    if ((err as any).code === 11000) {
        const field = Object.keys((err as any).keyValue || {})[0] || 'field';
        res.status(409).json({
            error: {
                code: 'CONFLICT',
                message: `Duplicate value for ${field}.`,
            },
        });
        return;
    }

    // Mongoose CastError (invalid ObjectId, etc.)
    if (err.name === 'CastError') {
        res.status(400).json({
            error: {
                code: 'BAD_REQUEST',
                message: 'Invalid identifier format.',
            },
        });
        return;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid token.',
            },
        });
        return;
    }

    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            error: {
                code: 'TOKEN_EXPIRED',
                message: 'Token has expired.',
            },
        });
        return;
    }

    // Log unexpected errors in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Unhandled error:', err);
    }

    // Default 500
    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred.',
        },
    });
}
