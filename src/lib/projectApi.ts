export interface ProjectPayload {
  name: string;
  short_description?: string;
  project_users?: string[];
  client?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  isVerify?: boolean;
  status?: boolean;
  // clientInfo?: {
  //   name: string;
  //   phone?: string;
  //   emails?: string[];
  //   address?: string;
  //   duration?: string;
  // };
}

export async function getProjects() {
  const response = await fetch('/api/projects', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'Failed to load projects');
  }

  return Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.projects)
      ? result.projects
      : [];
}

export async function createProject(payload: ProjectPayload) {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'Failed to create project');
  }

  return result;
}

export async function updateProject(id: string, payload: ProjectPayload) {
  const response = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'Failed to update project');
  }

  return result;
}

export async function deleteProject(id: string) {
  const response = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'Failed to delete project');
  }

  return result;
}
