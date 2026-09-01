export interface Task {
  _id: string;
  title: string;
  description?: string;
  projectId?: {
    _id: string;
    name: string;
    color: string;
  };
  Project?: string;
  assignedTo: Array<{
    _id: string;
    name: string;
    email: string;
    avatarColor: string;
  }>;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    avatarColor?: string;
  };
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  dueDate?: string;
  tags?: string[];
  createdAt: string;
}