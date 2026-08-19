import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatChannel extends Document {
  name: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  allowMessages: 'anyone' | 'admin_only';
  allowAttachments: 'anyone' | 'admin_only';
  createdAt: Date;
  updatedAt: Date;
}

const ChatChannelSchema = new Schema<IChatChannel>(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    allowMessages: { type: String, enum: ['anyone', 'admin_only'], default: 'anyone' },
    allowAttachments: { type: String, enum: ['anyone', 'admin_only'], default: 'anyone' },
  },
  { timestamps: true }
);

if (mongoose.models.ChatChannel) {
  delete (mongoose.models as any).ChatChannel;
}

const ChatChannel: Model<IChatChannel> = mongoose.model<IChatChannel>('ChatChannel', ChatChannelSchema);

export default ChatChannel;
