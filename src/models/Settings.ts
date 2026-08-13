import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  punchInStartTime: string; // Format: "HH:MM" e.g., "09:00"
  punchInEndTime: string; // Format: "HH:MM" e.g., "10:00"
  punchOutStartTime: string; // Format: "HH:MM" e.g., "17:00"
  punchOutEndTime: string; // Format: "HH:MM" e.g., "19:00"
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    punchInStartTime: { type: String, required: true, default: '09:00' },
    punchInEndTime: { type: String, required: true, default: '10:00' },
    punchOutStartTime: { type: String, required: true, default: '17:00' },
    punchOutEndTime: { type: String, required: true, default: '19:00' },
  },
  { timestamps: true }
);

if (mongoose.models.Settings) {
  delete mongoose.models.Settings;
}

const Settings: Model<ISettings> = mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
