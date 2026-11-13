'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  Phone,
  Briefcase,
  User,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  ListFilter,
} from 'lucide-react';
import {
  exportAttendanceToCSV,
  exportAttendanceToExcel,
  ExportEmployeeData,
} from '@/lib/attendanceExport';

export interface EmployeeModalEmployee {
  _id: string;
  name?: string;
  full_name?: string;
  email?: string;
  phone_number?: string | number | null;
  designation?: string | null;
  role?: string | null;
  role_id?: { name?: string; short_desc?: string } | null;
  Project?: string | null;
  project?: string | null;
  group?: string | null;
  avatarColor?: string | null;
  profile_picture?: string | null;
  status?: string | boolean | null;
  workMode?: string | null;
  createdAt?: string | null;
}

interface Props {
  employee: EmployeeModalEmployee | null;
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EmployeeDetailsModal({ employee, isOpen, onClose }: Props) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11

  // Filter mode: 'month' | 'range' | 'single'
  const [filterMode, setFilterMode] = useState<'month' | 'range' | 'single'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [singleDate, setSingleDate] = useState<string>('');

  // View mode inside right pane: 'calendar' | 'table'
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');

  // Attendance data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<ExportEmployeeData | null>(null);
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([0]);
  const [saturdayOffRule, setSaturdayOffRule] = useState<'none' | 'every' | '2nd_4th' | 'alternate'>('none');

  // Initialize dates
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      setSelectedYear(today.getFullYear());
      setSelectedMonth(today.getMonth());

      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayFormatted = `${y}-${m}-${d}`;

      setStartDate(`${y}-${m}-01`);
      const lastDay = new Date(y, today.getMonth() + 1, 0).getDate();
      setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
      setSingleDate(todayFormatted);
    }
  }, [isOpen]);

  // Fetch attendance report
  const fetchReport = useCallback(async () => {
    if (!employee || !isOpen) return;

    try {
      setLoading(true);
      setError(null);

      let query = `?employeeId=${encodeURIComponent(employee._id)}`;

      if (filterMode === 'month') {
        const monthFormatted = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
        query += `&month=${monthFormatted}`;
      } else if (filterMode === 'single' && singleDate) {
        query += `&date=${singleDate}`;
      } else if (filterMode === 'range' && startDate && endDate) {
        query += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(`/api/attendance/report${query}`, { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to fetch attendance records');
      }

      if (Array.isArray(json.data?.weeklyOffDays)) {
        setWeeklyOffDays(json.data.weeklyOffDays);
      }

      if (json.data?.saturdayOffRule) {
        setSaturdayOffRule(json.data.saturdayOffRule);
      }

      if (json.data?.employees?.length > 0) {
        setEmployeeData(json.data.employees[0]);
      } else {
        setEmployeeData(null);
      }
    } catch (err: any) {
      console.error('Error fetching employee report:', err);
      setError(err?.message || 'Error loading attendance details.');
      setEmployeeData(null);
    } finally {
      setLoading(false);
    }
  }, [employee, isOpen, filterMode, selectedYear, selectedMonth, startDate, endDate, singleDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Calendar Day Generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    const days: Array<{
      dayNum: number | null;
      dateStr: string | null;
      record: any | null;
    }> = [];

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: null, dateStr: null, record: null });
    }

    const recordsMap = new Map<string, any>();
    if (employeeData?.records) {
      for (const rec of employeeData.records) {
        recordsMap.set(rec.date, rec);
      }
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateStr,
        record: recordsMap.get(dateStr) || null,
      });
    }

    return days;
  }, [selectedYear, selectedMonth, employeeData]);

  // Export handlers
  const handleExportCSV = () => {
    if (!employeeData) return;
    const sDate =
      filterMode === 'month'
        ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
        : filterMode === 'single'
        ? singleDate
        : startDate;
    const eDate =
      filterMode === 'month'
        ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`
        : filterMode === 'single'
        ? singleDate
        : endDate;

    exportAttendanceToCSV({
      startDate: sDate,
      endDate: eDate,
      employees: [employeeData],
      weeklyOffDays,
      saturdayOffRule,
    });
  };

  const handleExportExcel = () => {
    if (!employeeData) return;
    const sDate =
      filterMode === 'month'
        ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
        : filterMode === 'single'
        ? singleDate
        : startDate;
    const eDate =
      filterMode === 'month'
        ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`
        : filterMode === 'single'
        ? singleDate
        : endDate;

    exportAttendanceToExcel({
      startDate: sDate,
      endDate: eDate,
      employees: [employeeData],
      weeklyOffDays,
      saturdayOffRule,
    });
  };

  if (!isOpen || !employee) return null;

  const employeeName =
    employeeData?.full_name ||
    employee.full_name ||
    employee.name ||
    'Employee';

  const employeeEmail = employeeData?.email || employee.email || '--';
  const employeePhone = employeeData?.phone_number || (employee.phone_number ? String(employee.phone_number) : '--');
  const employeeDesignation = employeeData?.designation || employee.designation || 'Employee';
  const employeeRole = employeeData?.role || employee.role || 'Team Member';
  const employeeWorkMode = employeeData?.workMode || employee.workMode || 'Hybrid';
  const employeeProject = employeeData?.project || employee.Project || employee.project || 'General';

  const initials = employeeName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const summary = employeeData?.summary || {
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    weekendDays: 0,
    formattedTotalHours: '0h 0m',
    formattedAverageHours: '0h 0m',
  };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-primary, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1180px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* ====================================================
            MODAL HEADER
        ==================================================== */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}
            >
              {initials}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                {employeeName}
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>
                {employeeDesignation} &bull; <span style={{ color: 'var(--accent-primary, #2563eb)' }}>{employeeProject}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              width: '32px',
              height: '32px',
              padding: 0,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ====================================================
            MODAL BODY (SPLIT LAYOUT)
        ==================================================== */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
            flexDirection: 'row',
          }}
          className="modal-split-body"
        >
          {/* --------------------------------------------------
              LEFT COLUMN: EMPLOYEE DETAILS & QUICK DOWNLOAD
          -------------------------------------------------- */}
          <div
            style={{
              width: '320px',
              minWidth: '300px',
              borderRight: '1px solid var(--border-color, #e2e8f0)',
              background: 'var(--bg-secondary, #f8fafc)',
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* Profile Avatar Card */}
            <div
              style={{
                background: 'var(--bg-primary, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                  color: '#ffffff',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
                }}
              >
                {initials}
              </div>
              <h3 style={{ margin: '0 0 2px', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {employeeName}
              </h3>
              <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {employeeDesignation}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '999px',
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  Active Employee
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '999px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  {employeeWorkMode}
                </span>
              </div>
            </div>

            {/* Contact Details Section */}
            <div
              style={{
                background: 'var(--bg-primary, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contact & Assignment
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Email</div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {employeeEmail}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Phone</div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {employeePhone}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Briefcase size={14} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Assigned Project</div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {employeeProject}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Role / Group</div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {employeeRole} {employeeData?.group ? `(${employeeData.group})` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Performance Summary */}
            <div
              style={{
                background: 'var(--bg-primary, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Period Summary
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '8px 10px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#047857' }}>Present</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 850, color: '#065f46' }}>{summary.presentDays}</div>
                </div>

                <div style={{ padding: '8px 10px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#b91c1c' }}>Absent</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 850, color: '#991b1b' }}>{summary.absentDays}</div>
                </div>

                <div style={{ padding: '8px 10px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>Total Days</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{summary.totalDays}</div>
                </div>

                <div style={{ padding: '8px 10px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1d4ed8' }}>Work Hours</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#1e40af' }}>{summary.formattedTotalHours}</div>
                </div>
              </div>
            </div>

            {/* Download Buttons Section */}
            <div
              style={{
                background: 'var(--bg-primary, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                padding: '14px',
                marginTop: 'auto',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={13} />
                <span>Download Report</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={loading || !employeeData}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    width: '100%',
                    borderRadius: '8px',
                    color: '#047857',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <FileText size={14} />
                  <span>Download CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={loading || !employeeData}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    width: '100%',
                    borderRadius: '8px',
                    color: '#065f46',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  <FileSpreadsheet size={14} />
                  <span>Download Excel (.xls)</span>
                </button>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------
              RIGHT COLUMN: ATTENDANCE DETAILS & CALENDAR / TABLE
          -------------------------------------------------- */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '20px 24px',
              gap: '16px',
            }}
          >
            {/* Top Toolbar: Filter Mode & Date Selection */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                paddingBottom: '14px',
                borderBottom: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              {/* Filter Mode Selector */}
              <div
                style={{
                  display: 'inline-flex',
                  background: 'var(--bg-secondary, #f1f5f9)',
                  padding: '3px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFilterMode('month')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    background: filterMode === 'month' ? 'var(--bg-primary, #ffffff)' : 'transparent',
                    color: filterMode === 'month' ? 'var(--accent-primary, #2563eb)' : 'var(--text-secondary, #64748b)',
                    boxShadow: filterMode === 'month' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  Month View
                </button>

                <button
                  type="button"
                  onClick={() => setFilterMode('range')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    background: filterMode === 'range' ? 'var(--bg-primary, #ffffff)' : 'transparent',
                    color: filterMode === 'range' ? 'var(--accent-primary, #2563eb)' : 'var(--text-secondary, #64748b)',
                    boxShadow: filterMode === 'range' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  Date Range
                </button>

                <button
                  type="button"
                  onClick={() => setFilterMode('single')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    background: filterMode === 'single' ? 'var(--bg-primary, #ffffff)' : 'transparent',
                    color: filterMode === 'single' ? 'var(--accent-primary, #2563eb)' : 'var(--text-secondary, #64748b)',
                    boxShadow: filterMode === 'single' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  Single Date
                </button>
              </div>

              {/* View Mode Toggle: Calendar vs Table */}
              <div
                style={{
                  display: 'inline-flex',
                  background: 'var(--bg-secondary, #f1f5f9)',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'calendar' ? 'var(--bg-primary, #ffffff)' : 'transparent',
                    color: viewMode === 'calendar' ? 'var(--accent-primary, #2563eb)' : 'var(--text-secondary, #64748b)',
                    boxShadow: viewMode === 'calendar' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <CalendarDays size={13} />
                  <span>Calendar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'table' ? 'var(--bg-primary, #ffffff)' : 'transparent',
                    color: viewMode === 'table' ? 'var(--accent-primary, #2563eb)' : 'var(--text-secondary, #64748b)',
                    boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <ListFilter size={13} />
                  <span>Detailed List</span>
                </button>
              </div>
            </div>

            {/* Date Controls Depending on Filter Mode */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '10px 14px',
                background: 'var(--bg-secondary, #f8fafc)',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              {filterMode === 'month' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="btn btn-secondary"
                    style={{ padding: '5px 8px', borderRadius: '6px' }}
                    title="Previous month"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', minWidth: '140px', textAlign: 'center' }}>
                    {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </span>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="btn btn-secondary"
                    style={{ padding: '5px 8px', borderRadius: '6px' }}
                    title="Next month"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {filterMode === 'range' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.78rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-primary, #ffffff)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.78rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-primary, #ffffff)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              )}

              {filterMode === 'single' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Select Date:</span>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.78rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-primary, #ffffff)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              )}

              {/* Status Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Present</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Absent</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }} />
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Week Off</span>
                </div>
              </div>
            </div>

            {/* Error or Loading state */}
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {loading ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  gap: '10px',
                }}
              >
                <Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent-primary, #2563eb)' }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Loading attendance details...</span>
              </div>
            ) : viewMode === 'calendar' ? (
              /* ==============================================
                  CALENDAR VIEW (GRID)
              ============================================== */
              <div
                style={{
                  background: 'var(--bg-primary, #ffffff)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Weekdays Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '6px',
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    paddingBottom: '6px',
                    borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  }}
                >
                  {WEEKDAYS.map((wd) => (
                    <div key={wd}>{wd}</div>
                  ))}
                </div>

                {/* Days Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '6px',
                  }}
                >
                  {calendarDays.map((item, index) => {
                    if (!item.dayNum) {
                      return (
                        <div
                          key={`empty-${index}`}
                          style={{
                            height: '66px',
                            background: 'transparent',
                            borderRadius: '8px',
                          }}
                        />
                      );
                    }

                    const rec = item.record;
                    const isPresent = rec?.status === 'Present';
                    const isAbsent = rec?.status === 'Absent';
                    const isWeekend = rec?.status === 'Weekend';
                    const isUpcoming = rec?.status === 'Upcoming';

                    let cellBg = 'var(--bg-secondary, #f8fafc)';
                    let cellBorder = 'var(--border-color, #e2e8f0)';
                    let badgeBg = '#f1f5f9';
                    let badgeColor = '#64748b';
                    let badgeText = isWeekend ? (rec?.weekOffLabel || 'Week Off') : isUpcoming ? 'Upcoming' : 'Off';

                    if (isPresent) {
                      cellBg = '#f0fdf4';
                      cellBorder = '#bbf7d0';
                      badgeBg = '#dcfce7';
                      badgeColor = '#15803d';
                      badgeText = 'Present';
                    } else if (isAbsent) {
                      cellBg = '#fef2f2';
                      cellBorder = '#fecaca';
                      badgeBg = '#fee2e2';
                      badgeColor = '#b91c1c';
                      badgeText = 'Absent';
                    } else if (isWeekend) {
                      cellBg = '#f8fafc';
                      cellBorder = '#e2e8f0';
                      badgeBg = '#e2e8f0';
                      badgeColor = '#64748b';
                      badgeText = rec?.weekOffLabel || 'Week Off';
                    }

                    return (
                      <div
                        key={item.dateStr}
                        style={{
                          height: '66px',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          background: cellBg,
                          border: `1px solid ${cellBorder}`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'transform 0.1s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {item.dayNum}
                          </span>
                          <span
                            style={{
                              fontSize: '0.58rem',
                              fontWeight: 800,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              background: badgeBg,
                              color: badgeColor,
                            }}
                          >
                            {badgeText}
                          </span>
                        </div>

                        {isPresent ? (
                          <div style={{ fontSize: '0.62rem', color: '#166534', lineHeight: 1.15 }}>
                            <div>In: <b>{rec.punchIn || '--'}</b></div>
                            <div>Out: <b>{rec.punchOut || 'In progress'}</b></div>
                          </div>
                        ) : isAbsent ? (
                          <div style={{ fontSize: '0.62rem', color: '#991b1b', fontWeight: 700 }}>
                            Not Present
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                            {isWeekend ? (rec?.weekOffLabel ? `${rec.weekOffLabel} Off` : 'Weekly Off') : '--'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ==============================================
                  DETAILED TABLE VIEW
              ============================================== */
              <div
                style={{
                  background: 'var(--bg-primary, #ffffff)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                    <thead
                      style={{
                        position: 'sticky',
                        top: 0,
                        background: 'var(--bg-secondary, #f1f5f9)',
                        borderBottom: '1px solid var(--border-color, #e2e8f0)',
                        zIndex: 2,
                      }}
                    >
                      <tr>
                        <th style={{ padding: '9px 12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Date</th>
                        <th style={{ padding: '9px 12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Day</th>
                        <th style={{ padding: '9px 12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Status</th>
                        <th style={{ padding: '9px 12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Check In</th>
                        <th style={{ padding: '9px 12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Check Out</th>
                        <th style={{ padding: '9px 12px', fontWeight: 800, color: 'var(--text-secondary)' }}>Duration</th>
                        <th style={{ padding: '9px 12px', fontWeight: 800, color: 'var(--text-secondary)' }}>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeData?.records && employeeData.records.length > 0 ? (
                        employeeData.records.map((rec) => {
                          const isPresent = rec.status === 'Present';
                          const isAbsent = rec.status === 'Absent';

                          return (
                            <tr
                              key={rec.date}
                              style={{
                                borderBottom: '1px solid var(--border-color, #f1f5f9)',
                                background: isPresent ? '#f0fdf4' : isAbsent ? '#fffafa' : 'transparent',
                              }}
                            >
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {rec.date}
                              </td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                                {rec.day}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.66rem',
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: '999px',
                                    background: isPresent ? '#dcfce7' : isAbsent ? '#fee2e2' : '#f1f5f9',
                                    color: isPresent ? '#15803d' : isAbsent ? '#b91c1c' : '#64748b',
                                  }}
                                >
                                  {isPresent && <CheckCircle2 size={11} />}
                                  {isAbsent && <XCircle size={11} />}
                                  <span>{rec.status === 'Weekend' ? (rec?.weekOffLabel || 'Week Off') : rec.status}</span>
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {rec.punchIn || '--'}
                              </td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {rec.punchOut || '--'}
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: isPresent ? '#047857' : 'var(--text-muted)' }}>
                                {rec.formattedDuration}
                              </td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                {rec.punchInIp || '--'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No attendance records found for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    ),
    document.body
  );
}
