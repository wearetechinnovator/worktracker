'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  Clock,
  MapPin,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Contact,
} from 'lucide-react';
import CreateProjectModal from '@/components/CreateProjectModal';
import { CustomDatePicker, CustomTimePicker } from '@/components/TaskFormControls';

export interface ClientContact {
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
}

export interface ProjectOption {
  _id: string;
  name: string;
  color?: string;
}

export interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newClient?: any) => void;
  projectsOptions?: ProjectOption[];
}

export default function CreateClientModal({
  isOpen,
  onClose,
  onSuccess,
  projectsOptions: externalProjects,
}: CreateClientModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailsStr, setEmailsStr] = useState('');
  const [address, setAddress] = useState('');
  const [durationDate, setDurationDate] = useState('');
  const [durationTime, setDurationTime] = useState('');
  const [contacts, setContacts] = useState<
    Array<{ name: string; email: string; phone: string; designation: string }>
  >([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [fetchedProjects, setFetchedProjects] = useState<ProjectOption[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Fetch projects list if not supplied via props
  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setFetchedProjects(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch projects in CreateClientModal:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchProjects();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const availableProjects = externalProjects || fetchedProjects;

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmailsStr('');
    setAddress('');
    setDurationDate('');
    setDurationTime('');
    setContacts([]);
    setSelectedProjectIds([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddContact = () => {
    setContacts((prev) => [
      ...prev,
      { name: '', email: '', phone: '', designation: '' },
    ]);
  };

  const handleRemoveContact = (index: number) => {
    setContacts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleContactChange = (
    index: number,
    field: 'name' | 'email' | 'phone' | 'designation',
    val: string
  ) => {
    setContacts((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, [field]: val } : c))
    );
  };

  const handleProjectToggle = (projId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projId) ? prev.filter((id) => id !== projId) : [...prev, projId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Client / Company Name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const parsedEmails = emailsStr
        .split(',')
        .map((em) => em.trim())
        .filter(Boolean);

      const validContacts = contacts.filter(
        (c) => c.name.trim() || c.email.trim() || c.phone.trim() || c.designation.trim()
      );

      const contractDurationText = [durationDate, durationTime].filter(Boolean).join(' ');

      const bodyPayload = {
        name: name.trim(),
        phone: phone.trim(),
        emails: parsedEmails,
        address: address.trim(),
        duration: contractDurationText,
        contacts: validContacts,
        projects: selectedProjectIds,
      };

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create client');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('worktracker-refresh'));
        window.dispatchEvent(new CustomEvent('clients-updated', { detail: data.data }));
      }

      resetForm();
      if (onSuccess) {
        onSuccess(data.data);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating client.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="modal-overlay"
        style={{
          zIndex: 1350,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={handleClose}
      >
        <div
          className="modal-container"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            padding: '16px 18px',
          }}
        >
          {/* Modal Header */}
          <div className="modal-header">
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                margin: 0,
                color: 'var(--text-primary)',
              }}
            >
              Create New Client
            </h3>
            <button className="modal-close" onClick={handleClose}>
              &times;
            </button>
          </div>

          {/* Form Body */}
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
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

            {/* Row 1: Name & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label
                  className="form-label"
                  style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}
                >
                  Client / Company Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="custom-input-group">
                  <span className="custom-input-addon">
                    <Building2 size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    className="custom-input-control"
                    placeholder="e.g. Acme Corporation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label
                  className="form-label"
                  style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}
                >
                  Primary Phone Number
                </label>
                <div className="custom-input-group">
                  <span className="custom-input-addon">
                    <Phone size={14} />
                  </span>
                  <input
                    type="tel"
                    className="custom-input-control"
                    placeholder="e.g. +1 (555) 234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Emails & Contract Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label
                  className="form-label"
                  style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}
                >
                  General Emails (comma-separated)
                </label>
                <div className="custom-input-group">
                  <span className="custom-input-addon">
                    <Mail size={14} />
                  </span>
                  <input
                    type="text"
                    className="custom-input-control"
                    placeholder="e.g. contact@acme.com, info@acme.com"
                    value={emailsStr}
                    onChange={(e) => setEmailsStr(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

            {/* Row 2: Contract Date & Time Picker */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
              <CustomDatePicker
                label="Contract Expiry Date"
                placeholder="Select Date"
                value={durationDate}
                onChange={(val) => setDurationDate(val)}
              />

              <CustomTimePicker
                label="Contract Expiry Time"
                placeholder="Select Time"
                value={durationTime}
                onChange={(val) => setDurationTime(val)}
                align="right"
              />
            </div>
            </div>

            {/* Address */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}
              >
                Address (Optional)
              </label>
              <div className="custom-input-group">
                <span className="custom-input-addon">
                  <MapPin size={14} />
                </span>
                <input
                  type="text"
                  className="custom-input-control"
                  placeholder="e.g. 123 Main St, Suite 400, New York, NY"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Section: Client Contact Persons */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)',
                padding: '12px',
                background: 'var(--bg-tertiary)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <div>
                  <label
                    className="form-label"
                    style={{
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Contact size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span>Client Contact Persons</span>
                  </label>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0 }}>
                    Add key stakeholders, managers, or billing contacts for this client
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddContact}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={12} />
                  <span>Add Contact</span>
                </button>
              </div>

              {contacts.length === 0 ? (
                <div
                  onClick={handleAddContact}
                  style={{
                    border: '1.5px dashed var(--border-color)',
                    borderRadius: '6px',
                    padding: '10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    fontSize: '0.74rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                >
                  <Plus
                    size={14}
                    style={{ margin: '0 auto 4px auto', display: 'block', color: 'var(--accent-primary)' }}
                  />
                  <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    + Click to add contact person
                  </span>{' '}
                  (e.g. Lead, PM, Billing)
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    paddingRight: '2px',
                  }}
                >
                  {contacts.map((contact, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          Contact #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Remove contact"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ height: '32px', fontSize: '0.75rem' }}
                          placeholder="Full Name *"
                          value={contact.name}
                          onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-control"
                          style={{ height: '32px', fontSize: '0.75rem' }}
                          placeholder="Role (e.g. PM, CTO)"
                          value={contact.designation}
                          onChange={(e) => handleContactChange(idx, 'designation', e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input
                          type="email"
                          className="form-control"
                          style={{ height: '32px', fontSize: '0.75rem' }}
                          placeholder="Direct Email"
                          value={contact.email}
                          onChange={(e) => handleContactChange(idx, 'email', e.target.value)}
                        />
                        <input
                          type="tel"
                          className="form-control"
                          style={{ height: '32px', fontSize: '0.75rem' }}
                          placeholder="Phone Number"
                          value={contact.phone}
                          onChange={(e) => handleContactChange(idx, 'phone', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tag to Projects Section */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: 0 }}>
                  Tag to Projects
                </label>
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0 2px',
                  }}
                >
                  <Plus size={13} />
                  <span>Add Project</span>
                </button>
              </div>

              {availableProjects.length === 0 ? (
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                  No projects available to tag
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    maxHeight: '130px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-sm)',
                    padding: '8px 10px',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  {availableProjects.map((proj) => {
                    const isChecked = selectedProjectIds.includes(proj._id);
                    return (
                      <label
                        key={proj._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          padding: '3px 4px',
                          borderRadius: '4px',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleProjectToggle(proj._id)}
                          disabled={submitting}
                        />
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: proj.color || '#3b82f6',
                          }}
                        />
                        <span style={{ fontWeight: isChecked ? 700 : 400 }}>{proj.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
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
                disabled={submitting || !name.trim()}
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
                  <span>Create Client</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Create Project Modal Popup */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={(newProj) => {
          fetchProjects();
          if (newProj?._id) {
            setSelectedProjectIds((prev) => Array.from(new Set([...prev, newProj._id])));
          }
          setIsProjectModalOpen(false);
        }}
      />
    </>
  );
}
