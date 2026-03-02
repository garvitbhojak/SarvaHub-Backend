import mongoose, { Schema, Model } from 'mongoose';
import { generateId } from '../utils/generateId';

// ─── PaymentMethod Interface ────────────────────────────────────────
export interface IPaymentMethod {
    _id: string;
    user: string;
    type: string;
    brand: string | null;
    last4: string | null;
    expiryMonth: number | null;
    expiryYear: number | null;
    isDefault: boolean;
    cardholderName: string | null;
    upiId: string | null;
}

// ─── Main PaymentMethod Schema ──────────────────────────────────────
const PaymentMethodSchema = new Schema(
    {
        _id: { type: String, default: () => generateId('pm') },
        user: { type: String, ref: 'User', required: true },
        type: {
            type: String,
            enum: ['card', 'upi', 'netbanking', 'wallet', 'crypto'],
            required: true,
        },
        brand: { type: String, default: null },
        last4: { type: String, default: null },
        expiryMonth: { type: Number, default: null },
        expiryYear: { type: Number, default: null },
        isDefault: { type: Boolean, default: false },
        cardholderName: { type: String, default: null },
        upiId: { type: String, default: null },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                delete ret.user;
                delete ret.createdAt;
                delete ret.updatedAt;
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

PaymentMethodSchema.index({ user: 1 });

export const PaymentMethod: Model<IPaymentMethod> = mongoose.model<IPaymentMethod>(
    'PaymentMethod',
    PaymentMethodSchema as any
);
