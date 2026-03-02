import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './utils/errors';

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

// ─── Body Parsers ───────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Health Check ───────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// ─── API Routes Mount Point ─────────────────────────────────────────
// Routes will be registered here in Phase 2:
// app.use('/v1/auth', authRouter);
// app.use('/v1/users', usersRouter);
// app.use('/v1/products', productsRouter);
// app.use('/v1/categories', categoriesRouter);
// app.use('/v1/search', searchRouter);
// app.use('/v1/cart', cartRouter);
// app.use('/v1/orders', ordersRouter);
// app.use('/v1/wishlist', wishlistRouter);
// app.use('/v1/reviews', reviewsRouter);
// app.use('/v1/support', supportRouter);
// app.use('/v1/feedback', feedbackRouter);
// app.use('/v1/sellers', sellersRouter);
// app.use('/v1/collections', collectionsRouter);

// ─── 404 Handler ────────────────────────────────────────────────────
app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(404, 'ROUTE_NOT_FOUND', 'The requested endpoint does not exist.'));
});

// ─── Global Error Handler ───────────────────────────────────────────
app.use(errorHandler);

export default app;
