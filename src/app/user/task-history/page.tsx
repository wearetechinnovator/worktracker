'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import {
  Clock,
  Calendar,
  CheckSquare,
  AlertCircle,
  Filter,
  Folder,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  X,
  FileText,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Clock4
} from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import { formatTimeTo12H } from '@/lib/time';

interface TaskWorkRecord {
  _id: string;
  taskId: {
    _id: string;
    task_id?: string;
    title: string;
    description?: string;
    priority?: string;
    task_status?: string;
    status?: string;
    project_id?: {
      _id: string;
      name: string;
      color?: string;
    };
  };
  employeeId: {
    _id: string;
    full_name?: string;
    name?: string;
    email?: string;
    profile_picture?: string;
    avatarColor?: string;
  };
  date: string;
  startTime: string;
  endTime?: string;
  totalMinutes?: number;
  status: 'In Progress' | 'Paused' | 'Completed';
  isFullyCompleted?: boolean;
  notes?: string;
  createdAt: string;
}

export default function UserTaskHistoryPage() {
  const [records, setRecords] = useState<TaskWorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterProject, setFilterProject] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Grouping State
  const [groupByTask, setGroupByTask] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Projects Options
  const [projectsList, setProjectsList] = useState<Array<{ _id: string; name: string; color?: string }>>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // View Details Modal
  const [selectedRecord, setSelectedRecord] = useState<TaskWorkRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch projects list for filter dropdown
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects', { credentials: 'include', cache: 'no-store' });
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.data)) {
          setProjectsList(json.data);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    }
    loadProjects();
  }, []);

  // Fetch logged-in employee task work records
  const loadRecords = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const params = new URLSearchParams({ limit: '1000' });
      if (filterDate) params.set('date', filterDate);
      if (filterProject !== 'All') params.set('projectId', filterProject);
      if (filterStatus !== 'All') params.set('status', filterStatus);

      const res = await fetch(`/api/task-work?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store'
      });

      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setRecords(json.data);
      } else {
        setRecords([]);
        if (!json.success && json.message) {
          setError(json.message);
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching work history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load work history');
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterDate, filterProject, filterStatus]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterDate, filterProject, filterStatus, groupByTask]);

  // Formatting Helpers
  const formatDuration = (minutes?: number): string => {
    if (minutes === undefined || minutes === null) return '-';
    if (minutes === 0) return '< 1m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatTimeDisplay = (timeStr?: string | Date | null): string => {
    if (!timeStr) return '-';
    return formatTimeTo12H(timeStr) || '-';
  };

  const formatDateDisplay = (dateStr?: string | Date | null): string => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(dateStr);
    }
  };

  const formatNotesHtml = (notes: string): string => {
    if (!notes) return '';
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    let formatted = notes.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); font-weight: 600; text-decoration: underline;">🔗 ${url}</a>`;
    });
    if (!/<[a-z][\s\S]*>/i.test(notes)) {
      formatted = formatted.replace(/\n/g, '<br/>');
    }
    return formatted;
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Search filter
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;

    return records.filter((r) => {
      const taskObj = r.taskId || ({} as any);
      const taskIdStr = taskObj.task_id || '';
      const taskTitle = taskObj.title || '';
      const notes = r.notes || '';
      const projName = taskObj.project_id?.name || '';

      return [taskIdStr, taskTitle, notes, projName].some((val) =>
        val.toLowerCase().includes(q)
      );
    });
  }, [records, search]);

  // Grouped items
  const displayItems = useMemo(() => {
    if (!groupByTask) return filteredRecords;

    const groups: Record<string, any> = {};
    filteredRecords.forEach((record) => {
      if (!record.taskId) return;
      const key = record.taskId._id || String(record.taskId);

      const projObj = record.taskId.project_id;
      const projectName = projObj ? projObj.name : 'General';
      const projectColor = projObj?.color || '#cbd5e1';

      if (!groups[key]) {
        groups[key] = {
          key,
          taskId: record.taskId,
          projectName,
          projectColor,
          totalTime: 0,
          latestDate: record.date,
          entries: [],
          hasActive: false,
          hasPaused: false
        };
      }

      if (record.status === 'Completed') {
        groups[key].totalTime += record.totalMinutes || 0;
      } else if (record.status === 'In Progress') {
        groups[key].hasActive = true;
      } else if (record.status === 'Paused') {
        groups[key].hasPaused = true;
      }

      if (new Date(record.date) > new Date(groups[key].latestDate)) {
        groups[key].latestDate = record.date;
      }

      groups[key].entries.push(record);
    });

    return Object.values(groups).sort(
      (a: any, b: any) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
  }, [filteredRecords, groupByTask]);

  const paginatedRecords = displayItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const clearFilters = () => {
    setSearch('');
    setFilterDate('');
    setFilterProject('All');
    setFilterStatus('All');
  };

  const hasActiveFilters = Boolean(
    search ||
      filterDate ||
      filterProject !== 'All' ||
      filterStatus !== 'All'
  );

  const totalMinutesAll = records
    .filter((r) => r.status === 'Completed')
    .reduce((sum, r) => sum + (r.totalMinutes || 0), 0);

  if (loading) {
    return <PageShimmer variant="history" />;
  }

  return (
    <div style={{ padding: 24, minHeight: '100%', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: '0 0 5px', fontSize: '1.45rem', fontWeight: 750, display: 'flex', alignItems: 'center', gap: 9 }}>
              <Clock size={23} style={{ color: 'var(--accent-primary)' }} /> My Work History
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '.84rem' }}>
              Review your logged work sessions, hours spent, and submission notes across your tasks.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={loadRecords}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: 18, background: '#fef2f2', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={18} style={{ color: '#ef4444' }} />
              <span style={{ fontWeight: 650, color: '#991b1b', fontSize: '.84rem' }}>{error}</span>
            </div>
          </div>
        )}

        {/* Stats Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
          <div className="card" style={{ padding: 15 }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock4 size={13} /> TOTAL SESSIONS
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {records.length}
            </div>
          </div>

          <div className="card" style={{ padding: 15 }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={13} /> TOTAL TIME LOGGED
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669' }}>
              {formatDuration(totalMinutesAll)}
            </div>
          </div>

          <div className="card" style={{ padding: 15 }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={13} /> COMPLETED SESSIONS
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10b981' }}>
              {records.filter((r) => r.status === 'Completed' && r.isFullyCompleted !== false).length}
            </div>
          </div>

          <div className="card" style={{ padding: 15 }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <PlayCircle size={13} /> ACTIVE / PAUSED
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f59e0b' }}>
              {records.filter((r) => r.status === 'In Progress' || r.status === 'Paused').length}
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="card" style={{ padding: 12, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Task ID (e.g. QT-2), title, notes..."
              style={{ paddingLeft: 38, height: 40 }}
            />
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => setShowFilters((v) => !v)}
            style={{
              height: 40,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: showFilters ? 'var(--bg-secondary)' : undefined,
              borderColor: showFilters ? 'var(--accent-primary)' : undefined
            }}
          >
            <Filter size={15} /> Filters {hasActiveFilters && '(Active)'}
          </button>

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: '0.82rem',
              fontWeight: 650,
              cursor: 'pointer',
              marginLeft: 'auto',
              userSelect: 'none'
            }}
          >
            <input
              type="checkbox"
              checked={groupByTask}
              onChange={(e) => setGroupByTask(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            Group by Task
          </label>

          {hasActiveFilters && (
            <button
              className="btn"
              onClick={clearFilters}
              style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#ef4444' }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="card" style={{ padding: 16, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 5 }}>
              DATE
              <input
                type="date"
                className="form-control"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ height: 38 }}
              />
            </label>

            <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 5 }}>
              PROJECT
              <select
                className="form-control"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                style={{ height: 38 }}
              >
                <option value="All">All Projects</option>
                {projectsList.map((proj) => (
                  <option key={proj._id} value={proj._id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 5 }}>
              STATUS
              <select
                className="form-control"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ height: 38 }}
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Paused">Paused</option>
                <option value="Partially Done">Partially Done</option>
              </select>
            </label>
          </div>
        )}

        {/* Data Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {displayItems.length === 0 ? (
            <div style={{ height: 320, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', padding: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <Clock size={36} style={{ strokeWidth: 1.5, marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>No work records found</div>
                <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {hasActiveFilters ? 'Try adjusting or clearing your filters' : 'Your work sessions will appear here as you log time on tasks'}
                </p>
                {hasActiveFilters && (
                  <button className="btn btn-secondary" onClick={clearFilters} style={{ marginTop: 10, fontSize: '.76rem' }}>
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={th}>TASK</th>
                    <th style={th}>PROJECT</th>
                    <th style={th}>DATE</th>
                    <th style={th}>TIME WINDOW</th>
                    <th style={{ ...th, textAlign: 'right' }}>DURATION</th>
                    <th style={th}>STATUS</th>
                    <th style={{ ...th, textAlign: 'center' }}>NOTES</th>
                    {groupByTask && <th style={{ ...th, width: 45, textAlign: 'center' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((item: any) => {
                    if (groupByTask) {
                      const group = item;
                      const isExpanded = expandedGroups.has(group.key);
                      const taskObj = group.taskId || {};

                      return (
                        <Fragment key={group.key}>
                          <tr
                            onClick={() => toggleGroup(group.key)}
                            style={{
                              borderTop: '1px solid var(--border-color)',
                              cursor: 'pointer',
                              background: isExpanded ? 'var(--bg-secondary)' : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            <td style={td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                {taskObj.task_id && (
                                  <span style={taskIdBadgeStyle}>
                                    {taskObj.task_id}
                                  </span>
                                )}
                                <b style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                                  {taskObj.title || 'Untitled Task'}
                                </b>
                              </div>
                            </td>

                            <td style={td}>
                              <span
                                style={{
                                  background: `${group.projectColor}15`,
                                  color: group.projectColor,
                                  border: `1px solid ${group.projectColor}35`,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: '.72rem',
                                  fontWeight: 650,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Folder size={11} /> {group.projectName}
                              </span>
                            </td>

                            <td style={td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}>
                                <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                                {formatDateDisplay(group.latestDate)}
                              </div>
                            </td>

                            <td style={{ ...td, color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                              {group.entries.length} logged sessions
                            </td>

                            <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.82rem' }}>
                              {formatDuration(group.totalTime)}
                            </td>

                            <td style={td}>
                              <span
                                style={{
                                  ...getStatusBadgeStyles(
                                    group.hasActive ? 'In Progress' : group.hasPaused ? 'Paused' : 'Completed'
                                  ),
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  display: 'inline-block'
                                }}
                              >
                                {group.hasActive ? 'In Progress' : group.hasPaused ? 'Paused' : 'Completed'}
                              </span>
                            </td>

                            <td style={{ ...td, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {group.entries.filter((e: any) => e.notes).length > 0 ? (
                                <span style={{ fontWeight: 600 }}>{group.entries.filter((e: any) => e.notes).length} with notes</span>
                              ) : (
                                '—'
                              )}
                            </td>

                            <td style={{ ...td, textAlign: 'center' }}>
                              {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </td>
                          </tr>

                          {/* Expanded Sub-sessions breakdown */}
                          {isExpanded && (
                            <tr key={group.key + '_expanded'}>
                              <td colSpan={8} style={{ padding: '12px 18px', background: 'var(--bg-secondary)' }}>
                                <div style={{ borderLeft: '3px solid var(--accent-primary)', paddingLeft: 14 }}>
                                  <div style={{ fontSize: '.7rem', fontWeight: 750, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 8 }}>
                                    Task Done ({group.entries.length})
                                  </div>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.76rem' }}>
                                    <thead>
                                      <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', height: 26 }}>
                                        <th style={{ textAlign: 'left', padding: '3px 6px' }}>Date</th>
                                        <th style={{ textAlign: 'left', padding: '3px 6px' }}>Time Window</th>
                                        <th style={{ textAlign: 'right', padding: '3px 6px' }}>Duration</th>
                                        <th style={{ textAlign: 'left', padding: '3px 6px', paddingLeft: 12 }}>Status</th>
                                        <th style={{ textAlign: 'center', padding: '3px 6px' }}>Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.entries.map((sub: any) => (
                                        <tr key={sub._id} style={{ borderBottom: '1px solid var(--border-color)', height: 32 }}>
                                          <td style={{ padding: '4px 6px' }}>{formatDateDisplay(sub.date)}</td>
                                          <td style={{ padding: '4px 6px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                            {formatTimeDisplay(sub.startTime)} - {sub.endTime ? formatTimeDisplay(sub.endTime) : (sub.status === 'Paused' ? 'Paused' : 'Active')}
                                          </td>
                                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 750, color: 'var(--accent-primary)' }}>
                                            {formatDuration(sub.totalMinutes)}
                                          </td>
                                          <td style={{ padding: '4px 6px', paddingLeft: 12 }}>
                                            <span
                                              style={{
                                                ...getStatusBadgeStyles(
                                                  sub.status === 'Completed'
                                                    ? sub.isFullyCompleted !== false
                                                      ? 'Completed'
                                                      : 'Partially Done'
                                                    : sub.status
                                                ),
                                                padding: '1px 6px',
                                                borderRadius: 4,
                                                fontSize: '0.68rem',
                                                fontWeight: 700
                                              }}
                                            >
                                              {sub.status === 'Completed'
                                                ? sub.isFullyCompleted !== false
                                                  ? 'Completed'
                                                  : 'Partially Done'
                                                : sub.status}
                                            </span>
                                          </td>
                                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                            {sub.notes ? (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedRecord(sub);
                                                  setShowDetailsModal(true);
                                                }}
                                                className="btn btn-secondary"
                                                style={{ padding: '2px 8px', fontSize: '.7rem' }}
                                              >
                                                View Notes
                                              </button>
                                            ) : (
                                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    }

                    const record = item as TaskWorkRecord;
                    const taskObj = record.taskId || ({} as any);
                    const projObj = taskObj.project_id;
                    const projName = projObj?.name || 'General';
                    const projColor = projObj?.color || '#3b82f6';

                    return (
                      <tr key={record._id} style={{ borderTop: '1px solid var(--border-color)' }}>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            {taskObj.task_id && (
                              <span style={taskIdBadgeStyle}>
                                {taskObj.task_id}
                              </span>
                            )}
                            <b style={{ fontSize: '.8rem', color: 'var(--text-primary)' }}>
                              {taskObj.title || 'Untitled Task'}
                            </b>
                          </div>
                          {taskObj.description && (
                            <div
                              style={{ fontSize: '.68rem', color: 'var(--text-muted)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              dangerouslySetInnerHTML={{ __html: taskObj.description }}
                            />
                          )}
                        </td>

                        <td style={td}>
                          <span
                            style={{
                              background: `${projColor}15`,
                              color: projColor,
                              border: `1px solid ${projColor}35`,
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '.72rem',
                              fontWeight: 650,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Folder size={11} /> {projName}
                          </span>
                        </td>

                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.78rem' }}>
                            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                            {formatDateDisplay(record.date)}
                          </div>
                        </td>

                        <td style={{ ...td, fontFamily: 'monospace', fontSize: '.76rem' }}>
                          <div>{formatTimeDisplay(record.startTime)}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '.7rem' }}>
                            {record.endTime ? formatTimeDisplay(record.endTime) : (record.status === 'Paused' ? 'Paused' : 'Ongoing')}
                          </div>
                        </td>

                        <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '.84rem' }}>
                          {formatDuration(record.totalMinutes)}
                        </td>

                        <td style={td}>
                          <span
                            style={{
                              ...getStatusBadgeStyles(
                                record.status === 'Completed'
                                  ? record.isFullyCompleted !== false
                                    ? 'Completed'
                                    : 'Partially Done'
                                  : record.status
                              ),
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 700,
                              fontSize: '.72rem',
                              display: 'inline-block'
                            }}
                          >
                            {record.status === 'Completed'
                              ? record.isFullyCompleted !== false
                                ? 'Completed'
                                : 'Partially Done'
                              : record.status}
                          </span>
                        </td>

                        <td style={{ ...td, textAlign: 'center' }}>
                          {record.notes ? (
                            <button
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowDetailsModal(true);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '3px 10px', fontSize: '.72rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <FileText size={12} /> Notes
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {renderPagination(displayItems.length, ITEMS_PER_PAGE, currentPage, setCurrentPage)}

        {/* Notes & Details Modal */}
        {showDetailsModal && selectedRecord && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'grid',
              placeItems: 'center',
              zIndex: 1000,
              padding: 20
            }}
            onClick={() => setShowDetailsModal(false)}
          >
            <div
              className="card"
              style={{
                maxWidth: 620,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: 24,
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 750, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckSquare size={18} style={{ color: 'var(--accent-primary)' }} /> Work Session Details
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="btn"
                  style={{ padding: 6, display: 'grid', placeItems: 'center', borderRadius: 6 }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Task Header Box */}
              <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  {selectedRecord.taskId?.task_id && (
                    <span style={taskIdBadgeStyle}>
                      {selectedRecord.taskId.task_id}
                    </span>
                  )}
                  <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                    {selectedRecord.taskId?.title || 'Task'}
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.8rem', marginTop: 10 }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Date</div>
                    <div style={{ fontWeight: 650 }}>
                      {formatDateDisplay(selectedRecord.date)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Time Range</div>
                    <div style={{ fontWeight: 650, fontFamily: 'monospace' }}>
                      {formatTimeDisplay(selectedRecord.startTime)} - {selectedRecord.endTime ? formatTimeDisplay(selectedRecord.endTime) : 'Active'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Duration</div>
                    <div style={{ fontWeight: 750, color: 'var(--accent-primary)' }}>
                      {formatDuration(selectedRecord.totalMinutes)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Status</div>
                    <div style={{ fontWeight: 650 }}>
                      {selectedRecord.status === 'Completed'
                        ? selectedRecord.isFullyCompleted !== false
                          ? 'Completed'
                          : 'Partially Done'
                        : selectedRecord.status}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedRecord.notes && (
                <div style={{ marginBottom: 18 }}>
                  <h4 style={{ fontSize: '.84rem', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Work Notes & Links
                  </h4>
                  <div
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: 16,
                      borderRadius: 8,
                      fontSize: '.82rem',
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                      border: '1px solid var(--border-color)'
                    }}
                    dangerouslySetInnerHTML={{ __html: formatNotesHtml(selectedRecord.notes) }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button onClick={() => setShowDetailsModal(false)} className="btn btn-primary" style={{ padding: '6px 18px', fontSize: '.82rem' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderPagination(totalItems: number, itemsPerPage: number, page: number, onPageChange: (p: number) => void) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        padding: '10px 16px',
        background: 'var(--bg-secondary)',
        borderRadius: 8,
        border: '1px solid var(--border-color)'
      }}
    >
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        Showing <strong>{Math.min(totalItems, (page - 1) * itemsPerPage + 1)}-{Math.min(totalItems, page * itemsPerPage)}</strong> of <strong>{totalItems}</strong> entries
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          style={{ padding: '4px 10px', fontSize: '0.74rem', opacity: page === 1 ? 0.5 : 1 }}
        >
          Previous
        </button>
        {Array.from({ length: totalPages }).map((_, i) => {
          const pageNum = i + 1;
          if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - page) <= 1) {
            return (
              <button
                key={pageNum}
                className={page === pageNum ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => onPageChange(pageNum)}
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
              >
                {pageNum}
              </button>
            );
          }
          if (pageNum === 2 || pageNum === totalPages - 1) {
            return (
              <span key={pageNum} style={{ color: 'var(--text-muted)', alignSelf: 'center', padding: '0 4px' }}>
                ...
              </span>
            );
          }
          return null;
        })}
        <button
          className="btn btn-secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          style={{ padding: '4px 10px', fontSize: '0.74rem', opacity: page === totalPages ? 0.5 : 1 }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '11px 14px',
  textAlign: 'left',
  fontSize: '.68rem',
  color: 'var(--text-muted)',
  letterSpacing: '0.5px'
};

const td: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: '.78rem',
  color: 'var(--text-primary)',
  verticalAlign: 'middle'
};

const taskIdBadgeStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  fontWeight: 750,
  color: 'var(--accent-primary)',
  background: 'var(--bg-secondary)',
  padding: '2px 7px',
  borderRadius: 4,
  border: '1px solid var(--border-color)',
  display: 'inline-block',
  fontFamily: 'monospace'
};

function getStatusBadgeStyles(statusName: string): React.CSSProperties {
  switch (statusName) {
    case 'Completed':
      return { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' };
    case 'In Progress':
      return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
    case 'Paused':
      return { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
    case 'Partially Done':
    case 'Partially Completed':
      return { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' };
    default:
      return { background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' };
  }
}
