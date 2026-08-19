import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReaction {
  emoji: string;
  users: string[]; // List of employee IDs who reacted
}

export interface IChatMessage extends Document {
  channelId: string; // e.g. '#general', '#random', '#announcements', 'project-<id>', 'dm-<user1>-<user2>'
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderAvatarColor: string;
  senderRole: string;
  content: string;
  reactions: IReaction[];
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
  },
  { timestamps: true }
);

ChatMessageSchema.index({ channelId: 1, createdAt: 1 });

const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessage;
