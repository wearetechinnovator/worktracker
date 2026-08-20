import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClient extends Document {
  name: string;
  emails: string[];
  address?: string;
  duration?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    emails: [{ type: String, trim: true, lowercase: true }],
    address: { type: String, trim: true },
    duration: { type: String, trim: true },
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.Client) {
  delete (mongoose.models as any).Client;
}

const Client: Model<IClient> = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);

export default Client;
