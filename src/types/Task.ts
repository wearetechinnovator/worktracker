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
  status: 'To Do' | 'In Progress' | 'Partially Completed' | 'Review' | 'Completed';
  dueDate?: string;
  dueTime?: string;
  url?: string;
  urls?: string[];
  comments?: string;
  commentsList?: Array<{
    _id?: string;
    author: {
      _id: string;
      name: string;
      email?: string;
      avatarColor?: string;
      role?: string;
    };
    content: string;
    createdAt: string;
  }>;
  tags?: string[];
  createdAt: string;
}