import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  referenceLeaseUntil?: Date;
  deleteLeaseUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    slug: { type: String, required: true, unique: true },
    referenceLeaseUntil: { type: Date, select: false },
    deleteLeaseUntil: { type: Date, select: false },
    name: { type: String, required: true, index: true },
  },
  { timestamps: true, versionKey: false, collection: 'categories' },
);

export default mongoose.model<ICategory>('Category', CategorySchema);
