import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    qd_id: String,
    user_role: {
      type: Number,
      required: true,
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
      ref: "User",
      default: null,
    },
    modified_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isVerify: {
      type: Boolean,
      default: false,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
