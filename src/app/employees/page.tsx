'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserPlus, Mail, Phone, Calendar, Edit3, 
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
  totalMinutes: number;
}

export default function EmployeesPage() {
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
  const [submitting, setSubmitting] = useState(false);

  const colors = ['#3b82f6', '#10b981', '#7f56d9', '#f59e0b', '#f43f5e', '#06b6d4', '#e2e8f0'];
  const departments = ['Design', 'Development', 'Marketing', 'Human Resource', 'Management'];
  const statuses = ['Active', 'Sick Leave', 'Annual Leave', 'Work From Home'];

  const fetchEmployees = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, department, status, avatarColor: color })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create employee');

      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      await fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setName(emp.name);
    setEmail(emp.email);
    setRole(emp.role);
    setDepartment(emp.department);
    setStatus(emp.status);
    setColor(emp.avatarColor);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp || !name.trim() || !email.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/employees/${editingEmp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, department, status, avatarColor: color })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update employee');

      setIsEditModalOpen(false);
      setEditingEmp(null);
      setName('');
      setEmail('');
      await fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (empId: string) => {
    if (!confirm('Are you sure you want to delete this employee? Deleting them will permanently wipe all their tracked work logs.')) return;

    try {
      const res = await fetch(`/api/employees/${empId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete');
      await fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading && employees.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading team directory...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }} className="no-print">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Employee Directory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your team roster, assign job profiles, and view logged task history.</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setName('');
          setEmail('');
          setIsAddModalOpen(true);
        }}>
          <UserPlus size={16} />
          <span>Add Employee</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <AlertCircle style={{ color: '#ef4444' }} />
          <p>{error}</p>
        </div>
      )}

      {/* Directory Grid */}
      <div className="dashboard-grid">
        {employees.length === 0 ? (
          <div className="card col-12" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <h3>No employees registered</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Start building your team by clicking 'Add Employee'.</p>
          </div>
        ) : (
          employees.map((emp) => {
            let statusClass = 'active';
            if (emp.status === 'Sick Leave') statusClass = 'sick';
            if (emp.status === 'Annual Leave') statusClass = 'annual';
            if (emp.status === 'Work From Home') statusClass = 'wfh';

            return (
              <div key={emp._id} className="card col-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="avatar" style={{ backgroundColor: emp.avatarColor, width: '48px', height: '48px', fontSize: '1.1rem' }}>
                      {emp.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className={`badge-status ${statusClass}`}>
                      {emp.status}
                    </span>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{emp.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Briefcase size={14} style={{ color: 'var(--text-muted)' }} />
                      {emp.role}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <Mail size={14} />
                      {emp.email}
                    </p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>TOTAL TIME</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={14} />
                      {formatMinutesToDuration(emp.totalMinutes)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }} className="no-print">
                    <button className="btn btn-secondary btn-sm" style={{ padding: '6px' }} title="Edit Employee" onClick={() => openEditModal(emp)}>
                      <Edit3 size={14} />
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ padding: '6px' }} title="Delete Employee" onClick={() => handleDelete(emp._id)}>
                      <Trash2 size={14} />
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Add New Team Member</h3>
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
                  <label className="form-label">Job Title / Role *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required
                    placeholder="e.g. Frontend Developer"
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

              <div className="form-group">
                <label className="form-label">Work Status *</label>
                <select 
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Avatar Color Theme</label>
                <div className="color-selector">
                  {colors.map((c) => (
                    <div 
                      key={c}
                      className={`color-option ${color === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Add Employee'}
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Edit Employee Details</h3>
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
                  <label className="form-label">Job Title / Role *</label>
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

              <div className="form-group">
                <label className="form-label">Work Status *</label>
                <select 
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Avatar Color Theme</label>
                <div className="color-selector">
                  {colors.map((c) => (
                    <div 
                      key={c}
                      className={`color-option ${color === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
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
