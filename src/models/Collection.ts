import mongoose, { Schema, Model } from 'mongoose';

// ─── Hero Carousel Slide Sub-document ───────────────────────────────
const HeroSlideSchema = new Schema(
    {
        id: { type: String, required: true },
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        image: { type: String, default: '' },
        ctaText: { type: String, default: '' },
        ctaLink: { type: String, default: '' },
    },
    { _id: false }
);

// ─── Featured Product Sub-document ──────────────────────────────────
const FeaturedProductSchema = new Schema(
    {
        product: { type: String, ref: 'Product' },
        badge: { type: String, default: '' },
        sortOrder: { type: Number, default: 0 },
    },
    { _id: false }
);

// ─── Featured Category Sub-document ─────────────────────────────────
const FeaturedCategorySchema = new Schema(
    {
        category: { type: String, ref: 'Category' },
        sortOrder: { type: Number, default: 0 },
    },
    { _id: false }
);

// ─── Hero Sub-document ──────────────────────────────────────────────
const HeroSchema = new Schema(
    {
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        image: { type: String, default: '' },
    },
    { _id: false }
);

// ─── Collection Interface ───────────────────────────────────────────
export interface ICollection {
    type: string;
    hero: { title: string; subtitle: string; image: string } | null;
    featuredProducts: Array<{ product: string; badge: string; sortOrder: number }>;
    heroCarousel: Array<{
        id: string;
        title: string;
        subtitle: string;
        image: string;
        ctaText: string;
        ctaLink: string;
    }>;
    trendingProducts: string[];
    featuredCategories: string[];
    newArrivals: string[];
    updatedAt: Date;
}

// ─── Main Collection Schema ─────────────────────────────────────────
const CollectionSchema = new Schema(
    {
        type: {
            type: String,
            enum: ['featured', 'homepage'],
            unique: true,
            required: true,
        },
        hero: { type: HeroSchema, default: null },
        featuredProducts: { type: [FeaturedProductSchema], default: [] },
        heroCarousel: { type: [HeroSlideSchema], default: [] },
        trendingProducts: [{ type: String, ref: 'Product' }],
        featuredCategories: [{ type: String, ref: 'Category' }],
        newArrivals: [{ type: String, ref: 'Product' }],
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                delete ret._id;
                delete ret.__v;
                delete ret.createdAt;
                delete ret.updatedAt;
                return ret;
            },
        },
    }
);

export const Collection: Model<ICollection> = mongoose.model<ICollection>(
    'Collection',
    CollectionSchema as any
);
