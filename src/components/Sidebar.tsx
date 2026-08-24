'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Folder, Users, FileBarChart, Calendar, ChevronRight, ChevronLeft, LogOut, Clock, Settings, CheckSquare, History, Briefcase, FileText, Mail, Copy, Loader2
} from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [canPunchOut, setCanPunchOut] = useState(false);
  const [checkingPunch, setCheckingPunch] = useState(true);
  const [shiftTimes, setShiftTimes] = useState<{ punchOutTime?: string; lateCutoffTime?: string } | null>(null);

  // Punch Out Mail Modal States
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);
  const [mailReportContent, setMailReportContent] = useState('');
  const [isPunchingOut, setIsPunchingOut] = useState(false);

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const storedCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    setIsCollapsed(storedCollapsed);
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar_collapsed', String(nextState));
  };

  useEffect(() => {
    // Hide sidebar checks and loading user session on mount/path change
    const storedUser = localStorage.getItem('worktracker_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, [pathname]);

  // Check punch status for employees
  useEffect(() => {
    const checkPunchStatus = async () => {
      if (!user) {
        setCheckingPunch(false);
        return;
      }

      // Admin doesn't need punch check
      if (user.userType === 'admin') {
        setIsPunchedIn(true);
        setCheckingPunch(false);
        return;
      }

      try {
        const res = await fetch(`/api/punch?employeeId=${user._id}`);
        const result = await res.json();

        const attendance = result.data?.attendance;
        const isCurrentlyCheckedIn = !!attendance?.checkIn && !attendance?.checkOut;

        if (result.success && isCurrentlyCheckedIn) {
          setIsPunchedIn(true);
          setCanPunchOut(!!result.data?.canPunchOut);
        } else {
          setIsPunchedIn(false);
          setCanPunchOut(false);
        }
      } catch (err) {
        console.error('Error checking punch status:', err);
        setIsPunchedIn(false);
      } finally {
        setCheckingPunch(false);
      }
    };

    if (user && pathname !== '/login') {
      checkPunchStatus();
    } else {
      setCheckingPunch(false);
    }

    const handlePunchStatusChange = () => {
      if (user && pathname !== '/login') {
        checkPunchStatus();
      }
    };

    window.addEventListener('punch-status-changed', handlePunchStatusChange);
    return () => {
      window.removeEventListener('punch-status-changed', handlePunchStatusChange);
    };
  }, [user, pathname]);

  // Check login status & punch in status
  useEffect(() => {
    const checkStatus = async () => {
      const storedUser = localStorage.getItem('worktracker_user');
      if (!storedUser) return;
      const parsed = JSON.parse(storedUser);
      setUser(parsed);

      try {
        const today = new Date().toISOString().split('T')[0];
        const [attendanceRes, settingsRes] = await Promise.all([
          fetch(`/api/attendance?employeeId=${parsed._id}&date=${today}`),
          fetch('/api/settings'),
        ]);

        const attendanceData = await attendanceRes.json();
        const settingsData = await settingsRes.json();

        if (settingsData.success && settingsData.data) {
          setShiftTimes({
            punchOutTime: settingsData.data.punchOutTime,
            lateCutoffTime: settingsData.data.lateCutoffTime,
          });
        }

        if (attendanceData.success && attendanceData.data && attendanceData.data.length > 0) {
          const rec = attendanceData.data[0];
          const hasPunchedIn = !!rec.checkIn;
          const hasPunchedOut = !!rec.checkOut;
          setIsPunchedIn(hasPunchedIn && !hasPunchedOut);
        } else {
          setIsPunchedIn(false);
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkStatus();
  }, []);

  // Validate if current employee can punch out based on shift settings
  useEffect(() => {
    if (!user || user.userType === 'admin') {
      setCanPunchOut(true);
      return;
    }

    if (!shiftTimes || !shiftTimes.punchOutTime) {
      setCanPunchOut(true);
      return;
    }

    const checkWindow = () => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();

      const [endH, endM] = shiftTimes.punchOutTime!.split(':').map(Number);
      const shiftEndMins = endH * 60 + endM;

      setCanPunchOut(currentMins >= shiftEndMins);
    };

    checkWindow();
    const interval = setInterval(checkWindow, 30000);
    return () => clearInterval(interval);
  }, [user, shiftTimes]);

  const handleLogout = () => {
    localStorage.removeItem('worktracker_user');
    void fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      window.location.assign('/login');
    });
  };

  const openPunchOutModal = async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const [tasksRes, worksRes] = await Promise.all([
        fetch(`/api/tasks?employeeId=${user._id}`),
        fetch(`/api/task-work?employeeId=${user._id}&limit=100`),
      ]);

      const tasksData = await tasksRes.json();
      const worksData = await worksRes.json();

      const taskMap = new Map<string, any>((tasksData.data || []).map((task: any) => [task._id, task]));
      const completedEntries = (worksData.data || []).filter((entry: any) => entry.status === 'Completed' && (entry.date === today || !entry.date));

      const formatTimeTo12Hour = (time24?: string) => {
        if (!time24) return '';
        const parts = time24.split(':');
        if (parts.length < 2) return time24;
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h}:${m} ${ampm}`;
      };

      const formatDurationText = (minutes?: number) => {
        if (!minutes || minutes <= 0) return 'Under 1 minute';
        const totalHours = minutes / 60;
        if (totalHours < 0.1) return `${minutes} mins`;
        const formatted = totalHours.toFixed(1).replace(/\.0$/, '');
        return `${formatted} hours`;
      };

      let reportText = '';
      if (completedEntries.length > 0) {
        reportText = completedEntries.map((entry: any, index: number) => {
          const task = taskMap.get(entry.taskId?._id || entry.taskId) || entry.taskId;
          const projectName = task?.projectId?.name || task?.Project || 'General';
          const taskTitle = task?.title || 'Untitled task';
          const summary = (entry.notes || task?.description || 'Completed work task details.').replace(/<[^>]*>/g, '').trim();
          const duration = formatDurationText(entry.totalMinutes || 0);

          return `Task ${index + 1}:

- Project: ${projectName}
- Task: ${taskTitle}
- Time: ${formatTimeTo12Hour(entry.startTime)} – ${formatTimeTo12Hour(entry.endTime || entry.startTime)} (${duration})
- Status: Completed
- Summary: ${summary}`;
        }).join('\n\n');
      } else {
        reportText = `Daily Work Summary (${today})\n\nShift punch out report completed.`;
      }

      setMailReportContent(reportText);
      setShowPunchOutModal(true);
    } catch (err) {
      console.error(err);
      setMailReportContent(`Daily Work Summary (${new Date().toISOString().split('T')[0]})\n\nShift punch out report completed.`);
      setShowPunchOutModal(true);
    }
  };

  const confirmPunchOut = async () => {
    if (!user) return;
    try {
      setIsPunchingOut(true);
      let location: any = undefined;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, label: 'Device geolocation' }),
            () => resolve(undefined),
            { enableHighAccuracy: true, timeout: 5000 }
          );
        });
      }

      const now = new Date();
      const localDate = now.toISOString().split('T')[0];
      const localTime = now.toTimeString().slice(0, 5);

      const res = await fetch('/api/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user._id,
          action: 'punchOut',
          location,
          localDate,
          localTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('worktracker_user');
        void fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
          window.location.assign('/login');
        });
      } else {
        alert(data.error || 'Failed to punch out');
      }
    } catch (err: any) {
      alert(err.message || 'Error punching out');
    } finally {
      setIsPunchingOut(false);
    }
  };

  const isAdmin = user?.userType === 'admin';
  const canAccessFeatures = isAdmin || isPunchedIn;

  if (!user || pathname === '/login') return null;

  return (
    <aside className={`sidebar no-print ${isCollapsed ? 'collapsed' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flexShrink: 0 }}>
          {/* Brand Header */}
          <div className="sidebar-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: isCollapsed ? '16px' : '8px' }}>
              {!isCollapsed ? (
                <Link href="/" className="sidebar-brand" style={{ margin: 0 }}>
                  <span style={{ fontWeight: 800 }}>Quanto Track</span>
                </Link>
              ) : (
                <Link href="/" className="sidebar-brand" style={{ fontSize: '1.2rem', fontWeight: 900, textAlign: 'center', margin: 0 }} title="TIS Tracker">
                  QT
                </Link>
              )}
              <button
                onClick={toggleCollapse}
                className="sidebar-toggle-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>
          </div>

          {/* Punch Status Indicator for Employees */}
          {!isAdmin && !checkingPunch && (
            <div
              style={{
                margin: isCollapsed ? '8px 4px' : '12px 8px',
                padding: isCollapsed ? '10px' : '12px',
                background: isPunchedIn ? '#ecfdf5' : '#fef2f2',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                alignItems: 'center',
                color: isPunchedIn ? '#065f46' : '#991b1b',
              }}
              title={isPunchedIn ? 'Punched In' : 'Not Punched'}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600
              }}>
                <Clock size={16} />
                {!isCollapsed && <span style={{ fontSize: '0.8rem' }}>{isPunchedIn ? 'Punched In' : 'Not Punched'}</span>}
              </div>
            </div>
          )}

          {/* Main Menu Links */}
          <div className="sidebar-menu-section" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
            <div className="sidebar-menu-title">Main Menu</div>
            <nav className="sidebar-menu">
              {canAccessFeatures ? (
                <Link href="/" className={`sidebar-link ${pathname === '/' ? 'active' : ''}`} data-tooltip="Dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              ) : (
                <div
                  className="sidebar-link"
                  style={{
                    opacity: 0.4,
                    filter: 'blur(0.5px)',
                    cursor: 'not-allowed',
                    pointerEvents: 'none'
                  }}
                  data-tooltip="Dashboard (Locked)"
                >
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </div>
              )}
              {canAccessFeatures ? (
                <Link href="/departments" className={`sidebar-link ${pathname === '/departments' ? 'active' : ''}`} data-tooltip="Departments">
                  <Folder />
                  <span>Departments</span>
                </Link>

              ) : (
                <div
                  className="sidebar-link"
                  style={{
                    opacity: 0.4,
                    filter: 'blur(0.5px)',
                    cursor: 'not-allowed',
                    pointerEvents: 'none'
                  }}
                  data-tooltip="Departments (Locked)"
                >
                  <Folder />
                  <span>Departments</span>
                </div>
              )}
              {canAccessFeatures ? (
                <Link href="/project" className={`sidebar-link ${pathname === '/project' ? 'active' : ''}`} data-tooltip="Project">
                  <Folder />
                  <span>Project</span>
                </Link>

              ) : (
                <div
                  className="sidebar-link"
                  style={{
                    opacity: 0.4,
                    filter: 'blur(0.5px)',
                    cursor: 'not-allowed',
                    pointerEvents: 'none'
                  }}
                  data-tooltip="Project (Locked)"
                >
                  <Folder />
                  <span>Project</span>
                </div>
              )}

              <Link href="/keep-notes" className={`sidebar-link ${pathname === '/keep-notes' ? 'active' : ''}`} data-tooltip="Keep Notes">
                <FileText />
                <span>Keep Notes</span>
              </Link>

              {/* Punch page for admins - always accessible */}
              {isAdmin && (
                <Link href="/punch" className={`sidebar-link ${pathname === '/punch' ? 'active' : ''}`} data-tooltip="Punch In/Out">
                  <Clock />
                  <span>Punch In/Out</span>
                </Link>
              )}

              {!isAdmin && canAccessFeatures && (
                <>
                  <Link href="/tasks" className={`sidebar-link ${pathname === '/tasks' ? 'active' : ''}`} data-tooltip="My Tasks">
                    <CheckSquare />
                    <span>My Tasks</span>
                  </Link>
                  <Link href="/task-history" className={`sidebar-link ${pathname === '/task-history' ? 'active' : ''}`} data-tooltip="My Work History">
                    <History />
                    <span>My Work History</span>
                  </Link>
                  <Link href="/attendance" className={`sidebar-link ${pathname === '/attendance' ? 'active' : ''}`} data-tooltip="Attendance">
                    <Calendar />
                    <span>Attendance</span>
                  </Link>
                </>
              )}

              {isAdmin && (
                <>
                  <Link href="/tasks" className={`sidebar-link ${pathname === '/tasks' ? 'active' : ''}`} data-tooltip="Tasks">
                    <CheckSquare />
                    <span>Tasks</span>
                  </Link>
                  <Link href="/task-history" className={`sidebar-link ${pathname === '/task-history' ? 'active' : ''}`} data-tooltip="Task History">
                    <History />
                    <span>Task History</span>
                  </Link>
                  <Link href="/attendance" className={`sidebar-link ${pathname === '/attendance' ? 'active' : ''}`} data-tooltip="Punch Logs">
                    <Calendar />
                    <span>Punch Logs</span>
                  </Link>
                  <Link href="/employees" className={`sidebar-link ${pathname === '/employees' ? 'active' : ''}`} data-tooltip="Employee">
                    <Users />
                    <span>Employee</span>
                  </Link>
                  <Link href="/roles" className={`sidebar-link ${pathname === '/roles' ? 'active' : ''}`} data-tooltip="Roles">
                    <Briefcase />
                    <span>Roles</span>
                  </Link>
                  <Link href="/clients" className={`sidebar-link ${pathname === '/clients' ? 'active' : ''}`} data-tooltip="Clients">
                    <Briefcase />
                    <span>Clients</span>
                  </Link>
                  <Link href="/reports" className={`sidebar-link ${pathname === '/reports' ? 'active' : ''}`} data-tooltip="Reports">
                    <FileBarChart />
                    <span>Reports</span>
                  </Link>
                  <Link href="/settings" className={`sidebar-link ${pathname === '/settings' ? 'active' : ''}`} data-tooltip="Settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Footer actions - Logout */}
        {user && (
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '12px', flexShrink: 0, paddingBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isCollapsed ? '8px' : '12px', padding: '0 4px', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
              <div className="avatar" style={{ backgroundColor: user.avatarColor || '#3b82f6', width: isCollapsed ? '32px' : '28px', height: isCollapsed ? '32px' : '28px', fontSize: '0.75rem', flexShrink: 0 }} title={user.name}>
                {user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </div>
              {!isCollapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.userType}</div>
                </div>
              )}
            </div>
            {!isAdmin && isPunchedIn && (
              <button
                onClick={canPunchOut ? openPunchOutModal : undefined}
                className="btn btn-punchout"
                disabled={!canPunchOut}
                style={{
                  width: '100%',
                  padding: isCollapsed ? '10px 8px' : '10px 12px',
                  fontSize: isCollapsed ? '0' : '0.8rem',
                  fontWeight: 700,
                  marginBottom: isCollapsed ? '6px' : '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isCollapsed ? '0' : '6px',
                }}
                title={canPunchOut ? 'Punch Out Now' : 'Punch out is currently restricted outside shift hours'}
              >
                <Clock size={18} />
                {!isCollapsed && <span>Punch Out</span>}
              </button>
            )}
            {(isAdmin || !isPunchedIn) && (
              <button
                onClick={handleLogout}
                className="btn btn-danger"
                style={{
                  width: '100%',
                  padding: isCollapsed ? '10px 8px' : '10px 12px',
                  fontSize: isCollapsed ? '0' : '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: isCollapsed ? '0' : '6px'
                }}
                title="Logout"
              >
                <LogOut size={16} />
                {!isCollapsed && <span>Logout</span>}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Punch Out & Daily Work Mail Modal */}
      {showPunchOutModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
          }}
          onClick={() => setShowPunchOutModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '550px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={20} style={{ color: 'var(--accent-primary)' }} />
                Daily Work Mail & Punch Out
              </h3>
              <button
                onClick={() => setShowPunchOutModal(false)}
                className="btn"
                style={{ padding: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Review your generated daily work report mail before finalizing your punch out:
            </p>

            <div style={{ marginBottom: '16px' }}>
              <textarea
                className="form-control"
                readOnly
                rows={10}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  lineHeight: '1.5',
                  background: 'var(--bg-tertiary)',
                  resize: 'vertical',
                  width: '100%'
                }}
                value={mailReportContent}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPunchOutModal(false)}
                disabled={isPunchingOut}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(mailReportContent);
                  alert('Mail report copied to clipboard!');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Copy size={14} />
                <span>Copy Mail</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmPunchOut}
                disabled={isPunchingOut}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isPunchingOut ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Punching Out...</span>
                  </>
                ) : (
                  <>
                    <Clock size={14} />
                    <span>Confirm Punch Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
