import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  punch_in_on: Date,
  punch_out_on: Date,

  allow_punch_in_by: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },

  allow_punch_out_by: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },

  punch_in_ip: {
    type: String,
    trim: true,
  },

  punch_out_ip: {
    type: String,
    trim: true,
  },

  punch_in_geo: {
    type: Array,
    trim: true,
  },

  punch_out_geo: {
    type: Array,
    trim: true,
  },

  punch_in_reason: {
    type: String,
    trim: true,
  },

  punch_out_reason: {
    type: String,
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
  { timestamps: true, });

const Attendance =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);

export default Attendance;