import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IKeepNote extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KeepNoteSchema = new Schema<IKeepNote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    color: { type: String, default: '#f8fafc', trim: true },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

KeepNoteSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 });

const KeepNote: Model<IKeepNote> =
  mongoose.models.KeepNote || mongoose.model<IKeepNote>('KeepNote', KeepNoteSchema);

export default KeepNote;
