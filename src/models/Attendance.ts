import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'On Leave';
  checkIn?: string;
  checkOut?: string;
  checkInIpAddress?: string;
  checkOutIpAddress?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ['Present', 'Absent', 'On Leave'], default: 'Present', required: true },
    checkIn: { type: String },
    checkOut: { type: String },
    checkInIpAddress: { type: String },
    checkOutIpAddress: { type: String },
    checkInLocation: { type: String },
    checkOutLocation: { type: String },
    checkInLatitude: { type: Number },
    checkInLongitude: { type: Number },
    checkOutLatitude: { type: Number },
    checkOutLongitude: { type: Number },
  },
  { timestamps: true }
);

AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1 });

const Attendance: Model<IAttendance> = mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;
