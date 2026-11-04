import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface IFinanceInfluencer extends Document {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  referenceLeaseUntil?: Date;
  deleteLeaseUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FinanceInfluencerSchema = new Schema<IFinanceInfluencer>(
  {
    slug: { type: String, required: true, unique: true },
    referenceLeaseUntil: { type: Date, select: false },
    deleteLeaseUntil: { type: Date, select: false },
    name: { type: String, required: true, index: true },
  },
  { timestamps: true, versionKey: false, collection: 'finance_influencer' },
);

const FinanceInfluencer: Model<IFinanceInfluencer> = mongoose.model<IFinanceInfluencer>(
  'FinanceInfluencer',
  FinanceInfluencerSchema,
);

export default FinanceInfluencer;
