import mongoose, { Schema } from "mongoose";

const designationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    short_desc: {
      type: String,
      default: "",
      trim: true,
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

    status: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: {
      createdAt: "created_on",
      updatedAt: "modified_on",
    },
  }
);

const Designation =
  mongoose.models.Designation ||
  mongoose.model("Designation", designationSchema);

export default Designation;