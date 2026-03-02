import mongoose, { Schema, Model } from 'mongoose';
import { generateId } from '../utils/generateId';

// ─── Author Sub-document ────────────────────────────────────────────
const AuthorSchema = new Schema(
    {
        userId: { type: String, ref: 'User', default: null },
        name: { type: String, required: true },
        avatar: { type: String, default: null },
    },
    { _id: false }
);

// ─── Review Interface ───────────────────────────────────────────────
export interface IReview {
    _id: string;
    product: string;
    author: {
        userId: string | null;
        name: string;
        avatar: string | null;
    };
    rating: number;
    title: string;
    content: string;
    images: string[];
    verified: boolean;
    helpfulCount: number;
    helpfulBy: string[];
    createdAt: Date;
}

// ─── Main Review Schema ─────────────────────────────────────────────
const ReviewSchema = new Schema(
    {
        _id: { type: String, default: () => generateId('rev') },
        product: { type: String, ref: 'Product', required: true },
        author: { type: AuthorSchema, required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        title: { type: String, default: '' },
        content: { type: String, default: '' },
        images: [{ type: String }],
        verified: { type: Boolean, default: false },
        helpfulCount: { type: Number, default: 0 },
        helpfulBy: [{ type: String }], // user IDs who marked helpful
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        toJSON: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                delete ret.helpfulBy;
                // Remove userId from author in response
                if (ret.author) {
                    delete ret.author.userId;
                }
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

// Indexes
ReviewSchema.index({ product: 1, createdAt: -1 });
ReviewSchema.index({ 'author.userId': 1 });

export const Review: Model<IReview> = mongoose.model<IReview>('Review', ReviewSchema as any);
