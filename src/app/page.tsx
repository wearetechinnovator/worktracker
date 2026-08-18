'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock, Plus, Folder, Calendar, Users, UserPlus, Mail, ChevronRight,
  AlertCircle
} from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/time';
import MyTasks from '@/components/MyTasks';
import PageShimmer from '@/components/PageShimmer';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  Project: string;
  status: string;
  avatarColor: string;
  totalMinutes: number;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  color: string;
  totalMinutes: number;
  entryCount: number;
  members: any[];
}

interface WorkEntry {
  _id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  employeeId: string;
  employeeName: string;
  employeeAvatarColor: string;
  employeeRole: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  actualTime: number;
  description?: string;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);

  // Team Punch Pagination
  const [teamPage, setTeamPage] = useState(1);

  // Selected Day for Timeline (default to today)
  const [selectedTimelineDate, setSelectedTimelineDate] = useState('');

  // Employee Form State
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState('UI UX Designer');
  const [empDept, setEmpDept] = useState('Design');
  const [empStatus, setEmpStatus] = useState('Active');
  const [empColor, setEmpColor] = useState('#3b82f6');
  const [empPass, setEmpPass] = useState('password123');
  const [empType, setEmpType] = useState('employee');
  const [submittingEmp, setSubmittingEmp] = useState(false);

  // Project Form State
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projColor, setProjColor] = useState('#3b82f6');
  const [projMembers, setProjMembers] = useState<string[]>([]);
  const [submittingProj, setSubmittingProj] = useState(false);

  // Work Log Form State
  const [workProjId, setWorkProjId] = useState('');
  const [workEmpId, setWorkEmpId] = useState('');
  const [workTitle, setWorkTitle] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [workDesc, setWorkDesc] = useState('');
  const [submittingWork, setSubmittingWork] = useState(false);

  // Email Summary Modal State
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailContent, setMailContent] = useState('');

  // Presets
  const colors = ['#3b82f6', '#10b981', '#7f56d9', '#f59e0b', '#f43f5e', '#06b6d4', '#475569'];
  const Projects = ['Design', 'Development', 'Marketing', 'Human Resource', 'Management'];
  const statuses = ['Active', 'Sick Leave', 'Annual Leave', 'Work From Home'];

  // Check login session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      const todayStr = new Date().toISOString().split('T')[0];
      setSelectedTimelineDate(todayStr);
      setWorkDate(todayStr);
    }
  }, [router]);

  // Fetch Data based on user role
  const fetchData = useCallback(async (isSilent = false) => {
    if (!user) return;

    try {
      if (!isSilent) setLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard');
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error || 'Failed to connect to database');
      const { projects: nextProjects, employees: nextEmployees, entries: nextEntries } = result.data;

      setProjects(nextProjects);
      setEmployees(nextEmployees);
      setEntries(nextEntries);

      setWorkProjId((prev) => prev || (nextProjects.length > 0 ? nextProjects[0]._id : ''));
      setWorkEmpId((prev) => {
        if (user.userType === 'employee') return user._id;
        return prev || (nextEmployees.length > 0 ? nextEmployees[0]._id : '');
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Handle Employee Form Submit
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim() || !empPass.trim()) return;

    try {
      setSubmittingEmp(true);
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empName,
          email: empEmail,
          role: empRole,
          Project: empDept,
          status: empStatus,
          avatarColor: empColor,
          password: empPass,
          userType: empType
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add employee');

      setEmpName('');
      setEmpEmail('');
      setEmpPass('password123');
      setIsEmployeeModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingEmp(false);
    }
  };

  // Handle Project Form Submit
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;

    try {
      setSubmittingProj(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projName,
          description: projDesc,
          color: projColor,
          members: projMembers
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create project');

      setProjName('');
      setProjDesc('');
      setProjMembers([]);
      setIsProjectModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingProj(false);
    }
  };

  // Handle Work Entry Submit
  const handleAddWork = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmpId = user.userType === 'employee' ? user._id : workEmpId;
    if (!workProjId || !finalEmpId || !workTitle.trim() || !workDate || !workStart || !workEnd) return;

    try {
      setSubmittingWork(true);
      const res = await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: workProjId,
          employeeId: finalEmpId,
          title: workTitle,
          date: workDate,
          startTime: workStart,
          endTime: workEnd,
          description: workDesc
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to log task');

      setWorkTitle('');
      setWorkDesc('');
      setIsWorkModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingWork(false);
    }
  };


  const handleMemberSelectToggle = (empId: string) => {
    if (projMembers.includes(empId)) {
      setProjMembers(projMembers.filter(id => id !== empId));
    } else {
      setProjMembers([...projMembers, empId]);
    }
  };

  // Filter timeline logs
  const timelineEntries = entries.filter(e => e.date === selectedTimelineDate);

  const calculateTimelinePosition = (start: string, end: string) => {
    const parseTimeToMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const timelineStartMins = 8 * 60; // 08:00
    const timelineEndMins = 18 * 60;  // 18:00
    const totalMins = timelineEndMins - timelineStartMins;

    const startMins = Math.max(timelineStartMins, parseTimeToMins(start));
    const endMins = Math.min(timelineEndMins, parseTimeToMins(end));

    const leftPct = ((startMins - timelineStartMins) / totalMins) * 100;
    const widthPct = ((endMins - startMins) / totalMins) * 100;

    return {
      left: `${Math.max(0, Math.min(100, leftPct))}%`,
      width: `${Math.max(2, Math.min(100, widthPct))}%`
    };
  };

  const getTimelineColor = (projColor: string) => {
    if (projColor === '#10b981') return 'green';
    if (projColor === '#f59e0b') return 'orange';
    if (projColor === '#7f56d9') return 'purple';
    return 'blue';
  };

  // Aggregation for Stacked Bar Chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.getDate();
  }).reverse();

  const dailyWorkTimes = last7Days.map((dayNum) => {
    const dayEntries = entries.filter((entry) => {
      const entryDay = new Date(entry.date).getDate();
      return entryDay === dayNum;
    });

    let totalMins = dayEntries.reduce((sum, e) => sum + e.actualTime, 0);
    let workHours = parseFloat((totalMins / 60).toFixed(1));
    let overtimeHours = 0;

    if (workHours > 8) {
      overtimeHours = parseFloat((workHours - 8).toFixed(1));
      workHours = 8;
    }

    return {
      day: dayNum,
      workHours,
      overtimeHours
    };
  });

  const totalChartHours = dailyWorkTimes.reduce((sum, d) => sum + d.workHours + d.overtimeHours, 0).toFixed(1);

  const handleOpenMailModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEntries = entries.filter(e => e.date === todayStr && e.employeeId === user?._id);

    if (todayEntries.length === 0) {
      alert("You haven't logged any work sessions for today yet.");
      return;
    }

    const formatTimeTo12Hour = (time24: string) => {
      if (!time24) return '';
      const [hStr, mStr] = time24.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr;
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      return `${h}:${m} ${ampm}`;
    };

    const text = todayEntries.map((entry, index) => {
      const hours = (entry.actualTime / 60).toFixed(1);
      const start12 = formatTimeTo12Hour(entry.startTime);
      const end12 = formatTimeTo12Hour(entry.endTime);

      return `Task ${index + 1}:

Project: ${entry.projectName}
Task: ${entry.title}
Time: ${start12} – ${end12} (${hours} hours)
Status: Completed
Summary: ${entry.description || 'Completed work task details.'}`;
    }).join('\n\n');

    setMailContent(text);
    setIsMailModalOpen(true);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(mailContent);
    alert('Task summary copied to clipboard!');
  };

  const featuredEmployee = employees.find(e => e.name === 'Cody Fisher') || employees[0];
  const meEmployee = user ? (employees.find(e => e._id === user._id) || user) : null;
  const isAdmin = user?.userType === 'admin';

  if (loading && projects.length === 0 && !error) {
    return <PageShimmer variant="dashboard" />;
  }

  return (
    <div>
      {/* Welcome Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }} className="no-print">
        {/* <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            {isAdmin 
              ? 'Manage your organization Projects, monitor employee schedule, and track tasks.'
              : 'Log your work sessions, view assigned Projects, and manage your schedules.'}
          </p>
        </div> */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <>
              <button className="btn btn-secondary" onClick={() => setIsEmployeeModalOpen(true)}>
                <UserPlus size={14} />
                <span>Add Employee</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setIsProjectModalOpen(true)}>
                <Folder size={14} />
                <span>New Project</span>
              </button>
            </>
          )}
          {/* <button className="btn btn-primary" onClick={() => {
            if (projects.length === 0) return alert('Create a Project first!');
            setIsWorkModalOpen(true);
          }}>
            <Plus size={14} />
            <span>Log Work</span>
          </button> */}
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p style={{ fontWeight: 650 }}>{error}</p>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="dashboard-grid">

        {/* ROW 2: LEFT COLUMN: Team Punch & Permission Monitor (Admin Only) */}
        {isAdmin && (() => {
          const TEAM_ITEMS_PER_PAGE = 3;
          const activeCount = employees.filter((e: any) => e.todayAttendance?.checkIn && !e.todayAttendance?.checkOut).length;
          const inactiveCount = employees.length - activeCount;
          const paginatedTeam = employees.slice((teamPage - 1) * TEAM_ITEMS_PER_PAGE, teamPage * TEAM_ITEMS_PER_PAGE);
          const totalTeamPages = Math.ceil(employees.length / TEAM_ITEMS_PER_PAGE);

          return (
            <div className="col-5">
              <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
                      Team Punch & Permissions
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Live presence & 1-day punch override</span>
                  </div>
                  <span className="tag-badge" style={{ fontSize: '0.68rem', padding: '2px 8px', fontWeight: 700, backgroundColor: 'rgba(127, 86, 217, 0.08)', color: 'var(--accent-primary)', border: '1px solid rgba(127, 86, 217, 0.15)' }}>
                    Active: {activeCount} • Inactive: {inactiveCount}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, paddingRight: '2px' }}>
                  {paginatedTeam.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontSize: '0.8rem' }}>No employees found.</p>
                  ) : (
                    paginatedTeam.map((emp: any) => {
                      const att = emp.todayAttendance;
                      const hasCheckIn = !!att?.checkIn;
                      const hasCheckOut = !!att?.checkOut;
                      const isWorkingNow = !!att?.isWorking;

                      return (
                        <div key={emp._id} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* Member Info & Live Status Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div
                              onClick={() => router.push(`/employees?select=${emp._id}`)}
                              style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}
                              title="Click to view details & manage punch permissions"
                            >
                              <div className="avatar" style={{ backgroundColor: emp.avatarColor, width: '30px', height: '30px', fontSize: '0.72rem', fontWeight: 700 }}>
                                {emp.name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>{emp.name}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{emp.role}</div>
                              </div>
                            </div>

                            {/* Status pill */}
                            {hasCheckOut ? (
                              <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>
                                Checked Out
                              </span>
                            ) : hasCheckIn ? (
                              isWorkingNow ? (
                                <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                                  Working
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                                  Idle
                                </span>
                              )
                            ) : (
                              <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '10px', background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                                Not Punched
                              </span>
                            )}
                          </div>

                          {/* Time details */}
                          <div style={{ fontSize: '0.68rem', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>In: <b>{att?.checkIn || '—'}</b></span>
                            <span>Out: <b>{att?.checkOut || '—'}</b></span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Team Pagination controls */}
                {totalTeamPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setTeamPage((p) => Math.max(1, p - 1))}
                      disabled={teamPage === 1}
                      style={{ padding: '3px 8px', fontSize: '0.7rem', opacity: teamPage === 1 ? 0.5 : 1 }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Page {teamPage} of {totalTeamPages}
                    </span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setTeamPage((p) => Math.min(totalTeamPages, p + 1))}
                      disabled={teamPage === totalTeamPages}
                      style={{ padding: '3px 8px', fontSize: '0.7rem', opacity: teamPage === totalTeamPages ? 0.5 : 1 }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Employee Tasks Section */}
        {!isAdmin && user && (
          <div className="col-12" style={{ marginBottom: '20px' }}>
            <MyTasks userId={user._id} />
          </div>
        )}

        {/* ROW 2: RIGHT COLUMN: Timeline scheduler */}
        <div className={isAdmin ? "col-7" : "col-12"}>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-header">
              <h3 className="card-title">Today Schedule</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={selectedTimelineDate}
                  onChange={(e) => setSelectedTimelineDate(e.target.value)}
                  style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 6px', fontSize: '0.75rem', fontWeight: 650 }}
                />
                {/* <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (projects.length === 0) return;
                  setWorkDate(selectedTimelineDate);
                  setIsWorkModalOpen(true);
                }}>
                  Add Task
                </button> */}
              </div>
            </div>

            <div className="timeline-scheduler">
              <div className="timeline-hours-header">
                <span>08.00</span>
                <span>09.00</span>
                <span style={{ color: '#4f46e5', fontWeight: 800 }}>09.35</span>
                <span>11.00</span>
                <span>13.00</span>
                <span>15.00</span>
                <span>17.00</span>
                <span>18.00</span>
              </div>

              <div className="timeline-grid">
                {timelineEntries.slice(0, 3).map((entry, index) => {
                  const pos = calculateTimelinePosition(entry.startTime, entry.endTime);
                  const colorClass = getTimelineColor(entry.projectColor);
                  const topOffset = 15 + index * 40;

                  return (
                    <div
                      key={entry._id}
                      className={`timeline-block ${colorClass}`}
                      style={{
                        left: pos.left,
                        width: pos.width,
                        top: `${topOffset}px`
                      }}
                      title={`${entry.employeeName}: ${entry.title} (${entry.startTime} - ${entry.endTime})`}
                    >
                      {entry.title}
                    </div>
                  );
                })}

                {timelineEntries.length === 0 && (
                  <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    No work sessions logged for this day.
                  </div>
                )}

                <div className="timeline-now-line" style={{ left: '16.5%' }} />
                <div className="timeline-now-bubble" style={{ left: '16.5%' }}>09.35</div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: TABLES AND CHARTS */}
        <div className={isAdmin ? "col-7" : "col-8"}>
          {isAdmin ? (
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header">
                <h3 className="card-title">Employee Registry</h3>
                <Link href="/employees" className="btn btn-secondary btn-sm">See Details</Link>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Project</th>
                    <th>Job Title</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.slice(0, 4).map((emp) => (
                    <tr key={emp._id}>
                      <td>
                        <div className="avatar-wrapper">
                          <div className="avatar" style={{ backgroundColor: emp.avatarColor, width: '28px', height: '28px', fontSize: '0.7rem' }}>
                            {emp.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{emp.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="tag-badge" style={{ borderColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-primary)', background: '#eff6ff' }}>
                          {emp.Project}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{emp.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="card-title">My Tracked Logs</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recent work sessions</span>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                  onClick={handleOpenMailModal}
                >
                  Generate Daily Mail
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Work Performed</th>
                      <th>Time</th>
                      <th style={{ textAlign: 'right' }}>Tracked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, 5).map((entry) => (
                      <tr key={entry._id}>
                        <td>{entry.date}</td>
                        <td>
                          <span className="tag-badge" style={{ backgroundColor: `${entry.projectColor}15`, color: entry.projectColor, borderColor: `${entry.projectColor}30` }}>
                            {entry.projectName}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{entry.title}</div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {entry.startTime} - {entry.endTime}
                        </td>
                        <td style={{ fontWeight: 750, color: 'var(--accent-primary)', textAlign: 'right' }}>
                          {formatMinutesToDuration(entry.actualTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right side Featured Employee / Member chart */}
        <div className={isAdmin ? "col-5" : "col-4"} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Profile Card */}
          {meEmployee && (
            <div className="card">
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                {isAdmin ? 'Featured Member' : 'My Work Profile'}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '4px' }}>
                {isAdmin ? (featuredEmployee?.role || 'Administrator') : meEmployee.role}
              </h3>

              <div className="employee-badge-container" style={{ marginBottom: '12px' }}>
                <span className="tag-badge" style={{ backgroundColor: '#eff6ff', color: 'var(--accent-primary)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                  {isAdmin ? (featuredEmployee?.Project || 'Management') : meEmployee.Project}
                </span>
                <span className="tag-badge">Full Time</span>
                <span className="tag-badge">Active</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <div className="avatar" style={{ backgroundColor: isAdmin ? (featuredEmployee?.avatarColor || '#ef4444') : (meEmployee.avatarColor || '#7f56d9'), width: '32px', height: '32px', fontSize: '0.85rem' }}>
                  {isAdmin ? (featuredEmployee?.name?.split(' ').map((n: string) => n[0]).join('') || 'CF') : meEmployee.name?.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 750, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isAdmin ? (featuredEmployee?.name || 'Cody Fisher') : meEmployee.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span>{isAdmin ? (featuredEmployee?.email || 'cody@mail.com') : meEmployee.email}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>TRACKED</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                    {formatMinutesToDuration(isAdmin ? (featuredEmployee?.totalMinutes || 0) : (meEmployee.totalMinutes || 0))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Member Work Hours chart (Admin Only) */}
          {isAdmin && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title" style={{ fontSize: '0.9rem' }}>Member Work Hours</h3>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
                    {totalChartHours} hrs total
                  </span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} /> Work
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fecdd3' }} /> OT
                  </span>
                </div>
              </div>

              <div className="stacked-chart-container">
                <div className="chart-grid-line" style={{ bottom: '50px' }} />
                <div className="chart-grid-line" style={{ bottom: '90px' }} />
                <div className="chart-grid-line" style={{ bottom: '130px' }} />

                {dailyWorkTimes.map((data, index) => {
                  const maxVal = 12;
                  const workHeight = Math.min(130, (data.workHours / maxVal) * 130);
                  const otHeight = Math.min(130 - workHeight, (data.overtimeHours / maxVal) * 130);

                  return (
                    <div key={index} className="chart-column">
                      <div className="chart-bar-stack" style={{ height: `${workHeight + otHeight}px`, width: '12px' }}>
                        {data.overtimeHours > 0 && (
                          <div className="chart-bar-pink" style={{ height: `${(otHeight / (workHeight + otHeight)) * 100}%` }} title={`Overtime: ${data.overtimeHours} hrs`} />
                        )}
                        <div className="chart-bar-blue" style={{ height: `${(workHeight / (workHeight + otHeight)) * 100}%` }} title={`Work Time: ${data.workHours} hrs`} />
                      </div>
                      <span className="chart-column-label">{data.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: ADD EMPLOYEE (Admin Only) */}
      {isAdmin && isEmployeeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEmployeeModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add New Team Member</h3>
              <button className="modal-close" onClick={() => setIsEmployeeModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Brooklyn Simmons"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  placeholder="e.g. brok-simms@mail.com"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={empPass}
                    onChange={(e) => setEmpPass(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role Type *</label>
                  <select
                    className="form-control"
                    value={empType}
                    onChange={(e) => setEmpType(e.target.value)}
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Job Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Project *</label>
                  <select
                    className="form-control"
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                  >
                    {Projects.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Presence Status</label>
                  <select
                    className="form-control"
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value)}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Theme Color</label>
                  <div className="color-selector">
                    {colors.map((c) => (
                      <div
                        key={c}
                        className="color-option"
                        style={{
                          backgroundColor: c,
                          borderColor: empColor === c ? 'var(--text-primary)' : 'transparent'
                        }}
                        onClick={() => setEmpColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEmployeeModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingEmp}>
                  {submittingEmp ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW Project (Admin Only) */}
      {isAdmin && isProjectModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProjectModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Create New Project</h3>
              <button className="modal-close" onClick={() => setIsProjectModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddProject}>
              <div className="form-group">
                <label className="form-label">Project / Project Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Quality Assurance"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-control"
                  placeholder="Define scope..."
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Visual Badge Color</label>
                <div className="color-selector">
                  {colors.map((c) => (
                    <div
                      key={c}
                      className="color-option"
                      style={{
                        backgroundColor: c,
                        borderColor: projColor === c ? 'var(--text-primary)' : 'transparent'
                      }}
                      onClick={() => setProjColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Members</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '10px' }}>
                  {employees.map(emp => (
                    <label key={emp._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={projMembers.includes(emp._id)}
                        onChange={() => handleMemberSelectToggle(emp._id)}
                      />
                      <span style={{ fontWeight: 650 }}>{emp.name} ({emp.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsProjectModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingProj}>
                  {submittingProj ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG WORK */}
      {isWorkModalOpen && (
        <div className="modal-overlay" onClick={() => setIsWorkModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Log Time Entry</h3>
              <button className="modal-close" onClick={() => setIsWorkModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddWork}>
              <div className="form-group">
                <label className="form-label">Project / Project *</label>
                <select
                  className="form-control"
                  required
                  value={workProjId}
                  onChange={(e) => setWorkProjId(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Logging Member *</label>
                <select
                  className="form-control"
                  required
                  value={workEmpId}
                  onChange={(e) => setWorkEmpId(e.target.value)}
                  disabled={!isAdmin}
                >
                  {isAdmin ? (
                    employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                    ))
                  ) : (
                    <option value={user?._id}>{user?.name} ({user?.role})</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">What work was performed? *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Coded sidebar layouts"
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time *</label>
                  <input
                    type="time"
                    className="form-control"
                    required
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time *</label>
                  <input
                    type="time"
                    className="form-control"
                    required
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Session Notes (Optional)</label>
                <textarea
                  className="form-control"
                  placeholder="Details, progress, blockers..."
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsWorkModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingWork}>
                  {submittingWork ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: DAILY MAIL SUMMARY */}
      {isMailModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMailModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Daily Email Summary</h3>
              <button className="modal-close" onClick={() => setIsMailModalOpen(false)}>&times;</button>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Here is your formatted task summary for today ({selectedTimelineDate}). Click Copy to save it to your clipboard.
              </p>
            </div>
            <div className="form-group">
              <textarea
                className="form-control"
                readOnly
                style={{ minHeight: '220px', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.4', background: 'var(--bg-tertiary)' }}
                value={mailContent}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsMailModalOpen(false)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={handleCopyToClipboard}>Copy to Clipboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
