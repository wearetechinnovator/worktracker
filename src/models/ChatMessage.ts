import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReaction {
  emoji: string;
  users: string[]; // List of employee IDs who reacted
}

export interface IAttachment {
  fileUrl: string;
  fileName: string;
  fileType: string;
}

export interface IChatMessage extends Document {
  channelId: string; // e.g. '#general', '#random', '#announcements', 'project-<id>', 'dm-<user1>-<user2>'
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderAvatarColor: string;
  senderRole: string;
  content: string;
  reactions: IReaction[];
  replyToId?: mongoose.Types.ObjectId;
  replyToSenderName?: string;
  replyToContent?: string;
  attachments?: IAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    channelId: { type: String, required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    senderName: { type: String, required: true },
    senderAvatarColor: { type: String, required: true },
    senderRole: { type: String, required: true },
    content: { type: String, required: true },
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: String }],
      },
    ],
    replyToId: { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
    replyToSenderName: { type: String },
    replyToContent: { type: String },
    attachments: [
      {
        fileUrl: { type: String, required: true },
        fileName: { type: String, required: true },
        fileType: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

ChatMessageSchema.index({ channelId: 1, createdAt: 1 });

if (mongoose.models.ChatMessage) {
  delete (mongoose.models as any).ChatMessage;
}

const ChatMessage: Model<IChatMessage> = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessage;
