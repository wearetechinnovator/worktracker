'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Clock, Plus, Folder, Calendar, TrendingUp, 
  Users, UserPlus, Mail, Phone, ChevronRight,
  AlertCircle, Loader2, ArrowRight, Eye
} from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/time';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
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
}

export default function Dashboard() {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Open/Close
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);

  // Selected Day for Timeline (default to a day with seeded logs, e.g. Jan 26, 2026)
  const [selectedTimelineDate, setSelectedTimelineDate] = useState('2026-01-26');

  // Employee Form State
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState('UI UX Designer');
  const [empDept, setEmpDept] = useState('Design');
  const [empStatus, setEmpStatus] = useState('Active');
  const [empColor, setEmpColor] = useState('#3b82f6');
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
  const [workDate, setWorkDate] = useState('2026-01-26');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [workDesc, setWorkDesc] = useState('');
  const [submittingWork, setSubmittingWork] = useState(false);

  // Presets
  const colors = ['#3b82f6', '#10b981', '#7f56d9', '#f59e0b', '#f43f5e', '#06b6d4', '#e2e8f0'];
  const departments = ['Design', 'Development', 'Marketing', 'Human Resource', 'Management'];
  const statuses = ['Active', 'Sick Leave', 'Annual Leave', 'Work From Home'];

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [projRes, empRes, workRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/employees'),
        fetch('/api/work')
      ]);

      const projData = await projRes.json();
      const empData = await empRes.json();
      const workData = await workRes.json();

      if (!projData.success) throw new Error(projData.error || 'Failed to load projects');
      if (!empData.success) throw new Error(empData.error || 'Failed to load employees');
      if (!workData.success) throw new Error(workData.error || 'Failed to load work entries');

      setProjects(projData.data);
      setEmployees(empData.data);
      setEntries(workData.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Employee Form Submit
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim()) return;

    try {
      setSubmittingEmp(true);
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empName,
          email: empEmail,
          role: empRole,
          department: empDept,
          status: empStatus,
          avatarColor: empColor
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add employee');

      setEmpName('');
      setEmpEmail('');
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

  // Toggle member assignment selection
  const handleMemberSelectToggle = (empId: string) => {
    if (projMembers.includes(empId)) {
      setProjMembers(projMembers.filter(id => id !== empId));
    } else {
      setProjMembers([...projMembers, empId]);
    }
  };

  // Handle Work Log Submit
  const handleAddWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workProjId || !workEmpId || !workTitle.trim() || !workDate) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setSubmittingWork(true);
      const res = await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: workProjId,
          employeeId: workEmpId,
          title: workTitle,
          date: workDate,
          startTime: workStart,
          endTime: workEnd,
          description: workDesc
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save log entry');

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

  // Chart calculation (Member Work Hours) - last 7 days (Jan 24 - Jan 30)
  const chartDays = ['2026-01-24', '2026-01-25', '2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29', '2026-01-30'];
  
  const dailyWorkTimes = chartDays.map(day => {
    const dayEntries = entries.filter(e => e.date === day);
    
    // Calculate hours per employee on this day
    const employeeTimes: Record<string, number> = {};
    dayEntries.forEach(e => {
      if (!employeeTimes[e.employeeId]) employeeTimes[e.employeeId] = 0;
      employeeTimes[e.employeeId] += e.actualTime;
    });

    let normalMinutes = 0;
    let overtimeMinutes = 0;

    Object.values(employeeTimes).forEach(mins => {
      if (mins > 480) { // 8 hours
        normalMinutes += 480;
        overtimeMinutes += (mins - 480);
      } else {
        normalMinutes += mins;
      }
    });

    return {
      day: day.split('-')[2], // get day number e.g. "24"
      workHours: normalMinutes / 60,
      overtimeHours: overtimeMinutes / 60
    };
  });

  const totalChartHours = dailyWorkTimes.reduce((sum, d) => sum + d.workHours + d.overtimeHours, 0).toFixed(1);

  // Timeline scheduler helper for selected date
  const timelineEntries = entries.filter(e => e.date === selectedTimelineDate);

  const calculateTimelinePosition = (startTimeStr: string, endTimeStr: string) => {
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);
    
    // Scale timeline from 08:00 to 18:00 (10 hours = 600 minutes)
    const timelineStartMins = 8 * 60;
    const timelineDurationMins = 10 * 60;

    const startOffsetMins = (startH * 60 + startM) - timelineStartMins;
    const endOffsetMins = (endH * 60 + endM) - timelineStartMins;

    const left = Math.max(0, Math.min(100, (startOffsetMins / timelineDurationMins) * 100));
    const width = Math.max(5, Math.min(100 - left, ((endOffsetMins - startOffsetMins) / timelineDurationMins) * 100));

    return { left: `${left}%`, width: `${width}%` };
  };

  // Get color classes for timeline block
  const getTimelineColor = (projColor: string) => {
    if (projColor === '#10b981') return 'green';
    if (projColor === '#f59e0b') return 'orange';
    if (projColor === '#7f56d9') return 'purple';
    return 'blue';
  };

  // Featured Employee (Cody Fisher details or the top employee by hours)
  const featuredEmployee = employees.find(e => e.name === 'Cody Fisher') || employees[0];

  if (loading && projects.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Top Welcome Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }} className="no-print">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your organization departments, monitor employee schedule, and track tasks.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => setIsEmployeeModalOpen(true)}>
            <UserPlus size={16} />
            <span>Add Employee</span>
          </button>
          <button className="btn btn-secondary" onClick={() => setIsProjectModalOpen(true)}>
            <Folder size={16} />
            <span>New Department</span>
          </button>
          <button className="btn btn-primary" onClick={() => {
            if (projects.length === 0 || employees.length === 0) {
              alert('Please ensure you have at least one department and employee created first!');
              return;
            }
            if (!workProjId) setWorkProjId(projects[0]._id);
            if (!workEmpId) setWorkEmpId(employees[0]._id);
            setIsWorkModalOpen(true);
          }}>
            <Plus size={16} />
            <span>Log Work</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p>{error}</p>
        </div>
      )}

      {/* Main BordUp Grid Layout */}
      <div className="dashboard-grid">
        

        {/* ROW 2: LEFT COLUMN: Employee status & Employee summary */}
        <div className="col-5" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card: What's on in January? (Employee leave/status monitor) */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <h3 className="card-title">Employee Status Monitor</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Jan 2026</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {employees.slice(0, 4).map((emp) => {
                let statusClass = 'active';
                if (emp.status === 'Sick Leave') statusClass = 'sick';
                if (emp.status === 'Annual Leave') statusClass = 'annual';
                if (emp.status === 'Work From Home') statusClass = 'wfh';

                return (
                  <div key={emp._id} className="list-row" style={{ padding: '4px 0' }}>
                    <div className="avatar-wrapper">
                      <div className="avatar" style={{ backgroundColor: emp.avatarColor, width: '36px', height: '36px' }}>
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="avatar-title" style={{ fontSize: '0.9rem' }}>{emp.name}</div>
                        <div className="avatar-subtitle" style={{ fontSize: '0.75rem' }}>{emp.role}</div>
                      </div>
                    </div>
                    <span className={`badge-status ${statusClass}`}>
                      {emp.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ROW 2: MIDDLE/RIGHT COLUMN: Today timeline & featured employee card */}
        <div className="col-7" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Timeline scheduler card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Today Schedule</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="date" 
                  value={selectedTimelineDate} 
                  onChange={(e) => setSelectedTimelineDate(e.target.value)}
                  style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.8rem', fontWeight: 600 }}
                />
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (employees.length === 0 || projects.length === 0) return;
                  if (!workProjId) setWorkProjId(projects[0]._id);
                  if (!workEmpId) setWorkEmpId(employees[0]._id);
                  setWorkDate(selectedTimelineDate);
                  setIsWorkModalOpen(true);
                }}>
                  Add Task
                </button>
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
                {/* Horizontal logs */}
                {timelineEntries.slice(0, 3).map((entry, index) => {
                  const pos = calculateTimelinePosition(entry.startTime, entry.endTime);
                  const colorClass = getTimelineColor(entry.projectColor);
                  // Stagger height position so they don't overlap
                  const topOffset = 20 + index * 50;

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
                  <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No work sessions logged for this day.
                  </div>
                )}

                {/* 09:35 Marker line matching screenshot */}
                <div className="timeline-now-line" style={{ left: '16.5%' }} />
                <div className="timeline-now-bubble" style={{ left: '16.5%' }}>09.35</div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: EMPLOYEE TABLE */}
        <div className="col-7">
          <div className="card" style={{ height: '100%' }}>
            <div className="card-header">
              <h3 className="card-title">Employee Registry</h3>
              <Link href="/employees" className="btn btn-secondary btn-sm">
                See Details
              </Link>
            </div>
            
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Job Title</th>
                </tr>
              </thead>
              <tbody>
                {employees.slice(0, 3).map((emp) => (
                  <tr key={emp._id}>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="avatar-wrapper">
                        <div className="avatar" style={{ backgroundColor: emp.avatarColor, width: '32px', height: '32px', fontSize: '0.8rem' }}>
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{emp.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tag-badge" style={{ borderColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-primary)', background: '#eff6ff' }}>
                        {emp.department}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ROW 3: RIGHT COLUMN: Featured Developer and Stacked chart */}
        <div className="col-5" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Developer Card (Cody Fisher card) */}
          {featuredEmployee && (
            <div className="card">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Featured Member</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>{featuredEmployee.role}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
                Full-stack engineering member responsible for backend integrations and database optimization setups.
              </p>

              <div className="employee-badge-container" style={{ marginBottom: '20px' }}>
                <span className="tag-badge" style={{ backgroundColor: '#eff6ff', color: 'var(--accent-primary)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>{featuredEmployee.department}</span>
                <span className="tag-badge">Full Time</span>
                <span className="tag-badge">Remote</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div className="avatar" style={{ backgroundColor: featuredEmployee.avatarColor, width: '40px', height: '40px' }}>
                  {featuredEmployee.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 750 }}>{featuredEmployee.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={12} />
                    <span>{featuredEmployee.email}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TRACKED TIME</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                    {formatMinutesToDuration(featuredEmployee.totalMinutes || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Member Work Hours Chart */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title" style={{ fontSize: '1rem' }}>Member Work Hours</h3>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', display: 'block' }}>
                  {totalChartHours} hrs total
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} /> Work Time
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fecdd3' }} /> Overtime
                </span>
              </div>
            </div>

            <div className="stacked-chart-container">
              {/* Reference Grid lines */}
              <div className="chart-grid-line" style={{ bottom: '70px' }} />
              <div className="chart-grid-line" style={{ bottom: '130px' }} />
              <div className="chart-grid-line" style={{ bottom: '190px' }} />

              {dailyWorkTimes.map((data, index) => {
                // Max height represents 12 hours (190px max bar height)
                const maxVal = 12;
                const workHeight = Math.min(190, (data.workHours / maxVal) * 190);
                const otHeight = Math.min(190 - workHeight, (data.overtimeHours / maxVal) * 190);

                return (
                  <div key={index} className="chart-column">
                    <div className="chart-bar-stack" style={{ height: `${workHeight + otHeight}px` }}>
                      {data.overtimeHours > 0 && (
                        <div className="chart-bar-pink" style={{ height: `${(otHeight / (workHeight + otHeight)) * 100}%` }} title={`Overtime: ${data.overtimeHours} hrs`} />
                      )}
                      <div className="chart-bar-blue" style={{ height: `${(workHeight / (workHeight + otHeight)) * 100}%` }} title={`Work Time: ${data.workHours} hrs`} />
                    </div>
                    <span className="chart-column-label">Jan {data.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL: ADD EMPLOYEE */}
      {isEmployeeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEmployeeModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Add New Team Member</h3>
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
                  <label className="form-label">Job Title / Role *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required
                    placeholder="e.g. UX Designer"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select 
                    className="form-control"
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Work Status *</label>
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
                <label className="form-label">Avatar Color Theme</label>
                <div className="color-selector">
                  {colors.map((color) => (
                    <div 
                      key={color}
                      className={`color-option ${empColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEmpColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEmployeeModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingEmp}>
                  {submittingEmp ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PROJECT (DEPARTMENT) */}
      {isProjectModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProjectModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create Department / Project</h3>
              <button className="modal-close" onClick={() => setIsProjectModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddProject}>
              <div className="form-group">
                <label className="form-label">Department / Project Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="e.g. Design, Mobile Engineering"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-control" 
                  placeholder="Write a brief overview..."
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color Theme Badge</label>
                <div className="color-selector">
                  {colors.map((color) => (
                    <div 
                      key={color}
                      className={`color-option ${projColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setProjColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Initial Members</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '12px' }}>
                  {employees.map(emp => (
                    <label key={emp._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        checked={projMembers.includes(emp._id)}
                        onChange={() => handleMemberSelectToggle(emp._id)}
                      />
                      <span>{emp.name} ({emp.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsProjectModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingProj}>
                  {submittingProj ? 'Creating...' : 'Create Department'}
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Log Time Entry</h3>
              <button className="modal-close" onClick={() => setIsWorkModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddWork}>
              <div className="form-group">
                <label className="form-label">Department / Project *</label>
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
                >
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">What work was performed? *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="e.g. Coded stacked hours layout"
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
                  placeholder="Provide brief notes on accomplishments..."
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsWorkModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingWork}>
                  {submittingWork ? 'Saving...' : 'Log Time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
