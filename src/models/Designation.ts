import mongoose, { Schema } from "mongoose";

const designationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
      index: true,
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

designationSchema.index({ name: 1, created_by: 1 }, { unique: true });
designationSchema.index({ created_by: 1, status: 1 });

delete (mongoose.models as any).Designation;

const Designation =
  mongoose.models.Designation ||
  mongoose.model("Designation", designationSchema);

export default Designation;