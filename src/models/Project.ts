import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    short_description: {
      type: String,
      default: "",
      trim: true,
    },

    project_users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    start_date: {
      type: Date,
      default: Date.now,
    },

    end_date: {
      type: Date,
      default: null,
    },

    client: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    modified_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

const Project =
  mongoose.models.Project ||
  mongoose.model("Project", projectSchema);

export default Project;