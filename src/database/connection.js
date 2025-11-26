import mongoose from "mongoose";

const connectDatabase = async () => {

    try {
        const connectionInstance = await mongoose.connect(process.env.DATABASE_URL);

        console.log(`MongoDB connected from ${connectionInstance.connection.host}`);

    } catch (error) {
        console.error("database connection failed", error);
        process.exit(1)
    }
}

export default connectDatabase;