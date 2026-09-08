'use client';

import { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import {
  CheckSquare, Play, Loader2, AlertCircle, CheckCircle2,
  Calendar, Flag, StopCircle, Clock, Mail, Copy, MessageSquare,
  Users, UserCheck, Eye, Download, X, ExternalLink, Link as LinkIcon,
  FileText, Activity, Paperclip, Check, Folder, User, Archive, Plus
} from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
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
  assignedTo: Array<{
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
  date: string;
  notes?: string;
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

export default function MyTasks({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskWorks, setTaskWorks] = useState<TaskWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);

  // End Work Dialog State
  const [showEndWorkDialog, setShowEndWorkDialog] = useState(false);
  const [frozenEndTime, setFrozenEndTime] = useState<Date | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [pausedDurations, setPausedDurations] = useState<Record<string, number>>({});
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [workNotes, setWorkNotes] = useState('');
  const [workLinks, setWorkLinks] = useState('');
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
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);
  const [isCopiedAllComments, setIsCopiedAllComments] = useState<boolean>(false);

  const handleAddComment = async (taskId: string) => {
    if (!newCommentText.trim() || !userId) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newCommentText.trim(),
          userId: userId,
          newStatus: newCommentStatus || undefined,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      setNewCommentText('');
      setNewCommentStatus('');
      if (selectedTaskForDetails && selectedTaskForDetails._id === taskId) {
        setSelectedTaskForDetails({
          ...selectedTaskForDetails,
          commentsList: result.data,
          status: result.taskStatus || selectedTaskForDetails.status,
        });
      }
      loadData();
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
      setTimeout(() => setLoading(true), 0);
      const [tasksRes, worksRes] = await Promise.all([
        fetch(`/api/tasks?employeeId=${userId}`),
        fetch(`/api/task-work?limit=300`),
      ]);

      const tasksData = await tasksRes.json();
      const worksData = await worksRes.json();

      if (!tasksData.success) throw new Error(tasksData.error);
      if (!worksData.success) throw new Error(worksData.error);

      setTasks(tasksData.data);
      setTaskWorks(worksData.data);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
      setError(null);
      setSuccessMsg(null);

      const localDate = getLocalDateValue(new Date());
      const localTime = getLocalTimeValue(new Date());

      const res = await fetch('/api/task-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, employeeId: userId, localDate, localTime }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      setSuccessMsg('Work started! Timer is running...');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handleEndWork = async (workId: string) => {
    console.log('Ending work for:', workId);
    try {
      setProcessingTaskId(workId);
      setError(null);
      setSuccessMsg(null);

      const hasNotes = workNotes.trim() !== '';
      const hasLinks = stripHtml(workLinks) !== '';
      const notes = hasNotes || hasLinks
        ? `${workNotes}${hasNotes && hasLinks ? '\n\n' : ''}${workLinks}`
        : undefined;

      console.log('Sending request with notes:', notes);

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
      console.log('API Response:', result);

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

      // Reset dialog
      setShowEndWorkDialog(false);
      setSelectedWorkId(null);
      setFrozenEndTime(null);
      setPauseStartTime(null);
      setWorkNotes('');
      setWorkLinks('');

      loadData();

      if (userId) {
        generateDailyMailReport(userId, result.data);
      }
    } catch (err: unknown) {
      console.error('Error ending work:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingTaskId(null);
    }
  };

  const openEndWorkDialog = (workId: string) => {
    console.log('Opening end work dialog for:', workId);
    const now = new Date();
    setPauseStartTime(now);
    setFrozenEndTime(now);
    setCurrentTime(now);
    setSelectedWorkId(workId);
    setShowEndWorkDialog(true);
    console.log('Dialog state set to true');
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

  const getActiveWork = (taskId: string): TaskWork | undefined => {
    return taskWorks.find(w => w.taskId._id === taskId && w.status === 'In Progress');
  };

  const hasCompletedWorkToday = (taskId: string): boolean => {
    const todayStr = getLocalDateValue(new Date());
    return taskWorks.some(w => w.taskId._id === taskId && w.status === 'Completed' && w.date === todayStr);
  };

  const getCompletedWorkTime = (taskId: string): { hours: number; minutes: number; isUnderAMinute?: boolean } | null => {
    const completedSessions = taskWorks.filter(w => w.taskId._id === taskId && w.status === 'Completed');
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

  const activeTasks = tasks.filter(t => t.status !== 'Completed');

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={20} style={{ color: 'var(--accent-primary)' }} />
            My Assigned Tasks
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''} assigned to you
          </p>
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

      {activeTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CheckSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>No active tasks</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            You have no active tasks assigned at this moment.
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
                {activeTasks.map((task) => {
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
                                const isEmpWorking = taskWorks.some(w => (w.taskId?._id === task._id || w.taskId === task._id) && w.status === 'In Progress' && (w.employeeId?._id === emp._id || w.employeeId === emp._id));
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
                                      border: isEmpWorking ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                                      boxShadow: isEmpWorking ? '0 0 4px #10b98180' : undefined,
                                      flexShrink: 0
                                    }}
                                    title={`Assigned to: ${emp.name}${isEmpWorking ? ' (Working Now)' : ''}`}
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
                            <span>Details</span>
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
                                <span>End Work</span>
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
                                  padding: '5px 10px',
                                  fontSize: '0.75rem'
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

      {/* Task Details & Work History Modal */}
      {selectedTaskForDetails && (
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
                  <span className="tag-badge" style={{
                    background: getPriorityColor(selectedTaskForDetails.priority) + '15',
                    color: getPriorityColor(selectedTaskForDetails.priority),
                    border: `1px solid ${getPriorityColor(selectedTaskForDetails.priority)}30`,
                    fontWeight: 750,
                    fontSize: '0.74rem',
                    padding: '3px 10px'
                  }}>
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

                {/* Contact Person */}
                {Boolean((selectedTaskForDetails.contactPersons && selectedTaskForDetails.contactPersons.length > 0) || (selectedTaskForDetails.contactPerson && selectedTaskForDetails.contactPerson.trim())) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} style={{ color: 'var(--accent-primary)' }} />
                      <span>Contact Person</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {selectedTaskForDetails.contactPersons && selectedTaskForDetails.contactPersons.length > 0
                        ? selectedTaskForDetails.contactPersons.map((cp) => (
                          <span key={cp} style={{ background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                            {cp}
                          </span>
                        ))
                        : selectedTaskForDetails.contactPerson}
                    </div>
                  </div>
                )}
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

              {/* Task Comments & Progress Updates Thread */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span>Task Comments & Progress Updates</span>
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
                      {((selectedTaskForDetails.commentsList?.length || 0) + (selectedTaskForDetails.comments ? 1 : 0))} updates
                    </span>
                    {((selectedTaskForDetails.commentsList?.length || 0) > 0 || selectedTaskForDetails.comments) && (
                      <button
                        type="button"
                        onClick={() => handleCopyAllComments(selectedTaskForDetails)}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 750,
                          color: isCopiedAllComments ? '#059669' : 'var(--accent-primary)',
                          background: isCopiedAllComments ? '#d1fae5' : 'rgba(59, 130, 246, 0.1)',
                          border: isCopiedAllComments ? '1px solid #10b98140' : '1px solid rgba(59, 130, 246, 0.25)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Copy full update history to clipboard"
                      >
                        {isCopiedAllComments ? <Check size={11} /> : <Copy size={11} />}
                        <span>{isCopiedAllComments ? 'Copied Updates!' : 'Copy Updates'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Thread of Comments */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {/* Initial Note if present */}
                  {selectedTaskForDetails.comments && (
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderLeft: '4px solid var(--accent-primary)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 750, color: 'var(--accent-primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                            Initial Note
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>From task creation</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyComment('initial', selectedTaskForDetails.comments!)}
                          style={{
                            fontSize: '0.7rem',
                            color: copiedCommentId === 'initial' ? '#059669' : 'var(--text-muted)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Copy note"
                        >
                          {copiedCommentId === 'initial' ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedCommentId === 'initial' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {selectedTaskForDetails.comments}
                      </div>
                    </div>
                  )}

                  {/* Comment List items */}
                  {selectedTaskForDetails.commentsList && selectedTaskForDetails.commentsList.length > 0 ? (
                    selectedTaskForDetails.commentsList.map((cmt, cIdx) => {
                      const cId = cmt._id || String(cIdx);
                      const isCopied = copiedCommentId === cId;
                      return (
                        <div
                          key={cId}
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                className="avatar"
                                style={{
                                  backgroundColor: cmt.author?.avatarColor || '#3b82f6',
                                  width: '24px',
                                  height: '24px',
                                  fontSize: '0.62rem',
                                  color: '#ffffff',
                                  flexShrink: 0
                                }}
                                title={cmt.author?.name}
                              >
                                {cmt.author?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                              </div>
                              <div>
                                <span style={{ fontSize: '0.82rem', fontWeight: 750, color: 'var(--text-primary)', marginRight: '6px' }}>
                                  {cmt.author?.name || 'Team Member'}
                                </span>
                                {cmt.author?.role && (
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                    {cmt.author.role}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {cmt.createdAt ? new Date(cmt.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyComment(cId, cmt.content)}
                                style={{
                                  fontSize: '0.7rem',
                                  color: isCopied ? '#059669' : 'var(--text-muted)',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                title="Copy comment"
                              >
                                {isCopied ? <Check size={11} /> : <Copy size={11} />}
                                <span>{isCopied ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.5', paddingLeft: '32px' }}>
                            {cmt.content}
                          </div>
                        </div>
                      );
                    })
                  ) : (!selectedTaskForDetails.comments && (
                    <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      No update comments yet. Add a progress update below.
                    </div>
                  ))}
                </div>

                {/* Add Comment Input Form */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 750, color: 'var(--text-primary)' }}>
                    <Plus size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span>Add Task Update / Comment</span>
                  </div>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Type a progress update, remark, or comment for this task..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    style={{ fontSize: '0.84rem', resize: 'vertical', background: 'var(--bg-primary)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status update:</span>
                      <select
                        value={newCommentStatus}
                        onChange={(e) => setNewCommentStatus(e.target.value)}
                        className="form-control"
                        style={{ fontSize: '0.75rem', padding: '4px 8px', height: 'auto', width: 'auto' }}
                      >
                        <option value="">Keep status ({selectedTaskForDetails.status})</option>
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Partially Completed">Partially Completed</option>
                        <option value="Review">Review</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddComment(selectedTaskForDetails._id)}
                      disabled={submittingComment || !newCommentText.trim()}
                      className="btn btn-primary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        opacity: (!newCommentText.trim() || submittingComment) ? 0.6 : 1
                      }}
                    >
                      {submittingComment ? <Loader2 className="animate-spin" size={13} /> : <MessageSquare size={13} />}
                      <span>Post Update</span>
                    </button>
                  </div>
                </div>
              </div>

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
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Work logged by you or teammates on this task will appear here.</p>
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
                              <div style={{ fontSize: '0.82rem', fontWeight: 750, color: 'var(--text-primary)' }}>
                                {session.employeeId?.name || 'Team Member'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {session.date ? new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="tag-badge" style={{
                              background: session.status === 'Completed' ? '#ecfdf5' : '#eff6ff',
                              color: session.status === 'Completed' ? '#047857' : '#1d4ed8',
                              border: session.status === 'Completed' ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px'
                            }}>
                              {session.status}
                            </span>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 750,
                              color: '#047857',
                              background: '#ecfdf5',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #a7f3d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Clock size={11} />
                              {session.startTime} {session.endTime ? `– ${session.endTime}` : ''}
                              {session.totalMinutes ? ` (${Math.floor(session.totalMinutes / 60)}h ${session.totalMinutes % 60}m)` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Session Notes */}
                        {session.notes && (
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-primary)',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              lineHeight: '1.5'
                            }}
                            dangerouslySetInnerHTML={{ __html: session.notes }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
