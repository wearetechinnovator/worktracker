'use client';

import { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import {
  CheckSquare, Play, Loader2, AlertCircle, CheckCircle2,
  Calendar, Flag, StopCircle, Clock, Mail, Copy, MessageSquare,
  Eye, User
} from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import dynamic from 'next/dynamic';
import { taskApi } from '@/lib/taskApi';
import { toast } from '@/lib/toast';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import { formatTimeTo12H } from '@/lib/time';

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
  assignedTo: Array<{
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
  createdAt: string;
}

interface TaskWork {
  _id: string;
  taskId: any;
  employeeId?: any;
  startTime: string;
  endTime?: string;
  totalMinutes?: number;
  status: 'In Progress' | 'Completed';
  isFullyCompleted?: boolean;
  date: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

export default function MyTasks({ userId }: { userId: string }) {
  const [effectiveUserId, setEffectiveUserId] = useState<string>(userId || '');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskWorks, setTaskWorks] = useState<TaskWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      setEffectiveUserId(userId);
      return;
    }
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success && data.user?._id) {
          setEffectiveUserId(data.user._id);
        }
      } catch (err) {
        console.error('Failed to get current user in MyTasks:', err);
      }
    };
    fetchMe();
  }, [userId]);

  // End Work Dialog State
  const [showEndWorkDialog, setShowEndWorkDialog] = useState(false);
  const [frozenEndTime, setFrozenEndTime] = useState<Date | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [pausedDurations, setPausedDurations] = useState<Record<string, number>>({});
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [workNotes, setWorkNotes] = useState('');
  const [workLinks, setWorkLinks] = useState('');
  const [workFiles, setWorkFiles] = useState<Array<{ name: string; url: string; size?: number; type?: string }>>([]);
  const [completionStatus, setCompletionStatus] = useState<'partial' | 'full'>('full');

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

  // Task Filter Tabs
  const [taskTab, setTaskTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);
  const [isCopiedAllComments, setIsCopiedAllComments] = useState<boolean>(false);

  const handleAddComment = async (taskId: string) => {
    if (!newCommentText.trim() || !userId) return;
    setSubmittingComment(true);
    const newComment = {
      _id: 'comment-' + Date.now(),
      author: {
        _id: userId,
        name: 'User',
        avatarColor: '#4f46e5',
        role: 'User'
      },
      content: newCommentText.trim(),
      createdAt: new Date().toISOString(),
    };
    setNewCommentText('');
    setNewCommentStatus('');
    if (selectedTaskForDetails && selectedTaskForDetails._id === taskId) {
      const updatedComments = [...(selectedTaskForDetails.commentsList || []), newComment];
      setSelectedTaskForDetails({
        ...selectedTaskForDetails,
        commentsList: updatedComments,
      });
    }
    setSubmittingComment(false);
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
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Calculate elapsed time for in-progress tasks
  const [currentTime, setCurrentTime] = useState(new Date());

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

  const loadData = useCallback(async () => {
    try {
      const activeUser = effectiveUserId || userId;
      const [apiTasks, worksRes] = await Promise.all([
        taskApi.fetchTasksApi(),
        taskApi.getTaskWork(activeUser ? { employeeId: activeUser } : undefined),
      ]);
      setTasks((apiTasks || []) as any);
      if (worksRes && worksRes.success && Array.isArray(worksRes.data)) {
        setTaskWorks(worksRes.data);
      } else {
        setTaskWorks([]);
      }
    } catch (e) {
      console.error(e);
      setTasks([]);
      setTaskWorks([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, userId]);

  // Live timer tick for active tasks (paused when End Work dialog is open)
  useEffect(() => {
    if (showEndWorkDialog) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [showEndWorkDialog]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleStartWork = async (taskId: string) => {
    try {
      setProcessingTaskId(taskId);
      const result = await taskApi.startTaskWork({
        taskId,
        employeeId: userId,
      });
      if (!result.success) {
        throw new Error(result.message || 'Failed to start work');
      }
      setSuccessMsg('Work started! Timer is running...');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to start work');
      setTimeout(() => setError(null), 4000);
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handleWorkFilesChange = async (
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

  const handleEndWork = async (workId: string) => {
    try {
      if (completionStatus === 'partial' && !workNotes.trim()) {
        toast.error('Please provide a reason before marking the task as partially done.');
        return;
      }
      setProcessingTaskId(workId);
      const now = frozenEndTime || new Date();
      const priorPausedMs = (selectedWorkId && pausedDurations[selectedWorkId]) || 0;
      const effectiveEndTime = new Date(now.getTime() - priorPausedMs);
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
      });

      if (!result.success) {
        throw new Error(result.message || 'Failed to end work');
      }

      setSuccessMsg(result.message || 'Work session completed!');
      setTimeout(() => setSuccessMsg(null), 4000);

      setShowEndWorkDialog(false);
      setSelectedWorkId(null);
      setFrozenEndTime(null);
      setPauseStartTime(null);
      setWorkNotes('');
      setWorkLinks('');
      setWorkFiles([]);
      setCompletionStatus('full');

      await loadData();

      if (userId) {
        generateDailyMailReport(userId, result.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to end work');
      setTimeout(() => setError(null), 4000);
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
      setPausedDurations((prev) => ({
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

  const getActiveWork = (taskId: string): TaskWork | undefined => {
    return taskWorks.find(
      w => ((w.taskId?._id || w.taskId)?.toString() === taskId.toString()) &&
           w.status === 'In Progress' &&
           ((w.employeeId?._id || w.employeeId)?.toString() === userId.toString())
    );
  };

  const hasCompletedWorkToday = (taskId: string): boolean => {
    const todayStr = getLocalDateValue(new Date());
    return taskWorks.some(
      w => ((w.taskId?._id || w.taskId)?.toString() === taskId.toString()) &&
           w.status === 'Completed' &&
           w.date === todayStr &&
           ((w.employeeId?._id || w.employeeId)?.toString() === userId.toString())
    );
  };

  const getCompletedWorkTime = (taskId: string): { hours: number; minutes: number; isUnderAMinute?: boolean } | null => {
    const completedSessions = taskWorks.filter(
      w => ((w.taskId?._id || w.taskId)?.toString() === taskId.toString()) &&
           w.status === 'Completed' &&
           ((w.employeeId?._id || w.employeeId)?.toString() === userId.toString())
    );
    if (completedSessions.length === 0) return null;
    const totalMins = completedSessions.reduce((sum, w) => sum + (w.totalMinutes || 0), 0);
    if (totalMins === 0) {
      return { hours: 0, minutes: 0, isUnderAMinute: true };
    }
    return {
      hours: Math.floor(totalMins / 60),
      minutes: totalMins % 60,
    };
  };

  const getElapsedTime = (startTime: string, workId?: string): { h1: string; h2: string; m1: string; m2: string; s1: string; s2: string } => {
    const [hours, minutes, seconds] = startTime.split(':').map(Number);
    const start = new Date(currentTime);
    start.setHours(hours, minutes, seconds, 0);

    const totalPaused = (workId && pausedDurations[workId]) || 0;
    let elapsed = Math.floor((currentTime.getTime() - start.getTime() - totalPaused) / 1000);
    if (elapsed < 0) {
      elapsed += 24 * 60 * 60;
    }
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;

    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');

    return {
      h1: hStr[0],
      h2: hStr[1],
      m1: mStr[0],
      m2: mStr[1],
      s1: sStr[0],
      s2: sStr[1],
    };
  };

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

  if (loading) {
    return (
      <div className="card">
        <PageShimmer variant="compact" />
      </div>
    );
  }

  const isTaskFullyCompletedByMe = (taskId: string) => {
    const currentTask = tasks.find((t) => String(t._id) === String(taskId));
    // If the task itself is "To Do", "In Progress", or "Paused", the employee has active work to do!
    if (currentTask) {
      const currentStatus = (currentTask as any).task_status || currentTask.status;
      if (['To Do', 'In Progress', 'Paused'].includes(currentStatus)) {
        return false;
      }
    }

    const taskAssignDate = currentTask?.task_assign_date
      ? new Date(currentTask.task_assign_date).getTime()
      : 0;

    const currentEmpId = (effectiveUserId || userId)?.toString();

    const mySessions = taskWorks
      .filter((w) => {
        const matchesTask = String(w.taskId?._id || w.taskId) === String(taskId);
        const matchesEmployee = (w.employeeId?._id || w.employeeId)?.toString() === currentEmpId;
        const isCompleted = w.status === 'Completed';
        const workTime = new Date(w.updatedAt || w.createdAt || 0).getTime();
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

  const pendingTasks = tasks.filter(t => {
    if (t.status === 'Completed') return false;
    const activeWork = getActiveWork(t._id);
    if (activeWork) return true; // currently working
    return !isTaskFullyCompletedByMe(t._id);
  });

  const completedByMeTasks = tasks.filter(t => {
    if (t.status === 'Completed') return true;
    return isTaskFullyCompletedByMe(t._id);
  });

  const displayedTasks = taskTab === 'pending'
    ? pendingTasks
    : taskTab === 'completed'
      ? completedByMeTasks
      : tasks;

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={20} style={{ color: 'var(--accent-primary)' }} />
            My Assigned Tasks
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {pendingTasks.length} pending task{pendingTasks.length !== 1 ? 's' : ''} to work on ({tasks.length} total assigned)
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '3px',
          gap: '2px'
        }}>
          <button
            type="button"
            onClick={() => setTaskTab('pending')}
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: taskTab === 'pending' ? 'var(--accent-primary)' : 'transparent',
              color: taskTab === 'pending' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            Pending ({pendingTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setTaskTab('completed')}
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: taskTab === 'completed' ? '#10b981' : 'transparent',
              color: taskTab === 'completed' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            Completed by You ({completedByMeTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setTaskTab('all')}
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: taskTab === 'all' ? 'var(--bg-primary)' : 'transparent',
              color: taskTab === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: taskTab === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            All ({tasks.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '16px', background: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle style={{ color: '#ef4444' }} size={18} />
            <p style={{ fontWeight: 600, color: '#991b1b', fontSize: '0.85rem' }}>{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="card" style={{ borderLeft: '4px solid #10b981', marginBottom: '16px', background: '#ecfdf5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 style={{ color: '#10b981' }} size={18} />
            <p style={{ color: '#065f46', fontWeight: 700, fontSize: '0.85rem' }}>{successMsg}</p>
          </div>
        </div>
      )}

      {displayedTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CheckSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>
            {taskTab === 'pending' ? 'No pending tasks!' : taskTab === 'completed' ? 'No completed tasks yet' : 'No tasks assigned'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {taskTab === 'pending' ? 'You have completed all assigned tasks or have no active work assigned right now.' : 'Tasks will appear here once they are assigned or completed.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Priority</th>
                  <th>Task Name</th>
                  <th style={{ width: '120px' }}>Assigned By</th>
                  <th style={{ width: '120px' }}>Project</th>
                  <th style={{ width: '110px' }}>Status</th>
                  <th style={{ width: '110px' }}>Due Date</th>
                  <th style={{ width: '110px' }}>Progress</th>
                  <th style={{ width: '230px', textAlign: 'right' }}>Actions & Tracking</th>
                </tr>
              </thead>
              <tbody>
                {displayedTasks.map((task) => {
                  const activeWork = getActiveWork(task._id);
                  const isWorking = !!activeWork;
                  const isSomeoneWorking = taskWorks.some(w => (w.taskId?._id === task._id || w.taskId === task._id) && w.status === 'In Progress');
                  const completedToday = hasCompletedWorkToday(task._id);
                  const taskSessions = taskWorks.filter(w => (w.taskId?._id === task._id || w.taskId === task._id) && w.status === 'Completed');
                  const totalTaskMins = taskSessions.reduce((sum, w) => sum + (w.totalMinutes || 0), 0);
                  const progHours = Math.floor(totalTaskMins / 60);
                  const progMins = totalTaskMins % 60;
                  const progText = totalTaskMins > 0 ? (progHours > 0 ? `${progHours}h ${progMins}m` : `${progMins}m`) : null;

                  return (
                    <tr
                      key={task._id}
                      style={{
                        opacity: completedToday && !isWorking ? 0.75 : 1,
                        background: isSomeoneWorking ? 'rgba(16, 185, 129, 0.04)' : undefined,
                      }}
                    >
                      {/* Priority */}
                      <td>
                        <span
                          className="tag-badge"
                          style={{
                            background: getPriorityColor(task.priority) + '15',
                            color: getPriorityColor(task.priority),
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            border: `1px solid ${getPriorityColor(task.priority)}30`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Flag size={10} />
                          {task.priority}
                        </span>
                      </td>

                      {/* Task Name & Description & Comments */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            onClick={() => openTaskDetailsModal(task)}
                            style={{
                              fontWeight: 750,
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            className="task-title-link"
                            title="Click to view full task details"
                          >
                            <span>{task.title}</span>
                          </span>
                          {task.description && (
                            <span
                              style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}
                              dangerouslySetInnerHTML={{ __html: task.description }}
                            />
                          )}
                          {task.comments && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '2px', width: 'fit-content' }}>
                              <MessageSquare size={11} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                              <span style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {task.comments}
                              </span>
                            </div>
                          )}
                          {task.assignedTo && task.assignedTo.length > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                              <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginRight: '2px' }}>Team:</span>
                              {task.assignedTo.map((emp: any, eIdx: number) => {
                                const empIdStr = emp._id || emp.id;
                                const isEmpWorking = taskWorks.some(w => (w.taskId?._id === task._id || w.taskId === task._id) && w.status === 'In Progress' && (w.employeeId?._id === empIdStr || w.employeeId === empIdStr));
                                const empSessions = taskWorks.filter(w => (w.taskId?._id === task._id || w.taskId === task._id) && w.status === 'Completed' && (w.employeeId?._id === empIdStr || w.employeeId === empIdStr));
                                const latestSession = empSessions[0];
                                const isEmpDone = latestSession?.isFullyCompleted;
                                const isEmpPartial = latestSession && !latestSession.isFullyCompleted;

                                const statusDesc = isEmpWorking
                                  ? ' (Working Now)'
                                  : isEmpDone
                                    ? ' (Completed their part)'
                                    : isEmpPartial
                                      ? ' (Partially Done)'
                                      : '';

                                return (
                                  <div
                                    key={emp._id || emp.id || eIdx}
                                    className="avatar"
                                    style={{
                                      backgroundColor: emp.avatarColor || '#3b82f6',
                                      width: '18px',
                                      height: '18px',
                                      fontSize: '0.52rem',
                                      color: '#ffffff',
                                      border: isEmpWorking 
                                        ? '1.5px solid #10b981' 
                                        : isEmpDone 
                                          ? '1.5px solid #047857' 
                                          : isEmpPartial 
                                            ? '1.5px solid #f97316' 
                                            : '1px solid var(--border-color)',
                                      boxShadow: isEmpWorking ? '0 0 4px #10b98180' : undefined,
                                      flexShrink: 0
                                    }}
                                    title={`${emp.name}`}
                                  >
                                    {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned By */}
                      <td>
                        {task.createdBy ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <div
                              className="avatar"
                              style={{
                                backgroundColor: task.createdBy.avatarColor || '#7f56d9',
                                width: '22px',
                                height: '22px',
                                fontSize: '0.6rem',
                                color: '#ffffff',
                                flexShrink: 0
                              }}
                              title={`Assigned by: ${task.createdBy.name}`}
                            >
                              {task.createdBy.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                              {task.createdBy.name.split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>System Admin</span>
                        )}
                      </td>

                      {/* Project */}
                      <td>
                        {task.projectId ? (
                          <span
                            className="tag-badge"
                            style={{
                              background: task.projectId.color + '15',
                              color: task.projectId.color,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              border: `1px solid ${task.projectId.color}30`,
                            }}
                          >
                            {task.projectId.name}
                          </span>
                        ) : task.Project ? (
                          <span className="tag-badge" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                            {task.Project}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            className="tag-badge"
                            style={{
                              ...getStatusBadgeStyles(task.status),
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              fontWeight: 700,
                              width: 'fit-content'
                            }}
                          >
                            {task.status}
                          </span>
                          {isSomeoneWorking && (
                            <span
                              className="tag-badge"
                              style={{
                                background: '#ecfdf5',
                                color: '#047857',
                                borderColor: '#10b98140',
                                fontSize: '0.65rem',
                                fontWeight: 750,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '1px 5px',
                                width: 'fit-content'
                              }}
                            >
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="animate-pulse" />
                              <span>Working Now</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Due Date */}
                      <td>
                        {task.dueDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={12} />
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                            {task.dueTime && (
                              <span style={{ marginLeft: '4px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {formatTimeTo12H(task.dueTime)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>

                      {/* Progress */}
                      <td>
                        {progText ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              color: '#047857',
                              fontWeight: 750,
                              background: '#ecfdf5',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid #a7f3d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: 'fit-content'
                            }}>
                              <Clock size={10} />
                              {progText}
                            </span>
                            <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                              {taskSessions.length} session{taskSessions.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>No time logged</span>
                        )}
                      </td>

                      {/* Actions & Tracking */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => openTaskDetailsModal(task)}
                            className="btn"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)'
                            }}
                            title="View task details"
                          >
                            <Eye size={12} />
                            {/* <span>Details</span> */}
                          </button>
                          {isWorking ? (
                            <>
                              {/* Compact Digital Stopwatch */}
                              {(() => {
                                const elapsed = getElapsedTime(activeWork.startTime, activeWork._id);
                                const elapsedStr = `${elapsed.h1}${elapsed.h2}:${elapsed.m1}${elapsed.m2}:${elapsed.s1}${elapsed.s2}`;
                                return (
                                  <div style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    background: '#0284c7',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                  }}>
                                    <Clock size={12} className="animate-pulse" />
                                    <span>{elapsedStr}</span>
                                  </div>
                                );
                              })()}

                              <button
                                onClick={() => openEndWorkDialog(activeWork._id)}
                                disabled={processingTaskId === activeWork._id}
                                className="btn btn-danger"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  fontSize: '0.75rem'
                                }}
                              >
                                <StopCircle size={12} />
                                {/* <span>End Work</span> */}
                              </button>
                            </>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              {(() => {
                                const timeWorked = getCompletedWorkTime(task._id);
                                if (timeWorked) {
                                  return (
                                    <span style={{
                                      fontSize: '0.75rem',
                                      color: '#047857',
                                      fontWeight: 600,
                                      background: '#ecfdf5',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid #a7f3d0',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}>
                                      <Clock size={12} />
                                      {timeWorked.isUnderAMinute ? '< 1m' : `${timeWorked.hours > 0 ? `${timeWorked.hours}h ` : ''}${timeWorked.minutes}m`}
                                    </span>
                                  );
                                }
                                return null;
                              })()}

                              {isTaskFullyCompletedByMe(task._id) || task.status === 'Review' ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    className="tag-badge"
                                    style={{
                                      background: task.status === 'Review' ? '#f5f3ff' : '#ecfdf5',
                                      color: task.status === 'Review' ? '#6d28d9' : '#047857',
                                      fontSize: '0.72rem',
                                      padding: '4px 8px',
                                      fontWeight: 750,
                                      border: task.status === 'Review' ? '1px solid #8b5cf630' : '1px solid #10b98130',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <CheckCircle2 size={12} />
                                    {task.status === 'Review' ? 'In Review' : 'Done by You'}
                                  </span>
                                  {task.status !== 'Completed' && (
                                    <button
                                      onClick={() => handleStartWork(task._id)}
                                      disabled={processingTaskId === task._id}
                                      className="btn btn-secondary"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 8px',
                                        fontSize: '0.7rem'
                                      }}
                                      title="Resume or log more work on this task"
                                    >
                                      <Play size={11} />
                                      {/* <span>Resume</span> */}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {completedToday && (
                                    <span
                                      className="tag-badge"
                                      style={{
                                        background: '#d1fae5',
                                        color: '#065f46',
                                        fontSize: '0.7rem',
                                        padding: '2px 8px',
                                        fontWeight: 700,
                                        border: '1px solid #10b98130',
                                      }}
                                    >
                                      Worked Today
                                    </span>
                                  )}

                                  <button
                                    onClick={() => handleStartWork(task._id)}
                                    disabled={processingTaskId === task._id || task.status === 'Completed'}
                                    className="btn btn-primary"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '10px 10px',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    {processingTaskId === task._id ? (
                                      <Loader2 className="animate-spin" size={12} />
                                    ) : (
                                      <Play size={12} />
                                    )}
                                    {/* <span>Start Work</span> */}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

              <div style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Related Links (Optional)
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g. https://github.com/pull/1, https://jira.com/task/123"
                  value={workLinks}
                  onChange={(e) => setWorkLinks(e.target.value)}
                  style={{ fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              {/* Attach Work Files */}
              <div style={{ marginBottom: '22px' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Attached Files (Optional)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleWorkFilesChange}
                  style={{ fontSize: '0.82rem', marginBottom: '8px' }}
                />
                {workFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                    {workFiles.map((file, fIdx) => (
                      <div
                        key={fIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeWorkFile(fIdx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Redesigned Task Details Modal */}
      {selectedTaskForDetails && (
        <TaskDetailsModal
          task={selectedTaskForDetails as any}
          sessions={taskWorkSessions}
          loadingSessions={loadingSessions}
          user={{ _id: userId, id: userId, name: "User" }}
          newCommentText={newCommentText}
          newCommentStatus={newCommentStatus}
          submittingComment={submittingComment}
          copiedCommentId={copiedCommentId}
          copiedUrlIndex={copiedUrlIndex}
          isCopiedAllComments={isCopiedAllComments}
          isCopiedAllUrls={isCopiedAllUrls}
          isDownloadingZip={isDownloadingZip}
          onClose={closeTaskDetailsModal}
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
            const urls = (selectedTaskForDetails.urls && selectedTaskForDetails.urls.length > 0)
              ? selectedTaskForDetails.urls
              : (selectedTaskForDetails.url ? [selectedTaskForDetails.url] : []);
            handleCopyAllUrls(urls);
          }}
          onViewFile={handleViewFile}
          onDownloadFile={handleDownloadFile}
          onDownloadAllFiles={() => {
            if (selectedTaskForDetails.files && selectedTaskForDetails.files.length > 0) {
              handleDownloadAllFilesZip(selectedTaskForDetails.files, selectedTaskForDetails.title);
            }
          }}
        />
      )}
    </div>
  );
}
