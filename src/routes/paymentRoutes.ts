import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createCheckoutIntent } from '../controllers/paymentController';

const router = Router();

// POST /api/v1/checkout/intent — Create payment intent (authenticated consumers)
router.post('/intent', authenticate, createCheckoutIntent);

export default router;
