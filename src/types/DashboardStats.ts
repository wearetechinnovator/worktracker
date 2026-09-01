export interface DashboardStats {
  employees: {
    total: number;
    active: number;
    inactive: number;
    present: number;
    absent: number;
    checkedIn: number;
    checkedOut: number;
    workingNow: number;
    attendanceRate: number;
  };
  tasks: {
    total: number;
    active: number;
    inProgress: number;
    todo: number;
    review: number;
    completed: number;
  };
  projects: {
    total: number;
    active: number;
    inactive: number;
    totalMinutes: number;
  };
  productivity: {
    todayMinutes: number;
    totalMinutes: number;
    attendanceRate: number;
  };
}