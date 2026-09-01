export interface WorkEntry {
  _id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  employeeId: string;
  employeeName: string;
  employeeAvatarColor: string;
  employeeRole: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  actualTime: number;
  description?: string;
  createdAt: string;
}