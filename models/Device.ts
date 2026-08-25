import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Document {
    deviceUniqueId: string;
    appUniqueId: string;
    pushToken?: string | null;
    appStyle: 'finance' | 'adult';
    selectedCategories: string[];
}

const DeviceSchema: Schema = new Schema({
    deviceUniqueId: { type: String, required: true },
    appUniqueId: { type: String, required: true },
    pushToken: { type: String, default: null },
    appStyle: { type: String, enum: ['finance', 'adult'], required: true, default: 'finance' },
    selectedCategories: { type: [String], default: [] },
}, { timestamps: true, versionKey: false });

DeviceSchema.index({ deviceUniqueId: 1 }, { unique: true });

export default mongoose.model<IDevice>('Device', DeviceSchema);
