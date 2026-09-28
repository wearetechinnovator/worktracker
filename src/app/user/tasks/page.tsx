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
  Play, StopCircle, PauseCircle, Loader2, Mail, Copy, Clock,
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
import { taskApi } from '@/lib/taskApi';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import { usePunch } from '@/context/PunchContext';
import ViewModeBanner from '@/components/ViewModeBanner';

const CKEditorComponent = dynamic(
  () => import('@/components/CKEditorWrapper'),
  { ssr: false }
);

interface Task {
  _id: string;
  task_id?: string;
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
  status: 'To Do' | 'In Progress' | 'Paused' | 'Partially Done' | 'Partially Completed' | 'Review' | 'Completed';
  task_status?: string;
  task_assign_date?: string | Date | null;
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
  user_role?: number;
}


// Employee task page: employees can work only while punched in.
// View-only mode is enforced through PunchContext and the action guards below.
export default function TasksPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const isAdmin = Number(user?.user_role) === 1;
  const { isViewMode } = usePunch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Task Work Tracking States
  const [taskWorks, setTaskWorks] = useState<any[]>([]);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);
  const [processingWorkAction, setProcessingWorkAction] = useState<string | null>(null);
  const [showEndWorkDialog, setShowEndWorkDialog] = useState(false);
  const [frozenEndTime, setFrozenEndTime] = useState<Date | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [pausedDurations, setPausedDurations] = useState<Record<string, number>>({});
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [workNotes, setWorkNotes] = useState('');
  const [workLinks, setWorkLinks] = useState('');
  const [workFiles, setWorkFiles] = useState<Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>>([]);
  const [completionStatus, setCompletionStatus] = useState<'partial' | 'full'>('full');
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [reassignEmployeeId, setReassignEmployeeId] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [reassignFiles, setReassignFiles] = useState<Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>>([]);
  const [reassignLinks, setReassignLinks] = useState('');
  const [processingReview, setProcessingReview] = useState(false);
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
    if (isViewMode) {
      toast.error('You are currently in View-Only mode. Please punch in to add comments.');
      return;
    }
    setSubmittingComment(true);
    try {
      const result = await taskApi.addTaskComment(taskId, {
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

  // Reassigned employee task editor: only description + new files + new links.
  const [showReassignedEditor, setShowReassignedEditor] = useState(false);
  const [reassignedEditTask, setReassignedEditTask] = useState<Task | null>(null);
  const [reassignedDescription, setReassignedDescription] = useState('');
  const [reassignedNewFiles, setReassignedNewFiles] = useState<Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>>([]);
  const [reassignedNewLinks, setReassignedNewLinks] = useState('');
  const [savingReassignedEdit, setSavingReassignedEdit] = useState(false);



  // Authenticate user from the DB-backed session
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok || !result.success || !result.user) {
          setUser(null);
          return;
        }

        const currentUser = {
          ...result.user,
          user_role: Number(result.user.user_role),
          userType:
            Number(result.user.user_role) === 1
              ? 'admin'
              : 'employee',
        };

        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load current user:', error);
        setUser(null);
      }
    };

    loadCurrentUser();
  }, []);

  // Load tasks + projects + employees + persisted task-work from MongoDB
  const loadAllData = useCallback(async () => {
    try {
      const [apiTasks, projRes, empRes, workResult] = await Promise.all([
        taskApi.fetchTasksApi(),
        fetch('/api/projects', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/users/employees', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/task-work?limit=1000', {
          credentials: 'include',
          cache: 'no-store',
        }).then(async (response) => {
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to load task work');
          }
          return result;
        }),
      ]);
      const projData = await projRes.json();
      const empData = await empRes.json();

      const allTasks = Array.isArray(apiTasks) ? apiTasks : [];
      const allProjects = (projRes.ok && projData.success && Array.isArray(projData.data)) ? projData.data : [];
      const allEmployees = (empRes.ok && empData.success && Array.isArray(empData.data)) ? empData.data : [];
      const allWorks =
        workResult?.success && Array.isArray(workResult.data)
          ? workResult.data
          : [];

      const normalizedTasks = (allTasks as any[]).map((task) => {
        let taskStatus = task.task_status || (typeof task.status === 'string' ? task.status : 'To Do');
        if (taskStatus === 'Partially Completed') taskStatus = 'Partially Done';
        return {
          ...task,
          status: taskStatus,
          task_status: taskStatus,
          comments: typeof task.comments === 'string' ? task.comments : '',
        };
      });

      setTasks(normalizedTasks as Task[]);
      setProjects(allProjects as any);
      setTaskWorks(allWorks as any);
      setEmployees(allEmployees as any);
    } catch (err: any) {
      console.error('Failed to load task data:', err);
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

  const getWorkDate = (value: unknown) => {
    if (value instanceof Date) return value;

    const text = String(value || '');
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date;

    const timeMatch = text.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!timeMatch) return null;

    const fallback = new Date();
    fallback.setHours(Number(timeMatch[1]), Number(timeMatch[2]), Number(timeMatch[3] || 0), 0);
    return fallback;
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
        const worksData = await taskApi.getTaskWork({ employeeId: empId });

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
    if (isViewMode) {
      toast.error('You are currently in View-Only mode. Please punch in to start work on tasks.');
      return;
    }
    try {
      setProcessingTaskId(taskId);
      setError(null);
      setSuccessMsg(null);

      const localDate = getLocalDateValue(new Date());
      const localTime = getLocalTimeValue(new Date());

      const result = await taskApi.startTaskWork({
        taskId,
        employeeId: user._id || user.id,
        localDate,
        localTime,
      });

      if (!result.success) {
        throw new Error(result.message || 'Failed to start work');
      }

      setSuccessMsg('Work started successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);

      // Re-hydrate from MongoDB so the Start button immediately
      // becomes the active timer and survives page refresh.
      await loadAllData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handlePauseWork = async (workId: string, taskId: string) => {
    if (!user || isAdmin) return;

    try {
      setProcessingWorkAction(`pause:${workId}`);
      setError(null);
      setSuccessMsg(null);

      const response = await fetch('/api/task-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'pause',
          workId,
          taskId,
          userId: user._id || user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to pause work');
      }

      setSuccessMsg('Work paused successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadAllData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingWorkAction(null);
    }
  };

  const handleResumeWork = async (taskId: string) => {
    if (!user || isAdmin) return;

    try {
      setProcessingWorkAction(`resume:${taskId}`);
      setError(null);
      setSuccessMsg(null);

      const response = await fetch('/api/task-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'resume',
          taskId,
          userId: user._id || user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to resume work');
      }

      setSuccessMsg('Work resumed successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadAllData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingWorkAction(null);
    }
  };

  const handleEndWork = async (workId: string) => {
    try {
      setProcessingTaskId(workId);
      setError(null);
      setSuccessMsg(null);

      const cleanReason = stripHtml(workNotes).trim();

      // Partial work MUST have a reason.
      if (completionStatus === 'partial' && !cleanReason) {
        toast.error('Please provide a reason before marking the task as partially done.');
        return;
      }

      const now = frozenEndTime || new Date();
      const priorPausedMs =
        (selectedWorkId && pausedDurations[selectedWorkId]) || 0;

      const effectiveEndTime = new Date(
        now.getTime() - priorPausedMs
      );

      const localTime = getLocalTimeValue(effectiveEndTime);

      const result = await taskApi.endTaskWork(workId, {
        notes: workNotes.trim() || undefined,
        links: workLinks
          .split(/\n|,/)
          .map((link) => link.trim())
          .filter(Boolean),
        files: workFiles,
        localTime,
        isFullyCompleted: completionStatus === 'full',
      } as any);

      if (!result.success) {
        throw new Error(result.message || 'Failed to end work');
      }

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
      setWorkFiles([]);
      setCompletionStatus('full');

      await loadAllData();

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

  const handleWorkFilesChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 10 MB and was skipped.`);
        return false;
      }
      return true;
    });

    try {
      const converted = await Promise.all(
        validFiles.map(
          (file) =>
            new Promise<{
              name: string;
              url: string;
              size: number;
              type: string;
            }>((resolve, reject) => {
              const reader = new FileReader();

              reader.onload = () =>
                resolve({
                  name: file.name,
                  url: String(reader.result || ''),
                  size: file.size,
                  type: file.type || 'application/octet-stream',
                });

              reader.onerror = () =>
                reject(new Error(`Failed to read ${file.name}`));

              reader.readAsDataURL(file);
            })
        )
      );

      setWorkFiles((prev) => [...prev, ...converted]);
      event.target.value = '';
    } catch (error) {
      console.error('Failed to attach work files:', error);
      toast.error('Failed to attach one or more files.');
    }
  };

  const removeWorkFile = (index: number) => {
    setWorkFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openEndWorkDialog = (
    workId: string,
    status: 'partial' | 'full'
  ) => {
    const now = new Date();

    setCompletionStatus(status);
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
    setWorkFiles([]);
    setCompletionStatus('full');
    setCurrentTime(new Date());
  };

  const getTaskWorkId = (work: any) =>
    String(work?.taskId?._id || work?.taskId || '');

  const getTaskWorkEmployeeId = (work: any) =>
    String(work?.employeeId?._id || work?.employeeId || '');

  const getCurrentUserId = () =>
    String(user?._id || user?.id || '');

  const getActiveWork = (taskId: string) => {
    const taskIdStr = String(taskId);
    const userIdStr = getCurrentUserId();

    return taskWorks.find(
      (work) =>
        getTaskWorkId(work) === taskIdStr &&
        work.status === 'In Progress' &&
        getTaskWorkEmployeeId(work) === userIdStr
    );
  };

  const getPausedWork = (taskId: string) => {
    const taskIdStr = String(taskId);
    const userIdStr = getCurrentUserId();

    return taskWorks.find(
      (work) =>
        getTaskWorkId(work) === taskIdStr &&
        work.status === 'Paused' &&
        getTaskWorkEmployeeId(work) === userIdStr
    );
  };

  const getActiveWorkersForTask = (taskId: string) => {
    const taskIdStr = String(taskId);

    return taskWorks.filter(
      (work) =>
        getTaskWorkId(work) === taskIdStr &&
        work.status === 'In Progress'
    );
  };

  const getPausedWorkersForTask = (taskId: string) => {
    const taskIdStr = String(taskId);

    return taskWorks.filter(
      (work) =>
        getTaskWorkId(work) === taskIdStr &&
        work.status === 'Paused'
    );
  };

  const getWorkLoggedMinutes = (work: any) => {
    const stored = Number(work?.totalMinutes);

    if (Number.isFinite(stored) && stored > 0) {
      return Math.floor(stored);
    }

    const start = getWorkDate(work?.startTime);
    const end = getWorkDate(
      work?.endTime ||
      work?.pausedAt ||
      work?.updatedAt ||
      work?.createdAt
    );

    if (!start || !end) return 0;

    const rawMinutes = Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / 60000)
    );

    const pausedMinutes = Number(work?.totalPausedMinutes || 0);

    return Math.max(
      0,
      rawMinutes - (
        Number.isFinite(pausedMinutes)
          ? pausedMinutes
          : 0
      )
    );
  };

  const getTaskProgress = (taskId: string) => {
    const taskIdStr = String(taskId);

    /*
     * IMPORTANT:
     * A partially completed work session is stored in TaskWork as:
     *   status = "Completed"
     *   isFullyCompleted = false
     *
     * Therefore we must NOT identify partial work using status alone.
     */
    const sessions = taskWorks.filter((work) => {
      if (getTaskWorkId(work) !== taskIdStr) return false;

      return (
        work?.status === 'Completed' ||
        work?.status === 'Paused'
      );
    });

    const totalMins = sessions.reduce(
      (sum, session) => sum + getWorkLoggedMinutes(session),
      0
    );

    const activeWorkers = getActiveWorkersForTask(taskId);
    const pausedWorkers = getPausedWorkersForTask(taskId);

    const formatMinutes = (minutes: number) => {
      const safeMinutes = Math.max(0, Math.floor(minutes));

      if (safeMinutes < 1) {
        return '<1m';
      }

      const hours = Math.floor(safeMinutes / 60);
      const mins = safeMinutes % 60;

      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }

      return `${mins}m`;
    };

    const hasFinishedSession = sessions.length > 0;

    return {
      totalMinutes: totalMins,
      timeText: hasFinishedSession
        ? formatMinutes(totalMins)
        : null,
      sessionCount: sessions.filter(
        (work) => work?.status === 'Completed'
      ).length,
      pausedCount: pausedWorkers.length,
      activeCount: activeWorkers.length,
    };
  };

  const hasCompletedWorkToday = (taskId: string): boolean => {
    if (!user) return false;
    const currentUserId = (user._id || user.id)?.toString();
    const todayStr = getLocalDateValue(new Date());
    return taskWorks.some(
      (work) =>
        getTaskWorkId(work) === String(taskId) &&
        work.status === 'Completed' &&
        String(work.date || '') === todayStr &&
        getTaskWorkEmployeeId(work) === currentUserId
    );
  };

  const isTaskFullyCompletedByMe = (taskId: string): boolean => {
    if (!user) return false;
    const currentUserId = (user._id || user.id)?.toString();
    if (!currentUserId) return false;

    const currentTask = tasks.find((t) => String(t._id) === String(taskId));
    // If the task itself is "To Do", "In Progress", or "Paused", the employee has active work to do!
    if (currentTask) {
      const currentStatus = currentTask.task_status || currentTask.status;
      if (['To Do', 'In Progress', 'Paused'].includes(currentStatus)) {
        return false;
      }
    }

    const taskAssignDate = currentTask?.task_assign_date
      ? new Date(currentTask.task_assign_date).getTime()
      : 0;

    const mySessions = taskWorks
      .filter((work) => {
        const matchesTask = getTaskWorkId(work) === String(taskId);
        const matchesEmployee = getTaskWorkEmployeeId(work) === currentUserId;
        const isCompleted = work.status === 'Completed';
        const workTime = new Date(work.updatedAt || work.createdAt || 0).getTime();
        // If the task was assigned/reassigned after this work session, that past session does not complete the current assignment
        const isAfterAssignDate = !taskAssignDate || workTime >= taskAssignDate - 2000;
        return matchesTask && matchesEmployee && isCompleted && isAfterAssignDate;
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );

    if (mySessions.length === 0) return false;
    return Boolean(mySessions[0]?.isFullyCompleted);
  };

  const openTaskDetailsModal = async (task: Task) => {
    setSelectedTaskForDetails(task);
    setTaskWorkSessions([]);
    setLoadingSessions(true);
    try {
      const data = await taskApi.getTaskWork({ taskId: task._id });
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

  const openReassignedEditor = (task: Task) => {
    if (!user || isAdmin) return;

    const isAssigned =
      Array.isArray(task.assignedTo) &&
      task.assignedTo.some(
        (employee: any) =>
          String(employee?._id) === String(user._id || user.id)
      );

    if (!isAssigned) {
      toast.error('You are not assigned to this task.');
      return;
    }

    setReassignedEditTask(task);
    setReassignedDescription(task.description || '');
    setReassignedNewFiles([]);
    setReassignedNewLinks('');
    setShowReassignedEditor(true);
  };

  const closeReassignedEditor = (force = false) => {
    if (savingReassignedEdit && !force) return;

    setShowReassignedEditor(false);
    setReassignedEditTask(null);
    setReassignedDescription('');
    setReassignedNewFiles([]);
    setReassignedNewLinks('');
  };

  const handleReassignedFilesChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 10 MB and was skipped.`);
        return false;
      }
      return true;
    });

    try {
      const converted = await Promise.all(
        validFiles.map(
          (file) =>
            new Promise<{
              name: string;
              url: string;
              size: number;
              type: string;
            }>((resolve, reject) => {
              const reader = new FileReader();

              reader.onload = () =>
                resolve({
                  name: file.name,
                  url: String(reader.result || ''),
                  size: file.size,
                  type: file.type || 'application/octet-stream',
                });

              reader.onerror = () =>
                reject(new Error(`Failed to read ${file.name}`));

              reader.readAsDataURL(file);
            })
        )
      );

      setReassignedNewFiles((prev) => [...prev, ...converted]);
      event.target.value = '';
    } catch (error) {
      console.error('Failed to attach reassigned task files:', error);
      toast.error('Failed to attach one or more files.');
    }
  };

  const removeReassignedNewFile = (index: number) => {
    setReassignedNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveReassignedTask = async () => {
    if (!reassignedEditTask || !user) return;

    try {
      setSavingReassignedEdit(true);

      const existingFiles = Array.isArray(reassignedEditTask.files)
        ? reassignedEditTask.files
        : [];

      const existingLinks = Array.isArray(reassignedEditTask.urls)
        ? reassignedEditTask.urls
        : reassignedEditTask.url
          ? [reassignedEditTask.url]
          : [];

      const newLinks = reassignedNewLinks
        .split(/\\n|,/)
        .map((link) => link.trim())
        .filter(Boolean);

      const mergedLinks = [
        ...existingLinks.map((link: any) =>
          typeof link === 'string'
            ? link
            : String(link?.url || link?.link || '').trim()
        ).filter(Boolean),
        ...newLinks,
      ].filter(
        (link, index, list) => list.indexOf(link) === index
      );

      const result = await taskApi.updateReassignedTask(
        reassignedEditTask._id,
        {
          description: reassignedDescription,
          files: [...existingFiles, ...reassignedNewFiles],
          links: mergedLinks,
        }
      );

      if (!result.success) {
        throw new Error(
          result.message || 'Failed to update task'
        );
      }

      toast.success('Task updated successfully.');
      closeReassignedEditor(true);
      await loadAllData();
    } catch (error: any) {
      toast.error(
        error?.message || 'Failed to update task'
      );
    } finally {
      setSavingReassignedEdit(false);
    }
  };

  const canManageTask = (task: Task) => {
    if (!user) return false;
    const isAssigned = Array.isArray(task.assignedTo) && task.assignedTo.some(e => e._id === user._id);
    return user.userType === 'admin' || task.createdBy?._id === user._id || isAssigned;
  };

  const handleDelete = async (taskId: string) => {
    if (!isAdmin) {
      toast.error('Only administrators are permitted to delete tasks.');
      return;
    }
    if (isViewMode) {
      toast.error('You are currently in View-Only mode. Please punch in to delete tasks.');
      return;
    }
    const task = tasks.find(t => t._id === taskId);
    const taskTitle = task?.title || 'Task';
    if (!confirm(`Are you sure you want to delete "${taskTitle}"?`)) return;

    try {
      const result = await taskApi.deleteTask(taskId);
      if (!result.success) throw new Error(result.message || 'Failed to delete task');

      toast.success(`${taskTitle} deleted successfully`);
      loadTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg || 'Failed to delete task');
    }
  };

  const openEditModal = (task: Task) => {
    if (!isAdmin) {
      toast.error('Only administrators are permitted to edit tasks.');
      return;
    }

    setEditingTask(task);
    setShowModal(true);
  };

  const openCreateModal = () => {
    if (!isAdmin && isViewMode) {
      toast.error('Please punch in first to create a task.');
      return;
    }

    if (!isAdmin && projects.length === 0) {
      toast.error('You are not assigned to any project. You cannot create a task.');
      return;
    }

    setEditingTask(null);
    setShowModal(true);
  };

  const getLatestReviewWork = (taskId: string) => {
    return taskWorks
      .filter(
        (work: any) =>
          getTaskWorkId(work) === String(taskId) &&
          work.status === 'Completed'
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      )[0] || null;
  };

  const handleReassignFilesChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 10 MB and was skipped.`);
        return false;
      }
      return true;
    });

    try {
      const converted = await Promise.all(
        validFiles.map(
          (file) =>
            new Promise<{
              name: string;
              url: string;
              size: number;
              type: string;
            }>((resolve, reject) => {
              const reader = new FileReader();

              reader.onload = () =>
                resolve({
                  name: file.name,
                  url: String(reader.result || ''),
                  size: file.size,
                  type: file.type || 'application/octet-stream',
                });

              reader.onerror = () =>
                reject(new Error(`Failed to read ${file.name}`));

              reader.readAsDataURL(file);
            })
        )
      );

      setReassignFiles((prev) => [...prev, ...converted]);
      event.target.value = '';
    } catch (error) {
      console.error('Failed to attach reassignment files:', error);
      toast.error('Failed to attach one or more files.');
    }
  };

  const removeReassignFile = (index: number) => {
    setReassignFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openReviewDialog = (task: Task) => {
    if (!isAdmin) return;

    setReviewingTask(task);
    setReviewReason('');
    setReassignEmployeeId('');
    setReassignFiles([]);
    setReassignLinks('');
    setShowReassignDialog(false);
    setShowReviewDialog(true);
  };

  const closeReviewDialogs = () => {
    if (processingReview) return;

    setShowReviewDialog(false);
    setShowReassignDialog(false);
    setReviewingTask(null);
    setReviewReason('');
    setReassignEmployeeId('');
    setReassignFiles([]);
    setReassignLinks('');
  };

  const handleApproveReview = async () => {
    if (!reviewingTask) return;

    try {
      setProcessingReview(true);
      const result = await taskApi.reviewTask(
        reviewingTask._id,
        { action: 'approve' }
      );

      if (!result.success) {
        throw new Error(
          result.message || 'Failed to approve task review'
        );
      }

      toast.success(
        result.message || 'Task approved successfully'
      );

      setShowReviewDialog(false);
      setReviewingTask(null);
      await loadAllData();
    } catch (err: any) {
      toast.error(
        err?.message || 'Failed to approve task review'
      );
    } finally {
      setProcessingReview(false);
    }
  };

  const openReassignDialog = () => {
    if (!reviewingTask) return;

    setShowReviewDialog(false);
    setShowReassignDialog(true);
  };

  const handleReassignAfterReject = async () => {
    if (!reviewingTask) return;

    if (!reassignEmployeeId) {
      toast.error('Please select an employee to reassign the task.');
      return;
    }

    try {
      setProcessingReview(true);

      const result = await taskApi.reviewTask(
        reviewingTask._id,
        {
          action: 'reject',
          reassignTo: reassignEmployeeId,
          reason: reviewReason.trim() || undefined,
          files: reassignFiles,
          links: reassignLinks
            .split(/\n|,/)
            .map((link) => link.trim())
            .filter(Boolean),
        }
      );

      if (!result.success) {
        throw new Error(
          result.message || 'Failed to reject and reassign task'
        );
      }

      toast.success(
        result.message || 'Task rejected and reassigned'
      );

      setShowReassignDialog(false);
      setReviewingTask(null);
      setReassignEmployeeId('');
      setReviewReason('');
      setReassignFiles([]);
      setReassignLinks('');
      await loadAllData();
    } catch (err: any) {
      toast.error(
        err?.message || 'Failed to reject and reassign task'
      );
    } finally {
      setProcessingReview(false);
    }
  };

  // Always show the newest created task first.
  // Prefer created_on, then createdAt, with task ID number as a stable fallback.
  const getTaskCreatedTimestamp = (task: Task) => {
    const createdValue = (task as any).created_on || (task as any).createdAt;
    const timestamp = createdValue ? new Date(createdValue).getTime() : 0;
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  const getTaskNumber = (task: Task) => {
    const match = String(task.task_id || '').match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
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
    if (!filterStatus || filterStatus === 'all') {
      // Show all tasks including Completed - do not hide or auto-delete completed tasks
    } else if (filterStatus === 'Completed') {
      if (task.status !== 'Completed' && !isTaskFullyCompletedByMe(task._id)) return false;
    } else if (filterStatus === 'Active') {
      if (task.status === 'Completed' || (!isAdmin && isTaskFullyCompletedByMe(task._id))) return false;
    } else if (filterStatus === 'Partially Done' || filterStatus === 'Partially Completed') {
      if (task.status !== 'Partially Done' && task.status !== 'Partially Completed') return false;
    } else if (filterStatus) {
      if (task.status !== filterStatus) return false;
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
      case 'Paused':
        return { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
      case 'Partially Done':
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

  const sortedFilteredTasks = [...filteredTasks].sort((a, b) => {
    const timeDiff = getTaskCreatedTimestamp(b) - getTaskCreatedTimestamp(a);

    if (timeDiff !== 0) {
      return timeDiff;
    }

    // If creation timestamps are missing/equal, keep newer task numbers first.
    return getTaskNumber(b) - getTaskNumber(a);
  });

  const ITEMS_PER_PAGE = 10;
  const paginatedTasks = sortedFilteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
      <ViewModeBanner />
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
              <option value="">All Tasks (Default)</option>
              <option value="Active">Active Tasks Only</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Paused">Paused</option>
              <option value="Partially Done">Partially Done</option>
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
                <th style={{ width: '105px' }}>Task ID</th>
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
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
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
                  const pausedWorkers = getPausedWorkersForTask(task._id);
                  const isSomeoneWorking = activeWorkers.length > 0;
                  const isSomeonePaused = pausedWorkers.length > 0;
                  const progress = getTaskProgress(task._id);

                  return (
                    <tr
                      key={task._id}
                      onClick={() => openTaskDetailsModal(task)}
                      className="task-row-interactive"
                      style={{
                        background: isSomeoneWorking
                          ? 'rgba(16, 185, 129, 0.04)'
                          : isSomeonePaused
                            ? 'rgba(245, 158, 11, 0.05)'
                            : undefined,
                      }}
                    >
                      <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                        {task.task_id ? (
                          <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.76rem' }}>
                            {task.task_id}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
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
                          {!isSomeoneWorking && isSomeonePaused && (
                            <span className="tag-badge" style={{
                              background: '#fef3c7',
                              color: '#b45309',
                              borderColor: '#fde68a',
                              fontSize: '0.66rem',
                              fontWeight: 750,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 6px',
                              width: 'fit-content'
                            }}>
                              <PauseCircle size={10} style={{ color: '#d97706' }} />
                              <span>
                                Paused
                                {pausedWorkers.length > 0 && (
                                  <span style={{ fontWeight: 600, opacity: 0.9 }}>
                                    {` (${pausedWorkers.map((w: any) => w.employeeId?.full_name || w.employeeId?.name || 'Employee').join(', ')})`}
                                  </span>
                                )}
                              </span>
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
                              const empIdStr = String(emp._id || emp.id || '');
                              const isWorkerActive = activeWorkers.some(
                                (work) => getTaskWorkEmployeeId(work) === empIdStr
                              );
                              const isWorkerPaused = pausedWorkers.some(
                                (work) => getTaskWorkEmployeeId(work) === empIdStr
                              );
                              const empSessions = taskWorks
                                .filter(
                                  (work) =>
                                    getTaskWorkId(work) === String(task._id) &&
                                    work.status === 'Completed' &&
                                    getTaskWorkEmployeeId(work) === empIdStr
                                )
                                .sort(
                                  (a, b) =>
                                    new Date(b.updatedAt || b.createdAt || 0).getTime() -
                                    new Date(a.updatedAt || a.createdAt || 0).getTime()
                                );
                              const latestSession = empSessions[0];
                              const isEmpDone = latestSession?.isFullyCompleted;
                              const isEmpPartial = latestSession && !latestSession.isFullyCompleted;

                              const statusDesc = isWorkerActive
                                ? ' (Working Now)'
                                : isWorkerPaused
                                  ? ' (Paused)'
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
                                      : isWorkerPaused
                                        ? '2px solid #f59e0b'
                                        : isEmpDone
                                          ? '2px solid #047857'
                                          : isEmpPartial
                                            ? '2px solid #f97316'
                                            : '2px solid var(--bg-primary)',
                                    boxShadow: isWorkerActive
                                      ? '0 0 6px #10b98180'
                                      : isWorkerPaused
                                        ? '0 0 6px #f59e0b80'
                                        : undefined,
                                    marginLeft: eIdx > 0 && !isWorkerActive && !isWorkerPaused ? '-6px' : '0',
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
                        {progress.timeText || progress.sessionCount > 0 || progress.pausedCount > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{
                              fontSize: '0.74rem',
                              color: progress.pausedCount > 0 ? '#c2410c' : '#047857',
                              fontWeight: 750,
                              background: progress.pausedCount > 0 ? '#fff7ed' : '#ecfdf5',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: progress.pausedCount > 0 ? '1px solid #fed7aa' : '1px solid #a7f3d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: 'fit-content'
                            }}>
                              {progress.pausedCount > 0 ? <PauseCircle size={11} /> : <Clock size={11} />}
                              {progress.timeText}
                              {progress.pausedCount > 0 ? ' • Paused' : ''}
                            </span>

                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              {progress.sessionCount + progress.pausedCount} session{(progress.sessionCount + progress.pausedCount) !== 1 ? 's' : ''}
                              {progress.pausedCount > 0 ? ` • ${progress.pausedCount} paused` : ''}
                            </span>
                          </div>
                        ) : progress.activeCount > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span
                              className="tag-badge"
                              style={{
                                background: '#ecfdf5',
                                color: '#047857',
                                borderColor: '#10b98140',
                                fontSize: '0.7rem',
                                fontWeight: 750,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                width: 'fit-content'
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: '#10b981',
                                  display: 'inline-block'
                                }}
                                className="animate-pulse"
                              />
                              Working Now
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              {progress.activeCount} worker{progress.activeCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            No time logged
                          </span>
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
                                        const start = getWorkDate(activeWork.startTime);
                                        if (!start) return '00:00:00';

                                        const persistedPausedMs =
                                          Number(activeWork.totalPausedMinutes || 0) * 60 * 1000;
                                        const localPausedMs =
                                          pausedDurations[activeWork._id] || 0;
                                        const totalPaused =
                                          persistedPausedMs + localPausedMs;

                                        let elapsed = Math.floor(
                                          (currentTime.getTime() - start.getTime() - totalPaused) / 1000
                                        );
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
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePauseWork(activeWork._id, task._id);
                                            }}
                                            disabled={processingWorkAction === `pause:${activeWork._id}`}
                                            className="btn btn-secondary"
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              padding: '5px 10px',
                                              fontSize: '0.72rem'
                                            }}
                                            title="Pause Work"
                                          >
                                            {processingWorkAction === `pause:${activeWork._id}` ? (
                                              <Loader2 className="animate-spin" size={12} />
                                            ) : (
                                              <PauseCircle size={12} />
                                            )}
                                            <span>Pause</span>
                                          </button>
                                          <div
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              border: '1px solid #ef444450',
                                              borderRadius: '6px',
                                              overflow: 'hidden',
                                              background: '#fef2f2',
                                            }}
                                            title="End Work Session"
                                          >
                                            <StopCircle
                                              size={13}
                                              style={{
                                                color: '#ef4444',
                                                marginLeft: '8px',
                                                flexShrink: 0,
                                              }}
                                            />
                                            <select
                                              defaultValue=""
                                              disabled={processingTaskId === activeWork._id}
                                              onClick={(e) => e.stopPropagation()}
                                              onChange={(e) => {
                                                e.stopPropagation();
                                                const value = e.target.value;

                                                if (value === 'full') {
                                                  openEndWorkDialog(activeWork._id, 'full');
                                                } else if (value === 'partial') {
                                                  openEndWorkDialog(activeWork._id, 'partial');
                                                }

                                                e.currentTarget.value = '';
                                              }}
                                              style={{
                                                border: 'none',
                                                outline: 'none',
                                                background: 'transparent',
                                                color: '#dc2626',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                padding: '7px 8px 7px 4px',
                                                cursor: 'pointer',
                                              }}
                                            >
                                              <option value="" disabled>
                                                End Work
                                              </option>
                                              <option value="full">Complete</option>
                                              <option value="partial">Partially Done</option>
                                            </select>
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      const pausedWork = getPausedWork(task._id);

                                      if (pausedWork) {
                                        return (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span
                                              className="tag-badge"
                                              style={{
                                                background: '#fff7ed',
                                                color: '#c2410c',
                                                fontSize: '0.72rem',
                                                padding: '4px 8px',
                                                fontWeight: 750,
                                                border: '1px solid #f9731630',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                              }}
                                            >
                                              <PauseCircle size={12} />
                                              Paused
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleResumeWork(task._id);
                                              }}
                                              disabled={processingWorkAction === `resume:${task._id}`}
                                              className="btn btn-primary"
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '5px 10px',
                                                fontSize: '0.72rem'
                                              }}
                                              title="Resume Work"
                                            >
                                              {processingWorkAction === `resume:${task._id}` ? (
                                                <Loader2 className="animate-spin" size={12} />
                                              ) : (
                                                <Play size={12} />
                                              )}
                                              <span>Resume</span>
                                            </button>
                                            <div
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                border: '1px solid #ef444450',
                                                borderRadius: '6px',
                                                overflow: 'hidden',
                                                background: '#fef2f2',
                                              }}
                                              title="End Work Session"
                                            >
                                              <StopCircle
                                                size={13}
                                                style={{
                                                  color: '#ef4444',
                                                  marginLeft: '8px',
                                                  flexShrink: 0,
                                                }}
                                              />
                                              <select
                                                defaultValue=""
                                                disabled={processingTaskId === pausedWork._id}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                  e.stopPropagation();
                                                  const value = e.target.value;

                                                  if (value === 'full') {
                                                    openEndWorkDialog(pausedWork._id, 'full');
                                                  } else if (value === 'partial') {
                                                    openEndWorkDialog(pausedWork._id, 'partial');
                                                  }

                                                  e.currentTarget.value = '';
                                                }}
                                                style={{
                                                  border: 'none',
                                                  outline: 'none',
                                                  background: 'transparent',
                                                  color: '#dc2626',
                                                  fontSize: '0.72rem',
                                                  fontWeight: 700,
                                                  padding: '7px 8px 7px 4px',
                                                  cursor: 'pointer',
                                                }}
                                              >
                                                <option value="" disabled>
                                                  End Work
                                                </option>
                                                <option value="full">Complete</option>
                                                <option value="partial">Partially Done</option>
                                              </select>
                                            </div>
                                          </div>
                                        );
                                      }

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
                                              Done
                                            </span>
                                            {task.status !== 'Completed' && task.status !== 'Review' && (
                                              <span
                                                style={{
                                                  color: 'var(--text-muted)',
                                                  fontSize: '0.7rem',
                                                }}
                                              >
                                                Awaiting review
                                              </span>
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
                                            {/* <span>Start Work</span> */}
                                          </button>
                                        </div>
                                      );
                                    }
                                  })()}
                                </>
                              )}

                              {/* Review / Edit / Delete actions */}
                              {isAdmin && task.status === 'Review' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openReviewDialog(task);
                                  }}
                                  className="btn btn-primary"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                  title="Review task"
                                >
                                  <CheckCircle2 size={12} />
                                  Review
                                </button>
                              )}

                              {/* {!isAdmin && canManageTask(task) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openReassignedEditor(task);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                                  title="Edit description and add files/links"
                                >
                                  <Edit size={12} />
                                </button>
                              )} */}

                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(task);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                                  title="Edit"
                                >
                                  <Edit size={12} />
                                </button>
                              )}

                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(task._id);
                                  }}
                                  className="btn btn-danger"
                                  style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
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

      {renderPagination(sortedFilteredTasks.length, ITEMS_PER_PAGE, currentPage, setCurrentPage)}

      {/* Reassigned Employee Task Editor */}
      {showReassignedEditor && reassignedEditTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
            padding: '20px',
          }}
          onClick={()=>closeReassignedEditor}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: 800,
                  }}
                >
                  Edit Reassigned Task
                </h3>
                <p
                  style={{
                    margin: '5px 0 0',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                  }}
                >
                  {reassignedEditTask.task_id || reassignedEditTask._id}
                  {' · '}
                  {reassignedEditTask.title}
                </p>
              </div>

              <button
                type="button"
                onClick={()=>closeReassignedEditor}
                disabled={savingReassignedEdit}
                className="btn"
                style={{
                  padding: '6px',
                  width: '32px',
                  height: '32px',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label
                className="form-label"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '7px',
                }}
              >
                Description
              </label>

              <CKEditorComponent
                value={reassignedDescription}
                onChange={setReassignedDescription}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label
                className="form-label"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '7px',
                }}
              >
                Existing Files
              </label>

              {Array.isArray(reassignedEditTask.files) &&
              reassignedEditTask.files.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {reassignedEditTask.files.map(
                    (file: any, index: number) => (
                      <div
                        key={`existing-file-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '7px',
                          fontSize: '0.75rem',
                        }}
                      >
                        <Paperclip size={13} />
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {file?.name || `File ${index + 1}`}
                        </span>
                        <span
                          style={{
                            marginLeft: 'auto',
                            color: 'var(--text-muted)',
                            fontSize: '0.68rem',
                          }}
                        >
                          Cannot delete
                        </span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    margin: 0,
                  }}
                >
                  No existing files.
                </p>
              )}

              <div style={{ marginTop: '10px' }}>
                <input
                  type="file"
                  multiple
                  onChange={handleReassignedFilesChange}
                  disabled={savingReassignedEdit}
                  style={{
                    width: '100%',
                    fontSize: '0.78rem',
                  }}
                />
                <p
                  style={{
                    margin: '5px 0 0',
                    color: 'var(--text-muted)',
                    fontSize: '0.68rem',
                  }}
                >
                  You can add new files. Existing files cannot be deleted.
                  Maximum 10 MB per file.
                </p>
              </div>

              {reassignedNewFiles.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginTop: '9px',
                  }}
                >
                  {reassignedNewFiles.map((file, index) => (
                    <div
                      key={`new-file-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '8px 10px',
                        border: '1px solid #bfdbfe',
                        borderRadius: '7px',
                        background: '#eff6ff',
                        fontSize: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeReassignedNewFile(index)}
                        disabled={savingReassignedEdit}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#dc2626',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                className="form-label"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '7px',
                }}
              >
                Existing Links
              </label>

              {(() => {
                const links = Array.isArray(reassignedEditTask.urls)
                  ? reassignedEditTask.urls
                  : reassignedEditTask.url
                    ? [reassignedEditTask.url]
                    : [];

                return links.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      marginBottom: '10px',
                    }}
                  >
                    {links.map((link: any, index: number) => {
                      const href =
                        typeof link === 'string'
                          ? link
                          : String(link?.url || link?.link || '');

                      return (
                        <a
                          key={`existing-link-${index}`}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            padding: '8px 10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '7px',
                            fontSize: '0.75rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <LinkIcon size={13} />
                          {href}
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      margin: '0 0 10px',
                    }}
                  >
                    No existing links.
                  </p>
                );
              })()}

              <textarea
                className="form-control"
                rows={3}
                value={reassignedNewLinks}
                onChange={(e) => setReassignedNewLinks(e.target.value)}
                disabled={savingReassignedEdit}
                placeholder="Add new links, one per line..."
                style={{
                  width: '100%',
                  resize: 'vertical',
                  fontSize: '0.8rem',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={()=>closeReassignedEditor}
                disabled={savingReassignedEdit}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveReassignedTask}
                disabled={savingReassignedEdit}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {savingReassignedEdit ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Check size={14} />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

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


      {/* Admin Review Dialog */}
      {showReviewDialog && reviewingTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={closeReviewDialogs}
        >
          <div
            className="card"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const reviewWork = getLatestReviewWork(reviewingTask._id);
              const reasonText = reviewWork?.notes
                ? stripHtml(reviewWork.notes)
                : '';
              const files = Array.isArray(reviewingTask.files)
                ? reviewingTask.files
                : [];
              const links = Array.isArray(reviewingTask.urls)
                ? reviewingTask.urls
                : reviewingTask.url
                  ? [reviewingTask.url]
                  : [];

              const formatMins = (mins?: number) => {
                const safe = Math.max(0, Math.floor(mins || 0));
                if (safe < 1) return '< 1m';
                const h = Math.floor(safe / 60);
                const rem = safe % 60;
                if (h > 0) return `${h}h ${rem}m`;
                return `${rem}m`;
              };

              const formatTime12H = (dVal?: string | Date | null) => {
                if (!dVal) return '';
                const dObj = new Date(dVal);
                if (Number.isNaN(dObj.getTime())) return String(dVal);
                return dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
              };

              const taskSessions = taskWorks.filter(
                (w: any) => getTaskWorkId(w) === String(reviewingTask._id)
              );
              const totalMinsAcrossSessions = taskSessions.reduce(
                (sum: number, w: any) => sum + (Number(w.totalMinutes) || 0),
                0
              );

              const projectName = reviewingTask.projectId?.name || 'General';
              const projectColor = reviewingTask.projectId?.color || '#3b82f6';
              const sessionMinutes = reviewWork?.totalMinutes !== undefined ? reviewWork.totalMinutes : 0;
              const pausedMinutes = reviewWork?.totalPausedMinutes || 0;

              return (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '18px',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '1.15rem',
                          fontWeight: 800,
                        }}
                      >
                        Task Review
                      </h3>
                      <p
                        style={{
                          margin: '5px 0 0',
                          color: 'var(--text-secondary)',
                          fontSize: '0.78rem',
                        }}
                      >
                        {reviewingTask.task_id || reviewingTask._id} • {reviewingTask.title}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeReviewDialogs}
                      className="btn"
                      style={{
                        padding: '6px',
                        width: '32px',
                        height: '32px',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Top Stats Cards: Status, Employee, Project, Priority */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '10px',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #ddd6fe',
                        background: '#f5f3ff',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: '#6d28d9',
                          fontWeight: 700,
                          marginBottom: '3px',
                        }}
                      >
                        STATUS
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#6d28d9' }}>
                        Waiting Review
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #bfdbfe',
                        background: '#eff6ff',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: '#1d4ed8',
                          fontWeight: 700,
                          marginBottom: '3px',
                        }}
                      >
                        EMPLOYEE
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {reviewingTask.assignedTo?.map((e: any) => e.name).join(', ') || 'Employee'}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--text-muted)',
                          fontWeight: 700,
                          marginBottom: '3px',
                        }}
                      >
                        PROJECT
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: projectColor, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{projectName}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--text-muted)',
                          fontWeight: 700,
                          marginBottom: '3px',
                        }}
                      >
                        PRIORITY
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>
                        <span
                          className="tag-badge"
                          style={{
                            ...getStatusBadgeStyles(reviewingTask.priority),
                            fontSize: '0.7rem',
                            padding: '1px 6px',
                          }}
                        >
                          {reviewingTask.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Work Duration Card */}
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #a7f3d0',
                      background: '#ecfdf5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '0.68rem',
                          color: '#047857',
                          fontWeight: 700,
                          marginBottom: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Clock size={13} />
                        WORK DURATION
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#065f46' }}>
                        {formatMins(sessionMinutes)}
                        <span style={{ fontSize: '0.76rem', fontWeight: 500, color: '#047857', marginLeft: '8px' }}>
                          (This Session)
                        </span>
                      </div>
                      {totalMinsAcrossSessions > sessionMinutes && (
                        <div style={{ fontSize: '0.73rem', color: '#047857', marginTop: '3px' }}>
                          Total work on task: <strong>{formatMins(totalMinsAcrossSessions)}</strong> across {taskSessions.length} session{taskSessions.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#065f46' }}>
                      {reviewWork?.startTime && (
                        <div>
                          <strong>Started:</strong> {formatTime12H(reviewWork.startTime)}
                        </div>
                      )}
                      {reviewWork?.endTime && (
                        <div>
                          <strong>Ended:</strong> {formatTime12H(reviewWork.endTime)}
                        </div>
                      )}
                      {pausedMinutes > 0 && (
                        <div style={{ color: '#b45309', fontSize: '0.7rem' }}>
                          Paused: {pausedMinutes}m
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Description */}
                  {reviewingTask.description && (
                    <div style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          marginBottom: '6px',
                        }}
                      >
                        Task Description
                      </div>
                      <div
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          maxHeight: '110px',
                          overflowY: 'auto',
                          background: 'var(--bg-secondary)',
                          fontSize: '0.8rem',
                          lineHeight: 1.5,
                        }}
                      >
                        {stripHtml(reviewingTask.description)}
                      </div>
                    </div>
                  )}

                  {/* Employee Work Reason / Summary */}
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        marginBottom: '6px',
                      }}
                    >
                      Employee Work Summary / Reason
                    </div>

                    <div
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px',
                        minHeight: '60px',
                        background: 'var(--bg-secondary)',
                        fontSize: '0.82rem',
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {reasonText || 'No reason / summary was provided.'}
                    </div>
                  </div>

                  {/* Supporting Files */}
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        marginBottom: '6px',
                      }}
                    >
                      Files ({files.length})
                    </div>

                    {files.length > 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          maxHeight: '120px',
                          overflowY: 'auto',
                        }}
                      >
                        {files.map((file: any, index: number) => (
                          <a
                            key={`${file?.name || 'file'}-${index}`}
                            href={file?.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '7px',
                              padding: '8px 10px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '7px',
                              textDecoration: 'none',
                              color: 'var(--text-primary)',
                              fontSize: '0.78rem',
                              background: 'var(--bg-secondary)',
                            }}
                          >
                            <Paperclip size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {file?.name || `File ${index + 1}`}
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.78rem',
                        }}
                      >
                        No files attached.
                      </div>
                    )}
                  </div>

                  {/* URL / Resource Links */}
                  <div style={{ marginBottom: '22px' }}>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        marginBottom: '6px',
                      }}
                    >
                      Links ({links.length})
                    </div>

                    {links.length > 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          maxHeight: '100px',
                          overflowY: 'auto',
                        }}
                      >
                        {links.map((link: any, index: number) => {
                          const value =
                            typeof link === 'string'
                              ? link
                              : String(link?.url || link?.link || '');

                          if (!value) return null;

                          return (
                            <a
                              key={`${value}-${index}`}
                              href={value.startsWith('http') ? value : `https://${value}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                                padding: '8px 10px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '7px',
                                textDecoration: 'none',
                                color: 'var(--accent-primary)',
                                fontSize: '0.78rem',
                                wordBreak: 'break-all',
                                background: 'var(--bg-secondary)',
                              }}
                            >
                              <LinkIcon size={14} style={{ flexShrink: 0 }} />
                              {value}
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.78rem',
                        }}
                      >
                        No links attached.
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '10px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={openReassignDialog}
                      disabled={processingReview}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <RotateCcw size={14} />
                      Reject & Reassign
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleApproveReview}
                      disabled={processingReview}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {processingReview ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Approve
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Reassign Dialog */}
      {showReassignDialog && reviewingTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: '20px',
          }}
          onClick={closeReviewDialogs}
        >
          <div
            className="card"
            style={{
              maxWidth: '650px',
              width: '100%',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Reassign Task
                </h3>
                <p
                  style={{
                    margin: '5px 0 0',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                  }}
                >
                  {reviewingTask.title}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReviewDialogs}
                className="btn"
                style={{
                  padding: '6px',
                  width: '32px',
                  height: '32px',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                className="form-label"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '7px',
                }}
              >
                Assign to employee *
              </label>

              <select
                className="form-control"
                value={reassignEmployeeId}
                onChange={(e) => setReassignEmployeeId(e.target.value)}
                disabled={processingReview}
                style={{ width: '100%' }}
              >
                <option value="">Select employee</option>
                {employees
                  .filter((employee: any) => employee._id)
                  .map((employee: any) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name || employee.full_name || employee.email}
                    </option>
                  ))}
              </select>
            </div>

            {/* Existing + new files */}
            <div style={{ marginBottom: '18px' }}>
              <label
                className="form-label"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '7px',
                }}
              >
                Task Files
              </label>

              {Array.isArray(reviewingTask.files) && reviewingTask.files.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: '10px',
                  }}
                >
                  {reviewingTask.files.map((file: any, index: number) => (
                    <div
                      key={`existing-reassign-file-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 9px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '7px',
                        fontSize: '0.75rem',
                      }}
                    >
                      <Paperclip size={13} />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file?.name || `File ${index + 1}`}
                      </span>
                      <span
                        style={{
                          marginLeft: 'auto',
                          color: 'var(--text-muted)',
                          fontSize: '0.68rem',
                        }}
                      >
                        Existing
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    margin: '0 0 10px',
                    color: 'var(--text-muted)',
                    fontSize: '0.74rem',
                  }}
                >
                  No existing files.
                </p>
              )}

              <input
                type="file"
                multiple
                onChange={handleReassignFilesChange}
                disabled={processingReview}
                style={{
                  width: '100%',
                  fontSize: '0.78rem',
                }}
              />

              {reassignFiles.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginTop: '8px',
                  }}
                >
                  {reassignFiles.map((file, index) => (
                    <div
                      key={`new-reassign-file-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '7px 9px',
                        border: '1px solid #bfdbfe',
                        borderRadius: '7px',
                        background: '#eff6ff',
                        fontSize: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeReassignFile(index)}
                        disabled={processingReview}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#dc2626',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing + new links */}
            <div style={{ marginBottom: '18px' }}>
              <label
                className="form-label"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '7px',
                }}
              >
                Task Links
              </label>

              {(() => {
                const existingLinks = Array.isArray(reviewingTask.urls)
                  ? reviewingTask.urls
                  : reviewingTask.url
                    ? [reviewingTask.url]
                    : [];

                return existingLinks.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      marginBottom: '10px',
                    }}
                  >
                    {existingLinks.map((link: any, index: number) => (
                      <a
                        key={`existing-reassign-link-${index}`}
                        href={typeof link === 'string' ? link : link?.url || link?.link || '#'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          padding: '7px 9px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '7px',
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <LinkIcon size={13} />
                        {typeof link === 'string' ? link : link?.url || link?.link || ''}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      margin: '0 0 10px',
                      color: 'var(--text-muted)',
                      fontSize: '0.74rem',
                    }}
                  >
                    No existing links.
                  </p>
                );
              })()}

              <textarea
                className="form-control"
                rows={3}
                value={reassignLinks}
                onChange={(e) => setReassignLinks(e.target.value)}
                disabled={processingReview}
                placeholder="Add new links, one per line..."
                style={{
                  width: '100%',
                  resize: 'vertical',
                  fontSize: '0.8rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                className="form-label"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '7px',
                }}
              >
                Review / Reassign Reason (Optional)
              </label>

              <textarea
                className="form-control"
                rows={4}
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                placeholder="Explain what needs to be corrected..."
                disabled={processingReview}
                style={{
                  width: '100%',
                  resize: 'vertical',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowReassignDialog(false);
                  setShowReviewDialog(true);
                }}
                disabled={processingReview}
              >
                Back
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={handleReassignAfterReject}
                disabled={processingReview || !reassignEmployeeId}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {processingReview ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <RotateCcw size={14} />
                )}
                Reject & Reassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Work Dialog */}
      {showEndWorkDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
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
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <StopCircle size={22} style={{ color: '#ef4444' }} />
                End Work Session
              </h3>

              <button
                onClick={closeEndWorkDialog}
                className="btn"
                style={{
                  padding: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginBottom: '18px',
              }}
            >
              Add the details for this work session before ending it.
            </p>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '18px',
                padding: '6px 10px',
                borderRadius: '6px',
                background: completionStatus === 'partial' ? '#fff7ed' : '#ecfdf5',
                color: completionStatus === 'partial' ? '#c2410c' : '#047857',
                border: completionStatus === 'partial'
                  ? '1px solid #fed7aa'
                  : '1px solid #a7f3d0',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {completionStatus === 'partial' ? 'Partially Done' : 'Complete'}
            </div>

            {/* Reason */}
            <div style={{ marginBottom: '18px' }}>
              <label
                className="form-label"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '8px',
                  display: 'block',
                }}
              >
                Reason / Work Summary{' '}
                {completionStatus === 'partial' ? (
                  <span style={{ color: '#ef4444' }}>
                    * Required for Partially Done
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>
                    {' '}(Optional)
                  </span>
                )}
              </label>

              <CKEditorComponent
                value={workNotes}
                onChange={(val) => setWorkNotes(val)}
              />

              {completionStatus === 'partial' && (
                <p
                  style={{
                    fontSize: '0.7rem',
                    color: '#b45309',
                    marginTop: '5px',
                  }}
                >
                  Please explain why the task is not complete and what is
                  remaining.
                </p>
              )}
            </div>

            {/* Files */}
            <div style={{ marginBottom: '18px' }}>
              <label
                className="form-label"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '8px',
                  display: 'block',
                }}
              >
                Supporting Files (Optional)
              </label>

              <div
                style={{
                  border: '1px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                }}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleWorkFilesChange}
                  style={{
                    width: '100%',
                    fontSize: '0.8rem',
                  }}
                />

                <p
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    margin: '6px 0 0',
                  }}
                >
                  Maximum 10 MB per file.
                </p>

                {workFiles.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '7px',
                      marginTop: '10px',
                    }}
                  >
                    {workFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          padding: '8px 10px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '7px',
                          background: 'var(--bg-primary)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minWidth: 0,
                          }}
                        >
                          <Paperclip size={14} />
                          <span
                            style={{
                              fontSize: '0.78rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {file.name}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeWorkFile(index)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#ef4444',
                            padding: '2px',
                          }}
                          title="Remove file"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Links */}
            <div style={{ marginBottom: '24px' }}>
              <label
                className="form-label"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '8px',
                  display: 'block',
                }}
              >
                Related Links (Optional)
              </label>

              <textarea
                className="form-control"
                rows={3}
                placeholder={
                  'Add one link per line, e.g.\nhttps://github.com/...\nhttps://jira.com/...'
                }
                value={workLinks}
                onChange={(e) => setWorkLinks(e.target.value)}
                style={{
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
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
                onClick={() =>
                  selectedWorkId && handleEndWork(selectedWorkId)
                }
                disabled={
                  !!processingTaskId ||
                  (completionStatus === 'partial' &&
                    !stripHtml(workNotes).trim())
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity:
                    completionStatus === 'partial' &&
                    !stripHtml(workNotes).trim()
                      ? 0.6
                      : 1,
                }}
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
