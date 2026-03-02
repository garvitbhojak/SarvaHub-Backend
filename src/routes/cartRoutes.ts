import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getCart,
    addItemToCart,
    updateItemQuantity,
    removeItemFromCart,
    clearCart,
} from '../controllers/cartController';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

// GET  /api/v1/cart           — Get current cart
router.get('/', getCart);

// POST /api/v1/cart/items     — Add item to cart
router.post('/items', addItemToCart);

// PUT  /api/v1/cart/items/:productId — Update item quantity
router.put('/items/:productId', updateItemQuantity);

// DELETE /api/v1/cart/items/:productId — Remove item
router.delete('/items/:productId', removeItemFromCart);

// DELETE /api/v1/cart         — Clear entire cart
router.delete('/', clearCart);

export default router;
