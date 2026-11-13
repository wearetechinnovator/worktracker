'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Flame,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  FileText,
  Sparkles,
  CheckSquare,
  UserCheck,
} from 'lucide-react';
import TasksOverviewPanel from '@/components/TasksOverviewPanel';
import { usePunch } from '@/context/PunchContext';
import { formatTimeTo12H } from '@/lib/time';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [liveTime, setLiveTime] = useState<string>('');
  const [liveDate, setLiveDate] = useState<string>('');
  const [taskStats, setTaskStats] = useState({
    total: 0,
    inProgress: 0,
    onReview: 0,
    completed: 0,
    urgent: 0,
    todo: 0,
  });

  const { isPunchedIn, attendance, loading: punchLoading } = usePunch();

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setLiveDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const result = await response.json();
        if (response.ok && result.success && result.user) {
          setUser({
            ...result.user,
            user_role: Number(result.user.user_role),
            userType: Number(result.user.user_role) === 1 ? 'admin' : 'employee',
          });
        }
      } catch (error) {
        console.error('Failed to load user in dashboard:', error);
      }
    };
    loadCurrentUser();
  }, []);

  const employeeName = user?.name || user?.full_name || 'Team Member';
  const designation = user?.designation || user?.role || 'Employee';

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        {/* Main 2-Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 28, alignItems: 'start' }}>

          {/* ── LEFT SIDE ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* 1. Hero Welcome Banner */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 60%, #3730a3 100%)', padding: '28px 32px', color: '#fff', boxShadow: '0 4px 20px rgba(79,70,229,0.3)' }}>
              <div style={{ position: 'absolute', top: -48, right: -48, width: 180, height: 180, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)', filter: 'blur(24px)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', backgroundColor: 'rgba(96,165,250,0.15)', filter: 'blur(20px)', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', fontSize: 12, fontWeight: 500, color: '#bfdbfe', width: 'fit-content' }}>
                    <Sparkles size={13} style={{ color: '#fcd34d' }} />
                    <span>{designation}</span>
                  </div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
                    Welcome back, {employeeName} 👋
                  </h1>
                  <p style={{ fontSize: 13, color: 'rgba(191,219,254,0.9)', margin: 0, maxWidth: 480, lineHeight: 1.6 }}>
                    Here is your productivity snapshot and assigned work for today. Keep track of deadlines and update your progress smoothly.
                  </p>
                </div>

                {/* Clock Badge */}
                <div style={{ flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', borderRadius: 14, padding: '12px 18px', border: '1px solid rgba(255,255,255,0.15)', textAlign: 'right', minWidth: 140 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: 'monospace' }}>
                    {liveTime || '--:--:--'}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(191,219,254,0.85)', fontWeight: 500, marginTop: 3 }}>
                    {liveDate ? liveDate.split(',')[0] : 'Today'}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. KPI Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
              {/* In Progress */}
              <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>In Progress</span>
                  <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={17} style={{ color: '#2563eb' }} />
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{taskStats.inProgress}</div>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Active tasks</p>
              </div>

              {/* On Review */}
              <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>On Review</span>
                  <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={17} style={{ color: '#7c3aed' }} />
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{taskStats.onReview}</div>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Awaiting review</p>
              </div>

              {/* Completed */}
              <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Completed</span>
                  <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={17} style={{ color: '#059669' }} />
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{taskStats.completed}</div>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Finished tasks</p>
              </div>

              {/* Urgent */}
              <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #fecaca', padding: '20px 18px', boxShadow: '0 1px 4px rgba(220,38,38,0.08)', background: 'linear-gradient(135deg, #fff 60%, #fff5f5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Flame size={12} style={{ color: '#ef4444' }} /> Urgent
                  </span>
                  <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Flame size={17} style={{ color: '#dc2626' }} />
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{taskStats.urgent}</div>
                <p style={{ fontSize: 11, color: '#dc2626', opacity: 0.7, marginTop: 6, fontWeight: 500 }}>Needs focus</p>
              </div>
            </div>

            {/* 3. Today's Attendance Card */}
            <div style={{ backgroundColor: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={19} style={{ color: '#4f46e5' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>Today&apos;s Attendance &amp; Shift</h3>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, marginTop: 2 }}>{liveDate || 'Work Shift Overview'}</p>
                  </div>
                </div>
                <Link href="/user/punch" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
                  Punch Details <ArrowUpRight size={14} />
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: 13, padding: '16px 18px', border: '1px solid #e9edf2', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 500 }}>Punch Status</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: isPunchedIn ? '#10b981' : '#94a3b8', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      {punchLoading ? 'Checking...' : isPunchedIn ? 'Punched In' : 'Not Punched In'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {isPunchedIn ? 'Currently on shift' : 'Punch in to record hours'}
                  </span>
                </div>

                <div style={{ backgroundColor: '#f8fafc', borderRadius: 13, padding: '16px 18px', border: '1px solid #e9edf2', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 500 }}>In Time</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                    {attendance?.punch_in_on || attendance?.checkIn
                      ? formatTimeTo12H(attendance.punch_in_on || attendance.checkIn)
                      : '--:--'}
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {attendance?.punch_in_on || attendance?.checkIn ? 'First punch of day' : 'Not logged yet'}
                  </span>
                </div>

                <div style={{ backgroundColor: '#f8fafc', borderRadius: 13, padding: '16px 18px', border: '1px solid #e9edf2', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 500 }}>Out Time / Status</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                    {attendance?.punch_out_on || attendance?.checkOut
                      ? formatTimeTo12H(attendance.punch_out_on || attendance.checkOut)
                      : isPunchedIn ? 'Active Shift' : '--:--'}
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {isPunchedIn ? 'Currently working' : 'Session complete or pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Quick Shortcuts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}>
              <Link href="/user/tasks" style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', transition: 'box-shadow 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckSquare size={19} style={{ color: '#2563eb' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>Task Board</h4>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, marginTop: 2 }}>Kanban &amp; full backlog</p>
                  </div>
                </div>
                <ArrowUpRight size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
              </Link>

              <Link href="/user/attendance" style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={19} style={{ color: '#4f46e5' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>Attendance</h4>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, marginTop: 2 }}>Monthly logs &amp; off days</p>
                  </div>
                </div>
                <ArrowUpRight size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
              </Link>

              <Link href="/user/keep-notes" style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={19} style={{ color: '#d97706' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>Keep Notes</h4>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, marginTop: 2 }}>Scratchpad &amp; drafts</p>
                  </div>
                </div>
                <ArrowUpRight size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
              </Link>
            </div>
          </div>

          {/* ── RIGHT SIDE: Task Panel ── */}
          <div style={{ width: '100%', position: 'sticky', top: 24 }}>
            <TasksOverviewPanel onStatsChange={setTaskStats} />
          </div>
        </div>
      </div>
    </div>
  );
}
