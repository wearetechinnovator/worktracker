import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  projectId?: mongoose.Types.ObjectId;
  Project?: string;
  assignedTo: mongoose.Types.ObjectId[]; // Array of employee IDs
  createdBy: mongoose.Types.ObjectId; // Admin/Manager who created it
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  url?: string;
  urls?: string[];
  comments?: string;
  files?: Array<{ name: string; url: string; size?: number; type?: string }>;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    Project: { type: String, trim: true },
    assignedTo: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    priority: { 
      type: String, 
      enum: ['Low', 'Medium', 'High', 'Urgent'], 
      default: 'Medium',
      required: true 
    },
    status: { 
      type: String, 
      enum: ['To Do', 'In Progress', 'Review', 'Completed'], 
      default: 'To Do',
      required: true 
    },
    dueDate: { type: String },
    dueTime: { type: String },
    url: { type: String, trim: true },
    urls: [{ type: String }],
    comments: { type: String, trim: true },
    files: [{
      name: { type: String },
      url: { type: String },
      size: { type: Number },
      type: { type: String }
    }],
    tags: [{ type: String }],
  },
  { timestamps: true }
);

TaskSchema.index({ assignedTo: 1, createdAt: -1 });
TaskSchema.index({ createdBy: 1, createdAt: -1 });
TaskSchema.index({ projectId: 1, status: 1, createdAt: -1 });
TaskSchema.index({ Project: 1, status: 1, createdAt: -1 });

const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;
