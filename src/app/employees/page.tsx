'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, UserPlus, Mail, Edit3, 
  Trash2, AlertCircle, Loader2, Clock, Check, Briefcase 
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
  userType: 'admin' | 'employee';
  password?: string;
  totalMinutes: number;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Employees data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Form State (Add/Edit)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('UI UX Designer');
  const [department, setDepartment] = useState('Design');
  const [status, setStatus] = useState('Active');
  const [color, setColor] = useState('#3b82f6');
  const [password, setPassword] = useState('password123');
  const [userType, setUserType] = useState<'admin' | 'employee'>('employee');
  const [submitting, setSubmitting] = useState(false);

  const colors = ['#3b82f6', '#10b981', '#7f56d9', '#f59e0b', '#f43f5e', '#06b6d4', '#475569'];
  const departments = ['Design', 'Development', 'Marketing', 'Human Resource', 'Management'];
  const statuses = ['Active', 'Sick Leave', 'Annual Leave', 'Work From Home'];

  // Check login session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(storedUser);
    if (parsed.userType !== 'admin') {
      router.push('/'); // Redirect employees to dashboard
      return;
    }

    setUser(parsed);
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
          department, 
          status, 
          avatarColor: color, 
          password, 
          userType 
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create employee');

      setIsAddModalOpen(false);
      resetForm();
      await fetchEmployees();
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
    setDepartment(emp.department);
    setStatus(emp.status);
    setColor(emp.avatarColor);
    setPassword(emp.password || 'password123');
    setUserType(emp.userType || 'employee');
    setIsEditModalOpen(true);
  };

  // Handle Edit Employee Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp || !name.trim() || !email.trim() || !password.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/employees/${editingEmp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          role, 
          department, 
          status, 
          avatarColor: color, 
          password, 
          userType 
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update employee details');

      setIsEditModalOpen(false);
      setEditingEmp(null);
      resetForm();
      await fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Employee
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this employee? This will cascade-delete all work logs logged by this member!')) return;

    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete');

      await fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('UI UX Designer');
    setDepartment('Design');
    setStatus('Active');
    setColor('#3b82f6');
    setPassword('password123');
    setUserType('employee');
  };

  if (loading && employees.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading directory registry...</p>
      </div>
    );
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
        {employees.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px', gridColumn: '1 / -1' }}>
            No registered employees found. Click Add Employee to create one.
          </p>
        ) : (
          employees.map((emp) => {
            let statusClass = 'active';
            if (emp.status === 'Sick Leave') statusClass = 'sick';
            if (emp.status === 'Annual Leave') statusClass = 'annual';
            if (emp.status === 'Work From Home') statusClass = 'wfh';

            return (
              <div key={emp._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
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
                      <span className="tag-badge" style={{ fontSize: '0.65rem' }}>{emp.department}</span>
                      <span className="tag-badge" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{emp.userType}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <Briefcase size={12} style={{ color: 'var(--text-muted)' }} />
                      {emp.role}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Mail size={12} />
                      {emp.email}
                    </p>
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

                  <div style={{ display: 'flex', gap: '4px' }} className="no-print">
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
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add New Team Member</h3>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="e.g. Brooklyn Simmons"
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
                  placeholder="e.g. brok-simms@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role Type *</label>
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
                  <label className="form-label">Job Title *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select 
                    className="form-control"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    {departments.map((dept) => (
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
                  <label className="form-label">Theme Color</label>
                  <div className="color-selector">
                    {colors.map((c) => (
                      <div 
                        key={c}
                        className="color-option"
                        style={{ 
                          backgroundColor: c,
                          borderColor: color === c ? 'var(--text-primary)' : 'transparent'
                        }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <input 
                    type="text" 
                    className="form-control" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role Type *</label>
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
                  <label className="form-label">Job Title *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select 
                    className="form-control"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    {departments.map((dept) => (
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
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
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
                          borderColor: color === c ? 'var(--text-primary)' : 'transparent'
                        }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
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
