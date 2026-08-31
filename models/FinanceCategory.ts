import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFinanceCategory extends Document {
    _id: Types.ObjectId;
    slug: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

const FinanceCategorySchema = new Schema<IFinanceCategory>(
    {
        slug: { type: String, required: true, unique: true },
        name: { type: String, required: true },
    },
    { timestamps: true, versionKey: false, collection: 'finance_categories' },
);

export default mongoose.model<IFinanceCategory>('FinanceCategory', FinanceCategorySchema);
