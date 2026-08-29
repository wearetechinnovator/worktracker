'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, Mail, Edit3,
  Trash2, AlertCircle, Clock, Check, Briefcase, Calendar, Eye, EyeOff
} from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/time';
import EmployeeAttendanceCalendarModal from '@/components/EmployeeAttendanceCalendarModal';
import AddTeamMemberModal from '@/components/AddTeamMemberModal';
import PageShimmer from '@/components/PageShimmer';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  Project: string;
  status: string;
  avatarColor: string;
  userType: 'admin' | 'employee';
  password?: string;
  workMode?: string;
  totalMinutes: number;
  todayAttendance?: {
    allowPunchInDate?: string | null;
    allowPunchOutDate?: string | null;
  } | null;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Employees data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedCalendarEmp, setSelectedCalendarEmp] = useState<Employee | null>(null);

  // Form State (Add/Edit)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('UI UX Designer');
  const [Project, setProject] = useState('Design');
  const [status, setStatus] = useState('Active');
  const [workMode, setWorkMode] = useState('Hybrid');
  const [color, setColor] = useState('#3b82f6');
  const [password, setPassword] = useState('password123');
  const [userType, setUserType] = useState<'admin' | 'employee'>('employee');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const Projects = ['Design', 'Development', 'Marketing', 'Human Resource', 'Management'];
  const statuses = ['Active', 'Inactive'];
  const workmodes = ['Hybrid', 'Remote', 'Onsite'];

  // Check login session on mount
  useEffect(() => {
    const checkAccess = async () => {
      const storedUser = localStorage.getItem('worktracker_user');
      if (!storedUser) {
        router.push('/login');
        return;
      }

      const parsed = JSON.parse(storedUser);
      setUser(parsed);

      try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData.success && meData.data) {
          const userObj = meData.data;
          setUser(userObj);
          localStorage.setItem('worktracker_user', JSON.stringify(userObj));
          const hasAccess = userObj.userType === 'admin' || userObj.isSystemAdmin || (userObj.permissions || []).includes('employees:read');
          if (!hasAccess) {
            router.push('/');
          }
        } else if (parsed.userType !== 'admin' && !(parsed.permissions || []).includes('employees:read')) {
          router.push('/');
        }
      } catch (err) {
        if (parsed.userType !== 'admin' && !(parsed.permissions || []).includes('employees:read')) {
          router.push('/');
        }
      }
    };

    checkAccess();
  }, [router]);

  const fetchEmployees = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch employees');
      setEmployees(data.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while loading employees.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user, fetchEmployees]);

  const fetchRoleSuggestions = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (!data.success || !Array.isArray(data.data)) return;

      const names: string[] = Array.from(
        new Set<string>(
          data.data
            .map((item: any) => (typeof item?.name === 'string' ? item.name.trim() : ''))
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

      setRoleSuggestions(names);
    } catch (err) {
      console.error('Failed to fetch role suggestions:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRoleSuggestions();
    }
  }, [user, fetchRoleSuggestions]);

  useEffect(() => {
    if (typeof window !== 'undefined' && employees.length > 0) {
      const selectId = new URLSearchParams(window.location.search).get('select');
      if (selectId) {
        const matched = employees.find(emp => emp._id === selectId);
        if (matched) {
          setSelectedEmployee(matched);
          setIsDetailModalOpen(true);
        }
      }
    }
  }, [employees]);

  // Handle Add Employee Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          Project,
          status,
          avatarColor: color,
          password,
          userType,
          workMode
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create employee');

      setIsAddModalOpen(false);
      resetForm();
      await fetchEmployees();
      await fetchRoleSuggestions();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit modal
  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setName(emp.name);
    setEmail(emp.email);
    setRole(emp.role);
    setProject(emp.Project);
    setStatus(emp.status);
    setWorkMode(emp.workMode || 'Hybrid');
    setColor(emp.avatarColor);
    setPassword(emp.password || '');
    setUserType(emp.userType || 'employee');
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  // Handle Edit Employee Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp || !name.trim() || !email.trim()) return;

    try {
      setSubmitting(true);
      const updateBody: any = {
        name,
        email,
        role,
        Project,
        status,
        avatarColor: color,
        userType,
        workMode
      };

      if (password && password.trim()) {
        updateBody.password = password.trim();
      }

      const res = await fetch(`/api/employees/${editingEmp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update employee details');

      setIsEditModalOpen(false);
      setEditingEmp(null);
      resetForm();
      await fetchEmployees();
      await fetchRoleSuggestions();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Employee
  const handleDelete = async (empId: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action is irreversible.')) return;

    try {
      const res = await fetch(`/api/employees/${empId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete');

      await fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTogglePunchOverride = async (empId: string, action: 'allowPunchIn' | 'allowPunchOut') => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: empId,
          action,
          localDate: todayStr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchEmployees();
      } else {
        alert(data.error || 'Failed to update punch override');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating punch override');
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: any) => emp.userType !== 'admin' && emp.role?.toLowerCase() !== 'admin');
  }, [employees]);

  const ITEMS_PER_PAGE = 10;
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const renderPagination = (totalItems: number, itemsPerPage: number, page: number, onPageChange: (p: number) => void) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', gridColumn: '1 / -1' }} className="no-print">
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{Math.min(totalItems, (page - 1) * itemsPerPage + 1)}-{Math.min(totalItems, page * itemsPerPage)}</strong> of <strong>{totalItems}</strong> entries
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: page === 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - page) <= 1) {
              return (
                <button
                  key={pageNum}
                  className={page === pageNum ? "btn btn-primary" : "btn btn-secondary"}
                  onClick={() => onPageChange(pageNum)}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  {pageNum}
                </button>
              );
            }
            if (pageNum === 2 || pageNum === totalPages - 1) {
              return <span key={pageNum} style={{ color: 'var(--text-muted)', alignSelf: 'center', padding: '0 4px' }}>...</span>;
            }
            return null;
          })}
          <button
            className="btn btn-secondary"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: page === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const openEmployeeDetails = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDetailModalOpen(true);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('UI UX Designer');
    setProject('Design');
    setStatus('Active');
    setWorkMode('Hybrid');
    setColor('#3b82f6');
    setPassword('password123');
    setUserType('employee');
  };

  if (loading && employees.length === 0) {
    return <PageShimmer variant="employees" />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Team Directory</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Manage company members, assign credentials, and inspect total work tracking statistics.</p>
        </div>

        <button className="btn btn-primary" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
          <UserPlus size={14} />
          <span>Add Employee</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p style={{ fontWeight: 650 }}>{error}</p>
        </div>
      )}

      {/* Grid List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
        {filteredEmployees.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px', gridColumn: '1 / -1' }}>
            No registered employees found. Click Add Employee to create one.
          </p>
        ) : (
          paginatedEmployees.map((emp) => {
            let statusClass = 'active';
            if (emp.status === 'Sick Leave') statusClass = 'sick';
            if (emp.status === 'Annual Leave') statusClass = 'annual';
            if (emp.status === 'Work From Home') statusClass = 'wfh';

            return (
              <div
                key={emp._id}
                className="card"
                onClick={() => openEmployeeDetails(emp)}
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', cursor: 'pointer' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="avatar" style={{ backgroundColor: emp.avatarColor, width: '36px', height: '36px', fontSize: '0.95rem' }}>
                      {emp.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className={`badge-status ${statusClass}`}>
                      {emp.status}
                    </span>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>{emp.name}</h3>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                      <span className="tag-badge" style={{ fontSize: '0.65rem' }}>{emp.Project}</span>
                      <span className="tag-badge" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{emp.userType}</span>
                      {emp.workMode && (
                        <span className="tag-badge" style={{ fontSize: '0.65rem', background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>
                          {emp.workMode}
                        </span>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <Briefcase size={12} style={{ color: 'var(--text-muted)' }} />
                      {emp.role}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Mail size={12} />
                      {emp.email}
                    </p>

                    {/* Punch Overrides directly on Card */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          fontSize: '0.65rem',
                          padding: '4px 8px',
                          fontWeight: 700,
                          background: emp.todayAttendance?.allowPunchInDate === new Date().toISOString().split('T')[0] ? '#dcfce7' : 'var(--bg-tertiary)',
                          color: emp.todayAttendance?.allowPunchInDate === new Date().toISOString().split('T')[0] ? '#15803d' : 'var(--text-secondary)',
                          border: '1px solid ' + (emp.todayAttendance?.allowPunchInDate === new Date().toISOString().split('T')[0] ? '#86efac' : 'var(--border-color)'),
                        }}
                        onClick={() => handleTogglePunchOverride(emp._id, 'allowPunchIn')}
                        title="Allow explicit Punch In override for today"
                      >
                        {emp.todayAttendance?.allowPunchInDate === new Date().toISOString().split('T')[0] ? '✓ In Allowed' : 'Allow In'}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          fontSize: '0.65rem',
                          padding: '4px 8px',
                          fontWeight: 700,
                          background: emp.todayAttendance?.allowPunchOutDate === new Date().toISOString().split('T')[0] ? '#fee2e2' : 'var(--bg-tertiary)',
                          color: emp.todayAttendance?.allowPunchOutDate === new Date().toISOString().split('T')[0] ? '#b91c1c' : 'var(--text-secondary)',
                          border: '1px solid ' + (emp.todayAttendance?.allowPunchOutDate === new Date().toISOString().split('T')[0] ? '#fca5a5' : 'var(--border-color)'),
                        }}
                        onClick={() => handleTogglePunchOverride(emp._id, 'allowPunchOut')}
                        title="Allow explicit Punch Out override for today"
                      >
                        {emp.todayAttendance?.allowPunchOutDate === new Date().toISOString().split('T')[0] ? '✓ Out Allowed' : 'Allow Out'}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>TOTAL TIME</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={12} />
                      {formatMinutesToDuration(emp.totalMinutes)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }} className="no-print" onClick={(e) => e.stopPropagation()}>
                    <button className="action-btn" title="Edit Employee" onClick={() => openEditModal(emp)}>
                      <Edit3 size={12} />
                    </button>
                    <button className="action-btn btn-delete-item" title="Delete Employee" onClick={() => handleDelete(emp._id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {renderPagination(filteredEmployees.length, ITEMS_PER_PAGE, currentPage, setCurrentPage)}
      </div>

      {/* EMPLOYEE MONTHLY ATTENDANCE & WORK DETAILS MODAL */}
      <EmployeeAttendanceCalendarModal
        employee={selectedEmployee}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />

      {/* ADD EMPLOYEE MODAL */}
      <AddTeamMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        roleSuggestions={roleSuggestions}
        onSuccess={async () => {
          await fetchEmployees();
          await fetchRoleSuggestions();
        }}
      />

      {/* EDIT EMPLOYEE MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Edit Employee Details</h3>
              <button className="modal-close" onClick={() => setIsEditModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showEditPassword ? "text" : "password"}
                      className="form-control"
                      style={{ paddingRight: '36px' }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px'
                      }}
                      title={showEditPassword ? "Hide Password" : "Show Password"}
                    >
                      {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Access Type *</label>
                  <select
                    className="form-control"
                    value={userType}
                    onChange={(e) => setUserType(e.target.value as any)}
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Job Title / Role *</label>
                  <select
                    className="form-control"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {Array.from(new Set([
                      role,
                      'Admin',
                      'Project Manager',
                      'Employee',
                      'Client',
                      'UI UX Designer',
                      'Software Engineer',
                      'Frontend Developer',
                      'Backend Developer',
                      'Full Stack Developer',
                      'QA Engineer',
                      'Marketing Specialist',
                      ...roleSuggestions
                    ].filter(Boolean))).map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleOption}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Project *</label>
                  <select
                    className="form-control"
                    value={Project}
                    onChange={(e) => setProject(e.target.value)}
                  >
                    {Projects.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Initial Status</label>
                  <select
                    className="form-control"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Work Mode</label>
                  <select
                    className="form-control"
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value)}
                  >
                    {workmodes.map((workmode) => (
                      <option key={workmode} value={workmode}>{workmode}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
