import mongoose, { Schema, Model } from 'mongoose';
import { generateId } from '../utils/generateId';

// ─── Cart Item Sub-document ─────────────────────────────────────────
const CartItemSchema = new Schema(
    {
        id: { type: String, default: () => generateId('ci') },
        productId: { type: String, ref: 'Product', required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },    // paisa
        quantity: { type: Number, required: true, min: 1 },
        image: { type: String, default: '' },
        attributes: { type: String, default: '' },
        color: { type: String, default: null },
        size: { type: String, default: null },
        sku: { type: String, default: '' },
        stock: { type: Number, default: 0 },
        sellerId: { type: String, ref: 'User', default: null },
    },
    { _id: false }
);

// ─── Cart Interface ─────────────────────────────────────────────────
export interface ICart {
    user: string;
    items: Array<{
        id: string;
        productId: string;
        name: string;
        price: number;
        quantity: number;
        image: string;
        attributes: string;
        color: string | null;
        size: string | null;
        sku: string;
        stock: number;
        sellerId: string | null;
    }>;
    subtotal: number;
    itemCount: number;
}

// ─── Main Cart Schema ───────────────────────────────────────────────
const CartSchema = new Schema(
    {
        user: { type: String, ref: 'User', required: true, unique: true },
        items: { type: [CartItemSchema], default: [] },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                // Cart response uses items/subtotal/itemCount — no top-level "id" needed
                delete ret._id;
                delete ret.__v;
                delete ret.user;
                delete ret.createdAt;
                delete ret.updatedAt;

                // Compute subtotal and itemCount
                ret.subtotal = (ret.items || []).reduce(
                    (sum: number, item: any) => sum + item.price * item.quantity,
                    0
                );
                ret.itemCount = (ret.items || []).reduce(
                    (sum: number, item: any) => sum + item.quantity,
                    0
                );
                return ret;
            },
        },
    }
);

CartSchema.index({ user: 1 });

export const Cart: Model<ICart> = mongoose.model<ICart>('Cart', CartSchema as any);
