'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, ShieldCheck, Plus, Users, Search, X,
  CheckSquare, Folder, Briefcase, Clock, BarChart2,
  Check, Lock, Trash2, Edit2, Save, Loader2,
  AlertCircle, CheckCircle2, ChevronRight, UserPlus
} from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import { PERMISSION_GROUPS, ALL_PERMISSION_KEYS, PermissionGroup } from '@/lib/permissions';

interface Employee {
  _id: string;
  name: string;
  email: string;
  avatarColor: string;
  status: string;
  role: string;
}

interface RoleData {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  position?: number;
  isSystemRole?: boolean;
  isSystemAdmin?: boolean;
  permissions?: string[];
  employees: Employee[];
}

const PRESET_COLORS = [
  '#7f56d9', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4',
  '#64748b', '#d97706'
];

export default function RolesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Active Role Form State for Matrix Editor
  const [activeRoleName, setActiveRoleName] = useState('');
  const [activeRoleDesc, setActiveRoleDesc] = useState('');
  const [activeRoleColor, setActiveRoleColor] = useState('#7f56d9');
  const [activeRoleAdmin, setActiveRoleAdmin] = useState(false);
  const [activePermissions, setActivePermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Role Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#3b82f6');
  const [newRoleAdmin, setNewRoleAdmin] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reassign Employee Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // Authenticate user
  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  const isAdmin = user?.userType === 'admin';

  // Fetch Roles
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/roles');
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setRoles(result.data);
        if (result.data.length > 0 && !selectedRoleId) {
          setSelectedRoleId(result.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  // Fetch All Employees for Reassignment
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setAllEmployees(result.data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRoles();
      fetchEmployees();
    }
  }, [user, fetchRoles, fetchEmployees]);

  const selectedRole = useMemo(() => {
    return roles.find((r) => r._id === selectedRoleId) || roles[0] || null;
  }, [roles, selectedRoleId]);

  // Sync selected role to editor form states
  useEffect(() => {
    if (selectedRole) {
      setActiveRoleName(selectedRole.name || '');
      setActiveRoleDesc(selectedRole.description || '');
      setActiveRoleColor(selectedRole.color || '#7f56d9');
      setActiveRoleAdmin(Boolean(selectedRole.isSystemAdmin));
      setActivePermissions(selectedRole.permissions || []);
      setError(null);
      setSaveSuccess(false);
    }
  }, [selectedRole]);

  const filteredRoles = useMemo(() => {
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [roles, searchQuery]);

  const totalMembersCount = useMemo(() => {
    return roles.reduce((sum, role) => sum + (role.employees ? role.employees.length : 0), 0);
  }, [roles]);

  // Permission Checkbox Toggle Handler
  const togglePermission = (key: string) => {
    setActivePermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Group Permission Select All Toggle Handler
  const toggleGroupPermissions = (group: PermissionGroup) => {
    const groupKeys = group.actions.map((a) => a.key);
    const allSelected = groupKeys.every((k) => activePermissions.includes(k));

    if (allSelected) {
      setActivePermissions((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      setActivePermissions((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
  };

  // Select All Master Toggle
  const toggleAllPermissions = () => {
    if (activePermissions.length === ALL_PERMISSION_KEYS.length) {
      setActivePermissions([]);
    } else {
      setActivePermissions([...ALL_PERMISSION_KEYS]);
    }
  };

  // Save Role Changes Handler
  const handleSaveRole = async () => {
    if (!selectedRole || !isAdmin) return;

    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const res = await fetch(`/api/roles/${selectedRole._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeRoleName,
          description: activeRoleDesc,
          color: activeRoleColor,
          isSystemAdmin: activeRoleAdmin,
          permissions: activePermissions,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update role');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchRoles();
    } catch (err: any) {
      setError(err.message || 'Error saving role changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Create Role Handler
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      setSubmittingCreate(true);
      setCreateError(null);

      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDesc,
          color: newRoleColor,
          isSystemAdmin: newRoleAdmin,
          permissions: activePermissions.length > 0 ? activePermissions : ['tasks:read', 'projects:read'],
        }),
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create role');
      }

      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRoleColor('#3b82f6');
      setNewRoleAdmin(false);
      setCreateError(null);
      fetchRoles();
      if (result.data && result.data._id) {
        setSelectedRoleId(result.data._id);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Error creating role');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Delete Role Handler
  const handleDeleteRole = async () => {
    if (!selectedRole || selectedRole.isSystemRole) return;
    if (!confirm(`Are you sure you want to delete the "${selectedRole.name}" role? All assigned members will be reassigned to Employee role.`)) return;

    try {
      const res = await fetch(`/api/roles/${selectedRole._id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete role');
      }

      setSelectedRoleId(null);
      fetchRoles();
    } catch (err: any) {
      alert(err.message || 'Error deleting role');
    }
  };

  // Reassign Member Handler
  const handleReassignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !selectedRole) return;

    try {
      setReassigning(true);
      const res = await fetch(`/api/employees/${selectedEmpId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole.name }),
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to assign role');
      }

      setShowReassignModal(false);
      setSelectedEmpId('');
      fetchRoles();
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Error reassigning member');
    } finally {
      setReassigning(false);
    }
  };

  // Icon Resolver Component
  const renderDomainIcon = (iconName: string) => {
    switch (iconName) {
      case 'CheckSquare': return <CheckSquare size={16} style={{ color: 'var(--accent-primary)' }} />;
      case 'Folder': return <Folder size={16} style={{ color: '#3b82f6' }} />;
      case 'Briefcase': return <Briefcase size={16} style={{ color: '#f59e0b' }} />;
      case 'Users': return <Users size={16} style={{ color: '#8b5cf6' }} />;
      case 'Clock': return <Clock size={16} style={{ color: '#10b981' }} />;
      case 'BarChart2': return <BarChart2 size={16} style={{ color: '#ec4899' }} />;
      default: return <Shield size={16} />;
    }
  };

  if (loading && roles.length === 0) {
    return <PageShimmer variant="employees" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={28} style={{ color: 'var(--accent-primary)' }} />
            Role & Permission Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Configure custom role hierarchies, assign color badges, and manage granular system access permissions.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
          >
            <Plus size={16} />
            <span>Create Custom Role</span>
          </button>
        )}
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', background: '#fef2f2', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle style={{ color: '#ef4444' }} size={18} />
            <span style={{ fontWeight: 650, color: '#991b1b', fontSize: '0.85rem' }}>{error}</span>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="card" style={{ borderLeft: '4px solid #10b981', background: '#ecfdf5', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 style={{ color: '#10b981' }} size={18} />
            <span style={{ fontWeight: 700, color: '#065f46', fontSize: '0.85rem' }}>Role permissions saved successfully!</span>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '20px', alignItems: 'start' }}>
        {/* LEFT COLUMN: Discord-style Role List */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search Roles Box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '0.82rem', height: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 4px' }}>
            <span>ROLES HIERARCHY ({filteredRoles.length})</span>
            <span>MEMBERS ({totalMembersCount})</span>
          </div>

          {/* Role List Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
            {filteredRoles.map((role) => {
              const isSelected = selectedRoleId === role._id;
              const roleColor = role.color || '#7f56d9';
              return (
                <div
                  key={role._id}
                  onClick={() => setSelectedRoleId(role._id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: isSelected ? `2px solid ${roleColor}` : '1px solid var(--border-color)',
                    background: isSelected ? `${roleColor}10` : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    {/* Role Discord-style Color Badge */}
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: roleColor,
                        boxShadow: `0 0 8px ${roleColor}80`,
                        flexShrink: 0
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {role.name}
                        </span>
                        {role.isSystemRole && (
                          <span title="System Default Role" style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <Lock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          </span>
                        )}
                        {role.isSystemAdmin && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#7f56d920', color: '#7f56d9', padding: '1px 5px', borderRadius: '4px', border: '1px solid #7f56d930' }}>
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {role.description || 'No description provided'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      {role.employees ? role.employees.length : 0}
                    </span>
                    <ChevronRight size={14} style={{ color: isSelected ? roleColor : 'var(--text-muted)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Strapi-style Permission Matrix Editor */}
        {selectedRole ? (
          <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Header: Selected Role Metadata Editor */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '18px' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: activeRoleColor,
                      boxShadow: `0 0 10px ${activeRoleColor}80`
                    }}
                  />
                  {selectedRole.isSystemRole ? (
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {selectedRole.name}
                    </h2>
                  ) : (
                    <input
                      type="text"
                      className="form-control"
                      value={activeRoleName}
                      onChange={(e) => setActiveRoleName(e.target.value)}
                      disabled={!isAdmin}
                      style={{ fontSize: '1.2rem', fontWeight: 800, padding: '4px 10px', width: 'auto' }}
                    />
                  )}
                  {selectedRole.isSystemRole && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 750, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={11} /> System Default
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Role description..."
                  value={activeRoleDesc}
                  onChange={(e) => setActiveRoleDesc(e.target.value)}
                  disabled={!isAdmin}
                  style={{ fontSize: '0.82rem', width: '100%', marginTop: '6px' }}
                />
              </div>

              {/* Action Buttons & Color Swatch Selector */}
              {isAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!selectedRole.isSystemRole && (
                      <button
                        type="button"
                        onClick={handleDeleteRole}
                        className="btn btn-secondary"
                        style={{ color: '#ef4444', borderColor: '#ef444430', background: '#fef2f2', padding: '7px 12px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        title="Delete Role"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveRole}
                      disabled={isSaving}
                      className="btn btn-primary"
                      style={{ padding: '8px 18px', fontSize: '0.82rem', fontWeight: 750, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                      <span>{isSaving ? 'Saving...' : 'Save Permissions'}</span>
                    </button>
                  </div>

                  {/* Preset Color Swatches */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Badge Color:</span>
                    {PRESET_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setActiveRoleColor(hex)}
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: hex,
                          border: activeRoleColor === hex ? '2px solid var(--text-primary)' : 'none',
                          cursor: 'pointer',
                          transform: activeRoleColor === hex ? 'scale(1.2)' : 'scale(1)',
                          transition: 'all 0.15s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Discord Feature Flag Toggles Bar */}
            <div style={{ background: 'var(--bg-secondary)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={16} style={{ color: '#7f56d9' }} />
                  <span>Administrator Override Access</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Enabling this option grants full administrative bypass access to all workspace features.
                </div>
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: isAdmin ? 'pointer' : 'default' }}>
                <input
                  type="checkbox"
                  checked={activeRoleAdmin}
                  onChange={(e) => setActiveRoleAdmin(e.target.checked)}
                  disabled={!isAdmin || selectedRole.name === 'Admin'}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 750, color: activeRoleAdmin ? '#7f56d9' : 'var(--text-secondary)' }}>
                  {activeRoleAdmin ? 'System Admin Bypass ACTIVE' : 'Standard Permission Checks'}
                </span>
              </label>
            </div>

            {/* Strapi-style Action-Subject Permission Matrix Header */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Granular Resource Permissions Matrix
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Select actions that members with the <strong>{activeRoleName}</strong> role can perform across workspace domains.
                  </div>
                </div>

                {isAdmin && !activeRoleAdmin && (
                  <button
                    type="button"
                    onClick={toggleAllPermissions}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.74rem', padding: '4px 10px', fontWeight: 700 }}
                  >
                    {activePermissions.length === ALL_PERMISSION_KEYS.length ? 'Deselect All' : 'Select All Permissions'}
                  </button>
                )}
              </div>

              {/* Permission Groups Accordion List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {PERMISSION_GROUPS.map((group) => {
                  const groupKeys = group.actions.map((a) => a.key);
                  const selectedCount = groupKeys.filter((k) => activePermissions.includes(k)).length;
                  const isFullySelected = selectedCount === groupKeys.length;

                  return (
                    <div
                      key={group.domain}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Group Header Bar */}
                      <div
                        style={{
                          padding: '12px 16px',
                          background: 'var(--bg-tertiary)',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {renderDomainIcon(group.iconName)}
                          <div>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {group.label}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              ({group.description})
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 750, color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                            {selectedCount}/{groupKeys.length} enabled
                          </span>

                          {isAdmin && !activeRoleAdmin && (
                            <button
                              type="button"
                              onClick={() => toggleGroupPermissions(group)}
                              style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '0.72rem',
                                color: 'var(--accent-primary)',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              {isFullySelected ? 'Uncheck Group' : 'Check Group'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Group Actions Checklist Grid */}
                      <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {group.actions.map((action) => {
                          const isChecked = activePermissions.includes(action.key) || activeRoleAdmin;
                          return (
                            <label
                              key={action.key}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                background: isChecked ? 'rgba(59, 130, 246, 0.06)' : 'var(--bg-primary)',
                                border: isChecked ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid var(--border-color)',
                                cursor: isAdmin && !activeRoleAdmin ? 'pointer' : 'default',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(action.key)}
                                disabled={!isAdmin || activeRoleAdmin}
                                style={{ marginTop: '2px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                              />
                              <div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 750, color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                  {action.label}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: '1.3', marginTop: '1px' }}>
                                  {action.description}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assigned Role Members Panel */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} style={{ color: activeRoleColor }} />
                  <span>Members with {selectedRole.name} Role ({selectedRole.employees ? selectedRole.employees.length : 0})</span>
                </h4>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowReassignModal(true)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.74rem', padding: '4px 10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <UserPlus size={12} />
                    <span>Assign Team Member</span>
                  </button>
                )}
              </div>

              {!selectedRole.employees || selectedRole.employees.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No team members are currently assigned to this role.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {selectedRole.employees.map((emp) => (
                    <div
                      key={emp._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--bg-secondary)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div
                        className="avatar"
                        style={{
                          backgroundColor: emp.avatarColor || '#3b82f6',
                          width: '20px',
                          height: '20px',
                          fontSize: '0.58rem',
                          color: '#ffffff'
                        }}
                      >
                        {emp.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{emp.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select a role from the left hierarchy panel to edit permissions.
          </div>
        )}
      </div>

      {/* CREATE CUSTOM ROLE MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Create Custom Role</h3>
              <button onClick={() => setShowCreateModal(false)} className="btn" style={{ padding: '4px', background: 'none' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRole} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {createError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #ef444430', borderRadius: '8px', color: '#991b1b', fontSize: '0.8rem', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} style={{ color: '#ef4444' }} />
                  <span>{createError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Role Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Lead Designer, QA Tester"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Description</label>
                <textarea
                  className="form-control"
                  placeholder="Describe role responsibilities..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Badge Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setNewRoleColor(hex)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: hex,
                        border: newRoleColor === hex ? '3px solid var(--text-primary)' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingCreate}>
                  {submittingCreate ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN MEMBER MODAL */}
      {showReassignModal && selectedRole && (
        <div className="modal-backdrop" onClick={() => setShowReassignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Assign Member to {selectedRole.name}</h3>
              <button onClick={() => setShowReassignModal(false)} className="btn" style={{ padding: '4px', background: 'none' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleReassignMember} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Select Team Member *</label>
                <select
                  className="form-control"
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  required
                >
                  <option value="">Select an employee...</option>
                  {allEmployees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.role || 'No Role'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReassignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={reassigning || !selectedEmpId}>
                  {reassigning ? 'Assigning...' : 'Assign Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
