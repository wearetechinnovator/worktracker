'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckSquare, Plus, AlertCircle, CheckCircle2,
  Calendar, Users, Folder, Filter, X, Edit, Trash2
} from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import dynamic from 'next/dynamic';

const CKEditorComponent = dynamic(
  () => import('@/components/CKEditorWrapper'),
  { ssr: false }
);

interface Task {
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
  };
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  dueDate?: string;
  tags?: string[];
  createdAt: string;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  Project: string;
  avatarColor: string;
}

interface Project {
  _id: string;
  name: string;
  color: string;
}

interface UserProfile {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  userType?: string;
  Project?: string;
}

export default function TasksPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const isAdmin = user?.userType === 'admin';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    Project: '',
    assignedTo: [] as string[],
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    status: 'To Do' as 'To Do' | 'In Progress' | 'Review' | 'Completed',
    dueDate: '',
    tags: '',
  });

  // Authenticate user
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(storedUser);
    const timer = setTimeout(() => {
      setUser(parsed);
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  // Load data in parallel
  const loadAllData = useCallback(async () => {
    if (!user) return;
    try {
      setTimeout(() => setLoading(true), 0);
      const endpoint = isAdmin ? '/api/tasks' : `/api/tasks?employeeId=${user._id}`;

      const promises: Promise<Response>[] = [fetch(endpoint), fetch('/api/projects')];
      if (isAdmin) {
        promises.push(fetch('/api/employees'));
      }

      const results = await Promise.all(promises);
      const tasksRes = await results[0].json();
      const projectsRes = await results[1].json();

      if (tasksRes.success) setTasks(tasksRes.data);
      if (projectsRes.success) setProjects(projectsRes.data);

      if (isAdmin && results[2]) {
        const empRes = await results[2].json();
        if (empRes.success) setEmployees(empRes.data);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  const loadTasks = loadAllData;

  // Load data
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        loadAllData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, loadAllData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setError(null);
      setSuccessMsg(null);

      const userId = user._id || user.id || user.email;
      const safeAssignedTo = isAdmin ? formData.assignedTo : [userId];

      const payload = {
        ...formData,
        assignedTo: safeAssignedTo,
        createdBy: userId,
        userId: userId,
        userEmail: user.email,
        email: user.email,
        projectId: formData.projectId || undefined,
        Project: formData.Project || user.Project || undefined,
        dueDate: formData.dueDate || undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      };

      const url = editingTask ? `/api/tasks/${editingTask._id}` : '/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to save task');

      setSuccessMsg(editingTask ? 'Task updated successfully!' : 'Task created successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);

      setShowModal(false);
      resetForm();
      loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const canManageTask = (task: Task) => {
    if (!user) return false;
    const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.some(e => e._id === user._id);
    return user.userType === 'admin' || task.createdBy?._id === user._id || isAssigned;
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}?userId=${user?._id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      setSuccessMsg('Task deleted successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      projectId: task.projectId?._id || '',
      Project: task.Project || '',
      assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo.map(e => e._id) : [],
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate || '',
      tags: task.tags?.join(', ') || '',
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    if (!isAdmin && user) {
      setFormData((current) => ({
        ...current,
        assignedTo: user._id ? [user._id] : [],
        Project: user.Project || '',
      }));
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      projectId: '',
      Project: '',
      assignedTo: [],
      priority: 'Medium',
      status: 'To Do',
      dueDate: '',
      tags: '',
    });
    setEditingTask(null);
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus) {
      if (task.status !== filterStatus) return false;
    } else {
      if (task.status === 'Completed') return false;
    }
    if (filterPriority && task.priority !== filterPriority) return false;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return '#dc2626';
      case 'High': return '#ea580c';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'var(--status-active-bg)';
      case 'In Progress': return 'var(--status-pending-bg)';
      case 'Review': return '#dbeafe';
      case 'To Do': return 'var(--bg-tertiary)';
      default: return 'var(--bg-tertiary)';
    }
  };

  if (loading) {
    return <PageShimmer variant="tasks" />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckSquare size={28} style={{ color: 'var(--accent-primary)' }} />
            Task Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isAdmin
              ? 'Create and manage tasks for projects and Projects'
              : 'Create your own tasks and keep them visible to the admin team'}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          <span>{isAdmin ? 'Create Task' : 'Add My Task'}</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '20px', background: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle style={{ color: '#ef4444' }} />
            <p style={{ fontWeight: 600, color: '#991b1b' }}>{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="card" style={{ borderLeft: '4px solid #10b981', marginBottom: '20px', background: '#ecfdf5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 style={{ color: '#10b981' }} />
            <p style={{ color: '#065f46', fontWeight: 700 }}>{successMsg}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <strong style={{ fontSize: '0.85rem' }}>Filters:</strong>
          </div>

          <select
            className="form-control"
            style={{ width: '150px', padding: '6px 10px', fontSize: '0.85rem' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            className="form-control"
            style={{ width: '150px', padding: '6px 10px', fontSize: '0.85rem' }}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All Priority</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          {(filterStatus || filterPriority) && (
            <button
              onClick={() => {
                setFilterStatus('');
                setFilterPriority('');
              }}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Clear Filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {filteredTasks.map((task) => (
          <div key={task._id} className="card" style={{ position: 'relative' }}>
            {/* Priority Indicator */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                background: getPriorityColor(task.priority),
                borderRadius: '8px 0 0 8px',
              }}
            />

            <div style={{ paddingLeft: '8px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <div 
                      style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}
                      dangerouslySetInnerHTML={{ __html: task.description }}
                    />
                  )}
                </div>

                {canManageTask(task) && (
                  <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                    <button
                      onClick={() => openEditModal(task)}
                      className="btn"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(task._id)}
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                <span
                  className="tag-badge"
                  style={{
                    background: getStatusColor(task.status),
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                  }}
                >
                  {task.status}
                </span>
                <span
                  className="tag-badge"
                  style={{
                    background: getPriorityColor(task.priority) + '20',
                    color: getPriorityColor(task.priority),
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                  }}
                >
                  {task.priority}
                </span>
              </div>

              {/* Project/Project */}
              <div style={{ marginBottom: '12px', fontSize: '0.8rem' }}>
                {task.projectId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Folder size={14} style={{ color: task.projectId.color }} />
                    <span>{task.projectId.name}</span>
                  </div>
                )}
                {task.Project && !task.projectId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Folder size={14} />
                    <span>{task.Project}</span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Created by: <strong>{task.createdBy?.name || 'Unknown'}</strong>
              </div>

              {/* Due Date */}
              {task.dueDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={14} />
                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              )}

              {/* Assigned To */}
              {task.assignedTo.length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <Users size={12} />
                    <span>Assigned to ({task.assignedTo.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {task.assignedTo.map((emp) => (
                      <div
                        key={emp._id}
                        className="avatar"
                        style={{
                          backgroundColor: emp.avatarColor,
                          width: '24px',
                          height: '24px',
                          fontSize: '0.65rem',
                        }}
                        title={emp.name}
                      >
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CheckSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>No tasks found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            {tasks.length === 0 ? 'Create your first task to get started' : 'Try adjusting your filters'}
          </p>
          <button
            onClick={openCreateModal}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
          >
            <Plus size={16} />
            <span>{isAdmin ? 'Create Task' : 'Add My Task'}</span>
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="btn"
                style={{ padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Description</label>
                <CKEditorComponent
                  value={formData.description}
                  onChange={(val) => setFormData({ ...formData, description: val })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">Choose</label>
                  <select
                    className="form-control"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value, Project: '' })}
                  >
                    <option value="">None</option>
                    {projects.map((proj) => (
                      <option key={proj._id} value={proj._id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Project</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.Project}
                    onChange={(e) => setFormData({ ...formData, Project: e.target.value, projectId: '' })}
                    disabled={!!formData.projectId}
                    placeholder={formData.projectId ? 'Using project' : 'e.g., Engineering'}
                  />
                </div>
              </div>

              {isAdmin && (
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Assign To *</label>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-sm)',
                    padding: '10px',
                    background: 'var(--bg-secondary)'
                  }}>
                    {employees.map((emp) => {
                      const isChecked = formData.assignedTo.includes(emp._id);
                      return (
                        <label
                          key={emp._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            background: isChecked ? 'var(--bg-tertiary)' : 'transparent'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, assignedTo: [...formData.assignedTo, emp._id] });
                              } else {
                                setFormData({ ...formData, assignedTo: formData.assignedTo.filter(id => id !== emp._id) });
                              }
                            }}
                          />
                          <span style={{ fontWeight: isChecked ? 700 : 400 }}>{emp.name} ({emp.Project})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isAdmin && user && (
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Assigned To</label>
                  <div className="form-control" style={{ display: 'flex', alignItems: 'center', minHeight: '42px' }}>
                    {user.name}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">Priority</label>
                  <select
                    className="form-control"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'Low' | 'Medium' | 'High' | 'Urgent' })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'To Do' | 'In Progress' | 'Review' | 'Completed' })}
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Tags (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., frontend, urgent, bug"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
