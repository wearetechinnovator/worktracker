import mongoose, { Schema } from "mongoose";

const taskLogSchema = new Schema(
  {
    task_id: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "To Do",
        "In Progress",
        "Partially Done",
        "Completed",
      ],
      required: true,
    },

    action: {
      type: String,
      enum: [
        "Created",
        "Started",
        "Paused",
        "Resumed",
        "Completed",
        "Updated",
      ],
      required: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

taskLogSchema.index({
  task_id: 1,
  user_id: 1,
  timestamp: -1,
});

const TaskLog =
  mongoose.models.TaskLog ||
  mongoose.model("TaskLog", taskLogSchema);

export default TaskLog;