import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './utils/errors';
import { globalLimiter, authLimiter, searchLimiter, webhookLimiter } from './middleware/rateLimiter';

// ─── Route Imports ──────────────────────────────────────────────────
import productRoutes from './routes/productRoutes';
import searchRoutes from './routes/searchRoutes';
import paymentRoutes from './routes/paymentRoutes';
import webhookRoutes from './routes/webhookRoutes';
import authRoutes from './routes/authRoutes';

// ─── Create Express App ─────────────────────────────────────────────
const app = express();

// ─── Security Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(
    cors({
        origin: config.corsOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// ─── Stripe Webhook (MUST be before express.json() body parser) ─────
// Stripe requires the raw body buffer for signature verification.
app.use(
    '/api/v1/webhooks/stripe',
    express.raw({ type: 'application/json' })
);

// ─── Body Parsers ───────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Global Rate Limiter ────────────────────────────────────────────
app.use(globalLimiter);

// ─── Health Check ───────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/search', searchLimiter, searchRoutes);
app.use('/api/v1/checkout', paymentRoutes);
app.use('/api/v1/webhooks', webhookLimiter, webhookRoutes);

app.use('/api/v1/auth', authLimiter, authRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────
app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(404, 'ROUTE_NOT_FOUND', 'The requested endpoint does not exist.'));
});

// ─── Global Error Handler ───────────────────────────────────────────
app.use(errorHandler);

export default app;
