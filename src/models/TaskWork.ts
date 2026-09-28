import mongoose, { Schema } from "mongoose";

const taskWorkFileSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      default: 0,
    },

    type: {
      type: String,
      default: "application/octet-stream",
    },
  },
  {
    _id: false,
  }
);

const taskWorkSchema = new Schema(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    startTime: {
      type: Date,
      default: null,
    },

    endTime: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["In Progress", "Paused", "Completed"],
      default: "In Progress",
      index: true,
    },

    notes: {
      type: String,
      default: "",
    },

    // Employee uploaded files
    files: {
      type: [taskWorkFileSchema],
      default: [],
    },

    // Employee submitted links
    links: {
      type: [String],
      default: [],
    },

    totalMinutes: {
      type: Number,
      default: 0,
    },

    isFullyCompleted: {
      type: Boolean,
      default: false,
    },

    pausedAt: {
      type: Date,
      default: null,
    },

    totalPausedMinutes: {
      type: Number,
      default: 0,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

taskWorkSchema.index({
  taskId: 1,
  employeeId: 1,
  status: 1,
});



const TaskWork =
  mongoose.models.TaskWork ||
  mongoose.model("TaskWork", taskWorkSchema);

export default TaskWork;