import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICategory extends Document {
    _id: Types.ObjectId;
    slug: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
    {
        slug: { type: String, required: true, unique: true },
        name: { type: String, required: true },
    },
    { timestamps: true, versionKey: false, collection: 'categories' },
);

export default mongoose.model<ICategory>('Category', CategorySchema);
