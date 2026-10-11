import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReelUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  verified: boolean;
}

export interface IFinanceReel extends Document {
  _id: Types.ObjectId;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  tags: string[];
  duration: number;
  width: number | null;
  height: number | null;
  userId: string;
  user: IReelUser;
  createdAt: Date;
  updatedAt: Date;
}

const ReelUserSchema = new Schema<IReelUser>(
  {
    id: { type: String, required: true },
    username: { type: String, required: true },
    displayName: { type: String, required: true },
    avatar: { type: String, default: null },
    verified: { type: Boolean, default: false },
  },
  { _id: false },
);

const FinanceReelSchema = new Schema<IFinanceReel>(
  {
    videoUrl: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    tags: { type: [String], default: [] },
    duration: { type: Number, default: 0 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    userId: { type: String, required: true },
    user: { type: ReelUserSchema, required: true },
  },
  { timestamps: true, versionKey: false, collection: 'finance_reels' },
);

FinanceReelSchema.index({ createdAt: -1 });

export default mongoose.model<IFinanceReel>('FinanceReel', FinanceReelSchema);
