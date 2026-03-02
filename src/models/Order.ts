import mongoose, { Schema, Model } from 'mongoose';
import { generateId, generateOrderId } from '../utils/generateId';

// ─── Order Item Sub-document ────────────────────────────────────────
const OrderItemSchema = new Schema(
    {
        id: { type: String, default: () => generateId('oi') },
        productId: { type: String, ref: 'Product', required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },    // paisa
        quantity: { type: Number, required: true, min: 1 },
        image: { type: String, default: '' },
        attributes: { type: String, default: '' },
        color: { type: String, default: null },
        size: { type: String, default: null },
        sku: { type: String, default: '' },
        authenticity: {
            status: { type: String, default: 'pending_verification' },
            estimatedCompletionAt: { type: Date, default: null },
        },
    },
    { _id: false }
);

// ─── Shipping Address Sub-document ──────────────────────────────────
const ShippingAddressSchema = new Schema(
    {
        id: { type: String, default: '' },
        label: { type: String, default: '' },
        line1: { type: String, required: true },
        line2: { type: String, default: '' },
        city: { type: String, required: true },
        state: { type: String, default: '' },
        pincode: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
    },
    { _id: false }
);

// ─── Payment Method Sub-document ────────────────────────────────────
const OrderPaymentMethodSchema = new Schema(
    {
        type: {
            type: String,
            enum: ['card', 'upi', 'netbanking', 'wallet', 'crypto'],
            required: true,
        },
        last4: { type: String, default: '' },
        brand: { type: String, default: '' },
        upiId: { type: String, default: null },
    },
    { _id: false }
);

// ─── Tracking Timeline Entry Sub-document ───────────────────────────
const TimelineEntrySchema = new Schema(
    {
        status: { type: String, required: true },
        timestamp: { type: Date, default: null },
        completed: { type: Boolean, default: false },
    },
    { _id: false }
);

// ─── Tracking Sub-document ──────────────────────────────────────────
const TrackingSchema = new Schema(
    {
        carrier: { type: String, default: null },
        trackingNumber: { type: String, default: null },
        trackingUrl: { type: String, default: null },
        timeline: { type: [TimelineEntrySchema], default: [] },
    },
    { _id: false }
);

// ─── Order Interface ────────────────────────────────────────────────
export interface IOrder {
    _id: string;
    user: string;
    seller: string;
    status: string;
    statusLabel: string;
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
        authenticity: {
            status: string;
            estimatedCompletionAt: Date | null;
        };
    }>;
    subtotal: number;   // paisa
    shipping: number;    // paisa
    tax: number;         // paisa
    total: number;       // paisa
    shippingAddress: Record<string, any>;
    paymentMethod: {
        type: string;
        last4: string;
        brand: string;
        upiId: string | null;
    };
    tracking: {
        carrier: string | null;
        trackingNumber: string | null;
        trackingUrl: string | null;
        timeline: Array<{
            status: string;
            timestamp: Date | null;
            completed: boolean;
        }>;
    };
    couponCode: string | null;
    notes: string | null;
    estimatedDelivery: Date | null;
    deliveredAt: Date | null;
    canReturn: boolean;
    canReview: boolean;
    returnWindowEndsAt: Date | null;
    deadlineAt: Date | null;
    itemCount: number;
    createdAt: Date;
}

// ─── Main Order Schema ──────────────────────────────────────────────
const OrderSchema = new Schema(
    {
        _id: { type: String, default: () => generateOrderId() },
        user: { type: String, ref: 'User', required: true },
        seller: { type: String, ref: 'User', default: null },
        status: {
            type: String,
            enum: [
                'confirmed',
                'processing',
                'pending',
                'shipped',
                'out_for_delivery',
                'delivered',
                'cancelled',
                'returned',
            ],
            default: 'confirmed',
        },
        statusLabel: { type: String, default: 'Confirmed' },
        items: { type: [OrderItemSchema], default: [] },
        subtotal: { type: Number, required: true },     // paisa
        shipping: { type: Number, default: 0 },          // paisa
        tax: { type: Number, default: 0 },               // paisa
        total: { type: Number, required: true },         // paisa
        shippingAddress: { type: ShippingAddressSchema, required: true },
        paymentMethod: { type: OrderPaymentMethodSchema, required: true },
        tracking: { type: TrackingSchema, default: () => ({}) },
        couponCode: { type: String, default: null },
        notes: { type: String, default: null },
        estimatedDelivery: { type: Date, default: null },
        deliveredAt: { type: Date, default: null },
        canReturn: { type: Boolean, default: false },
        canReview: { type: Boolean, default: false },
        returnWindowEndsAt: { type: Date, default: null },
        deadlineAt: { type: Date, default: null },
        itemCount: { type: Number, default: 0 },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        toJSON: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                // Contract uses "orderId" not "id"
                ret.orderId = ret._id;
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                ret.orderId = ret._id;
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Pre-save: compute itemCount
OrderSchema.pre('save', function () {
    this.itemCount = (this as any).items.reduce((sum: number, item: any) => sum + item.quantity, 0);
});

// Indexes
OrderSchema.index({ user: 1, status: 1 });
OrderSchema.index({ seller: 1, status: 1 });
OrderSchema.index({ createdAt: -1 });

export const Order: Model<IOrder> = mongoose.model<IOrder>('Order', OrderSchema as any);
