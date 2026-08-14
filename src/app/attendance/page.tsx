'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle2, User, Loader2, AlertCircle, Save, CalendarDays } from 'lucide-react';
import EmployeeAttendanceCalendarModal from '@/components/EmployeeAttendanceCalendarModal';
import PageShimmer from '@/components/PageShimmer';

interface AttendanceRecord {
  _id: string; // Employee ID
  name: string;
  role: string;
  department: string;
  avatarColor: string;
  attendanceStatus: 'Present' | 'Absent' | 'On Leave';
  attendanceId: string | null;
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
  
  // State
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Calendar Modal state
  const [selectedEmpForCalendar, setSelectedEmpForCalendar] = useState<any | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Authenticate and set date on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(storedUser);
    if (parsed.userType !== 'admin') {
      // Redirect employees back to dashboard
      router.push('/');
      return;
    }

    setUser(parsed);
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);
  }, [router]);

  // Fetch attendance list for date
  const loadAttendance = useCallback(async () => {
    if (!selectedDate) return;

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to load attendance');

      setRecords(result.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching attendance.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      loadAttendance();
    }
  }, [selectedDate, loadAttendance]);

  // Toggle status locally
  const handleStatusChange = (employeeId: string, status: 'Present' | 'Absent' | 'On Leave') => {
    setRecords((prev) =>
      prev.map((rec) =>
        rec._id === employeeId ? { ...rec, attendanceStatus: status } : rec
      )
    );
  };

  // Submit bulk attendance
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (records.length === 0 || !selectedDate) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const payload = records.map((rec) => ({
        employeeId: rec._id,
        date: selectedDate,
        status: rec.attendanceStatus,
      }));

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: payload }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to save attendance');

      setSuccessMsg('Attendance sheet saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error saving attendance sheet.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && records.length === 0) {
    return <PageShimmer variant="attendance" />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Attendance Board</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Check in daily presence status for TIS Pvt. Ltd. members.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="date"
            className="form-control"
            style={{ width: '150px', padding: '6px 8px', fontWeight: 600 }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p style={{ fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="card" style={{ borderLeft: '4px solid #10b981', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: '#ecfdf5' }}>
          <CheckCircle2 style={{ color: '#10b981' }} />
          <p style={{ color: '#065f46', fontWeight: 700 }}>{successMsg}</p>
        </div>
      )}

      {/* Attendance Form Sheet */}
      <form onSubmit={handleSubmit} className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <h3 className="card-title">Staff Register ({records.length})</h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Date: {selectedDate}</span>
        </div>

        {records.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
            No registered employees found. Create them in the Employee panel first.
          </p>
        ) : (
          <div>
            <table className="data-table" style={{ marginBottom: '24px' }}>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Job Title / Role</th>
                  <th>Check In (Time / IP / Geo)</th>
                  <th>Check Out (Time / IP / Geo)</th>
                  <th style={{ width: '240px', textAlign: 'right' }}>Daily Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec._id}>
                    <td>
                      <div 
                        className="avatar-wrapper" 
                        style={{ cursor: 'pointer' }}
                        title="Click to view month attendance calendar & daily work details"
                        onClick={() => {
                          setSelectedEmpForCalendar({
                            _id: rec._id,
                            name: rec.name,
                            email: '',
                            role: rec.role,
                            department: rec.department,
                            avatarColor: rec.avatarColor,
                          });
                          setIsCalendarOpen(true);
                        }}
                      >
                        <div className="avatar" style={{ backgroundColor: rec.avatarColor, width: '28px', height: '28px', fontSize: '0.7rem' }}>
                          {rec.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--accent-primary)', textDecoration: 'underline' }}>{rec.name}</div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Click for monthly chart &rarr;</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tag-badge">
                        {rec.department}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{rec.role}</td>
                    <td>
                      {rec.checkIn ? (
                        <div>
                          <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{rec.checkIn}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            IP: {rec.checkInIpAddress || '-'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {rec.checkInLocation || '-'}
                            {rec.checkInLatitude != null && rec.checkInLongitude != null && (
                              <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                ({rec.checkInLatitude.toFixed(4)}, {rec.checkInLongitude.toFixed(4)})
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      {rec.checkOut ? (
                        <div>
                          <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{rec.checkOut}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            IP: {rec.checkOutIpAddress || '-'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {rec.checkOutLocation || '-'}
                            {rec.checkOutLatitude != null && rec.checkOutLongitude != null && (
                              <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                ({rec.checkOutLatitude.toFixed(4)}, {rec.checkOutLongitude.toFixed(4)})
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn"
                          style={{
                            fontSize: '0.7rem',
                            padding: '3px 8px',
                            background: rec.attendanceStatus === 'Present' ? 'var(--status-active-bg)' : 'var(--bg-tertiary)',
                            color: rec.attendanceStatus === 'Present' ? 'var(--status-active-text)' : 'var(--text-secondary)',
                            border: '1px solid ' + (rec.attendanceStatus === 'Present' ? 'rgba(22, 101, 52, 0.15)' : 'var(--border-color)'),
                          }}
                          onClick={() => handleStatusChange(rec._id, 'Present')}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{
                            fontSize: '0.7rem',
                            padding: '3px 8px',
                            background: rec.attendanceStatus === 'Absent' ? 'var(--status-sick-bg)' : 'var(--bg-tertiary)',
                            color: rec.attendanceStatus === 'Absent' ? 'var(--status-sick-text)' : 'var(--text-secondary)',
                            border: '1px solid ' + (rec.attendanceStatus === 'Absent' ? 'rgba(153, 27, 27, 0.15)' : 'var(--border-color)'),
                          }}
                          onClick={() => handleStatusChange(rec._id, 'Absent')}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{
                            fontSize: '0.7rem',
                            padding: '3px 8px',
                            background: rec.attendanceStatus === 'On Leave' ? 'var(--status-pending-bg)' : 'var(--bg-tertiary)',
                            color: rec.attendanceStatus === 'On Leave' ? 'var(--status-pending-text)' : 'var(--text-secondary)',
                            border: '1px solid ' + (rec.attendanceStatus === 'On Leave' ? 'rgba(154, 52, 18, 0.15)' : 'var(--border-color)'),
                          }}
                          onClick={() => handleStatusChange(rec._id, 'On Leave')}
                        >
                          On Leave
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Save Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.push('/')}
                disabled={saving}
              >
                Go to Dashboard
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ gap: '8px' }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save Attendance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* MONTHLY ATTENDANCE & WORK DETAILS MODAL */}
      <EmployeeAttendanceCalendarModal
        employee={selectedEmpForCalendar}
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
      />
    </div>
  );
}
