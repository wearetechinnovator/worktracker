'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Clock, Plus, Calendar, Edit3, Trash2, ArrowLeft, 
  Search, AlertCircle, Loader2, Users, Mail, Briefcase 
} from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/time';

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
  const [logDate, setLogDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [logStart, setLogStart] = useState('09:00');
  const [logEnd, setLogEnd] = useState('17:00');
  const [logDesc, setLogDesc] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  const colors = ['#3b82f6', '#10b981', '#7f56d9', '#f59e0b', '#f43f5e', '#06b6d4', '#e2e8f0'];

  // Fetch project details, entries, and all employees (for modals)
  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [projRes, empsRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch('/api/employees')
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
      
      if (result.data.project.members.length > 0) {
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
  }, [id]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

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
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to update project');

      setIsEditProjectOpen(false);
      await fetchProjectData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingProject(false);
    }
  };

  // Toggle member selection in project edit
  const toggleEditMember = (empId: string) => {
    if (editProjMembers.includes(empId)) {
      setEditProjMembers(editProjMembers.filter(id => id !== empId));
    } else {
      setEditProjMembers([...editProjMembers, empId]);
    }
  };

  // Handle Delete Project
  const handleDeleteProject = async () => {
    const confirmation = confirm(
      'WARNING: Deleting this project will permanently delete all logged work sessions under it. This cannot be undone. Are you sure?'
    );
    if (!confirmation) return;

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete project');

      router.push('/');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Add Work Log
  const handleAddLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logEmpId || !logTitle.trim() || !logDate || !logStart || !logEnd) return;

    try {
      setSavingLog(true);
      const res = await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          employeeId: logEmpId,
          title: logTitle,
          date: logDate,
          startTime: logStart,
          endTime: logEnd,
          description: logDesc,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to log work');

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

  // Open Edit Log Modal
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

  // Handle Edit Log Submit
  const handleEditLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !logEmpId || !logTitle.trim() || !logDate || !logStart || !logEnd) return;

    try {
      setSavingLog(true);
      const res = await fetch(`/api/work/${editingLog._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: logEmpId,
          title: logTitle,
          date: logDate,
          startTime: logStart,
          endTime: logEnd,
          description: logDesc,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to update work entry');

      setIsEditLogOpen(false);
      setEditingLog(null);
      await fetchProjectData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingLog(false);
    }
  };

  // Handle Delete Log
  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this work session log?')) return;

    try {
      const res = await fetch(`/api/work/${logId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete work entry');

      await fetchProjectData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter entries locally
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.description && entry.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDate = !dateFilter || entry.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  const filteredMinutes = filteredEntries.reduce((sum, entry) => sum + entry.actualTime, 0);

  if (loading && !project) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '40px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444' }} />
        <h3>Project not found</h3>
        <p style={{ color: 'var(--text-secondary)' }}>{error || 'The requested project/section could not be found.'}</p>
        <Link href="/" className="btn btn-primary">
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: 600 }} className="hover-link">
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Main Grid: Info Sidebar + Work Logs */}
      <div className="dashboard-grid">
        
        {/* Project Header Info */}
        <div className="col-8">
          <div className="card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <span className="badge-status active" style={{ backgroundColor: `${project.color}15`, color: project.color, marginBottom: '8px' }}>
                  DEPARTMENT
                </span>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>{project.name}</h1>
                <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {project.description || 'No description provided for this department.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setIsEditProjectOpen(true)}>
                  <Edit3 size={16} />
                  <span>Edit</span>
                </button>
                <button className="btn btn-danger" onClick={handleDeleteProject}>
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '24px', marginBottom: '20px' }}>
              <h2 className="card-title">Work Logs ({filteredEntries.length})</h2>
              
              <button className="btn btn-primary btn-sm" onClick={() => {
                if (allEmployees.length === 0) {
                  alert('Please create team members first!');
                  return;
                }
                setLogTitle('');
                setLogDesc('');
                setIsAddLogOpen(true);
              }}>
                <Plus size={16} />
                <span>Log Task</span>
              </button>
            </div>

            <div className="filters-bar" style={{ marginBottom: '20px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search logs or member names..." 
                  style={{ paddingLeft: '36px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '180px' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ paddingLeft: '36px' }}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Work Logs List */}
            {filteredEntries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                No entries logged matching criteria.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredEntries.map((entry) => (
                  <div key={entry._id} className="list-row" style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 750, fontSize: '1rem' }}>{entry.title}</span>
                        <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.05rem' }}>
                          {formatMinutesToDuration(entry.actualTime)}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="avatar" style={{ backgroundColor: entry.employeeAvatarColor, width: '20px', height: '20px', fontSize: '0.65rem' }}>
                            {entry.employeeName.split(' ').map(n => n[0]).join('')}
                          </span>
                          <strong>{entry.employeeName}</strong>
                        </span>
                        <span>Date: <strong>{entry.date}</strong></span>
                        <span>Time: <strong>{entry.startTime} - {entry.endTime}</strong></span>
                      </div>

                      {entry.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '4px' }}>
                          {entry.description}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: '24px' }} className="no-print">
                      <button className="action-btn" title="Edit Log" onClick={() => openEditLogModal(entry)}>
                        <Edit3 size={14} />
                      </button>
                      <button className="action-btn btn-delete-item" title="Delete Log" onClick={() => handleDeleteLog(entry._id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Info Details */}
        <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card: Stats Summary */}
          <div className="card">
            <div className="project-color-banner" style={{ backgroundColor: project.color, height: '6px', borderRadius: '3px', marginBottom: '16px' }} />
            <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '16px' }}>Department Metrics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Hours Tracked</span>
                <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '2px' }}>
                  {formatMinutesToDuration(totalMinutes)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Entries Logged</span>
                <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, marginTop: '2px' }}>
                  {entries.length} logs
                </span>
              </div>
            </div>
          </div>

          {/* Card: Assigned Members */}
          <div className="card">
            <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '16px' }}>Assigned Members ({project.members.length})</h3>
            {project.members.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No team members assigned.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {project.members.map((member) => (
                  <div key={member._id} className="list-row" style={{ padding: '2px 0' }}>
                    <div className="avatar-wrapper">
                      <div className="avatar" style={{ backgroundColor: member.avatarColor, width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{member.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{member.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* EDIT DEPARTMENT MODAL */}
      {isEditProjectOpen && (
        <div className="modal-overlay" onClick={() => setIsEditProjectOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Edit Department Details</h3>
              <button className="modal-close" onClick={() => setIsEditProjectOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditProjectSubmit}>
              <div className="form-group">
                <label className="form-label">Department Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={editProjName}
                  onChange={(e) => setEditProjName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-control" 
                  value={editProjDesc}
                  onChange={(e) => setEditProjDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color Theme</label>
                <div className="color-selector">
                  {colors.map((color) => (
                    <div 
                      key={color}
                      className={`color-option ${editProjColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditProjColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Members</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '12px' }}>
                  {allEmployees.map(emp => (
                    <label key={emp._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        checked={editProjMembers.includes(emp._id)}
                        onChange={() => toggleEditMember(emp._id)}
                      />
                      <span>{emp.name} ({emp.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Log Task Session</h3>
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
                >
                  {project.members.map((m) => (
                    <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                  ))}
                  {project.members.length === 0 && allEmployees.map((e) => (
                    <option key={e._id} value={e._id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">What work was performed? *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="e.g. Coded stacked hours layout"
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
                  placeholder="Provide brief notes on accomplishments..."
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Edit Task Log</h3>
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
                >
                  {allEmployees.map((e) => (
                    <option key={e._id} value={e._id}>{e.name} ({e.role})</option>
                  ))}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
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
