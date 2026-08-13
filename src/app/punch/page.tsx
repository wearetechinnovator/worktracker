'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Loader2, Calendar } from 'lucide-react';

interface PunchData {
  attendance: {
    checkIn: string;
    checkOut: string;
    status: string;
  } | null;
  canPunchIn: boolean;
  canPunchOut: boolean;
  currentTime: string;
  settings: {
    punchInWindow: string;
    punchOutWindow: string;
  };
}

export default function PunchPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [punchData, setPunchData] = useState<PunchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [reportPreview, setReportPreview] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [isPreparingReport, setIsPreparingReport] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');

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

  // Authenticate user
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(storedUser);
    setUser(parsed);
  }, [router]);

  // Load punch status
  const loadPunchStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const now = new Date();
      const localDate = getLocalDateValue(now);
      const localTime = getLocalTimeValue(now);

      const res = await fetch(`/api/punch?employeeId=${user._id}&date=${localDate}&time=${localTime}`);
      const result = await res.json();
      
      if (!result.success) throw new Error(result.error || 'Failed to load punch status');
      
      setPunchData(result.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading punch status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPunchStatus();
      // Refresh every 30 seconds
      const interval = setInterval(loadPunchStatus, 30000);
      return () => clearInterval(interval);
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
      const projectName = task?.projectId?.name || task?.department || 'General';
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
    if (!user) return;

    try {
      setIsPreparingReport(true);
      setError(null);
      const today = getLocalDateValue(new Date());
      const [tasksRes, worksRes] = await Promise.all([
        fetch(`/api/tasks?employeeId=${user._id}`),
        fetch(`/api/task-work?employeeId=${user._id}&date=${today}`),
      ]);

      const tasksData = await tasksRes.json();
      const worksData = await worksRes.json();

      if (!tasksData.success) throw new Error(tasksData.error || 'Failed to load tasks');
      if (!worksData.success) throw new Error(worksData.error || 'Failed to load work report');

      const taskMap = new Map<string, any>((tasksData.data || []).map((task: any) => [task._id, task]));
      const completedEntries = (worksData.data || []).filter((entry: any) => entry.status === 'Completed');
      const report = buildDailyReport(completedEntries, taskMap);

      setReportPreview(report);
      setShowReportModal(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to generate punch-out report');
    } finally {
      setIsPreparingReport(false);
    }
  };

  const submitPunch = async (action: 'punchIn' | 'punchOut') => {
    if (!user) return;

    try {
      setProcessing(true);
      setError(null);
      setSuccessMsg(null);

      let location: { latitude?: number; longitude?: number; label?: string; address?: string } | undefined;

      if (!navigator.geolocation) {
        setLocationStatus('Geolocation is not supported in this browser.');
      } else {
        setLocationStatus('Requesting location permission...');
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLocationStatus(`Location captured: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                label: 'Device geolocation',
              });
            },
            (geoError) => {
              const reason = geoError.code === 1
                ? 'Location permission was denied by the browser.'
                : geoError.code === 2
                  ? 'Location is unavailable right now.'
                  : 'Location request timed out.';
              setLocationStatus(reason);
              resolve(undefined);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        });
      }

      const now = new Date();
      const localDate = getLocalDateValue(now);
      const localTime = getLocalTimeValue(now);

      const res = await fetch('/api/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user._id,
          action,
          location,
          localDate,
          localTime,
        }),
      });

      const result = await res.json();
      
      if (!result.success) throw new Error(result.error || 'Failed to punch');

      if (action === 'punchIn') {
        localStorage.setItem('worktracker_punch_status', 'in');
      } else {
        localStorage.setItem('worktracker_punch_status', 'out');
        router.replace('/punch');
      }

      setSuccessMsg(result.message);
      setTimeout(() => setSuccessMsg(null), 4000);
      
      // Reload punch status
      await loadPunchStatus();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error processing punch');
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

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading punch status...</p>
      </div>
    );
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
          Attendance Punch System
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
            <div>• Punch In: {punchData?.settings.punchInWindow}</div>
            <div>• Punch Out: {punchData?.settings.punchOutWindow}</div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Status
              </div>
              <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                {punchData.attendance.status}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Check In
              </div>
              <div style={{ fontWeight: 700 }}>
                {punchData.attendance.checkIn || '-'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Check Out
              </div>
              <div style={{ fontWeight: 700 }}>
                {punchData.attendance.checkOut || '-'}
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
