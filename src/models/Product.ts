import mongoose, { Schema, Model } from 'mongoose';
import { generateId } from '../utils/generateId';

// ─── Image Sub-document ─────────────────────────────────────────────
const ProductImageSchema = new Schema(
    {
        url: { type: String, required: true },
        alt: { type: String, default: '' },
    },
    { _id: false }
);

// ─── Color Variant Sub-document ─────────────────────────────────────
const ColorSchema = new Schema(
    {
        name: { type: String, required: true },
        hex: { type: String, required: true },
        sku: { type: String, default: '' },
    },
    { _id: false }
);

// ─── Authenticity Sub-document ──────────────────────────────────────
const AuthenticitySchema = new Schema(
    {
        verified: { type: Boolean, default: false },
        batchId: { type: String, default: null },
        origin: { type: String, default: null },
        verifiedAt: { type: Date, default: null },
        inspectionPoints: { type: Number, default: 0 },
    },
    { _id: false }
);

// ─── Return Policy Sub-document ─────────────────────────────────────
const ReturnPolicySchema = new Schema(
    {
        type: { type: String, default: 'No Returns' },
        windowDays: { type: Number, default: 0 },
        conditions: { type: String, default: '' },
        eligible: { type: Boolean, default: false },
        restockingFeePercent: { type: Number, default: 0 },
    },
    { _id: false }
);

// ─── Shipping Sub-document ──────────────────────────────────────────
const ShippingSchema = new Schema(
    {
        freeShipping: { type: Boolean, default: false },
        estimatedDays: { type: String, default: '5-7' },
        provider: { type: String, default: '' },
    },
    { _id: false }
);

// ─── Shipping Dimensions Sub-document ───────────────────────────────
const ShippingDimensionsSchema = new Schema(
    {
        l: { type: Number, default: 0 },
        w: { type: Number, default: 0 },
        h: { type: Number, default: 0 },
    },
    { _id: false }
);

// ─── Product Interface ──────────────────────────────────────────────
export interface IProduct {
    _id: string;
    slug: string;
    name: string;
    brand: string;
    price: number;         // paisa
    originalPrice: number; // paisa
    discount: number;      // percentage
    currency: string;
    rating: number;
    reviewCount: number;
    stock: number;
    category: string;      // ref to Category _id
    description: string;
    features: string[];
    images: Array<{ url: string; alt: string }>;
    video: string | null;
    colors: Array<{ name: string; hex: string; sku: string }>;
    sizes: string[];
    authenticity: {
        verified: boolean;
        batchId: string | null;
        origin: string | null;
        verifiedAt: Date | null;
        inspectionPoints: number;
    };
    seller: string;        // ref to User _id
    returnPolicy: {
        type: string;
        windowDays: number;
        conditions: string;
        eligible: boolean;
        restockingFeePercent: number;
    };
    shipping: {
        freeShipping: boolean;
        estimatedDays: string;
        provider: string;
    };
    sku: string;
    status: 'active' | 'draft' | 'out_of_stock';
    totalSold: number;
    shippingWeight: number;
    shippingDimensions: { l: number; w: number; h: number } | null;
    authenticityDocs: string[];
    qrCodeUrl: string | null;
    searchEmbedding: number[];
    createdAt: Date;
    updatedAt: Date;
}

// ─── Main Product Schema ────────────────────────────────────────────
const ProductSchema = new Schema(
    {
        _id: { type: String, default: () => generateId('prod') },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
        name: { type: String, required: true, trim: true },
        brand: { type: String, required: true, trim: true },
        price: { type: Number, required: true },            // paisa (integer)
        originalPrice: { type: Number, default: 0 },        // paisa (integer)
        discount: { type: Number, default: 0 },              // percentage
        currency: { type: String, default: 'INR' },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        reviewCount: { type: Number, default: 0 },
        stock: { type: Number, default: 0, min: 0 },
        category: { type: String, ref: 'Category' },
        description: { type: String, default: '' },
        features: [{ type: String }],
        images: { type: [ProductImageSchema], default: [] },
        video: { type: String, default: null },
        colors: { type: [ColorSchema], default: [] },
        sizes: [{ type: String }],
        authenticity: { type: AuthenticitySchema, default: () => ({}) },
        seller: { type: String, ref: 'User', required: true },
        returnPolicy: { type: ReturnPolicySchema, default: () => ({}) },
        shipping: { type: ShippingSchema, default: () => ({}) },
        sku: { type: String, default: '' },
        status: {
            type: String,
            enum: ['active', 'draft', 'out_of_stock'],
            default: 'active',
        },
        totalSold: { type: Number, default: 0 },
        shippingWeight: { type: Number, default: 0 },
        shippingDimensions: { type: ShippingDimensionsSchema, default: null },
        authenticityDocs: [{ type: String }],
        qrCodeUrl: { type: String, default: null },
        searchEmbedding: { type: [Number], default: [], select: false },
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

// Text index for full-text search on name, brand, description
ProductSchema.index({ name: 'text', brand: 'text', description: 'text' });
// Compound indexes for common query patterns
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ seller: 1, status: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ rating: -1 });
ProductSchema.index({ createdAt: -1 });

export const Product: Model<IProduct> = mongoose.model<IProduct>('Product', ProductSchema as any);
