import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { Cart, Order, Product, User } from '../models';
import { config } from '../config';
import { Errors } from '../utils/errors';
import { generateId } from '../utils/generateId';

// ─── Initialize Stripe ──────────────────────────────────────────────
const stripe = config.stripe.secretKey
    ? new Stripe(config.stripe.secretKey)
    : null;

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/checkout/intent — Create checkout payment intent
// CRITICAL: Recalculates total from DB prices to prevent tampering
// ─────────────────────────────────────────────────────────────────────
export async function createCheckoutIntent(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { shippingAddressId, paymentMethodType = 'card' } = req.body;

        // 1. Fetch user's cart from DB
        const cart = await Cart.findOne({ user: userId });
        if (!cart || !cart.items || cart.items.length === 0) {
            throw Errors.badRequest('Cart is empty. Add items before checkout.');
        }

        // 2. Fetch actual product prices from DB (anti-tamper)
        const productIds = cart.items.map((item: any) => item.productId);
        const products = await Product.find({ _id: { $in: productIds }, status: 'active' });

        const productMap = new Map<string, any>();
        for (const p of products) {
            productMap.set(p._id, p);
        }

        // 3. Validate all items are in stock and compute server-side totals
        let subtotal = 0; // paisa
        const validatedItems: any[] = [];

        for (const cartItem of cart.items) {
            const product = productMap.get((cartItem as any).productId);
            if (!product) {
                throw Errors.badRequest(`Product "${(cartItem as any).name}" is no longer available.`);
            }
            if (product.stock < (cartItem as any).quantity) {
                throw Errors.badRequest(
                    `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${(cartItem as any).quantity}.`
                );
            }

            const itemTotal = product.price * (cartItem as any).quantity;
            subtotal += itemTotal;

            validatedItems.push({
                id: generateId('oi'),
                productId: product._id,
                name: product.name,
                price: product.price, // DB price in paisa
                quantity: (cartItem as any).quantity,
                image: product.images?.[0]?.url || '',
                attributes: (cartItem as any).attributes || '',
                color: (cartItem as any).color || null,
                size: (cartItem as any).size || null,
                sku: product.sku || '',
                authenticity: {
                    status: product.authenticity?.verified ? 'verified' : 'pending_verification',
                    estimatedCompletionAt: null,
                },
            });
        }

        // 4. Calculate tax and shipping (paisa)
        const tax = Math.round(subtotal * 0.18);     // 18% GST
        const shipping = subtotal >= 49900 ? 0 : 4900; // Free shipping over ₹499
        const total = subtotal + tax + shipping;        // Total in paisa

        // 5. Fetch shipping address
        const user = await User.findById(userId);
        let shippingAddress: any = null;
        if (shippingAddressId && user) {
            shippingAddress = user.addresses.find(
                (addr: any) => addr.id === shippingAddressId
            );
        }
        if (!shippingAddress && user && user.addresses.length > 0) {
            // Fall back to default or first address
            shippingAddress = user.addresses.find((a: any) => a.isDefault) || user.addresses[0];
        }
        if (!shippingAddress) {
            throw Errors.badRequest('No shipping address found. Please add an address.');
        }

        // 6. Create Stripe PaymentIntent (or mock for dev)
        let clientSecret: string | null = null;
        let paymentIntentId: string | null = null;

        if (stripe) {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: total, // Stripe expects amount in smallest currency unit (paisa for INR)
                currency: 'inr',
                metadata: {
                    userId,
                    itemCount: String(validatedItems.length),
                },
                automatic_payment_methods: { enabled: true },
            });
            clientSecret = paymentIntent.client_secret;
            paymentIntentId = paymentIntent.id;
        } else {
            // Dev mode: return mock data
            clientSecret = `pi_dev_${generateId('mock')}_secret_${Date.now()}`;
            paymentIntentId = `pi_dev_${generateId('mock')}`;
        }

        // 7. Store pending order details in response (order is created on webhook success)
        res.status(201).json({
            clientSecret,
            paymentIntentId,
            order: {
                items: validatedItems,
                subtotal,
                tax,
                shipping,
                total,
                currency: 'INR',
                shippingAddress,
                paymentMethod: {
                    type: paymentMethodType,
                },
            },
        });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/webhooks/stripe — Stripe payment webhook
// Verifies signature, creates Order, decrements stock atomically
// ─────────────────────────────────────────────────────────────────────
export async function handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
        const sig = req.headers['stripe-signature'] as string;

        if (!stripe) {
            // Dev mode: process without signature verification
            console.warn('[StripeWebhook] Stripe not configured — processing in dev mode.');
            const event = req.body;
            await processStripeEvent(event);
            return res.json({ received: true });
        }

        if (!sig || !config.stripe.webhookSecret) {
            throw Errors.badRequest('Missing Stripe signature or webhook secret.');
        }

        // Verify webhook signature
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(
                req.body, // Must be raw body for signature verification
                sig,
                config.stripe.webhookSecret
            );
        } catch (err: any) {
            console.error('[StripeWebhook] Signature verification failed:', err.message);
            throw Errors.badRequest(`Webhook signature verification failed: ${err.message}`);
        }

        await processStripeEvent(event);
        res.json({ received: true });
    } catch (err) {
        next(err);
    }
}

/**
 * Process a verified Stripe event.
 */
async function processStripeEvent(event: any) {
    switch (event.type) {
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            const userId = paymentIntent.metadata?.userId;

            if (!userId) {
                console.error('[StripeWebhook] No userId in payment metadata.');
                return;
            }

            // Fetch user's cart to create the order
            const cart = await Cart.findOne({ user: userId });
            if (!cart || cart.items.length === 0) {
                console.error('[StripeWebhook] Cart empty for user:', userId);
                return;
            }

            // Fetch products for current prices
            const productIds = cart.items.map((item: any) => item.productId);
            const products = await Product.find({ _id: { $in: productIds } });
            const productMap = new Map<string, any>();
            products.forEach((p: any) => productMap.set(p._id, p));

            // Build order items
            let subtotal = 0;
            const orderItems: any[] = [];

            for (const cartItem of cart.items) {
                const product = productMap.get((cartItem as any).productId);
                if (!product) continue;

                const price = product.price;
                const quantity = (cartItem as any).quantity;
                subtotal += price * quantity;

                orderItems.push({
                    id: generateId('oi'),
                    productId: product._id,
                    name: product.name,
                    price,
                    quantity,
                    image: product.images?.[0]?.url || '',
                    attributes: (cartItem as any).attributes || '',
                    color: (cartItem as any).color || null,
                    size: (cartItem as any).size || null,
                    sku: product.sku || '',
                    authenticity: {
                        status: product.authenticity?.verified
                            ? 'verified'
                            : 'pending_verification',
                        estimatedCompletionAt: null,
                    },
                });
            }

            const tax = Math.round(subtotal * 0.18);
            const shipping = subtotal >= 49900 ? 0 : 4900;
            const total = subtotal + tax + shipping;

            // Fetch user for shipping address
            const user = await User.findById(userId);
            const shippingAddress = user?.addresses?.find((a: any) => a.isDefault)
                || user?.addresses?.[0]
                || {};

            // Create the Order
            const order = new Order({
                user: userId,
                seller: orderItems[0]?.productId
                    ? productMap.get(orderItems[0].productId)?.seller
                    : null,
                status: 'confirmed',
                statusLabel: 'Confirmed',
                items: orderItems,
                subtotal,
                shipping,
                tax,
                total,
                shippingAddress,
                paymentMethod: {
                    type: paymentIntent.payment_method_types?.[0] || 'card',
                    last4: '',
                    brand: '',
                },
                tracking: {
                    carrier: null,
                    trackingNumber: null,
                    trackingUrl: null,
                    timeline: [
                        { status: 'Order Placed', timestamp: new Date(), completed: true },
                        { status: 'Processing', timestamp: null, completed: false },
                        { status: 'Shipped', timestamp: null, completed: false },
                        { status: 'Out for Delivery', timestamp: null, completed: false },
                        { status: 'Delivered', timestamp: null, completed: false },
                    ],
                },
                itemCount: orderItems.reduce((s: number, i: any) => s + i.quantity, 0),
            });

            await order.save();

            // Atomically decrement stock for each product
            const stockUpdates = orderItems.map((item: any) =>
                Product.updateOne(
                    { _id: item.productId, stock: { $gte: item.quantity } },
                    {
                        $inc: {
                            stock: -item.quantity,
                            totalSold: item.quantity,
                        },
                    }
                )
            );
            await Promise.all(stockUpdates);

            // Clear the user's cart
            await Cart.updateOne({ user: userId }, { $set: { items: [] } });

            console.log(`[StripeWebhook] Order ${order._id} created for user ${userId}`);
            break;
        }

        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;
            console.warn(`[StripeWebhook] Payment failed for PI: ${paymentIntent.id}`);
            break;
        }

        default:
            console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
    }
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/webhooks/revenuecat — RevenueCat subscription webhook
// Upgrades user role from consumer to seller on INITIAL_PURCHASE
// ─────────────────────────────────────────────────────────────────────
export async function handleRevenueCatWebhook(req: Request, res: Response, next: NextFunction) {
    try {
        // 1. Verify webhook authenticity via Authorization header
        const authHeader = req.headers.authorization;
        const expectedSecret = config.revenuecat.webhookSecret;

        if (expectedSecret) {
            if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
                console.error('[RevenueCat] Invalid webhook authorization.');
                throw Errors.unauthorized('Invalid webhook authorization.');
            }
        }

        const { event } = req.body;
        if (!event) {
            throw Errors.badRequest('Missing event payload.');
        }

        const eventType = event.type;
        const appUserId = event.app_user_id;

        console.log(`[RevenueCat] Received event: ${eventType} for user: ${appUserId}`);

        switch (eventType) {
            case 'INITIAL_PURCHASE':
            case 'RENEWAL': {
                // Upgrade user to seller
                if (!appUserId) {
                    console.error('[RevenueCat] No app_user_id in event.');
                    break;
                }

                const user = await User.findById(appUserId);
                if (!user) {
                    console.error('[RevenueCat] User not found:', appUserId);
                    break;
                }

                // Only upgrade if currently a consumer
                if (user.role === 'consumer') {
                    user.role = 'seller';
                    if (!user.sellerProfile) {
                        user.sellerProfile = {
                            businessName: '',
                            status: 'pending_verification',
                            subscriptionTier: 'starter',
                        };
                    }
                    await user.save();
                    console.log(`[RevenueCat] User ${appUserId} upgraded to seller.`);
                }
                break;
            }

            case 'CANCELLATION':
            case 'EXPIRATION': {
                // Downgrade seller back to consumer (optional business logic)
                if (appUserId) {
                    const user = await User.findById(appUserId);
                    if (user && user.role === 'seller') {
                        // Keep seller profile but mark subscription as expired
                        console.log(`[RevenueCat] Subscription expired for seller: ${appUserId}`);
                        // Note: You may choose NOT to downgrade immediately
                        // to give sellers a grace period
                    }
                }
                break;
            }

            default:
                console.log(`[RevenueCat] Unhandled event type: ${eventType}`);
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (err) {
        next(err);
    }
}
