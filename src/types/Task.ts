export interface TaskComment {
  _id?: string;
  comment: string;
  user_id?: {
    _id: string;
    full_name?: string;
    name?: string;
    email?: string;
    profile_picture?: string;
    avatarColor?: string;
  } | string;
  datetime?: string;
}

export interface TaskFile {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  
  // New Task Model Fields
  project_id?: {
    _id: string;
    name: string;
    color?: string;
  } | string;
  
  assign_to?: Array<{
    _id: string;
    full_name?: string;
    name?: string;
    email?: string;
    avatarColor?: string;
  } | string>;
  
  created_by?: {
    _id: string;
    full_name?: string;
    name?: string;
    email?: string;
    avatarColor?: string;
  } | string | number;
  
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  task_status: 'To Do' | 'In Progress' | 'Partially Completed' | 'Review' | 'Completed';
  
  files?: TaskFile[];
  urls?: string[];
  comments?: TaskComment[];
  
  completion_date?: string;
  completion_time?: string;
  
  created_on?: string;
  modified_by?: {
    _id: string;
    full_name?: string;
    name?: string;
  } | string | number;
  modified_on?: string;
  
  status: number; // 1 = active, 0 = inactive/deleted

  // Legacy / UI compatibility properties
  projectId?: any;
  Project?: string;
  assignedTo?: any[];
  createdBy?: any;
  dueDate?: string;
  dueTime?: string;
  url?: string;
  commentsList?: any[];
  contactPerson?: string;
  contactPersons?: string[];
  tags?: string[];
  createdAt?: string;
}