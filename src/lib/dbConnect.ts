import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

declare global {
    var mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

async function dbConnect() {
    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI is not defined");
    }

    if (mongoose.connection.readyState >= 1) {
        return;
    }

    if (!globalThis.mongooseConnectionPromise) {
        globalThis.mongooseConnectionPromise = mongoose.connect(MONGODB_URI);
    }

    try {
        await globalThis.mongooseConnectionPromise;
    } catch (error) {
        globalThis.mongooseConnectionPromise = undefined;
        throw error;
    }

    console.log("MongoDB connected");
}

export default dbConnect;