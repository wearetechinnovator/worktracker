import mongoose, { Schema } from "mongoose";

const suggestionSchema = new Schema({
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    suggestion: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      default: "pending",
      trim: true,
    },

    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approved_at: {
      type: Date,
      default: null,
    },
  },
  {timestamps: true}
);

if (mongoose.models && mongoose.models.Suggestion) {
  delete (mongoose.models as any).Suggestion;
}

const Suggestion =
  mongoose.models.Suggestion ||
  mongoose.model("Suggestion", suggestionSchema);

export default Suggestion;