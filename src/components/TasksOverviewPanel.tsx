'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Pause,
  Play,
  Calendar,
  Flame,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  CheckSquare,
} from 'lucide-react';
import './TasksOverviewPanel.css';
import CustomSelect, { SelectOption } from './CustomSelect';
import { taskApi } from '@/lib/taskApi';
import TaskDetailsModal, { TaskDetailsTask } from './TaskDetailsModal';
import EndWorkSessionModal from './EndWorkSessionModal';

export type Task = {
  _id: string;
  title: string;
  description?: string;
  status?: string;
  task_status?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  projectId?: { _id: string; name: string; color: string };
  assignedTo?: Array<{ _id: string; name: string; email?: string; avatarColor?: string }>;
  files?: Array<{ name: string; url: string; size?: number; type?: string }>;
  urls?: string[];
  url?: string;
  createdAt?: string;
  created_on?: string;
  dueDate?: string;
  completion_date?: string;
  task_assign_date?: string | Date | null;
};

type TaskWork = {
  _id: string;
  taskId: string | { _id: string };
  status: 'In Progress' | 'Paused' | 'Completed';
  isFullyCompleted?: boolean;
  employeeId?: string | { _id: string };
};

export const statusTabs = ['All', 'In Progress', 'On Review', 'Completed', 'To Do'] as const;
export type StatusTab = (typeof statusTabs)[number];

const idOf = (value: string | { _id: string } | undefined) =>
  typeof value === 'object' && value ? value._id : value;

function extractTaskDate(task: Task): Date | null {
  const val =
    task.dueDate ||
    task.completion_date ||
    task.task_assign_date ||
    task.createdAt ||
    task.created_on;
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface TasksOverviewPanelProps {
  onStatsChange?: (stats: {
    total: number;
    inProgress: number;
    onReview: number;
    completed: number;
    urgent: number;
    todo: number;
  }) => void;
  className?: string;
}

export default function TasksOverviewPanel({
  onStatsChange,
  className = '',
}: TasksOverviewPanelProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>('In Progress');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskWorks, setTaskWorks] = useState<TaskWork[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [dayOfWeekFilter, setDayOfWeekFilter] = useState<string>('all');
  const [urgentOnly, setUrgentOnly] = useState<boolean>(false);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination State - Strictly 5 tasks max per page!
  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal States
  const [selectedTask, setSelectedTask] = useState<TaskDetailsTask | null>(null);
  const [showEndWorkDialog, setShowEndWorkDialog] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [completionTaskId, setCompletionTaskId] = useState<string | null>(null);
  const [workNotes, setWorkNotes] = useState('');
  const [workLinks, setWorkLinks] = useState('');
  const [workFiles, setWorkFiles] = useState<Array<{ name: string; url: string; size?: number; type?: string }>>([]);
  const [completionStatus, setCompletionStatus] = useState<'partial' | 'full'>('full');

  const prevStatsRef = useRef<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });
      const userResult = await userResponse.json();
      const currentUserId = userResult.success ? String(userResult.user?._id || '') : '';

      if (!userResponse.ok || !currentUserId) {
        throw new Error(userResult.message || 'Unable to load your tasks');
      }

      const [taskData, workResult] = await Promise.all([
        taskApi.fetchTasksApi(),
        taskApi.getTaskWork({ employeeId: currentUserId }),
      ]);
      setUserId(currentUserId);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setTaskWorks(workResult?.success && Array.isArray(workResult.data) ? workResult.data : []);
    } catch (err) {
      console.error('Failed to load task overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const activeWorkFor = useCallback(
    (taskId: string) =>
      taskWorks.find(
        (work) =>
          idOf(work.taskId) === taskId &&
          idOf(work.employeeId) === userId &&
          (work.status === 'In Progress' || work.status === 'Paused')
      ),
    [taskWorks, userId]
  );

  const completedByUser = useCallback(
    (taskId: string) =>
      taskWorks.some(
        (work) =>
          idOf(work.taskId) === taskId &&
          idOf(work.employeeId) === userId &&
          work.status === 'Completed' &&
          work.isFullyCompleted
      ),
    [taskWorks, userId]
  );

  // Compute Task Stats & Notify Parent
  const stats = useMemo(() => {
    let inProgress = 0;
    let onReview = 0;
    let completed = 0;
    let urgent = 0;
    let todo = 0;

    tasks.forEach((t) => {
      const status = t.task_status || t.status || 'To Do';
      const isComp = status === 'Completed' || completedByUser(t._id);
      const isRev = status === 'Review' || status === 'On Review';
      const isInProg =
        !isComp &&
        !isRev &&
        (status === 'In Progress' ||
          status === 'Partially Done' ||
          status === 'Partially Completed' ||
          Boolean(activeWorkFor(t._id)));

      if (isComp) completed++;
      else if (isRev) onReview++;
      else if (isInProg) inProgress++;
      else todo++;

      if (t.priority === 'Urgent') urgent++;
    });

    return {
      total: tasks.length,
      inProgress,
      onReview,
      completed,
      urgent,
      todo,
    };
  }, [tasks, completedByUser, activeWorkFor]);

  useEffect(() => {
    const statsStr = JSON.stringify(stats);
    if (prevStatsRef.current !== statsStr) {
      prevStatsRef.current = statsStr;
      onStatsChange?.(stats);
    }
  }, [stats, onStatsChange]);

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (val: 'all' | 'today' | 'yesterday' | 'this_week' | 'custom') => {
    setDateFilter(val);
    setCurrentPage(1);
  };

  const handleCustomDateChange = (val: string) => {
    setCustomDate(val);
    setCurrentPage(1);
  };

  const handleDayOfWeekChange = (val: string) => {
    setDayOfWeekFilter(val);
    setCurrentPage(1);
  };

  const handleUrgentToggle = () => {
    setUrgentOnly((prev) => !prev);
    setCurrentPage(1);
  };

  const handlePriorityFilterChange = (val: string) => {
    setPriorityFilter(val);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setDateFilter('all');
    setCustomDate('');
    setDayOfWeekFilter('all');
    setUrgentOnly(false);
    setPriorityFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Status Filter
      const status = task.task_status || task.status || 'To Do';
      const isComp = status === 'Completed' || completedByUser(task._id);
      const isRev = status === 'Review' || status === 'On Review';
      const isInProg =
        !isComp &&
        !isRev &&
        (status === 'In Progress' ||
          status === 'Partially Done' ||
          status === 'Partially Completed' ||
          Boolean(activeWorkFor(task._id)));
      const isTodo = !isComp && !isRev && !isInProg;

      if (activeTab === 'In Progress') {
        if (!isInProg) return false;
      } else if (activeTab === 'On Review') {
        if (!isRev) return false;
      } else if (activeTab === 'Completed') {
        if (!isComp) return false;
      } else if (activeTab === 'To Do') {
        if (!isTodo) return false;
      }

      // 2. Urgent / Priority Filter
      const priority = task.priority || 'Medium';
      if (urgentOnly && priority !== 'Urgent') {
        return false;
      }
      if (priorityFilter !== 'all' && priority !== priorityFilter) {
        return false;
      }

      // 3. Date Filter
      const taskDate = extractTaskDate(task);
      if (dateFilter !== 'all') {
        if (!taskDate) return false;
        const taskDateStr = toLocalDateString(taskDate);

        if (dateFilter === 'today') {
          const todayStr = toLocalDateString(new Date());
          if (taskDateStr !== todayStr) return false;
        } else if (dateFilter === 'yesterday') {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          const yesterdayStr = toLocalDateString(y);
          if (taskDateStr !== yesterdayStr) return false;
        } else if (dateFilter === 'this_week') {
          const now = new Date();
          const dayOfWeek = now.getDay();
          const diffToMonday = (dayOfWeek + 6) % 7;
          const monday = new Date(now);
          monday.setDate(now.getDate() - diffToMonday);
          monday.setHours(0, 0, 0, 0);

          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);

          if (taskDate < monday || taskDate > sunday) return false;
        } else if (dateFilter === 'custom' && customDate) {
          if (taskDateStr !== customDate) return false;
        }
      }

      // 4. Day of Week Filter
      if (dayOfWeekFilter !== 'all') {
        if (!taskDate) return false;
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const taskDay = days[taskDate.getDay()];
        if (taskDay !== dayOfWeekFilter) return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchDesc = task.description ? task.description.toLowerCase().includes(query) : false;
        const matchProj = task.projectId?.name ? task.projectId.name.toLowerCase().includes(query) : false;
        if (!matchTitle && !matchDesc && !matchProj) return false;
      }

      return true;
    });
  }, [
    tasks,
    activeTab,
    completedByUser,
    activeWorkFor,
    urgentOnly,
    priorityFilter,
    dateFilter,
    customDate,
    dayOfWeekFilter,
    searchQuery,
  ]);

  // Strict 5-Task Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const displayedTasks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, currentPage]);

  const handleStartOrPause = async (task: Task) => {
    const activeWork = activeWorkFor(task._id);
    const action = activeWork?.status === 'Paused' ? 'resume' : activeWork ? 'pause' : 'start';
    try {
      setProcessingId(task._id);
      const result =
        action === 'start'
          ? await taskApi.startTaskWork({ taskId: task._id, employeeId: userId })
          : action === 'pause'
            ? await taskApi.pauseTaskWork({ taskId: task._id, workId: activeWork?._id, employeeId: userId })
            : await taskApi.resumeTaskWork({ taskId: task._id, workId: activeWork?._id, employeeId: userId });
      if (!result.success) throw new Error(result.message || `Failed to ${action} work`);
      await loadData();
    } catch (err) {
      console.error(`Failed to ${action} task work:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${action} task`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleWorkAction = async (task: Task, option: SelectOption) => {
    const activeWork = activeWorkFor(task._id);
    if (option === 'Complete' || option === 'Partially Complete') {
      const work = activeWorkFor(task._id);
      if (!work) return;
      setCompletionTaskId(task._id);
      setSelectedWorkId(work._id);
      setCompletionStatus(option === 'Complete' ? 'full' : 'partial');
      setWorkNotes('');
      setWorkLinks('');
      setWorkFiles([]);
      setShowEndWorkDialog(true);
      return;
    }

    try {
      setProcessingId(task._id);
      const result =
        option === 'Start'
          ? await taskApi.startTaskWork({ taskId: task._id, employeeId: userId })
          : option === 'Pause'
            ? activeWork
              ? await taskApi.pauseTaskWork({ taskId: task._id, workId: activeWork._id, employeeId: userId })
              : null
            : activeWork
              ? await taskApi.endTaskWork(activeWork._id, { isFullyCompleted: option === 'Complete' })
              : null;
      if (!result) return;
      if (!result.success) throw new Error(result.message || `Failed to ${option.toLowerCase()} task`);
      await loadData();
    } catch (err) {
      console.error(`Failed to ${option.toLowerCase()} task:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${option.toLowerCase()} task`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleWorkFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const converted = await Promise.all(
      files.map(
        (file) =>
          new Promise<{ name: string; url: string; size: number; type: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                url: String(reader.result || ''),
                size: file.size,
                type: file.type || 'application/octet-stream',
              });
            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
            reader.readAsDataURL(file);
          })
      )
    );
    setWorkFiles((previous) => [...previous, ...converted]);
    event.target.value = '';
  };

  const closeEndWorkDialog = () => {
    if (processingId) return;
    setShowEndWorkDialog(false);
    setSelectedWorkId(null);
    setCompletionTaskId(null);
    setWorkNotes('');
    setWorkLinks('');
    setWorkFiles([]);
    setCompletionStatus('full');
  };

  const handleEndWork = async () => {
    if (!selectedWorkId) return;
    if (completionStatus === 'partial' && !workNotes.replace(/<[^>]*>/g, '').trim()) {
      setError('Please provide a reason before marking the task as partially complete.');
      return;
    }

    try {
      setProcessingId(completionTaskId);
      const result = await taskApi.endTaskWork(selectedWorkId, {
        notes: workNotes.trim() || undefined,
        links: workLinks.split(/\n|,/).map((link) => link.trim()).filter(Boolean),
        files: workFiles,
        isFullyCompleted: completionStatus === 'full',
      });
      if (!result.success) {
        throw new Error(result.message || 'Failed to end work');
      }
      setShowEndWorkDialog(false);
      setSelectedWorkId(null);
      setCompletionTaskId(null);
      setWorkNotes('');
      setWorkLinks('');
      setWorkFiles([]);
      setCompletionStatus('full');
      await loadData();
    } catch (err) {
      console.error('Failed to end task work:', err);
      setError(err instanceof Error ? err.message : 'Failed to end work');
    } finally {
      setProcessingId(null);
    }
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTask({
      ...task,
      priority: task.priority || 'Medium',
      status: (task.task_status || task.status || 'To Do') as TaskDetailsTask['status'],
    });
  };

  const hasActiveFilters =
    dateFilter !== 'all' ||
    dayOfWeekFilter !== 'all' ||
    urgentOnly ||
    priorityFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const formatTaskDateInfo = (task: Task) => {
    const d = extractTaskDate(task);
    if (!d) return null;
    const todayStr = toLocalDateString(new Date());
    const taskDateStr = toLocalDateString(d);
    const isToday = taskDateStr === todayStr;

    const y = new Date();
    y.setDate(y.getDate() - 1);
    const isYesterday = taskDateStr === toLocalDateString(y);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const taskDateMidnight = new Date(d);
    taskDateMidnight.setHours(0, 0, 0, 0);
    const isOverdue =
      taskDateMidnight < now &&
      task.task_status !== 'Completed' &&
      !completedByUser(task._id);

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

    let label = `${dayName}, ${formattedDate}`;
    if (isToday) label = `Today (${dayName})`;
    else if (isYesterday) label = `Yesterday (${dayName})`;

    return { label, isToday, isOverdue };
  };

  return (
    <div
      className={className}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 20,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '24px 24px 20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckSquare size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, margin: 0 }}>Your Tasks</h2>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, marginTop: 2 }}>
              Showing max 5 tasks per page • {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          title="Refresh task list"
          style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid #e2e8f0', color: '#64748b', backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <RefreshCw size={14} style={{ color: loading ? '#2563eb' : '#64748b' }} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Segmented Status Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '5px',
          overflowX: 'auto',
        }}
      >
        {statusTabs.map((tab) => {
          const count =
            tab === 'All'
              ? stats.total
              : tab === 'In Progress'
                ? stats.inProgress
                : tab === 'On Review'
                  ? stats.onReview
                  : tab === 'Completed'
                    ? stats.completed
                    : stats.todo;

          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              style={{
                flex: 1,
                minWidth: 64,
                padding: '7px 8px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: isActive ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.15s',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#2563eb' : '#64748b',
                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab}</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: '20px',
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: isActive ? '#eff6ff' : '#e2e8f0',
                  color: isActive ? '#2563eb' : '#64748b',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Row 1: Search & Urgent Quick-Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search tasks by title or project..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 32,
              paddingRight: searchQuery ? 30 : 12,
              paddingTop: 9,
              paddingBottom: 9,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 12.5,
              color: '#334155',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* 1-Click Urgent Priority Toggle */}
        <button
          type="button"
          onClick={handleUrgentToggle}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 10,
            border: urgentOnly ? '1px solid #ef4444' : '1px solid #e2e8f0',
            backgroundColor: urgentOnly ? '#ef4444' : '#ffffff',
            color: urgentOnly ? '#ffffff' : '#475569',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Toggle Urgent Priority tasks"
        >
          <Flame size={13} style={{ color: urgentOnly ? '#ffffff' : '#ef4444' }} />
          <span>Urgent</span>
          {stats.urgent > 0 && (
            <span
              style={{
                padding: '1px 6px',
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: urgentOnly ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                color: urgentOnly ? '#ffffff' : '#b91c1c',
              }}
            >
              {stats.urgent}
            </span>
          )}
        </button>
      </div>

      {/* Filter Row 2: Date-wise, Day-wise, Priority dropdowns & Reset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Date Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '7px 11px' }}>
          <Calendar size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <select
            value={dateFilter}
            onChange={(e) => handleDateFilterChange(e.target.value as any)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: '#475569', cursor: 'pointer' }}
          >
            <option value="all">Date: All</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="custom">Pick Date...</option>
          </select>
        </div>

        {/* Custom Date Input (shown if 'custom' is picked) */}
        {dateFilter === 'custom' && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => handleCustomDateChange(e.target.value)}
            style={{ background: '#fff', border: '1px solid #3b82f6', borderRadius: 9, padding: '6px 10px', fontSize: 12, color: '#334155', outline: 'none' }}
          />
        )}

        {/* Day-of-Week Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '7px 11px' }}>
          <Clock size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <select
            value={dayOfWeekFilter}
            onChange={(e) => handleDayOfWeekChange(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: '#475569', cursor: 'pointer' }}
          >
            <option value="all">Day: All</option>
            <option value="Mon">Mon</option>
            <option value="Tue">Tue</option>
            <option value="Wed">Wed</option>
            <option value="Thu">Thu</option>
            <option value="Fri">Fri</option>
            <option value="Sat">Sat</option>
            <option value="Sun">Sun</option>
          </select>
        </div>

        {/* Priority Dropdown */}
        {!urgentOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '7px 11px' }}>
            <Filter size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <select
              value={priorityFilter}
              onChange={(e) => handlePriorityFilterChange(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: '#475569', cursor: 'pointer' }}
            >
              <option value="all">Priority: All</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        )}

        {/* Clear Filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
          >
            <X size={11} /> Reset
          </button>
        )}
      </div>

      {/* Task List (Strictly max 5 items per page - Sleek Compact Card) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 240 }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
            <Loader2 className="animate-spin text-blue-600" size={24} />
            <p className="text-xs">Loading your tasks...</p>
          </div>
        ) : error ? (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <p>{error}</p>
          </div>
        ) : displayedTasks.length > 0 ? (
          displayedTasks.map((task) => {
            const dateInfo = formatTaskDateInfo(task);
            const isUrgent = task.priority === 'Urgent';
            const status = task.task_status || task.status || 'To Do';
            const activeWork = activeWorkFor(task._id);
            const isCompleted = status === 'Completed' || completedByUser(task._id);
            const isReview = status === 'Review' || status === 'On Review';

            return (
              <div
                key={task._id}
                style={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  borderLeft: isUrgent
                    ? '3px solid #ef4444'
                    : isCompleted
                      ? '3px solid #10b981'
                      : isReview
                        ? '3px solid #8b5cf6'
                        : activeWork
                          ? '3px solid #3b82f6'
                          : '3px solid #cbd5e1',
                  backgroundColor: isUrgent ? '#fff5f5' : '#ffffff',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Line 1: Title (clickable) + Action Controls on the right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => openTaskDetails(task)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    title="Click to view details & comments"
                  >
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.4,
                      }}
                    >
                      {task.title}
                    </div>
                  </button>

                  {/* Work Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <div style={{ width: 90 }}>
                      <CustomSelect
                        options={activeWork ? undefined : ['Start']}
                        disabled={processingId === task._id}
                        onSelect={(option) => void handleWorkAction(task, option)}
                      />
                    </div>

                    <button
                      type="button"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: processingId === task._id ? 'not-allowed' : 'pointer',
                        opacity: processingId === task._id ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                      onClick={() => void handleStartOrPause(task)}
                      disabled={processingId === task._id}
                      aria-label={
                        activeWork?.status === 'Paused' ? 'Resume task' : activeWork ? 'Pause task' : 'Start task'
                      }
                    >
                      {processingId === task._id ? (
                        <Loader2 className="animate-spin" size={13} />
                      ) : activeWork?.status === 'Paused' ? (
                        <Play size={13} />
                      ) : activeWork ? (
                        <Pause size={13} />
                      ) : (
                        <Play size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Line 2: Badges row (project, priority, status) + date on far right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                  {/* Project Tag */}
                  {task.projectId?.name ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11.5,
                        fontWeight: 500,
                        color: '#475569',
                        backgroundColor: '#f1f5f9',
                        borderRadius: 6,
                        padding: '3px 8px',
                        maxWidth: 110,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          backgroundColor: task.projectId.color || '#3b82f6',
                          flexShrink: 0,
                          display: 'inline-block',
                        }}
                      />
                      {task.projectId.name}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#94a3b8',
                        backgroundColor: '#f8fafc',
                        borderRadius: 6,
                        padding: '1px 7px',
                        flexShrink: 0,
                      }}
                    >
                      General
                    </span>
                  )}

                  {/* Priority Badge */}
                  {isUrgent ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b91c1c',
                        backgroundColor: '#fee2e2',
                        borderRadius: 6,
                        padding: '1px 7px',
                        flexShrink: 0,
                      }}
                    >
                      🔥 Urgent
                    </span>
                  ) : task.priority === 'High' ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#b45309', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '1px 7px', flexShrink: 0 }}>
                      High
                    </span>
                  ) : task.priority === 'Low' ? (
                    <span style={{ fontSize: 11, color: '#64748b', backgroundColor: '#f1f5f9', borderRadius: 6, padding: '1px 7px', flexShrink: 0 }}>
                      Low
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#1d4ed8', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '1px 7px', flexShrink: 0 }}>
                      Medium
                    </span>
                  )}

                  {/* Status Badge */}
                  {isReview ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '1px 7px', flexShrink: 0 }}>
                      On Review
                    </span>
                  ) : isCompleted ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#065f46', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, padding: '1px 7px', flexShrink: 0 }}>
                      Completed
                    </span>
                  ) : activeWork ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e40af', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '1px 7px', flexShrink: 0 }}>
                      {activeWork.status === 'Paused' ? 'Paused' : 'In Progress'}
                    </span>
                  ) : (status === 'Partially Done' || status === 'Partially Completed') ? (
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#92400e', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '1px 7px', flexShrink: 0 }}>
                      Partial
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#475569', backgroundColor: '#f1f5f9', borderRadius: 6, padding: '1px 7px', flexShrink: 0 }}>
                      {status}
                    </span>
                  )}

                  {/* Spacer then Date */}
                  <span style={{ flex: 1 }} />
                  {dateInfo && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: dateInfo.isToday ? 600 : 400,
                        color: dateInfo.isOverdue ? '#dc2626' : dateInfo.isToday ? '#2563eb' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Calendar size={11} />
                      {dateInfo.label}
                      {dateInfo.isOverdue && <span style={{ fontWeight: 700 }}> ⚠</span>}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <CheckSquare size={32} className="text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700">No tasks found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {hasActiveFilters
                ? 'Try adjusting or clearing your date, priority, or status filters.'
                : `No tasks in ${activeTab}.`}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-blue-600 hover:bg-slate-50"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Bar (Strict limit of 5 tasks per page) */}
      {filteredTasks.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 16, fontSize: 12, color: '#64748b' }}>
          <div>
            Showing <span style={{ fontWeight: 700, color: '#0f172a' }}>{(currentPage - 1) * PAGE_SIZE + 1}</span>-
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              {Math.min(currentPage * PAGE_SIZE, filteredTasks.length)}
            </span>{' '}
            of <span style={{ fontWeight: 700, color: '#0f172a' }}>{filteredTasks.length}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #e2e8f0', color: '#475569', backgroundColor: '#fff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.4 : 1, display: 'flex', alignItems: 'center' }}
              title="Previous 5 tasks"
            >
              <ChevronLeft size={15} />
            </button>

            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', padding: '0 6px' }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #e2e8f0', color: '#475569', backgroundColor: '#fff', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center' }}
              title="Next 5 tasks"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          sessions={[]}
          loadingSessions={false}
          user={{ _id: userId, id: userId, name: 'User', user_role: 2 }}
          newCommentText=""
          newCommentStatus=""
          submittingComment={false}
          copiedCommentId={null}
          copiedUrlIndex={null}
          isCopiedAllComments={false}
          isCopiedAllUrls={false}
          isDownloadingZip={false}
          onClose={() => setSelectedTask(null)}
          onAddComment={() => undefined}
          onCommentChange={() => undefined}
          onCommentStatusChange={() => undefined}
          onCopyComment={() => undefined}
          onCopyAllComments={() => undefined}
          onCopyUrl={() => undefined}
          onCopyAllUrls={() => undefined}
          onViewFile={(file) => window.open(file.url, '_blank', 'noopener,noreferrer')}
          onDownloadFile={(file) => window.open(file.url, '_blank', 'noopener,noreferrer')}
          onDownloadAllFiles={() => undefined}
        />
      )}

      {/* End Work Session Modal */}
      <EndWorkSessionModal
        isOpen={showEndWorkDialog}
        completionStatus={completionStatus}
        onCompletionStatusChange={setCompletionStatus}
        notes={workNotes}
        onNotesChange={setWorkNotes}
        links={workLinks}
        onLinksChange={setWorkLinks}
        files={workFiles}
        onFilesChange={handleWorkFilesChange}
        onRemoveFile={(index) => setWorkFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))}
        onCancel={closeEndWorkDialog}
        onSubmit={() => void handleEndWork()}
        loading={Boolean(processingId)}
      />
    </div>
  );
}
