import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { config } from '../config';
import { Errors } from '../utils/errors';

const SALT_ROUNDS = 10;

/**
 * Generate a JWT access token.
 */
function signToken(payload: { id: string; email: string; role: string }): string {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
}

/**
 * Set the access token as an HttpOnly cookie.
 */
function setTokenCookie(res: Response, token: string): void {
    res.cookie('accessToken', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes (matches JWT expiry)
        path: '/',
    });
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register — Register a new consumer account
// ─────────────────────────────────────────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const { name, email, password } = req.body;

        // 1. Validate required fields
        if (!name || !email || !password) {
            throw Errors.badRequest('Name, email, and password are required.');
        }

        if (password.length < 6) {
            throw Errors.badRequest('Password must be at least 6 characters.');
        }

        // 2. Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            throw Errors.conflict('An account with this email already exists.');
        }

        // 3. Hash the password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // 4. Create the user (default role: consumer)
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'consumer',
        });
        await user.save();

        // 5. Generate JWT
        const token = signToken({
            id: user._id,
            email: user.email,
            role: user.role,
        });

        // 6. Set HttpOnly cookie
        setTokenCookie(res, token);

        // 7. Return user data (stripped of password) + token
        const userData = user.toJSON();

        res.status(201).json({
            token,
            user: userData,
        });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/login — Authenticate an existing user
// ─────────────────────────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = req.body;

        // 1. Validate required fields
        if (!email || !password) {
            throw Errors.badRequest('Email and password are required.');
        }

        // 2. Find user by email (include password field which is select: false)
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            throw Errors.unauthorized('Invalid email or password.');
        }

        // 3. Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw Errors.unauthorized('Invalid email or password.');
        }

        // 4. Generate JWT
        const token = signToken({
            id: user._id,
            email: user.email,
            role: user.role,
        });

        // 5. Set HttpOnly cookie
        setTokenCookie(res, token);

        // 6. Return user data (stripped of password) + token
        const userData = user.toJSON();

        res.status(200).json({
            token,
            user: userData,
        });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/logout — Clear the auth cookie
// ─────────────────────────────────────────────────────────────────────
export async function logout(_req: Request, res: Response, next: NextFunction) {
    try {
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
            path: '/',
        });

        res.json({ message: 'Logged out successfully.' });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/auth/me — Get current authenticated user
// ─────────────────────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await User.findById(req.user!.id);
        if (!user) {
            throw Errors.notFound('User');
        }

        res.json({ user: user.toJSON() });
    } catch (err) {
        next(err);
    }
}
