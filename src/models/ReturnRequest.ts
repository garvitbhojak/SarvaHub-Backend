import mongoose, { Schema, Model } from 'mongoose';
import { generateId } from '../utils/generateId';

// ─── Return Item Sub-document ───────────────────────────────────────
const ReturnItemSchema = new Schema(
    {
        orderItemId: { type: String, required: true },
        reason: { type: String, required: true },
        subReason: { type: String, default: '' },
        resolution: {
            type: String,
            enum: ['refund_original', 'store_credit', 'exchange'],
            required: true,
        },
        exchangeVariantId: { type: String, default: null },
        proofImages: [{ type: String }],
        comments: { type: String, default: '' },
    },
    { _id: false }
);

// ─── Pickup Address Sub-document ────────────────────────────────────
const PickupAddressSchema = new Schema(
    {
        id: { type: String, default: '' },
        label: { type: String, default: '' },
        line1: { type: String, default: '' },
        line2: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
    },
    { _id: false }
);

// ─── Pickup Details Sub-document ────────────────────────────────────
const PickupDetailsSchema = new Schema(
    {
        address: { type: PickupAddressSchema },
        date: { type: String, default: '' },
        slot: { type: String, default: '' },
        labelUrl: { type: String, default: null },
    },
    { _id: false }
);

// ─── Return Timeline Entry Sub-document ─────────────────────────────
const ReturnTimelineEntrySchema = new Schema(
    {
        step: { type: String, required: true },
        completedAt: { type: Date, default: null },
    },
    { _id: false }
);

// ─── ReturnRequest Interface ────────────────────────────────────────
export interface IReturnRequest {
    _id: string;
    order: string;
    user: string;
    seller: string;
    status: string;
    items: Array<{
        orderItemId: string;
        reason: string;
        subReason: string;
        resolution: string;
        exchangeVariantId: string | null;
        proofImages: string[];
        comments: string;
    }>;
    pickupDetails: {
        address: Record<string, any>;
        date: string;
        slot: string;
        labelUrl: string | null;
    };
    estimatedRefundDate: Date | null;
    sellerNotes: string | null;
    customerName: string;
    timeline: Array<{
        step: string;
        completedAt: Date | null;
    }>;
    createdAt: Date;
}

// ─── Main ReturnRequest Schema ──────────────────────────────────────
const ReturnRequestSchema = new Schema(
    {
        _id: { type: String, default: () => generateId('ret') },
        order: { type: String, ref: 'Order', required: true },
        user: { type: String, ref: 'User', required: true },
        seller: { type: String, ref: 'User', default: null },
        status: {
            type: String,
            enum: [
                'pending_approval',
                'approved',
                'rejected',
                'pickup_scheduled',
                'picked_up',
                'inspecting',
                'refund_processed',
            ],
            default: 'pending_approval',
        },
        items: { type: [ReturnItemSchema], default: [] },
        pickupDetails: { type: PickupDetailsSchema, default: () => ({}) },
        estimatedRefundDate: { type: Date, default: null },
        sellerNotes: { type: String, default: null },
        customerName: { type: String, default: '' },
        timeline: {
            type: [ReturnTimelineEntrySchema],
            default: () => [
                { step: 'Return Requested', completedAt: new Date() },
                { step: 'Seller Approved', completedAt: null },
                { step: 'Pickup Scheduled', completedAt: null },
                { step: 'Package Picked Up', completedAt: null },
                { step: 'Inspection in Progress', completedAt: null },
                { step: 'Refund Processed', completedAt: null },
            ],
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        toJSON: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                ret.returnId = ret._id;
                ret.id = ret._id;
                ret.orderId = ret.order;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                ret.returnId = ret._id;
                ret.id = ret._id;
                ret.orderId = ret.order;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Indexes
ReturnRequestSchema.index({ order: 1 });
ReturnRequestSchema.index({ user: 1 });
ReturnRequestSchema.index({ seller: 1, status: 1 });

export const ReturnRequest: Model<IReturnRequest> = mongoose.model<IReturnRequest>(
    'ReturnRequest',
    ReturnRequestSchema as any
);
