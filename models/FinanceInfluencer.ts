import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface IFinanceInfluencer extends Document {
    _id: Types.ObjectId;
    slug: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

const FinanceInfluencerSchema = new Schema<IFinanceInfluencer>(
    {
        slug: { type: String, required: true, unique: true },
        name: { type: String, required: true },
    },
    { timestamps: true, versionKey: false, collection: 'finance_influencer' },
);

const FinanceInfluencer: Model<IFinanceInfluencer> = mongoose.model<IFinanceInfluencer>(
    'FinanceInfluencer',
    FinanceInfluencerSchema,
);

export default FinanceInfluencer;
