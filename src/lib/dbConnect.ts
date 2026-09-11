import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

async function dbConnect() {
    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI is not defined");
    }

    if (mongoose.connection.readyState >= 1) {
        return;
    }

    await mongoose.connect(MONGODB_URI);

    console.log("MongoDB connected");
}

export default dbConnect;