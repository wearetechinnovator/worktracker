'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Folder, FolderPlus, Plus, Search, Edit3, Trash2, Clock, 
  AlertCircle, Users, Briefcase, Mail, FileBarChart, Lightbulb, HelpCircle, Sparkles
} from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/time';
import PageShimmer from '@/components/PageShimmer';
import CreateProjectModal from '@/components/CreateProjectModal';

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
  taskCount?: number;
  members: any[];
  clientId?: {
    _id: string;
    name: string;
    emails: string[];
    address?: string;
    duration?: string;
  } | null;
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
  const [isExploreModalOpen, setIsExploreModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkEntry | null>(null);

  // Form States (Add/Edit Project)
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptColor, setDeptColor] = useState('#3b82f6');
  const [deptMembers, setDeptMembers] = useState<string[]>([]);
  const [savingDept, setSavingDept] = useState(false);

  // Client Selection State
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isClientDrawerOpen, setIsClientDrawerOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmails, setNewClientEmails] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientDuration, setNewClientDuration] = useState('');

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

      const [projRes, empRes, workRes, clientsRes] = await Promise.all([
        fetch(projUrl),
        fetch(empUrl),
        fetch(workUrl),
        fetch('/api/clients')
      ]);

      const projData = await projRes.json().catch(() => null);
      const empData = await empRes.json().catch(() => null);
      const workData = await workRes.json().catch(() => null);
      const clientsData = await clientsRes.json().catch(() => null);

      if (!projRes.ok || !projData || !projData.success) throw new Error(projData?.error || 'Failed to load projects');
      if (!empRes.ok || !empData || !empData.success) throw new Error(empData?.error || 'Failed to load employees');
      if (!workRes.ok || !workData || !workData.success) throw new Error(workData?.error || 'Failed to load work entries');

      setProjects(projData.data);
      setEmployees(empData.data);
      setEntries(workData.data);
      if (clientsData && clientsData.success) {
        setClientsList(clientsData.data);
      }

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


  const handleEditDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjId || !deptName.trim()) return;

    try {
      setSavingDept(true);
      
      const bodyPayload: any = {
        name: deptName,
        description: deptDesc,
        color: deptColor,
        members: deptMembers
      };

      if (selectedClientId === 'new') {
        bodyPayload.clientInfo = {
          name: newClientName,
          phone: newClientPhone,
          emails: newClientEmails,
          address: newClientAddress,
          duration: newClientDuration
        };
      } else {
        bodyPayload.clientId = selectedClientId || null;
      }

      const res = await fetch(`/api/projects/${selectedProjId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to save Project changes');

      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmails('');
      setNewClientAddress('');
      setNewClientDuration('');
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
        <div className="split-master" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PROJECTS
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '1px 7px', borderRadius: '10px', color: 'var(--text-secondary)' }}>
              {projects.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
            {projects.map((proj) => {
              const isActive = selectedProjId === proj._id;
              const assignedMembers = Array.isArray(proj.members) ? proj.members : [];

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
                    setDeptMembers(assignedMembers.map((m: any) => typeof m === 'string' ? m : m._id));
                    setSelectedClientId(proj.clientId?._id || '');
                  }}
                  style={{ gap: '8px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: proj.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {proj.name}
                    </span>
                  </div>

                  {/* Avatar Stack for Assigned Members */}
                  {assignedMembers.length > 0 && (
                    <div
                      title={`Assigned Members (${assignedMembers.length})`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        marginLeft: 'auto',
                        marginRight: '2px',
                        flexShrink: 0,
                      }}
                    >
                      {assignedMembers.slice(0, 3).map((m: any, idx: number) => {
                        const nameStr = typeof m === 'string' ? 'User' : (m.name || 'User');
                        const roleStr = typeof m === 'object' && m.role ? ` • ${m.role}` : '';
                        const presence: 'working' | 'idle' | 'offline' = typeof m === 'object' && m.presenceState ? m.presenceState : 'offline';

                        let dotColor = '#94a3b8'; // Grey for offline
                        let stateText = '⚪ Offline (Not Punched In)';
                        let dotGlow = 'none';

                        if (presence === 'working') {
                          dotColor = '#22c55e'; // Green for working
                          stateText = '🟢 Online & Currently Working';
                          dotGlow = '0 0 4px rgba(34, 197, 94, 0.7)';
                        } else if (presence === 'idle') {
                          dotColor = '#f59e0b'; // Yellow for logged in / idle
                          stateText = '🟡 Logged In (Idle / Not Working)';
                          dotGlow = '0 0 4px rgba(245, 158, 11, 0.7)';
                        }

                        const initial = nameStr.charAt(0).toUpperCase();
                        const color = typeof m === 'string' ? '#3b82f6' : (m.avatarColor || '#3b82f6');
                        const tooltip = `${nameStr}${roleStr}\n${stateText}`;

                        return (
                          <div
                            key={typeof m === 'string' ? m : (m._id || idx)}
                            title={tooltip}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              border: '1.5px solid var(--bg-primary)',
                              marginLeft: idx === 0 ? 0 : '-6px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                              flexShrink: 0,
                              position: 'relative',
                              zIndex: 3 - idx,
                              cursor: 'pointer',
                            }}
                          >
                            {initial}
                            {/* Presence Status Dot Indicator */}
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '-1px',
                                right: '-1px',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: dotColor,
                                border: '1px solid #ffffff',
                                boxShadow: dotGlow,
                              }}
                            />
                          </div>
                        );
                      })}
                      {assignedMembers.length > 3 && (
                        <div
                          title={`+${assignedMembers.length - 3} more:\n${assignedMembers.slice(3).map((m: any) => typeof m === 'string' ? m : `${m.name || 'User'}${m.role ? ` (${m.role})` : ''}`).join('\n')}`}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            border: '1.5px solid var(--bg-primary)',
                            marginLeft: '-6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                            flexShrink: 0,
                            position: 'relative',
                            zIndex: 0,
                            cursor: 'pointer',
                          }}
                        >
                          +{assignedMembers.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Task Count Badge */}
                  <span className="tag-badge" title={`${proj.taskCount || 0} tasks`} style={{ fontSize: '0.68rem', padding: '1px 6px', fontWeight: 700, borderRadius: '10px', flexShrink: 0 }}>
                    {proj.taskCount || 0}
                  </span>
                </div>
              );
            })}

            {projects.length === 0 && (
              <div style={{ 
                border: '1px dashed var(--border-color)', 
                borderRadius: '10px', 
                padding: '16px 12px', 
                textAlign: 'center', 
                background: 'var(--bg-tertiary)',
                marginTop: '4px' 
              }}>
                <FolderPlus size={22} style={{ color: 'var(--accent-primary)', marginBottom: '6px', opacity: 0.8 }} />
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                  No projects yet
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  Create your first project to get started.
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Tip */}
          <div style={{ 
            border: '1px solid var(--border-color)', 
            borderRadius: '10px', 
            padding: '10px 12px', 
            background: 'var(--bg-tertiary)', 
            marginTop: '16px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.74rem', color: 'var(--accent-primary)', marginBottom: '3px' }}>
              <Lightbulb size={13} />
              <span>Tip</span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.35' }}>
              Projects help you organize and track all your work efficiently.
            </p>
          </div>
        </div>

        {/* Right column detail panel */}
        <div className="split-detail">
          {projects.length === 0 ? (
            <div className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '48px 32px', 
              minHeight: '460px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {/* Subtle top illustration */}
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(127, 86, 217, 0.12) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)'
              }}>
                <FolderPlus size={34} style={{ color: 'var(--accent-primary)' }} />
              </div>

              {/* Heading & Subtitle */}
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textAlign: 'center' }}>
                Your workspace is ready!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '460px', textAlign: 'center', lineHeight: '1.5', marginBottom: '24px' }}>
                Create your first project to start organizing tasks, tracking progress, and collaborating with your team.
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {isAdmin ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setDeptName('');
                      setDeptDesc('');
                      setDeptColor('#3b82f6');
                      setDeptMembers([]);
                      setIsAddDeptOpen(true);
                    }}
                    style={{ padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px' }}
                  >
                    <Plus size={16} />
                    <span>Create your first project</span>
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    disabled 
                    title="Only admins can create projects"
                    style={{ padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', opacity: 0.6 }}
                  >
                    <Plus size={16} />
                    <span>Create your first project</span>
                  </button>
                )}
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setIsExploreModalOpen(true)}
                  style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
                >
                  <HelpCircle size={15} />
                  <span>Explore how it works</span>
                </button>
              </div>

              {/* Divider */}
              <div style={{ width: '100%', maxWidth: '540px', height: '1px', background: 'var(--border-color)', margin: '32px 0 24px 0' }} />

              {/* Feature Highlights Section */}
              <div style={{ width: '100%', maxWidth: '640px' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '14px', textAlign: 'center' }}>
                  What you can do with projects
                </h4>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                  gap: '12px' 
                }}>
                  <div style={{ 
                    background: 'var(--bg-tertiary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '10px', 
                    padding: '14px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ 
                      width: '30px', 
                      height: '30px', 
                      borderRadius: '6px', 
                      background: '#eff6ff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginBottom: '8px',
                      color: '#3b82f6'
                    }}>
                      <Folder size={16} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Organize work
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                      Keep all project details, files and tasks in one place.
                    </span>
                  </div>

                  <div style={{ 
                    background: 'var(--bg-tertiary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '10px', 
                    padding: '14px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ 
                      width: '30px', 
                      height: '30px', 
                      borderRadius: '6px', 
                      background: '#ecfdf5', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginBottom: '8px',
                      color: '#10b981'
                    }}>
                      <FileBarChart size={16} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Track progress
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                      Monitor milestones and measure performance.
                    </span>
                  </div>

                  <div style={{ 
                    background: 'var(--bg-tertiary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '10px', 
                    padding: '14px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ 
                      width: '30px', 
                      height: '30px', 
                      borderRadius: '6px', 
                      background: '#f3e8ff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginBottom: '8px',
                      color: '#7f56d9'
                    }}>
                      <Users size={16} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Manage team
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                      Collaborate with your team and assign tasks easily.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : !selectedProjId || !activeProject ? (
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
                      {activeProject.clientId && (
                        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'inline-block' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Briefcase size={12} style={{ color: 'var(--accent-primary)' }} />
                            <span>Client: {activeProject.clientId.name}</span>
                          </p>
                          {activeProject.clientId.emails && activeProject.clientId.emails.length > 0 && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Mail size={11} />
                              <span>{activeProject.clientId.emails.join(', ')}</span>
                            </p>
                          )}
                          {activeProject.clientId.duration && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={11} />
                              <span>Duration: {activeProject.clientId.duration}</span>
                            </p>
                          )}
                        </div>
                      )}
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
                        {activeProject.members.map((m: any) => {
                          const presence: 'working' | 'idle' | 'offline' = m.presenceState || 'offline';
                          let dotColor = '#94a3b8'; // Grey for offline
                          let statusLabel = 'Offline';
                          let badgeBg = 'rgba(148, 163, 184, 0.12)';
                          let badgeColor = '#64748b';
                          let dotGlow = 'none';

                          if (presence === 'working') {
                            dotColor = '#22c55e';
                            statusLabel = 'Working';
                            badgeBg = 'rgba(34, 197, 94, 0.12)';
                            badgeColor = '#15803d';
                            dotGlow = '0 0 4px rgba(34, 197, 94, 0.6)';
                          } else if (presence === 'idle') {
                            dotColor = '#f59e0b';
                            statusLabel = 'Idle';
                            badgeBg = 'rgba(245, 158, 11, 0.12)';
                            badgeColor = '#b45309';
                            dotGlow = '0 0 4px rgba(245, 158, 11, 0.6)';
                          }

                          const initials = m.name ? m.name.split(' ').map((n: string) => n[0]).join('') : 'U';

                          return (
                            <div key={m._id} className="list-row" style={{ padding: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <div className="avatar-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                  <div className="avatar" style={{ backgroundColor: m.avatarColor || '#3b82f6', width: '26px', height: '26px', fontSize: '0.68rem', fontWeight: 700 }}>
                                    {initials}
                                  </div>
                                  <span
                                    style={{
                                      position: 'absolute',
                                      bottom: '-1px',
                                      right: '-1px',
                                      width: '6px',
                                      height: '6px',
                                      borderRadius: '50%',
                                      backgroundColor: dotColor,
                                      border: '1.5px solid var(--bg-primary)',
                                      boxShadow: dotGlow,
                                    }}
                                  />
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                                  <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.role}</div>
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  background: badgeBg,
                                  color: badgeColor,
                                  flexShrink: 0,
                                }}
                              >
                                {statusLabel}
                              </span>
                            </div>
                          );
                        })}
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

                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label className="form-label">Client Association</label>
                    <select
                      className="form-control"
                      value={selectedClientId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'new') {
                          setIsClientDrawerOpen(true);
                          setSelectedClientId('');
                        } else {
                          setSelectedClientId(val);
                        }
                      }}
                    >
                      <option value="">None</option>
                      <option value="new">Add New Client Inline...</option>
                      {clientsList.map(c => {
                        const projNames = c.projects && c.projects.length > 0
                          ? ` (${c.projects.map((p: any) => p.name).join(', ')})`
                          : '';
                        return (
                          <option key={c._id} value={c._id}>
                            {c.name}{projNames}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD Project */}
      <CreateProjectModal
        isOpen={isAddDeptOpen}
        onClose={() => setIsAddDeptOpen(false)}
        clientsList={clientsList}
        employeesList={employees}
        onSuccess={() => fetchData()}
      />

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

      {/* Onboarding Overview Modal */}
      {isExploreModalOpen && (
        <div className="modal-overlay" onClick={() => setIsExploreModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '20px 24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>How Projects Work</h3>
              </div>
              <button className="modal-close" onClick={() => setIsExploreModalOpen(false)}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Create & Associate</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                    Set up your project with a name, description, color theme, and optionally tag it to a client.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Assign Staff Members</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                    Assign team members to the project so they can log work hours, track tasks, and collaborate.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Track Time & Milestones</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                    Log work sessions, analyze total durations, filter activity, and generate comprehensive reports.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setIsExploreModalOpen(false);
                  if (isAdmin) {
                    setDeptName('');
                    setDeptDesc('');
                    setDeptColor('#3b82f6');
                    setDeptMembers([]);
                    setIsAddDeptOpen(true);
                  }
                }}
              >
                {isAdmin ? 'Create First Project' : 'Got it!'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
