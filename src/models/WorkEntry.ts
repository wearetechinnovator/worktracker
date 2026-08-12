import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkEntry extends Document {
  projectId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  actualTime: number; // Duration in minutes
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkEntrySchema = new Schema<IWorkEntry>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    actualTime: { type: Number, required: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

// Clear model cache in development to prevent schema caching issues
if (mongoose.models.WorkEntry) {
  delete mongoose.models.WorkEntry;
}

const WorkEntry: Model<IWorkEntry> = mongoose.model<IWorkEntry>('WorkEntry', WorkEntrySchema);

export default WorkEntry;
