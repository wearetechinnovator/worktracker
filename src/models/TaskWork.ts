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

if (mongoose.models.TaskWork) {
  delete mongoose.models.TaskWork;
}

const TaskWork: Model<ITaskWork> = mongoose.model<ITaskWork>('TaskWork', TaskWorkSchema);

export default TaskWork;
