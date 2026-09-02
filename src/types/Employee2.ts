export interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  Project: string;
  status: string;
  avatarColor: string;
  userType: 'admin' | 'employee';
  password?: string;
  workMode?: string;
  totalMinutes: number;
  todayAttendance?: {
    allowPunchInDate?: string | null;
    allowPunchOutDate?: string | null;
  } | null;
}