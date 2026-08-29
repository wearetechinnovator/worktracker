'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Folder, Users, FileBarChart, Calendar, ChevronRight, ChevronLeft, ChevronDown, LogOut, Clock, Settings, CheckSquare, History, Briefcase, FileText, Mail, Copy, Loader2, Menu, X
} from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [canPunchOut, setCanPunchOut] = useState(false);
  const [adminAllowedOut, setAdminAllowedOut] = useState(false);
  const [checkingPunch, setCheckingPunch] = useState(true);
  const [shiftTimes, setShiftTimes] = useState<{ punchOutStartTime?: string; punchOutEndTime?: string } | null>(null);

  // Punch Out Mail Modal States
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);
  const [mailReportContent, setMailReportContent] = useState('');
  const [isPunchingOut, setIsPunchingOut] = useState(false);

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Submenu Accordion Toggle State
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    work: true,
    time: true,
    org: true,
  });

  // Collapsed Sidebar Floating Tooltip Portal State
  const [hoveredTooltip, setHoveredTooltip] = useState<{ title: string; top: number } | null>(null);

  const handleItemMouseEnter = (title: string, e: React.MouseEvent) => {
    if (isCollapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredTooltip({ title, top: rect.top + rect.height / 2 });
    }
  };

  const handleItemMouseLeave = () => {
    setHoveredTooltip(null);
  };

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

        const isAllowedByAdmin = Boolean(result.data?.isPunchOutAllowedByAdmin);
        setAdminAllowedOut(isAllowedByAdmin);

        if (result.success && isCurrentlyCheckedIn) {
          setIsPunchedIn(true);
          setCanPunchOut(!!result.data?.canPunchOut || isAllowedByAdmin);
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
            punchOutStartTime: settingsData.data.punchOutStartTime,
            punchOutEndTime: settingsData.data.punchOutEndTime,
          });
        }

        const records = Array.isArray(attendanceData.data)
          ? attendanceData.data
          : (attendanceData.data?.attendance || []);

        if (records.length > 0) {
          const rec = records.find((r: any) => r.date === today) || records[records.length - 1];
          const hasPunchedIn = !!rec.checkIn;
          const hasPunchedOut = !!rec.checkOut;
          setIsPunchedIn(hasPunchedIn && !hasPunchedOut);
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkStatus();
  }, []);

  // Validate if current employee can punch out based on shift settings
  useEffect(() => {
    if (!user || user.userType === 'admin' || adminAllowedOut) {
      setCanPunchOut(true);
      return;
    }

    if (!shiftTimes || !shiftTimes.punchOutStartTime || !shiftTimes.punchOutEndTime) {
      setCanPunchOut(true);
      return;
    }

    const checkWindow = () => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = shiftTimes.punchOutStartTime!.split(':').map(Number);
      const [endH, endM] = shiftTimes.punchOutEndTime!.split(':').map(Number);

      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      let isAllowed = false;
      if (startMins <= endMins) {
        isAllowed = currentMins >= startMins && currentMins <= endMins;
      } else {
        isAllowed = currentMins >= startMins || currentMins <= endMins;
      }

      setCanPunchOut(isAllowed);
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

const toggleGroup = (groupKey: string) => {
      setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const [isMobileOpen, setIsMobileOpen] = useState(false);

    useEffect(() => {
      setIsMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
      if (['/project', '/tasks', '/task-history'].includes(pathname)) {
        setOpenGroups((prev) => ({ ...prev, work: true }));
      } else if (['/punch', '/attendance', '/punch-in-out'].includes(pathname)) {
        setOpenGroups((prev) => ({ ...prev, time: true }));
      } else if (['/employees', '/departments', '/roles', '/clients'].includes(pathname)) {
        setOpenGroups((prev) => ({ ...prev, org: true }));
      }
    }, [pathname]);

    const isAdmin = user?.userType === 'admin';
    const canAccessFeatures = isAdmin || isPunchedIn;

    if (!user || pathname === '/login') return null;

    return (
      <>
        {/* MOBILE TOP BAR (Shown on mobile screens <= 768px) */}
        <div className="mobile-top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Toggle Navigation Menu"
            >
              {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', textDecoration: 'none' }}>
              Quanto Track
            </Link>
          </div>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="avatar" style={{ backgroundColor: user.avatarColor || '#3b82f6', width: '28px', height: '28px', fontSize: '0.72rem', fontWeight: 700 }}>
                {user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </div>
            </div>
          )}
        </div>

        {/* MOBILE BACKDROP OVERLAY */}
        <div
          className={`sidebar-mobile-backdrop ${isMobileOpen ? 'show' : ''}`}
          onClick={() => setIsMobileOpen(false)}
        />

        <aside className={`sidebar no-print ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

          {/* TOP HEADER SECTION */}
          <div style={{ flexShrink: 0 }}>
            {/* Brand Header */}
            <div className="sidebar-header" style={{ marginBottom: isCollapsed ? '10px' : '14px' }}>
              <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: isCollapsed ? '6px' : '8px' }}>
                {!isCollapsed ? (
                  <Link href="/" className="sidebar-brand" style={{ margin: 0 }}>
                    <span style={{ fontWeight: 800 }}>Quanto Track</span>
                  </Link>
                ) : (
                  <Link href="/" className="sidebar-brand" style={{ fontSize: '1.1rem', fontWeight: 900, textAlign: 'center', margin: 0, color: 'var(--accent-primary)' }} title="Quanto Track">
                    QT
                  </Link>
                )}
                <button
                  onClick={toggleCollapse}
                  className="sidebar-toggle-btn"
                  style={{
                    background: isCollapsed ? 'var(--bg-tertiary)' : 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    width: isCollapsed ? '32px' : 'auto',
                    height: isCollapsed ? '32px' : 'auto',
                  }}
                  title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={18} />}
                </button>
              </div>
            </div>

            {/* Punch Status Indicator for Employees */}
            {!isAdmin && !checkingPunch && (
              <div
                style={{
                  margin: isCollapsed ? '8px 4px' : '8px 4px 12px 4px',
                  padding: isCollapsed ? '10px' : '10px 12px',
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
          </div>

          {/* MIDDLE SCROLLABLE MENU SECTION */}
          <div className="sidebar-menu-section" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '4px' }}>
            <div className="sidebar-menu-title">Navigation</div>
            <nav className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>

              {/* 1. DASHBOARD */}
              {canAccessFeatures ? (
                <Link
                  href="/"
                  className={`sidebar-link ${pathname === '/' ? 'active' : ''}`}
                  onMouseEnter={(e) => handleItemMouseEnter('Dashboard', e)}
                  onMouseLeave={handleItemMouseLeave}
                >
                  <LayoutDashboard size={17} />
                  <span>Dashboard</span>
                </Link>
              ) : (
                <div
                  className="sidebar-link"
                  style={{ opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }}
                  onMouseEnter={(e) => handleItemMouseEnter('Dashboard (Locked)', e)}
                  onMouseLeave={handleItemMouseLeave}
                >
                  <LayoutDashboard size={17} />
                  <span>Dashboard</span>
                </div>
              )}

              {/* 2. WORK & PROJECTS SUBMENU */}
              <div className="sidebar-group">
                <div
                  className={`sidebar-group-header ${['/project', '/tasks', '/task-history'].includes(pathname) ? 'active-group' : ''}`}
                  onClick={() => toggleGroup('work')}
                >
                  <div className="sidebar-group-title">
                    <Folder size={17} />
                    <span>Work & Projects</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className="chevron-icon"
                    style={{
                      transform: openGroups.work ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: 'var(--text-muted)',
                    }}
                  />
                </div>

                {(openGroups.work || isCollapsed) && (
                  <div className="sidebar-submenu">
                    {canAccessFeatures ? (
                      <Link
                        href="/project"
                        className={`sidebar-link ${pathname === '/project' ? 'active' : ''}`}
                        onMouseEnter={(e) => handleItemMouseEnter('Projects', e)}
                        onMouseLeave={handleItemMouseLeave}
                      >
                        <Folder size={15} />
                        <span>Project</span>
                      </Link>
                    ) : (
                      <div
                        className="sidebar-link"
                        style={{ opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }}
                        onMouseEnter={(e) => handleItemMouseEnter('Project (Locked)', e)}
                        onMouseLeave={handleItemMouseLeave}
                      >
                        <Folder size={15} />
                        <span>Project</span>
                      </div>
                    )}

                    <Link
                      href="/tasks"
                      className={`sidebar-link ${pathname === '/tasks' ? 'active' : ''}`}
                      onMouseEnter={(e) => handleItemMouseEnter(isAdmin ? 'Tasks' : 'My Tasks', e)}
                      onMouseLeave={handleItemMouseLeave}
                    >
                      <CheckSquare size={15} />
                      <span>{isAdmin ? 'Tasks' : 'My Tasks'}</span>
                    </Link>

                    <Link
                      href="/task-history"
                      className={`sidebar-link ${pathname === '/task-history' ? 'active' : ''}`}
                      onMouseEnter={(e) => handleItemMouseEnter(isAdmin ? 'Task History' : 'My Work History', e)}
                      onMouseLeave={handleItemMouseLeave}
                    >
                      <History size={15} />
                      <span>{isAdmin ? 'Task History' : 'My Work History'}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. TIME & ATTENDANCE SUBMENU */}
              <div className="sidebar-group">
                <div
                  className={`sidebar-group-header ${['/punch', '/attendance', '/punch-in-out'].includes(pathname) ? 'active-group' : ''}`}
                  onClick={() => toggleGroup('time')}
                >
                  <div className="sidebar-group-title">
                    <Clock size={17} />
                    <span>Time & Attendance</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className="chevron-icon"
                    style={{
                      transform: openGroups.time ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: 'var(--text-muted)',
                    }}
                  />
                </div>

                {(openGroups.time || isCollapsed) && (
                  <div className="sidebar-submenu">
                    <Link
                      href="/punch"
                      className={`sidebar-link ${pathname === '/punch' ? 'active' : ''}`}
                      onMouseEnter={(e) => handleItemMouseEnter('Punch In/Out', e)}
                      onMouseLeave={handleItemMouseLeave}
                    >
                      <Clock size={15} />
                      <span>Punch In/Out</span>
                    </Link>

                    <Link
                      href="/attendance"
                      className={`sidebar-link ${pathname === '/attendance' ? 'active' : ''}`}
                      onMouseEnter={(e) => handleItemMouseEnter(isAdmin ? 'Punch Logs' : 'Attendance', e)}
                      onMouseLeave={handleItemMouseLeave}
                    >
                      <Calendar size={15} />
                      <span>{isAdmin ? 'Punch Logs' : 'Attendance'}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 4. ORGANISATION / TEAM SUBMENU (Admin & Allowed Staff) */}
              {(isAdmin || canAccessFeatures) && (
                <div className="sidebar-group">
                  <div
                    className={`sidebar-group-header ${['/employees', '/departments', '/roles', '/clients'].includes(pathname) ? 'active-group' : ''}`}
                    onClick={() => toggleGroup('org')}
                  >
                    <div className="sidebar-group-title">
                      <Users size={17} />
                      <span>Organisation</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className="chevron-icon"
                      style={{
                        transform: openGroups.org ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        color: 'var(--text-muted)',
                      }}
                    />
                  </div>

                  {(openGroups.org || isCollapsed) && (
                    <div className="sidebar-submenu">
                      {isAdmin && (
                        <Link
                          href="/employees"
                          className={`sidebar-link ${pathname === '/employees' ? 'active' : ''}`}
                          onMouseEnter={(e) => handleItemMouseEnter('Employee', e)}
                          onMouseLeave={handleItemMouseLeave}
                        >
                          <Users size={15} />
                          <span>Employee</span>
                        </Link>
                      )}

                      <Link
                        href="/departments"
                        className={`sidebar-link ${pathname === '/departments' ? 'active' : ''}`}
                        onMouseEnter={(e) => handleItemMouseEnter('Departments', e)}
                        onMouseLeave={handleItemMouseLeave}
                      >
                        <Folder size={15} />
                        <span>Departments</span>
                      </Link>

                      {isAdmin && (
                        <>
                          <Link
                            href="/roles"
                            className={`sidebar-link ${pathname === '/roles' ? 'active' : ''}`}
                            onMouseEnter={(e) => handleItemMouseEnter('Roles', e)}
                            onMouseLeave={handleItemMouseLeave}
                          >
                            <Briefcase size={15} />
                            <span>Roles</span>
                          </Link>

                          <Link
                            href="/clients"
                            className={`sidebar-link ${pathname === '/clients' ? 'active' : ''}`}
                            onMouseEnter={(e) => handleItemMouseEnter('Clients', e)}
                            onMouseLeave={handleItemMouseLeave}
                          >
                            <Briefcase size={15} />
                            <span>Clients</span>
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 5. PERSONAL WORKSPACE */}
              <Link
                href="/keep-notes"
                className={`sidebar-link ${pathname === '/keep-notes' ? 'active' : ''}`}
                onMouseEnter={(e) => handleItemMouseEnter('Keep Notes', e)}
                onMouseLeave={handleItemMouseLeave}
              >
                <FileText size={17} />
                <span>Keep Notes</span>
              </Link>

              {/* 6. SYSTEM SETTINGS (Admin Only) */}
              {isAdmin && (
                <Link
                  href="/settings"
                  className={`sidebar-link ${pathname === '/settings' ? 'active' : ''}`}
                  onMouseEnter={(e) => handleItemMouseEnter('Settings', e)}
                  onMouseLeave={handleItemMouseLeave}
                >
                  <Settings size={17} />
                  <span>Settings</span>
                </Link>
              )}

            </nav>
          </div>

          {/* BOTTOM STICKY FOOTER SECTION (User Info & Logout) */}
          {user && (
            <div
              style={{
                marginTop: 'auto',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '12px',
                paddingBottom: '4px',
                flexShrink: 0,
                background: 'var(--bg-secondary)',
                zIndex: 10,
              }}
            >
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
        {/* FIXED TOOLTIP PORTAL FOR COLLAPSED SIDEBAR */}
        {isCollapsed && hoveredTooltip && (
          <div
            style={{
              position: 'fixed',
              left: '74px',
              top: `${hoveredTooltip.top}px`,
              transform: 'translateY(-50%)',
              background: '#0f172a',
              color: '#ffffff',
              padding: '5px 11px',
              borderRadius: '6px',
              fontSize: '0.73rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              zIndex: 999999,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '-5px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderRight: '5px solid #0f172a',
              }}
            />
            {hoveredTooltip.title}
          </div>
        )}
      </aside>
    </>
  );
}
