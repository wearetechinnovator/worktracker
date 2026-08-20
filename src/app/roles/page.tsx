'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, Users, Search, X, Shield, AlertCircle } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';

interface Employee {
  _id: string;
  name: string;
  email: string;
  avatarColor: string;
  status: string;
}

interface RoleData {
  _id: string;
  name: string;
  description?: string;
  employees: Employee[];
}

export default function RolesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  const fetchRoles = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/roles');
      const result = await res.json();
      if (result.success) {
        setRoles(result.data);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRoles();
    }
  }, [user, fetchRoles]);

  const filteredRoles = useMemo(() => {
    return roles.filter(role =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [roles, searchQuery]);

  const totalMembersCount = useMemo(() => {
    return roles.reduce((sum, role) => sum + role.employees.length, 0);
  }, [roles]);

  const isAdmin = user?.userType === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName, description: newRoleDesc })
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create role');
      }

      setNewRoleName('');
      setNewRoleDesc('');
      setShowModal(false);
      fetchRoles();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && roles.length === 0) {
    return <PageShimmer variant="dashboard" />;
  }

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      
      {/* Hero Header */}
      <section className="role-hero">
        <div>
          <p className="hero-eyebrow">Workspace Configuration</p>
          <h1 className="hero-title">Workspace Roles</h1>
          <p className="hero-copy">
            Define organizational roles, review role distributions, and manage employee designation titles.
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" type="button" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} />
            <span>Create Role</span>
          </button>
        )}
      </section>

      {/* Summary Row */}
      <section className="summary-grid">
        <article className="summary-card">
          <div className="summary-icon"><Shield size={14} /></div>
          <p className="summary-label">Total Unique Roles</p>
          <p className="summary-value">{roles.length}</p>
        </article>
        <article className="summary-card">
          <div className="summary-icon"><Users size={14} /></div>
          <p className="summary-label">Assigned Members</p>
          <p className="summary-value">{totalMembersCount}</p>
        </article>
      </section>

      {/* Filters Control Bar */}
      <section className="control-bar card">
        <label className="search-box" htmlFor="role-search" style={{ width: '100%' }}>
          <Search size={14} />
          <input
            id="role-search"
            type="text"
            placeholder="Search roles by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
      </section>

      {/* Roles Grid Cards */}
      <section className="role-grid">
        {filteredRoles.length === 0 ? (
          <div className="card empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No roles match the current search query.</p>
          </div>
        ) : (
          filteredRoles.map((role) => (
            <article key={role._id} className="card role-card">
              <div className="role-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="role-icon-box">
                    <Briefcase size={16} />
                  </div>
                  <div>
                    <h3 className="role-title-text">{role.name}</h3>
                    <p className="role-desc-text">{role.description || 'No description provided.'}</p>
                  </div>
                </div>
                <span className="members-badge">
                  {role.employees.length} {role.employees.length === 1 ? 'Member' : 'Members'}
                </span>
              </div>

              {/* Members Avatar List Section */}
              <div className="role-card-body">
                <p className="body-label">Employees wearing this role:</p>
                {role.employees.length === 0 ? (
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0' }}>
                    No employees currently assigned
                  </p>
                ) : (
                  <div className="members-list">
                    {role.employees.map((emp) => (
                      <div key={emp._id} className="member-row" title={`${emp.name} (${emp.email})`}>
                        <div className="avatar" style={{ backgroundColor: emp.avatarColor || '#7f56d9' }}>
                          {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="member-info">
                          <span className="member-name">{emp.name}</span>
                          <span className="member-email">{emp.email}</span>
                        </div>
                        <span className={`status-pill status-${emp.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {emp.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      {/* Create Role Modal popup */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Create New Role</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ marginTop: '10px' }}>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '14px' }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>Role Title *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Senior Frontend Engineer"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>Description</label>
                <textarea
                  className="form-control"
                  placeholder="Describe the responsibilities associated with this role..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled JSX */}
      <style jsx>{`
        .role-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 16px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          background:
            radial-gradient(circle at 18% 16%, rgba(127, 86, 217, 0.15), transparent 44%),
            radial-gradient(circle at 82% 12%, rgba(59, 130, 246, 0.12), transparent 40%),
            var(--bg-secondary);
        }

        .hero-eyebrow {
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.11em;
          font-size: 0.63rem;
          font-weight: 700;
        }

        .hero-title {
          font-size: 1.45rem;
          font-weight: 800;
          margin-top: 4px;
        }

        .hero-copy {
          margin-top: 4px;
          color: var(--text-secondary);
          max-width: 560px;
        }

        .summary-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .summary-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-md);
          padding: 10px;
          display: grid;
          gap: 5px;
        }

        .summary-icon {
          width: 24px;
          height: 24px;
          border-radius: 7px;
          display: grid;
          place-items: center;
          background: var(--bg-tertiary);
          color: var(--accent-primary);
        }

        .summary-label {
          color: var(--text-secondary);
          font-size: 0.72rem;
        }

        .summary-value {
          font-size: 1.22rem;
          font-weight: 780;
        }

        .control-bar {
          display: flex;
          padding: 10px;
        }

        .search-box {
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          border-radius: var(--border-radius-sm);
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          padding: 0 10px;
          height: 36px;
        }

        .search-box input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          color: var(--text-primary);
        }

        .role-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        }

        .role-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-md);
          background: var(--bg-secondary);
        }

        .role-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }

        .role-icon-box {
          width: 32px;
          height: 32px;
          background: var(--bg-tertiary);
          color: var(--accent-primary);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .role-title-text {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .role-desc-text {
          font-size: 0.72rem;
          color: var(--text-secondary);
          margin-top: 1px;
          line-height: 1.4;
        }

        .members-badge {
          background: rgba(127, 86, 217, 0.1);
          color: #7f56d9;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
          white-space: nowrap;
        }

        .role-card-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .body-label {
          font-size: 0.74rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .members-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 160px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .members-list::-webkit-scrollbar {
          width: 4px;
        }

        .members-list::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 2px;
        }

        .member-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 6px;
          border-radius: 4px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
        }

        .avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          color: white;
          font-weight: bold;
          font-size: 0.6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .member-info {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          min-width: 0;
        }

        .member-name {
          font-size: 0.76rem;
          font-weight: 650;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .member-email {
          font-size: 0.65rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-pill {
          padding: 1px 6px;
          border-radius: 99px;
          font-size: 0.58rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .status-active {
          background: #dcfce7;
          color: #15803d;
        }

        .status-sick-leave {
          background: #fee2e2;
          color: #b91c1c;
        }

        .status-annual-leave {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .status-work-from-home {
          background: #fef9c3;
          color: #a16207;
        }
      `}</style>
    </div>
  );
}
