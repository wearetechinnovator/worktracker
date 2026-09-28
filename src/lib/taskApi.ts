/* eslint-disable @typescript-eslint/no-explicit-any */

export async function fetchTasksApi() {
  try {
    const res = await fetch('/api/tasks');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
  } catch (err) { console.error('Error fetching tasks from API:', err); }
  return [];
}

export async function deleteTask(taskId: string) {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    return await res.json();
  } catch (err) {
    console.error('API Delete failed:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Failed to delete task' };
  }
}

export async function addTaskComment(taskId: string, commentData: any) {
  try {
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: commentData.content || commentData.comment, user_id: commentData.userId || commentData.user_id, newStatus: commentData.newStatus })
    });
    return await res.json();
  } catch (err) { console.error('API Comment failed:', err); return { success: false, error: err }; }
}

export async function startTaskWork(payload: { taskId: string; employeeId?: string; localDate?: string; localTime?: string }) {
  const response = await fetch('/api/task-work', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ action: 'start', ...payload }) });
  return response.json();
}

export async function pauseTaskWork(payload: { taskId: string; workId?: string; employeeId?: string }) {
  const response = await fetch('/api/task-work', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ action: 'pause', ...payload }) });
  return response.json();
}

export async function resumeTaskWork(payload: { taskId: string; workId?: string; employeeId?: string }) {
  const response = await fetch('/api/task-work', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ action: 'resume', ...payload }) });
  return response.json();
}

export async function endTaskWork(workId: string, payload: { notes?: string; links?: string[]; files?: Array<{ name: string; url: string; size?: number; type?: string }>; localTime?: string; isFullyCompleted?: boolean }) {
  const response = await fetch('/api/task-work', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ action: 'complete', workId, ...payload }) });
  return response.json();
}

export async function reviewTask(taskId: string, payload: { action: 'approve' } | { action: 'reject'; reassignTo: string; reason?: string; files?: Array<{ name: string; url: string; size?: number; type?: string }>; links?: string[] }) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ reviewAction: payload.action, ...(payload.action === 'reject' ? { reassignTo: payload.reassignTo, reviewReason: payload.reason, files: payload.files, urls: payload.links } : {}) })
  });
  return response.json();
}

export async function updateReassignedTask(taskId: string, payload: { description: string; files: Array<{ name: string; url: string; size?: number; type?: string }>; links: string[] }) {
  const response = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ description: payload.description, files: payload.files, urls: payload.links }) });
  return response.json();
}

export async function getTaskWork(params?: { taskId?: string; employeeId?: string; date?: string; status?: string; projectId?: string }) {
  const search = new URLSearchParams();
  if (params?.taskId) search.set('taskId', params.taskId);
  if (params?.employeeId) search.set('employeeId', params.employeeId);
  if (params?.date) search.set('date', params.date);
  if (params?.status) search.set('status', params.status);
  if (params?.projectId) search.set('projectId', params.projectId);
  const response = await fetch(`/api/task-work${search.toString() ? `?${search.toString()}` : ''}`, { method: 'GET', credentials: 'include', cache: 'no-store' });
  return response.json();
}

export const taskApi = { fetchTasksApi, deleteTask, addTaskComment, startTaskWork, pauseTaskWork, resumeTaskWork, endTaskWork, reviewTask, updateReassignedTask, getTaskWork };
