import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description?: string;
  color: string;
  members: mongoose.Types.ObjectId[];
  clientId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    color: { type: String, default: '#3b82f6' },
    members: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
  },
  { timestamps: true }
);

ProjectSchema.index({ members: 1, createdAt: -1 });

if (mongoose.models && mongoose.models.Project) {
  delete (mongoose.models as any).Project;
}

const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
