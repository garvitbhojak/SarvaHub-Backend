import mongoose, { Schema, Model } from 'mongoose';
import { generateId } from '../utils/generateId';

// ─── Message Sub-document ───────────────────────────────────────────
const TicketMessageSchema = new Schema(
    {
        id: { type: String, default: () => generateId('msg') },
        sender: {
            type: String,
            enum: ['user', 'agent', 'seller'],
            required: true,
        },
        agentName: { type: String, default: null },
        content: { type: String, required: true },
        attachments: [{ type: String }],
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

// ─── SupportTicket Interface ────────────────────────────────────────
export interface ISupportTicket {
    _id: string;
    user: string;
    seller: string | null;
    subject: string;
    status: string;
    priority: string;
    category: string;
    orderId: string | null;
    messages: Array<{
        id: string;
        sender: string;
        agentName: string | null;
        content: string;
        attachments: string[];
        createdAt: Date;
    }>;
    lastReply: Date | null;
    createdAt: Date;
}

// ─── Main SupportTicket Schema ──────────────────────────────────────
const SupportTicketSchema = new Schema(
    {
        _id: { type: String, default: () => generateId('tkt') },
        user: { type: String, ref: 'User', required: true },
        seller: { type: String, ref: 'User', default: null },
        subject: { type: String, required: true, trim: true },
        status: {
            type: String,
            enum: ['open', 'awaiting_reply', 'in_progress', 'resolved', 'closed'],
            default: 'open',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
        },
        category: { type: String, default: 'general' },
        orderId: { type: String, default: null },
        messages: { type: [TicketMessageSchema], default: [] },
        lastReply: { type: Date, default: null },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
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

SupportTicketSchema.index({ user: 1 });
SupportTicketSchema.index({ seller: 1 });

export const SupportTicket: Model<ISupportTicket> = mongoose.model<ISupportTicket>(
    'SupportTicket',
    SupportTicketSchema as any
);
