import { mockStore, INITIAL_DEMO_USER } from '@/lib/mockData';

export const staticClient = {
  getUser() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('worktracker_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // fallback to INITIAL_DEMO_USER
        }
      }
      localStorage.setItem('worktracker_user', JSON.stringify(INITIAL_DEMO_USER));
    }
    return INITIAL_DEMO_USER;
  },

  getEmployees() {
    return mockStore.employees;
  },

  getProjects() {
    return mockStore.projects;
  },

  getTasks() {
    return mockStore.tasks;
  },

  async fetchTasksApi() {
    try {
      const res = await fetch('/api/tasks');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        mockStore.tasks = json.data;
        return json.data;
      }
    } catch (err) {
      console.error('Error fetching tasks from API:', err);
    }
    return mockStore.tasks;
  },

  getClients() {
    return mockStore.clients;
  },

  getRoles() {
    return mockStore.roles;
  },

  getDesignations() {
    return mockStore.designations.map(d => d.name);
  },

  getKeepNotes() {
    return mockStore.keepNotes;
  },

  getNotifications() {
    return mockStore.notifications;
  },

  async getAttendance(params?: any) {
    return {
      success: true,
      data: mockStore.attendance
    };
  },

  getWorkEntries() {
    return mockStore.workEntries;
  },

  getChatChannels() {
    return mockStore.chatChannels;
  },

  getChatMessages() {
    return mockStore.chatMessages;
  },

  getDashboardStats() {
    return mockStore.getDashboardStats();
  },

  getPunchStatus() {
    return {
      isPunchedIn: Boolean(mockStore.user.isPunchedIn),
      canPunchIn: !mockStore.user.isPunchedIn,
      canPunchOut: Boolean(mockStore.user.isPunchedIn),
      attendance: {
        checkIn: '09:00',
        checkOut: mockStore.user.isPunchedIn ? null : '17:00',
        status: 'Present',
        checkInLocation: 'Office HQ - New York',
      }
    };
  },

  togglePunch() {
    mockStore.user.isPunchedIn = !mockStore.user.isPunchedIn;
    return this.getPunchStatus();
  },

  async getSettings() {
    return {
      success: true,
      data: mockStore.settings
    };
  },

  async addTaskComment(taskId: string, commentData: any) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: commentData.content || commentData.comment,
          user_id: commentData.userId || commentData.user_id,
          newStatus: commentData.newStatus
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        const idx = mockStore.tasks.findIndex(t => t._id === taskId);
        if (idx !== -1) mockStore.tasks[idx] = json.data;
        return { success: true, data: json.data };
      }
    } catch (err) {
      console.error('API Comment failed, falling back to memory:', err);
    }

    const task = mockStore.tasks.find(t => t._id === taskId) as any;
    if (task) {
      if (!task.comments) task.comments = [];
      task.comments.push({
        _id: 'comment-' + Date.now(),
        comment: commentData.content || commentData.comment,
        content: commentData.content || commentData.comment,
        user_id: commentData.userId || commentData.user_id,
        datetime: new Date().toISOString()
      });
    }
    return { success: true, data: task };
  },

  async deleteTask(taskId: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        mockStore.tasks = mockStore.tasks.filter(t => t._id !== taskId);
        return { success: true, message: json.message || 'Task deleted successfully' };
      }
    } catch (err) {
      console.error('API Delete failed, falling back to memory:', err);
    }

    mockStore.tasks = mockStore.tasks.filter(t => t._id !== taskId);
    return { success: true, message: 'Task deleted successfully' };
  },

  async startTaskWork(data: any) {
    const newWork: any = {
      _id: 'work-' + Date.now(),
      taskId: data.taskId,
      employeeId: data.employeeId,
      startTime: new Date().toISOString(),
      status: 'In Progress',
      date: data.localDate || new Date().toISOString().split('T')[0]
    };
    (mockStore.workEntries as any[]).unshift(newWork);
    return { success: true, data: newWork };
  },

  async endTaskWork(workId: string, data: any) {
    const work = mockStore.workEntries.find(w => w._id === workId) as any;
    if (work) {
      work.endTime = new Date().toISOString();
      work.notes = data.notes;
      work.status = data.isFullyCompleted ? 'Completed' : 'Paused';
    }
    return { success: true, message: 'Work ended successfully', data: work };
  },

  async getTaskWork(params?: any) {
    let list = mockStore.workEntries;
    if (params?.taskId) {
      list = list.filter((w: any) => w.taskId === params.taskId);
    }
    if (params?.employeeId) {
      list = list.filter((w: any) => w.employeeId === params.employeeId);
    }
    return { success: true, data: list };
  },

  async updateProject(id: string, data: any) {
    const proj = mockStore.projects.find(p => p._id === id);
    if (proj) {
      Object.assign(proj, data);
    }
    return { success: true, data: proj };
  },

  async deleteProject(id: string) {
    mockStore.projects = mockStore.projects.filter(p => p._id !== id);
    return { success: true, message: 'Project deleted' };
  },

  async updateClient(id: string, data: any) {
    const client = mockStore.clients.find(c => c._id === id);
    if (client) {
      Object.assign(client, data);
    }
    return { success: true, data: client };
  },

  async deleteClient(id: string) {
    mockStore.clients = mockStore.clients.filter(c => c._id !== id);
    return { success: true, message: 'Client deleted' };
  },

  async createWorkLog(data: any) {
    const log = { _id: 'work-' + Date.now(), ...data, createdAt: new Date().toISOString() };
    mockStore.workEntries.unshift(log);
    return { success: true, data: log };
  },

  async updateWorkLog(id: string, data: any) {
    const log = mockStore.workEntries.find(w => w._id === id);
    if (log) {
      Object.assign(log, data);
    }
    return { success: true, data: log };
  },

  async deleteWorkLog(id: string) {
    mockStore.workEntries = mockStore.workEntries.filter(w => w._id !== id);
    return { success: true, message: 'Work log deleted' };
  }
};
