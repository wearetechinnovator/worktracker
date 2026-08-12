import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployee extends Document {
  name: string;
  email: string;
  role: string;
  department: string;
  status: string; // e.g. "Active", "Sick Leave", "Work From Home"
  avatarColor: string; // Hex color code
  password: string;
  userType: 'admin' | 'employee';
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    role: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    status: { type: String, default: 'Active', trim: true },
    avatarColor: { type: String, default: '#7f56d9' },
    password: { type: String, required: true, default: 'password123' },
    userType: { type: String, required: true, enum: ['admin', 'employee'], default: 'employee' },
  },
  { timestamps: true }
);

// Clear model cache in development to prevent schema caching issues
if (mongoose.models.Employee) {
  delete mongoose.models.Employee;
}

const Employee: Model<IEmployee> = mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
