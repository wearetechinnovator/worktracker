'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import {
  exportAttendanceToCSV,
  exportAttendanceToExcel,
  ExportEmployeeData,
} from '@/lib/attendanceExport';
import { toast } from '@/lib/toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExport?: (
    format: 'excel' | 'csv',
    period: { startDate: string; endDate: string; label: string }
  ) => Promise<void>;
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

export default function ExportTeamAttendanceModal({ isOpen, onClose, onExport }: Props) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-11

  // 'month' | 'year' | 'range'
  const [dateMode, setDateMode] = useState<'month' | 'year' | 'range'>('month');
  const [startDate, setStartDate] = useState(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, today.getMonth() + 1, 0).getDate();
    return `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  });

  const [downloadingFormat, setDownloadingFormat] = useState<'excel' | 'csv' | null>(null);

  if (!isOpen) return null;

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

  const executeExport = async (format: 'excel' | 'csv') => {
    try {
      setDownloadingFormat(format);

      let query = '';
      let sDate = startDate;
      let eDate = endDate;

      if (dateMode === 'month') {
        const mStr = String(selectedMonth + 1).padStart(2, '0');
        const monthKey = `${selectedYear}-${mStr}`;
        query = `?month=${monthKey}`;
        sDate = `${selectedYear}-${mStr}-01`;
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        eDate = `${selectedYear}-${mStr}-${String(lastDay).padStart(2, '0')}`;
      } else if (dateMode === 'year') {
        query = `?year=${selectedYear}`;
        sDate = `${selectedYear}-01-01`;
        eDate = `${selectedYear}-12-31`;
      } else {
        query = `?startDate=${startDate}&endDate=${endDate}`;
        sDate = startDate;
        eDate = endDate;
      }

      const periodLabel =
        dateMode === 'month'
          ? `${MONTH_NAMES[selectedMonth]}_${selectedYear}`
          : dateMode === 'year'
          ? `Year_${selectedYear}`
          : `${sDate}_to_${eDate}`;

      if (onExport) {
        await onExport(format, {
          startDate: sDate,
          endDate: eDate,
          label: periodLabel,
        });
        onClose();
        return;
      }

      const res = await fetch(`/api/attendance/report${query}`, { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to fetch team attendance records');
      }

      const employees: ExportEmployeeData[] = json.data?.employees || [];
      const weeklyOffDays: number[] = json.data?.weeklyOffDays || [0];
      const saturdayOffRule = json.data?.saturdayOffRule || 'none';

      if (employees.length === 0) {
        toast.error('No employee records found for the selected period.');
        return;
      }

      if (format === 'excel') {
        exportAttendanceToExcel({
          filename: `Team_Attendance_Sheet_${periodLabel}.xls`,
          startDate: sDate,
          endDate: eDate,
          employees,
          weeklyOffDays,
          saturdayOffRule,
        });
        toast.success(`Excel sheet downloaded for ${employees.length} employees!`);
      } else if (format === 'csv') {
        exportAttendanceToCSV({
          filename: `Team_Attendance_Matrix_${periodLabel}.csv`,
          startDate: sDate,
          endDate: eDate,
          employees,
          weeklyOffDays,
          saturdayOffRule,
        });
        toast.success(`CSV downloaded for ${employees.length} employees!`);
      }

      onClose();
    } catch (err: any) {
      console.error('Error generating master attendance export:', err);
      toast.error(err?.message || 'Error generating export report');
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 2100,
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
          maxWidth: '970px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 36px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Export Attendance Sheet
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Monthly or Yearly team attendance matrix
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ width: '30px', height: '30px', padding: 0, borderRadius: '8px' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 36px 36px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Mode Tabs: Monthly | Yearly | Range */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Select Period
            </label>
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-secondary, #f1f5f9)',
                padding: '3px',
                borderRadius: '8px',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => setDateMode('month')}
                style={{
                  flex: 1,
                  padding: '7px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: dateMode === 'month' ? 'var(--bg-primary, #ffffff)' : 'transparent',
                  color: dateMode === 'month' ? 'var(--accent-primary, #2563eb)' : 'var(--text-secondary)',
                  boxShadow: dateMode === 'month' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Monthly
              </button>

              <button
                type="button"
                onClick={() => setDateMode('year')}
                style={{
                  flex: 1,
                  padding: '7px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: dateMode === 'year' ? 'var(--bg-primary, #ffffff)' : 'transparent',
                  color: dateMode === 'year' ? 'var(--accent-primary, #2563eb)' : 'var(--text-secondary)',
                  boxShadow: dateMode === 'year' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Yearly (All Months)
              </button>

              <button
                type="button"
                onClick={() => setDateMode('range')}
                style={{
                  flex: 1,
                  padding: '7px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: dateMode === 'range' ? 'var(--bg-primary, #ffffff)' : 'transparent',
                  color: dateMode === 'range' ? 'var(--accent-primary, #2563eb)' : 'var(--text-secondary)',
                  boxShadow: dateMode === 'range' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Date Picker Content */}
          {dateMode === 'month' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--bg-secondary, #f8fafc)',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <button
                type="button"
                onClick={handlePrevMonth}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', borderRadius: '6px' }}
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', borderRadius: '6px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {dateMode === 'year' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--bg-secondary, #f8fafc)',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedYear((y) => y - 1)}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', borderRadius: '6px' }}
              >
                <ChevronLeft size={16} />
              </button>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 850, color: 'var(--text-primary)' }}>
                  Year {selectedYear}
                </span>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  12 Monthly Sheets (Jan - Dec)
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedYear((y) => y + 1)}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', borderRadius: '6px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {dateMode === 'range' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '12px 14px',
                background: 'var(--bg-secondary, #f8fafc)',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--bg-primary, #ffffff)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--bg-primary, #ffffff)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Download Buttons: Excel & CSV (PDF removed) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              disabled={Boolean(downloadingFormat)}
              onClick={() => executeExport('excel')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 750,
                color: '#ffffff',
                background: '#16a34a',
                border: 'none',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                cursor: downloadingFormat ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {downloadingFormat === 'excel' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={16} />
              )}
              <span>Download Excel Sheet (.xls)</span>
            </button>

            <button
              type="button"
              disabled={Boolean(downloadingFormat)}
              onClick={() => executeExport('csv')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#065f46',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                cursor: downloadingFormat ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {downloadingFormat === 'csv' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileText size={16} />
              )}
              <span>Download CSV Matrix</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
