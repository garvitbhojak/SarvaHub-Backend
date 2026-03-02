import mongoose, { Schema, Model } from 'mongoose';
import { generateId } from '../utils/generateId';

// ─── Wishlist Item Interface ────────────────────────────────────────
export interface IWishlistItem {
    _id: string;
    user: string;
    productId: string;
    name: string;
    brand: string;
    price: number;     // paisa
    image: string;
    inStock: boolean;
    addedAt: Date;
}

// ─── Main Wishlist Schema ───────────────────────────────────────────
const WishlistItemSchema = new Schema(
    {
        _id: { type: String, default: () => generateId('wl') },
        user: { type: String, ref: 'User', required: true },
        productId: { type: String, ref: 'Product', required: true },
        name: { type: String, default: '' },
        brand: { type: String, default: '' },
        price: { type: Number, default: 0 },
        image: { type: String, default: '' },
        inStock: { type: Boolean, default: true },
        addedAt: { type: Date, default: Date.now },
    },
    {
        toJSON: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                delete ret.user;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Ensure a user can only wishlist a product once
WishlistItemSchema.index({ user: 1, productId: 1 }, { unique: true });

export const WishlistItem: Model<IWishlistItem> = mongoose.model<IWishlistItem>(
    'WishlistItem',
    WishlistItemSchema as any
);
