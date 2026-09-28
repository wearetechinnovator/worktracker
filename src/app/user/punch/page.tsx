'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Calendar, Users, History, XCircle } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import PunchRequestModal from '@/components/PunchRequestModal';
import { punchService } from '@/lib/punchService';
import { usePunch } from '@/context/PunchContext';

interface AttendanceRequestHistory {
  _id: string;
  attendance_date: string;
  request_type: 'punchIn' | 'punchOut';
  reason: string;
  requested_punch_at: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  reviewed_by?: {
    full_name?: string;
    email?: string;
  } | null;
}

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
  isPunchedIn: false,
  attendance: null,
  canPunchIn: true,
  canPunchOut: false,
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
  const {
    isPunchedIn,
    canPunchIn,
    canPunchOut,
    attendance,
    pendingRequest,
    rejectedRequest,
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

  // Attendance request activity
  const [requestHistory, setRequestHistory] = useState<AttendanceRequestHistory[]>([]);
  const [requestHistoryLoading, setRequestHistoryLoading] = useState(false);

  // Punch Request Modal State
  const [isPunchRequestModalOpen, setIsPunchRequestModalOpen] = useState(false);
  const [punchRequestType, setPunchRequestType] = useState<'punchIn' | 'punchOut'>('punchIn');
  const [punchRequestMeta, setPunchRequestMeta] = useState<{
    message?: string;
    currentTime?: string;
    startTime?: string | null;
    endTime?: string | null;
  }>({});

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

  // Refresh server punch state periodically so an admin approval
  // becomes available without automatically executing the punch.
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPunch().catch(() => { });
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshPunch]);

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

  // Load this employee's request history so the employee can see
  // exactly when a request was submitted and how the admin responded.
  useEffect(() => {
    if (!user || user.userType === 'admin') return;

    const loadRequestHistory = async () => {
      try {
        setRequestHistoryLoading(true);

        const response = await fetch('/api/attendance/requests', {
          credentials: 'include',
          cache: 'no-store',
        });

        const raw = await response.text();

        if (!raw.trim()) {
          throw new Error('Empty attendance request response.');
        }

        const json = JSON.parse(raw);

        if (response.ok && json.success && Array.isArray(json.data)) {
          setRequestHistory(json.data);
        }
      } catch (historyError) {
        console.error('Failed to load attendance request history:', historyError);
      } finally {
        setRequestHistoryLoading(false);
      }
    };

    loadRequestHistory();
  }, [user, pendingRequest, rejectedRequest]);

  const formatRequestDateTime = (value?: string | null) => {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

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
    if (pendingRequest) {
      setError(
        `You already have a ${pendingRequest.request_type === 'punchIn' ? 'Punch In' : 'Punch Out'
        } request pending admin approval.`
      );
      return;
    }

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
      if (err?.requiresRequest || err?.requestType) {
        setPunchRequestType(action);
        setPunchRequestMeta({
          message: err?.message,
          currentTime: err?.currentTime,
          startTime: action === 'punchIn' ? err?.punchInStartTime : err?.punchOutStartTime,
          endTime: action === 'punchIn' ? err?.punchInEndTime : err?.punchOutEndTime,
        });
        setIsPunchRequestModalOpen(true);
        return;
      }
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

      {/* Punch Buttons */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title" style={{ marginBottom: '20px' }}>Today&apos;s Attendance</h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '24px'
        }}>
          {/* Punch In Button */}
          <button
            onClick={() => handlePunch('punchIn')}
            disabled={!canPunchIn || processing || Boolean(pendingRequest)}
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
              background: canPunchIn ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: canPunchIn ? 'white' : 'var(--text-muted)',
              border: canPunchIn ? 'none' : '2px solid var(--border-color)',
              cursor: canPunchIn ? 'pointer' : 'not-allowed',
              opacity: canPunchIn ? 1 : 0.5,
              filter: canPunchIn ? 'none' : 'blur(1px)',
            }}
          >
            <LogIn size={32} />
            <span>PUNCH IN</span>
            {attendance?.checkIn && (
              <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                ✓ {attendance.checkIn}
              </span>
            )}
          </button>

          {/* Punch Out Button */}
          <button
            onClick={() => handlePunch('punchOut')}
            disabled={!isPunchedIn || processing || isPreparingReport || Boolean(pendingRequest)}
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
              background: isPunchedIn ? '#ef4444' : 'var(--bg-tertiary)',
              color: isPunchedIn ? 'white' : 'var(--text-muted)',
              border: isPunchedIn ? 'none' : '2px solid var(--border-color)',
              cursor: isPunchedIn && !processing && !pendingRequest ? 'pointer' : 'not-allowed',
              opacity: isPunchedIn && !pendingRequest ? 1 : 0.5,
              filter: isPunchedIn ? 'none' : 'blur(1px)',
            }}
          >
            <LogOut size={32} />
            <span>PUNCH OUT</span>
            {attendance?.checkOut && (
              <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                ✓ {attendance.checkOut}
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
            <div>• Punch In: 09:00 AM - 10:00 AM</div>
            <div>• Punch Out: 05:00 PM - 07:00 PM</div>
          </div>

          {locationStatus && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Location:</strong> {locationStatus}
            </div>
          )}
        </div>
      </div>

      {/* Attendance Request Activity Log */}
      {user?.userType !== 'admin' && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div>
              <h3
                className="card-title"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                }}
              >
                <History
                  size={18}
                  style={{ color: 'var(--accent-primary)' }}
                />
                Attendance Request History
              </h3>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                }}
              >
                See when you requested Punch In/Out and when the admin responded.
              </p>
            </div>
          </div>

          {requestHistoryLoading ? (
            <div
              style={{
                padding: '24px 0',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
              }}
            >
              Loading request history...
            </div>
          ) : requestHistory.length === 0 ? (
            <div
              style={{
                padding: '22px',
                borderRadius: '10px',
                background: 'var(--bg-secondary)',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
              }}
            >
              No attendance requests yet.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {requestHistory.map((request) => {
                const isApproved = request.status === 'Approved';
                const isRejected = request.status === 'Rejected';

                return (
                  <div
                    key={request._id}
                    style={{
                      position: 'relative',
                      padding: '13px 14px 13px 18px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: isApproved
                        ? '#f0fdf4'
                        : isRejected
                          ? '#fef2f2'
                          : '#fffbeb',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        background: isApproved
                          ? '#10b981'
                          : isRejected
                            ? '#ef4444'
                            : '#f59e0b',
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {request.request_type === 'punchIn'
                            ? 'Punch In Request'
                            : 'Punch Out Request'}
                        </div>

                        <div
                          style={{
                            marginTop: '4px',
                            fontSize: '0.72rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Requested on{' '}
                          <strong>
                            {formatRequestDateTime(
                              request.requested_punch_at
                            )}
                          </strong>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '4px 9px',
                          borderRadius: '999px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          background: isApproved
                            ? '#dcfce7'
                            : isRejected
                              ? '#fee2e2'
                              : '#fef3c7',
                          color: isApproved
                            ? '#047857'
                            : isRejected
                              ? '#b91c1c'
                              : '#b45309',
                        }}
                      >
                        {request.status}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: '10px',
                        padding: '9px 10px',
                        borderRadius: '7px',
                        background: 'rgba(255,255,255,0.7)',
                        fontSize: '0.75rem',
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>Reason:</strong>{' '}
                      {request.reason || 'No reason provided.'}
                    </div>

                    {request.status === 'Pending' && (
                      <div
                        style={{
                          marginTop: '9px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#b45309',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        <Clock size={13} />
                        Waiting for admin response
                      </div>
                    )}

                    {request.status === 'Approved' && (
                      <div
                        style={{
                          marginTop: '9px',
                          paddingTop: '9px',
                          borderTop: '1px solid #bbf7d0',
                          color: '#047857',
                          fontSize: '0.72rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 800,
                          }}
                        >
                          <CheckCircle2 size={14} />
                          Admin approved this request
                        </div>

                        <div style={{ marginTop: '4px' }}>
                          Responded on{' '}
                          <strong>
                            {formatRequestDateTime(request.reviewed_at)}
                          </strong>
                          {request.reviewed_by?.full_name
                            ? ` by ${request.reviewed_by.full_name}`
                            : ''}
                        </div>
                      </div>
                    )}

                    {request.status === 'Rejected' && (
                      <div
                        style={{
                          marginTop: '9px',
                          paddingTop: '9px',
                          borderTop: '1px solid #fecaca',
                          color: '#b91c1c',
                          fontSize: '0.72rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 800,
                          }}
                        >
                          <XCircle size={14} />
                          Admin rejected this request
                        </div>

                        <div style={{ marginTop: '4px' }}>
                          Responded on{' '}
                          <strong>
                            {formatRequestDateTime(request.reviewed_at)}
                          </strong>
                          {request.reviewed_by?.full_name
                            ? ` by ${request.reviewed_by.full_name}`
                            : ''}
                        </div>

                        <div
                          style={{
                            marginTop: '7px',
                            padding: '8px 9px',
                            borderRadius: '7px',
                            background: '#fff',
                            color: '#7f1d1d',
                          }}
                        >
                          <strong>Admin's Reason:</strong>{' '}
                          {request.rejection_reason ||
                            'No rejection reason was provided.'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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



      {/* Punch Request Modal */}
      <PunchRequestModal
        isOpen={isPunchRequestModalOpen}
        onClose={() => setIsPunchRequestModalOpen(false)}
        requestType={punchRequestType}
        message={punchRequestMeta.message}
        currentTime={punchRequestMeta.currentTime}
        startTime={punchRequestMeta.startTime}
        endTime={punchRequestMeta.endTime}
        onSuccess={async () => {
          await refreshPunch();
          setSuccessMsg(
            `${punchRequestType === 'punchIn' ? 'Punch In' : 'Punch Out'
            } request submitted to admin successfully.`
          );
        }}
      />
    </div>
  );
}
