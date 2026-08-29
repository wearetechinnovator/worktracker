import mongoose, { Schema, Document } from 'mongoose';

export interface IAiSession extends Document {
  employeeId: mongoose.Types.ObjectId | string;
  employeeName: string;
  employeeAvatarColor?: string;
  projectId?: mongoose.Types.ObjectId | string;
  projectName?: string;
  taskId?: mongoose.Types.ObjectId | string;
  taskTitle?: string;
  aiWebsite: string;
  aiUrl: string;
  startTime: Date;
  endTime?: Date;
  activeMinutes: number;
  idleMinutes: number;
  screenshotUrl?: string;
  status: 'Active' | 'Paused' | 'Completed';
  classification: 'AI-associated activity';
  createdAt: Date;
  updatedAt: Date;
}

const AiSessionSchema: Schema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, required: true },
    employeeAvatarColor: { type: String, default: '#3b82f6' },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    projectName: { type: String, default: '' },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    taskTitle: { type: String, default: '' },
    aiWebsite: { type: String, required: true }, // e.g. ChatGPT, Gemini, Claude, Copilot, Perplexity
    aiUrl: { type: String, required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    activeMinutes: { type: Number, default: 0 },
    idleMinutes: { type: Number, default: 0 },
    screenshotUrl: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Paused', 'Completed'], default: 'Completed' },
    classification: { type: String, default: 'AI-associated activity' },
  },
  { timestamps: true }
);

export default mongoose.models.AiSession || mongoose.model<IAiSession>('AiSession', AiSessionSchema);
