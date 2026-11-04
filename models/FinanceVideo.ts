import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFinanceVideo extends Document {
  _id: Types.ObjectId;
  slug: string;
  scrappedSlug: string;
  movieId: string;
  playbackUrl: string;
  title: string;
  duration: number | null;
  thumbnail: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  influencerIds: Types.ObjectId[];
  categoryIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const FinanceVideoSchema = new Schema<IFinanceVideo>(
  {
    slug: { type: String, required: true, unique: true },
    scrappedSlug: { type: String, required: true, unique: true, index: true },
    movieId: { type: String, required: true, index: true },
    playbackUrl: {
      type: String,
      required: true,
      validate: (value: string) => /^https:\/\/[^\s]+$/i.test(value),
    },
    title: { type: String, required: true },
    duration: { type: Number, default: null },
    thumbnail: { type: String, default: '' },
    description: { type: String, default: '' },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    influencerIds: [{ type: Schema.Types.ObjectId, ref: 'FinanceInfluencer' }],
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'FinanceCategory' }],
  },
  { timestamps: true, versionKey: false, collection: 'finance_videos' },
);

FinanceVideoSchema.index({ influencerIds: 1, createdAt: -1 });
FinanceVideoSchema.index({ createdAt: -1 });
FinanceVideoSchema.index({ categoryIds: 1, createdAt: -1 });

export default mongoose.model<IFinanceVideo>('FinanceVideo', FinanceVideoSchema);
