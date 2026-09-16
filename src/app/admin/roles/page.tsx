'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Shield, ShieldCheck, Plus, Users, Search, X,
  CheckSquare, Folder, Briefcase, Clock, BarChart2,
  Check, Lock, Trash2, Edit2, Save, Loader2,
  AlertCircle, CheckCircle2, ChevronRight, UserPlus
} from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import { PERMISSION_GROUPS, ALL_PERMISSION_KEYS, PermissionGroup } from '@/lib/permissions';
import { toast } from '@/lib/toast';

interface Employee {
  _id: string;
  name: string;
  email: string;
  avatarColor: string;
  status: string;
  role: string;
  userType?: string;
  Project?: string;
}

interface RoleData {
  _id: string;
  name: string;
  short_desc?: string;
  created_by?: number | null;
  modified_by?: number | null;
  status: number;
  createdAt?: string;
  updatedAt?: string;

  // UI-only fields. These are not stored by the current Role schema.
  color?: string;
  permissions?: string[];
  employees?: Employee[];
}

const PRESET_COLORS = [
  '#7f56d9', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4',
  '#64748b', '#d97706'
];



export default function RolesPage() {
  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const isAdmin = Number(user?.user_role) === 1;

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
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reassign Employee Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const parseJsonResponse = async (response: Response) => {
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `Invalid server response (${response.status}). Expected JSON.`
      );
    }
  };

  const loadRoles = async () => {
    const response = await fetch('/api/roles', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    const result = await parseJsonResponse(response);

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to load roles');
    }

    return Array.isArray(result.data) ? result.data : [];
  };

  // Authenticate user + load backend roles.
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const userResponse = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        const userResult = await parseJsonResponse(userResponse);

        if (!userResponse.ok || !userResult.success || !userResult.user) {
          throw new Error(
            userResult.message || 'Authentication required'
          );
        }

        if (cancelled) return;

        setUser(userResult.user);

        const loadedRoles = await loadRoles();

        if (cancelled) return;

        const normalizedRoles: RoleData[] = loadedRoles.map(
          (role: any, index: number) => ({
            _id: String(role._id),
            name: role.name || 'Unnamed Role',
            short_desc: role.short_desc || '',
            created_by: role.created_by ?? null,
            modified_by: role.modified_by ?? null,
            status: Number(role.status ?? 1),
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
            color: role.color || PRESET_COLORS[index % PRESET_COLORS.length],
            permissions: Array.isArray(role.permissions)
              ? role.permissions
              : [],
            employees: Array.isArray(role.employees)
              ? role.employees
              : [],
          })
        );

        setRoles(normalizedRoles);

        setSelectedRoleId((current) => {
          if (current && normalizedRoles.some((r) => r._id === current)) {
            return current;
          }
          return normalizedRoles[0]?._id ?? null;
        });

        // Employee ownership is already enforced by this endpoint:
        // an admin only receives employees created by that admin.
        if (Number(userResult.user.user_role) === 1) {
          try {
            const employeeResponse = await fetch('/api/users/employees', {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
            });

            const employeeResult =
              await parseJsonResponse(employeeResponse);

            if (
              employeeResponse.ok &&
              employeeResult.success &&
              Array.isArray(employeeResult.data) &&
              !cancelled
            ) {
              setAllEmployees(employeeResult.data);
            }
          } catch (employeeError) {
            console.error(
              'Failed to load employees for role assignment:',
              employeeError
            );
          }
        }
      } catch (err: any) {
        console.error('Failed to load roles:', err);

        if (!cancelled) {
          setRoles([]);
          setSelectedRoleId(null);
          setError(err.message || 'Failed to load roles');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRole = useMemo(() => {
    return roles.find((r) => r._id === selectedRoleId) || roles[0] || null;
  }, [roles, selectedRoleId]);

  // Sync selected role to editor form states
  useEffect(() => {
    if (selectedRole) {
      setActiveRoleName(selectedRole.name || '');
      setActiveRoleDesc(selectedRole.short_desc || '');
      setActiveRoleColor(selectedRole.color || '#7f56d9');
      setActivePermissions(selectedRole.permissions || []);
      setError(null);
      setSaveSuccess(false);
    }
  }, [selectedRole]);

  const filteredRoles = useMemo(() => {
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (role.short_desc && role.short_desc.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [roles, searchQuery]);

  const totalMembersCount = useMemo(() => {
    return roles.reduce((sum, role) => sum + (role.employees?.length || 0), 0);
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

    const name = activeRoleName.trim();
    const short_desc = activeRoleDesc.trim();

    if (!name) {
      setError('Role name is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const response = await fetch(
        `/api/roles?id=${encodeURIComponent(selectedRole._id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name,
            short_desc,
          }),
        }
      );

      const result = await parseJsonResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update role');
      }

      const updatedRole: RoleData = {
        ...selectedRole,
        ...result.data,
        _id: String(result.data._id),
        color: selectedRole.color,
        permissions: selectedRole.permissions || [],
        employees: selectedRole.employees || [],
      };

      setRoles((prev) =>
        prev.map((role) =>
          role._id === updatedRole._id ? updatedRole : role
        )
      );

      setSaveSuccess(true);
      toast.success(`Role "${name}" updated successfully`);

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save role:', err);
      setError(err.message || 'Failed to update role');
      toast.error(err.message || 'Failed to update role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = newRoleName.trim();
    const short_desc = newRoleDesc.trim();

    if (!name) {
      setCreateError('Role name is required');
      return;
    }

    try {
      setSubmittingCreate(true);
      setCreateError(null);

      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          short_desc,
        }),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create role');
      }

      const createdRole: RoleData = {
        ...result.data,
        _id: String(result.data._id),
        name: result.data.name,
        short_desc: result.data.short_desc || '',
        status: Number(result.data.status ?? 1),
        color: newRoleColor,
        permissions: [],
        employees: [],
      };

      setRoles((prev) => [...prev, createdRole]);
      setSelectedRoleId(createdRole._id);

      setNewRoleName('');
      setNewRoleDesc('');
      setNewRoleColor('#3b82f6');
      setShowCreateModal(false);

      toast.success(`Role "${createdRole.name}" created successfully`);
    } catch (err: any) {
      console.error('Failed to create role:', err);
      setCreateError(err.message || 'Failed to create role');
      toast.error(err.message || 'Failed to create role');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole || !isAdmin) return;

    const roleName = selectedRole.name;

    if (!confirm(`Delete "${roleName}" role?`)) return;

    try {
      const response = await fetch(
        `/api/roles?id=${encodeURIComponent(selectedRole._id)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      const result = await parseJsonResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete role');
      }

      const remainingRoles = roles.filter(
        (role) => role._id !== selectedRole._id
      );

      setRoles(remainingRoles);
      setSelectedRoleId(remainingRoles[0]?._id ?? null);

      toast.success(`Role "${roleName}" deleted successfully`);
    } catch (err: any) {
      console.error('Failed to delete role:', err);
      toast.error(err.message || 'Failed to delete role');
    }
  };

  const handleReassignMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmpId || !selectedRole) return;

    // Role <-> employee persistence will be wired when role_id is added
    // to the User schema/API. Do not fake a successful assignment here.
    setReassigning(true);

    try {
      throw new Error(
        'Employee role assignment API is not connected yet.'
      );
    } catch (err: any) {
      toast.error(err.message);
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 4px' }}>
            <span>ROLES HIERARCHY ({filteredRoles.length})</span>
            <span>MEMBERS ({totalMembersCount})</span>
          </div>

          {/* Role List Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
            {filteredRoles.length === 0 ? (
              <div
                style={{
                  padding: '28px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '10px',
                }}
              >
                {searchQuery ? 'No roles match your search.' : 'No roles found. Create a custom role to get started.'}
              </div>
            ) : (
              filteredRoles.map((role) => {
              const isSelected = selectedRoleId === role._id;

              return (
                <div
                  key={role._id}
                  onClick={() => setSelectedRoleId(role._id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: isSelected ? `2px solid blue` : '1px solid var(--border-color)',
                    background: isSelected ? `blue10` : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>

                    
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {role.name}
                        </span>
                        {false && (
                          <span title="System Default Role" style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <Lock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          </span>
                        )}
                        {false && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#7f56d920', color: '#7f56d9', padding: '1px 5px', borderRadius: '4px', border: '1px solid #7f56d930' }}>
                            ADMIN
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      {role.employees ? role.employees.length : 0}
                    </span>

                  </div>
                </div>
              );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Strapi-style Permission Matrix Editor */}
        {selectedRole ? (
          <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Header: Selected Role Metadata Editor */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                
                {false ? (
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
                {false && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 750, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={11} /> System Default
                  </span>
                )}
              </div>

              {/* Action Buttons & Color Swatch Selector */}
              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isAdmin && (
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
                </div>
              )}
            </div>

            {/* Discord Feature Flag Toggles Bar */}
            <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} style={{ color: '#7f56d9' }} />
                <span>Administrator Override Access</span>
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: isAdmin ? 'pointer' : 'default' }}>
                <input
                  type="checkbox"
                  checked={activeRoleAdmin}
                  onChange={(e) => setActiveRoleAdmin(e.target.checked)}
                  disabled={!isAdmin}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 550, color: activeRoleAdmin ? '#7f56d9' : 'var(--text-secondary)' }}>
                  {activeRoleAdmin ? 'System Admin Bypass ACTIVE' : 'Standard Permission Checks'}
                </span>
              </label>
            </div>

            {/* Strapi-style Action-Subject Permission Matrix Header */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div />

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
                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {group.label}
                          </span>
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
                      <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                        {group.actions.map((action) => {
                          const isChecked = activePermissions.includes(action.key) || activeRoleAdmin;
                          return (
                            <label
                              key={action.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-primary)',
                                border: isChecked ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-color)',
                                cursor: isAdmin && !activeRoleAdmin ? 'pointer' : 'default',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(action.key)}
                                disabled={!isAdmin || activeRoleAdmin}
                                style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                {action.label}
                              </span>
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
                        {"ssss"}
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

              {/* <div className="form-group">
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
              </div> */}

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
