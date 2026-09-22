import mongoose, { Schema } from "mongoose";

const settingsSchema = new Schema(
  {
    owner_user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    punchInGeoRequired: {
      type: Boolean,
      default: false,
    },

    punchInIpRequired: {
      type: Boolean,
      default: false,
    },

    punchInBrowserRequired: {
      type: Boolean,
      default: false,
    },

    punchInSystemIdRequired: {
      type: Boolean,
      default: false,
    },

    punchOutGeoRequired: {
      type: Boolean,
      default: false,
    },

    punchOutIpRequired: {
      type: Boolean,
      default: false,
    },

    punchOutBrowserRequired: {
      type: Boolean,
      default: false,
    },

    punchOutSystemIdRequired: {
      type: Boolean,
      default: false,
    },


    punchInStartTime: {
      type: String,
      default: null,
    },

    punchInEndTime: {
      type: String,
      default: null,
    },

    punchOutStartTime: {
      type: String,
      default: null,
    },

    punchOutEndTime: {
      type: String,
      default: null,
    },

    taskIdPrefix: {
      type: String,
      default: "QT",
      trim: true,
      uppercase: true,
    },

    nextTaskNumber: {
      type: Number,
      default: 1,
      min: 1,
    },

    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    created_on: {
      type: Date,
      default: Date.now,
    },

    modified_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    modified_on: {
      type: Date,
      default: null,
    },

    status: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

const Settings =
  mongoose.models.Settings ||
  mongoose.model("Settings", settingsSchema);

export default Settings;