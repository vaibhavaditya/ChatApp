import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        // console.log(process.env.MONGODB_URI);
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI)
        console.log(`MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);    } catch (error) {
        console.error("MongoDB connection failed", error);
        process.exit(1);   
    }
}