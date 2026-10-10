import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  name: string;
  email: string;
  topic: string;
  message: string;
  appStyle: 'finance' | 'adult';
}

const ContactSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    topic: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    appStyle: { type: String, enum: ['finance', 'adult'], required: true, default: 'finance' },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model<IContact>('Contact', ContactSchema);
