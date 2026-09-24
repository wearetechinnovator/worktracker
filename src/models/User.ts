import mongoose, { Schema } from "mongoose";

const userProfileSchema = new Schema(
  {
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
      default: null,
    },

    profile_picture: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const propertySchema = new Schema(
  {
    name: {
      type: String,
      default: null,
      trim: true,
    },

    logo: {
      type: String,
      default: null,
      trim: true,
    },

    short_description: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    qd_id: String,

    user_role: {
      type: Number,
      required: true,
    },

    full_name: {
      type: String,
      default: null,
      trim: true,
    },

    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },

    phone_number: {
      type: Number,
      default: null,
    },

    password: String,

    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
      default: null,
    },

    profile_picture: {
      type: String,
      default: null,
    },

    property_name: {
      type: String,
      default: null,
      trim: true,
    },

    property_logo: {
      type: String,
      default: null,
      trim: true,
    },

    short_description: {
      type: String,
      default: null,
      trim: true,
    },

    profile: {
      type: userProfileSchema,
      default: () => ({}),
    },

    property: {
      type: propertySchema,
      default: () => ({}),
    },

    designation: {
      type: String,
      default: null,
    },

    role_id: {
      type: Schema.Types.ObjectId,
      ref: "Role",
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

    settings_id: {
      type: Schema.Types.ObjectId,
      ref: "Settings",
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
  {
    timestamps: true,
  }
);

delete (mongoose.models as any).User;

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;