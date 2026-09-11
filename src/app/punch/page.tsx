'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Calendar, Users } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import { getClientPunchLocation } from '@/lib/geoClient';
import { staticClient } from '@/lib/staticClient';

interface PunchData {
  isPunchedIn?: boolean;
  attendance: {
    checkIn: string | null;
    checkOut: string | null;
    status?: string;
    checkInIpAddress?: string;
    checkInLocation?: string;
    checkInLatitude?: number;
    checkInLongitude?: number;
    checkOutIpAddress?: string;
    checkOutLocation?: string;
    checkOutLatitude?: number;
    checkOutLongitude?: number;
  } | null;
  canPunchIn: boolean;
  canPunchOut: boolean;
  currentTime: string;
  settings: {
    punchInWindow: string;
    punchOutWindow: string;
  };
}

const DEFAULT_INLINE_PUNCH: PunchData = {
  isPunchedIn: true,
  attendance: {
    checkIn: '09:00 AM',
    checkOut: null,
    checkInLocation: 'Office HQ - New York',
    checkInLatitude: 40.7128,
    checkInLongitude: -74.0060,
  },
  canPunchIn: false,
  canPunchOut: true,
  currentTime: new Date().toLocaleTimeString(),
  settings: {
    punchInWindow: '09:00 AM - 10:00 AM',
    punchOutWindow: '05:00 PM - 07:00 PM',
  }
};

const DEFAULT_DEMO_USER = {
  _id: 'emp-1',
  name: 'Alex Johnson',
  email: 'alex@techinnovator.com',
  userType: 'admin'
};

export default function PunchPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(DEFAULT_DEMO_USER);
  const [punchData, setPunchData] = useState<PunchData | null>(DEFAULT_INLINE_PUNCH);
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

  // Authenticate user & load employees for Admin
  useEffect(() => {
    const demoUser = staticClient.getUser();
    setUser(demoUser);
    setEmployeesList(staticClient.getEmployees() as any);
    setPunchData(staticClient.getPunchStatus() as any);
    setLoading(false);
  }, []);

  const loadPunchStatus = async (showLoading = true) => {
    setPunchData(staticClient.getPunchStatus() as any);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadPunchStatus(true);

    const handleFocus = () => {
      loadPunchStatus(false);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, selectedEmpId]);

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
    const newStatus = staticClient.togglePunch();
    setPunchData(newStatus as any);
    setSuccessMsg(action === 'punchIn' ? 'Punched in successfully' : 'Punched out successfully');
    setProcessing(false);
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

  if (loading) {
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
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>
          Punch Here
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {today}
        </p>
        <div style={{ 
          fontSize: '2rem', 
          fontWeight: 700, 
          color: 'var(--accent-primary)', 
          marginTop: '12px',
          fontFamily: 'monospace'
        }}>
          {currentTime}
        </div>
      </div>

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

      {successMsg && (
        <div className="card" style={{ 
          borderLeft: '4px solid #10b981', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          marginBottom: '20px', 
          background: '#ecfdf5' 
        }}>
          <CheckCircle2 style={{ color: '#10b981' }} />
          <p style={{ color: '#065f46', fontWeight: 700 }}>{successMsg}</p>
        </div>
      )}

      {/* Admin Manual Override Section */}
      {user?.userType === 'admin' && (
        <div className="card" style={{ marginBottom: '20px', background: 'var(--bg-secondary)' }}>
          <h4 style={{ fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: 'var(--accent-primary)' }} />
            Admin Manual Punch Override
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Select an employee to manually punch in/out on their behalf or specify custom punch time if they forgot.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'flex-start' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Select Employee</label>
              <select
                className="form-control"
                style={{ padding: '7px 10px', fontSize: '0.82rem', fontWeight: 600 }}
                value={selectedEmpId || user._id}
                onChange={(e) => setSelectedEmpId(e.target.value)}
              >
                {employeesList.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.Project} - {emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useCustomTime}
                  onChange={(e) => setUseCustomTime(e.target.checked)}
                />
                Custom Punch Time
              </label>
              <input
                type="time"
                className="form-control"
                disabled={!useCustomTime}
                style={{ padding: '7px 10px', fontSize: '0.82rem', opacity: useCustomTime ? 1 : 0.5, fontWeight: 700, fontFamily: 'monospace' }}
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Shift Completed Banner */}
      {punchData?.attendance?.checkOut && !punchData?.canPunchIn && (
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #10b981', background: '#ecfdf5', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle2 style={{ color: '#10b981' }} />
          <div>
            <p style={{ fontWeight: 700, color: '#065f46', fontSize: '0.85rem', margin: 0 }}>
              Shift Completed for Today
            </p>
            <p style={{ color: '#047857', fontSize: '0.78rem', margin: '2px 0 0 0' }}>
              You punched out at <b>{formatTimeTo12Hour(punchData.attendance.checkOut)}</b>. Re-punching is disabled for the rest of today.
            </p>
          </div>
        </div>
      )}

      {/* Punch Buttons */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title" style={{ marginBottom: '20px' }}>Today's Attendance</h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px',
          marginBottom: '24px'
        }}>
          {/* Punch In Button */}
          <button
            onClick={() => handlePunch('punchIn')}
            disabled={!punchData?.canPunchIn || processing}
            className="btn"
            style={{
              height: '120px',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: punchData?.canPunchIn ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: punchData?.canPunchIn ? 'white' : 'var(--text-muted)',
              border: punchData?.canPunchIn ? 'none' : '2px solid var(--border-color)',
              cursor: punchData?.canPunchIn ? 'pointer' : 'not-allowed',
              opacity: punchData?.canPunchIn ? 1 : 0.5,
              filter: punchData?.canPunchIn ? 'none' : 'blur(1px)',
            }}
          >
            <LogIn size={32} />
            <span>PUNCH IN</span>
            {punchData?.attendance?.checkIn && (
              <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                ✓ {punchData.attendance.checkIn}
              </span>
            )}
          </button>

          {/* Punch Out Button */}
          <button
            onClick={() => handlePunch('punchOut')}
            disabled={!punchData?.canPunchOut || processing || isPreparingReport}
            className="btn"
            style={{
              height: '120px',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: punchData?.canPunchOut ? '#ef4444' : 'var(--bg-tertiary)',
              color: punchData?.canPunchOut ? 'white' : 'var(--text-muted)',
              border: punchData?.canPunchOut ? 'none' : '2px solid var(--border-color)',
              cursor: punchData?.canPunchOut ? 'pointer' : 'not-allowed',
              opacity: punchData?.canPunchOut ? 1 : 0.5,
              filter: punchData?.canPunchOut ? 'none' : 'blur(1px)',
            }}
          >
            <LogOut size={32} />
            <span>PUNCH OUT</span>
            {punchData?.attendance?.checkOut && (
              <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                ✓ {punchData.attendance.checkOut}
              </span>
            )}
          </button>
        </div>

        {/* Status Info */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          padding: '16px', 
          borderRadius: '8px',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
            <strong>Allowed Timings:</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)', marginLeft: '24px' }}>
            <div>• Punch In: {punchData?.settings?.punchInWindow || '09:00 AM - 10:00 AM'}</div>
            <div>• Punch Out: {punchData?.settings?.punchOutWindow || '05:00 PM - 07:00 PM'}</div>
          </div>

          {locationStatus && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Location:</strong> {locationStatus}
            </div>
          )}
        </div>
      </div>

      {/* Current Status */}
      {punchData?.attendance && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Today's Record</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Status
              </div>
              <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                {punchData.attendance?.status || 'Present'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Check In
              </div>
              <div style={{ fontWeight: 700 }}>
                {punchData.attendance?.checkIn || '-'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Check Out
              </div>
              <div style={{ fontWeight: 700 }}>
                {punchData.attendance?.checkOut || '-'}
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
                <div>• <strong>IP Address:</strong> {punchData.attendance?.checkInIpAddress || '-'}</div>
                <div>• <strong>Location:</strong> {punchData.attendance?.checkInLocation || '-'}</div>
                {punchData.attendance?.checkInLatitude !== undefined && punchData.attendance?.checkInLongitude !== undefined && (
                  <div>• <strong>Geo Coordinates:</strong> {punchData.attendance.checkInLatitude?.toFixed(4)}, {punchData.attendance.checkInLongitude?.toFixed(4)}</div>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Check Out Details
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                <div>• <strong>IP Address:</strong> {punchData.attendance?.checkOutIpAddress || '-'}</div>
                <div>• <strong>Location:</strong> {punchData.attendance?.checkOutLocation || '-'}</div>
                {punchData.attendance?.checkOutLatitude !== undefined && punchData.attendance?.checkOutLongitude !== undefined && (
                  <div>• <strong>Geo Coordinates:</strong> {punchData.attendance.checkOutLatitude?.toFixed(4)}, {punchData.attendance.checkOutLongitude?.toFixed(4)}</div>
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

      {/* Back to Dashboard */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <button
          onClick={() => router.push('/')}
          className="btn btn-secondary"
          disabled={processing}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
