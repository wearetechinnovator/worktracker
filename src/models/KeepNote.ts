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
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 10000 },
    color: { type: String, default: '#fef9c3', trim: true },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

KeepNoteSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 });

if (mongoose.models && mongoose.models.KeepNote) {
  delete (mongoose.models as any).KeepNote;
}

const KeepNote: Model<IKeepNote> =
  mongoose.models.KeepNote || mongoose.model<IKeepNote>('KeepNote', KeepNoteSchema);

export default KeepNote;

