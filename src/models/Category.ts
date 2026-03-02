import mongoose, { Schema, Model } from 'mongoose';
import { generateId } from '../utils/generateId';

// ─── Subcategory Sub-document ───────────────────────────────────────
const SubcategorySchema = new Schema(
    {
        id: { type: String, default: () => generateId('cat') },
        name: { type: String, required: true },
        slug: { type: String, required: true },
        productCount: { type: Number, default: 0 },
    },
    { _id: false }
);

// ─── Category Interface ─────────────────────────────────────────────
export interface ICategory {
    _id: string;
    name: string;
    slug: string;
    description: string;
    image: string | null;
    bannerImage: string | null;
    productCount: number;
    featured: boolean;
    subcategories: Array<{
        id: string;
        name: string;
        slug: string;
        productCount: number;
    }>;
    parent: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Main Category Schema ───────────────────────────────────────────
const CategorySchema = new Schema(
    {
        _id: { type: String, default: () => generateId('cat') },
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
        description: { type: String, default: '' },
        image: { type: String, default: null },
        bannerImage: { type: String, default: null },
        productCount: { type: Number, default: 0 },
        featured: { type: Boolean, default: false },
        subcategories: { type: [SubcategorySchema], default: [] },
        parent: { type: String, ref: 'Category', default: null },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
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

CategorySchema.index({ slug: 1 });

export const Category: Model<ICategory> = mongoose.model<ICategory>(
    'Category',
    CategorySchema as any
);
