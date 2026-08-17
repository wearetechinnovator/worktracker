'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Folder, Plus, Search, Edit3, Trash2, Clock, 
  AlertCircle, Users, Briefcase
} from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/time';
import PageShimmer from '@/components/PageShimmer';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  Project: string;
  status: string;
  avatarColor: string;
  userType: 'admin' | 'employee';
  password?: string;
  totalMinutes: number;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  color: string;
  totalMinutes: number;
  entryCount: number;
  members: any[];
}

interface WorkEntry {
  _id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  employeeId: string;
  employeeName: string;
  employeeAvatarColor: string;
  employeeRole: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  actualTime: number;
  description?: string;
  createdAt: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Shared Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Split View State
  const [selectedProjId, setSelectedProjId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logDateFilter, setLogDateFilter] = useState('');

  // Modals
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isLogWorkOpen, setIsLogWorkOpen] = useState(false);
  const [isEditLogOpen, setIsEditLogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkEntry | null>(null);

  // Form States (Add/Edit Project)
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptColor, setDeptColor] = useState('#3b82f6');
  const [deptMembers, setDeptMembers] = useState<string[]>([]);
  const [savingDept, setSavingDept] = useState(false);

  // Form States (Log Work)
  const [workProjId, setWorkProjId] = useState('');
  const [workEmpId, setWorkEmpId] = useState('');
  const [workTitle, setWorkTitle] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [workDesc, setWorkDesc] = useState('');
  const [submittingWork, setSubmittingWork] = useState(false);

  // Form States (Edit Task Log)
  const [logProjId, setLogProjId] = useState('');
  const [logEmpId, setLogEmpId] = useState('');
  const [logTitle, setLogTitle] = useState('');
  const [logDate, setLogDate] = useState('');
  const [logStart, setLogStart] = useState('09:00');
  const [logEnd, setLogEnd] = useState('17:00');
  const [logDesc, setLogDesc] = useState('');

  const colors = ['#3b82f6', '#10b981', '#7f56d9', '#f59e0b', '#f43f5e', '#06b6d4', '#475569'];

  // Check login session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      const todayStr = new Date().toISOString().split('T')[0];
      setWorkDate(todayStr);
    }
  }, [router]);

  // Fetch Core Data
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const isEmployee = user.userType === 'employee';
      const projUrl = isEmployee ? `/api/projects?employeeId=${user._id}` : '/api/projects';
      const empUrl = '/api/employees';
      const workUrl = isEmployee ? `/api/work?employeeId=${user._id}` : '/api/work';

      const [projRes, empRes, workRes] = await Promise.all([
        fetch(projUrl),
        fetch(empUrl),
        fetch(workUrl)
      ]);

      const projData = await projRes.json().catch(() => null);
      const empData = await empRes.json().catch(() => null);
      const workData = await workRes.json().catch(() => null);

      if (!projRes.ok || !projData || !projData.success) throw new Error(projData?.error || 'Failed to load projects');
      if (!empRes.ok || !empData || !empData.success) throw new Error(empData?.error || 'Failed to load employees');
      if (!workRes.ok || !workData || !workData.success) throw new Error(workData?.error || 'Failed to load work entries');

      setProjects(projData.data);
      setEmployees(empData.data);
      setEntries(workData.data);

      if (projData.data.length > 0 && !workProjId) {
        setWorkProjId(projData.data[0]._id);
      }
      if (user.userType === 'employee') {
        setWorkEmpId(user._id);
      } else if (empData.data.length > 0 && !workEmpId) {
        setWorkEmpId(empData.data[0]._id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while loading Project data.');
    } finally {
      setLoading(false);
    }
  }, [user, workProjId, workEmpId]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // --- Project Actions ---
  const handleAddDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    try {
      setSavingDept(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deptName, description: deptDesc, color: deptColor, members: deptMembers })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to create Project');

      setDeptName('');
      setDeptDesc('');
      setDeptMembers([]);
      setIsAddDeptOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingDept(false);
    }
  };

  const handleEditDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjId || !deptName.trim()) return;

    try {
      setSavingDept(true);
      const res = await fetch(`/api/projects/${selectedProjId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deptName, description: deptDesc, color: deptColor, members: deptMembers })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to save Project changes');

      setEditMode(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteDept = async () => {
    if (!selectedProjId || !confirm('Are you sure you want to delete this Project? All associated logs will be deleted!')) return;

    try {
      const res = await fetch(`/api/projects/${selectedProjId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete Project');

      setSelectedProjId(null);
      setEditMode(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- Work Log Actions ---
  const handleAddWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmpId = user.userType === 'employee' ? user._id : workEmpId;
    if (!workProjId || !finalEmpId || !workTitle.trim() || !workDate || !workStart || !workEnd) return;

    try {
      setSubmittingWork(true);
      const res = await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: workProjId, employeeId: finalEmpId, title: workTitle, date: workDate, startTime: workStart, endTime: workEnd, description: workDesc })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to log work session');

      setWorkTitle('');
      setWorkDesc('');
      setIsLogWorkOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingWork(false);
    }
  };

  const openEditLogModal = (log: WorkEntry) => {
    setEditingLog(log);
    setLogProjId(log.projectId);
    setLogEmpId(log.employeeId);
    setLogTitle(log.title);
    setLogDate(log.date);
    setLogStart(log.startTime);
    setLogEnd(log.endTime);
    setLogDesc(log.description || '');
    setIsEditLogOpen(true);
  };

  const handleEditLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !logProjId || !logEmpId || !logTitle.trim() || !logDate || !logStart || !logEnd) return;

    try {
      setSubmittingWork(true);
      const res = await fetch(`/api/work/${editingLog._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: logProjId, employeeId: logEmpId, title: logTitle, date: logDate, startTime: logStart, endTime: logEnd, description: logDesc })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to update work entry');

      setIsEditLogOpen(false);
      setEditingLog(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this work log?')) return;

    try {
      const res = await fetch(`/api/work/${logId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete');

      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeptMemberToggle = (empId: string) => {
    if (deptMembers.includes(empId)) {
      setDeptMembers(deptMembers.filter(id => id !== empId));
    } else {
      setDeptMembers([...deptMembers, empId]);
    }
  };

  // Calculations
  const activeProject = projects.find((p) => p._id === selectedProjId);
  const activeProjEntries = entries.filter((e) => e.projectId === selectedProjId);
  const activeProjMinutes = activeProjEntries.reduce((sum, e) => sum + e.actualTime, 0);

  const filteredProjEntries = activeProjEntries.filter((e) => {
    const matchesSearch = 
      e.title.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      e.employeeName.toLowerCase().includes(logSearchQuery.toLowerCase());
    const matchesDate = logDateFilter ? e.date === logDateFilter : true;
    return matchesSearch && matchesDate;
  });

  const isAdmin = user?.userType === 'admin';

  if (loading && projects.length === 0 && !error) {
    return <PageShimmer variant="Projects" />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        {/* <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Projects Manager</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Inspect specific projects, assign members, and manage logged task records.</p>
        </div> */}

        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <button className="btn btn-secondary" onClick={() => {
              setDeptName('');
              setDeptDesc('');
              setDeptColor('#3b82f6');
              setDeptMembers([]);
              setIsAddDeptOpen(true);
            }}>
              <Plus size={14} />
              <span>New Project</span>
            </button>
          )}
          {/* <button className="btn btn-primary" onClick={() => {
            if (projects.length === 0) return alert('Create a Project first!');
            setIsLogWorkOpen(true);
          }}>
            <Plus size={14} />
            <span>Log Work</span>
          </button> */}
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p style={{ fontWeight: 650 }}>{error}</p>
        </div>
      )}

      {/* Split layout */}
      <div className="split-layout">
        {/* Left column master list */}
        <div className="split-master">
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Select Project
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
            {projects.map((proj) => {
              const isActive = selectedProjId === proj._id;
              return (
                <div
                  key={proj._id}
                  className={`Project-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedProjId(proj._id);
                    setEditMode(false);
                    // Pre-fill Project states
                    setDeptName(proj.name);
                    setDeptDesc(proj.description || '');
                    setDeptColor(proj.color);
                    setDeptMembers(proj.members.map((m: any) => m._id));
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: proj.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {proj.name}
                    </span>
                  </div>
                  <span className="tag-badge" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>
                    {proj.members?.length || 0}
                  </span>
                </div>
              );
            })}

            {projects.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                No Projects available.
              </p>
            )}
          </div>
        </div>

        {/* Right column detail panel */}
        <div className="split-detail">
          {!selectedProjId || !activeProject ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', minHeight: '300px', color: 'var(--text-muted)' }}>
              <Folder size={44} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 650 }}>Select a Project from the left panel to inspect details.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ backgroundColor: activeProject.color, height: '4px', borderRadius: '2px', marginBottom: '16px' }} />

              {!editMode ? (
                /* --- DISPLAY MODE --- */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeProject.name}</h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                        {activeProject.description || 'No description added for this Project.'}
                      </p>
                    </div>

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => setEditMode(true)}>
                          <Edit3 size={14} />
                          <span>Edit Info</span>
                        </button>
                        <button className="btn btn-danger" onClick={handleDeleteDept}>
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid-stats" style={{ marginBottom: '20px' }}>
                    <div className="card stat-card" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="stat-icon-wrapper" style={{ color: 'var(--accent-primary)', background: '#eff6ff' }}>
                        <Clock size={16} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-value" style={{ fontSize: '0.95rem' }}>{formatMinutesToDuration(activeProjMinutes)}</span>
                        <span className="stat-label">Total Duration</span>
                      </div>
                    </div>

                    <div className="card stat-card" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="stat-icon-wrapper" style={{ color: '#10b981', background: '#ecfdf5' }}>
                        <Users size={16} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-value" style={{ fontSize: '0.95rem' }}>{activeProjEntries.length}</span>
                        <span className="stat-label">Logged Logs</span>
                      </div>
                    </div>

                    <div className="card stat-card" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="stat-icon-wrapper" style={{ color: '#7f56d9', background: '#f3e8ff' }}>
                        <Users size={16} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-value" style={{ fontSize: '0.95rem' }}>{activeProject.members?.length || 0}</span>
                        <span className="stat-label">Assigned Staff</span>
                      </div>
                    </div>
                  </div>

                  {/* Splits: Logs on left, Members on right */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '16px' }}>
                    
                    {/* Left: Logs */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 className="card-title" style={{ fontSize: '0.85rem' }}>Work Logs ({filteredProjEntries.length})</h3>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Search size={12} style={{ position: 'absolute', left: '6px', color: 'var(--text-muted)' }} />
                            <input 
                              type="text"
                              className="form-control"
                              placeholder="Search logs..."
                              style={{ height: '24px', paddingLeft: '22px', fontSize: '0.72rem', width: '120px' }}
                              value={logSearchQuery}
                              onChange={(e) => setLogSearchQuery(e.target.value)}
                            />
                          </div>
                          <input 
                            type="date"
                            className="form-control"
                            style={{ height: '24px', fontSize: '0.72rem', width: '100px', padding: '1px 4px' }}
                            value={logDateFilter}
                            onChange={(e) => setLogDateFilter(e.target.value)}
                          />
                        </div>
                      </div>

                      {filteredProjEntries.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '24px', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                          No logged entries match filter criteria.
                        </p>
                      ) : (
                        <div className="work-entries-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                          {filteredProjEntries.map((log) => (
                            <div key={log._id} className="card work-entry-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '8px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                                <div className="avatar" style={{ backgroundColor: log.employeeAvatarColor, width: '24px', height: '24px', fontSize: '0.65rem', flexShrink: 0 }}>
                                  {log.employeeName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
                                    <span style={{ fontWeight: 700 }}>{log.employeeName}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{log.date}</span>
                                  </div>
                                  <h5 style={{ fontWeight: 700, fontSize: '0.78rem', margin: '1px 0' }}>{log.title}</h5>
                                  {log.description && (
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '2px' }}>
                                      {log.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.8rem' }}>{formatMinutesToDuration(log.actualTime)}</div>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{log.startTime}-{log.endTime}</div>
                                </div>
                                {(isAdmin || log.employeeId === user?._id) && (
                                  <div style={{ display: 'flex', gap: '2px' }}>
                                    <button className="action-btn" onClick={() => openEditLogModal(log)}>
                                      <Edit3 size={10} />
                                    </button>
                                    <button className="action-btn btn-delete-item" onClick={() => handleDeleteLog(log._id)}>
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Members */}
                    <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                      <h3 className="card-title" style={{ fontSize: '0.85rem', marginBottom: '8px' }}>Staff Assigned</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                        {activeProject.members.map((m: any) => (
                          <div key={m._id} className="list-row" style={{ padding: '2px 0' }}>
                            <div className="avatar-wrapper">
                              <div className="avatar" style={{ backgroundColor: m.avatarColor, width: '24px', height: '24px', fontSize: '0.65rem' }}>
                                {m.name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.role}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {activeProject.members.length === 0 && (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center', padding: '12px' }}>No members assigned.</p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                /* --- EDIT INLINE MODE --- */
                <form onSubmit={handleEditDeptSubmit}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Edit Project Settings</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)} disabled={savingDept}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={savingDept}>
                        {savingDept ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Project / Project Name *</label>
                    <input 
                      type="text"
                      className="form-control"
                      required
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description (Optional)</label>
                    <textarea 
                      className="form-control"
                      placeholder="Define Project scope..."
                      value={deptDesc}
                      onChange={(e) => setDeptDesc(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Visual Theme Color</label>
                    <div className="color-selector">
                      {colors.map((c) => (
                        <div 
                          key={c}
                          className="color-option"
                          style={{ 
                            backgroundColor: c,
                            borderColor: deptColor === c ? 'var(--text-primary)' : 'transparent'
                          }}
                          onClick={() => setDeptColor(c)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assign / Re-assign Team Members</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '10px' }}>
                      {employees.map(emp => (
                        <label key={emp._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox"
                            checked={deptMembers.includes(emp._id)}
                            onChange={() => handleDeptMemberToggle(emp._id)}
                          />
                          <span style={{ fontWeight: 600 }}>{emp.name} ({emp.role})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD Project */}
      {isAddDeptOpen && (
        <div className="modal-overlay" onClick={() => setIsAddDeptOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Create New Project</h3>
              <button className="modal-close" onClick={() => setIsAddDeptOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddDeptSubmit}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="e.g. Development"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-control" 
                  placeholder="Define scope..."
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Badge Theme Color</label>
                <div className="color-selector">
                  {colors.map((c) => (
                    <div 
                      key={c}
                      className="color-option"
                      style={{ 
                        backgroundColor: c,
                        borderColor: deptColor === c ? 'var(--text-primary)' : 'transparent'
                      }}
                      onClick={() => setDeptColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Members</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '10px' }}>
                  {employees.map(emp => (
                    <label key={emp._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        checked={deptMembers.includes(emp._id)}
                        onChange={() => handleDeptMemberToggle(emp._id)}
                      />
                      <span style={{ fontWeight: 600 }}>{emp.name} ({emp.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddDeptOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingDept}>
                  {savingDept ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG WORK */}
      {isLogWorkOpen && (
        <div className="modal-overlay" onClick={() => setIsLogWorkOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Log Task Session</h3>
              <button className="modal-close" onClick={() => setIsLogWorkOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddWorkSubmit}>
              <div className="form-group">
                <label className="form-label">Project / Project *</label>
                <select 
                  className="form-control"
                  required
                  value={workProjId}
                  onChange={(e) => setWorkProjId(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Logging Member *</label>
                <select 
                  className="form-control"
                  required
                  value={workEmpId}
                  onChange={(e) => setWorkEmpId(e.target.value)}
                  disabled={!isAdmin}
                >
                  {isAdmin ? (
                    employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                    ))
                  ) : (
                    <option value={user?._id}>{user?.name} ({user?.role})</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">What work was performed? *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="e.g. Created login page templates"
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time *</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    required
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time *</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    required
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Session Notes (Optional)</label>
                <textarea 
                  className="form-control" 
                  placeholder="Details, progress..."
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsLogWorkOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingWork}>
                  {submittingWork ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT WORK */}
      {isEditLogOpen && (
        <div className="modal-overlay" onClick={() => {
          setIsEditLogOpen(false);
          setEditingLog(null);
        }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Edit Task Log</h3>
              <button className="modal-close" onClick={() => {
                setIsEditLogOpen(false);
                setEditingLog(null);
              }}>&times;</button>
            </div>
            <form onSubmit={handleEditLogSubmit}>
              <div className="form-group">
                <label className="form-label">Project / Project *</label>
                <select 
                  className="form-control"
                  required
                  value={logProjId}
                  onChange={(e) => setLogProjId(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Logging Member *</label>
                <select 
                  className="form-control"
                  required
                  value={logEmpId}
                  onChange={(e) => setLogEmpId(e.target.value)}
                  disabled={!isAdmin}
                >
                  {isAdmin ? (
                    employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                    ))
                  ) : (
                    <option value={user?._id}>{user?.name} ({user?.role})</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">What work was performed? *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time *</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    required
                    value={logStart}
                    onChange={(e) => setLogStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time *</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    required
                    value={logEnd}
                    onChange={(e) => setLogEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Session Notes (Optional)</label>
                <textarea 
                  className="form-control" 
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setIsEditLogOpen(false);
                  setEditingLog(null);
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingWork}>
                  {submittingWork ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
