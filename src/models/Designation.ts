import mongoose, { Schema, Document } from 'mongoose';

export interface IDesignation extends Document {
  name: string;
  createdAt: Date;
}

const DesignationSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Designation ||
  mongoose.model<IDesignation>('Designation', DesignationSchema);
