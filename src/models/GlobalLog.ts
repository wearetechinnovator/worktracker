import mongoose, { Schema } from "mongoose";

const globalLogSchema = new Schema(
  {
    actor_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },


    action: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "ADD",
        "REMOVE",
        "ASSIGN",
        "UNASSIGN",
        "APPROVE",
        "REJECT",
        "REVIEW",
        "PUNCH_IN",
        "PUNCH_OUT",
        "LOGIN",
        "LOGOUT",
        "REQUEST",
        "START",
        "PAUSE",
        "RESUME",
        "COMPLETE",
      ],
      required: true,
      index: true,
    },


    entity_type: {
      type: String,
      enum: [
        "User",
        "Task",
        "Project",
        "Client",
        "Role",
        "Designation",
        "Attendance",
        "AttendanceRequest",
        "TaskWork",
        "Settings",
      ],
      required: true,
      index: true,
    },


    entity_id: {
      type: Schema.Types.ObjectId,
      refPath: "entity_type",
      default: null,
      index: true,
    },


    target_user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },


    description: {
      type: String,
      required: true,
      trim: true,
    },


    information: {
      type: String,
      default: null,
    },

    status: {
      type: Boolean,
      default: true,
      index: true,
    },

    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Indexes

globalLogSchema.index({
  actor_id: 1,
  created_at: -1,
});

globalLogSchema.index({
  entity_type: 1,
  entity_id: 1,
  created_at: -1,
});

globalLogSchema.index({
  target_user_id: 1,
  created_at: -1,
});

globalLogSchema.index({
  action: 1,
  created_at: -1,
});

const GlobalLog =
  mongoose.models.GlobalLog ||
  mongoose.model("GlobalLog", globalLogSchema);

export default GlobalLog;
