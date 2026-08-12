'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, Calendar, Folder, Search, Printer, 
  Clock, AlertCircle, Loader2, Edit3, Trash2, Download
} from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/time';

interface Project {
  _id: string;
  name: string;
  color: string;
}

interface Employee {
  _id: string;
  name: string;
  role: string;
  avatarColor: string;
}

interface WorkEntry {
  _id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  employeeId: string;
  employeeName: string;
  employeeAvatarColor: string;
  employeeRole: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  actualTime: number;
  description?: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState('all'); // all, today, week, month, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals (For editing work logs direct from report)
  const [isEditLogOpen, setIsEditLogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkEntry | null>(null);
  const [logTitle, setLogTitle] = useState('');
  const [logEmpId, setLogEmpId] = useState('');
  const [logProjId, setLogProjId] = useState('');
  const [logDate, setLogDate] = useState('');
  const [logStart, setLogStart] = useState('09:00');
  const [logEnd, setLogEnd] = useState('17:00');
  const [logDesc, setLogDesc] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  // Check login session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(storedUser);
    if (parsed.userType !== 'admin') {
      router.push('/'); // Redirect employees to dashboard
      return;
    }

    setUser(parsed);
  }, [router]);

  // Fetch Projects & Employees lists (once)
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [projRes, empRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/employees')
        ]);
        const projData = await projRes.json();
        const empData = await empRes.json();
        
        if (projData.success) setProjects(projData.data);
        if (empData.success) setEmployees(empData.data);
      } catch (err) {
        console.error('Error loading report filters options', err);
      }
    }
    loadFilterOptions();
  }, []);

  // Fetch Filtered Entries
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build Query Params
      const params = new URLSearchParams();
      if (selectedProject) params.append('projectId', selectedProject);
      if (selectedEmployee) params.append('employeeId', selectedEmployee);
      if (searchQuery) params.append('search', searchQuery);

      // Handle date filters
      let resolvedStart = '';
      let resolvedEnd = '';

      if (dateRangePreset !== 'all') {
        const today = new Date();
        const formatDate = (d: Date) => {
          const yr = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const dy = String(d.getDate()).padStart(2, '0');
          return `${yr}-${mo}-${dy}`;
        };

        if (dateRangePreset === 'today') {
          resolvedStart = formatDate(today);
          resolvedEnd = formatDate(today);
        } else if (dateRangePreset === 'week') {
          const lastWeek = new Date();
          lastWeek.setDate(today.getDate() - 7);
          resolvedStart = formatDate(lastWeek);
          resolvedEnd = formatDate(today);
        } else if (dateRangePreset === 'month') {
          const lastMonth = new Date();
          lastMonth.setDate(today.getDate() - 30);
          resolvedStart = formatDate(lastMonth);
          resolvedEnd = formatDate(today);
        } else if (dateRangePreset === 'custom') {
          resolvedStart = startDate;
          resolvedEnd = endDate;
        }

        if (resolvedStart) params.append('startDate', resolvedStart);
        if (resolvedEnd) params.append('endDate', resolvedEnd);
      }

      const res = await fetch(`/api/work?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate report.');
      }

      setEntries(data.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating report.');
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedEmployee, dateRangePreset, startDate, endDate, searchQuery]);

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user, fetchReportData]);

  // Handle Edit Log Direct From Report
  const openEditModal = (log: WorkEntry) => {
    setEditingLog(log);
    setLogTitle(log.title);
    setLogEmpId(log.employeeId);
    setLogProjId(log.projectId);
    setLogDate(log.date);
    setLogStart(log.startTime);
    setLogEnd(log.endTime);
    setLogDesc(log.description || '');
    setIsEditLogOpen(true);
  };

  const handleEditLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !logProjId || !logEmpId || !logTitle.trim() || !logDate || !logStart || !logEnd) return;

    try {
      setSavingLog(true);
      const res = await fetch(`/api/work/${editingLog._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: logProjId,
          employeeId: logEmpId,
          title: logTitle,
          date: logDate,
          startTime: logStart,
          endTime: logEnd,
          description: logDesc,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to update work entry');

      setIsEditLogOpen(false);
      setEditingLog(null);
      await fetchReportData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingLog(false);
    }
  };

  // Handle Delete Log
  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this work log?')) return;

    try {
      const res = await fetch(`/api/work/${logId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete');

      await fetchReportData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // CSV Export Helper
  const handleExportCSV = () => {
    if (entries.length === 0) return alert('No records to export!');
    
    const csvHeaders = ['Date', 'Employee', 'Role', 'Department', 'Task Title', 'Description', 'Duration (mins)', 'Duration (formatted)'];
    
    const csvRows = entries.map(entry => {
      const durationFormatted = formatMinutesToDuration(entry.actualTime);
      return [
        entry.date,
        `"${entry.employeeName.replace(/"/g, '""')}"`,
        `"${entry.employeeRole.replace(/"/g, '""')}"`,
        `"${entry.projectName.replace(/"/g, '""')}"`,
        `"${entry.title.replace(/"/g, '""')}"`,
        `"${(entry.description || '').replace(/"/g, '""')}"`,
        entry.actualTime,
        durationFormatted
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `worktracker_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Export Helper (TSV representation compatible with MS Excel)
  const handleExportExcel = () => {
    if (entries.length === 0) return alert('No records to export!');

    const headers = ['Date', 'Employee', 'Role', 'Department', 'Task Title', 'Description', 'Duration (mins)', 'Duration (formatted)'];
    
    const rows = entries.map(entry => {
      const durationFormatted = formatMinutesToDuration(entry.actualTime);
      return [
        entry.date,
        entry.employeeName,
        entry.employeeRole,
        entry.projectName,
        entry.title,
        entry.description || '',
        entry.actualTime,
        durationFormatted
      ].join('\t');
    });

    const excelContent = [headers.join('\t'), ...rows].join('\n');
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `worktracker_report_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.actualTime, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const averageMins = entries.length > 0 ? Math.round(totalMinutes / entries.length) : 0;

  const projectTimeMap: Record<string, { minutes: number; color: string; name: string }> = {};
  entries.forEach((entry) => {
    if (!projectTimeMap[entry.projectId]) {
      projectTimeMap[entry.projectId] = {
        minutes: 0,
        color: entry.projectColor || '#475569',
        name: entry.projectName,
      };
    }
    projectTimeMap[entry.projectId].minutes += entry.actualTime;
  });

  const projectDistribution = Object.values(projectTimeMap).sort((a, b) => b.minutes - a.minutes);

  return (
    <div>
      {/* Print Header */}
      <div className="print-header">
        <h1>WorkTracker - Executive Summary Report</h1>
        <p>Generated: {new Date().toLocaleString()}</p>
        <p>
          Filters: {selectedProject ? `Project: ${projects.find((p) => p._id === selectedProject)?.name}` : 'All Projects'}
          {' | '}
          Employee: {selectedEmployee ? `Employee: ${employees.find((e) => e._id === selectedEmployee)?.name}` : 'All Employees'}
          {' | '}
          Range: {dateRangePreset.toUpperCase()} {dateRangePreset === 'custom' ? `(${startDate} to ${endDate})` : ''}
        </p>
      </div>

      {/* Main Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }} className="no-print">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Work Reports</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Generate comprehensive logs, filter by members, and export spreadsheet sheets.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={14} />
            <span>CSV</span>
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel}>
            <Download size={14} />
            <span>Excel</span>
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={14} />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Filters Form */}
      <div className="card no-print" style={{ marginBottom: '20px' }}>
        <h3 className="card-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Filter Criteria</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Project / Department</label>
            <select 
              className="form-control"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Employee</label>
            <select 
              className="form-control"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Timeframe</label>
            <select 
              className="form-control"
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Search Keyword</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-control"
                style={{ paddingLeft: '28px' }}
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {dateRangePreset === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', maxWidth: '400px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Start Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">End Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p>{error}</p>
        </div>
      )}

      {/* Aggregate Stats Cards */}
      <div className="grid-stats">
        <div className="card stat-card">
          <div className="stat-icon-wrapper" style={{ color: 'var(--accent-primary)', background: '#eff6ff' }}>
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalHours}h</span>
            <span className="stat-label">Total Duration</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon-wrapper" style={{ color: '#10b981', background: '#ecfdf5' }}>
            <FileText size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{entries.length}</span>
            <span className="stat-label">Total Logs</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon-wrapper" style={{ color: '#f59e0b', background: '#fffbeb' }}>
            <Printer size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatMinutesToDuration(averageMins)}</span>
            <span className="stat-label">Avg Session</span>
          </div>
        </div>
      </div>

      {/* Time Allocation chart */}
      {projectDistribution.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 className="card-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Department Time Distributions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {projectDistribution.map((proj) => {
              const pct = totalMinutes > 0 ? Math.round((proj.minutes / totalMinutes) * 100) : 0;
              return (
                <div key={proj.name} className="chart-bar-row">
                  <div className="chart-bar-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 650 }}>{proj.name}</span>
                    <span>{formatMinutesToDuration(proj.minutes)} ({pct}%)</span>
                  </div>
                  <div className="chart-bar-outer" style={{ background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                    <div 
                      className="chart-bar-inner" 
                      style={{ 
                        width: `${pct}%`, 
                        backgroundColor: proj.color,
                        height: '100%',
                        borderRadius: '4px'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '10px' }}>Detailed Records ({entries.length})</h3>

        {loading && entries.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : entries.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px', fontSize: '0.8rem' }}>
            No records found matching filters.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Date</th>
                  <th style={{ width: '150px' }}>Employee</th>
                  <th style={{ width: '140px' }}>Department</th>
                  <th>Log Description</th>
                  <th style={{ width: '100px' }}>Time Frame</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Tracked</th>
                  <th style={{ width: '70px' }} className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id}>
                    <td>{entry.date}</td>
                    <td>
                      <div className="avatar-wrapper">
                        <div className="avatar" style={{ backgroundColor: entry.employeeAvatarColor, width: '24px', height: '24px', fontSize: '0.65rem' }}>
                          {entry.employeeName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span style={{ fontWeight: 700 }}>{entry.employeeName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="tag-badge" style={{ backgroundColor: `${entry.projectColor}15`, color: entry.projectColor, borderColor: `${entry.projectColor}30` }}>
                        {entry.projectName}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{entry.title}</div>
                      {entry.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {entry.description}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {entry.startTime} - {entry.endTime}
                    </td>
                    <td style={{ fontWeight: 750, color: 'var(--accent-primary)', textAlign: 'right' }}>
                      {formatMinutesToDuration(entry.actualTime)}
                    </td>
                    <td className="no-print">
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button className="action-btn" title="Edit Log" onClick={() => openEditModal(entry)}>
                          <Edit3 size={12} />
                        </button>
                        <button className="action-btn btn-delete-item" title="Delete Log" onClick={() => handleDeleteLog(entry._id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT WORK SESSION MODAL */}
      {isEditLogOpen && (
        <div className="modal-overlay" onClick={() => {
          setIsEditLogOpen(false);
          setEditingLog(null);
        }} style={{ zIndex: 2000 }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Edit Task Log</h3>
              <button className="modal-close" onClick={() => {
                setIsEditLogOpen(false);
                setEditingLog(null);
              }}>&times;</button>
            </div>
            <form onSubmit={handleEditLogSubmit}>
              <div className="form-group">
                <label className="form-label">Department / Project *</label>
                <select 
                  className="form-control"
                  required
                  value={logProjId}
                  onChange={(e) => setLogProjId(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Logging Member *</label>
                <select 
                  className="form-control"
                  required
                  value={logEmpId}
                  onChange={(e) => setLogEmpId(e.target.value)}
                >
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">What work was performed? *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time *</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    required
                    value={logStart}
                    onChange={(e) => setLogStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time *</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    required
                    value={logEnd}
                    onChange={(e) => setLogEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Session Notes (Optional)</label>
                <textarea 
                  className="form-control" 
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setIsEditLogOpen(false);
                  setEditingLog(null);
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingLog}>
                  {savingLog ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
