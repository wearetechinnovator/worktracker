'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock, Plus, Folder, Calendar, Users, UserPlus, Mail, ChevronRight,
  AlertCircle, X, Loader2, CheckSquare, Activity, ArrowUpRight,
  Paperclip, Link as LinkIcon, MessageSquare
} from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/time';
import MyTasks from '@/components/MyTasks';
import PageShimmer from '@/components/PageShimmer';
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

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  Project: string;
  status: string;
  avatarColor: string;
  totalMinutes: number;
  workMode?: string;
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
    avatarColor?: string;
  };
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  dueDate?: string;
  tags?: string[];
  createdAt: string;
}

interface DashboardStats {
  employees: {
    total: number;
    active: number;
    inactive: number;
    present: number;
    absent: number;
    checkedIn: number;
    checkedOut: number;
    workingNow: number;
    attendanceRate: number;
  };
  tasks: {
    total: number;
    active: number;
    inProgress: number;
    todo: number;
    review: number;
    completed: number;
  };
  projects: {
    total: number;
    active: number;
    inactive: number;
    totalMinutes: number;
  };
  productivity: {
    todayMinutes: number;
    totalMinutes: number;
    attendanceRate: number;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Punch status for logged in employee on dashboard
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [canPunchOut, setCanPunchOut] = useState(false);

  // Live Date and Time
  const [liveTime, setLiveTime] = useState<string>('');
  const [liveDate, setLiveDate] = useState<string>('');

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);

  // Team Punch Pagination
  const [teamPage, setTeamPage] = useState(1);

  // Selected Day for Timeline (default to today)
  const [selectedTimelineDate, setSelectedTimelineDate] = useState('');



  // Client Selection State
  const [clientsList, setClientsList] = useState<any[]>([]);

  // Work Log Form State
  const [workProjId, setWorkProjId] = useState('');
  const [workEmpId, setWorkEmpId] = useState('');
  const [workTitle, setWorkTitle] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [workDesc, setWorkDesc] = useState('');
  const [submittingWork, setSubmittingWork] = useState(false);

  // Email Summary Modal State
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailContent, setMailContent] = useState('');

  // Presets
  const colors = ['#3b82f6', '#10b981', '#7f56d9', '#f59e0b', '#f43f5e', '#06b6d4', '#475569'];
  const Projects = ['Design', 'Development', 'Marketing', 'Human Resource', 'Management'];
  const statuses = ['Active', 'Inactive'];
  const workmodes = ['Hybrid', 'Remote', 'Onsite'];


  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [tasksKey, setTasksKey] = useState(0);

  // Check login session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      const todayStr = new Date().toISOString().split('T')[0];
      setSelectedTimelineDate(todayStr);
      setWorkDate(todayStr);
    }
  }, [router]);

  // Fetch Data based on user role
  const fetchData = useCallback(async (isSilent = false) => {
    if (!user) return;

    try {
      if (!isSilent) setLoading(true);
      setError(null);

      const [response, clientsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/clients')
      ]);
      const result = await response.json().catch(() => null);
      const clientsData = await clientsRes.json().catch(() => null);

      if (!response.ok || !result?.success) throw new Error(result?.error || 'Failed to connect to database');
      const { projects: nextProjects, employees: nextEmployees, entries: nextEntries } = result.data;

      setProjects(nextProjects);
      setEmployees(nextEmployees);
      setEntries(nextEntries);
      if (result.data?.stats) {
        setStats(result.data.stats);
      }
      if (clientsData && clientsData.success) {
        setClientsList(clientsData.data);
      }

      setWorkProjId((prev) => prev || (nextProjects.length > 0 ? nextProjects[0]._id : ''));
      setWorkEmpId((prev) => {
        if (user.userType === 'employee') return user._id;
        return prev || (nextEmployees.length > 0 ? nextEmployees[0]._id : '');
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
    const handleRefresh = () => {
      if (user) fetchData();
    };
    window.addEventListener('worktracker-refresh', handleRefresh);
    return () => window.removeEventListener('worktracker-refresh', handleRefresh);
  }, [user, fetchData]);

  const checkPunchStatus = useCallback(async () => {
    if (!user || user.userType === 'admin') return;
    try {
      const res = await fetch(`/api/punch?employeeId=${user._id}`);
      const result = await res.json();
      if (result.success) {
        const attendance = result.data?.attendance;
        setIsPunchedIn(!!attendance?.checkIn && !attendance?.checkOut);
        setCanPunchOut(!!result.data?.canPunchOut);
      }
    } catch (err) {
      console.error('Error checking punch status on dashboard:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.userType !== 'admin') {
      checkPunchStatus();
    }
  }, [user, checkPunchStatus]);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLiveDate(now.toLocaleDateString('en-US', { weekday: 'short', year: '2-digit', month: 'short', day: 'numeric' }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [isPunchingOut, setIsPunchingOut] = useState(false);

  const handlePunchOut = () => {
    handleOpenMailModal();
  };

  const confirmPunchOut = async () => {
    if (!user) return;
    try {
      setIsPunchingOut(true);
      let location: any = undefined;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, label: 'Device geolocation' }),
            () => resolve(undefined),
            { enableHighAccuracy: true, timeout: 5000 }
          );
        });
      }

      const now = new Date();
      const localDate = now.toISOString().split('T')[0];
      const localTime = now.toTimeString().slice(0, 5);

      const res = await fetch('/api/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user._id,
          action: 'punchOut',
          location,
          localDate,
          localTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('worktracker_user');
        void fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
          window.location.assign('/login');
        });
      } else {
        alert(data.error || 'Failed to punch out');
      }
    } catch (err: any) {
      alert(err.message || 'Error punching out');
    } finally {
      setIsPunchingOut(false);
    }
  };





  // Handle Work Entry Submit
  const handleAddWork = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmpId = user.userType === 'employee' ? user._id : workEmpId;
    if (!workProjId || !finalEmpId || !workTitle.trim() || !workDate || !workStart || !workEnd) return;

    try {
      setSubmittingWork(true);
      const res = await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: workProjId,
          employeeId: finalEmpId,
          title: workTitle,
          date: workDate,
          startTime: workStart,
          endTime: workEnd,
          description: workDesc
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to log task');

      setWorkTitle('');
      setWorkDesc('');
      setIsWorkModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingWork(false);
    }
  };




  // Filter timeline logs
  const timelineEntries = entries.filter(e => e.date === selectedTimelineDate);

  const calculateTimelinePosition = (start: string, end: string) => {
    const parseTimeToMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const timelineStartMins = 8 * 60; // 08:00
    const timelineEndMins = 18 * 60;  // 18:00
    const totalMins = timelineEndMins - timelineStartMins;

    const startMins = Math.max(timelineStartMins, parseTimeToMins(start));
    const endMins = Math.min(timelineEndMins, parseTimeToMins(end));

    const leftPct = ((startMins - timelineStartMins) / totalMins) * 100;
    const widthPct = ((endMins - startMins) / totalMins) * 100;

    return {
      left: `${Math.max(0, Math.min(100, leftPct))}%`,
      width: `${Math.max(2, Math.min(100, widthPct))}%`
    };
  };

  const getTimelineColor = (projColor: string) => {
    if (projColor === '#10b981') return 'green';
    if (projColor === '#f59e0b') return 'orange';
    if (projColor === '#7f56d9') return 'purple';
    return 'blue';
  };

  // Aggregation for Stacked Bar Chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.getDate();
  }).reverse();

  const dailyWorkTimes = last7Days.map((dayNum) => {
    const dayEntries = entries.filter((entry) => {
      const entryDay = new Date(entry.date).getDate();
      return entryDay === dayNum;
    });

    let totalMins = dayEntries.reduce((sum, e) => sum + e.actualTime, 0);
    let workHours = parseFloat((totalMins / 60).toFixed(1));
    let overtimeHours = 0;

    if (workHours > 8) {
      overtimeHours = parseFloat((workHours - 8).toFixed(1));
      workHours = 8;
    }

    return {
      day: dayNum,
      workHours,
      overtimeHours
    };
  });

  const totalChartHours = dailyWorkTimes.reduce((sum, d) => sum + d.workHours + d.overtimeHours, 0).toFixed(1);

  const handleOpenMailModal = async () => {
    if (!user) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [tasksRes, worksRes] = await Promise.all([
        fetch(`/api/tasks?employeeId=${user._id}`),
        fetch(`/api/task-work?employeeId=${user._id}&limit=100`),
      ]);

      const tasksData = await tasksRes.json();
      const worksData = await worksRes.json();

      const taskMap = new Map<string, any>((tasksData.data || []).map((task: any) => [task._id, task]));
      const completedEntries = (worksData.data || []).filter((entry: any) => entry.status === 'Completed' && (entry.date === todayStr || !entry.date));

      const formatTimeTo12Hour = (time24?: string) => {
        if (!time24) return '';
        const parts = time24.split(':');
        if (parts.length < 2) return time24;
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h}:${m} ${ampm}`;
      };

      const formatDurationText = (minutes?: number) => {
        if (!minutes || minutes <= 0) return 'Under 1 minute';
        const totalHours = minutes / 60;
        if (totalHours < 0.1) return `${minutes} mins`;
        const formatted = totalHours.toFixed(1).replace(/\.0$/, '');
        return `${formatted} hours`;
      };

      let reportText = '';
      if (completedEntries.length > 0) {
        reportText = completedEntries.map((entry: any, index: number) => {
          const task = taskMap.get(entry.taskId?._id || entry.taskId) || entry.taskId;
          const projectName = task?.projectId?.name || task?.Project || 'General';
          const taskTitle = task?.title || 'Untitled task';
          const summary = (entry.notes || task?.description || 'Completed work task details.').replace(/<[^>]*>/g, '').trim();
          const duration = formatDurationText(entry.totalMinutes || 0);

          return `Task ${index + 1}:

- Project: ${projectName}
- Task: ${taskTitle}
- Time: ${formatTimeTo12Hour(entry.startTime)} – ${formatTimeTo12Hour(entry.endTime || entry.startTime)} (${duration})
- Status: Completed
- Summary: ${summary}`;
        }).join('\n\n');
      } else {
        reportText = `Daily Work Summary (${todayStr})\n\nShift punch out report completed.`;
      }

      setMailContent(reportText);
      setIsMailModalOpen(true);
    } catch (err) {
      console.error(err);
      setMailContent(`Daily Work Summary (${new Date().toISOString().split('T')[0]})\n\nShift punch out report completed.`);
      setIsMailModalOpen(true);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(mailContent);
    alert('Task summary copied to clipboard!');
  };

  const meEmployee = user ? (employees.find(e => e._id === user._id) || user) : null;
  const featuredEmployee = employees.length > 0 ? employees[0] : meEmployee;
  const isAdmin = user?.userType === 'admin';

  // Form state
  const [formData, setFormData] = useState({
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({
          ...prev,
          files: [...prev.files, { name: file.name, url: String(reader.result), size: file.size, type: file.type }],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
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
      assignedTo: [],
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
    setEditingTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
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
        Project: user.Project || undefined,
        dueDate: formData.dueDate || undefined,
        dueTime: formData.dueTime || undefined,
        url: formData.urls[0] || formData.url || undefined,
        urls: formData.urls,
        comments: formData.comments || undefined,
        files: formData.files,
        tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()) : [],
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

      alert(editingTask ? 'Task updated successfully!' : 'Task created successfully!');

      setShowModal(false);
      resetForm();
      setTasksKey((prev) => prev + 1);
    } catch (err: any) {
      alert(err.message || String(err));
    }
  };

  const computedStats: DashboardStats = stats || {
    employees: {
      total: employees.length,
      active: employees.filter((e) => e.status !== 'Inactive').length,
      inactive: employees.filter((e) => e.status === 'Inactive').length,
      present: employees.filter((e: any) => !!e.todayAttendance?.checkIn).length,
      absent: Math.max(0, employees.length - employees.filter((e: any) => !!e.todayAttendance?.checkIn).length),
      checkedIn: employees.filter((e: any) => e.todayAttendance?.checkIn && !e.todayAttendance?.checkOut).length,
      checkedOut: employees.filter((e: any) => !!e.todayAttendance?.checkOut).length,
      workingNow: employees.filter((e: any) => e.todayAttendance?.isWorking).length,
      attendanceRate: employees.length > 0 ? Math.round((employees.filter((e: any) => !!e.todayAttendance?.checkIn).length / employees.length) * 100) : 0,
    },
    tasks: {
      total: 0,
      active: 0,
      inProgress: 0,
      todo: 0,
      review: 0,
      completed: 0,
    },
    projects: {
      total: projects.length,
      active: projects.filter((p) => p.entryCount > 0 || (p.members && p.members.length > 0)).length,
      inactive: Math.max(0, projects.length - projects.filter((p) => p.entryCount > 0 || (p.members && p.members.length > 0)).length),
      totalMinutes: projects.reduce((acc, p) => acc + (p.totalMinutes || 0), 0),
    },
    productivity: {
      todayMinutes: entries.reduce((acc, e) => acc + (e.actualTime || 0), 0),
      totalMinutes: projects.reduce((acc, p) => acc + (p.totalMinutes || 0), 0),
      attendanceRate: employees.length > 0 ? Math.round((employees.filter((e: any) => !!e.todayAttendance?.checkIn).length / employees.length) * 100) : 0,
    },
  };

  const empPresentPct = computedStats.employees.total > 0
    ? Math.round((computedStats.employees.present / computedStats.employees.total) * 100)
    : 0;

  const taskCompletionPct = computedStats.tasks.total > 0
    ? Math.round((computedStats.tasks.completed / computedStats.tasks.total) * 100)
    : 0;

  const projActivePct = computedStats.projects.total > 0
    ? Math.round((computedStats.projects.active / computedStats.projects.total) * 100)
    : 0;

  if (loading && projects.length === 0 && !error) {
    return <PageShimmer variant="dashboard" />;
  }
  return (
    <div>
      {/* Dashboard Page Header */}
      <div style={{ marginBottom: '18px' }} className="no-print">
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Dashboard Overview</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
          {isAdmin
            ? 'Manage your organization Projects, monitor employee schedule, and track tasks.'
            : 'Log your work sessions, view assigned Projects, and manage your schedules.'}
        </p>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p style={{ fontWeight: 650 }}>{error}</p>
        </div>
      )}

      {/* Statistics Cards Overview */}
      <div className="dashboard-kpi-grid">
        {/* Card 1: Employees Statistics */}
        <Link href={isAdmin ? "/employees" : "/attendance"} className="dashboard-kpi-card" title="View Employees & Attendance">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Employees</span>
            <div className="kpi-icon-badge" style={{ background: '#eff6ff', color: 'var(--accent-primary)' }}>
              <Users size={18} />
            </div>
          </div>
          <div>
            <div className="kpi-metric-row">
              <span className="kpi-metric-value">{computedStats.employees.total}</span>
              <span className="kpi-metric-secondary">
                {computedStats.employees.present} Present Today
              </span>
            </div>
            <div className="kpi-progress-track" style={{ marginTop: '8px' }}>
              <div
                className="kpi-progress-bar"
                style={{ width: `${empPresentPct}%`, background: '#10b981' }}
                title={`${empPresentPct}% Present today`}
              />
            </div>
          </div>
          <div className="kpi-tags-row">
            <span className="kpi-pill success">
              <span className="kpi-pill-dot" /> {computedStats.employees.present} Present
            </span>
            <span className="kpi-pill danger">
              <span className="kpi-pill-dot" /> {computedStats.employees.absent} Absent
            </span>
            <span className="kpi-pill primary">
              <span className="kpi-pill-dot" /> {computedStats.employees.active} Active
            </span>
            {computedStats.employees.inactive > 0 && (
              <span className="kpi-pill neutral">
                <span className="kpi-pill-dot" /> {computedStats.employees.inactive} Inactive
              </span>
            )}
            {computedStats.employees.workingNow > 0 && (
              <span className="kpi-pill warning">
                <span className="kpi-pill-dot" /> {computedStats.employees.workingNow} Working
              </span>
            )}
          </div>
        </Link>

        {/* Card 2: Tasks Statistics */}
        <Link href="/tasks" className="dashboard-kpi-card" title="View Tasks">
          <div className="kpi-card-header">
            <span className="kpi-card-title">{isAdmin ? 'Total Tasks' : 'My Tasks'}</span>
            <div className="kpi-icon-badge" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <CheckSquare size={18} />
            </div>
          </div>
          <div>
            <div className="kpi-metric-row">
              <span className="kpi-metric-value">{computedStats.tasks.total}</span>
              <span className="kpi-metric-secondary">
                {computedStats.tasks.active} Active
              </span>
            </div>
            <div className="kpi-progress-track" style={{ marginTop: '8px' }}>
              <div
                className="kpi-progress-bar"
                style={{ width: `${taskCompletionPct}%`, background: '#10b981' }}
                title={`${taskCompletionPct}% Completed`}
              />
            </div>
          </div>
          <div className="kpi-tags-row">
            <span className="kpi-pill primary">
              <span className="kpi-pill-dot" /> {computedStats.tasks.active} Active
            </span>
            <span className="kpi-pill warning">
              <span className="kpi-pill-dot" /> {computedStats.tasks.inProgress} In Progress
            </span>
            <span className="kpi-pill neutral">
              <span className="kpi-pill-dot" /> {computedStats.tasks.todo} To Do
            </span>
            <span className="kpi-pill success">
              <span className="kpi-pill-dot" /> {computedStats.tasks.completed} Done
            </span>
          </div>
        </Link>

        {/* Card 3: Projects Statistics */}
        <Link href="/project" className="dashboard-kpi-card" title="View Projects">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Projects</span>
            <div className="kpi-icon-badge" style={{ background: '#faf5ff', color: '#8b5cf6' }}>
              <Folder size={18} />
            </div>
          </div>
          <div>
            <div className="kpi-metric-row">
              <span className="kpi-metric-value">{computedStats.projects.total}</span>
              <span className="kpi-metric-secondary">
                {computedStats.projects.active} Active
              </span>
            </div>
            <div className="kpi-progress-track" style={{ marginTop: '8px' }}>
              <div
                className="kpi-progress-bar"
                style={{ width: `${projActivePct}%`, background: '#8b5cf6' }}
                title={`${projActivePct}% Active Projects`}
              />
            </div>
          </div>
          <div className="kpi-tags-row">
            <span className="kpi-pill purple">
              <span className="kpi-pill-dot" /> {computedStats.projects.active} Active
            </span>
            <span className="kpi-pill neutral">
              <span className="kpi-pill-dot" /> {computedStats.projects.inactive} Inactive
            </span>
            {computedStats.projects.totalMinutes > 0 && (
              <span className="kpi-pill primary">
                <span className="kpi-pill-dot" /> {formatMinutesToDuration(computedStats.projects.totalMinutes)}
              </span>
            )}
          </div>
        </Link>

        {/* Card 4: Attendance & Time Tracked */}
        <Link href={isAdmin ? "/attendance" : "/punch"} className="dashboard-kpi-card" title="View Attendance & Punch Status">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Presence & Time</span>
            <div className="kpi-icon-badge" style={{ background: '#fffbeb', color: '#f59e0b' }}>
              <Activity size={18} />
            </div>
          </div>
          <div>
            <div className="kpi-metric-row">
              <span className="kpi-metric-value">{computedStats.productivity.attendanceRate}%</span>
              <span className="kpi-metric-secondary">
                Rate Today
              </span>
            </div>
            <div className="kpi-progress-track" style={{ marginTop: '8px' }}>
              <div
                className="kpi-progress-bar"
                style={{ width: `${computedStats.productivity.attendanceRate}%`, background: '#f59e0b' }}
                title={`${computedStats.productivity.attendanceRate}% Attendance Rate`}
              />
            </div>
          </div>
          <div className="kpi-tags-row">
            <span className="kpi-pill success">
              <span className="kpi-pill-dot" /> {computedStats.employees.checkedIn} Punched In
            </span>
            <span className="kpi-pill primary">
              <span className="kpi-pill-dot" /> {formatMinutesToDuration(computedStats.productivity.todayMinutes)} Today
            </span>
            {computedStats.employees.checkedOut > 0 && (
              <span className="kpi-pill neutral">
                <span className="kpi-pill-dot" /> {computedStats.employees.checkedOut} Punched Out
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Main Grid Layout */}
      <div className="dashboard-grid">

        {/* ROW 2: LEFT COLUMN: Team Punch & Permission Monitor (Admin Only) */}
        {isAdmin && (() => {
          const TEAM_ITEMS_PER_PAGE = 3;
          const activeCount = employees.filter((e: any) => e.todayAttendance?.checkIn && !e.todayAttendance?.checkOut).length;
          const inactiveCount = employees.length - activeCount;
          const paginatedTeam = employees.slice((teamPage - 1) * TEAM_ITEMS_PER_PAGE, teamPage * TEAM_ITEMS_PER_PAGE);
          const totalTeamPages = Math.ceil(employees.length / TEAM_ITEMS_PER_PAGE);

          return (
            <div className="col-5">
              <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
                      Team Punch & Permissions
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Live presence & 1-day punch override</span>
                  </div>
                  <span className="tag-badge" style={{ fontSize: '0.68rem', padding: '2px 8px', fontWeight: 700, backgroundColor: 'rgba(127, 86, 217, 0.08)', color: 'var(--accent-primary)', border: '1px solid rgba(127, 86, 217, 0.15)' }}>
                    Active: {activeCount} • Inactive: {inactiveCount}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, paddingRight: '2px' }}>
                  {paginatedTeam.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontSize: '0.8rem' }}>No employees found.</p>
                  ) : (
                    paginatedTeam.map((emp: any) => {
                      const att = emp.todayAttendance;
                      const hasCheckIn = !!att?.checkIn;
                      const hasCheckOut = !!att?.checkOut;
                      const isWorkingNow = !!att?.isWorking;

                      return (
                        <div key={emp._id} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* Member Info & Live Status Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div
                              onClick={() => router.push(`/employees?select=${emp._id}`)}
                              style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}
                              title="Click to view details & manage punch permissions"
                            >
                              <div className="avatar" style={{ backgroundColor: emp.avatarColor, width: '30px', height: '30px', fontSize: '0.72rem', fontWeight: 700 }}>
                                {emp.name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>{emp.name}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{emp.role}</div>
                              </div>
                            </div>

                            {/* Status pill */}
                            {hasCheckOut ? (
                              <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>
                                Checked Out
                              </span>
                            ) : hasCheckIn ? (
                              isWorkingNow ? (
                                <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                                  Working
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                                  Idle
                                </span>
                              )
                            ) : (
                              <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '10px', background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                                Not Punched
                              </span>
                            )}
                          </div>

                          {/* Time details */}
                          <div style={{ fontSize: '0.68rem', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>In: <b>{att?.checkIn || '—'}</b></span>
                            <span>Out: <b>{att?.checkOut || '—'}</b></span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Team Pagination controls */}
                {totalTeamPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setTeamPage((p) => Math.max(1, p - 1))}
                      disabled={teamPage === 1}
                      style={{ padding: '3px 8px', fontSize: '0.7rem', opacity: teamPage === 1 ? 0.5 : 1 }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Page {teamPage} of {totalTeamPages}
                    </span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setTeamPage((p) => Math.min(totalTeamPages, p + 1))}
                      disabled={teamPage === totalTeamPages}
                      style={{ padding: '3px 8px', fontSize: '0.7rem', opacity: teamPage === totalTeamPages ? 0.5 : 1 }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Employee Tasks Section */}
        {!isAdmin && user && (
          <div className="col-12" style={{ marginBottom: '20px' }}>
            <MyTasks userId={user._id} key={tasksKey} />
          </div>
        )}

        {/* ROW 2: RIGHT COLUMN: Timeline scheduler */}
        <div className={isAdmin ? "col-7" : "col-12"}>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-header">
              <h3 className="card-title">Today Schedule</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={selectedTimelineDate}
                  onChange={(e) => setSelectedTimelineDate(e.target.value)}
                  style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 6px', fontSize: '0.75rem', fontWeight: 650 }}
                />
                {/* <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (projects.length === 0) return;
                  setWorkDate(selectedTimelineDate);
                  setIsWorkModalOpen(true);
                }}>
                  Add Task
                </button> */}
              </div>
            </div>

            <div className="timeline-scheduler">
              <div className="timeline-hours-header">
                <span>08.00</span>
                <span>09.00</span>
                <span style={{ color: '#4f46e5', fontWeight: 800 }}>09.35</span>
                <span>11.00</span>
                <span>13.00</span>
                <span>15.00</span>
                <span>17.00</span>
                <span>18.00</span>
              </div>

              <div className="timeline-grid">
                {timelineEntries.slice(0, 3).map((entry, index) => {
                  const pos = calculateTimelinePosition(entry.startTime, entry.endTime);
                  const colorClass = getTimelineColor(entry.projectColor);
                  const topOffset = 15 + index * 40;

                  return (
                    <div
                      key={entry._id}
                      className={`timeline-block ${colorClass}`}
                      style={{
                        left: pos.left,
                        width: pos.width,
                        top: `${topOffset}px`
                      }}
                      title={`${entry.employeeName}: ${entry.title} (${entry.startTime} - ${entry.endTime})`}
                    >
                      {entry.title}
                    </div>
                  );
                })}

                {timelineEntries.length === 0 && (
                  <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    No work sessions logged for this day.
                  </div>
                )}

                <div className="timeline-now-line" style={{ left: '16.5%' }} />
                <div className="timeline-now-bubble" style={{ left: '16.5%' }}>09.35</div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: TABLES AND CHARTS */}
        <div className={isAdmin ? "col-7" : "col-8"}>
          {isAdmin ? (
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header">
                <h3 className="card-title">Employee Registry</h3>
                <Link href="/employees" className="btn btn-secondary btn-sm">See Details</Link>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Project</th>
                    <th>Job Title</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.slice(0, 4).map((emp) => (
                    <tr key={emp._id}>
                      <td>
                        <div className="avatar-wrapper">
                          <div className="avatar" style={{ backgroundColor: emp.avatarColor, width: '28px', height: '28px', fontSize: '0.7rem' }}>
                            {emp.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{emp.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="tag-badge" style={{ borderColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-primary)', background: '#eff6ff' }}>
                          {emp.Project}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{emp.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="card-title">My Tracked Logs</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recent work sessions</span>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                  onClick={handleOpenMailModal}
                >
                  Generate Daily Mail
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Work Performed</th>
                      <th>Time</th>
                      <th style={{ textAlign: 'right' }}>Tracked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, 5).map((entry) => (
                      <tr key={entry._id}>
                        <td>{entry.date}</td>
                        <td>
                          <span className="tag-badge" style={{ backgroundColor: `${entry.projectColor}15`, color: entry.projectColor, borderColor: `${entry.projectColor}30` }}>
                            {entry.projectName}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{entry.title}</div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {entry.startTime} - {entry.endTime}
                        </td>
                        <td style={{ fontWeight: 750, color: 'var(--accent-primary)', textAlign: 'right' }}>
                          {formatMinutesToDuration(entry.actualTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right side Featured Employee / Member chart */}
        <div className={isAdmin ? "col-5" : "col-4"} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Profile Card */}
          {(meEmployee || featuredEmployee) && (
            <div className="card">
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                {isAdmin ? 'Featured Member' : 'My Work Profile'}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '4px' }}>
                {(isAdmin ? (featuredEmployee?.role || meEmployee?.role) : meEmployee?.role) || 'Team Member'}
              </h3>

              <div className="employee-badge-container" style={{ marginBottom: '12px' }}>
                {((isAdmin ? (featuredEmployee?.Project || meEmployee?.Project) : meEmployee?.Project)) && (
                  <span className="tag-badge" style={{ backgroundColor: '#eff6ff', color: 'var(--accent-primary)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                    {isAdmin ? (featuredEmployee?.Project || meEmployee?.Project) : meEmployee?.Project}
                  </span>
                )}
                <span className="tag-badge">Full Time</span>
                <span className="tag-badge">Active</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <div className="avatar" style={{ backgroundColor: (isAdmin ? (featuredEmployee?.avatarColor || meEmployee?.avatarColor) : meEmployee?.avatarColor) || '#3b82f6', width: '32px', height: '32px', fontSize: '0.85rem' }}>
                  {isAdmin
                    ? (featuredEmployee?.name?.split(' ').map((n: string) => n[0]).join('') || meEmployee?.name?.split(' ').map((n: string) => n[0]).join('') || 'U')
                    : (meEmployee?.name?.split(' ').map((n: string) => n[0]).join('') || 'U')}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 750, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isAdmin ? (featuredEmployee?.name || meEmployee?.name || user?.name || 'User') : (meEmployee?.name || user?.name || 'User')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span>{isAdmin ? (featuredEmployee?.email || meEmployee?.email || user?.email || '') : (meEmployee?.email || user?.email || '')}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>TRACKED</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                    {formatMinutesToDuration(isAdmin ? (featuredEmployee?.totalMinutes || 0) : (meEmployee?.totalMinutes || 0))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Member Work Hours chart (Admin Only) */}
          {isAdmin && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title" style={{ fontSize: '0.9rem' }}>Member Work Hours</h3>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
                    {totalChartHours} hrs total
                  </span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} /> Work
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fecdd3' }} /> OT
                  </span>
                </div>
              </div>

              <div className="stacked-chart-container">
                <div className="chart-grid-line" style={{ bottom: '50px' }} />
                <div className="chart-grid-line" style={{ bottom: '90px' }} />
                <div className="chart-grid-line" style={{ bottom: '130px' }} />

                {dailyWorkTimes.map((data, index) => {
                  const maxVal = 12;
                  const workHeight = Math.min(130, (data.workHours / maxVal) * 130);
                  const otHeight = Math.min(130 - workHeight, (data.overtimeHours / maxVal) * 130);

                  return (
                    <div key={index} className="chart-column">
                      <div className="chart-bar-stack" style={{ height: `${workHeight + otHeight}px`, width: '12px' }}>
                        {data.overtimeHours > 0 && (
                          <div className="chart-bar-pink" style={{ height: `${(otHeight / (workHeight + otHeight)) * 100}%` }} title={`Overtime: ${data.overtimeHours} hrs`} />
                        )}
                        <div className="chart-bar-blue" style={{ height: `${(workHeight / (workHeight + otHeight)) * 100}%` }} title={`Work Time: ${data.workHours} hrs`} />
                      </div>
                      <span className="chart-column-label">{data.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: ADD EMPLOYEE (Admin Only) */}
      <AddTeamMemberModal
        isOpen={isAdmin && isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        projectsList={projects}
        onSuccess={async (newEmp) => {
          await fetchData();
          if (newEmp?._id) {
            setFormData((prev) => ({
              ...prev,
              assignedTo: prev.assignedTo.includes(newEmp._id)
                ? prev.assignedTo
                : [...prev.assignedTo, newEmp._id],
            }));
          }
        }}
      />

      {/* MODAL: NEW Project */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        clientsList={clientsList}
        employeesList={employees}
        onSuccess={async (newProj) => {
          await fetchData();
          if (newProj?._id) {
            const memberIds = Array.isArray(newProj.members)
              ? newProj.members.map((m: any) => (typeof m === 'string' ? m : m._id || m.id)).filter(Boolean)
              : [];
            setFormData((prev) => ({
              ...prev,
              projectId: String(newProj._id),
              Project: '',
              assignedTo: Array.from(new Set([...prev.assignedTo, ...memberIds])),
            }));
          }
        }}
      />

      {/* MODAL: LOG WORK */}
      {isWorkModalOpen && (
        <div className="modal-overlay" onClick={() => setIsWorkModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Log Time Entry</h3>
              <button className="modal-close" onClick={() => setIsWorkModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddWork}>
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
                  placeholder="e.g. Coded sidebar layouts"
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
                  placeholder="Details, progress, blockers..."
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsWorkModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingWork}>
                  {submittingWork ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: DAILY MAIL SUMMARY */}
      {isMailModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMailModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Daily Email Summary</h3>
              <button className="modal-close" onClick={() => setIsMailModalOpen(false)}>&times;</button>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Here is your formatted task summary for today ({selectedTimelineDate}). Click Copy to save it to your clipboard.
              </p>
            </div>
            <div className="form-group">
              <textarea
                className="form-control"
                readOnly
                style={{ minHeight: '220px', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.4', background: 'var(--bg-tertiary)' }}
                value={mailContent}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsMailModalOpen(false)} disabled={isPunchingOut}>Close</button>
              <button type="button" className="btn btn-secondary" onClick={handleCopyToClipboard}>Copy to Clipboard</button>
              {!isAdmin && isPunchedIn && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmPunchOut}
                  disabled={isPunchingOut}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isPunchingOut ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Punching Out...</span>
                    </>
                  ) : (
                    <>
                      <Clock size={14} />
                      <span>Confirm Punch Out</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
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
              maxWidth: '850px',
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
              {isAdmin && (
                <>
                  {/* Row 1: Choose Project & Priority */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <CustomDropdown
                      label="Choose Project"
                      placeholder="Choose Project"
                      value={formData.projectId}
                      options={[
                        { value: '', label: 'Choose Project' },
                        ...projects.map((p) => ({
                          value: p._id,
                          label: p.name,
                          color: p.color || '#3b82f6',
                        })),
                      ]}
                      onChange={(val) => setFormData({ ...formData, projectId: val })}
                      actionButton={{
                        label: 'add project',
                        onClick: () => setIsProjectModalOpen(true),
                      }}
                    />

                    <CustomDropdown
                      label="Priority"
                      placeholder="Select Priority"
                      value={formData.priority}
                      options={[
                        { value: 'Low', label: 'Low', color: '#3b82f6', badgeText: 'Low', badgeBg: '#eff6ff', badgeColor: '#1d4ed8' },
                        { value: 'Medium', label: 'Medium', color: '#f59e0b', badgeText: 'Medium', badgeBg: '#fffbeb', badgeColor: '#b45309' },
                        { value: 'High', label: 'High', color: '#f97316', badgeText: 'High', badgeBg: '#fff7ed', badgeColor: '#c2410c' },
                        { value: 'Urgent', label: 'Urgent', color: '#ef4444', badgeText: 'Urgent', badgeBg: '#fef2f2', badgeColor: '#b91c1c' },
                      ]}
                      onChange={(val) => setFormData({ ...formData, priority: val as any })}
                    />
                  </div>

                  {/* Row 2: Status, Due Date, Time */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <CustomDropdown
                      label="Status"
                      placeholder="Select Status"
                      value={formData.status}
                      options={[
                        { value: 'To Do', label: 'To Do', badgeText: 'To Do', badgeBg: '#f1f5f9', badgeColor: '#475569' },
                        { value: 'In Progress', label: 'In Progress', badgeText: 'In Progress', badgeBg: '#eff6ff', badgeColor: '#1d4ed8' },
                        { value: 'Review', label: 'Review', badgeText: 'Review', badgeBg: '#faf5ff', badgeColor: '#7e22ce' },
                        { value: 'Completed', label: 'Completed', badgeText: 'Completed', badgeBg: '#ecfdf5', badgeColor: '#047857' },
                      ]}
                      onChange={(val) => setFormData({ ...formData, status: val as any })}
                    />

                    <CustomDatePicker
                      label="Due Date"
                      value={formData.dueDate}
                      onChange={(val) => setFormData({ ...formData, dueDate: val })}
                      placeholder="Pick date"
                    />

                    <CustomTimePicker
                      label="Due Time"
                      value={formData.dueTime}
                      onChange={(val) => setFormData({ ...formData, dueTime: val })}
                      placeholder="Pick time"
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
                        title="Create and add new team member"
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
                            <span style={{ fontWeight: isChecked ? 700 : 400 }}>{emp.name} ({emp.Project || emp.role})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Task Title */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Task Title *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Design user registration flow"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Task Description */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Task Description</label>
                <CKEditorComponent
                  value={formData.description}
                  onChange={(val: string) => setFormData({ ...formData, description: val })}
                />
              </div>

              {/* Row: Supporting Files & URL / Resource Links */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>
                <CustomFileAttachment
                  label="Supporting Files"
                  files={formData.files}
                  onUpload={handleFileUpload}
                  onRemove={handleRemoveFile}
                />

                <CustomMultipleLinks
                  label="URL / Resource Links"
                  links={formData.urls}
                  onChange={(newLinks) => setFormData({ ...formData, urls: newLinks, url: newLinks[0] || '' })}
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
                        value={formData.comments}
                        onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
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
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="e.g., frontend, urgent, bug"
                    />
                  </div>
                </div>
              )}

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
