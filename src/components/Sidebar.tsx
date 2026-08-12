'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FileBarChart, Settings,
  HelpCircle, ChevronRight
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [projects, setProjects] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState<number | string>('...');

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (data.success) {
          setProjects(data.data);
        }
      } catch (err) {
        console.error('Error loading projects in sidebar', err);
      }
    }
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
    loadProjects();
    loadMembers();
  }, [pathname]);

  return (
    <aside className="sidebar no-print">
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
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <Link href="/employees" className={`sidebar-link ${pathname === '/employees' ? 'active' : ''}`}>
              <Users size={18} />
              <span>Employee</span>
            </Link>
            <Link href="/reports" className={`sidebar-link ${pathname === '/reports' ? 'active' : ''}`}>
              <FileBarChart size={18} />
              <span>Reports</span>
            </Link>
          </nav>
        </div>


      </div>


    </aside>
  );
}
