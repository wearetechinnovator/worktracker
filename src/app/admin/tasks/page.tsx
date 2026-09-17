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
import { toast } from '@/lib/toast';
import { staticClient } from '@/lib/staticClient';
import TaskDetailsModal from '@/components/TaskDetailsModal';

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
  status: 'To Do' | 'In Progress' | 'Partially Completed' | 'Review' | 'Completed';
  dueDate?: string;
  dueTime?: string;
  url?: string;
  urls?: string[];
  comments?: string;
  commentsList?: Array<{
    _id?: string;
    author: {
      _id: string;
      name: string;
      email?: string;
      avatarColor?: string;
      role?: string;
    };
    content: string;
    createdAt: string;
  }>;
  contactPerson?: string;
  contactPersons?: string[];
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
  const [user, setUser] = useState<UserProfile | null>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const isAdmin = user?.userType === 'admin';
  const [loading, setLoading] = useState(false);
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

  // Comment & Progress Updates States
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [newCommentStatus, setNewCommentStatus] = useState<string>('');
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);
  const [isCopiedAllComments, setIsCopiedAllComments] = useState<boolean>(false);

  const handleAddComment = async (taskId: string) => {
    if (!newCommentText.trim() || !user) return;
    setSubmittingComment(true);
    try {
      const result = await staticClient.addTaskComment(taskId, {
        content: newCommentText.trim(),
        userId: user._id || user.id,
        newStatus: newCommentStatus || undefined,
      });
      if (!result.success) throw new Error('Failed to add comment');

      setNewCommentText('');
      setNewCommentStatus('');
      loadAllData();
    } catch (err: any) {
      console.error('Error posting comment:', err);
      alert(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCopyComment = (commentId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedCommentId(commentId);
    setTimeout(() => setCopiedCommentId(null), 2000);
  };

  const handleCopyAllComments = (task: Task) => {
    const parts: string[] = [];
    if (task.comments) {
      parts.push(`Initial Note: ${task.comments}`);
    }
    if (task.commentsList && task.commentsList.length > 0) {
      task.commentsList.forEach((c, idx) => {
        const author = c.author?.name || 'Team Member';
        const time = c.createdAt ? new Date(c.createdAt).toLocaleString() : '';
        parts.push(`Update ${idx + 1} (${author} - ${time}):\n${c.content}`);
      });
    }
    if (parts.length === 0) return;
    navigator.clipboard.writeText(parts.join('\n\n'));
    setIsCopiedAllComments(true);
    setTimeout(() => setIsCopiedAllComments(false), 2000);
  };

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
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Load data in parallel
  const loadAllData = useCallback(async () => {
    try {
      const apiTasks = await staticClient.fetchTasksApi();
      const allTasks = apiTasks || staticClient.getTasks();
      const allProjects = staticClient.getProjects();
      const allWorks = staticClient.getWorkEntries();
      const allEmployees = staticClient.getEmployees();

      const normalizedTasks = (allTasks as any[]).map((task) => ({
        ...task,
        comments: typeof task.comments === 'string' ? task.comments : '',
      }));

      setTasks(normalizedTasks as Task[]);
      setProjects(allProjects as any);
      setTaskWorks(allWorks as any);
      setEmployees(allEmployees as any);
    } catch (err: any) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTasks = loadAllData;

  // Load data
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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
        const worksData = await staticClient.getTaskWork({ employeeId: empId });

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

      const result = await staticClient.startTaskWork({ taskId, employeeId: user._id, localDate, localTime });
      if (!result.success) throw new Error('Failed to start work');

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

      const result = await staticClient.endTaskWork(workId, { notes, localTime, isFullyCompleted: completionStatus === 'full' });
      if (!result.success) throw new Error('Failed to end work');

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
    return taskWorks.find(w => (w.taskId?._id === taskId || w.taskId === taskId) && w.status === 'In Progress' && (w.employeeId?._id === user?._id || w.employeeId === user?._id));
  };

  const getActiveWorkersForTask = (taskId: string) => {
    return taskWorks.filter(w => (w.taskId?._id === taskId || w.taskId === taskId) && w.status === 'In Progress');
  };

  const getTaskProgress = (taskId: string) => {
    const sessions = taskWorks.filter(w => (w.taskId?._id === taskId || w.taskId === taskId) && w.status === 'Completed');
    const totalMins = sessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return {
      totalMinutes: totalMins,
      timeText: totalMins > 0 ? (hours > 0 ? `${hours}h ${mins}m` : `${mins}m`) : null,
      sessionCount: sessions.length,
    };
  };

  const hasCompletedWorkToday = (taskId: string): boolean => {
    if (!user) return false;
    const currentUserId = (user._id || user.id)?.toString();
    const todayStr = getLocalDateValue(new Date());
    return taskWorks.some(
      w => ((w.taskId?._id || w.taskId)?.toString() === taskId.toString()) &&
        w.status === 'Completed' &&
        w.date === todayStr &&
        ((w.employeeId?._id || w.employeeId)?.toString() === currentUserId)
    );
  };

  const isTaskFullyCompletedByMe = (taskId: string): boolean => {
    if (!user) return false;
    const currentUserId = (user._id || user.id)?.toString();
    if (!currentUserId) return false;

    const mySessions = taskWorks.filter(
      w => ((w.taskId?._id || w.taskId)?.toString() === taskId.toString()) &&
        w.status === 'Completed' &&
        ((w.employeeId?._id || w.employeeId)?.toString() === currentUserId)
    );
    if (mySessions.length === 0) return false;
    return Boolean(mySessions[0]?.isFullyCompleted);
  };

  const openTaskDetailsModal = async (task: Task) => {
    setSelectedTaskForDetails(task);
    setTaskWorkSessions([]);
    setLoadingSessions(true);
    try {
      const data = await staticClient.getTaskWork({ taskId: task._id });
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
    const task = tasks.find(t => t._id === taskId);
    const taskTitle = task?.title || 'Task';
    if (!confirm(`Are you sure you want to delete "${taskTitle}"?`)) return;

    try {
      const result = await staticClient.deleteTask(taskId);
      if (!result.success) throw new Error('Failed to delete task');

      toast.success(`${taskTitle} deleted successfully`);
      loadTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg || 'Failed to delete task');
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
      const matchComments = task.comments?.toLowerCase().includes(q)
        || task.commentsList?.some((comment) => comment.content?.toLowerCase().includes(q));
      const matchProject = task.projectId?.name?.toLowerCase().includes(q) || (typeof task.Project === 'string' && task.Project.toLowerCase().includes(q));
      const matchUrl = (task.urls && task.urls.some((u: string) => u.toLowerCase().includes(q))) || task.url?.toLowerCase().includes(q);
      const matchCreatedBy = task.createdBy?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchComments && !matchProject && !matchUrl && !matchCreatedBy) return false;
    }

    // 2. Status Filter
    if (filterStatus === 'all') {
      // Show all including Completed
    } else if (filterStatus === 'Completed') {
      if (task.status !== 'Completed' && !isTaskFullyCompletedByMe(task._id)) return false;
    } else if (filterStatus) {
      if (task.status !== filterStatus) return false;
    } else {
      // Default: show all active (non-completed) tasks for this user
      if (task.status === 'Completed') return false;
      if (!isAdmin && isTaskFullyCompletedByMe(task._id)) return false;
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
      case 'Partially Completed': return '#ffedd5';
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
      case 'Partially Completed':
        return { background: '#fff7ed', color: '#c2410c', border: '1px solid #f9731630' };
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
            {/* <CheckSquare size={28} style={{ color: 'var(--accent-primary)' }} /> */}
            Task Management
          </h1>
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
              <option value="Partially Completed">Partially Completed</option>
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
                <th style={{ width: '120px' }}>Project</th>
                <th style={{ width: '125px' }}>Status</th>
                <th style={{ width: '90px' }}>Priority</th>
                <th style={{ width: '120px' }}>Assigned By</th>
                <th style={{ width: '130px' }}>Assigned To</th>
                <th style={{ width: '110px' }}>Progress</th>
                <th style={{ width: '105px' }}>Due Date</th>
                {filteredTasks.some(canManageTask) && (
                  <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
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
                paginatedTasks.map((task) => {
                  const activeWorkers = getActiveWorkersForTask(task._id);
                  const isSomeoneWorking = activeWorkers.length > 0;
                  const progress = getTaskProgress(task._id);

                  return (
                    <tr
                      key={task._id}
                      onClick={() => openTaskDetailsModal(task)}
                      className="task-row-interactive"
                      style={{
                        background: isSomeoneWorking ? 'rgba(16, 185, 129, 0.04)' : undefined,
                      }}
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
                        {(task.comments || task.commentsList?.length) && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '4px' }}>
                            <MessageSquare size={11} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            <span style={{ maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.comments || task.commentsList?.[0]?.content}
                            </span>
                          </div>
                        )}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span className="tag-badge" style={{ ...getStatusBadgeStyles(task.status), fontWeight: 750, fontSize: '0.72rem', width: 'fit-content' }}>
                            {task.status}
                          </span>
                          {isSomeoneWorking && (
                            <span className="tag-badge" style={{
                              background: '#ecfdf5',
                              color: '#047857',
                              borderColor: '#10b98140',
                              fontSize: '0.66rem',
                              fontWeight: 750,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 6px',
                              width: 'fit-content'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="animate-pulse" />
                              <span>Working Now</span>
                            </span>
                          )}
                        </div>
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
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px' }}>
                            {task.assignedTo.map((emp: any, eIdx: number) => {
                              const empIdStr = emp._id || emp.id;
                              const isWorkerActive = activeWorkers.some(w => w.employeeId?._id === empIdStr || w.employeeId === empIdStr);
                              const empSessions = taskWorks.filter(w => (w.taskId?._id === task._id || w.taskId === task._id) && w.status === 'Completed' && (w.employeeId?._id === empIdStr || w.employeeId === empIdStr));
                              const latestSession = empSessions[0];
                              const isEmpDone = latestSession?.isFullyCompleted;
                              const isEmpPartial = latestSession && !latestSession.isFullyCompleted;

                              const statusDesc = isWorkerActive
                                ? ' (Working Now)'
                                : isEmpDone
                                  ? ' (Completed their part)'
                                  : isEmpPartial
                                    ? ' (Partially Done)'
                                    : '';

                              return (
                                <div
                                  key={empIdStr || eIdx}
                                  className="avatar"
                                  style={{
                                    backgroundColor: emp.avatarColor || '#3b82f6',
                                    width: '24px',
                                    height: '24px',
                                    fontSize: '0.62rem',
                                    color: '#ffffff',
                                    border: isWorkerActive
                                      ? '2px solid #10b981'
                                      : isEmpDone
                                        ? '2px solid #047857'
                                        : isEmpPartial
                                          ? '2px solid #f97316'
                                          : '2px solid var(--bg-primary)',
                                    boxShadow: isWorkerActive ? '0 0 6px #10b98180' : undefined,
                                    marginLeft: eIdx > 0 && !isWorkerActive ? '-6px' : '0',
                                    flexShrink: 0
                                  }}
                                  title={`Assigned to: ${emp.name}${statusDesc}`}
                                >
                                  {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        {progress.totalMinutes > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{
                              fontSize: '0.74rem',
                              color: '#047857',
                              fontWeight: 750,
                              background: '#ecfdf5',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #a7f3d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: 'fit-content'
                            }}>
                              <Clock size={11} />
                              {progress.timeText}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              {progress.sessionCount} session{progress.sessionCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No time logged</span>
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
                      {filteredTasks.some(canManageTask) && (
                        <td style={{ textAlign: 'center' }}>
                          {canManageTask(task) ? (
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
                                      if (isTaskFullyCompletedByMe(task._id)) {
                                        return (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span
                                              className="tag-badge"
                                              style={{
                                                background: '#ecfdf5',
                                                color: '#047857',
                                                fontSize: '0.72rem',
                                                padding: '4px 8px',
                                                fontWeight: 750,
                                                border: '1px solid #10b98130',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                              }}
                                            >
                                              <CheckCircle2 size={12} />
                                              Done by You
                                            </span>
                                            {task.status !== 'Completed' && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); handleStartWork(task._id); }}
                                                disabled={processingTaskId === task._id}
                                                className="btn btn-secondary"
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  padding: '4px 8px',
                                                  fontSize: '0.7rem'
                                                }}
                                                title="Resume or log more work"
                                              >
                                                <Play size={11} />
                                                <span>Resume</span>
                                              </button>
                                            )}
                                          </div>
                                        );
                                      }

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
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
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

      {/* Redesigned Task Details Modal */}
      {selectedTaskForDetails && (
        <TaskDetailsModal
          task={selectedTaskForDetails}
          sessions={taskWorkSessions}
          loadingSessions={loadingSessions}
          user={user}
          newCommentText={newCommentText}
          newCommentStatus={newCommentStatus}
          submittingComment={submittingComment}
          copiedCommentId={copiedCommentId}
          copiedUrlIndex={copiedUrlIndex}
          isCopiedAllComments={isCopiedAllComments}
          isCopiedAllUrls={isCopiedAllUrls}
          isDownloadingZip={isDownloadingZip}
          onClose={closeTaskDetailsModal}
          onEdit={() => openEditModal(selectedTaskForDetails)}
          onDelete={() => handleDelete(selectedTaskForDetails._id)}
          onAddComment={() => handleAddComment(selectedTaskForDetails._id)}
          onCommentChange={setNewCommentText}
          onCommentStatusChange={setNewCommentStatus}
          onCopyComment={handleCopyComment}
          onCopyAllComments={() => handleCopyAllComments(selectedTaskForDetails)}
          onCopyUrl={(index, url) => {
            navigator.clipboard.writeText(url);
            setCopiedUrlIndex(index);
            setTimeout(() => setCopiedUrlIndex(null), 2000);
          }}
          onCopyAllUrls={() => {
            const urls = selectedTaskForDetails.urls?.length
              ? selectedTaskForDetails.urls
              : selectedTaskForDetails.url
                ? [selectedTaskForDetails.url]
                : [];
            handleCopyAllUrls(urls);
          }}
          onViewFile={handleViewFile}
          onDownloadFile={handleDownloadFile}
          onDownloadAllFiles={() => handleDownloadAllFilesZip(selectedTaskForDetails.files || [], selectedTaskForDetails.title)}
        />
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
