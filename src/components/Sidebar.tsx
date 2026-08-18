'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Folder, Users, FileBarChart, Calendar, ChevronRight, ChevronLeft, LogOut, Clock, Settings, CheckSquare, History
} from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';

export default function Sidebar() {
  const pathname = usePathname();
  const [memberCount, setMemberCount] = useState<number | string>('...');
  const [user, setUser] = useState<any>(null);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [checkingPunch, setCheckingPunch] = useState(true);

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
        } else {
          setIsPunchedIn(false);
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

  useEffect(() => {
    if (pathname === '/login') return;

    async function loadMembers() {
      try {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.success) {
          setMemberCount(data.data.length);
        }
      } catch (err) {
        console.error('Error loading members in sidebar', err);
      }
    }
    loadMembers();
  }, [pathname]);

  if (pathname === '/login') return null;

  const handleLogout = () => {
    localStorage.removeItem('worktracker_user');
    void fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      window.location.assign('/login');
    });
  };

  const isAdmin = user?.userType === 'admin';
  const canAccessFeatures = isAdmin || isPunchedIn;

  return (
    <aside className={`sidebar no-print ${isCollapsed ? 'collapsed' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <div>
          {/* Brand Header */}
          <div className="sidebar-header" style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: isCollapsed ? '12px' : '4px', marginBottom: '8px' }}>
              {!isCollapsed ? (
                <Link href="/" className="sidebar-brand" style={{ margin: 0 }}>
                  <span style={{ fontWeight: 800 }}>TIS Tracker</span>
                </Link>
              ) : (
                <Link href="/" className="sidebar-brand" style={{ fontSize: '1rem', fontWeight: 900, textAlign: 'center', margin: 0 }}>
                  TIS
                </Link>
              )}
              <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', gap: '8px' }}>
                <NotificationCenter />
                <button
                  onClick={toggleCollapse}
                  className="sidebar-toggle-btn"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px'
                  }}
                  title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="sidebar-team-card" style={{ padding: '6px 8px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>TIS Pvt. Ltd.</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Team - {memberCount} Members</div>
                </div>
              </div>
            )}
          </div>

          {/* Punch Status Indicator for Employees */}
          {!isAdmin && !checkingPunch && (
            <div
              style={{
                margin: isCollapsed ? '4px' : '8px',
                padding: isCollapsed ? '6px' : '8px',
                background: isPunchedIn ? '#ecfdf5' : '#fef2f2',
                borderRadius: '6px',
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
                gap: '6px',
                fontWeight: 600
              }}>
                <Clock size={12} />
                {!isCollapsed && <span style={{ fontSize: '0.7rem' }}>{isPunchedIn ? 'Punched In' : 'Not Punched'}</span>}
              </div>
            </div>
          )}

          {/* Main Menu Links */}
          <div className="sidebar-menu-section">
            <div className="sidebar-menu-title">Main Menu</div>
            <nav className="sidebar-menu">
              {canAccessFeatures ? (
                <Link href="/" className={`sidebar-link ${pathname === '/' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                  <LayoutDashboard size={14} />
                  <span>Dashboard</span>
                </Link>
              ) : (
                <div
                  className="sidebar-link"
                  style={{
                    padding: '6px 8px',
                    fontSize: '0.78rem',
                    opacity: 0.4,
                    filter: 'blur(0.5px)',
                    cursor: 'not-allowed',
                    pointerEvents: 'none'
                  }}
                >
                  <LayoutDashboard size={14} />
                  <span>Dashboard</span>
                </div>
              )}
              {canAccessFeatures ? (
                <Link href="/departments" className={`sidebar-link ${pathname === '/departments' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                  <Folder size={14} />
                  <span>Departments</span>
                </Link>

              ) : (
                <div
                  className="sidebar-link"
                  style={{
                    padding: '6px 8px',
                    fontSize: '0.78rem',
                    opacity: 0.4,
                    filter: 'blur(0.5px)',
                    cursor: 'not-allowed',
                    pointerEvents: 'none'
                  }}
                >
                  <Folder size={14} />
                  <span>Departments</span>
                </div>
              )}
              {canAccessFeatures ? (
                <Link href="/project" className={`sidebar-link ${pathname === '/project' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                  <Folder size={14} />
                  <span>Project</span>
                </Link>

              ) : (
                <div
                  className="sidebar-link"
                  style={{
                    padding: '6px 8px',
                    fontSize: '0.78rem',
                    opacity: 0.4,
                    filter: 'blur(0.5px)',
                    cursor: 'not-allowed',
                    pointerEvents: 'none'
                  }}
                >
                  <Folder size={14} />
                  <span>Project</span>
                </div>
              )}

              {/* Punch page for all users - always accessible */}
              <Link href="/punch" className={`sidebar-link ${pathname === '/punch' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                <Clock size={14} />
                <span>Punch In/Out</span>
              </Link>

              {!isAdmin && canAccessFeatures && (
                <>
                  <Link href="/tasks" className={`sidebar-link ${pathname === '/tasks' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                    <CheckSquare size={14} />
                    <span>My Tasks</span>
                  </Link>
                  <Link href="/task-history" className={`sidebar-link ${pathname === '/task-history' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                    <History size={14} />
                    <span>My Work History</span>
                  </Link>
                </>
              )}

              {isAdmin && (
                <>
                  <Link href="/tasks" className={`sidebar-link ${pathname === '/tasks' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                    <CheckSquare size={14} />
                    <span>Tasks</span>
                  </Link>
                  <Link href="/task-history" className={`sidebar-link ${pathname === '/task-history' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                    <History size={14} />
                    <span>Task History</span>
                  </Link>
                  <Link href="/attendance" className={`sidebar-link ${pathname === '/attendance' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                    <Calendar size={14} />
                    <span>Attendance</span>
                  </Link>
                  <Link href="/employees" className={`sidebar-link ${pathname === '/employees' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                    <Users size={14} />
                    <span>Employee</span>
                  </Link>
                  <Link href="/reports" className={`sidebar-link ${pathname === '/reports' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                    <FileBarChart size={14} />
                    <span>Reports</span>
                  </Link>
                  <Link href="/settings" className={`sidebar-link ${pathname === '/settings' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                    <Settings size={14} />
                    <span>Settings</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Footer actions - Logout */}
        {user && (
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '0 4px', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
              <div className="avatar" style={{ backgroundColor: user.avatarColor || '#3b82f6', width: '22px', height: '22px', fontSize: '0.65rem', flexShrink: 0 }} title={user.name}>
                {user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </div>
              {!isCollapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.userType}</div>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-danger"
              style={{ width: '100%', padding: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isCollapsed ? '0' : '4px' }}
              title="Logout"
            >
              <LogOut size={10} />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
