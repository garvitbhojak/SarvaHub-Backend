import mongoose, { Schema, Model } from 'mongoose';
import { generateId } from '../utils/generateId';

// ─── Feedback Interface ─────────────────────────────────────────────
export interface IFeedback {
    _id: string;
    title: string;
    description: string;
    status: string;
    upvotes: number;
    upvotedBy: string[];
    author: string;
    authorName: string;
    createdAt: Date;
}

// ─── Main Feedback Schema ───────────────────────────────────────────
const FeedbackSchema = new Schema(
    {
        _id: { type: String, default: () => generateId('fb') },
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        status: {
            type: String,
            enum: ['under_review', 'planned', 'in_progress', 'completed', 'declined'],
            default: 'under_review',
        },
        upvotes: { type: Number, default: 0 },
        upvotedBy: [{ type: String }], // user IDs
        author: { type: String, ref: 'User', default: null },
        authorName: { type: String, default: 'Community' },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        toJSON: {
            virtuals: true,
            transform(_doc: any, ret: any) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                delete ret.upvotedBy;
                delete ret.author;
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

export const Feedback: Model<IFeedback> = mongoose.model<IFeedback>(
    'Feedback',
    FeedbackSchema as any
);
