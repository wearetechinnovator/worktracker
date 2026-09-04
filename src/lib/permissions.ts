export interface PermissionAction {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  domain: string;
  label: string;
  description: string;
  iconName: string;
  actions: PermissionAction[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    domain: 'tasks',
    label: 'Tasks Management',
    description: 'Control creation, editing, viewing, and deletion of work tasks',
    iconName: 'CheckSquare',
    actions: [
      { key: 'tasks:read', label: 'View Tasks', description: 'Can view assigned or project tasks' },
      { key: 'tasks:create', label: 'Create Tasks', description: 'Can create new tasks' },
      { key: 'tasks:update', label: 'Edit Tasks', description: 'Can update task details & status' },
      { key: 'tasks:delete', label: 'Delete Tasks', description: 'Can remove tasks' },
      { key: 'tasks:manage_all', label: 'Manage All Tasks', description: 'Bypass ownership & manage any task in workspace' },
    ],
  },
  {
    domain: 'projects',
    label: 'Projects Management',
    description: 'Control creation, assignment, and status of projects',
    iconName: 'Folder',
    actions: [
      { key: 'projects:read', label: 'View Projects', description: 'Can view project list and details' },
      { key: 'projects:create', label: 'Create Projects', description: 'Can add new projects' },
      { key: 'projects:update', label: 'Edit Projects', description: 'Can modify project details & colors' },
      { key: 'projects:delete', label: 'Delete Projects', description: 'Can delete projects' },
    ],
  },
  {
    domain: 'clients',
    label: 'Clients Management',
    description: 'Control client profiles and project tags',
    iconName: 'Briefcase',
    actions: [
      { key: 'clients:read', label: 'View Clients', description: 'Can view client list and details' },
      { key: 'clients:create', label: 'Create Clients', description: 'Can onboard new clients' },
      { key: 'clients:update', label: 'Edit Clients', description: 'Can edit client details' },
      { key: 'clients:delete', label: 'Delete Clients', description: 'Can remove clients' },
    ],
  },
  {
    domain: 'employees',
    label: 'Employees & Roles',
    description: 'Manage team members, roles, and user access',
    iconName: 'Users',
    actions: [
      { key: 'employees:read', label: 'View Team Members', description: 'Can view employee directory' },
      { key: 'employees:create', label: 'Add Team Members', description: 'Can invite or add new employees' },
      { key: 'employees:update', label: 'Edit Profiles', description: 'Can edit employee profiles & roles' },
      { key: 'employees:delete', label: 'Remove Employees', description: 'Can deactivate or delete employees' },
      { key: 'roles:manage', label: 'Manage Roles & Permissions', description: 'Can configure custom roles and permission matrix' },
    ],
  },
  {
    domain: 'attendance',
    label: 'Attendance & Time Logs',
    description: 'Control punch attendance and active work session logs',
    iconName: 'Clock',
    actions: [
      { key: 'attendance:read', label: 'View Attendance', description: 'Can view attendance records' },
      { key: 'attendance:punch', label: 'Log Attendance', description: 'Can punch in/out attendance' },
      { key: 'attendance:manage', label: 'Manage Attendance', description: 'Can edit or approve attendance logs' },
      { key: 'worklogs:read', label: 'View Work Session Logs', description: 'Can view work session history' },
      { key: 'worklogs:manage', label: 'Manage Work Logs', description: 'Can edit work session logs' },
    ],
  },
  {
    domain: 'reports',
    label: 'Reports & Analytics',
    description: 'Access performance reports, timesheets, and export data',
    iconName: 'BarChart2',
    actions: [
      { key: 'reports:view', label: 'View Reports', description: 'Can access system analytics & timesheets' },
      { key: 'reports:export', label: 'Export Reports', description: 'Can download CSV/PDF reports' },
      { key: 'settings:manage', label: 'Manage App Settings', description: 'Can modify global app preferences' },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.actions.map((a) => a.key));

export const DEFAULT_SYSTEM_ROLES = [
  {
    name: 'Employee',
    description: 'Standard employee role',
    color: '#10b981',
    position: 1,
    isSystemRole: true,
    isSystemAdmin: false,
    permissions: [
      'tasks:read',
      'tasks:create',
      'tasks:update',
      'projects:read',
      'clients:read',
      'employees:read',
      'attendance:read',
      'attendance:punch',
      'worklogs:read',
    ],
  },
];

export function hasPermission(
  userRolePermissions: string[] | undefined,
  isSystemAdmin: boolean | undefined,
  requiredPermission: string
): boolean {
  if (isSystemAdmin) return true;
  if (!userRolePermissions) return false;
  return userRolePermissions.includes(requiredPermission);
}
