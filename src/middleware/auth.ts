import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../utils/errors';

// ─── Extend Express Request ─────────────────────────────────────────
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: 'consumer' | 'seller';
            };
        }
    }
}

interface JwtPayload {
    id: string;
    email: string;
    role: 'consumer' | 'seller';
    iat?: number;
    exp?: number;
}

/**
 * JWT Authentication Middleware.
 *
 * Reads the token from:
 *  1. Authorization: Bearer <token>  (header — contract standard)
 *  2. HttpOnly cookie: accessToken   (cookie — secure default)
 *
 * On success, attaches `req.user` with { id, email, role }.
 * On failure, returns 401 with contract error format.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
    let token: string | undefined;

    // 1. Try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // 2. Try HttpOnly cookie
    if (!token && req.cookies?.accessToken) {
        token = req.cookies.accessToken;
    }

    if (!token) {
        return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required. No token provided.'));
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
            return next(new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired.'));
        }
        return next(new AppError(401, 'UNAUTHORIZED', 'Invalid access token.'));
    }
}

/**
 * Role-based authorization middleware.
 * Must be used AFTER `authenticate`.
 *
 * @param roles - Allowed roles (e.g., 'seller', 'consumer')
 */
export function authorize(...roles: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required.'));
        }

        if (!roles.includes(req.user.role)) {
            return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource.'));
        }

        next();
    };
}
