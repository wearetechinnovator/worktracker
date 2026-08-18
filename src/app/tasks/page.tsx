'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterPriority]);

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

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'Completed':
        return { background: '#ecfdf5', color: '#047857', border: '1px solid #10b98130' };
      case 'In Progress':
        return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #3b82f630' };
      case 'Review':
        return { background: '#f5f3ff', color: '#6d28d9', border: '1px solid #8b5cf630' };
      case 'To Do':
      default:
        return { background: '#f3f4f6', color: '#374151', border: '1px solid #9ca3af30' };
    }
  };

  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #ef444430' };
      case 'High':
        return { background: '#fff7ed', color: '#c2410c', border: '1px solid #f9731630' };
      case 'Medium':
        return { background: '#fffbeb', color: '#b45309', border: '1px solid #f59e0b30' };
      case 'Low':
      default:
        return { background: '#f0fdf4', color: '#15803d', border: '1px solid #22c55e30' };
    }
  };

  const ITEMS_PER_PAGE = 10;
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const renderPagination = (totalItems: number, itemsPerPage: number, page: number, onPageChange: (p: number) => void) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }} className="no-print">
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{Math.min(totalItems, (page - 1) * itemsPerPage + 1)}-{Math.min(totalItems, page * itemsPerPage)}</strong> of <strong>{totalItems}</strong> entries
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: page === 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - page) <= 1) {
              return (
                <button
                  key={pageNum}
                  className={page === pageNum ? "btn btn-primary" : "btn btn-secondary"}
                  onClick={() => onPageChange(pageNum)}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  {pageNum}
                </button>
              );
            }
            if (pageNum === 2 || pageNum === totalPages - 1) {
              return <span key={pageNum} style={{ color: 'var(--text-muted)', alignSelf: 'center', padding: '0 4px' }}>...</span>;
            }
            return null;
          })}
          <button
            className="btn btn-secondary"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: page === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>
    );
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

      {/* Tasks Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr>
                <th>Task Title & Description</th>
                <th style={{ width: '140px' }}>Project</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '110px' }}>Priority</th>
                <th style={{ width: '140px' }}>Assigned To</th>
                <th style={{ width: '110px' }}>Due Date</th>
                {filteredTasks.some(canManageTask) && (
                  <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <CheckSquare size={40} style={{ color: 'var(--text-muted)' }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>No tasks found</div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        {tasks.length === 0 ? 'Create your first task to get started' : 'Try adjusting your filters'}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={openCreateModal}
                          className="btn btn-primary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '8px'
                          }}
                        >
                          <Plus size={14} />
                          <span>Create Task</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => (
                  <tr key={task._id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div
                          style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}
                          dangerouslySetInnerHTML={{ __html: task.description }}
                        />
                      )}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Created by: <strong>{task.createdBy?.name || 'Unknown'}</strong>
                      </div>
                    </td>
                    <td>
                      {task.projectId ? (
                        <span className="tag-badge" style={{ backgroundColor: `${task.projectId.color}15`, color: task.projectId.color, borderColor: `${task.projectId.color}30`, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                          <Folder size={10} style={{ color: task.projectId.color }} />
                          {task.projectId.name}
                        </span>
                      ) : task.Project ? (
                        <span className="tag-badge" style={{ backgroundColor: '#cbd5e120', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                          <Folder size={10} />
                          {task.Project}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span className="tag-badge" style={{ ...getStatusBadgeStyles(task.status), fontWeight: 700, fontSize: '0.72rem' }}>
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <span className="tag-badge" style={{ ...getPriorityBadgeStyles(task.priority), fontWeight: 700, fontSize: '0.72rem' }}>
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      {task.assignedTo.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                          {task.assignedTo.map((emp) => (
                            <div
                              key={emp._id}
                              className="avatar"
                              style={{
                                backgroundColor: emp.avatarColor || '#7f56d9',
                                width: '22px',
                                height: '22px',
                                fontSize: '0.62rem',
                                color: '#ffffff'
                              }}
                              title={emp.name}
                            >
                              {emp.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {task.dueDate ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    {canManageTask(task) && (
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => openEditModal(task)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                            title="Edit"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(task._id)}
                            className="btn btn-danger"
                            style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {renderPagination(filteredTasks.length, ITEMS_PER_PAGE, currentPage, setCurrentPage)}

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
