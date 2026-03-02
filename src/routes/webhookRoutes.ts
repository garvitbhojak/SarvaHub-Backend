import { Router } from 'express';
import {
    handleStripeWebhook,
    handleRevenueCatWebhook,
} from '../controllers/paymentController';

const router = Router();

// POST /api/v1/webhooks/stripe
// NOTE: This route uses express.raw() body parser, configured in app.ts
router.post('/stripe', handleStripeWebhook);

// POST /api/v1/webhooks/revenuecat
router.post('/revenuecat', handleRevenueCatWebhook);

export default router;
