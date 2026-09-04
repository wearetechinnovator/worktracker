'use client';

import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Loader2, UserPlus, AlertCircle, User, Mail, Lock, Briefcase } from 'lucide-react';
import { CustomDropdown } from '@/components/TaskFormControls';

export interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newEmployee?: any) => void;
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

const DEFAULT_DESIGNATIONS = [
  'UI UX Designer',
  // 'Frontend Developer',
  // 'Backend Developer',
  // 'Full Stack Developer',
  // 'Project Manager',
  // 'QA Engineer',
  // 'DevOps Engineer',
  // 'Marketing Specialist',
  // 'HR Manager',
];

export default function AddTeamMemberModal({
  isOpen,
  onClose,
  onSuccess,
  roleSuggestions,
  projectsList,
}: AddTeamMemberModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('');
  const [roleId, setRoleId] = useState('');
  const [project, setProject] = useState('');
  const [status, setStatus] = useState('Active');
  const [workMode, setWorkMode] = useState('Hybrid');
  const [avatarColor, setAvatarColor] = useState('#3b82f6');

  const [fetchedDesignations, setFetchedDesignations] = useState<string[]>([]);
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
    if (!trimmed) return;
    try {
      setAddingRole(true);
      setRoleAddError(null);

      const res = await fetch('/api/designations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      const designationName = data.success && data.data ? data.data : trimmed;

      setFetchedDesignations((prev) => Array.from(new Set([designationName, ...prev])));
      setRole(designationName);
      setNewRoleName('');
      setIsAddRoleModalOpen(false);
    } catch (err: any) {
      setRoleAddError(err.message || 'Error adding designation');
    } finally {
      setAddingRole(false);
    }
  };

  // Fetch designations and projects dynamically when opened
  useEffect(() => {
    if (!isOpen) return;

    // Fetch designations (pure text job titles, no system access roles)
    fetch('/api/designations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setFetchedDesignations(data.data);
        }
      })
      .catch(() => { });

    fetch('/api/roles')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const employeeRole = data.data.find(
            (item: { _id: string; name: string }) => item.name.toLowerCase() === 'employee'
          );
          if (employeeRole) {
            setRoleId(employeeRole._id);
          }
        }
      })
      .catch(() => { });

    // Fetch projects if available
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const pNames = data.data.map((p: any) => p.name).filter(Boolean);
          setFetchedProjects(pNames);
        }
      })
      .catch(() => { });
  }, [isOpen]);

  if (!isOpen) return null;

  // Combine pure designation options (excluding system access roles like Admin, Employee, Client)
  const allRoleSuggestions = Array.from(
    new Set([
      ...fetchedDesignations,
      ...DEFAULT_DESIGNATIONS,
    ])
  );

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
    setPassword('password123');
    setShowPassword(false);
    setRole('');
    setProject('');
    setStatus('Active');
    setWorkMode('Hybrid');
    setAvatarColor('#3b82f6');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e:any) => {

    e.preventDefault();

    
    if (!name.trim() || !email.trim() || !password.trim() || !role.trim()) {
      setError('Please fill all required fields');

      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password || 'password123',
          userType: 'employee',
          role: role.trim(),
          roleId,
          Project: project.trim(),
          status,
          workMode,
          avatarColor,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create team member');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employees-updated', { detail: data.data }));
      }

      resetForm();
      if (onSuccess) {
        onSuccess(data.data);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating member.');
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
            Add New Employee
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
                value={name}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Row 1: Password & Access Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>
                Password *
              </label>
              <div className="custom-input-group" style={{ position: 'relative' }}>
                <span className="custom-input-addon">
                  <Lock size={14} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="custom-input-control"
                  style={{ paddingRight: '34px' }}
                  value={password}
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
              label="Access Type / Role *"
              placeholder="Select Access Type"
              value="employee"
              options={[{ value: 'employee', label: 'Employee' }]}
              onChange={() => {}}
            />
          </div>

          {/* Row 2: Job Title / Role & Default Project */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
            <CustomDropdown
              label="Job Title / Designation *"
              placeholder="Select Job Title / Role"
              value={role}
              options={allRoleSuggestions.map((r) => ({
                value: r,
                label: r,
              }))}
              onChange={(val) => setRole(val)}
              actionButton={{
                label: 'Add',
                onClick: () => setIsAddRoleModalOpen(true),
              }}
            />

            <CustomDropdown
              label="Default Project"
              placeholder="Select Project"
              value={project}
              options={allProjectOptions.map((p) => ({
                value: p,
                label: p,
              }))}
              onChange={(val) => setProject(val)}
            />
          </div>

          {/* Row 3: Initial Status & Work Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
            <CustomDropdown
              label="Initial Status"
              placeholder="Select Status"
              value={status}
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
              value={workMode}
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
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Member</span>
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
                Add New Job Title / Designation
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
                Job Title / Role Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="custom-input-group">
                <span className="custom-input-addon">
                  <Briefcase size={14} />
                </span>
                <input
                  type="text"
                  className="custom-input-control"
                  placeholder="e.g. Senior Product Designer"
                  value={newRoleName}
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
