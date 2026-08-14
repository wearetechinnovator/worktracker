import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  projectId?: mongoose.Types.ObjectId;
  department?: string;
  assignedTo: mongoose.Types.ObjectId[]; // Array of employee IDs
  createdBy: mongoose.Types.ObjectId; // Admin/Manager who created it
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  dueDate?: string; // YYYY-MM-DD
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    department: { type: String, trim: true },
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
    tags: [{ type: String }],
  },
  { timestamps: true }
);

TaskSchema.index({ assignedTo: 1, createdAt: -1 });
TaskSchema.index({ createdBy: 1, createdAt: -1 });
TaskSchema.index({ projectId: 1, status: 1, createdAt: -1 });
TaskSchema.index({ department: 1, status: 1, createdAt: -1 });

const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;
