import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware.
 *
 * Provides tiered rate limiters for different endpoint categories
 * to prevent abuse, brute-force attacks, and API billing overruns.
 */

// ─── Auth Limiter ───────────────────────────────────────────────────
// Strict: prevents brute-force login/registration attempts
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                    // 5 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many authentication attempts. Please try again after 15 minutes.',
        },
    },
});

// ─── Search Limiter ─────────────────────────────────────────────────
// Moderate: prevents AI-API billing abuse (Vision API, Embeddings)
export const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute
    max: 20,                   // 20 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Search rate limit exceeded. Please wait a moment before trying again.',
        },
    },
});

// ─── Global API Limiter ─────────────────────────────────────────────
// Lenient: general protection against DDoS and runaway clients
export const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute
    max: 100,                  // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Rate limit exceeded. Please slow down.',
        },
    },
});

// ─── Webhook Limiter ────────────────────────────────────────────────
// Moderate: protect webhook endpoints from being hammered
export const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute
    max: 50,                   // 50 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Webhook rate limit exceeded.',
        },
    },
});
