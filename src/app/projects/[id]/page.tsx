'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Clock, Plus, Calendar, Edit3, Trash2, ArrowLeft, 
  Search, AlertCircle, Loader2, Users, Mail
} from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/time';
import PageShimmer from '@/components/PageShimmer';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  color: string;
  members: Employee[];
}

interface WorkEntry {
  _id: string;
  projectId: string;
  employeeId: string;
  employeeName: string;
  employeeAvatarColor: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  actualTime: number;
  description?: string;
}

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetail({ params }: ProjectPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Project & Entries State
  const [project, setProject] = useState<Project | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isEditLogOpen, setIsEditLogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkEntry | null>(null);

  // Form States (Edit Project)
  const [editProjName, setEditProjName] = useState('');
  const [editProjDesc, setEditProjDesc] = useState('');
  const [editProjColor, setEditProjColor] = useState('');
  const [editProjMembers, setEditProjMembers] = useState<string[]>([]);
  const [savingProject, setSavingProject] = useState(false);

  // Form States (Add/Edit Log)
  const [logEmpId, setLogEmpId] = useState('');
  const [logTitle, setLogTitle] = useState('');
  const [logDate, setLogDate] = useState('');
  const [logStart, setLogStart] = useState('09:00');
  const [logEnd, setLogEnd] = useState('17:00');
  const [logDesc, setLogDesc] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  const colors = ['#3b82f6', '#10b981', '#7f56d9', '#f59e0b', '#f43f5e', '#06b6d4', '#475569'];

  // Check login session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
      const todayStr = new Date().toISOString().split('T')[0];
      setLogDate(todayStr);
    }
  }, [router]);

  // Fetch project details, entries, and all employees (for modals)
  const fetchProjectData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      const isEmployee = user.userType === 'employee';
      const projUrl = isEmployee ? `/api/projects/${id}?employeeId=${user._id}` : `/api/projects/${id}`;
      const empsUrl = '/api/employees';

      const [projRes, empsRes] = await Promise.all([
        fetch(projUrl),
        fetch(empsUrl)
      ]);

      const result = await projRes.json();
      const empsData = await empsRes.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load project details.');
      }

      setProject(result.data.project);
      setEntries(result.data.entries);
      setTotalMinutes(result.data.totalMinutes);

      if (empsData.success) {
        setAllEmployees(empsData.data);
      }

      // Pre-fill edit forms
      setEditProjName(result.data.project.name);
      setEditProjDesc(result.data.project.description || '');
      setEditProjColor(result.data.project.color);
      setEditProjMembers(result.data.project.members.map((m: any) => m._id));
      
      if (isEmployee) {
        setLogEmpId(user._id);
      } else if (result.data.project.members.length > 0) {
        setLogEmpId(result.data.project.members[0]._id);
      } else if (empsData.data.length > 0) {
        setLogEmpId(empsData.data[0]._id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (user) {
      fetchProjectData();
    }
  }, [user, fetchProjectData]);

  // Handle Edit Project Submit
  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjName.trim()) return;

    try {
      setSavingProject(true);
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editProjName,
          description: editProjDesc,
          color: editProjColor,
          members: editProjMembers
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update department details');

      setIsEditProjectOpen(false);
      await fetchProjectData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingProject(false);
    }
  };

  // Handle Delete Project
  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this department section? This will also cascade-delete all work logs registered in it!')) return;

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete');

      router.push('/');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Add Work Log
  const handleAddLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmpId = user.userType === 'employee' ? user._id : logEmpId;
    if (!finalEmpId || !logTitle.trim() || !logDate || !logStart || !logEnd) return;

    try {
      setSavingLog(true);
      const res = await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          employeeId: finalEmpId,
          title: logTitle,
          date: logDate,
          startTime: logStart,
          endTime: logEnd,
          description: logDesc
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to log session');

      setLogTitle('');
      setLogDesc('');
      setIsAddLogOpen(false);
      await fetchProjectData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingLog(false);
    }
  };

  // Handle Edit Work Log
  const openEditLogModal = (log: WorkEntry) => {
    setEditingLog(log);
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
    if (!editingLog) return;
    const finalEmpId = user.userType === 'employee' ? user._id : logEmpId;

    try {
      setSavingLog(true);
      const res = await fetch(`/api/work/${editingLog._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          employeeId: finalEmpId,
          title: logTitle,
          date: logDate,
          startTime: logStart,
          endTime: logEnd,
          description: logDesc
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update work log');

      setIsEditLogOpen(false);
      setEditingLog(null);
      await fetchProjectData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingLog(false);
    }
  };

  // Handle Delete Work Log
  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this work session log?')) return;

    try {
      const res = await fetch(`/api/work/${logId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete log');

      await fetchProjectData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMemberSelectToggle = (empId: string) => {
    if (editProjMembers.includes(empId)) {
      setEditProjMembers(editProjMembers.filter(id => id !== empId));
    } else {
      setEditProjMembers([...editProjMembers, empId]);
    }
  };

  // Filter logs locally
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDate = dateFilter ? entry.date === dateFilter : true;
    return matchesSearch && matchesDate;
  });

  const isAdmin = user?.userType === 'admin';

  if (loading && !project && !error) {
    return <PageShimmer variant="project" />;
  }

  if (error || !project) {
    return (
      <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', margin: '24px' }}>
        <AlertCircle style={{ color: '#ef4444' }} />
        <p>{error || 'Project not found or unreachable.'}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Top Breadcrumb Nav */}
      <div style={{ marginBottom: '16px' }} className="no-print">
        <Link href="/" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', gap: '6px' }}>
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Main Grid Layout */}
      <div className="dashboard-grid">
        
        {/* Left Column: Project Header & Work Logs list */}
        <div className="col-8">
          <div className="card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <span className="badge-status active" style={{ backgroundColor: `${project.color}15`, color: project.color, marginBottom: '6px' }}>
                  DEPARTMENT
                </span>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>{project.name}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {project.description || 'No description provided for this department.'}
                </p>
              </div>

              {isAdmin && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" onClick={() => setIsEditProjectOpen(true)}>
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>
                  <button className="btn btn-danger" onClick={handleDeleteProject}>
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border-color)', marginTop: '16px', paddingTop: '16px', marginBottom: '12px' }}>
              <h2 className="card-title">Work Logs ({filteredEntries.length})</h2>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Search logs/members..." 
                    className="form-control" 
                    style={{ paddingLeft: '28px', width: '180px', height: '28px', fontSize: '0.75rem' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ width: '120px', height: '28px', fontSize: '0.75rem', padding: '2px 6px' }}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" onClick={() => {
                  if (!isAdmin && !user) return;
                  setIsAddLogOpen(true);
                }}>
                  <Plus size={12} />
                  <span>Log Work</span>
                </button>
              </div>
            </div>

            {/* Logs List Container */}
            {filteredEntries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px', fontSize: '0.8rem' }}>
                No work sessions registered matching filters.
              </p>
            ) : (
              <div className="work-entries-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredEntries.map((entry) => (
                  <div key={entry._id} className="card work-entry-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                      <div className="avatar" style={{ backgroundColor: entry.employeeAvatarColor, width: '28px', height: '28px', fontSize: '0.7rem', flexShrink: 0 }}>
                        {entry.employeeName.split(' ').map((n) => n[0]).join('')}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{entry.employeeName}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{entry.date}</span>
                        </div>
                        <h4 style={{ fontWeight: 700, margin: '2px 0', fontSize: '0.8rem' }}>{entry.title}</h4>
                        {entry.description && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '4px' }}>
                            {entry.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                          {formatMinutesToDuration(entry.actualTime)}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{entry.startTime} - {entry.endTime}</span>
                      </div>

                      {(isAdmin || entry.employeeId === user?._id) && (
                        <div style={{ display: 'flex', gap: '4px' }} className="no-print">
                          <button className="action-btn" title="Edit Log" onClick={() => openEditLogModal(entry)}>
                            <Edit3 size={12} />
                          </button>
                          <button className="action-btn btn-delete-item" title="Delete Log" onClick={() => handleDeleteLog(entry._id)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Project stats & members summary */}
        <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card: Stats Summary */}
          <div className="card">
            <div className="project-color-banner" style={{ backgroundColor: project.color, height: '4px', borderRadius: '2px', marginBottom: '12px' }} />
            <h3 className="card-title" style={{ marginBottom: '12px' }}>Department Tracker</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Total Hours Tracked</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{formatMinutesToDuration(totalMinutes)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Work Sessions Count</span>
                <span style={{ fontWeight: 800 }}>{entries.length} logs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Assigned Members</span>
                <span style={{ fontWeight: 800 }}>{project.members.length} people</span>
              </div>
            </div>
          </div>

          {/* Card: Members Registry list */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '12px' }}>Staff Assigned</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {project.members.map((m) => (
                <div key={m._id} className="list-row" style={{ padding: '2px 0' }}>
                  <div className="avatar-wrapper">
                    <div className="avatar" style={{ backgroundColor: m.avatarColor, width: '28px', height: '28px', fontSize: '0.7rem' }}>
                      {m.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{m.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.role}</div>
                    </div>
                  </div>
                </div>
              ))}
              {project.members.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '12px' }}>
                  No staff members assigned to this department.
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL: EDIT PROJECT (Admin Only) */}
      {isAdmin && isEditProjectOpen && (
        <div className="modal-overlay" onClick={() => setIsEditProjectOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Edit Department Info</h3>
              <button className="modal-close" onClick={() => setIsEditProjectOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditProjectSubmit}>
              <div className="form-group">
                <label className="form-label">Department / Project Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={editProjName}
                  onChange={(e) => setEditProjName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-control" 
                  value={editProjDesc}
                  onChange={(e) => setEditProjDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Visual Badge Color</label>
                <div className="color-selector">
                  {colors.map((color) => (
                    <div 
                      key={color}
                      className="color-option"
                      style={{ 
                        backgroundColor: color,
                        borderColor: editProjColor === color ? 'var(--text-primary)' : 'transparent'
                      }}
                      onClick={() => setEditProjColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Members</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '10px' }}>
                  {allEmployees.map(emp => (
                    <label key={emp._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        checked={editProjMembers.includes(emp._id)}
                        onChange={() => handleMemberSelectToggle(emp._id)}
                      />
                      <span>{emp.name} ({emp.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditProjectOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingProject}>
                  {savingProject ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG WORK SESSION MODAL */}
      {isAddLogOpen && (
        <div className="modal-overlay" onClick={() => setIsAddLogOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Log Task Session</h3>
              <button className="modal-close" onClick={() => setIsAddLogOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddLogSubmit}>
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
                    allEmployees.map((e) => (
                      <option key={e._id} value={e._id}>{e.name} ({e.role})</option>
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
                  placeholder="e.g. Coded sidebar layouts"
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
                  placeholder="Details, status, updates..."
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddLogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingLog}>
                  {savingLog ? 'Saving...' : 'Log Time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WORK SESSION MODAL */}
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
                <label className="form-label">Logging Member *</label>
                <select 
                  className="form-control"
                  required
                  value={logEmpId}
                  onChange={(e) => setLogEmpId(e.target.value)}
                  disabled={!isAdmin}
                >
                  {isAdmin ? (
                    allEmployees.map((e) => (
                      <option key={e._id} value={e._id}>{e.name} ({e.role})</option>
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
                <button type="submit" className="btn btn-primary" disabled={savingLog}>
                  {savingLog ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
