import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Document {
    deviceUnieqId: string;
    pushToken: string;
}

const DeviceSchema: Schema = new Schema({
    deviceUnieqId: { type: String, required: true, unique: true },
    pushToken: { type: String, required: true },
}, { timestamps: true, versionKey: false });

export default mongoose.model<IDevice>('Device', DeviceSchema);
