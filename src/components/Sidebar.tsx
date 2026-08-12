'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Folder, Users, FileBarChart, Calendar, ChevronRight, LogOut
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [memberCount, setMemberCount] = useState<number | string>('...');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Hide sidebar checks and loading user session on mount/path change
    const storedUser = localStorage.getItem('worktracker_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, [pathname]);

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
    window.location.href = '/login';
  };

  const isAdmin = user?.userType === 'admin';

  return (
    <aside className="sidebar no-print" style={{ width: '180px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <div>
          {/* Brand Header */}
          <div className="sidebar-header" style={{ marginBottom: '14px' }}>
            <Link href="/" className="sidebar-brand">
              <span style={{ fontWeight: 800 }}>Work Report</span>
            </Link>

            <div className="sidebar-team-card" style={{ padding: '6px 8px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>TIS Pvt. Ltd.</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Team - {memberCount} Members</div>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Main Menu Links */}
          <div className="sidebar-menu-section">
            <div className="sidebar-menu-title">Main Menu</div>
            <nav className="sidebar-menu">
              <Link href="/" className={`sidebar-link ${pathname === '/' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </Link>

              <Link href="/departments" className={`sidebar-link ${pathname === '/departments' ? 'active' : ''}`} style={{ padding: '6px 8px', fontSize: '0.78rem' }}>
                <Folder size={14} />
                <span>Department</span>
              </Link>

              {isAdmin && (
                <>
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
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Footer actions - Logout */}
        {user && (
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '0 4px' }}>
              <div className="avatar" style={{ backgroundColor: user.avatarColor || '#3b82f6', width: '22px', height: '22px', fontSize: '0.65rem' }}>
                {user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.userType}</div>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="btn btn-danger"
              style={{ width: '100%', padding: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <LogOut size={10} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
