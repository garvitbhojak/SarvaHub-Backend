import mongoose, { Schema, Model } from 'mongoose';
import { generateId } from '../utils/generateId';

// ─── Address Sub-document ───────────────────────────────────────────
const AddressSchema = new Schema(
    {
        id: { type: String, default: () => generateId('addr') },
        label: { type: String, required: true },
        line1: { type: String, required: true },
        line2: { type: String, default: '' },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
    },
    { _id: false }
);

// ─── Notification Preferences Sub-document ──────────────────────────
const NotificationPreferencesSchema = new Schema(
    {
        orderUpdates: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
        priceDropAlerts: { type: Boolean, default: true },
        sellerMessages: { type: Boolean, default: true },
        securityAlerts: { type: Boolean, default: true },
        newsletter: { type: Boolean, default: false },
    },
    { _id: false }
);

// ─── Seller: Registered Address Sub-document ────────────────────────
const RegisteredAddressSchema = new Schema(
    {
        line1: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
    },
    { _id: false }
);

// ─── Seller: Bank Details Sub-document ──────────────────────────────
const BankDetailsSchema = new Schema(
    {
        accountName: { type: String },
        accountNumber: { type: String },
        last4: { type: String },
        ifsc: { type: String },
        bankName: { type: String },
    },
    { _id: false }
);

// ─── Seller: Contact Person Sub-document ────────────────────────────
const ContactPersonSchema = new Schema(
    {
        name: { type: String },
        email: { type: String },
        phone: { type: String },
    },
    { _id: false }
);

// ─── Seller: Compliance Metrics Sub-document ────────────────────────
const ComplianceMetricsSchema = new Schema(
    {
        lateDispatchRate: { type: Number, default: 0 },
        lateDispatchTarget: { type: Number, default: 2.0 },
        refundRate: { type: Number, default: 0 },
        refundTarget: { type: Number, default: 5.0 },
        cancellationRate: { type: Number, default: 0 },
        cancellationTarget: { type: Number, default: 2.5 },
    },
    { _id: false }
);

// ─── Seller: Upcoming Audit Sub-document ────────────────────────────
const UpcomingAuditSchema = new Schema(
    {
        type: { type: String },
        description: { type: String },
        deadlineAt: { type: Date },
    },
    { _id: false }
);

// ─── Seller: Notification Preferences Sub-document ──────────────────
const SellerNotificationPreferencesSchema = new Schema(
    {
        newOrders: { type: Boolean, default: true },
        returns: { type: Boolean, default: true },
        payouts: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
    },
    { _id: false }
);

// ─── Seller Profile Sub-document ────────────────────────────────────
const SellerProfileSchema = new Schema(
    {
        businessName: { type: String },
        businessType: {
            type: String,
            enum: ['sole_proprietor', 'partnership', 'pvt_ltd', 'llp', 'other'],
        },
        gstNumber: { type: String },
        panNumber: { type: String },
        registeredAddress: { type: RegisteredAddressSchema },
        bankDetails: { type: BankDetailsSchema },
        categories: [{ type: String }],
        brandAuthorization: [{ type: String }],
        subscriptionTier: {
            type: String,
            enum: ['starter', 'professional', 'enterprise'],
            default: 'starter',
        },
        contactPerson: { type: ContactPersonSchema },
        status: {
            type: String,
            enum: ['pending_verification', 'active', 'suspended'],
            default: 'pending_verification',
        },
        rating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
        joinedYear: { type: Number },
        description: { type: String, default: '' },
        location: { type: String, default: '' },
        verified: { type: Boolean, default: false },
        logo: { type: String, default: null },
        contactEmail: { type: String },
        contactPhone: { type: String },
        notificationPreferences: { type: SellerNotificationPreferencesSchema, default: () => ({}) },
        compliance: {
            accountHealth: { type: String, enum: ['good', 'at_risk', 'critical'], default: 'good' },
            sellerRating: { type: Number, default: 0 },
            metrics: { type: ComplianceMetricsSchema, default: () => ({}) },
            warnings: [{ type: Schema.Types.Mixed }],
            infractions: [{ type: Schema.Types.Mixed }],
            upcomingAudits: [{ type: UpcomingAuditSchema }],
        },
    },
    { _id: false }
);

// ─── User Interface ─────────────────────────────────────────────────
export interface IUser {
    _id: string;
    name: string;
    email: string;
    password: string;
    phone: string | null;
    role: 'consumer' | 'seller';
    avatar: string | null;
    addresses: Array<{
        id: string;
        label: string;
        line1: string;
        line2: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }>;
    notificationPreferences: {
        orderUpdates: boolean;
        promotions: boolean;
        priceDropAlerts: boolean;
        sellerMessages: boolean;
        securityAlerts: boolean;
        newsletter: boolean;
    };
    sellerProfile?: Record<string, any>;
    refreshToken: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Main User Schema ───────────────────────────────────────────────
const UserSchema = new Schema(
    {
        _id: { type: String, default: () => generateId('usr') },
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false },
        phone: { type: String, default: null },
        role: {
            type: String,
            enum: ['consumer', 'seller'],
            default: 'consumer',
        },
        avatar: { type: String, default: null },
        addresses: { type: [AddressSchema], default: [] },
        notificationPreferences: {
            type: NotificationPreferencesSchema,
            default: () => ({}),
        },
        sellerProfile: { type: SellerProfileSchema, default: null },
        refreshToken: { type: String, default: null, select: false },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                delete ret.password;
                delete ret.refreshToken;
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

// Text index for search
UserSchema.index({ name: 'text', email: 'text' });

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema as any);
