import mongoose, { Schema } from "mongoose";

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    short_desc: {
      type: String,
      default: "",
      trim: true,
    },

    created_by: {
      type: Number,
      default: null,
    },

    modified_by: {
      type: Number,
      default: null,
    },

    status: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Role =
  mongoose.models.Role ||
  mongoose.model("Role", roleSchema);

export default Role;