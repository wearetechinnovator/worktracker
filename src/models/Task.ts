import mongoose, { Schema } from "mongoose";

/* =========================================================
   COMMENT SCHEMA
   ========================================================= */

const taskCommentSchema = new Schema({
  comment: {
    type: String,
    default: "",
    trim: true,
  },

  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  datetime: {
    type: Date,
    default: Date.now,
  },
},
  { _id: true, }
);

/* =========================================================
   TASK SCHEMA
   ========================================================= */

const taskSchema = new Schema(
  {
    task_id: {
      type: String,
      index: true,
    },

    admin_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    /* -------------------------
       PROJECT
       ------------------------- */

    project_id: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    /* -------------------------
       ASSIGNED EMPLOYEES
       ------------------------- */

    assign_to: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },

    /* -------------------------
       CREATOR
       ------------------------- */

    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    /* -------------------------
       PRIORITY
       ------------------------- */

    priority: {
      type: String,
      enum: [
        "Low",
        "Medium",
        "High",
        "Urgent",
      ],
      default: "Medium",
    },

    /* -------------------------
       TASK STATUS
       ------------------------- */

    task_status: {
      type: String,
      enum: [
        "To Do",
        "In Progress",
        "Paused",
        "Partially Done",
        "Partially Completed",
        "Review",
        "Completed",
      ],
      default: "To Do",
    },

    /* -------------------------
       FILES
       ------------------------- */

    files: {
      type: [
        {
          type: Schema.Types.Mixed,
        },
      ],
      default: [],
    },

    /* -------------------------
       URLS
       ------------------------- */

    urls: {
      type: [
        {
          type: Schema.Types.Mixed,
        },
      ],
      default: [],
    },

    /* -------------------------
       COMMENTS
       ------------------------- */

    comments: {
      type: [taskCommentSchema],
      default: [],
    },

    task_assign_date:{
      type: Date,
      default: null,
    },

    task_delay_reason:{
      type: String,
      default: null,
    },

    /* -------------------------
       COMPLETION
       ------------------------- */

    completion_date: {
      type: Date,
      default: null,
    },

    completion_time: {
      type: Date,
      default: null,
    },

    /* -------------------------
       CREATED
       ------------------------- */

    created_on: {
      type: Date,
      default: Date.now,
    },

    /* -------------------------
       MODIFIED
       ------------------------- */

    modified_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    modified_on: {
      type: Date,
      default: null,
    },

    /* -------------------------
       STATUS
       ------------------------- */

    status: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,

  }
);

taskSchema.index(
  { admin_id: 1, task_id: 1 },
  { unique: true, sparse: true }
);

delete (mongoose.models as any).Task;

const Task =
  mongoose.models.Task ||
  mongoose.model("Task", taskSchema);

export default Task;
