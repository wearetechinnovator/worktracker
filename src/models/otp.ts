import mongoose, { Schema } from "mongoose";

const otpSchema = new Schema(
    {
        email: {
            type: String,
        },

        otp: {
            type: Number,
        },

        expires_at: {
            type: Date,
            required: true,
        },

        status: {
            type: Boolean,
        },
    },
    {
        timestamps: true,
    }
);

otpSchema.index(
    { expires_at: 1 },
    { expireAfterSeconds: 0 }
);

const Otp =
    mongoose.models.Otp ||
    mongoose.model("Otp", otpSchema);

export default Otp;