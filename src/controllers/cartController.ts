import { Request, Response, NextFunction } from 'express';
import { Cart, Product } from '../models';
import { Errors } from '../utils/errors';
import { generateId } from '../utils/generateId';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/cart — Get current user's cart
// ─────────────────────────────────────────────────────────────────────
export async function getCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = await Cart.create({ user: userId, items: [] });
        }

        res.json(cart.toJSON());
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/v1/cart/items — Add item to cart
// ─────────────────────────────────────────────────────────────────────
export async function addItemToCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { productId, quantity = 1, color = null, size = null, attributes = '' } = req.body;

        if (!productId) {
            throw Errors.badRequest('productId is required.');
        }
        if (quantity < 1) {
            throw Errors.badRequest('Quantity must be at least 1.');
        }

        // 1. Verify product exists, is active, and has stock
        const product = await Product.findById(productId);
        if (!product) {
            throw Errors.notFound('Product');
        }
        if (product.status !== 'active') {
            throw Errors.badRequest('This product is currently unavailable.');
        }
        if (product.stock < quantity) {
            throw Errors.badRequest(
                `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}.`
            );
        }

        // 2. Find or create cart
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        // 3. Check if item already exists (matching productId, color, size)
        const existingItem = cart.items.find(
            (item: any) =>
                item.productId === productId &&
                item.color === color &&
                item.size === size
        );

        if (existingItem) {
            // Increment quantity
            const newQty = (existingItem as any).quantity + quantity;
            if (newQty > product.stock) {
                throw Errors.badRequest(
                    `Cannot add more. Total would be ${newQty}, but only ${product.stock} in stock.`
                );
            }
            (existingItem as any).quantity = newQty;
        } else {
            // Push new item
            const newItem = {
                id: generateId('ci'),
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity,
                image: product.images?.[0]?.url || '',
                attributes,
                color,
                size,
                sku: product.sku || '',
                stock: product.stock,
                sellerId: product.seller || null,
            };
            cart.items.push(newItem as any);
        }

        await cart.save();
        res.status(200).json(cart.toJSON());
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// PUT /api/v1/cart/items/:productId — Update item quantity
// ─────────────────────────────────────────────────────────────────────
export async function updateItemQuantity(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { productId } = req.params;
        const { quantity } = req.body;

        if (quantity === undefined || quantity === null) {
            throw Errors.badRequest('quantity is required.');
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            throw Errors.notFound('Cart');
        }

        const itemIndex = cart.items.findIndex(
            (item: any) => item.productId === productId
        );
        if (itemIndex === -1) {
            throw Errors.notFound('Cart item');
        }

        if (quantity === 0) {
            // Remove the item entirely
            cart.items.splice(itemIndex, 1);
        } else {
            if (quantity < 0) {
                throw Errors.badRequest('Quantity cannot be negative.');
            }

            // Verify stock
            const product = await Product.findById(productId);
            if (product && quantity > product.stock) {
                throw Errors.badRequest(
                    `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}.`
                );
            }

            (cart.items[itemIndex] as any).quantity = quantity;
        }

        await cart.save();
        res.json(cart.toJSON());
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/v1/cart/items/:productId — Remove item from cart
// ─────────────────────────────────────────────────────────────────────
export async function removeItemFromCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { productId } = req.params;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            throw Errors.notFound('Cart');
        }

        const itemIndex = cart.items.findIndex(
            (item: any) => item.productId === productId
        );
        if (itemIndex === -1) {
            throw Errors.notFound('Cart item');
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();

        res.json(cart.toJSON());
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/v1/cart — Clear all items from cart
// ─────────────────────────────────────────────────────────────────────
export async function clearCart(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            throw Errors.notFound('Cart');
        }

        cart.items = [] as any;
        await cart.save();

        res.json(cart.toJSON());
    } catch (err) {
        next(err);
    }
}
