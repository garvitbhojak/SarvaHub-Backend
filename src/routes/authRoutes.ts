import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { register, login, logout, getMe } from '../controllers/authController';

const router = Router();

// POST /api/v1/auth/register — Create a new account
router.post('/register', register);

// POST /api/v1/auth/login — Authenticate
router.post('/login', login);

// POST /api/v1/auth/logout — Clear auth cookie
router.post('/logout', logout);

// GET /api/v1/auth/me — Get current user (protected)
router.get('/me', authenticate, getMe);

export default router;
