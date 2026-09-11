/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MockUser {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  userType: 'admin' | 'employee';
  Project: string;
  avatarColor: string;
  workMode: 'Office' | 'Remote' | 'Hybrid';
  isSystemAdmin: boolean;
  permissions: string[];
  isPunchedIn?: boolean;
}

export const INITIAL_DEMO_USER: MockUser = {
  _id: 'emp-admin-101',
  id: 'emp-admin-101',
  name: 'Alex Johnson',
  email: 'alex.johnson@techinnovator.com',
  role: 'System Administrator',
  roleId: 'role-admin-1',
  userType: 'admin',
  Project: 'AI WorkTracker Pro',
  avatarColor: '#4f46e5',
  workMode: 'Hybrid',
  isSystemAdmin: true,
  permissions: [
    'dashboard:view', 'dashboard:edit',
    'projects:create', 'projects:read', 'projects:update', 'projects:delete',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete',
    'employees:create', 'employees:read', 'employees:update', 'employees:delete',
    'roles:create', 'roles:read', 'roles:update', 'roles:delete',
    'clients:create', 'clients:read', 'clients:update', 'clients:delete',
    'attendance:read', 'attendance:manage',
    'keep-notes:create', 'keep-notes:read', 'keep-notes:update', 'keep-notes:delete',
    'settings:manage'
  ],
  isPunchedIn: true,
};

export const INITIAL_ROLES = [
  {
    _id: 'role-admin-1',
    name: 'System Admin',
    description: 'Full system control with access to all modules and configurations.',
    isSystemAdmin: true,
    permissions: [
      'dashboard:view', 'projects:create', 'projects:read', 'projects:update', 'projects:delete',
      'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete',
      'employees:create', 'employees:read', 'employees:update', 'employees:delete',
      'roles:create', 'roles:read', 'roles:update', 'roles:delete',
      'clients:create', 'clients:read', 'clients:update', 'clients:delete'
    ],
    userCount: 2,
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    _id: 'role-mgr-2',
    name: 'Project Manager',
    description: 'Manages projects, task allocations, client relations, and team workloads.',
    isSystemAdmin: false,
    permissions: [
      'dashboard:view', 'projects:create', 'projects:read', 'projects:update',
      'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete',
      'employees:read', 'clients:read'
    ],
    userCount: 3,
    createdAt: '2026-01-15T09:30:00.000Z'
  },
  {
    _id: 'role-dev-3',
    name: 'Senior Developer',
    description: 'Executes complex tasks, conducts code reviews, and updates work logs.',
    isSystemAdmin: false,
    permissions: ['dashboard:view', 'projects:read', 'tasks:read', 'tasks:update'],
    userCount: 5,
    createdAt: '2026-02-01T10:00:00.000Z'
  },
  {
    _id: 'role-des-4',
    name: 'UI/UX Designer',
    description: 'Designs UI components, wireframes, prototypes, and design systems.',
    isSystemAdmin: false,
    permissions: ['dashboard:view', 'projects:read', 'tasks:read', 'tasks:update'],
    userCount: 2,
    createdAt: '2026-02-05T11:00:00.000Z'
  },
  {
    _id: 'role-qa-5',
    name: 'QA Lead',
    description: 'Conducts automated/manual testing and tracks bug fixes across projects.',
    isSystemAdmin: false,
    permissions: ['dashboard:view', 'projects:read', 'tasks:read', 'tasks:update'],
    userCount: 2,
    createdAt: '2026-02-10T14:00:00.000Z'
  }
];

export const INITIAL_DESIGNATIONS = [
  { _id: 'desig-1', name: 'Lead Architect', department: 'Engineering' },
  { _id: 'desig-2', name: 'Senior Fullstack Engineer', department: 'Engineering' },
  { _id: 'desig-3', name: 'Senior Frontend Developer', department: 'Engineering' },
  { _id: 'desig-4', name: 'Backend Specialist', department: 'Engineering' },
  { _id: 'desig-5', name: 'Product Designer', department: 'Design' },
  { _id: 'desig-6', name: 'Technical Project Manager', department: 'Management' },
  { _id: 'desig-7', name: 'DevOps & Security Engineer', department: 'Operations' }
];

export const INITIAL_CLIENTS = [
  {
    _id: 'client-1',
    name: 'Acme Financials Inc.',
    companyName: 'Acme Corp',
    email: 'contact@acmefin.com',
    phone: '+1 (555) 234-5678',
    address: '100 Financial Way, Suite 400, New York, NY',
    industry: 'FinTech',
    status: 'Active',
    projectCount: 2,
    contacts: [
      { name: 'Sarah Jenkins', designation: 'VP of Product', email: 's.jenkins@acmefin.com', phone: '+1 555 901 2345' }
    ],
    createdAt: '2026-01-05T09:00:00.000Z'
  },
  {
    _id: 'client-2',
    name: 'Nexus Tech Solutions',
    companyName: 'Nexus Tech',
    email: 'hello@nexustech.io',
    phone: '+1 (555) 876-5432',
    address: '75 Tech Blvd, Austin, TX',
    industry: 'Cloud Infrastructure',
    status: 'Active',
    projectCount: 2,
    contacts: [
      { name: 'Marcus Vance', designation: 'CTO', email: 'marcus@nexustech.io', phone: '+1 555 321 6549' }
    ],
    createdAt: '2026-01-20T10:30:00.000Z'
  },
  {
    _id: 'client-3',
    name: 'Apex Healthcare Systems',
    companyName: 'Apex Health',
    email: 'support@apexhealth.org',
    phone: '+1 (555) 432-1098',
    address: '500 Medical Center Dr, Boston, MA',
    industry: 'Healthcare',
    status: 'Active',
    projectCount: 1,
    contacts: [
      { name: 'Dr. Elena Rostova', designation: 'CIO', email: 'elena@apexhealth.org', phone: '+1 555 789 0123' }
    ],
    createdAt: '2026-02-01T14:15:00.000Z'
  }
];

export const INITIAL_EMPLOYEES = [
  {
    _id: 'emp-admin-101',
    name: 'Alex Johnson',
    email: 'alex.johnson@techinnovator.com',
    role: 'System Admin',
    roleId: 'role-admin-1',
    designation: 'Lead Architect',
    userType: 'admin',
    Project: 'AI WorkTracker Pro',
    status: 'Active',
    avatarColor: '#4f46e5',
    workMode: 'Hybrid',
    phone: '+1 555-0101',
    joiningDate: '2025-01-15',
    totalMinutes: 2840,
  },
  {
    _id: 'emp-dev-102',
    name: 'Sarah Connor',
    email: 'sarah.c@techinnovator.com',
    role: 'Senior Developer',
    roleId: 'role-dev-3',
    designation: 'Senior Frontend Developer',
    userType: 'employee',
    Project: 'AI WorkTracker Pro',
    status: 'Active',
    avatarColor: '#06b6d4',
    workMode: 'Remote',
    phone: '+1 555-0102',
    joiningDate: '2025-03-01',
    totalMinutes: 2420,
  },
  {
    _id: 'emp-mgr-103',
    name: 'David Miller',
    email: 'david.m@techinnovator.com',
    role: 'Project Manager',
    roleId: 'role-mgr-2',
    designation: 'Technical Project Manager',
    userType: 'employee',
    Project: 'Mobile Banking App',
    status: 'Active',
    avatarColor: '#10b981',
    workMode: 'Office',
    phone: '+1 555-0103',
    joiningDate: '2025-02-10',
    totalMinutes: 2980,
  },
  {
    _id: 'emp-des-104',
    name: 'Emily Watson',
    email: 'emily.w@techinnovator.com',
    role: 'UI/UX Designer',
    roleId: 'role-des-4',
    designation: 'Product Designer',
    userType: 'employee',
    Project: 'Enterprise CRM Redesign',
    status: 'Active',
    avatarColor: '#ec4899',
    workMode: 'Hybrid',
    phone: '+1 555-0104',
    joiningDate: '2025-04-12',
    totalMinutes: 2150,
  },
  {
    _id: 'emp-dev-105',
    name: 'Michael Chen',
    email: 'michael.c@techinnovator.com',
    role: 'Senior Developer',
    roleId: 'role-dev-3',
    designation: 'Backend Specialist',
    userType: 'employee',
    Project: 'Mobile Banking App',
    status: 'Active',
    avatarColor: '#8b5cf6',
    workMode: 'Remote',
    phone: '+1 555-0105',
    joiningDate: '2025-05-01',
    totalMinutes: 2610,
  },
  {
    _id: 'emp-qa-106',
    name: 'Jessica Taylor',
    email: 'jessica.t@techinnovator.com',
    role: 'QA Lead',
    roleId: 'role-qa-5',
    designation: 'QA Lead Engineer',
    userType: 'employee',
    Project: 'AI WorkTracker Pro',
    status: 'Active',
    avatarColor: '#f59e0b',
    workMode: 'Office',
    phone: '+1 555-0106',
    joiningDate: '2025-06-20',
    totalMinutes: 1950,
  }
];

export const INITIAL_PROJECTS = [
  {
    _id: 'proj-101',
    name: 'AI WorkTracker Pro',
    description: 'Modern enterprise workforce management system with realtime productivity tracking, AI analytics, and Kanban flows.',
    color: '#4f46e5',
    clientId: 'client-2',
    clientName: 'Nexus Tech Solutions',
    status: 'In Progress',
    progress: 78,
    members: [
      { _id: 'emp-admin-101', name: 'Alex Johnson', email: 'alex.johnson@techinnovator.com', avatarColor: '#4f46e5' },
      { _id: 'emp-dev-102', name: 'Sarah Connor', email: 'sarah.c@techinnovator.com', avatarColor: '#06b6d4' },
      { _id: 'emp-qa-106', name: 'Jessica Taylor', email: 'jessica.t@techinnovator.com', avatarColor: '#f59e0b' }
    ],
    budget: '$45,000',
    startDate: '2026-01-01',
    endDate: '2026-10-31',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    _id: 'proj-102',
    name: 'Mobile Banking App',
    description: 'Next-gen iOS and Android mobile app for retail banking with biometrics, instant transfers, and smart budgeting.',
    color: '#10b981',
    clientId: 'client-1',
    clientName: 'Acme Financials Inc.',
    status: 'In Progress',
    progress: 62,
    members: [
      { _id: 'emp-mgr-103', name: 'David Miller', email: 'david.m@techinnovator.com', avatarColor: '#10b981' },
      { _id: 'emp-dev-105', name: 'Michael Chen', email: 'michael.c@techinnovator.com', avatarColor: '#8b5cf6' }
    ],
    budget: '$80,000',
    startDate: '2026-02-15',
    endDate: '2026-11-30',
    createdAt: '2026-02-15T00:00:00.000Z'
  },
  {
    _id: 'proj-103',
    name: 'Enterprise CRM Redesign',
    description: 'Complete visual and functional overhaul of customer relationship portal with micro-interactions and dark theme.',
    color: '#ec4899',
    clientId: 'client-3',
    clientName: 'Apex Healthcare Systems',
    status: 'In Progress',
    progress: 45,
    members: [
      { _id: 'emp-des-104', name: 'Emily Watson', email: 'emily.w@techinnovator.com', avatarColor: '#ec4899' },
      { _id: 'emp-dev-102', name: 'Sarah Connor', email: 'sarah.c@techinnovator.com', avatarColor: '#06b6d4' }
    ],
    budget: '$35,000',
    startDate: '2026-03-01',
    endDate: '2026-09-15',
    createdAt: '2026-03-01T00:00:00.000Z'
  },
  {
    _id: 'proj-104',
    name: 'Cloud Infrastructure Analytics',
    description: 'Real-time monitoring and anomaly detection dashboard for AWS/GCP Kubernetes clusters.',
    color: '#3b82f6',
    clientId: 'client-2',
    clientName: 'Nexus Tech Solutions',
    status: 'Completed',
    progress: 100,
    members: [
      { _id: 'emp-admin-101', name: 'Alex Johnson', email: 'alex.johnson@techinnovator.com', avatarColor: '#4f46e5' },
      { _id: 'emp-dev-105', name: 'Michael Chen', email: 'michael.c@techinnovator.com', avatarColor: '#8b5cf6' }
    ],
    budget: '$60,000',
    startDate: '2025-08-01',
    endDate: '2026-02-28',
    createdAt: '2025-08-01T00:00:00.000Z'
  }
];

export const INITIAL_TASKS = [
  {
    _id: 'task-301',
    title: 'Implement Dark Theme & High-Contrast Mode',
    description: 'Refactor root layout to support dynamic CSS variables and Tailwind class toggling for accessible themes.',
    projectId: { _id: 'proj-101', name: 'AI WorkTracker Pro', color: '#4f46e5' },
    Project: 'AI WorkTracker Pro',
    assignedTo: [
      { _id: 'emp-dev-102', name: 'Sarah Connor', email: 'sarah.c@techinnovator.com', avatarColor: '#06b6d4' }
    ],
    createdBy: { _id: 'emp-admin-101', name: 'Alex Johnson', email: 'alex.johnson@techinnovator.com', avatarColor: '#4f46e5' },
    priority: 'High',
    status: 'In Progress',
    dueDate: '2026-09-18',
    dueTime: '17:00',
    tags: ['UI', 'Accessibility', 'Frontend'],
    createdAt: '2026-09-01T10:00:00.000Z'
  },
  {
    _id: 'task-302',
    title: 'OAuth2 & Biometric Mobile Auth Integration',
    description: 'Integrate FaceID/TouchID native prompts with JWT refresh token rotation for mobile clients.',
    projectId: { _id: 'proj-102', name: 'Mobile Banking App', color: '#10b981' },
    Project: 'Mobile Banking App',
    assignedTo: [
      { _id: 'emp-dev-105', name: 'Michael Chen', email: 'michael.c@techinnovator.com', avatarColor: '#8b5cf6' }
    ],
    createdBy: { _id: 'emp-mgr-103', name: 'David Miller', email: 'david.m@techinnovator.com', avatarColor: '#10b981' },
    priority: 'Urgent',
    status: 'In Progress',
    dueDate: '2026-09-15',
    dueTime: '18:00',
    tags: ['Security', 'Backend', 'Mobile'],
    createdAt: '2026-09-03T11:30:00.000Z'
  },
  {
    _id: 'task-303',
    title: 'Design Kanban Board Drag-and-Drop Feedback State',
    description: 'Create fluid animations and visual indicators for moving tasks between To Do, In Progress, and Review columns.',
    projectId: { _id: 'proj-103', name: 'Enterprise CRM Redesign', color: '#ec4899' },
    Project: 'Enterprise CRM Redesign',
    assignedTo: [
      { _id: 'emp-des-104', name: 'Emily Watson', email: 'emily.w@techinnovator.com', avatarColor: '#ec4899' }
    ],
    createdBy: { _id: 'emp-admin-101', name: 'Alex Johnson', email: 'alex.johnson@techinnovator.com', avatarColor: '#4f46e5' },
    priority: 'Medium',
    status: 'To Do',
    dueDate: '2026-09-22',
    dueTime: '15:00',
    tags: ['Design', 'Figma', 'UX'],
    createdAt: '2026-09-05T14:00:00.000Z'
  },
  {
    _id: 'task-304',
    title: 'Automated E2E Test Suite for Punch-In / Punch-Out',
    description: 'Write Playwright automated test scripts verifying geolocation calculation, break tracking, and overtime calculation.',
    projectId: { _id: 'proj-101', name: 'AI WorkTracker Pro', color: '#4f46e5' },
    Project: 'AI WorkTracker Pro',
    assignedTo: [
      { _id: 'emp-qa-106', name: 'Jessica Taylor', email: 'jessica.t@techinnovator.com', avatarColor: '#f59e0b' }
    ],
    createdBy: { _id: 'emp-admin-101', name: 'Alex Johnson', email: 'alex.johnson@techinnovator.com', avatarColor: '#4f46e5' },
    priority: 'Medium',
    status: 'Review',
    dueDate: '2026-09-14',
    dueTime: '16:00',
    tags: ['QA', 'Playwright', 'Testing'],
    createdAt: '2026-09-06T09:00:00.000Z'
  },
  {
    _id: 'task-305',
    title: 'PostgreSQL DB Migration & Index Optimization',
    description: 'Optimize queries for real-time workload report generation and add composite index on work_entries.',
    projectId: { _id: 'proj-104', name: 'Cloud Infrastructure Analytics', color: '#3b82f6' },
    Project: 'Cloud Infrastructure Analytics',
    assignedTo: [
      { _id: 'emp-admin-101', name: 'Alex Johnson', email: 'alex.johnson@techinnovator.com', avatarColor: '#4f46e5' },
      { _id: 'emp-dev-105', name: 'Michael Chen', email: 'michael.c@techinnovator.com', avatarColor: '#8b5cf6' }
    ],
    createdBy: { _id: 'emp-admin-101', name: 'Alex Johnson', email: 'alex.johnson@techinnovator.com', avatarColor: '#4f46e5' },
    priority: 'Low',
    status: 'Completed',
    dueDate: '2026-09-10',
    dueTime: '12:00',
    tags: ['Database', 'DevOps'],
    createdAt: '2026-08-28T08:00:00.000Z'
  }
];

export const INITIAL_KEEP_NOTES = [
  {
    _id: 'note-501',
    title: '🚀 Q3 Product Roadmap Highlights',
    content: '1. Launch AI-Powered Task Recommendations.\n2. Finalize client portal with self-service reporting.\n3. Implement dark mode across all web components.',
    isPinned: true,
    color: 'indigo',
    tags: ['Roadmap', 'Product'],
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-10T11:00:00.000Z'
  },
  {
    _id: 'note-502',
    title: '💡 UI Design System Tokens',
    content: 'Primary Color: #4f46e5 (Indigo-600)\nSecondary: #06b6d4 (Cyan-500)\nSuccess: #10b981 (Emerald-500)\nFont Family: Inter, sans-serif',
    isPinned: true,
    color: 'emerald',
    tags: ['Design', 'Tokens'],
    createdAt: '2026-09-04T13:30:00.000Z',
    updatedAt: '2026-09-04T13:30:00.000Z'
  },
  {
    _id: 'note-503',
    title: '📝 Weekly Sprint Retrospective Notes',
    content: 'Team completed 42 story points this sprint. Key win: Reduced page load time by 35% on dashboard widget load.',
    isPinned: false,
    color: 'amber',
    tags: ['Sprint', 'Agile'],
    createdAt: '2026-09-08T17:00:00.000Z',
    updatedAt: '2026-09-08T17:00:00.000Z'
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    _id: 'notif-1',
    title: 'New Task Assigned',
    message: 'You were assigned to "Implement Dark Theme & High-Contrast Mode" in AI WorkTracker Pro.',
    type: 'task',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    _id: 'notif-2',
    title: 'Project Milestone Reached',
    message: 'Mobile Banking App has reached 60% completion rate!',
    type: 'project',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    _id: 'notif-3',
    title: 'Daily Punch Reminder',
    message: 'Reminder: Remember to log your active work progress before end of shift.',
    type: 'system',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString()
  }
];

export const INITIAL_CHAT_CHANNELS = [
  { _id: 'chan-1', name: 'general', description: 'General company news and team discussions', isPrivate: false },
  { _id: 'chan-2', name: 'projects-sync', description: 'Cross-functional project updates and blockers', isPrivate: false },
  { _id: 'chan-3', name: 'dev-talk', description: 'Technical design, code reviews, and architecture', isPrivate: false },
  { _id: 'chan-4', name: 'design-system', description: 'UI/UX inspiration and asset sync', isPrivate: false }
];

export const INITIAL_CHAT_MESSAGES = [
  {
    _id: 'msg-1',
    channelId: 'chan-1',
    sender: { _id: 'emp-admin-101', name: 'Alex Johnson', avatarColor: '#4f46e5' },
    content: 'Good morning team! The new WorkTracker static demo is live and ready for testing. 🚀',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    _id: 'msg-2',
    channelId: 'chan-1',
    sender: { _id: 'emp-dev-102', name: 'Sarah Connor', avatarColor: '#06b6d4' },
    content: 'Awesome! Checked out the dashboard, looks super crisp!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString()
  },
  {
    _id: 'msg-3',
    channelId: 'chan-2',
    sender: { _id: 'emp-mgr-103', name: 'David Miller', avatarColor: '#10b981' },
    content: 'Mobile Banking App milestone 2 review is scheduled for tomorrow at 2 PM.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
  }
];

export const INITIAL_ATTENDANCE = [
  {
    _id: 'att-1',
    employeeId: 'emp-admin-101',
    employeeName: 'Alex Johnson',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00:00',
    checkOut: null,
    status: 'Present',
    workMode: 'Hybrid',
    location: 'Office HQ - New York',
    totalHours: '3.5 hrs'
  },
  {
    _id: 'att-2',
    employeeId: 'emp-dev-102',
    employeeName: 'Sarah Connor',
    date: new Date().toISOString().split('T')[0],
    checkIn: '08:45:00',
    checkOut: null,
    status: 'Present',
    workMode: 'Remote',
    location: 'Remote - San Francisco',
    totalHours: '3.75 hrs'
  }
];

export const INITIAL_WORK_ENTRIES = [
  {
    _id: 'work-1',
    employeeId: 'emp-admin-101',
    employeeName: 'Alex Johnson',
    projectId: 'proj-101',
    projectName: 'AI WorkTracker Pro',
    taskId: 'task-301',
    taskTitle: 'Implement Dark Theme & High-Contrast Mode',
    workDone: 'Refactored CSS variable bindings and styled modal theme toggles.',
    hoursWorked: 3.5,
    minutesWorked: 210,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_SETTINGS = {
  companyName: 'TechInnovator Solutions',
  supportEmail: 'support@techinnovator.com',
  timezone: 'America/New_York',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '12-hour',
  workingHoursPerDay: 8,
  workingDaysPerWeek: 5,
  allowRemotePunch: true,
  enableAiFeatures: true,
  notifyOnTaskAssign: true,
  punchInStartTime: '09:00',
  punchInEndTime: '10:00',
  punchOutStartTime: '17:00',
  punchOutEndTime: '19:00',
};

// =============================================
// IN-MEMORY MOCK DATA STORE & CONTROLLERS
// =============================================

class MockStore {
  user = { ...INITIAL_DEMO_USER };
  roles = [...INITIAL_ROLES];
  designations = [...INITIAL_DESIGNATIONS];
  clients = [...INITIAL_CLIENTS];
  employees = [...INITIAL_EMPLOYEES];
  projects = [...INITIAL_PROJECTS];
  tasks = [...INITIAL_TASKS];
  keepNotes = [...INITIAL_KEEP_NOTES];
  notifications = [...INITIAL_NOTIFICATIONS];
  chatChannels = [...INITIAL_CHAT_CHANNELS];
  chatMessages = [...INITIAL_CHAT_MESSAGES];
  attendance = [...INITIAL_ATTENDANCE];
  workEntries = [...INITIAL_WORK_ENTRIES];
  settings = { ...INITIAL_SETTINGS };

  // Helper for generating unique mock IDs
  genId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  // Dashboard Statistics Calculator
  getDashboardStats() {
    const totalProjects = this.projects.length;
    const totalEmployees = this.employees.length;
    const activeTasks = this.tasks.filter(t => t.status !== 'Completed').length;
    const completedTasks = this.tasks.filter(t => t.status === 'Completed').length;
    
    return {
      employees: {
        total: totalEmployees,
        active: totalEmployees - 1,
        inactive: 1,
        present: totalEmployees - 1,
        absent: 1,
        checkedIn: totalEmployees - 1,
        checkedOut: 1,
        workingNow: totalEmployees - 2,
        attendanceRate: 92,
      },
      tasks: {
        total: this.tasks.length,
        active: activeTasks,
        inProgress: activeTasks,
        todo: 2,
        review: 1,
        completed: completedTasks,
      },
      projects: {
        total: totalProjects,
        active: totalProjects - 1,
        inactive: 1,
        totalMinutes: 8500,
      },
      productivity: {
        todayMinutes: 420,
        totalMinutes: 8500,
        attendanceRate: 92,
      },
      totalProjects,
      totalEmployees,
      activeTasks,
      completedTasks,
      totalWorkHours: 1420,
      efficiencyRate: '94.8%',
      onTimeDeliveryRate: '96.2%',
      teamUtilization: '88.5%',
      aiAdoptionRate: '82.0%',
      aiImpactHoursSaved: 145,
      overdueTasksCount: 1,
    };
  }
}

// Global Singleton Instance for Runtime Persistence
export const mockStore = new MockStore();
