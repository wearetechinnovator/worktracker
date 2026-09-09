import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClientContact {
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  label?: string;
}

export interface IClient extends Document {
  name: string;
  phone?: string;
  emails: string[];
  address?: string;
  duration?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  contacts?: IClientContact[];
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    emails: [{ type: String, trim: true, lowercase: true }],
    address: { type: String, trim: true },
    duration: { type: String, trim: true },
    contractStartDate: { type: String, trim: true },
    contractEndDate: { type: String, trim: true },
    contacts: [{
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      designation: { type: String, trim: true },
      label: { type: String, trim: true },
    }],
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.Client) {
  delete (mongoose.models as any).Client;
}

const Client: Model<IClient> = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);

export default Client;
