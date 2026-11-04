import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAdmin extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin';
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    sessionVersion: { type: Number, default: 0 },
    role: { type: String, enum: ['admin'], required: true, default: 'admin' },
  },
  { timestamps: true, versionKey: false, collection: 'admins' },
);

export default mongoose.model<IAdmin>('Admin', AdminSchema);
