import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description?: string;
  color?: string;
  position?: number;
  isSystemRole?: boolean;
  isSystemAdmin?: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    color: { type: String, default: '#7f56d9' },
    position: { type: Number, default: 0 },
    isSystemRole: { type: Boolean, default: false },
    isSystemAdmin: { type: Boolean, default: false },
    permissions: {
      type: [String],
      default: [],
      required: true,
    },
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.Role) {
  delete (mongoose.models as any).Role;
}

const Role: Model<IRole> = mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);

export default Role;
