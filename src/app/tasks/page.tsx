'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import {
  CheckSquare, Plus, AlertCircle, CheckCircle2,
  Calendar, Users, Folder, Filter, X, Edit, Trash2,
  Play, StopCircle, Loader2, Mail, Copy, Clock,
  Paperclip, Link as LinkIcon, MessageSquare,
  FileText, ExternalLink, Activity, UserCheck, Tag, Check, User,
  Eye, Download, Archive, Search, RotateCcw
} from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import AddTeamMemberModal from '@/components/AddTeamMemberModal';
import CreateProjectModal from '@/components/CreateProjectModal';
import CreateTaskModal from '@/components/CreateTaskModal';
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
  assignedTo?: Array<{
    _id: string;
    name: string;
    email: string;
    avatarColor: string;
  }>;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  dueDate?: string;
  dueTime?: string;
  url?: string;
  urls?: string[];
  comments?: string;
  files?: Array<{ name: string; url: string; size?: number; type?: string }>;
  tags?: string[];
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    avatarColor?: string;
  };
  createdAt?: string;
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

  // Task Work Tracking States
  const [taskWorks, setTaskWorks] = useState<any[]>([]);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);
  const [showEndWorkDialog, setShowEndWorkDialog] = useState(false);
  const [frozenEndTime, setFrozenEndTime] = useState<Date | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [pausedDurations, setPausedDurations] = useState<Record<string, number>>({});
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [workNotes, setWorkNotes] = useState('');
  const [workLinks, setWorkLinks] = useState('');
  const [completionStatus, setCompletionStatus] = useState<'partial' | 'full'>('full');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Generated Mail Modal States
  const [showMailModal, setShowMailModal] = useState(false);
  const [mailContent, setMailContent] = useState('');

  // Task Details Modal States
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);
  const [taskWorkSessions, setTaskWorkSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const [copiedUrlIndex, setCopiedUrlIndex] = useState<number | null>(null);
  const [isCopiedAllUrls, setIsCopiedAllUrls] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);

  const handleCopyAllUrls = (urlsList: string[]) => {
    if (!urlsList || urlsList.length === 0) return;
    const formatted = urlsList.map((u) => (u.startsWith('http') ? u : `https://${u}`)).join('\n');
    navigator.clipboard.writeText(formatted);
    setIsCopiedAllUrls(true);
    setTimeout(() => setIsCopiedAllUrls(false), 2000);
  };

  const handleDownloadAllFilesZip = async (files: Array<{ name: string; url: string }>, taskTitle: string) => {
    if (!files || files.length === 0) return;
    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folderName = taskTitle ? taskTitle.replace(/[^a-zA-Z0-9_-]/g, '_') : 'task_files';
      const folder = zip.folder(folderName) || zip;

      await Promise.all(
        files.map(async (file, idx) => {
          try {
            const res = await fetch(file.url);
            const blob = await res.blob();
            const filename = file.name || `file_${idx + 1}`;
            folder.file(filename, blob);
          } catch (err) {
            console.error(`Failed to download file ${file.name}:`, err);
          }
        })
      );

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${folderName}_attachments.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error generating ZIP:', err);
      alert('Failed to generate ZIP package. Please try downloading files individually.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleViewFile = (file: { name: string; url: string; type?: string }) => {
    if (!file || !file.url) return;
    if (file.url.startsWith('data:')) {
      fetch(file.url)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const win = window.open(blobUrl, '_blank');
          if (win) win.focus();
        })
        .catch(() => {
          const win = window.open('', '_blank');
          if (win) {
            win.document.write(
              `<!DOCTYPE html><html><head><title>${file.name}</title><style>body{margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;}img{max-width:100%;max-height:100vh;object-fit:contain;}</style></head><body><img src="${file.url}" alt="${file.name}" /></body></html>`
            );
            win.document.close();
          }
        });
    } else {
      window.open(file.url, '_blank');
    }
  };

  const handleDownloadFile = (file: { name: string; url: string }) => {
    if (!file || !file.url) return;
    if (file.url.startsWith('data:')) {
      fetch(file.url)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = file.name || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        })
        .catch(() => {
          const link = document.createElement('a');
          link.href = file.url;
          link.download = file.name || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    } else {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Comprehensive Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterPriority, filterProject, filterAssignee, filterDateRange]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterProject('');
    setFilterAssignee('');
    setFilterDateRange('');
  };

  const hasActiveFilters = Boolean(
    searchQuery || filterStatus || filterPriority || filterProject || filterAssignee || filterDateRange
  );

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);



  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);



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
      } else {
        promises.push(fetch(`/api/task-work?employeeId=${user._id}&limit=100`));
      }

      const results = await Promise.all(promises);
      const tasksRes = await results[0].json();
      const projectsRes = await results[1].json();

      if (tasksRes.success) setTasks(tasksRes.data);
      if (projectsRes.success) setProjects(projectsRes.data);
      if (isAdmin && results[2]) {
        const empRes = await results[2].json();
        if (empRes.success) setEmployees(empRes.data);
      } else if (!isAdmin && results[2]) {
        const worksRes = await results[2].json();
        if (worksRes.success) setTaskWorks(worksRes.data);
      }
    } catch (err: any) {
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

  // Live timer tick for active tasks (paused when End Work dialog is open)
  useEffect(() => {
    if (showEndWorkDialog) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [showEndWorkDialog]);

  // Geolocation and Time helper functions
  const getLocalDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalTimeValue = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const stripHtml = (html: string) => {
    if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const generateDailyMailReport = async (empId: string, completedWorkItem?: any) => {
    try {
      const today = getLocalDateValue(new Date());
      let completedEntries: any[] = [];

      try {
        const worksRes = await fetch(`/api/task-work?employeeId=${empId}&limit=100`);
        const worksData = await worksRes.json();

        if (worksData.success && Array.isArray(worksData.data)) {
          completedEntries = worksData.data.filter((e: any) => e.status === 'Completed' && (e.date === today || !e.date));
        }
      } catch (e) {
        console.error('Fetch task-work error for mail report:', e);
      }

      if (completedWorkItem && !completedEntries.some(e => String(e._id) === String(completedWorkItem._id))) {
        completedEntries.unshift(completedWorkItem);
      }

      if (completedEntries.length === 0 && completedWorkItem) {
        completedEntries = [completedWorkItem];
      }

      if (completedEntries.length === 0) {
        return;
      }

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
        if (totalHours < 0.1) return `${minutes} min${minutes > 1 ? 's' : ''}`;
        const formatted = totalHours.toFixed(1).replace(/\.0$/, '');
        return `${formatted} hours`;
      };

      const reportText = completedEntries.map((entry: any, index: number) => {
        const taskObj = entry.taskId || {};
        const projectName = taskObj.projectId?.name || taskObj.Project || entry.Project || 'General';
        const taskTitle = typeof taskObj === 'string' ? 'Task Work' : (taskObj.title || 'Task Work');
        const summary = stripHtml(entry.notes || taskObj.description || 'Completed work task details.');
        const duration = formatDurationText(entry.totalMinutes || 0);

        return `Task ${index + 1}:

- Project: ${projectName}
- Task: ${taskTitle}
- Time: ${formatTimeTo12Hour(entry.startTime)} – ${formatTimeTo12Hour(entry.endTime || entry.startTime)} (${duration})
- Status: Completed
- Summary: ${summary}`;
      }).join('\n\n');

      setMailContent(reportText);
      setShowMailModal(true);
    } catch (err) {
      console.error('Error generating daily mail report:', err);
    }
  };

  const handleStartWork = async (taskId: string) => {
    if (!user) return;
    try {
      setProcessingTaskId(taskId);
      setError(null);
      setSuccessMsg(null);

      const localDate = getLocalDateValue(new Date());
      const localTime = getLocalTimeValue(new Date());

      const res = await fetch('/api/task-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, employeeId: user._id, localDate, localTime }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      setSuccessMsg('Work started successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadAllData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handleEndWork = async (workId: string) => {
    try {
      setProcessingTaskId(workId);
      setError(null);
      setSuccessMsg(null);

      const hasNotes = workNotes.trim() !== '';
      const hasLinks = stripHtml(workLinks) !== '';
      const notes = hasNotes || hasLinks
        ? `${workNotes}${hasNotes && hasLinks ? '\n\n' : ''}${workLinks}`
        : undefined;

      const now = frozenEndTime || new Date();
      const priorPausedMs = (selectedWorkId && pausedDurations[selectedWorkId]) || 0;
      const effectiveEndTime = new Date(now.getTime() - priorPausedMs);
      const localTime = getLocalTimeValue(effectiveEndTime);

      const res = await fetch(`/api/task-work/${workId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, localTime, isFullyCompleted: completionStatus === 'full' }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      setSuccessMsg(result.message);
      setTimeout(() => setSuccessMsg(null), 4000);

      if (selectedWorkId) {
        setPausedDurations(prev => {
          const next = { ...prev };
          delete next[selectedWorkId];
          return next;
        });
      }

      setShowEndWorkDialog(false);
      setSelectedWorkId(null);
      setFrozenEndTime(null);
      setPauseStartTime(null);
      setWorkNotes('');
      setWorkLinks('');
      loadAllData();

      const empId = user?._id || user?.id;
      if (empId) {
        generateDailyMailReport(empId, result.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingTaskId(null);
    }
  };

  const openEndWorkDialog = (workId: string) => {
    const now = new Date();
    setPauseStartTime(now);
    setFrozenEndTime(now);
    setCurrentTime(now);
    setSelectedWorkId(workId);
    setShowEndWorkDialog(true);
  };

  const closeEndWorkDialog = () => {
    if (pauseStartTime && selectedWorkId) {
      const duration = new Date().getTime() - pauseStartTime.getTime();
      setPausedDurations(prev => ({
        ...prev,
        [selectedWorkId]: (prev[selectedWorkId] || 0) + duration,
      }));
    }
    setShowEndWorkDialog(false);
    setSelectedWorkId(null);
    setFrozenEndTime(null);
    setPauseStartTime(null);
    setWorkNotes('');
    setWorkLinks('');
    setCompletionStatus('full');
    setCurrentTime(new Date());
  };

  const getActiveWork = (taskId: string) => {
    return taskWorks.find(w => w.taskId?._id === taskId && w.status === 'In Progress');
  };

  const hasCompletedWorkToday = (taskId: string): boolean => {
    const todayStr = getLocalDateValue(new Date());
    return taskWorks.some(w => w.taskId?._id === taskId && w.status === 'Completed' && w.date === todayStr);
  };

  const openTaskDetailsModal = async (task: Task) => {
    setSelectedTaskForDetails(task);
    setTaskWorkSessions([]);
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/task-work?taskId=${task._id}`);
      const data = await res.json();
      if (data.success) {
        setTaskWorkSessions(data.data);
      }
    } catch (err) {
      console.error('Error fetching task work sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const closeTaskDetailsModal = () => {
    setSelectedTaskForDetails(null);
    setTaskWorkSessions([]);
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
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setShowModal(true);
  };

  const filteredTasks = tasks.filter((task) => {
    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchComments = task.comments?.toLowerCase().includes(q);
      const matchProject = task.projectId?.name?.toLowerCase().includes(q) || (typeof task.Project === 'string' && task.Project.toLowerCase().includes(q));
      const matchUrl = (task.urls && task.urls.some((u: string) => u.toLowerCase().includes(q))) || task.url?.toLowerCase().includes(q);
      const matchCreatedBy = task.createdBy?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchComments && !matchProject && !matchUrl && !matchCreatedBy) return false;
    }

    // 2. Status Filter
    if (filterStatus === 'all') {
      // Show all including Completed
    } else if (filterStatus) {
      if (task.status !== filterStatus) return false;
    } else {
      // Default: show all active (non-completed) tasks
      if (task.status === 'Completed') return false;
    }

    // 3. Priority Filter
    if (filterPriority && task.priority !== filterPriority) return false;

    // 4. Project Filter
    if (filterProject) {
      const pId = typeof task.projectId === 'object' ? task.projectId?._id : task.projectId;
      const pName = typeof task.projectId === 'object' ? task.projectId?.name : task.Project;
      if (pId !== filterProject && pName !== filterProject) return false;
    }

    // 5. Assignee Filter
    if (filterAssignee) {
      if (!task.assignedTo || !task.assignedTo.some((emp: any) => emp._id === filterAssignee || emp.id === filterAssignee || emp.name === filterAssignee)) {
        return false;
      }
    }

    // 6. Due Date Range Filter
    if (filterDateRange) {
      if (filterDateRange === 'no_date') {
        if (task.dueDate) return false;
      } else if (filterDateRange === 'has_date') {
        if (!task.dueDate) return false;
      } else if (task.dueDate) {
        const todayStr = new Date().toISOString().split('T')[0];
        const taskDateStr = task.dueDate;

        if (filterDateRange === 'overdue') {
          if (taskDateStr >= todayStr || task.status === 'Completed') return false;
        } else if (filterDateRange === 'today') {
          if (taskDateStr !== todayStr) return false;
        } else if (filterDateRange === 'this_week') {
          const now = new Date();
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
          const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
          const taskD = new Date(taskDateStr + 'T00:00:00');
          if (taskD < startOfWeek || taskD > endOfWeek) return false;
        }
      } else {
        return false;
      }
    }

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
              ? 'Create and manage tasks for projects'
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

      {/* Search & Filters Panel */}
      <div className="card" style={{ marginBottom: '20px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Top Bar: Search input + Reset Button + Count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by title, description, project, links..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '36px',
                paddingRight: searchQuery ? '32px' : '12px',
                fontSize: '0.85rem',
                width: '100%',
                height: '38px'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="btn btn-secondary"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 650,
                  color: '#ef4444',
                  borderColor: '#ef444430',
                  background: '#fef2f2'
                }}
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            )}

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 650, whiteSpace: 'nowrap' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredTasks.length}</strong> of <strong>{tasks.length}</strong> tasks
            </div>
          </div>
        </div>

        {/* Bottom Bar: Dropdown Filters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'center' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Status
            </label>
            <select
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.82rem', width: '100%', height: '36px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Active Tasks (Default)</option>
              <option value="all">All Tasks (Inc. Completed)</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Completed">Completed Only</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Priority
            </label>
            <select
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.82rem', width: '100%', height: '36px' }}
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="Urgent">🔴 Urgent</option>
              <option value="High">🟠 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
            </select>
          </div>

          {/* Project Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Project
            </label>
            <select
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.82rem', width: '100%', height: '36px' }}
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Assigned To
            </label>
            <select
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.82rem', width: '100%', height: '36px' }}
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option value="">All Assignees</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Due Date
            </label>
            <select
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.82rem', width: '100%', height: '36px' }}
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
            >
              <option value="">All Dates</option>
              <option value="overdue">⚠️ Overdue</option>
              <option value="today">📅 Due Today</option>
              <option value="this_week">📆 Due This Week</option>
              <option value="has_date">With Due Date</option>
              <option value="no_date">No Due Date</option>
            </select>
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
                <th style={{ width: '130px' }}>Project</th>
                <th style={{ width: '110px' }}>Status</th>
                <th style={{ width: '100px' }}>Priority</th>
                <th style={{ width: '130px' }}>Assigned By</th>
                <th style={{ width: '130px' }}>Assigned To</th>
                <th style={{ width: '110px' }}>Due Date</th>
                {filteredTasks.some(canManageTask) && (
                  <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
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
                  <tr
                    key={task._id}
                    onClick={() => openTaskDetailsModal(task)}
                    className="task-row-interactive"
                  >
                    <td>
                      <div
                        className="task-title-link"
                        style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}
                        title="Click to view task details & work logs"
                      >
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
                      {task.createdBy ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <div
                            className="avatar"
                            style={{
                              backgroundColor: task.createdBy.avatarColor || '#7f56d9',
                              width: '24px',
                              height: '24px',
                              fontSize: '0.62rem',
                              color: '#ffffff',
                              flexShrink: 0
                            }}
                            title={`Assigned by: ${task.createdBy.name}`}
                          >
                            {task.createdBy.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85px' }}>
                            {task.createdBy.name.split(' ')[0]}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>System Admin</span>
                      )}
                    </td>
                    <td>
                      {task.assignedTo && task.assignedTo.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                          {task.assignedTo.map((emp: any, eIdx: number) => (
                            <div
                              key={emp._id || emp.id || eIdx}
                              className="avatar"
                              style={{
                                backgroundColor: emp.avatarColor || '#3b82f6',
                                width: '24px',
                                height: '24px',
                                fontSize: '0.62rem',
                                color: '#ffffff',
                                border: '2px solid var(--bg-primary)',
                                marginLeft: eIdx > 0 ? '-6px' : '0',
                                flexShrink: 0
                              }}
                              title={`Assigned to: ${emp.name}`}
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
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>

                          {/* Work session controls for standard employees */}
                          {!isAdmin && (
                            <>
                              {(() => {
                                const activeWork = getActiveWork(task._id);
                                const completedToday = hasCompletedWorkToday(task._id);

                                if (activeWork) {
                                    const timerStr = (() => {
                                      if (!activeWork.startTime) return '00:00:00';
                                      const parts = activeWork.startTime.split(':');
                                      if (parts.length < 3) return '00:00:00';
                                      const [hours, minutes, seconds] = parts.map(Number);
                                      const start = new Date(currentTime);
                                      start.setHours(hours, minutes, seconds, 0);

                                      const totalPaused = pausedDurations[activeWork._id] || 0;
                                      let elapsed = Math.floor((currentTime.getTime() - start.getTime() - totalPaused) / 1000);
                                      if (elapsed < 0) {
                                        elapsed += 24 * 60 * 60;
                                      }
                                    const h = Math.floor(elapsed / 3600);
                                    const m = Math.floor((elapsed % 3600) / 60);
                                    const s = elapsed % 60;
                                    return [
                                      String(h).padStart(2, '0'),
                                      String(m).padStart(2, '0'),
                                      String(s).padStart(2, '0')
                                    ].join(':');
                                  })();

                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <div style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        color: '#ef4444',
                                        background: '#fee2e2',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}>
                                        <Loader2 className="animate-spin" size={10} />
                                        {timerStr}
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); openEndWorkDialog(activeWork._id); }}
                                        disabled={processingTaskId === activeWork._id}
                                        className="btn btn-danger"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '5px 10px',
                                          fontSize: '0.72rem'
                                        }}
                                        title="End Work Session"
                                      >
                                        <StopCircle size={12} />
                                        <span>End Work</span>
                                      </button>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {completedToday && (
                                        <span
                                          className="tag-badge"
                                          style={{
                                            background: '#d1fae5',
                                            color: '#065f46',
                                            fontSize: '0.68rem',
                                            padding: '2px 6px',
                                            fontWeight: 700,
                                            border: '1px solid #10b98130',
                                          }}
                                        >
                                          Worked Today
                                        </span>
                                      )}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleStartWork(task._id); }}
                                        disabled={processingTaskId === task._id || task.status === 'Completed'}
                                        className="btn btn-primary"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '5px 10px',
                                          fontSize: '0.72rem'
                                        }}
                                      >
                                        {processingTaskId === task._id ? (
                                          <Loader2 className="animate-spin" size={12} />
                                        ) : (
                                          <Play size={12} />
                                        )}
                                        <span>Start Work</span>
                                      </button>
                                    </div>
                                  );
                                }
                              })()}
                            </>
                          )}

                          {/* Edit / Delete actions */}
                          {(isAdmin || (user && task.createdBy?._id === user._id)) && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                                title="Edit"
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(task._id); }}
                                className="btn btn-danger"
                                style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
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
      <CreateTaskModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTask(null);
        }}
        editingTask={editingTask}
        user={user}
        projectsOptions={projects}
        employeesList={employees}
        onSuccess={() => {
          loadTasks();
        }}
      />

      {/* MODAL: NEW Project */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        employeesList={employees}
        onSuccess={async () => {
          await loadAllData();
        }}
      />

      {/* MODAL: ADD EMPLOYEE (Admin Only) */}
      <AddTeamMemberModal
        isOpen={isAdmin && isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        projectsList={projects}
        onSuccess={async () => {
          await loadAllData();
        }}
      />

      {/* End Work Dialog */}
      {showEndWorkDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={closeEndWorkDialog}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StopCircle size={22} style={{ color: '#ef4444' }} />
                End Work Session
              </h3>
              <button
                onClick={closeEndWorkDialog}
                className="btn"
                style={{ padding: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Add status, notes or links related to your work before ending the session.
            </p>



            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Is this task fully completed? *
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="completionStatus"
                    value="full"
                    checked={completionStatus === 'full'}
                    onChange={() => setCompletionStatus('full')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Yes, Fully Completed</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="completionStatus"
                    value="partial"
                    checked={completionStatus === 'partial'}
                    onChange={() => setCompletionStatus('partial')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>No, Partially Done (Resume Later)</span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Work Notes/Reason {completionStatus === 'partial' ? <span style={{ color: '#ef4444' }}>* (Required for partial completion)</span> : '(Optional)'}
              </label>

              <CKEditorComponent
                value={workNotes}
                onChange={(val) => setWorkNotes(val)}
              />

              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {completionStatus === 'partial' ? 'Explain why you are stopping and what work is left.' : 'Describe your progress, achievements, or any issues faced.'}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Related Links (Optional)
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="e.g. https://github.com/pull/1, https://jira.com/task/123"
                value={workLinks}
                onChange={(e) => setWorkLinks(e.target.value)}
                style={{ fontSize: '0.85rem', resize: 'vertical' }}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Add relevant URLs (GitHub PRs, Jira tickets, design files, etc.)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeEndWorkDialog}
                disabled={!!processingTaskId}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => selectedWorkId && handleEndWork(selectedWorkId)}
                disabled={!!processingTaskId || (completionStatus === 'partial' && !workNotes.trim())}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: (completionStatus === 'partial' && !workNotes.trim()) ? 0.6 : 1 }}
              >
                {processingTaskId ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Ending...</span>
                  </>
                ) : (
                  <>
                    <StopCircle size={16} />
                    <span>End Work</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details & Work History Modal */}
      {selectedTaskForDetails && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={closeTaskDetailsModal}
        >
          <div
            className="card"
            style={{
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px',
              background: 'var(--bg-secondary)'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span className="tag-badge" style={{ ...getStatusBadgeStyles(selectedTaskForDetails.status), fontWeight: 750, fontSize: '0.74rem', padding: '3px 10px' }}>
                    {selectedTaskForDetails.status}
                  </span>
                  <span className="tag-badge" style={{ ...getPriorityBadgeStyles(selectedTaskForDetails.priority), fontWeight: 750, fontSize: '0.74rem', padding: '3px 10px' }}>
                    {selectedTaskForDetails.priority}
                  </span>
                  {selectedTaskForDetails.projectId ? (
                    <span className="tag-badge" style={{ backgroundColor: `${selectedTaskForDetails.projectId.color}15`, color: selectedTaskForDetails.projectId.color, borderColor: `${selectedTaskForDetails.projectId.color}30`, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', fontWeight: 700, padding: '3px 10px' }}>
                      <Folder size={11} style={{ color: selectedTaskForDetails.projectId.color }} />
                      {selectedTaskForDetails.projectId.name}
                    </span>
                  ) : selectedTaskForDetails.Project ? (
                    <span className="tag-badge" style={{ backgroundColor: '#cbd5e120', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', fontWeight: 700, padding: '3px 10px' }}>
                      <Folder size={11} />
                      {selectedTaskForDetails.Project}
                    </span>
                  ) : null}
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: '1.35' }}>
                  {selectedTaskForDetails.title}
                </h3>
              </div>
              <button
                onClick={closeTaskDetailsModal}
                className="btn"
                style={{
                  padding: '6px',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '50%',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '22px'
            }}>
              {/* Information Overview Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                background: 'var(--bg-secondary)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                {/* Assigned By */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <UserCheck size={12} style={{ color: 'var(--accent-primary)' }} />
                    <span>Assigned By</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedTaskForDetails.createdBy ? (
                      <>
                        <div
                          className="avatar"
                          style={{
                            backgroundColor: selectedTaskForDetails.createdBy.avatarColor || '#7f56d9',
                            width: '22px',
                            height: '22px',
                            fontSize: '0.62rem',
                            color: '#ffffff',
                            flexShrink: 0
                          }}
                        >
                          {selectedTaskForDetails.createdBy.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedTaskForDetails.createdBy.name}</span>
                      </>
                    ) : (
                      'System Admin'
                    )}
                  </div>
                </div>

                {/* Assigned To */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} style={{ color: 'var(--accent-primary)' }} />
                    <span>Assigned To</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedTaskForDetails.assignedTo && selectedTaskForDetails.assignedTo.length > 0 ? (
                      selectedTaskForDetails.assignedTo.map((emp: any) => (
                        <div key={emp._id || emp.id || emp.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                          <div
                            className="avatar"
                            style={{
                              backgroundColor: emp.avatarColor || '#3b82f6',
                              width: '18px',
                              height: '18px',
                              fontSize: '0.55rem',
                              color: '#ffffff',
                              flexShrink: 0
                            }}
                          >
                            {emp.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span>{emp.name}</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Due Date & Time */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} style={{ color: 'var(--accent-primary)' }} />
                    <span>Due Date & Time</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedTaskForDetails.dueDate ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{new Date(selectedTaskForDetails.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {selectedTaskForDetails.dueTime && (
                          <span style={{ color: 'var(--accent-primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.74rem' }}>
                            {selectedTaskForDetails.dueTime}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>No Due Date</span>
                    )}
                  </div>
                </div>

                {/* Created At */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} style={{ color: 'var(--accent-primary)' }} />
                    <span>Created At</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedTaskForDetails.createdAt
                      ? new Date(selectedTaskForDetails.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Resource URLs / Links */}
              {((selectedTaskForDetails.urls && selectedTaskForDetails.urls.length > 0) || selectedTaskForDetails.url) && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LinkIcon size={14} style={{ color: 'var(--accent-primary)' }} />
                      <span>Resource URLs / Links</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleCopyAllUrls(
                        selectedTaskForDetails.urls && selectedTaskForDetails.urls.length > 0
                          ? selectedTaskForDetails.urls
                          : (selectedTaskForDetails.url ? [selectedTaskForDetails.url] : [])
                      )}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 750,
                        color: isCopiedAllUrls ? '#059669' : 'var(--accent-primary)',
                        background: isCopiedAllUrls ? '#d1fae5' : 'rgba(59, 130, 246, 0.1)',
                        border: isCopiedAllUrls ? '1px solid #10b98140' : '1px solid rgba(59, 130, 246, 0.25)',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Copy all URLs to clipboard"
                    >
                      {isCopiedAllUrls ? <Check size={11} /> : <Copy size={11} />}
                      <span>{isCopiedAllUrls ? 'Copied All!' : 'Copy All'}</span>
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(selectedTaskForDetails.urls && selectedTaskForDetails.urls.length > 0
                      ? selectedTaskForDetails.urls
                      : (selectedTaskForDetails.url ? [selectedTaskForDetails.url] : [])
                    ).map((u: string, uIdx: number) => {
                      const fullUrl = u.startsWith('http') ? u : `https://${u}`;
                      const isCopied = copiedUrlIndex === uIdx;
                      return (
                        <div
                          key={uIdx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 650,
                          }}
                        >
                          <LinkIcon size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={u}>
                            {u}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px', flexShrink: 0 }}>
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: '#ffffff',
                                background: 'var(--accent-primary)',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                transition: 'all 0.15s ease',
                              }}
                              title="Open link in new tab"
                            >
                              <Eye size={11} />
                              <span>View</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(fullUrl);
                                setCopiedUrlIndex(uIdx);
                                setTimeout(() => setCopiedUrlIndex(null), 2000);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: isCopied ? '#059669' : 'var(--text-secondary)',
                                background: isCopied ? '#d1fae5' : 'var(--bg-tertiary)',
                                border: isCopied ? '1px solid #10b98140' : '1px solid var(--border-color)',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title="Copy URL to clipboard"
                            >
                              {isCopied ? <Check size={11} /> : <Copy size={11} />}
                              <span>{isCopied ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Task Description */}
              {selectedTaskForDetails.description && (
                <div>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span>Task Description</span>
                  </h4>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      lineHeight: '1.6',
                      background: 'var(--bg-primary)',
                      padding: '16px 18px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      maxHeight: '220px',
                      overflowY: 'auto'
                    }}
                    dangerouslySetInnerHTML={{ __html: selectedTaskForDetails.description }}
                  />
                </div>
              )}

              {/* Supporting Files Preview Gallery */}
              {selectedTaskForDetails.files && selectedTaskForDetails.files.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Paperclip size={14} style={{ color: 'var(--accent-primary)' }} />
                      <span>Supporting Files ({selectedTaskForDetails.files.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleDownloadAllFilesZip(selectedTaskForDetails.files!, selectedTaskForDetails.title)}
                      disabled={isDownloadingZip}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 750,
                        color: '#ffffff',
                        background: 'var(--accent-primary)',
                        border: 'none',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        cursor: isDownloadingZip ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        opacity: isDownloadingZip ? 0.75 : 1,
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                        transition: 'all 0.15s ease'
                      }}
                      title="Download all attached files as a ZIP package"
                    >
                      {isDownloadingZip ? (
                        <>
                          <Loader2 className="animate-spin" size={12} />
                          <span>Downloading ZIP...</span>
                        </>
                      ) : (
                        <>
                          <Archive size={12} />
                          <span>Download All (ZIP)</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                    {selectedTaskForDetails.files.map((file, fIdx) => (
                      <div
                        key={fIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                        }}
                      >
                        {file.type?.startsWith('image/') || /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(file.name) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.url}
                            alt={file.name}
                            onClick={() => handleViewFile(file)}
                            style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-color)', cursor: 'pointer' }}
                            title="Click to view image in new tab"
                          />
                        ) : (
                          <div
                            onClick={() => handleViewFile(file)}
                            style={{ width: '38px', height: '38px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0, cursor: 'pointer' }}
                            title="Click to view file"
                          >
                            <Paperclip size={18} />
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '5px' }} title={file.name}>
                            {file.name}
                          </div>
                          {file.url && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {/* View button: Opens in new tab via Blob URL */}
                              <button
                                type="button"
                                onClick={() => handleViewFile(file)}
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#ffffff',
                                  background: 'var(--accent-primary)',
                                  border: 'none',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                title="Open file in new tab"
                              >
                                <Eye size={11} />
                                <span>View</span>
                              </button>
                              {/* Download button */}
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(file)}
                                style={{
                                  fontSize: '0.7rem',
                                  color: 'var(--text-secondary)',
                                  background: 'var(--bg-tertiary)',
                                  border: '1px solid var(--border-color)',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                title="Download file"
                              >
                                <Download size={11} />
                                <span>Download</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Comments / Notes */}
              {selectedTaskForDetails.comments && (
                <div>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span>Comments / Notes</span>
                  </h4>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      borderLeft: '4px solid var(--accent-primary)',
                      borderTop: '1px solid var(--border-color)',
                      borderRight: '1px solid var(--border-color)',
                      borderBottom: '1px solid var(--border-color)',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5',
                    }}
                  >
                    {selectedTaskForDetails.comments}
                  </div>
                </div>
              )}

              {/* Work Session History Logs */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span>Work Session Logs</span>
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)'
                    }}>
                      {taskWorkSessions.length} sessions
                    </span>
                    {taskWorkSessions.length > 0 && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--accent-primary)',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}>
                        Total: {(() => {
                          const totalMins = taskWorkSessions.reduce((acc, s) => acc + (s.totalMinutes || 0), 0);
                          const h = Math.floor(totalMins / 60);
                          const m = totalMins % 60;
                          return h > 0 ? `${h}h ${m}m` : `${m}m`;
                        })()}
                      </span>
                    )}
                  </div>
                </div>

                {loadingSessions ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px', gap: '12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Loading work session logs...</span>
                  </div>
                ) : taskWorkSessions.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '36px 20px',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '10px',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-secondary)'
                  }}>
                    <CheckSquare size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5, color: 'var(--accent-primary)' }} />
                    <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>No work sessions logged for this task yet.</p>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Employees working on this task will log their active hours here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {taskWorkSessions.map((session) => (
                      <div
                        key={session._id}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Top Info Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              className="avatar"
                              style={{
                                backgroundColor: session.employeeId?.avatarColor || '#7f56d9',
                                width: '26px',
                                height: '26px',
                                fontSize: '0.68rem',
                                color: '#ffffff',
                                flexShrink: 0
                              }}
                              title={session.employeeId?.name}
                            >
                              {session.employeeId?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 750, color: 'var(--text-primary)' }}>
                                {session.employeeId?.name || 'Unknown Employee'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {session.date}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              {session.startTime} - {session.endTime || 'Active'}
                            </span>
                            <span className="tag-badge" style={{
                              background: session.status === 'Completed' ? '#d1fae5' : '#fee2e2',
                              color: session.status === 'Completed' ? '#065f46' : '#b91c1c',
                              borderColor: session.status === 'Completed' ? '#10b98130' : '#ef444430',
                              fontWeight: 750,
                              fontSize: '0.68rem',
                              padding: '2px 8px'
                            }}>
                              {session.status}
                            </span>
                            {session.totalMinutes > 0 && (
                              <span className="tag-badge" style={{
                                background: 'rgba(59, 130, 246, 0.12)',
                                color: 'var(--accent-primary)',
                                borderColor: 'rgba(59, 130, 246, 0.25)',
                                fontWeight: 800,
                                fontSize: '0.68rem',
                                padding: '2px 8px'
                              }}>
                                {Math.floor(session.totalMinutes / 60) > 0 ? `${Math.floor(session.totalMinutes / 60)}h ${session.totalMinutes % 60}m` : `${session.totalMinutes}m`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Notes / links display */}
                        {session.notes && (
                          <div style={{
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-primary)',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            lineHeight: '1.5'
                          }}>
                            <div dangerouslySetInnerHTML={{ __html: session.notes }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--bg-secondary)'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeTaskDetailsModal}
                style={{ fontWeight: 650, padding: '8px 20px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Daily Mail Modal */}
      {showMailModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
          }}
          onClick={() => setShowMailModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '550px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={20} style={{ color: 'var(--accent-primary)' }} />
                Generated Daily Work Mail
              </h3>
              <button
                onClick={() => setShowMailModal(false)}
                className="btn"
                style={{ padding: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Work session ended successfully! Here is your generated daily mail report ready to copy:
            </p>

            <div style={{ marginBottom: '16px' }}>
              <textarea
                className="form-control"
                readOnly
                rows={10}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  lineHeight: '1.5',
                  background: 'var(--bg-tertiary)',
                  resize: 'vertical',
                  width: '100%'
                }}
                value={mailContent}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowMailModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(mailContent);
                  alert('Mail report copied to clipboard!');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Copy size={14} />
                <span>Copy Mail</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
