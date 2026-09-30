import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // YYYY-MM-DD based on employee's attendance day
    attendance_date: {
      type: String,
      required: true,
    },

    punch_in_on: {
      type: Date,
      default: null,
    },

    punch_out_on: {
      type: Date,
      default: null,
    },

    // manual = employee/admin action, system = automatic 11:59 PM punch-out
    punch_out_source: {
      type: String,
      enum: ["manual", "system"],
      default: "manual",
      index: true,
    },

    allow_punch_in_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    allow_punch_out_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    punch_in_ip: {
      type: String,
      default: null,
      trim: true,
    },

    punch_out_ip: {
      type: String,
      default: null,
      trim: true,
    },

    punch_in_geo: {
      type: [Schema.Types.Mixed],
      default: [],
    },

    punch_out_geo: {
      type: [Schema.Types.Mixed],
      default: [],
    },

    punch_in_reason: {
      type: String,
      default: null,
      trim: true,
    },

    punch_out_reason: {
      type: String,
      default: null,
      trim: true,
    },

    punch_in_browser: {
      type: String,
      default: null,
      trim: true,
    },

    punch_out_browser: {
      type: String,
      default: null,
      trim: true,
    },

    punch_in_systemid: {
      type: String,
      default: null,
      trim: true,
    },

    punch_out_systemid: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index(
  {
    user_id: 1,
    attendance_date: 1,
  },
  {
    unique: true,
  }
);

const Attendance =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);

export default Attendance;
