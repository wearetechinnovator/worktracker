'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, 
  MapPin, Globe, CheckCircle2, XCircle, AlertTriangle, 
  Briefcase, FileText, Loader2, ExternalLink, User, X, Layers
} from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/time';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  Project: string;
  avatarColor: string;
  status?: string;
  userType?: string;
}

interface AttendanceRecord {
  _id: string;
  date: string;
  status: 'Present' | 'Absent' | 'On Leave';
  checkIn: string | null;
  checkOut: string | null;
  checkInIpAddress?: string | null;
  checkOutIpAddress?: string | null;
  checkInLocation?: string | null;
  checkOutLocation?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
}

interface WorkEntryItem {
  _id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  actualTime: number;
  description: string;
  projectName: string;
  projectColor: string;
}

interface TaskWorkItem {
  _id: string;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  taskPriority: string;
  taskStatus: string;
  Project: string;
  startTime: string;
  endTime: string | null;
  totalMinutes: number;
  status: string;
  notes: string;
}

interface Props {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EmployeeAttendanceCalendarModal({ employee, isOpen, onClose }: Props) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0 - 11

  // Monthly Data
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [monthWorkEntries, setMonthWorkEntries] = useState<Record<string, number>>({});
  const [loadingMonth, setLoadingMonth] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Daily Details Sub-modal
  const [selectedDateForDetails, setSelectedDateForDetails] = useState<string | null>(null);
  const [dailyDetails, setDailyDetails] = useState<{
    attendance: AttendanceRecord | null;
    workEntries: WorkEntryItem[];
    taskWorks: TaskWorkItem[];
  } | null>(null);
  const [loadingDaily, setLoadingDaily] = useState<boolean>(false);

  const monthFormatted = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  // Fetch Month Data
  const fetchMonthData = useCallback(async () => {
    if (!employee || !isOpen) return;

    try {
      setLoadingMonth(true);
      setErrorMsg(null);

      // Fetch Attendance records for the month
      const attRes = await fetch(`/api/attendance?employeeId=${employee._id}&month=${monthFormatted}`);
      const attData = await attRes.json();

      if (attData.success && attData.data?.attendance) {
        setAttendanceRecords(attData.data.attendance);
      } else {
        setAttendanceRecords([]);
      }

      // Fetch Work entries count per day for the month
      const startDate = `${monthFormatted}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const endDate = `${monthFormatted}-${String(lastDay).padStart(2, '0')}`;

      const workRes = await fetch(`/api/work?employeeId=${employee._id}&startDate=${startDate}&endDate=${endDate}`);
      const workData = await workRes.json();

      if (workData.success && Array.isArray(workData.data)) {
        const counts: Record<string, number> = {};
        workData.data.forEach((entry: any) => {
          counts[entry.date] = (counts[entry.date] || 0) + 1;
        });
        setMonthWorkEntries(counts);
      } else {
        setMonthWorkEntries({});
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to load month attendance data.');
    } finally {
      setLoadingMonth(false);
    }
  }, [employee, isOpen, monthFormatted, currentYear, currentMonth]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  // Navigate Month
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Fetch Daily Details on Date Click
  const handleDateClick = async (dateStr: string) => {
    if (!employee) return;
    setSelectedDateForDetails(dateStr);
    setDailyDetails(null);

    // Fallback attendance record from month data
    const monthAttRecord = attendanceRecords.find((r) => r.date === dateStr) || null;

    try {
      setLoadingDaily(true);
      const res = await fetch(`/api/attendance/daily-details?employeeId=${employee._id}&date=${dateStr}`);
      const result = await res.json();
      if (result.success && result.data) {
        setDailyDetails({
          attendance: result.data.attendance || monthAttRecord,
          workEntries: result.data.workEntries || [],
          taskWorks: result.data.taskWorks || [],
        });
      } else {
        // Fallback to month attendance record if API fails
        setDailyDetails({
          attendance: monthAttRecord,
          workEntries: [],
          taskWorks: [],
        });
      }
    } catch (err) {
      console.error('Error fetching daily details:', err);
      setDailyDetails({
        attendance: monthAttRecord,
        workEntries: [],
        taskWorks: [],
      });
    } finally {
      setLoadingDaily(false);
    }
  };

  if (!isOpen || !employee) return null;

  // Calendar Math
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const attendanceMap = new Map<string, AttendanceRecord>(
    attendanceRecords.map((rec) => [rec.date, rec])
  );

  // Month Statistics
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalOnLeave = 0;
  attendanceRecords.forEach((rec) => {
    if (rec.status === 'Present') totalPresent++;
    if (rec.status === 'Absent') totalAbsent++;
    if (rec.status === 'On Leave') totalOnLeave++;
  });

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1500 }}>
      <div 
        className="modal-container" 
        style={{ maxWidth: '940px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="avatar" style={{ backgroundColor: employee.avatarColor, width: '42px', height: '42px', fontSize: '1.1rem', fontWeight: 800 }}>
              {employee.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{employee.name}</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                {employee.role} &bull; <span className="tag-badge">{employee.Project}</span>
              </p>
            </div>
          </div>

          <button className="modal-close" onClick={onClose} style={{ fontSize: '1.4rem' }}>&times;</button>
        </div>

        {/* Month Navigator & Summary Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', margin: '18px 0' }}>
          
          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button 
              type="button" 
              className="action-btn"
              onClick={handlePrevMonth}
              title="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div style={{ fontWeight: 800, fontSize: '1rem', minWidth: '150px', textAlign: 'center' }}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </div>

            <button 
              type="button" 
              className="action-btn"
              onClick={handleNextMonth}
              title="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Monthly Stats Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} style={{ color: '#10b981' }} />
              <span>Present: {totalPresent}</span>
            </div>
            <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={14} style={{ color: '#ef4444' }} />
              <span>Absent: {totalAbsent}</span>
            </div>
            <div style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #ffedd5', padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} style={{ color: '#f97316' }} />
              <span>On Leave: {totalOnLeave}</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '14px', padding: '10px 14px', fontSize: '0.82rem' }}>
            <p style={{ color: '#ef4444', fontWeight: 600 }}>{errorMsg}</p>
          </div>
        )}

        {/* CALENDAR GRID */}
        {loadingMonth ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', gap: '12px' }}>
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading attendance chart...</p>
          </div>
        ) : (
          <div>
            {/* Weekday Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px', textAlign: 'center' }}>
              {WEEKDAYS.map((wd, index) => (
                <div key={wd} style={{ fontSize: '0.72rem', fontWeight: 800, color: index === 0 || index === 6 ? 'var(--text-muted)' : 'var(--text-secondary)', textTransform: 'uppercase', padding: '4px 0' }}>
                  {wd}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {/* Empty leading cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} style={{ minHeight: '84px', background: 'var(--bg-tertiary)', opacity: 0.3, borderRadius: '8px' }} />
              ))}

              {/* Day cells */}
              {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayStr = String(dayNum).padStart(2, '0');
                const dateStr = `${monthFormatted}-${dayStr}`;
                const cellDate = new Date(currentYear, currentMonth, dayNum);
                const dayOfWeek = cellDate.getDay(); // 0 is Sun, 6 is Sat
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isToday = dateStr === today.toISOString().split('T')[0];

                const record = attendanceMap.get(dateStr);
                const workLogsCount = monthWorkEntries[dateStr] || 0;

                // Color themes
                let bgStyle = 'var(--bg-secondary)';
                let statusBadgeText = '';
                let statusColor = 'var(--text-muted)';
                let statusBg = 'transparent';

                if (record) {
                  if (record.status === 'Present') {
                    statusBadgeText = 'Present';
                    statusColor = '#10b981';
                    statusBg = '#ecfdf5';
                  } else if (record.status === 'Absent') {
                    statusBadgeText = 'Absent';
                    statusColor = '#ef4444';
                    statusBg = '#fef2f2';
                  } else if (record.status === 'On Leave') {
                    statusBadgeText = 'On Leave';
                    statusColor = '#f97316';
                    statusBg = '#fff7ed';
                  }
                } else if (isWeekend) {
                  statusBadgeText = 'Weekend';
                  statusColor = 'var(--text-muted)';
                  statusBg = 'var(--bg-tertiary)';
                }

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleDateClick(dateStr)}
                    style={{
                      minHeight: '88px',
                      padding: '8px',
                      borderRadius: '8px',
                      border: isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: bgStyle,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      boxShadow: isToday ? '0 0 10px rgba(59, 130, 246, 0.15)' : 'none',
                    }}
                    className="attendance-calendar-cell"
                  >
                    {/* Top Row: Day Number & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 800, 
                        color: isToday ? '#ffffff' : (isWeekend ? 'var(--text-muted)' : 'var(--text-primary)'),
                        background: isToday ? 'var(--accent-primary)' : 'transparent',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {dayNum}
                      </span>

                      {statusBadgeText && (
                        <span style={{ 
                          fontSize: '0.62rem', 
                          fontWeight: 700, 
                          color: statusColor, 
                          background: statusBg,
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}>
                          {statusBadgeText}
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Check In / Check Out snippet */}
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: '4px 0' }}>
                      {record?.checkIn ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontFamily: 'monospace' }}>
                          <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                          <span>{record.checkIn}</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Bottom Row: Work Log Indicator */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      {workLogsCount > 0 ? (
                        <span style={{ 
                          fontSize: '0.63rem', 
                          fontWeight: 700, 
                          background: '#eff6ff', 
                          color: '#2563eb', 
                          border: '1px solid #bfdbfe',
                          padding: '1px 5px',
                          borderRadius: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Briefcase size={9} />
                          {workLogsCount} {workLogsCount === 1 ? 'task' : 'tasks'}
                        </span>
                      ) : (
                        <span />
                      )}

                      <span style={{ fontSize: '0.62rem', color: 'var(--accent-primary)', fontWeight: 650 }}>
                        Details &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footnote instruction */}
        <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          * Click on any specific date cell above to view detailed check-in locations, IP addresses, and work entries logged for that day.
        </div>

        {/* DAILY WORK & ATTENDANCE DETAILS SUB-MODAL */}
        {selectedDateForDetails && (
          <div className="modal-overlay" onClick={() => setSelectedDateForDetails(null)} style={{ zIndex: 1700 }}>
            <div 
              className="modal-container" 
              style={{ maxWidth: '680px', width: '92%', maxHeight: '85vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Daily Header */}
              <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                    Work Details & Attendance Log
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(selectedDateForDetails + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <button className="modal-close" onClick={() => setSelectedDateForDetails(null)}>&times;</button>
              </div>

              {loadingDaily ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                  <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Fetching work details for {selectedDateForDetails}...</p>
                </div>
              ) : dailyDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
                  
                  {/* 1. ATTENDANCE & GEOLOCATION CARD */}
                  <div className="card" style={{ padding: '14px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.88rem' }}>
                        <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span>Daily Presence & Punch Details</span>
                      </div>

                      {dailyDetails.attendance ? (
                        <span className="tag-badge" style={{
                          background: dailyDetails.attendance.status === 'Present' ? '#ecfdf5' : dailyDetails.attendance.status === 'Absent' ? '#fef2f2' : '#fff7ed',
                          color: dailyDetails.attendance.status === 'Present' ? '#065f46' : dailyDetails.attendance.status === 'Absent' ? '#991b1b' : '#9a3412',
                          fontWeight: 800,
                        }}>
                          {dailyDetails.attendance.status}
                        </span>
                      ) : (
                        <span className="tag-badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                          Not Marked
                        </span>
                      )}
                    </div>

                    {dailyDetails.attendance ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '0.78rem' }}>
                        
                        {/* Check In Info */}
                        <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '4px' }}>
                            Check In: {dailyDetails.attendance.checkIn || 'Not recorded'}
                          </div>
                          {dailyDetails.attendance.checkInIpAddress && (
                            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Globe size={12} /> IP: {dailyDetails.attendance.checkInIpAddress}
                            </div>
                          )}
                          {dailyDetails.attendance.checkInLocation && (
                            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '2px' }}>
                              <MapPin size={12} style={{ marginTop: '2px', flexShrink: 0 }} /> 
                              <span>{dailyDetails.attendance.checkInLocation}</span>
                            </div>
                          )}
                          {dailyDetails.attendance.checkInLatitude != null && dailyDetails.attendance.checkInLongitude != null && (
                            <a
                              href={`https://maps.google.com/?q=${dailyDetails.attendance.checkInLatitude},${dailyDetails.attendance.checkInLongitude}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontSize: '0.72rem', marginTop: '4px', textDecoration: 'underline' }}
                            >
                              <span>View GPS Map ({dailyDetails.attendance.checkInLatitude.toFixed(4)}, {dailyDetails.attendance.checkInLongitude.toFixed(4)})</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>

                        {/* Check Out Info */}
                        <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontWeight: 800, color: '#f59e0b', marginBottom: '4px' }}>
                            Check Out: {dailyDetails.attendance.checkOut || 'Not recorded'}
                          </div>
                          {dailyDetails.attendance.checkOutIpAddress && (
                            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Globe size={12} /> IP: {dailyDetails.attendance.checkOutIpAddress}
                            </div>
                          )}
                          {dailyDetails.attendance.checkOutLocation && (
                            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '2px' }}>
                              <MapPin size={12} style={{ marginTop: '2px', flexShrink: 0 }} /> 
                              <span>{dailyDetails.attendance.checkOutLocation}</span>
                            </div>
                          )}
                          {dailyDetails.attendance.checkOutLatitude != null && dailyDetails.attendance.checkOutLongitude != null && (
                            <a
                              href={`https://maps.google.com/?q=${dailyDetails.attendance.checkOutLatitude},${dailyDetails.attendance.checkOutLongitude}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontSize: '0.72rem', marginTop: '4px', textDecoration: 'underline' }}
                            >
                              <span>View GPS Map ({dailyDetails.attendance.checkOutLatitude.toFixed(4)}, {dailyDetails.attendance.checkOutLongitude.toFixed(4)})</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                        No punch check-in / check-out data recorded for this date.
                      </p>
                    )}
                  </div>

                  {/* 2. LOGGED WORK ENTRIES SECTION */}
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Briefcase size={15} style={{ color: 'var(--accent-primary)' }} />
                      <span>Logged Work Entries ({dailyDetails.workEntries.length})</span>
                    </h4>

                    {dailyDetails.workEntries.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {dailyDetails.workEntries.map((work) => (
                          <div 
                            key={work._id} 
                            style={{ 
                              padding: '10px 12px', 
                              borderRadius: '8px', 
                              border: '1px solid var(--border-color)', 
                              background: 'var(--bg-secondary)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span 
                                  className="tag-badge" 
                                  style={{ 
                                    backgroundColor: `${work.projectColor}15`, 
                                    color: work.projectColor, 
                                    borderColor: `${work.projectColor}30`,
                                    fontSize: '0.68rem',
                                    marginBottom: '4px',
                                    display: 'inline-block'
                                  }}
                                >
                                  {work.projectName}
                                </span>
                                <h5 style={{ fontSize: '0.88rem', fontWeight: 800, margin: '2px 0 0 0' }}>{work.title}</h5>
                              </div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-primary)', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                                {formatMinutesToDuration(work.actualTime)}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Time Slot: {work.startTime} &ndash; {work.endTime}
                            </div>

                            {work.description && (
                              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', background: 'var(--bg-tertiary)', padding: '6px 8px', borderRadius: '4px' }}>
                                {work.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '12px', borderRadius: '6px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center' }}>
                        No manual work entries logged on this date.
                      </div>
                    )}
                  </div>

                  {/* 3. TASK WORK SESSIONS SECTION */}
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Layers size={15} style={{ color: '#7f56d9' }} />
                      <span>Task Work Sessions ({dailyDetails.taskWorks.length})</span>
                    </h4>

                    {dailyDetails.taskWorks.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {dailyDetails.taskWorks.map((tw) => (
                          <div 
                            key={tw._id} 
                            style={{ 
                              padding: '10px 12px', 
                              borderRadius: '8px', 
                              border: '1px solid var(--border-color)', 
                              background: 'var(--bg-secondary)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                  <span className="tag-badge" style={{ fontSize: '0.65rem' }}>{tw.taskPriority} Priority</span>
                                  <span className="tag-badge" style={{ fontSize: '0.65rem', background: '#ecfdf5', color: '#065f46' }}>{tw.status}</span>
                                </div>
                                <h5 style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0 }}>{tw.taskTitle}</h5>
                              </div>

                              {tw.totalMinutes > 0 && (
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7f56d9', background: '#f9f5ff', padding: '2px 8px', borderRadius: '4px' }}>
                                  {formatMinutesToDuration(tw.totalMinutes)}
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Session: {tw.startTime} {tw.endTime ? `&ndash; ${tw.endTime}` : '(In Progress)'}
                            </div>

                            {tw.notes && (
                              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', background: 'var(--bg-tertiary)', padding: '6px 8px', borderRadius: '4px' }}>
                                Notes: {tw.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '12px', borderRadius: '6px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center' }}>
                        No task work sessions logged on this date.
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No details found for this date.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedDateForDetails(null)}>
                  Back to Calendar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
