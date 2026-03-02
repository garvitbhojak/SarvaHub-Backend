import dotenv from 'dotenv';
dotenv.config();

export const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sarvahub',
    jwt: {
        secret: process.env.JWT_SECRET || 'default_jwt_secret',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    cdnBaseUrl: process.env.CDN_BASE_URL || 'https://cdn.sarvahub.com',
} as const;
