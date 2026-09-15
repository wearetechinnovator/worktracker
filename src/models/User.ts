import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        qd_id: String,

        user_role: {
            type: Number,
            ref: "users",
        },
        

        full_name: String,

        email: String,

        phone_number: {
            type: Number,
            default: null,
        },

        password: String,

        profile_picture: {
            type: String,
            default: null,
        },

        designation: {
            type: String,
            default: null,
        },

        group: {
            type: String,
            default: null,
        },

        created_by: {
            type: Schema.Types.ObjectId,
            ref: "users",
        },

        modified_by: {
            type: Schema.Types.ObjectId,
            ref: "users",
        },

        isVerify: {
            type: Boolean,
            default: false,
        },

        status: Boolean,
    },
    {
        timestamps: true,
    }
);

const User =
    mongoose.models.User ||
    mongoose.model("User", userSchema);

export default User;
