'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  UserPlus,
  Folder,
  Plus,
  Clock,
  Link as LinkIcon,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import AddTeamMemberModal from '@/components/AddTeamMemberModal';
import CreateProjectModal from '@/components/CreateProjectModal';
import {
  CustomDropdown,
  CustomDatePicker,
  CustomTimePicker,
  CustomFileAttachment,
  CustomMultipleLinks
} from '@/components/TaskFormControls';
import dynamic from 'next/dynamic';

const CKEditorComponent = dynamic(
  () => import('@/components/CKEditorWrapper'),
  { ssr: false }
);

export default function TopNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Live Clock State
  const [liveTime, setLiveTime] = useState('');
  const [liveDate, setLiveDate] = useState('');

  // Punch Status (for Employee)
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [canPunchOut, setCanPunchOut] = useState(false);

  // Shared Data for Modals
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);

  // Modal States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];



  // Add Task Form State
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    projectId: '',
    assignedTo: [] as string[],
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    status: 'To Do' as 'To Do' | 'In Progress' | 'Review' | 'Completed',
    dueDate: '',
    dueTime: '',
    url: '',
    urls: [] as string[],
    comments: '',
    files: [] as Array<{ name: string; url: string; size?: number; type?: string }>,
    tags: '',
  });
  const [submittingTask, setSubmittingTask] = useState(false);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-US', { hour12: true }));
      setLiveDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current user and shared resources
  const loadUserAndResources = async () => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      setUser(null);
      setIsAdmin(false);
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      let currentUserObj = parsedUser;
      if (meData.success && meData.data) {
        currentUserObj = meData.data;
        setUser(currentUserObj);
        localStorage.setItem('worktracker_user', JSON.stringify(currentUserObj));
      }
      const admin = currentUserObj.userType === 'admin' || Boolean(currentUserObj.isSystemAdmin);
      setIsAdmin(admin);

      const [empRes, projRes, clientRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/projects'),
        fetch('/api/clients'),
      ]);
      const empData = await empRes.json();
      const projData = await projRes.json();
      const clientData = await clientRes.json();

      if (empData.success) setEmployees(empData.data);
      if (projData.success) setProjects(projData.data);
      if (clientData.success) setClientsList(clientData.data);

      // Check punch status for employees
      if (!admin && parsedUser._id) {
        const punchRes = await fetch(`/api/punch?employeeId=${parsedUser._id}`);
        const punchData = await punchRes.json();
        if (punchData.success) {
          setIsPunchedIn(punchData.isPunchedIn);
          setCanPunchOut(punchData.canPunchOut !== false);
        }
      }
    } catch (e) {
      console.error('Failed to load navbar resources:', e);
    }
  };

  useEffect(() => {
    loadUserAndResources();
    const handleRefresh = () => {
      loadUserAndResources();
    };
    window.addEventListener('worktracker-refresh', handleRefresh);
    return () => window.removeEventListener('worktracker-refresh', handleRefresh);
  }, [pathname]);





  // Handle Create Task
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setTaskData((prev) => ({
          ...prev,
          files: [...prev.files, { name: file.name, url: String(reader.result), size: file.size, type: file.type }],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index: number) => {
    setTaskData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const resetTaskForm = () => {
    setTaskData({
      title: '',
      description: '',
      projectId: '',
      assignedTo: !isAdmin && user?._id ? [user._id] : [],
      priority: 'Medium',
      status: 'To Do',
      dueDate: '',
      dueTime: '',
      url: '',
      urls: [],
      comments: '',
      files: [],
      tags: '',
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !taskData.title.trim()) return;

    try {
      setSubmittingTask(true);
      const userId = user._id || user.id || user.email;
      const safeAssignedTo = isAdmin ? taskData.assignedTo : [userId];

      const payload = {
        ...taskData,
        assignedTo: safeAssignedTo,
        createdBy: userId,
        userId: userId,
        userEmail: user.email,
        email: user.email,
        projectId: taskData.projectId || undefined,
        Project: user.Project || undefined,
        dueDate: taskData.dueDate || undefined,
        dueTime: taskData.dueTime || undefined,
        url: taskData.urls[0] || taskData.url || undefined,
        urls: taskData.urls,
        comments: taskData.comments || undefined,
        files: taskData.files,
        tags: taskData.tags ? taskData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create task');

      setIsTaskModalOpen(false);
      resetTaskForm();
      window.dispatchEvent(new CustomEvent('worktracker-refresh'));
    } catch (err: any) {
      alert(err.message || String(err));
    } finally {
      setSubmittingTask(false);
    }
  };

  // Don't render topbar on login page or when user is not logged in
  if (!user || pathname === '/login') return null;

  return (
    <>
      <header className="top-navbar no-print">
        {/* Left Side: Live Digital Clock & Date */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '7px',
          padding: '5px 14px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 850,
            fontFamily: 'monospace',
            color: 'var(--accent-primary)',
            letterSpacing: '0.5px'
          }}>
            {liveTime}
          </span>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
          }}>
            {liveDate}
          </span>
        </div>

        {/* Right Side: Action Buttons & Notification Center */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isAdmin ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEmployeeModalOpen(true)}
                style={{ fontSize: '0.78rem', fontWeight: 650, height: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 12px' }}
              >
                <UserPlus size={14} />
                <span>Add Employee</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsProjectModalOpen(true)}
                style={{ fontSize: '0.78rem', fontWeight: 650, height: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 12px' }}
              >
                <Folder size={14} />
                <span>New Project</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  resetTaskForm();
                  setIsTaskModalOpen(true);
                }}
                style={{ fontSize: '0.78rem', fontWeight: 700, height: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 14px' }}
              >
                <Plus size={15} />
                <span>Create Task</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  resetTaskForm();
                  setIsTaskModalOpen(true);
                }}
                style={{ fontSize: '0.78rem', fontWeight: 700, height: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 14px' }}
              >
                <Plus size={15} />
                <span>Add My Task</span>
              </button>
            </>
          )}

          {/* Consistent Notification Center */}
          <NotificationCenter />
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD EMPLOYEE (Admin Only) */}
      {/* ========================================================================= */}
      <AddTeamMemberModal
        isOpen={isAdmin && isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        projectsList={projects}
        onSuccess={async (newEmp) => {
          await loadUserAndResources();
          if (newEmp?._id) {
            setTaskData((prev) => ({
              ...prev,
              assignedTo: Array.from(new Set([...prev.assignedTo, newEmp._id])),
            }));
          }
          window.dispatchEvent(new CustomEvent('worktracker-refresh'));
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE NEW PROJECT (Admin Only) */}
      {/* ========================================================================= */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        clientsList={clientsList}
        employeesList={employees}
        onSuccess={async (newProject) => {
          await loadUserAndResources();
          if (newProject?._id) {
            const memberIds = Array.isArray(newProject.members)
              ? newProject.members.map((m: any) => (typeof m === 'string' ? m : m._id || m.id)).filter(Boolean)
              : [];
            setTaskData((prev) => ({
              ...prev,
              projectId: newProject._id,
              assignedTo: Array.from(new Set([...prev.assignedTo, ...memberIds])),
            }));
          }
          window.dispatchEvent(new CustomEvent('worktracker-refresh'));
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE TASK (Admin & Employee) */}
      {/* ========================================================================= */}
      {isTaskModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setIsTaskModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Create New Task</h3>
              <button className="modal-close" onClick={() => setIsTaskModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateTask}>
              {isAdmin && (
                <>
                  {/* Row 1: Choose Project & Priority */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>
                    <CustomDropdown
                      label="Choose Project"
                      placeholder="Choose Project"
                      value={taskData.projectId}
                      options={[
                        { value: '', label: 'Choose Project' },
                        ...projects.map((p) => ({
                          value: p._id,
                          label: p.name,
                          color: p.color || '#3b82f6',
                        })),
                      ]}
                      onChange={(val) => setTaskData({ ...taskData, projectId: val })}
                      actionButton={{
                        label: 'add project',
                        onClick: () => setIsProjectModalOpen(true),
                      }}
                    />

                    <CustomDropdown
                      label="Priority"
                      placeholder="Select Priority"
                      value={taskData.priority}
                      options={[
                        { value: 'Low', label: 'Low', color: '#3b82f6', badgeText: 'Low', badgeBg: '#eff6ff', badgeColor: '#1d4ed8' },
                        { value: 'Medium', label: 'Medium', color: '#f59e0b', badgeText: 'Medium', badgeBg: '#fffbeb', badgeColor: '#b45309' },
                        { value: 'High', label: 'High', color: '#f97316', badgeText: 'High', badgeBg: '#fff7ed', badgeColor: '#c2410c' },
                        { value: 'Urgent', label: 'Urgent', color: '#ef4444', badgeText: 'Urgent', badgeBg: '#fef2f2', badgeColor: '#b91c1c' },
                      ]}
                      onChange={(val) => setTaskData({ ...taskData, priority: val as any })}
                    />
                  </div>

                  {/* Row 2: Status, Due Date, Due Time */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>
                    <CustomDropdown
                      label="Status"
                      placeholder="Select Status"
                      value={taskData.status}
                      options={[
                        { value: 'To Do', label: 'To Do', badgeText: 'To Do', badgeBg: '#f1f5f9', badgeColor: '#475569' },
                        { value: 'In Progress', label: 'In Progress', badgeText: 'In Progress', badgeBg: '#eff6ff', badgeColor: '#1d4ed8' },
                        { value: 'Review', label: 'Review', badgeText: 'Review', badgeBg: '#faf5ff', badgeColor: '#7e22ce' },
                        { value: 'Completed', label: 'Completed', badgeText: 'Completed', badgeBg: '#ecfdf5', badgeColor: '#047857' },
                      ]}
                      onChange={(val) => setTaskData({ ...taskData, status: val as any })}
                    />

                    <CustomDatePicker
                      label="Due Date"
                      value={taskData.dueDate}
                      onChange={(val) => setTaskData({ ...taskData, dueDate: val })}
                    />

                    <CustomTimePicker
                      label="Due Time"
                      value={taskData.dueTime}
                      onChange={(val) => setTaskData({ ...taskData, dueTime: val })}
                      align="right"
                    />
                  </div>

                  {/* Assign To (Admin Only) */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Assign To *</label>
                      <button
                        type="button"
                        onClick={() => setIsEmployeeModalOpen(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '0 2px',
                        }}
                      >
                        <Plus size={13} />
                        <span>add employee</span>
                      </button>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      maxHeight: '130px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '10px',
                      background: 'var(--bg-secondary)'
                    }}>
                      {employees.map((emp) => {
                        const isChecked = taskData.assignedTo.includes(emp._id);
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
                                  setTaskData({ ...taskData, assignedTo: [...taskData.assignedTo, emp._id] });
                                } else {
                                  setTaskData({ ...taskData, assignedTo: taskData.assignedTo.filter(id => id !== emp._id) });
                                }
                              }}
                            />
                            <span style={{ fontWeight: isChecked ? 700 : 400 }}>{emp.name} ({emp.Project || emp.role})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Task Title */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Task Title *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Implement user authentication workflow"
                  value={taskData.title}
                  onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                />
              </div>

              {/* Task Description */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Task Description</label>
                <CKEditorComponent
                  value={taskData.description}
                  onChange={(val: string) => setTaskData({ ...taskData, description: val })}
                />
              </div>

              {/* Row: Supporting Files & URL / Resource Links */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>
                <CustomFileAttachment
                  label="Supporting Files"
                  files={taskData.files}
                  onUpload={handleFileUpload}
                  onRemove={handleRemoveFile}
                />

                <CustomMultipleLinks
                  label="URL / Resource Links"
                  links={taskData.urls}
                  onChange={(newLinks) => setTaskData({ ...taskData, urls: newLinks, url: newLinks[0] || '' })}
                />
              </div>

              {/* Comments & Tags (Admin Only) */}
              {isAdmin && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', alignItems: 'start' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>
                      Comments / Notes
                    </label>
                    <div className="custom-input-group" style={{ alignItems: 'flex-start' }}>
                      <span className="custom-input-addon" style={{ height: 'auto', paddingTop: '8px' }}>
                        <MessageSquare size={14} />
                      </span>
                      <textarea
                        className="custom-input-control"
                        style={{ minHeight: '62px', height: '62px', resize: 'vertical' }}
                        placeholder="Add any additional notes, remarks or comments..."
                        value={taskData.comments}
                        onChange={(e) => setTaskData({ ...taskData, comments: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>
                      Tags (comma separated)
                    </label>
                    <textarea
                      className="form-control"
                      style={{ minHeight: '62px', height: '62px', resize: 'vertical', fontSize: '0.8rem', padding: '8px 10px' }}
                      value={taskData.tags}
                      onChange={(e) => setTaskData({ ...taskData, tags: e.target.value })}
                      placeholder="e.g., frontend, urgent, bug"
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsTaskModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingTask}>
                  {submittingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
