import mongoose, { Schema } from "mongoose";

const attendanceRequestSchema = new Schema(
  {
    employee_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    admin_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    attendance_date: {
      type: String,
      required: true,
      index: true,
    },

    request_type: {
      type: String,
      enum: ["punchIn", "punchOut"],
      required: true,
      index: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    requested_at: {
      type: Date,
      default: Date.now,
    },

    requested_punch_at: {
      type: Date,
      default: Date.now,
    },

    ip: {
      type: String,
      default: null,
    },

    browser: {
      type: String,
      default: null,
    },

    geo: {
      type: [Schema.Types.Mixed],
      default: [],
    },

    systemid: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },

    reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewed_at: {
      type: Date,
      default: null,
    },

    rejection_reason: {
      type: String,
      default: null,
      trim: true,
    },

    /*
     * Approval is only an allowance.
     * This becomes non-null only after the employee actually clicks
     * Punch In / Punch Out and the punch action succeeds.
     */
    used_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/*
 * Only one active request/allowance can exist for the same employee,
 * date and action at a time.
 *
 * After an approved allowance is consumed, used_at is populated and
 * a new request is still blocked by the Attendance record itself.
 */
attendanceRequestSchema.index(
  {
    employee_id: 1,
    attendance_date: 1,
    request_type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      used_at: null,
      status: { $in: ["Pending", "Approved"] },
    },
  }
);

const AttendanceRequest =
  mongoose.models.AttendanceRequest ||
  mongoose.model("AttendanceRequest", attendanceRequestSchema);

export default AttendanceRequest;
