import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployee extends Document {
  name: string;
  email: string;
  role: string;
  roleId?: mongoose.Types.ObjectId;
  Project: string;
  status: string; // e.g. "Active", "Sick Leave", "Work From Home"
  avatarColor: string; // Hex color code
  password: string;
  rawPassword?: string;
  userType: 'admin' | 'employee';
  workMode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, trim: true },
    email: { type: String, unique: true, trim: true, lowercase: true },
    role: { type: String, trim: true },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
    },
    Project: { type: String, trim: true },
    status: { type: String, default: 'Active', trim: true },
    avatarColor: { type: String, default: '#7f56d9' },
    password: { type: String, default: 'password123' },
    // rawPassword: { type: String, trim: true },
    userType: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    workMode: { type: String, default: 'Hybrid', enum: ['Hybrid', 'Remote', 'Onsite'], trim: true },
  },
  { timestamps: true }
);

EmployeeSchema.index({ Project: 1, status: 1 });

const Employee: Model<IEmployee> = mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
