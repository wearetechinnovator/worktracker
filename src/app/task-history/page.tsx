'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Calendar, CheckSquare, AlertCircle, Filter } from 'lucide-react';
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterEmployee, filterStatus]);

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
  }, [filterDate, filterEmployee, filterStatus]);

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

  const ITEMS_PER_PAGE = 10;
  const paginatedRecords = records.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
            style={{ width: '150px', padding: '6px 10px', fontSize: '0.85rem' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          {(filterEmployee || filterStatus) && (
            <button
              onClick={() => {
                setFilterEmployee('');
                setFilterStatus('');
              }}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Records Table */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
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
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No records found for the selected filters
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record) => (
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
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '2px' }}>
                      {record.taskId.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {record.taskId.priority} • {record.taskId.status}
                    </div>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {renderPagination(records.length, ITEMS_PER_PAGE, currentPage, setCurrentPage)}

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
