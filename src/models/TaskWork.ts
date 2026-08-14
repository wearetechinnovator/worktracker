import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITaskWork extends Document {
  taskId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime?: string; // HH:MM:SS
  totalMinutes?: number; // Calculated duration
  status: 'In Progress' | 'Completed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskWorkSchema = new Schema<ITaskWork>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String },
    totalMinutes: { type: Number },
    status: { 
      type: String, 
      enum: ['In Progress', 'Completed'], 
      default: 'In Progress',
      required: true 
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

TaskWorkSchema.index({ employeeId: 1, date: 1, createdAt: -1 });
TaskWorkSchema.index({ taskId: 1, employeeId: 1, date: 1, status: 1 });

const TaskWork: Model<ITaskWork> = mongoose.models.TaskWork || mongoose.model<ITaskWork>('TaskWork', TaskWorkSchema);

export default TaskWork;
