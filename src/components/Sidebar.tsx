'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FileBarChart, Calendar, ChevronRight, LogOut
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
    <aside className="sidebar no-print">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <div>
          {/* Brand Header */}
          <div className="sidebar-header">
            <Link href="/" className="sidebar-brand">
              <span style={{ fontWeight: 800 }}>Work Report</span>
            </Link>

            <div className="sidebar-team-card">
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>TIS Pvt. Ltd.</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Team - {memberCount} Members</div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Main Menu Links */}
          <div className="sidebar-menu-section">
            <div className="sidebar-menu-title">Main Menu</div>
            <nav className="sidebar-menu">
              <Link href="/" className={`sidebar-link ${pathname === '/' ? 'active' : ''}`}>
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>

              {isAdmin && (
                <>
                  <Link href="/attendance" className={`sidebar-link ${pathname === '/attendance' ? 'active' : ''}`}>
                    <Calendar size={16} />
                    <span>Attendance</span>
                  </Link>
                  <Link href="/employees" className={`sidebar-link ${pathname === '/employees' ? 'active' : ''}`}>
                    <Users size={16} />
                    <span>Employee</span>
                  </Link>
                  <Link href="/reports" className={`sidebar-link ${pathname === '/reports' ? 'active' : ''}`}>
                    <FileBarChart size={16} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '0 4px' }}>
              <div className="avatar" style={{ backgroundColor: user.avatarColor || '#3b82f6', width: '24px', height: '24px', fontSize: '0.65rem' }}>
                {user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.userType}</div>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="btn btn-danger"
              style={{ width: '100%', padding: '5px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <LogOut size={12} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
