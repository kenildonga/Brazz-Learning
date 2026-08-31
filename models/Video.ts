import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVideo extends Document {
    _id: Types.ObjectId;
    slug: string;
    scrappedSlug: string;
    movieId: string;
    title: string;
    duration: number | null;
    thumbnail: string;
    description: string;
    metaTitle: string;
    metaDescription: string;
    pornstarIds: Types.ObjectId[];
    categoryIds: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const VideoSchema = new Schema<IVideo>(
    {
        slug: { type: String, required: true, unique: true },
        scrappedSlug: { type: String, required: true, unique: true, index: true },
        movieId: { type: String, required: true, index: true },
        title: { type: String, required: true },
        duration: { type: Number, default: null },
        thumbnail: { type: String, default: '' },
        description: { type: String, default: '' },
        metaTitle: { type: String, default: '' },
        metaDescription: { type: String, default: '' },
        pornstarIds: [{ type: Schema.Types.ObjectId, ref: 'Pornstar' }],
        categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    },
    { timestamps: true, versionKey: false, collection: 'videos' },
);

export default mongoose.model<IVideo>('Video', VideoSchema);
