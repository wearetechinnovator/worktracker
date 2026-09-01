'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  UserPlus,
  Folder,
  FolderPlus,
  Building2,
  Plus,
  Clock,
  ChevronDown,
  Filter,
  Calendar,
  RotateCcw,
  Check,
  X,
  Link as LinkIcon,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import AddTeamMemberModal from '@/components/AddTeamMemberModal';
import CreateProjectModal from '@/components/CreateProjectModal';
import CreateClientModal from '@/components/CreateClientModal';
import CreateTaskModal from '@/components/CreateTaskModal';
import {
  CustomDropdown,
  CustomDatePicker,
  CustomTimePicker,
  CustomFileAttachment,
  CustomMultipleLinks
} from '@/components/TaskFormControls';
import dynamic from 'next/dynamic';

const CKEditorComponent = dynamic(
  () => import('@/components/CKEditorWrapper'),
  { ssr: false }
);

export default function TopNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Live Clock State
  const [liveTime, setLiveTime] = useState('');
  const [liveDate, setLiveDate] = useState('');

  // Punch Status (for Employee)
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [canPunchOut, setCanPunchOut] = useState(false);

  // Shared Data for Modals
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);

  // Modal States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Banner Dropdown Controls State
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  // Filter & Preset values
  const [selectedPreset, setSelectedPreset] = useState('This Week');
  const [dateRangeText, setDateRangeText] = useState('Aug 24 – Aug 30, 2026');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  // Helper for preset date ranges
  const getPresetDateRangeText = (preset: string): string => {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = now.getFullYear();

    if (preset === 'Today') {
      return `${months[now.getMonth()]} ${now.getDate()}, ${currentYear}`;
    }

    if (preset === 'Yesterday') {
      const prev = new Date(now);
      prev.setDate(now.getDate() - 1);
      return `${months[prev.getMonth()]} ${prev.getDate()}, ${prev.getFullYear()}`;
    }

    if (preset === 'This Week') {
      const curr = new Date(now);
      const dayOfWeek = curr.getDay();
      const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(curr);
      monday.setDate(curr.getDate() + distanceToMon);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return `${months[monday.getMonth()]} ${monday.getDate()} – ${months[sunday.getMonth()]} ${sunday.getDate()}, ${sunday.getFullYear()}`;
    }

    if (preset === 'Last Week') {
      const curr = new Date(now);
      const dayOfWeek = curr.getDay();
      const distanceToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) - 7;
      const monday = new Date(curr);
      monday.setDate(curr.getDate() + distanceToMon);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return `${months[monday.getMonth()]} ${monday.getDate()} – ${months[sunday.getMonth()]} ${sunday.getDate()}, ${sunday.getFullYear()}`;
    }

    if (preset === 'This Month') {
      const first = new Date(currentYear, now.getMonth(), 1);
      const last = new Date(currentYear, now.getMonth() + 1, 0);
      return `${months[first.getMonth()]} 01 – ${months[last.getMonth()]} ${last.getDate()}, ${currentYear}`;
    }

    if (preset === 'Last Month') {
      const first = new Date(currentYear, now.getMonth() - 1, 1);
      const last = new Date(currentYear, now.getMonth(), 0);
      return `${months[first.getMonth()]} 01 – ${months[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;
    }

    if (preset === 'All Time') {
      return 'All Time';
    }

    return 'Aug 24 – Aug 30, 2026';
  };

  const handleSelectPreset = (preset: string) => {
    setSelectedPreset(preset);
    const text = getPresetDateRangeText(preset);
    setDateRangeText(text);
    setIsPresetMenuOpen(false);
    window.dispatchEvent(
      new CustomEvent('worktracker-filter-change', {
        detail: { preset, dateRangeText: text, filterProjectId, filterStatus, filterPriority, filterEmployeeId },
      })
    );
  };

  const handleApplyCustomDate = () => {
    if (startDate && endDate) {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formatted = `${months[sDate.getMonth()]} ${sDate.getDate()} – ${months[eDate.getMonth()]} ${eDate.getDate()}, ${eDate.getFullYear()}`;
      setDateRangeText(formatted);
      setSelectedPreset('Custom');
    }
    setIsDateRangePickerOpen(false);
    window.dispatchEvent(
      new CustomEvent('worktracker-filter-change', {
        detail: { preset: 'Custom', dateRangeText, startDate, endDate, filterProjectId, filterStatus, filterPriority, filterEmployeeId },
      })
    );
  };





  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-US', { hour12: true }));
      setLiveDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current user and shared resources
  const loadUserAndResources = async () => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      setUser(null);
      setIsAdmin(false);
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      let currentUserObj = parsedUser;
      if (meData.success && meData.data) {
        currentUserObj = meData.data;
        setUser(currentUserObj);
        localStorage.setItem('worktracker_user', JSON.stringify(currentUserObj));
      }
      const admin = currentUserObj.userType === 'admin' || Boolean(currentUserObj.isSystemAdmin);
      setIsAdmin(admin);

      const [empRes, projRes, clientRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/projects'),
        fetch('/api/clients'),
      ]);
      const empData = await empRes.json();
      const projData = await projRes.json();
      const clientData = await clientRes.json();

      if (empData.success) setEmployees(empData.data);
      if (projData.success) setProjects(projData.data);
      if (clientData.success) setClientsList(clientData.data);

      // Check punch status for employees
      if (!admin && parsedUser._id) {
        const punchRes = await fetch(`/api/punch?employeeId=${parsedUser._id}`);
        const punchData = await punchRes.json();
        if (punchData.success) {
          setIsPunchedIn(punchData.isPunchedIn);
          setCanPunchOut(punchData.canPunchOut !== false);
        }
      }
    } catch (e) {
      console.error('Failed to load navbar resources:', e);
    }
  };

  useEffect(() => {
    loadUserAndResources();
    const handleRefresh = () => {
      loadUserAndResources();
    };
    window.addEventListener('worktracker-refresh', handleRefresh);
    return () => window.removeEventListener('worktracker-refresh', handleRefresh);
  }, [pathname]);







  // Don't render topbar on login page or when user is not logged in
  if (!user || pathname === '/login') return null;

  return (
    <>
      {/* Click backdrop to close dropdowns when clicking outside */}
      {(isCreateMenuOpen || isPresetMenuOpen || isDateRangePickerOpen || isFilterMenuOpen) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'transparent' }}
          onClick={() => {
            setIsCreateMenuOpen(false);
            setIsPresetMenuOpen(false);
            setIsDateRangePickerOpen(false);
            setIsFilterMenuOpen(false);
          }}
        />
      )}

      <header className="top-navbar no-print" style={{ zIndex: 1060 }}>
        {/* Left Side: Live Digital Clock & Date */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '5px 14px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 850,
            fontFamily: 'monospace',
            color: 'var(--accent-primary)',
            letterSpacing: '0.5px'
          }}>
            {liveTime}
          </span>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
          }}>
            {liveDate}
          </span>
        </div>

        {/* Right Side: Date Range, Preset, Filters & Split Create Button */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

          {/* 1. Date Range Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setIsDateRangePickerOpen(!isDateRangePickerOpen);
                setIsPresetMenuOpen(false);
                setIsFilterMenuOpen(false);
                setIsCreateMenuOpen(false);
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0 14px',
                height: '38px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#1e293b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{dateRangeText}</span>
              <ChevronDown size={14} style={{ color: '#64748b' }} />
            </button>

            {/* Date Range Picker Popover */}
            {isDateRangePickerOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  padding: '14px',
                  width: '260px',
                  zIndex: 1100,
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Custom Date Range
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsDateRangePickerOpen(false)}
                    style={{ padding: '6px 12px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCustomDate}
                    style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Preset Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setIsPresetMenuOpen(!isPresetMenuOpen);
                setIsDateRangePickerOpen(false);
                setIsFilterMenuOpen(false);
                setIsCreateMenuOpen(false);
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0 14px',
                height: '38px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#1e293b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{selectedPreset}</span>
              <ChevronDown size={14} style={{ color: '#64748b' }} />
            </button>

            {/* Preset Options Dropdown Menu */}
            {isPresetMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  minWidth: '150px',
                  padding: '6px',
                  zIndex: 1100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'All Time'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      border: 'none',
                      background: selectedPreset === preset ? '#eff6ff' : 'transparent',
                      color: selectedPreset === preset ? '#2563eb' : '#1e293b',
                      fontWeight: selectedPreset === preset ? 650 : 500,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.81rem',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPreset !== preset) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPreset !== preset) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{preset}</span>
                    {selectedPreset === preset && <Check size={14} style={{ color: '#2563eb' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Filters Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setIsFilterMenuOpen(!isFilterMenuOpen);
                setIsDateRangePickerOpen(false);
                setIsPresetMenuOpen(false);
                setIsCreateMenuOpen(false);
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0 14px',
                height: '38px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#1e293b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              <Filter size={14} style={{ color: '#475569' }} />
              <span>Filters</span>
              <ChevronDown size={14} style={{ color: '#64748b' }} />
            </button>

            {/* Filters Dropdown Popover */}
            {isFilterMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  padding: '16px',
                  width: '280px',
                  zIndex: 1100,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Filter Options</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterProjectId('');
                      setFilterStatus('');
                      setFilterPriority('');
                      setFilterEmployeeId('');
                    }}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RotateCcw size={11} />
                    <span>Reset</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {/* Project Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Project</label>
                    <select
                      value={filterProjectId}
                      onChange={(e) => setFilterProjectId(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', background: '#fff' }}
                    >
                      <option value="">All Projects</option>
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', background: '#fff' }}
                    >
                      <option value="">All Statuses</option>
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Priority</label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', background: '#fff' }}
                    >
                      <option value="">All Priorities</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Employee Filter */}
                  {isAdmin && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Employee</label>
                      <select
                        value={filterEmployeeId}
                        onChange={(e) => setFilterEmployeeId(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', background: '#fff' }}
                      >
                        <option value="">All Employees</option>
                        {employees.map((e) => (
                          <option key={e._id} value={e._id}>{e.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsFilterMenuOpen(false);
                    window.dispatchEvent(
                      new CustomEvent('worktracker-filter-change', {
                        detail: { preset: selectedPreset, dateRangeText, filterProjectId, filterStatus, filterPriority, filterEmployeeId },
                      })
                    );
                  }}
                  style={{ width: '100%', padding: '8px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Apply Filters
                </button>
              </div>
            )}
          </div>

          {/* 4. Split Create Button */}
          <div style={{ position: 'relative' }}>
            {isAdmin ? (
              <>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#3b82f6',
                    boxShadow: '0 1px 3px 0 rgba(59, 130, 246, 0.35)',
                    height: '38px',
                  }}
                >
                  {/* Main Create Button (left) - Opens Task Create Modal by Default */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTaskModalOpen(true);
                      setIsCreateMenuOpen(false);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 16px',
                      height: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Plus size={16} />
                    <span>Create Task</span>
                  </button>

                  {/* Vertical Divider */}
                  <div style={{ width: '1px', height: '22px', background: 'rgba(255, 255, 255, 0.3)' }} />

                  {/* Dropdown Chevron Trigger Button (right) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreateMenuOpen(!isCreateMenuOpen);
                      setIsDateRangePickerOpen(false);
                      setIsPresetMenuOpen(false);
                      setIsFilterMenuOpen(false);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 12px',
                      height: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Create Options Dropdown Menu */}
                {isCreateMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                      minWidth: '170px',
                      padding: '6px',
                      zIndex: 1100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        setIsEmployeeModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 550,
                        color: '#1e293b',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <UserPlus size={15} style={{ color: '#3b82f6' }} />
                      <span>add employee</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        setIsClientModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 550,
                        color: '#1e293b',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Building2 size={15} style={{ color: '#10b981' }} />
                      <span>add client</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        setIsProjectModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 550,
                        color: '#1e293b',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <FolderPlus size={15} style={{ color: '#8b5cf6' }} />
                      <span>new project</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsTaskModalOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 16px',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#3b82f6',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px 0 rgba(59, 130, 246, 0.35)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
              >
                <Plus size={16} />
                <span>Create Task</span>
              </button>
            )}
          </div>

          {/* Consistent Notification Center */}
          <NotificationCenter />
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD EMPLOYEE */}
      {/* ========================================================================= */}
      <AddTeamMemberModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        projectsList={projects}
        onSuccess={async () => {
          await loadUserAndResources();
          window.dispatchEvent(new CustomEvent('worktracker-refresh'));
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: ADD CLIENT */}
      {/* ========================================================================= */}
      <CreateClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={async () => {
          await loadUserAndResources();
          window.dispatchEvent(new CustomEvent('worktracker-refresh'));
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE NEW PROJECT */}
      {/* ========================================================================= */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        clientsList={clientsList}
        employeesList={employees}
        onSuccess={async () => {
          await loadUserAndResources();
          window.dispatchEvent(new CustomEvent('worktracker-refresh'));
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE TASK (Admin & Employee) */}
      {/* ========================================================================= */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        user={user}
        projectsOptions={projects}
        employeesList={employees}
      />
    </>
  );
}
