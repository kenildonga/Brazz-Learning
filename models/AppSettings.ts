import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAppSettings extends Document {
  _id: Types.ObjectId;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, versionKey: false, collection: 'app_settings' },
);

export default mongoose.model<IAppSettings>('AppSettings', AppSettingsSchema);
