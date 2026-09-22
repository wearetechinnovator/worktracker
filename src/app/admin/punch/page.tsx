'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Calendar, Users } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import AttendanceRequestsPanel from '@/components/AttendanceRequestsPanel';

import { usePunch } from '@/context/PunchContext';

export default function PunchPage() {
  const router = useRouter();
  const {
    isPunchedIn,
    canPunchIn,
    canPunchOut,
    attendance,
    loading: ctxLoading,
    punchIn: ctxPunchIn,
    punchOut: ctxPunchOut,
    refreshPunch,
    user
  } = usePunch();

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [reportPreview, setReportPreview] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [isPreparingReport, setIsPreparingReport] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');

  // Admin Override States
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
  const [useCustomTime, setUseCustomTime] = useState<boolean>(false);

  const getLocalDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalTimeValue = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Update current time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user employees list if admin
  useEffect(() => {
    if (user?.userType === 'admin') {
      fetch('/api/users/employees')
        .then(res => res.json())
        .then(json => {
          if (json.success && Array.isArray(json.data)) {
            setEmployeesList(json.data);
          }
        })
        .catch(() => { });
    }
  }, [user]);

  const formatTimeTo12Hour = (time24: string) => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = Number.parseInt(hStr, 10);
    const m = mStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  };

  const formatDurationText = (minutes?: number) => {
    if (!minutes) return '0 hours';
    const totalHours = minutes / 60;
    const formatted = totalHours.toFixed(1).replace(/\.0$/, '');
    return `${formatted} hours`;
  };

  const buildDailyReport = (entries: any[], taskMap: Map<string, any>) => {
    if (!entries.length) {
      return 'No work was logged for today yet.';
    }

    return entries.map((entry, index) => {
      const task = taskMap.get(entry.taskId?._id || entry.taskId);
      const projectName = task?.projectId?.name || task?.Project || 'General';
      const taskTitle = task?.title || entry.taskId?.title || 'Untitled task';
      const summary = entry.notes || task?.description || 'Completed work task details.';
      const duration = formatDurationText(entry.totalMinutes || 0);

      return `Task ${index + 1}:

- Project: ${projectName}
- Task: ${taskTitle}
- Time: ${formatTimeTo12Hour(entry.startTime)} – ${formatTimeTo12Hour(entry.endTime || entry.startTime)} (${duration})
- Status: ${entry.status || 'Completed'}
- Summary: ${summary}`;
    }).join('\n\n');
  };

  const preparePunchOutReport = async () => {
    const today = getLocalDateValue(new Date());
    setReportPreview(`Daily Work Summary (${today})\n\nShift punch out report completed.`);
    setShowReportModal(true);
  };

  const submitPunch = async (action: 'punchIn' | 'punchOut') => {
    setProcessing(true);
    setError(null);
    try {
      if (action === 'punchIn') {
        await ctxPunchIn();
      } else {
        await ctxPunchOut({ reason: reportPreview });
      }
      setSuccessMsg(action === 'punchIn' ? 'Punched in successfully' : 'Punched out successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to punch');
    } finally {
      setProcessing(false);
    }
  };

  const handlePunch = async (action: 'punchIn' | 'punchOut') => {
    if (action === 'punchOut') {
      await preparePunchOutReport();
      return;
    }

    await submitPunch(action);
  };

  const confirmPunchOut = async () => {
    setShowReportModal(false);
    await submitPunch('punchOut');
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportPreview);
      setSuccessMsg('Daily work report copied to clipboard');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError('Unable to copy report to clipboard');
    }
  };

  if (ctxLoading) {
    return <PageShimmer variant="punch" />;
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>


      {error && (
        <div className="card" style={{
          borderLeft: '4px solid #ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          background: '#fef2f2'
        }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p style={{ fontWeight: 600, color: '#991b1b' }}>{error}</p>
        </div>
      )}
      <div style={{
        fontSize: '2rem',
        fontWeight: 700,
        color: 'var(--accent-primary)',
        marginTop: '12px',
        fontFamily: 'monospace'
      }}>
        {currentTime}
      </div>
      {/* Current Status */}
      {attendance && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Today's Record</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Status
              </div>
              <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                {attendance.status || 'Present'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Check In
              </div>
              <div style={{ fontWeight: 700 }}>
                {attendance.checkIn || '-'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Check Out
              </div>
              <div style={{ fontWeight: 700 }}>
                {attendance.checkOut || '-'}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '14px',
            fontSize: '0.8rem'
          }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Check In Details
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                <div>• <strong>IP Address:</strong> {attendance.punch_in_ip || '-'}</div>
                <div>• <strong>Browser:</strong> {attendance.punch_in_browser || '-'}</div>
                {attendance.punch_in_geo && attendance.punch_in_geo.length >= 2 && (
                  <div>• <strong>Geo Coordinates:</strong> {attendance.punch_in_geo[0]}, {attendance.punch_in_geo[1]}</div>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Check Out Details
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                <div>• <strong>IP Address:</strong> {attendance.punch_out_ip || '-'}</div>
                <div>• <strong>Browser:</strong> {attendance.punch_out_browser || '-'}</div>
                {attendance.punch_out_geo && attendance.punch_out_geo.length >= 2 && (
                  <div>• <strong>Geo Coordinates:</strong> {attendance.punch_out_geo[0]}, {attendance.punch_out_geo[1]}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Daily Work Summary Preview</h3>
              <button className="modal-close" onClick={() => setShowReportModal(false)}>&times;</button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Review the work report before finalizing your punch out.
              </p>
            </div>

            <div className="form-group">
              <textarea
                className="form-control"
                readOnly
                style={{ minHeight: '260px', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.5', background: 'var(--bg-tertiary)' }}
                value={reportPreview}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowReportModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-secondary" onClick={copyReport}>
                Copy Mail
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmPunchOut} disabled={processing}>
                {processing ? 'Punching Out...' : 'Confirm Punch Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Requests Review Panel */}
      <AttendanceRequestsPanel />
    </div>
  );
}
