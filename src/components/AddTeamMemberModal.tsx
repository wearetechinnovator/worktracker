'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, Loader2, UserPlus, AlertCircle, User, Mail, Lock, Briefcase, UserStar } from 'lucide-react';
import { CustomDropdown } from '@/components/TaskFormControls';
import { toast } from '@/lib/toast';
import { useModalDraft } from '@/context/ModalDraftContext';
import type { Employee } from '@/types/Employee2';

export interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newEmployee?: any) => void;
  mode?: 'add' | 'edit';
  employee?: Employee | null;
  roleSuggestions?: string[];
  projectsList?: string[] | { _id: string; name: string }[];
}



const DEFAULT_PROJECTS = [
  'Design',
  'Development',
  'Marketing',
  'Human Resource',
  'Management',
  'Sales',
  'Support',
  'Finance',
];

export default function AddTeamMemberModal({
  isOpen,
  onClose,
  onSuccess,
  mode = 'add',
  employee = null,
  roleSuggestions,
  projectsList,
}: AddTeamMemberModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(mode === 'add' ? 'password123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(mode === 'add' ? '' : employee?.role || '');
  const [roleId, setRoleId] = useState('');
  const [project, setProject] = useState(mode === 'add' ? '' : employee?.Project || '');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState(mode === 'add' ? 'Active' : employee?.status || 'Active');
  const [workMode, setWorkMode] = useState(mode === 'add' ? 'Hybrid' : employee?.workMode || 'Hybrid');
  const [avatarColor, setAvatarColor] = useState(employee?.avatarColor || '#3b82f6');
  const [userType, setUserType] = useState<'admin' | 'employee'>(employee?.userType || 'employee');
  type Designation = {
    _id: string;
    name: string;
    short_desc?: string;
  };

  const [fetchedDesignations, setFetchedDesignations] =
    useState<Designation[]>([]);
  const [fetchedProjects, setFetchedProjects] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New state for Add Designation pop-up modal
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [addingRole, setAddingRole] = useState(false);
  const [roleAddError, setRoleAddError] = useState<string | null>(null);

  const handleCreateNewRole = async () => {
    const trimmed = newRoleName.trim();

    if (!trimmed) {
      setRoleAddError('Please enter a designation name');
      return;
    }

    try {
      setAddingRole(true);
      setRoleAddError(null);

      const response = await fetch('/api/designations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: trimmed,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Failed to create designation'
        );
      }

      const newDesignation: Designation = {
        _id: String(result.data._id),
        name: result.data.name,
        short_desc: result.data.short_desc || '',
      };

      setFetchedDesignations((prev) => [
        newDesignation,
        ...prev.filter(
          (item) =>
            item._id !== newDesignation._id &&
            item.name.toLowerCase() !== newDesignation.name.toLowerCase()
        ),
      ]);

      // Automatically select the newly-created designation.
      setRole(newDesignation.name);
      setNewRoleName('');
      setIsAddRoleModalOpen(false);

      toast.success(
        `Designation "${newDesignation.name}" added successfully`
      );
    } catch (err: any) {
      setRoleAddError(
        err.message || 'Error adding designation'
      );
    } finally {
      setAddingRole(false);
    }
  };

  // Fetch database-backed designations when the modal opens.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadDesignations = async () => {
      try {
        const response = await fetch('/api/designations', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || 'Failed to load designations'
          );
        }

        if (cancelled) return;

        const designations: Designation[] = Array.isArray(result.data)
          ? result.data
              .filter((item: any) => item?._id && item?.name)
              .map((item: any) => ({
                _id: String(item._id),
                name: String(item.name),
                short_desc: String(item.short_desc || ''),
              }))
          : [];

        setFetchedDesignations(designations);
      } catch (error) {
        if (!cancelled) {
          console.error(
            'Failed to load designations:',
            error
          );
          setFetchedDesignations([]);
        }
      }
    };

    loadDesignations();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Projects are also loaded from the API.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || 'Failed to load projects'
          );
        }

        if (cancelled) return;

        const projectNames = Array.isArray(result.data)
          ? result.data
              .map((project: any) => project?.name)
              .filter(Boolean)
          : [];

        setFetchedProjects(projectNames);
      } catch (error) {
        if (!cancelled) {
          console.error(
            'Failed to load projects:',
            error
          );
          setFetchedProjects([]);
        }
      }
    };

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const draftKey = mode === 'add' ? 'add-employee' : `edit-employee-${employee?._id || 'unknown'}`;
  const { saveDraft, getDraft, clearDraft, setModalOpenState } = useModalDraft();
  const initializedModalRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      initializedModalRef.current = null;
      return;
    }

    if (initializedModalRef.current === draftKey) {
      return;
    }

    initializedModalRef.current = draftKey;
    setModalOpenState(draftKey, true);

    const draft = getDraft(draftKey);

    if (draft) {
      if (draft.name !== undefined) setName(draft.name);
      if (draft.email !== undefined) setEmail(draft.email);
      if (draft.password !== undefined) setPassword(draft.password);
      if (draft.role !== undefined) setRole(draft.role);
      if (draft.roleId !== undefined) setRoleId(draft.roleId);
      if (draft.project !== undefined) setProject(draft.project);
      if (draft.group !== undefined) setGroup(draft.group);
      if (draft.status !== undefined) setStatus(draft.status);
      if (draft.workMode !== undefined) setWorkMode(draft.workMode);
      if (draft.avatarColor !== undefined) setAvatarColor(draft.avatarColor);
      if (draft.userType !== undefined) setUserType(draft.userType);

      setError(null);
      return;
    }

    if (mode === 'edit' && employee) {
      const emp = employee as Employee & {
        full_name?: string;
        designation?: string;
        group?: string;
        profile_picture?: string | null;
        status?: string | boolean;
        workMode?: string;
        avatarColor?: string;
        userType?: 'admin' | 'employee';
        Project?: string;
        password?: string;
      };

      setName(String(emp.full_name ?? emp.name ?? ''));
      setEmail(String(emp.email ?? ''));
      setPassword(String(emp.password ?? 'password123'));
      setRole(String(emp.designation ?? emp.role ?? ''));
      setProject(String(emp.Project ?? ''));
      setGroup(String(emp.group ?? ''));
      setStatus(
        typeof emp.status === 'boolean'
          ? (emp.status ? 'Active' : 'Inactive')
          : String(emp.status ?? 'Active')
      );
      setWorkMode(String(emp.workMode ?? 'Hybrid'));
      setAvatarColor(String(emp.avatarColor ?? '#3b82f6'));
      setUserType(emp.userType === 'admin' ? 'admin' : 'employee');
      setError(null);
    } else {
      resetForm();
    }
  }, [
    isOpen,
    draftKey,
    mode,
    employee?._id,
    getDraft,
    setModalOpenState,
  ]);
  if (!isOpen) return null;

  // Convert database designation objects into CustomDropdown options.
  const allRoleSuggestions = Array.from(
    new Set([
      ...fetchedDesignations.map(
        (designation) => designation.name
      ),
      ...(role ? [role] : []),
    ])
  ).filter(Boolean);

  // Combine project options
  const projectNamesFromProp = Array.isArray(projectsList)
    ? projectsList.map((p) => (typeof p === 'string' ? p : p.name))
    : [];

  const allProjectOptions = Array.from(
    new Set([
      ...DEFAULT_PROJECTS,
      ...projectNamesFromProp,
      ...fetchedProjects,
    ])
  );

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword(mode === 'add' ? 'password123' : '');
    setShowPassword(false);
    setRole('');
    setRoleId('');
    setProject('');
    setGroup('');
    setStatus('Active');
    setWorkMode('Hybrid');
    setAvatarColor('#3b82f6');
    setUserType('employee');
    setError(null);
  };

  const isFormDirty = () => {
    if (mode === 'add') {
      return Boolean(
        name.trim() ||
        email.trim() ||
        role.trim() ||
        project.trim() ||
        group.trim() ||
        (password && password !== 'password123')
      );
    }
    if (mode === 'edit' && employee) {
      return (
        name !== employee.name ||
        email !== employee.email ||
        role !== (employee.role || '') ||
        project !== (employee.Project || '') ||
        status !== (employee.status || 'Active') ||
        workMode !== (employee.workMode || 'Hybrid')
      );
    }
    return false;
  };

  const handleClose = () => {
    if (isFormDirty()) {
      const displayTitle = name.trim()
        ? (mode === 'add' ? `Employee: ${name.trim()}` : `Edit: ${name.trim()}`)
        : (mode === 'add' ? 'Add Employee' : 'Edit Employee');

      saveDraft(draftKey, {
        type: 'employee',
        title: displayTitle,
        subtitle: email.trim() || role.trim() || 'Draft saved',
        data: {
          name,
          email,
          password,
          role,
          roleId,
          project,
          group,
          status,
          workMode,
          avatarColor,
          userType,
          employeeId: employee?._id,
        },
      });
    } else {
      clearDraft(draftKey);
      resetForm();
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !name.trim() ||
      !email.trim() ||
      (mode === "add" && !password.trim()) ||
      !role.trim()
    ) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const updateBody: Record<string, string> = {
        name: name.trim(),
        email: email.trim(),
        role: role.trim(),
        Project: project.trim(),
        status,
        workMode,
        avatarColor,
        userType,
      };

      if (password.trim()) {
        updateBody.password = password.trim();
      }

      if (mode === "add") {
        const response = await fetch("/api/users/employees", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: password.trim(),
            designation: role.trim(),
            group: group || null,
            status,
            workMode,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to create employee");
        }

        const newEmployee = data.data;

        window.dispatchEvent(
          new CustomEvent("employees-updated", {
            detail: newEmployee,
          })
        );

        clearDraft(draftKey);
        resetForm();

        toast.success(`${name.trim()} added successfully`);
        onSuccess?.(newEmployee);
        onClose();

        return;
      } else {
        if (!employee?._id) {
          throw new Error("Employee details are unavailable");
        }

        const payload: Record<string, unknown> = {
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          designation: role.trim(),
          group: group.trim() || null,
          status: status === "Active",
          workMode,
        };

        // Password only update if user entered a new one
        if (password.trim()) {
          payload.password = password.trim();
        }

        const response = await fetch(
          `/api/users/employees?id=${encodeURIComponent(employee._id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to update employee"
          );
        }

        toast.success(
          `${data.data?.full_name || name.trim()} updated successfully`
        );

        clearDraft(draftKey);
        resetForm();

        onSuccess?.(data.data);
        onClose();
      }


    } catch (err: any) {
      setError(err.message || "An error occurred while saving member.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 21000,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    // onClick={handleClose}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '16px 18px',
        }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            {mode === 'add' ? 'Add New Employee' : `Edit ${name} Details`}
          </h3>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && (
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--border-radius-sm)',
                color: '#dc2626',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>
              Full Name *
            </label>
            <div className="custom-input-group">
              <span className="custom-input-addon">
                <User size={14} />
              </span>
              <input
                type="text"

                className="custom-input-control"
                placeholder="Full Name"
                value={name ?? ''}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>
              Email Address *
            </label>
            <div className="custom-input-group">
              <span className="custom-input-addon">
                <Mail size={14} />
              </span>
              <input
                type="email"

                className="custom-input-control"
                placeholder="example@mail.com"
                value={email ?? ''}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Row 1: Password & Access Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>
                {mode === 'add' ? 'Password *' : 'Password'}
              </label>
              <div className="custom-input-group" style={{ position: 'relative' }}>
                <span className="custom-input-addon">
                  <Lock size={14} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="custom-input-control"
                  style={{ paddingRight: '34px' }}
                  value={password ?? ''}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
                    justifyContent: 'center',
                    padding: '2px',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <CustomDropdown
              label="Role *"
              placeholder="Select Role"
              value="employee"
              options={[{ value: 'employee', label: 'Employee' }]}
              onChange={() => { }}
            />
          </div>

          {/* Row 2: Job Title / Role & Default Project */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
            <CustomDropdown
              label="Designation *"
              placeholder="Select Designation"
              value={role ?? ''}
              options={allRoleSuggestions.map((designation) => ({
                value: designation,
                label: designation,
              }))}
              onChange={(val) => setRole(val)}
              actionButton={{
                label: 'Add',
                onClick: () => {
                  setNewRoleName('');
                  setRoleAddError(null);
                  setIsAddRoleModalOpen(true);
                },
              }}
            />

            <CustomDropdown
              label="Default Project"
              placeholder="Select Project"
              value={group ?? ''}
              options={allProjectOptions.map((p) => ({
                value: p,
                label: p,
              }))}
              onChange={(val) => setGroup(val)}
            />
          </div>

          {/* Row 3: Initial Status & Work Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
            <CustomDropdown
              label="Initial Status"
              placeholder="Select Status"
              value={status ?? 'Active'}
              options={[
                { value: 'Active', label: 'Active', badgeText: '•', badgeBg: '#ecfdf5', badgeColor: '#047857' },
                { value: 'Inactive', label: 'Inactive', badgeText: '•', badgeBg: '#f1f5f9', badgeColor: '#475569' },
                { value: 'On Leave', label: 'On Leave', badgeText: '•', badgeBg: '#fffbeb', badgeColor: '#b45309' },
              ]}
              onChange={(val) => setStatus(val)}
            />

            <CustomDropdown
              label="Work Mode"
              placeholder="Select Work Mode"
              value={workMode ?? 'Hybrid'}
              options={[
                { value: 'Hybrid', label: 'Hybrid', badgeText: '•', badgeBg: '#eff6ff', badgeColor: '#1d4ed8' },
                { value: 'Remote', label: 'Remote', badgeText: '•', badgeBg: '#faf5ff', badgeColor: '#7e22ce' },
                { value: 'Onsite', label: 'Onsite', badgeText: '•', badgeBg: '#fff7ed', badgeColor: '#c2410c' },
              ]}
              onChange={(val) => setWorkMode(val)}
            />
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '8px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              // disabled={submitting || !name.trim() || !email.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{mode === 'add' ? 'Creating...' : 'Saving...'}</span>
                </>
              ) : (
                <span>{mode === 'add' ? 'Create Member' : 'Save Changes'}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Small Pop-up Modal to Add New Role */}
      {isAddRoleModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 22000,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={() => setIsAddRoleModalOpen(false)}
        >
          <div
            style={{
              maxWidth: '400px',
              width: '100%',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Add New Designation
              </h4>
              <button
                type="button"
                onClick={() => setIsAddRoleModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '1.2rem',
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {roleAddError && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--border-radius-sm)',
                  color: '#dc2626',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{roleAddError}</span>
              </div>
            )}

            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem', marginBottom: '6px', display: 'block' }}>
                Designation Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="custom-input-group">
                <span className="custom-input-addon">
                  <Briefcase size={14} />
                </span>
                <input
                  type="text"
                  className="custom-input-control"
                  placeholder="e.g. Senior Product Designer"
                  value={newRoleName ?? ''}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateNewRole();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setNewRoleName('');
                  setRoleAddError(null);
                  setIsAddRoleModalOpen(false);
                }}
                disabled={addingRole}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateNewRole}
                disabled={addingRole || !newRoleName.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {addingRole ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <span>Add Designation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
