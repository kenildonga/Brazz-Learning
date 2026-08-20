import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vibetint');
        console.log(`MongoDB Connected`);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        } else {
            console.error('Unknown error connecting to MongoDB');
        }
        process.exit(1);
    }
};

export default connectDB;
