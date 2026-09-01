'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, CheckCircle2, User, Loader2, AlertCircle,
  Download, RefreshCw, MapPin, Globe, Clock, SlidersHorizontal, Search
} from 'lucide-react';
import EmployeeAttendanceCalendarModal from '@/components/EmployeeAttendanceCalendarModal';
import PageShimmer from '@/components/PageShimmer';

interface AttendanceLog {
  _id: string;
  date: string;
  status: 'Present' | 'Absent' | 'On Leave';
  employeeId: {
    _id: string;
    name: string;
    role: string;
    avatarColor: string;
    Project: string;
  } | null;
  checkIn: string | null;
  checkOut: string | null;
  checkInIpAddress?: string | null;
  checkInLocation?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutIpAddress?: string | null;
  checkOutLocation?: string | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
}

export default function AttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Data State
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [datePreset, setDatePreset] = useState('This Month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Calendar Modal state
  const [selectedEmpForCalendar, setSelectedEmpForCalendar] = useState<any | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Authenticate user
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(storedUser);
    setUser(parsed);

    // Set preset dates for "This Month"
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = today.toISOString().split('T')[0];
    setCustomStartDate(firstDay);
    setCustomEndDate(lastDay);
  }, [router]);

  // Fetch all employees for filter dropdown
  const loadEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Fetch punch logs with filters
  const loadPunchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterEmployeeId) params.set('filterEmployeeId', filterEmployeeId);
      if (filterStatus) params.set('filterStatus', filterStatus);

      // Handle Date Presets
      const today = new Date();
      let start = '';
      let end = today.toISOString().split('T')[0];

      if (datePreset === 'Today') {
        start = end;
      } else if (datePreset === 'Yesterday') {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        start = yesterday.toISOString().split('T')[0];
        end = start;
      } else if (datePreset === 'This Week') {
        const currentDay = today.getDay();
        const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // start on Monday
        const monday = new Date(today.setDate(diff));
        start = monday.toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
      } else if (datePreset === 'This Month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      } else if (datePreset === 'Custom') {
        start = customStartDate;
        end = customEndDate;
      }

      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);

      const res = await fetch(`/api/attendance?` + params.toString());
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to load punch logs');

      setLogs(result.data || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while fetching punch logs.');
    } finally {
      setLoading(false);
    }
  }, [filterEmployeeId, filterStatus, datePreset, customStartDate, customEndDate]);

  useEffect(() => {
    if (user) {
      loadEmployees();
    }
  }, [user, loadEmployees]);

  useEffect(() => {
    if (user) {
      loadPunchLogs();
    }
  }, [user, loadPunchLogs]);

  // Export to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      'Date', 'Employee Name', 'Role', 'Department', 'Status',
      'Check In Time', 'Check In IP', 'Check In Location',
      'Check Out Time', 'Check Out IP', 'Check Out Location'
    ];

    const rows = logs.map(log => [
      log.date,
      log.employeeId?.name || 'Unknown',
      log.employeeId?.role || '—',
      log.employeeId?.Project || '—',
      log.status,
      log.checkIn || '—',
      log.checkInIpAddress || '—',
      log.checkInLocation || '—',
      log.checkOut || '—',
      log.checkOutIpAddress || '—',
      log.checkOutLocation || '—'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `punch_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ITEMS_PER_PAGE = 10;
  const paginatedLogs = logs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

  if (loading && logs.length === 0) {
    return <PageShimmer variant="attendance" />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{user?.userType === 'admin' ? 'Punch In/Out Logs' : 'Attendance'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            {user?.userType === 'admin'
              ? 'Inspect historical employee daily punch sessions, IP addresses, location and override authorizations.'
              : 'Inspect your historical daily attendance and punch sessions.'}
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          style={{ gap: '8px' }}
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p style={{ fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {/* Side-by-side Layout Wrapper */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>

        {/* Left Side: Filtration Panel */}
        <div className="card" style={{ flex: '1 1 280px', maxWidth: '320px', padding: '16px', margin: 0, position: 'sticky', top: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <SlidersHorizontal size={14} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0 }}>Filter Punch Sessions</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Employee filter */}
            {user?.userType === 'admin' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>Employee</label>
                <select
                  className="form-control"
                  style={{ fontSize: '0.78rem', padding: '6px 10px', width: '100%' }}
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                >
                  <option value="">All Employees</option>
                  {employees.map((emp: any) => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>Status</label>
              <select
                className="form-control"
                style={{ fontSize: '0.78rem', padding: '6px 10px', width: '100%' }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>

            {/* Date range presets */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>Date Range Preset</label>
              <select
                className="form-control"
                style={{ fontSize: '0.78rem', padding: '6px 10px', width: '100%' }}
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Custom">Custom Date Range</option>
              </select>
            </div>

            {/* Custom Date Inputs */}
            {datePreset === 'Custom' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ fontSize: '0.78rem', padding: '5px 10px', width: '100%' }}
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ fontSize: '0.78rem', padding: '5px 10px', width: '100%' }}
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '7px 12px', fontSize: '0.75rem', flex: 1 }}
                onClick={() => {
                  setFilterEmployeeId('');
                  setFilterStatus('');
                  setDatePreset('This Month');
                  const today = new Date();
                  setCustomStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
                  setCustomEndDate(today.toISOString().split('T')[0]);
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '7px 12px', fontSize: '0.75rem', gap: '6px', flex: 1, justifyContent: 'center' }}
                onClick={loadPunchLogs}
              >
                <Search size={12} />
                <span>Apply</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Main logs sheet */}
        <div className="card" style={{ flex: '1 1 600px', margin: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 className="card-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>Punch Records ({logs.length})</h3>
          </div>

          {logs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
              No punch sessions found matching active filtration criteria.
            </p>
          ) : (
            <div>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '110px' }}>Date</th>
                      {user?.userType === 'admin' && (
                        <>
                          <th style={{ minWidth: '200px' }}>Employee</th>
                          <th style={{ minWidth: '130px' }}>Department</th>
                          <th style={{ minWidth: '140px' }}>Job Role</th>
                        </>
                      )}
                      <th style={{ minWidth: '110px' }}>Status</th>
                      <th style={{ minWidth: '180px' }}>Check In</th>
                      <th style={{ minWidth: '180px' }}>Check Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log) => {
                      const cleanLocation = (locStr?: string | null) => {
                        if (!locStr) return null;
                        let s = locStr.trim();
                        if (s.startsWith('Location :')) {
                          s = s.replace(/^Location\s*:\s*/i, '').trim();
                        }
                        if (!s || s === 'Location :' || s === 'Location:' || s.toLowerCase() === 'device geolocation required') {
                          return null;
                        }
                        return s;
                      };

                      let statusBadge = (
                        <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '20px', background: '#dcfce7', color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
                          Present
                        </span>
                      );
                      if (log.status === 'Absent') {
                        statusBadge = (
                          <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '20px', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
                            Absent
                          </span>
                        );
                      } else if (log.status === 'On Leave') {
                        statusBadge = (
                          <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '20px', background: '#ffedd5', color: '#c2410c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316' }}></span>
                            On Leave
                          </span>
                        );
                      }

                      const cleanCheckInLoc = cleanLocation(log.checkInLocation);
                      const cleanCheckOutLoc = cleanLocation(log.checkOutLocation);

                      return (
                        <tr key={log._id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {log.date}
                          </td>
                          {user?.userType === 'admin' && (
                            <>
                              <td>
                                {log.employeeId ? (
                                  <div
                                    className="employee-cell-link"
                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                                    title="Click to view monthly attendance calendar"
                                    onClick={() => {
                                      setSelectedEmpForCalendar({
                                        _id: log.employeeId?._id,
                                        name: log.employeeId?.name,
                                        email: '',
                                        role: log.employeeId?.role,
                                        Project: log.employeeId?.Project,
                                        avatarColor: log.employeeId?.avatarColor,
                                      });
                                      setIsCalendarOpen(true);
                                    }}
                                  >
                                    <div
                                      className="avatar"
                                      style={{
                                        backgroundColor: log.employeeId.avatarColor || '#3b82f6',
                                        width: '32px',
                                        height: '32px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        borderRadius: '50%',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                                        flexShrink: 0
                                      }}
                                    >
                                      {log.employeeId.name.split(' ').map((n) => n[0]).join('')}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div className="employee-name-hover" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.84rem', lineHeight: '1.2' }}>
                                        {log.employeeId.name}
                                      </div>
                                      <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <span>Monthly Details</span>
                                        <Calendar size={10} />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>Deleted Employee</span>
                                )}
                              </td>
                              <td>
                                {log.employeeId ? (
                                  <span className="tag-badge">
                                    {log.employeeId.Project}
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                                {log.employeeId?.role || '—'}
                              </td>
                            </>
                          )}
                          <td>{statusBadge}</td>
                          <td>
                            {log.checkIn ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Clock size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                                  <span>{log.checkIn}</span>
                                </div>
                                {log.checkInIpAddress && (
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Globe size={11} style={{ flexShrink: 0 }} />
                                    <span>{log.checkInIpAddress}</span>
                                  </span>
                                )}
                                {cleanCheckInLoc && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      color: 'var(--text-secondary)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      maxWidth: '180px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                    title={log.checkInLocation || undefined}
                                  >
                                    <MapPin size={11} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {cleanCheckInLoc.split(',').slice(0, 2).join(',')}
                                    </span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                          <td>
                            {log.checkOut ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Clock size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                                  <span>{log.checkOut}</span>
                                </div>
                                {log.checkOutIpAddress && (
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Globe size={11} style={{ flexShrink: 0 }} />
                                    <span>{log.checkOutIpAddress}</span>
                                  </span>
                                )}
                                {cleanCheckOutLoc && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      color: 'var(--text-secondary)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      maxWidth: '180px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                    title={log.checkOutLocation || undefined}
                                  >
                                    <MapPin size={11} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {cleanCheckOutLoc.split(',').slice(0, 2).join(',')}
                                    </span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {renderPagination(logs.length, ITEMS_PER_PAGE, currentPage, setCurrentPage)}
            </div>
          )}
        </div>
      </div>

      {/* MONTHLY CALENDAR DETAIL MODAL */}
      <EmployeeAttendanceCalendarModal
        employee={selectedEmpForCalendar}
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
      />
    </div>
  );
}
