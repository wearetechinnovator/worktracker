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
    timestamps: true,
  }
);

const cachedRoleModel = mongoose.models.Role;

if (
  process.env.NODE_ENV !== "production" &&
  cachedRoleModel?.schema.path("created_by")?.instance === "Number"
) {
  mongoose.deleteModel("Role");
}

const Role =
  mongoose.models.Role ||
  mongoose.model("Role", roleSchema);

export default Role;