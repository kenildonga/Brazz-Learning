import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPornstar extends Document {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  referenceLeaseUntil?: Date;
  deleteLeaseUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PornstarSchema = new Schema<IPornstar>(
  {
    slug: { type: String, required: true, unique: true },
    referenceLeaseUntil: { type: Date, select: false },
    deleteLeaseUntil: { type: Date, select: false },
    name: { type: String, required: true, index: true },
  },
  { timestamps: true, versionKey: false, collection: 'pornstars' },
);

export default mongoose.model<IPornstar>('Pornstar', PornstarSchema);
