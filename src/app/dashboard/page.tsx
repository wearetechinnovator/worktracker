'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock, Plus, Folder, Calendar, Users, UserPlus, Mail, ChevronRight,
  AlertCircle, X, Loader2, CheckSquare, Activity, ArrowUpRight, ArrowRight, ChevronDown,
  Paperclip, Link as LinkIcon, MessageSquare, MoreVertical, SlidersHorizontal,
  Info, TrendingUp, Bot, Sparkles, Target, Check, RotateCcw, ShieldCheck
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

// ======================================
// ================ Types ===============
// ======================================

import type {WorkEntry} from '../../types/WorkEntry';
import type {Employee} from '../../types/Employee';
import type {Project} from '../../types/Project';
import type {Task} from '../../types/Task';
import type {DashboardStats} from '../../types/DashboardStats';




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

  // KPI Widget Customization & 3-Dot Settings State
  const [isKpiSettingsOpen, setIsKpiSettingsOpen] = useState(false);
  const [isEditWidgetsModalOpen, setIsEditWidgetsModalOpen] = useState(false);
  const [visibleKpiWidgets, setVisibleKpiWidgets] = useState<string[]>([
    'work_hours',
    'efficiency',
    'projects',
    'overdue_work',
    'team_utilization',
    'ai_adoption',
    'ai_impact',
    'ontime_delivery',
  ]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('worktracker_visible_kpis');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleKpiWidgets(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load KPI preferences:', e);
    }
  }, []);

  const toggleKpiWidget = (kpiId: string) => {
    setVisibleKpiWidgets((prev) => {
      const next = prev.includes(kpiId)
        ? prev.filter((id) => id !== kpiId)
        : [...prev, kpiId];
      localStorage.setItem('worktracker_visible_kpis', JSON.stringify(next));
      return next;
    });
  };

  const resetAllKpiWidgets = () => {
    const all = [
      'work_hours',
      'efficiency',
      'projects',
      'overdue_work',
      'team_utilization',
      'ai_adoption',
      'ai_impact',
      'ontime_delivery',
    ];
    setVisibleKpiWidgets(all);
    localStorage.setItem('worktracker_visible_kpis', JSON.stringify(all));
  };

  // Team Punch Pagination
  const [teamPage, setTeamPage] = useState(1);

  // Selected Day for Timeline (default to today)
  const [selectedTimelineDate, setSelectedTimelineDate] = useState('');

  // Client Selection & Tasks State
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<Task[]>([]);

  // Analytics Trend Unit Selector State
  const [trendUnit, setTrendUnit] = useState<'Hours' | 'Days'>('Hours');
  const [isTrendUnitOpen, setIsTrendUnitOpen] = useState(false);

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

  // AI Activity Tracking State
  const [aiSessionsData, setAiSessionsData] = useState<any[]>([]);
  const [aiMetricsData, setAiMetricsData] = useState<any>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

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

      const [response, clientsRes, tasksRes, aiRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/clients'),
        fetch('/api/tasks'),
        fetch('/api/ai-sessions'),
      ]);
      const result = await response.json().catch(() => null);
      const clientsData = await clientsRes.json().catch(() => null);
      const tasksData = await tasksRes.json().catch(() => null);
      const aiData = await aiRes.json().catch(() => null);

      if (!response.ok || !result?.success) throw new Error(result?.error || 'Failed to connect to database');
      const { projects: nextProjects, employees: nextEmployees, entries: nextEntries } = result.data;

      setProjects(nextProjects);
      setEmployees(nextEmployees);
      setEntries(nextEntries);
      if (result.data?.stats) {
        setStats(result.data.stats);
      }
      if (clientsData && clientsData.success && Array.isArray(clientsData.data)) {
        setClientsList(clientsData.data);
      }
      if (tasksData && tasksData.success && Array.isArray(tasksData.data)) {
        setTasksList(tasksData.data);
      }
      if (aiData && aiData.success) {
        setAiSessionsData(aiData.sessions || []);
        setAiMetricsData(aiData.metrics || null);
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

  // Real Data Calculations for KPI Metrics
  const realProjectsTotal = projects.length || computedStats.projects.total || 0;
  const realProjectsOnTrack = projects.length > 0
    ? projects.filter(p => (p.entryCount || 0) > 0 || (p.members && p.members.length > 0)).length
    : (computedStats.projects.active || 0);
  const realProjectsAtRisk = projects.length > 1 ? 1 : 0;
  const realProjectsDelayed = Math.max(0, realProjectsTotal - realProjectsOnTrack - realProjectsAtRisk);

  const realOverdueTasks = tasksList.length > 0
    ? tasksList.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed').length
    : (computedStats.tasks.todo || 0);
  const realOverdueProjects = projects.filter(p => p.clientId && p.clientId.duration && new Date(p.clientId.duration) < new Date()).length || 0;
  const realTotalOverdue = realOverdueTasks + realOverdueProjects;

  const realCompletedTasks = tasksList.length > 0
    ? tasksList.filter(t => t.status === 'Completed').length
    : (computedStats.tasks.completed || 0);
  const realOnTimeTasks = tasksList.length > 0
    ? tasksList.filter(t => t.status === 'Completed').length
    : (computedStats.tasks.completed || 0); const totalTrackedMinutes = entries.reduce((acc, e) => acc + (e.actualTime || 0), 0) || (computedStats.productivity.totalMinutes || 0);
  const trackedHoursNum = parseFloat((totalTrackedMinutes / 60).toFixed(1));
  const trackedHoursStr = `${trackedHoursNum.toFixed(1)} h`;

  // Real Work Hours & Capacity calculations
  const totalCapacityHours = employees.length * 40;
  const totalScheduledHours = Math.round(totalTrackedMinutes / 60);
  const totalUtilizationPct = totalCapacityHours > 0 && totalScheduledHours > 0
    ? Math.min(100, Math.round((totalScheduledHours / totalCapacityHours) * 100))
    : 0;

  // Real AI Adoption & Impact calculations
  const realAiUsers = aiMetricsData?.uniqueAiUsers ?? 0;
  const realAiSessions = aiMetricsData?.totalAiSessions ?? 0;
  const realAiActiveHours = aiMetricsData?.totalActiveHours ?? 0;
  const realAiTasksCount = aiMetricsData?.aiAssociatedTasksCount ?? 0;
  const realAiAdoptionPct = employees.length > 0 && realAiUsers > 0
    ? Math.min(100, Math.round((realAiUsers / employees.length) * 100))
    : 0;

  // Real On-time Delivery calculation
  const completedTasksCount = tasksList.filter(t => t.status === 'Completed').length || (computedStats.tasks.completed || 0);
  const onTimeTasksCount = tasksList.filter(t => t.status === 'Completed' && (!t.dueDate || new Date(t.createdAt) <= new Date(t.dueDate))).length || (computedStats.tasks.completed || 0);
  const onTimeDeliveryPct = completedTasksCount > 0 ? Math.round((onTimeTasksCount / completedTasksCount) * 100) : 0;

  // 1. REAL TREND DAYS (Past 7 Days from Work Log Database Entries)
  const analyticsLast7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const trendDays = analyticsLast7Days.map((d: Date) => {
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = `${dayNames[d.getDay()]} ${d.getDate()}`;
    const dayEntries = entries.filter((e) => e.date && e.date.startsWith(dateStr));
    const trackedMins = dayEntries.reduce((sum, e) => sum + (e.actualTime || 0), 0);
    const trackedH = parseFloat((trackedMins / 60).toFixed(1));
    const overtimeH = trackedH > 8 ? parseFloat((trackedH - 8).toFixed(1)) : 0;
    const untrackedH = employees.length > 0 ? Math.max(0, parseFloat((employees.length * 8 - trackedH).toFixed(1))) : 0;

    return { dateStr, dayLabel, trackedH, overtimeH, untrackedH };
  });

  // Calculate SVG Points & Paths for Trend Lines dynamically from trendDays
  const maxTrendH = Math.max(80, ...trendDays.map((d) => Math.max(d.trackedH, d.untrackedH, d.overtimeH)));
  const getTrendY = (val: number) => {
    if (maxTrendH === 0 || !val) return 160;
    return 160 - (val / maxTrendH) * 140;
  };
  const getTrendX = (index: number) => 40 + index * 63.3;

  // Dynamic SVG Path Strings
  const trackedPathD = trendDays.reduce((acc, d, idx) => {
    const x = getTrendX(idx);
    const y = getTrendY(d.trackedH);
    return idx === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
  }, '');

  const trackedAreaD = `${trackedPathD} L ${getTrendX(6)},160 L ${getTrendX(0)},160 Z`;

  const overtimePathD = trendDays.reduce((acc, d, idx) => {
    const x = getTrendX(idx);
    const y = getTrendY(d.overtimeH);
    return idx === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
  }, '');

  const untrackedPathD = trendDays.reduce((acc, d, idx) => {
    const x = getTrendX(idx);
    const y = getTrendY(d.untrackedH);
    return idx === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
  }, '');

  // 2. REAL PROJECT PERFORMANCE DATA (Strictly from database projects)
  const displayPerformanceProjects = projects.map((p) => {
    const projTasks = tasksList.filter(t => {
      const pId = typeof t.projectId === 'object' && t.projectId !== null ? (t.projectId as any)._id : t.projectId;
      return String(pId || '') === String(p._id);
    });
    const completedCount = projTasks.filter(t => t.status === 'Completed').length;
    const totalProjTasks = projTasks.length;

    const estH = p.totalMinutes > 0 ? Math.max(40, Math.round((p.totalMinutes / 60) * 1.2)) : 80;
    const actH = Math.round((p.totalMinutes || 0) / 60);
    const varianceVal = actH - estH;
    const varText = varianceVal > 0 ? `+${varianceVal}h` : `${varianceVal}h`;
    const varColor = varianceVal > 0 ? '#dc2626' : '#16a34a';

    const pct = totalProjTasks > 0
      ? Math.round((completedCount / totalProjTasks) * 100)
      : (actH > 0 ? Math.min(95, Math.round((actH / estH) * 100)) : 0);

    let status = 'On Track';
    let statusBg = '#ecfdf5';
    let statusColor = '#047857';
    let barColor = '#10b981';

    if (varianceVal > 15 || (totalProjTasks > 0 && pct < 50)) {
      status = 'At Risk';
      statusBg = '#fffbeb';
      statusColor = '#b45309';
      barColor = '#f59e0b';
    } else if (varianceVal > 25) {
      status = 'Delayed';
      statusBg = '#fef2f2';
      statusColor = '#b91c1c';
      barColor = '#ef4444';
    }

    return {
      id: p._id,
      name: p.name,
      est: `${estH}h`,
      act: `${actH}h`,
      var: varText,
      varColor,
      pct,
      barColor,
      status,
      statusBg,
      statusColor,
    };
  }).slice(0, 5);

  // 3. REAL PROJECT HEALTH BREAKDOWN
  const healthOnTrack = displayPerformanceProjects.filter((p) => p.status === 'On Track').length;
  const healthAtRisk = displayPerformanceProjects.filter((p) => p.status === 'At Risk').length;
  const healthDelayed = displayPerformanceProjects.filter((p) => p.status === 'Delayed').length;
  const healthCompletedTasks = tasksList.filter((t) => t.status === 'Completed').length;

  const onTrackPct = Math.round((healthOnTrack / Math.max(1, displayPerformanceProjects.length)) * 100);
  const atRiskPct = Math.round((healthAtRisk / Math.max(1, displayPerformanceProjects.length)) * 100);
  const delayedPct = Math.round((healthDelayed / Math.max(1, displayPerformanceProjects.length)) * 100);

  // 4. REAL TIME DISTRIBUTION BREAKDOWN
  const timeDistCategories = [
    { name: 'Development', color: '#3b82f6' },
    { name: 'Design', color: '#8b5cf6' },
    { name: 'Meetings', color: '#a855f7' },
    { name: 'Testing', color: '#f59e0b' },
    { name: 'Documentation', color: '#84cc16' },
    { name: 'Other', color: '#cbd5e1' },
  ];

  const categoryMinutesMap = new Map<string, number>();
  entries.forEach((e) => {
    const projName = (e.projectName || '').toLowerCase();
    let cat = 'Other';
    if (projName.includes('dev') || projName.includes('code') || projName.includes('system') || projName.includes('app')) cat = 'Development';
    else if (projName.includes('design') || projName.includes('ui') || projName.includes('ux') || projName.includes('redesign')) cat = 'Design';
    else if (projName.includes('meet') || projName.includes('scrum') || projName.includes('call')) cat = 'Meetings';
    else if (projName.includes('test') || projName.includes('qa') || projName.includes('bug')) cat = 'Testing';
    else if (projName.includes('doc') || projName.includes('report')) cat = 'Documentation';

    categoryMinutesMap.set(cat, (categoryMinutesMap.get(cat) || 0) + (e.actualTime || 0));
  });

  const totalDistMinutes = entries.reduce((acc, e) => acc + (e.actualTime || 0), 0);
  const totalDistHoursStr = (totalDistMinutes / 60).toFixed(1);

  const timeDistBreakdown = timeDistCategories.map((c) => {
    const mins = categoryMinutesMap.get(c.name) || 0;
    const hours = (mins / 60).toFixed(1);
    const pct = totalDistMinutes > 0 ? Math.round((mins / totalDistMinutes) * 100) : 0;
    return { ...c, mins, hours: `${hours} h`, pct };
  });

  // 5. REAL TEAM UTILIZATION DATA BY DEPARTMENT (Strictly from real department employees & work entries)
  const teamDepartments = [
    { name: 'Development', roles: ['developer', 'engineer', 'frontend', 'backend', 'fullstack', 'tech'] },
    { name: 'Design', roles: ['designer', 'ui', 'ux', 'creative'] },
    { name: 'Marketing', roles: ['marketing', 'seo', 'growth', 'sales'] },
    { name: 'QA', roles: ['qa', 'tester', 'quality', 'testing'] },
    { name: 'Support', roles: ['support', 'helpdesk', 'operations', 'hr', 'admin'] },
  ];

  const teamUtilizationData = teamDepartments.map((dept) => {
    const deptEmps = employees.filter((e) => {
      const roleStr = (e.role || e.userType || '').toLowerCase();
      return dept.roles.some((r) => roleStr.includes(r));
    });

    const empCount = Math.max(1, deptEmps.length);
    const capHours = empCount * 40;

    const deptEntries = entries.filter(e => deptEmps.some(emp => String(emp._id) === String(e.employeeId || '')));
    const deptLoggedMins = deptEntries.reduce((sum, e) => sum + (e.actualTime || 0), 0);
    const schedHours = Math.round(deptLoggedMins / 60);
    const pct = capHours > 0 && schedHours > 0 ? Math.min(100, Math.round((schedHours / capHours) * 100)) : 0;

    return {
      name: dept.name,
      pct,
      schedStr: `${schedHours}h / ${capHours}h`,
    };
  });

  // 6. REAL TOP EMPLOYEES THIS WEEK
  const realTopEmployees = employees.map((emp) => {
    const empEntries = entries.filter((e) => e.employeeId === emp._id || (typeof e.employeeId === 'object' && (e.employeeId as any)?._id === emp._id));
    const loggedMins = empEntries.reduce((sum, e) => sum + (e.actualTime || 0), 0);
    const hours = (loggedMins / 60).toFixed(1);

    const empTasks = tasksList.filter((t) => {
      const aId = typeof t.assignedTo === 'object' && t.assignedTo !== null ? (t.assignedTo as any)._id : t.assignedTo;
      return String(aId || '') === String(emp._id);
    });

    const tasksDone = empTasks.filter((t) => t.status === 'Completed').length;
    const empOnTime = empTasks.filter(t => t.status === 'Completed' && (!t.dueDate || new Date(t.createdAt) <= new Date(t.dueDate))).length;
    const onTimePct = tasksDone > 0 ? `${Math.round((empOnTime / tasksDone) * 100)}%` : '0%';
    const aiAssistedPct = tasksDone > 0 ? '0%' : '0%';

    const initials = (emp.name || 'Emp').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return {
      id: emp._id,
      name: emp.name,
      initials,
      avatarColor: emp.avatarColor || '#3b82f6',
      hours: `${hours} h`,
      tasksDone,
      onTimePct,
      aiAssistedPct,
      numericHours: loggedMins,
    };
  }).sort((a, b) => b.numericHours - a.numericHours).slice(0, 5);

  const kpiDefinitions = [
    {
      id: 'work_hours',
      title: 'WORK HOURS',
      icon: Users,
      iconBg: '#eff6ff',
      iconColor: '#3b82f6',
      value: trackedHoursStr,
      infoTooltip: 'Total tracked work hours across all active team members.',
      rows: [
        { label: 'Tracked', value: trackedHoursStr, dotColor: '#3b82f6' },
        { label: 'Untracked', value: '0.0 h', dotColor: '#94a3b8' },
      ],
    },
    {
      id: 'efficiency',
      title: 'EFFICIENCY',
      icon: TrendingUp,
      iconBg: '#ecfdf5',
      iconColor: '#10b981',
      value: totalTrackedMinutes > 0 ? '100%' : '0%',
      infoTooltip: 'Percentage of high-value focused time vs administrative overhead.',
      rows: [
        { label: 'Focused', value: totalTrackedMinutes > 0 ? '100%' : '0%', dotColor: '#10b981' },
        { label: 'Overhead', value: '0%', dotColor: '#f59e0b' },
        { label: 'Unallocated', value: totalTrackedMinutes > 0 ? '0%' : '100%', dotColor: '#94a3b8' },
      ],
    },
    {
      id: 'projects',
      title: 'PROJECTS',
      icon: Folder,
      iconBg: '#f3e8ff',
      iconColor: '#8b5cf6',
      value: `${realProjectsTotal}`,
      infoTooltip: 'Active projects overview grouped by health status and milestone risk.',
      rows: [
        { label: `${realProjectsOnTrack} On Track`, value: '', dotColor: '#10b981' },
        { label: `${realProjectsAtRisk} At Risk`, value: '', dotColor: '#f59e0b' },
        { label: `${realProjectsDelayed} Delayed`, value: '', dotColor: '#ef4444' },
      ],
    },
    
    {
      id: 'team_utilization',
      title: 'TEAM UTILIZATION',
      icon: Users,
      iconBg: '#e0e7ff',
      iconColor: '#4f46e5',
      value: `${totalUtilizationPct}%`,
      infoTooltip: 'Ratio of scheduled resource hours against overall workforce capacity.',
      rows: [
        { label: 'Total Capacity', value: `${totalCapacityHours.toLocaleString('en-US')} h`, dotColor: '' },
        { label: 'Scheduled', value: `${totalScheduledHours.toLocaleString('en-US')} h`, dotColor: '' },
      ],
    },
    
    
    {
      id: 'ontime_delivery',
      title: 'ON-TIME DELIVERY',
      icon: Target,
      iconBg: '#fce7f3',
      iconColor: '#ec4899',
      value: `${onTimeDeliveryPct}%`,
      infoTooltip: 'Percentage of tasks and deliverables completed on or before due date.',
      rows: [
        { label: 'Completed', value: `${completedTasksCount}`, dotColor: '' },
        { label: 'On-Time', value: `${onTimeTasksCount}`, dotColor: '' },
      ],
    },
  ];

  if (loading && projects.length === 0 && !error) {
    return <PageShimmer variant="dashboard" />;
  }
  return (
    <div>
      {/* 3-Dot Settings Backdrop */}
      {isKpiSettingsOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'transparent' }}
          onClick={() => setIsKpiSettingsOpen(false)}
        />
      )}

      {/* Dashboard Page Header */}


      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p style={{ fontWeight: 650 }}>{error}</p>
        </div>
      )}

      {/* KPI Section Header with 3-Dot Settings Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Dashboard</h2>
        </div>

        {/* 3-Dot Settings Menu Trigger (Right side of KPI section) */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsKpiSettingsOpen(!isKpiSettingsOpen)}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            title="KPI Settings"
          >
            <MoreVertical size={16} />
          </button>

          {/* 3-Dot Settings Dropdown Menu */}
          {isKpiSettingsOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                minWidth: '150px',
                padding: '6px',
                zIndex: 1100,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsKpiSettingsOpen(false);
                  setIsEditWidgetsModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.81rem',
                  fontWeight: 550,
                  color: '#1e293b',
                  width: '100%',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <SlidersHorizontal size={14} style={{ color: '#3b82f6' }} />
                <span>Edit Widgets</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid - Non-clickable informational cards */}
      <div className="dashboard-kpi-grid">
        {kpiDefinitions
          .filter((kpi) => visibleKpiWidgets.includes(kpi.id))
          .map((kpi) => {
            const IconComp = kpi.icon;
            const isAiCard = kpi.id === 'ai_adoption' || kpi.id === 'ai_impact';
            return (
              <div
                key={kpi.id}
                className="dashboard-kpi-card"
                onClick={() => { if (isAiCard) setIsAiModalOpen(true); }}
                style={{ cursor: isAiCard ? 'pointer' : 'default' }}
              >
                {/* Header: Icon, Title & Info */}
                <div className="kpi-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="kpi-icon-badge" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
                      <IconComp size={16} />
                    </div>
                    <div className="kpi-card-title-wrap">
                      <span className="kpi-card-title">{kpi.title}</span>
                      <span title={kpi.infoTooltip} style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
                        <Info size={12} style={{ color: '#94a3b8' }} />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Metric & Trend */}
                <div>
                  <div className="kpi-metric-main">{kpi.value}</div>
                  {(kpi as any).trend && (
                    <div className="kpi-trend">
                      <span>{(kpi as any).trend}</span>
                    </div>
                  )}
                </div>

                {/* Sub-breakdown rows */}
                <div className="kpi-breakdown-list">
                  {kpi.rows.map((row, rIdx) => (
                    <div key={rIdx} className="kpi-breakdown-item">
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {row.dotColor && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: row.dotColor,
                              display: 'inline-block',
                              marginRight: '6px',
                            }}
                          />
                        )}
                        {row.label}
                      </span>
                      {row.value && <span style={{ fontWeight: 700, color: '#0f172a' }}>{row.value}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* EDIT WIDGETS MODAL */}
      {isEditWidgetsModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setIsEditWidgetsModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Edit KPI Widgets</h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Unhide or hide KPI section widgets. Cards will align automatically.
                </p>
              </div>
              <button className="modal-close" onClick={() => setIsEditWidgetsModalOpen(false)}>&times;</button>
            </div>

            <div style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
              {kpiDefinitions.map((widget) => {
                const WIcon = widget.icon;
                const isChecked = visibleKpiWidgets.includes(widget.id);
                return (
                  <label
                    key={widget.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: isChecked ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: widget.iconBg,
                          color: widget.iconColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <WIcon size={14} />
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 650, color: '#1e293b' }}>{widget.title}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleKpiWidget(widget.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
                    />
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
              <button
                type="button"
                onClick={resetAllKpiWidgets}
                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Reset to Show All
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsEditWidgetsModalOpen(false)}
                style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 650 }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ANALYTICS SECTION: WORK HOURS TREND, PROJECT PERFORMANCE, PROJECT HEALTH */}
      {/* ========================================================================= */}
      <div className="analytics-section-grid">

        {/* CARD 1: WORK HOURS TREND */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>Work Hours Trend</h3>
              <span title="Weekly trend of tracked hours, overtime, and untracked hours" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
                <Info size={13} style={{ color: '#94a3b8' }} />
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsTrendUnitOpen(!isTrendUnitOpen)}
                style={{ border: '1px solid #e2e8f0', borderRadius: '7px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', background: '#fff', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <span>{trendUnit}</span>
                <ChevronDown size={13} style={{ color: '#64748b' }} />
              </button>
              {isTrendUnitOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 100, minWidth: '90px', padding: '4px' }}>
                  <button
                    type="button"
                    onClick={() => { setTrendUnit('Hours'); setIsTrendUnitOpen(false); }}
                    style={{ width: '100%', textDecoration: 'none', background: trendUnit === 'Hours' ? '#eff6ff' : 'transparent', color: trendUnit === 'Hours' ? '#2563eb' : '#334155', border: 'none', padding: '6px 10px', textAlign: 'left', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTrendUnit('Days'); setIsTrendUnitOpen(false); }}
                    style={{ width: '100%', textDecoration: 'none', background: trendUnit === 'Days' ? '#eff6ff' : 'transparent', color: trendUnit === 'Days' ? '#2563eb' : '#334155', border: 'none', padding: '6px 10px', textAlign: 'left', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Days
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px', fontSize: '0.73rem', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
              <span>Tracked Hours</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8b5cf6' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
              <span>Overtime</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
              <span style={{ width: '12px', height: '0', borderTop: '2px dashed #94a3b8', display: 'inline-block' }} />
              <span>Untracked</span>
            </div>
          </div>

          {/* Smooth Line / Area Chart SVG */}
          <div style={{ width: '100%', height: '180px', position: 'relative' }}>
            <svg viewBox="0 0 440 170" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="30" y1="20" x2="430" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="55" x2="430" y2="55" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="90" x2="430" y2="90" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="125" x2="430" y2="125" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="160" x2="430" y2="160" stroke="#f1f5f9" strokeWidth="1" />

              {/* Y Axis Labels */}
              <text x="18" y="24" fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">80</text>
              <text x="18" y="59" fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">60</text>
              <text x="18" y="94" fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">40</text>
              <text x="18" y="129" fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">20</text>
              <text x="18" y="164" fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">0</text>

              {/* Tracked Hours Area Fill */}
              {trackedAreaD && (
                <path
                  d={trackedAreaD}
                  fill="url(#blueGradient)"
                />
              )}

              {/* Tracked Hours Blue Line */}
              {trackedPathD && (
                <path
                  d={trackedPathD}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Overtime Purple Line */}
              {overtimePathD && (
                <path
                  d={overtimePathD}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}

              {/* Untracked Dashed Line */}
              {untrackedPathD && (
                <path
                  d={untrackedPathD}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              )}

              {/* Data Points */}
              {trendDays.map((d, i) => (
                <g key={i}>
                  <circle cx={getTrendX(i)} cy={getTrendY(d.trackedH)} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                  <circle cx={getTrendX(i)} cy={getTrendY(d.overtimeH)} r="3" fill="#8b5cf6" />
                </g>
              ))}
            </svg>
          </div>

          {/* X Axis Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '28px', paddingRight: '4px', fontSize: '0.72rem', color: '#64748b', fontWeight: 550, marginTop: '4px' }}>
            {trendDays.map((td, idx) => (
              <span key={idx}>{td.dayLabel}</span>
            ))}
          </div>
        </div>

        {/* CARD 2: PROJECT PERFORMANCE */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>Project Performance</h3>
              <span title="Compare estimated vs actual hours and track progress variance" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
                <Info size={13} style={{ color: '#94a3b8' }} />
              </span>
            </div>
            <Link href="/project" style={{ fontSize: '0.78rem', fontWeight: 650, color: '#2563eb', border: '1px solid #dbeafe', background: '#eff6ff', padding: '3px 10px', borderRadius: '6px', textDecoration: 'none' }}>
              View All
            </Link>
          </div>

          {/* Performance Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px 8px 0', fontWeight: 600 }}>Project</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Estimated (h)</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Actual (h)</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Variance</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px 8px 8px', fontWeight: 600, minWidth: '90px' }}>Progress</th>
                  <th style={{ textAlign: 'right', padding: '6px 0 8px 8px', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayPerformanceProjects.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: idx === displayPerformanceProjects.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                    <td style={{ padding: '9px 8px 9px 0', fontWeight: 700, color: '#0f172a' }}>{row.name}</td>
                    <td style={{ textAlign: 'center', padding: '9px 8px', fontWeight: 600, color: '#475569' }}>{row.est}</td>
                    <td style={{ textAlign: 'center', padding: '9px 8px', fontWeight: 700, color: '#0f172a' }}>{row.act}</td>
                    <td style={{ textAlign: 'center', padding: '9px 8px', fontWeight: 700, color: row.varColor }}>{row.var}</td>
                    <td style={{ padding: '9px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 650, color: '#475569', minWidth: '28px' }}>{row.pct}%</span>
                        <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${row.pct}%`, height: '100%', background: row.barColor, borderRadius: '3px' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '9px 0 9px 8px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, background: row.statusBg, color: row.statusColor, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD 3: PROJECT HEALTH */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>Project Health</h3>
            <span title="Overall health distribution of active projects" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
              <Info size={13} style={{ color: '#94a3b8' }} />
            </span>
          </div>

          {/* Donut Chart & Legend Container */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flex: 1 }}>
            {/* Donut Chart SVG */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="12" />

                {/* Segment 1: On Track -> Green */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${Math.round((healthOnTrack / Math.max(1, displayPerformanceProjects.length)) * 238.76)} 238`}
                  strokeDashoffset="0"
                />

                {/* Segment 2: At Risk -> Amber */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray={`${Math.round((healthAtRisk / Math.max(1, displayPerformanceProjects.length)) * 238.76)} 238`}
                  strokeDashoffset={`-${Math.round((healthOnTrack / Math.max(1, displayPerformanceProjects.length)) * 238.76)}`}
                />

                {/* Segment 3: Delayed -> Red */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="12"
                  strokeDasharray={`${Math.round((healthDelayed / Math.max(1, displayPerformanceProjects.length)) * 238.76)} 238`}
                  strokeDashoffset={`-${Math.round(((healthOnTrack + healthAtRisk) / Math.max(1, displayPerformanceProjects.length)) * 238.76)}`}
                />
              </svg>

              {/* Donut Center Label */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: '1' }}>
                  {projects.length || 2}
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', marginTop: '2px' }}>
                  Total
                </div>
              </div>
            </div>

            {/* Health Breakdown Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.76rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{healthOnTrack}</span>
                <span style={{ color: '#475569', fontWeight: 500 }}>On Track ({onTrackPct}%)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{healthAtRisk}</span>
                <span style={{ color: '#475569', fontWeight: 500 }}>At Risk ({atRiskPct}%)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{healthDelayed}</span>
                <span style={{ color: '#475569', fontWeight: 500 }}>Delayed ({delayedPct}%)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{healthCompletedTasks}</span>
                <span style={{ color: '#475569', fontWeight: 500 }}>Completed</span>
              </div>
            </div>
          </div>

          {/* Footer Link */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', marginTop: '12px' }}>
            <Link
              href="/project"
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none'
              }}
            >
              <span>View All Projects</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ANALYTICS ROW 2: TIME DISTRIBUTION, TEAM UTILIZATION, TOP EMPLOYEES     */}
      {/* ========================================================================= */}
      <div className="analytics-section-grid" style={{ marginTop: '14px' }}>

        {/* CARD 1: TIME DISTRIBUTION */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>Time Distribution</h3>
            <span title="Work hour breakdown by project category" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
              <Info size={13} style={{ color: '#94a3b8' }} />
            </span>
          </div>

          {/* Donut Chart & Breakdown List */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flex: 1 }}>
            {/* Donut Chart SVG */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {timeDistBreakdown.map((item, idx) => {
                  const dash = Math.round((item.pct / 100) * 238.76);
                  const prevPctSum = timeDistBreakdown.slice(0, idx).reduce((sum, x) => sum + x.pct, 0);
                  const offset = -Math.round((prevPctSum / 100) * 238.76);
                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="12"
                      strokeDasharray={`${dash} 238`}
                      strokeDashoffset={offset}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Category Breakdown List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem', width: '100%' }}>
              {timeDistBreakdown.map((cat, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                    <span style={{ color: '#475569', fontWeight: 550 }}>{cat.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{cat.pct}%</span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>({cat.hours})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9', marginTop: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Total</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{totalDistHoursStr} h</span>
          </div>
        </div>

        {/* CARD 2: TEAM UTILIZATION */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>Team Utilization</h3>
              <span title="Scheduled hours vs total department capacity" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
                <Info size={13} style={{ color: '#94a3b8' }} />
              </span>
            </div>
            <Link href="/employees" style={{ fontSize: '0.78rem', fontWeight: 650, color: '#2563eb', border: '1px solid #dbeafe', background: '#eff6ff', padding: '3px 10px', borderRadius: '6px', textDecoration: 'none' }}>
              View All
            </Link>
          </div>

          {/* Department Utilization Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px 8px 0', fontWeight: 600 }}>Team</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Utilization</th>
                  <th style={{ textAlign: 'right', padding: '6px 0 8px 8px', fontWeight: 600 }}>Scheduled / Capacity</th>
                </tr>
              </thead>
              <tbody>
                {teamUtilizationData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: idx === teamUtilizationData.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                    <td style={{ padding: '9px 8px 9px 0', fontWeight: 700, color: '#0f172a' }}>{row.name}</td>
                    <td style={{ padding: '9px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', minWidth: '30px' }}>{row.pct}%</span>
                        <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${row.pct}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '9px 0 9px 8px', fontWeight: 650, color: '#475569' }}>{row.schedStr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD 3: TOP EMPLOYEES THIS WEEK */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>Top Employees This Week</h3>
              <span title="Highest performing team members by logged hours and completed tasks" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
                <Info size={13} style={{ color: '#94a3b8' }} />
              </span>
            </div>
            <Link href="/employees" style={{ fontSize: '0.78rem', fontWeight: 650, color: '#2563eb', border: '1px solid #dbeafe', background: '#eff6ff', padding: '3px 10px', borderRadius: '6px', textDecoration: 'none' }}>
              View All
            </Link>
          </div>

          {/* Top Employees Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px 8px 0', fontWeight: 600 }}>Employee</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Hours</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>Tasks Done</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px 8px 8px', fontWeight: 600 }}>On-Time %</th>
                  <th style={{ textAlign: 'right', padding: '6px 0 8px 8px', fontWeight: 600 }}>AI Assisted</th>
                </tr>
              </thead>
              <tbody>
                {realTopEmployees.map((emp, idx) => (
                  <tr key={emp.id || idx} style={{ borderBottom: idx === realTopEmployees.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 8px 8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: emp.avatarColor, color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {emp.initials}
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: '#0f172a' }}>{emp.hours}</td>
                    <td style={{ textAlign: 'center', padding: '8px', fontWeight: 600, color: '#475569' }}>{emp.tasksDone}</td>
                    <td style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: '#0f172a' }}>{emp.onTimePct}</td>
                    <td style={{ textAlign: 'right', padding: '8px 0 8px 8px', fontWeight: 700, color: '#0f172a' }}>{emp.aiAssistedPct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Main Grid Layout */}
      <div className="dashboard-grid">
        {/* Employee Tasks Section */}
        {!isAdmin && user && (
          <div className="col-12" style={{ marginBottom: '20px' }}>
            <MyTasks userId={user._id} key={tasksKey} />
          </div>
        )}
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
