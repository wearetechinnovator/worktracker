'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Calendar, CheckSquare, AlertCircle, Filter, Folder, ChevronDown, ChevronRight } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';

interface TaskWorkRecord {
  _id: string;
  taskId: {
    _id: string;
    title: string;
    description?: string;
    priority: string;
    status: string;
  };
  employeeId: {
    _id: string;
    name: string;
    avatarColor: string;
  };
  date: string;
  startTime: string;
  endTime?: string;
  totalMinutes?: number;
  status: 'In Progress' | 'Completed';
  notes?: string;
  createdAt: string;
}

export default function TaskHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ userType?: string } | null>(null);
  const [records, setRecords] = useState<TaskWorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [projects, setProjects] = useState<any[]>([]);

  // Grouping State
  const [groupByTask, setGroupByTask] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterEmployee, filterStatus, filterProject, groupByTask]);

  // View Details Modal
  const [selectedRecord, setSelectedRecord] = useState<TaskWorkRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);
      let url = '/api/task-work?';
      
      if (filterDate) url += `date=${filterDate}&`;
      if (filterEmployee) url += `employeeId=${filterEmployee}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterProject) url += `projectId=${filterProject}&`;

      const res = await fetch(url);
      const result = await res.json();
      
      if (!result.success) throw new Error(result.error);
      
      setRecords(result.data);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterEmployee, filterStatus, filterProject]);

  // Authenticate
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(storedUser);
    const timer = setTimeout(() => {
      setUser(parsed);
      // Default to today
      setFilterDate(new Date().toISOString().split('T')[0]);
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  // Load data
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        loadRecords();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, loadRecords]);

  // Load Projects for Filter
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (data.success) {
          setProjects(data.data);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    }
    if (user) {
      loadProjects();
    }
  }, [user]);

  const formatDuration = (minutes?: number): string => {
    if (minutes === undefined || minutes === null) return '-';
    if (minutes === 0) return '< 1m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

  // Toggle Group Expand/Collapse
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Group records by taskId._id
  const displayItems = useMemo(() => {
    if (!groupByTask) return records;

    const groups: Record<string, any> = {};
    records.forEach((record) => {
      if (!record.taskId) return;
      const key = record.taskId._id;
      
      const projObj = (record.taskId as any).projectId;
      const projectName = projObj ? projObj.name : ((record.taskId as any).Project || 'General');
      const projectColor = projObj ? projObj.color : '#cbd5e1';

      if (!groups[key]) {
        groups[key] = {
          key,
          taskId: record.taskId,
          projectName,
          projectColor,
          totalTime: 0,
          latestDate: record.date,
          employeeNames: [],
          entries: [],
        };
      }

      if (record.status === 'Completed') {
        groups[key].totalTime += record.totalMinutes || 0;
      }

      if (new Date(record.date) > new Date(groups[key].latestDate)) {
        groups[key].latestDate = record.date;
      }

      if (record.employeeId && !groups[key].employeeNames.includes(record.employeeId.name)) {
        groups[key].employeeNames.push(record.employeeId.name);
      }

      groups[key].entries.push(record);
    });

    return Object.values(groups).sort((a: any, b: any) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  }, [records, groupByTask]);

  const ITEMS_PER_PAGE = 10;
  const paginatedRecords = displayItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

  const getTotalHours = (): string => {
    const total = records
      .filter(r => r.status === 'Completed')
      .reduce((sum, r) => sum + (r.totalMinutes || 0), 0);
    return formatDuration(total);
  };

  const getUniqueEmployees = (): Array<{ _id: string; name: string }> => {
    const map = new Map();
    records.forEach(r => {
      if (!map.has(r.employeeId._id)) {
        map.set(r.employeeId._id, r.employeeId.name);
      }
    });
    return Array.from(map, ([_id, name]) => ({ _id, name }));
  };

  if (loading) {
    return <PageShimmer variant="history" />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={28} style={{ color: 'var(--accent-primary)' }} />
          Task Work History
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          View all task work sessions and time tracking records
        </p>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '20px', background: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle style={{ color: '#ef4444' }} />
            <p style={{ fontWeight: 600, color: '#991b1b' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Total Sessions
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            {records.length}
          </div>
        </div>
        
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Completed
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
            {records.filter(r => r.status === 'Completed').length}
          </div>
        </div>
        
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            In Progress
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>
            {records.filter(r => r.status === 'In Progress').length}
          </div>
        </div>
        
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Total Time
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            {getTotalHours()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <strong style={{ fontSize: '0.85rem' }}>Filters:</strong>
          </div>

          <div>
            <input
              type="date"
              className="form-control"
              style={{ width: '160px', padding: '6px 10px', fontSize: '0.85rem' }}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {user?.userType === 'admin' && (
            <select
              className="form-control"
              style={{ width: '180px', padding: '6px 10px', fontSize: '0.85rem' }}
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
            >
              <option value="">All Employees</option>
              {getUniqueEmployees().map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                </option>
              ))}
            </select>
          )}

          <select
            className="form-control"
            style={{ width: '180px', padding: '6px 10px', fontSize: '0.85rem' }}
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((proj) => (
              <option key={proj._id} value={proj._id}>
                {proj.name}
              </option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ width: '150px', padding: '6px 10px', fontSize: '0.85rem' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          {(filterEmployee || filterStatus || filterProject) && (
            <button
              onClick={() => {
                setFilterEmployee('');
                setFilterStatus('');
                setFilterProject('');
              }}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Clear
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 650, cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={groupByTask}
                onChange={(e) => setGroupByTask(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
              />
              Group by Task Title
            </label>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Project</th>
              <th>Task</th>
              <th>Date</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th style={{ textAlign: 'right' }}>Duration</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No records found for the selected filters
                </td>
              </tr>
            ) : (
              paginatedRecords.map((item: any) => {
                if (groupByTask) {
                  const group = item;
                  const isExpanded = expandedGroups.has(group.key);
                  return (
                    <Fragment key={group.key}>
                      <tr
                        onClick={() => toggleGroup(group.key)}
                        style={{ cursor: 'pointer', background: isExpanded ? 'var(--bg-tertiary)' : 'transparent' }}
                      >
                        <td>
                          <span style={{ fontWeight: 650, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            took by {group.employeeNames.length} {group.employeeNames.length === 1 ? 'member' : 'members'}
                          </span>
                        </td>
                        <td>
                          <span className="tag-badge" style={{ backgroundColor: `${group.projectColor}15`, color: group.projectColor, borderColor: `${group.projectColor}30` }}>
                            {group.projectName}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{group.taskId.title}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                            {new Date(group.latestDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Multiple</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Multiple</td>
                        <td style={{ textAlign: 'right', fontWeight: 750, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                          {formatDuration(group.totalTime)}
                        </td>
                        <td>
                          <span className="tag-badge" style={{
                            background: group.status === 'Completed' ? '#ecfdf5' : group.status === 'In Progress' ? '#eff6ff' : '#f1f5f9',
                            color: group.status === 'Completed' ? '#065f46' : group.status === 'In Progress' ? '#1d4ed8' : '#475569',
                            fontSize: '0.7rem',
                            padding: '3px 10px',
                            border: `1px solid ${group.status === 'Completed' ? '#10b98130' : group.status === 'In Progress' ? '#3b82f630' : '#cbd5e130'}`,
                          }}>
                            {group.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="action-btn"
                            style={{ border: 'none', background: 'transparent', display: 'inline-flex', padding: '4px' }}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={group.key + '_expanded'} className="expanded-row-details">
                          <td colSpan={11} style={{ padding: '10px 18px', background: 'var(--bg-tertiary)' }}>
                            <div style={{ borderLeft: '3px solid var(--accent-primary)', paddingLeft: '16px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '12px' }}>
                              <h4 style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', color: 'var(--text-muted)' }}>Session Breakdowns</h4>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', height: '28px' }}>
                                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Date</th>
                                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Employee</th>
                                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Time Frame</th>
                                    <th style={{ textAlign: 'right', padding: '4px 6px' }}>Duration</th>
                                    <th style={{ textAlign: 'left', padding: '4px 6px', paddingLeft: '12px' }}>Status</th>
                                    <th style={{ textAlign: 'center', padding: '4px 6px', width: '120px' }}>Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.entries.map((subEntry: any) => (
                                    <tr key={subEntry._id} style={{ borderBottom: '1px solid var(--border-color)', height: '32px' }}>
                                      <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{new Date(subEntry.date).toLocaleDateString()}</td>
                                      <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <div className="avatar" style={{ backgroundColor: subEntry.employeeId.avatarColor, width: '18px', height: '18px', fontSize: '0.55rem' }}>
                                            {subEntry.employeeId.name.split(' ').map((n: string) => n[0]).join('')}
                                          </div>
                                          <span style={{ fontWeight: 600 }}>{subEntry.employeeId.name}</span>
                                        </div>
                                      </td>
                                      <td style={{ padding: '4px 6px', color: 'var(--text-secondary)' }}>{subEntry.startTime} - {subEntry.endTime || 'Active'}</td>
                                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                        {formatDuration(subEntry.totalMinutes)}
                                      </td>
                                      <td style={{ padding: '4px 6px', paddingLeft: '12px' }}>
                                        <span className="tag-badge" style={{
                                          background: subEntry.status === 'Completed' ? '#ecfdf5' : '#fef3c7',
                                          color: subEntry.status === 'Completed' ? '#065f46' : '#92400e',
                                          fontSize: '0.66rem',
                                          padding: '2px 6px',
                                        }}>
                                          {subEntry.status}
                                        </span>
                                      </td>
                                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                        {subEntry.notes ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedRecord(subEntry);
                                              setShowDetailsModal(true);
                                            }}
                                            className="btn btn-secondary"
                                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                          >
                                            View Notes
                                          </button>
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)' }}>-</span>
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
                return (
                  <tr key={record._id}>
                    <td>
                      <div className="avatar-wrapper">
                        <div
                          className="avatar"
                          style={{
                            backgroundColor: record.employeeId.avatarColor,
                            width: '28px',
                            height: '28px',
                            fontSize: '0.7rem',
                          }}
                        >
                          {record.employeeId.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                            {record.employeeId.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {record.taskId && (record.taskId as any).projectId ? (
                        <span className="tag-badge" style={{
                          backgroundColor: `${((record.taskId as any).projectId as any).color || '#3b82f6'}15`,
                          color: ((record.taskId as any).projectId as any).color || '#3b82f6',
                          borderColor: `${((record.taskId as any).projectId as any).color || '#3b82f6'}30`,
                          fontSize: '0.72rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Folder size={10} style={{ color: ((record.taskId as any).projectId as any).color || '#3b82f6' }} />
                          {((record.taskId as any).projectId as any).name}
                        </span>
                      ) : record.taskId && (record.taskId as any).Project ? (
                        <span className="tag-badge" style={{ backgroundColor: '#cbd5e120', color: 'var(--text-secondary)', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Folder size={10} />
                          {(record.taskId as any).Project}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '2px' }}>
                        {record.taskId.title}
                      </div>
                      {record.taskId.description && (
                        <div
                          style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}
                          dangerouslySetInnerHTML={{ __html: record.taskId.description }}
                        />
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                        {new Date(record.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {record.startTime}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {record.endTime || '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}>
                      {formatDuration(record.totalMinutes)}
                    </td>
                    <td>
                      <span
                        className="tag-badge"
                        style={{
                          background: record.status === 'Completed' ? '#ecfdf5' : '#fef3c7',
                          color: record.status === 'Completed' ? '#065f46' : '#92400e',
                          fontSize: '0.7rem',
                          padding: '3px 10px',
                          border: `1px solid ${record.status === 'Completed' ? '#10b98130' : '#f59e0b30'}`,
                        }}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td>
                      {record.notes ? (
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowDetailsModal(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                        >
                          View Notes
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {renderPagination(displayItems.length, ITEMS_PER_PAGE, currentPage, setCurrentPage)}

      {/* Details Modal */}
      {showDetailsModal && selectedRecord && (
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
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Work Session Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="btn"
                style={{ padding: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Task Info */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CheckSquare size={18} style={{ color: 'var(--accent-primary)' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedRecord.taskId.title}</h4>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', marginTop: '12px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '2px' }}>Employee</div>
                  <div style={{ fontWeight: 600 }}>{selectedRecord.employeeId.name}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '2px' }}>Date</div>
                  <div style={{ fontWeight: 600 }}>{new Date(selectedRecord.date).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '2px' }}>Time</div>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {selectedRecord.startTime} - {selectedRecord.endTime || 'Ongoing'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '2px' }}>Duration</div>
                  <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {formatDuration(selectedRecord.totalMinutes)}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {selectedRecord.notes && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>
                  Work Notes & Links
                </h4>
                <div 
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    lineHeight: '1.6',
                    wordBreak: 'break-word',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                  dangerouslySetInnerHTML={{ __html: formatNotesHtml(selectedRecord.notes) }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
