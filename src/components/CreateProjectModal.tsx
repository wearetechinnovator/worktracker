'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  FolderPlus,
  Building2,
  Users,
  Check,
  Plus,
  Loader2,
  Search,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import AddTeamMemberModal from '@/components/AddTeamMemberModal';

export interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newProject?: any) => void;
  clientsList?: any[];
  employeesList?: any[];
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
  clientsList: clientsProp,
  employeesList: employeesProp,
}: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor] = useState('#3b82f6');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Popup Employee Creation Modal State
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  // Popup Client Creation Modal State
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmails, setNewClientEmails] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientDuration, setNewClientDuration] = useState('');
  const [submittingClient, setSubmittingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Dropdown UI states
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // Dynamic fetched data
  const [fetchedClients, setFetchedClients] = useState<any[]>([]);
  const [fetchedEmployees, setFetchedEmployees] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Load clients and employees if not provided or when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setError(null);

    // Fetch clients
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setFetchedClients(data.data);
        }
      })
      .catch(() => { });

    // Fetch employees
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setFetchedEmployees(data.data);
        }
      })
      .catch(() => { });
  }, [isOpen]);

  // Handle outside click for custom client dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isCreateClientModalOpen) {
          setIsCreateClientModalOpen(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCreateClientModalOpen]);

  const clients = useMemo(() => {
    if (clientsProp && clientsProp.length > 0) return clientsProp;
    return fetchedClients;
  }, [clientsProp, fetchedClients]);

  const employees = useMemo(() => {
    if (employeesProp && employeesProp.length > 0) return employeesProp;
    return fetchedEmployees;
  }, [employeesProp, fetchedEmployees]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    return clients.filter((c: any) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [clients, clientSearch]);

  const filteredEmployees = useMemo(() => {
    if (!memberSearch.trim()) return employees;
    return employees.filter((emp: any) =>
      emp.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (emp.role && emp.role.toLowerCase().includes(memberSearch.toLowerCase()))
    );
  }, [employees, memberSearch]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c: any) => c._id === selectedClientId);
  }, [clients, selectedClientId]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedClientId('');
    setSelectedMembers([]);
    setIsCreateClientModalOpen(false);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmails('');
    setNewClientAddress('');
    setNewClientDuration('');
    setClientSearch('');
    setMemberSearch('');
    setError(null);
    setClientError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleMember = (empId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleSelectAllMembers = () => {
    if (selectedMembers.length === employees.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(employees.map((e: any) => e._id));
    }
  };

  // Handle Client Creation in Popup Modal
  const handleCreateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      setClientError('Client name is required');
      return;
    }

    try {
      setSubmittingClient(true);
      setClientError(null);

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          emails: newClientEmails.trim(),
          address: newClientAddress.trim(),
          duration: newClientDuration.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create client');
      }

      const createdClient = data.data;
      setFetchedClients((prev) => [createdClient, ...prev]);
      setSelectedClientId(createdClient._id);

      // Reset client fields and close pop up modal
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmails('');
      setNewClientAddress('');
      setNewClientDuration('');
      setIsCreateClientModalOpen(false);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('clients-updated', { detail: createdClient }));
      }
    } catch (err: any) {
      setClientError(err.message || 'Failed to create client.');
    } finally {
      setSubmittingClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a project name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const bodyPayload: any = {
        name: name.trim(),
        description: description.trim(),
        color: selectedColor,
        members: selectedMembers,
      };

      if (selectedClientId) {
        bodyPayload.clientId = selectedClientId;
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create project');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('worktracker-refresh'));
        window.dispatchEvent(new CustomEvent('projects-updated', { detail: data.data }));
      }

      resetForm();
      if (onSuccess) {
        onSuccess(data.data);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating project.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ========================================================================= */}
      {/* MAIN MODAL: CREATE NEW PROJECT */}
      {/* ========================================================================= */}
      <div
        className="modal-overlay"
        style={{
          zIndex: 1300,
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
            maxWidth: '580px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  border: '1.5px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <FolderPlus size={20} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  Create New Project
                </h3>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    margin: '3px 0 0 0',
                  }}
                >
                  Define project details, client association, and assign team members
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              flex: 1,
            }}
          >
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '10px',
                    color: '#dc2626',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Project Name Field */}
              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '8px',
                  }}
                >
                  Project / Project Name
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance, Mobile App"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.86rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Description Field */}
              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Description <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <textarea
                  placeholder="Define scope, milestones, or key project goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.84rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '76px',
                    transition: 'all 0.15s ease',
                    lineHeight: '1.45',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Custom Client Association */}
              <div style={{ position: 'relative' }} ref={clientDropdownRef}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Building2 size={15} color="var(--accent-primary)" />
                    Client Association
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateClientModalOpen(true);
                      setClientError(null);
                    }}
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
                      padding: '2px 4px',
                      borderRadius: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Plus size={13} />
                    <span>Add New Client</span>
                  </button>
                </div>

                <div>
                  {/* Custom Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-primary)',
                      border: isClientDropdownOpen
                        ? '1px solid var(--accent-primary)'
                        : '1px solid var(--border-color)',
                      borderRadius: '10px',
                      fontSize: '0.84rem',
                      color: selectedClient ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      boxShadow: isClientDropdownOpen
                        ? '0 0 0 3px rgba(59, 130, 246, 0.15)'
                        : 'none',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                      minHeight: '42px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      {selectedClient ? (
                        <>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              background: 'var(--status-annual-bg)',
                              color: 'var(--status-annual-text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {selectedClient.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {selectedClient.name}
                          </span>
                          {selectedClient.projects && selectedClient.projects.length > 0 && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                padding: '1px 6px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '4px',
                              }}
                            >
                              {selectedClient.projects.length} project{selectedClient.projects.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Choose Client</span>
                      )}
                    </div>
                    <ChevronDown
                      size={16}
                      style={{
                        transform: isClientDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isClientDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                        zIndex: 100,
                        overflow: 'hidden',
                        animation: 'fadeIn 0.15s ease-out',
                      }}
                    >
                      {/* Search Input */}
                      {clients.length > 4 && (
                        <div
                          style={{
                            padding: '8px 10px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <Search size={14} color="var(--text-muted)" />
                          <input
                            type="text"
                            placeholder="Filter clients..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: '0.78rem',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </div>
                      )}

                      <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                        {/* None Option */}
                        <div
                          onClick={() => {
                            setSelectedClientId('');
                            setIsClientDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            backgroundColor: selectedClientId === '' ? 'var(--bg-tertiary)' : 'transparent',
                            transition: 'background-color 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedClientId !== '') e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                          }}
                          onMouseLeave={(e) => {
                            if (selectedClientId !== '') e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Choose Client (No Association)
                          </span>
                          {selectedClientId === '' && <Check size={14} color="var(--accent-primary)" />}
                        </div>

                        {/* Client Options */}
                        {filteredClients.map((client: any) => {
                          const isSelected = selectedClientId === client._id;
                          return (
                            <div
                              key={client._id}
                              onClick={() => {
                                setSelectedClientId(client._id);
                                setIsClientDropdownOpen(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                                transition: 'background-color 0.1s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '6px',
                                    background: 'var(--status-annual-bg)',
                                    color: 'var(--status-annual-text)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  {client.name.charAt(0).toUpperCase()}
                                </div>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {client.name}
                                </span>
                              </div>
                              {isSelected && <Check size={14} color="var(--accent-primary)" />}
                            </div>
                          );
                        })}

                        {filteredClients.length === 0 && clientSearch && (
                          <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            No clients match "{clientSearch}"
                          </div>
                        )}

                        {/* Add Inline Client Trigger in Dropdown */}
                        <div
                          onClick={() => {
                            setIsCreateClientModalOpen(true);
                            setIsClientDropdownOpen(false);
                            setClientError(null);
                          }}
                          style={{
                            padding: '9px 12px',
                            marginTop: '4px',
                            borderTop: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            color: 'var(--accent-primary)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Plus size={14} />
                          <span>Add New Client...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Assign Team Members (Collapsible / Multi-select) */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Users size={15} color="var(--accent-primary)" />
                    Assign Team Members
                    {selectedMembers.length > 0 && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '1px 7px',
                          borderRadius: '12px',
                          background: 'var(--accent-primary)',
                          color: '#ffffff',
                        }}
                      >
                        {selectedMembers.length}
                      </span>
                    )}
                  </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddMemberModalOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '0 2px',
                    }}
                  >
                    <Plus size={13} />
                    <span>+ Add Employee</span>
                  </button>

                  {employees.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllMembers}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '0 2px',
                      }}
                    >
                      {selectedMembers.length === employees.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                </div>

                {employees.length > 5 && (
                  <div
                    style={{
                      marginBottom: '8px',
                      position: 'relative',
                    }}
                  >
                    <Search
                      size={14}
                      color="var(--text-muted)"
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '0.76rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                {/* Members Selection Area */}
                <div
                  style={{
                    maxHeight: '140px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '8px',
                    background: 'var(--bg-primary)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '6px',
                  }}
                >
                  {filteredEmployees.map((emp: any) => {
                    const isChecked = selectedMembers.includes(emp._id);
                    const avatarColor = emp.avatarColor || '#3b82f6';
                    return (
                      <label
                        key={emp._id}
                        onClick={() => toggleMember(emp._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isChecked ? 'var(--bg-secondary)' : 'transparent',
                          border: isChecked
                            ? '1px solid var(--accent-primary)40'
                            : '1px solid transparent',
                          boxShadow: isChecked ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: isChecked ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            backgroundColor: isChecked ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isChecked && <Check size={11} color="#ffffff" strokeWidth={3} />}
                        </div>

                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: `${avatarColor}20`,
                            color: avatarColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {emp.name.charAt(0).toUpperCase()}
                        </div>

                        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {emp.name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: 'var(--text-muted)',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {emp.role || 'Member'}
                          </span>
                        </div>
                      </label>
                    );
                  })}

                  {filteredEmployees.length === 0 && (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        padding: '12px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                      }}
                    >
                      No members available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={submitting}
                style={{
                  padding: '9px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !name.trim()}
                style={{
                  padding: '9px 22px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: submitting || !name.trim() ? 'not-allowed' : 'pointer',
                  opacity: submitting || !name.trim() ? 0.7 : 1,
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Creating Project...</span>
                  </>
                ) : (
                  <span>Create Project</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POPUP OVERLAY MODAL: CREATE NEW CLIENT */}
      {/* ========================================================================= */}
      {isCreateClientModalOpen && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 1400,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => {
            setIsCreateClientModalOpen(false);
            setClientError(null);
          }}
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '500px',
              width: '100%',
              borderRadius: '16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
            }}
          >
            {/* Popup Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Building2 size={18} />
                </div>
                <div>
                  <h4
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    Create New Client
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Fill in client company & contact details
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsCreateClientModalOpen(false);
                  setClientError(null);
                }}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Popup Modal Form */}
            <form onSubmit={handleCreateClientSubmit} style={{ padding: '20px 24px', display: 'grid', gap: '14px' }}>
              {clientError && (
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '0.76rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{clientError}</span>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '5px', color: 'var(--text-primary)' }}>
                  Client / Company Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +1 555-0199"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: '0.82rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>
                    Contract Duration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 6 Months"
                    value={newClientDuration}
                    onChange={(e) => setNewClientDuration(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: '0.82rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>
                  Contact Email(s)
                </label>
                <input
                  type="text"
                  placeholder="e.g. contact@acme.com, billing@acme.com"
                  value={newClientEmails}
                  onChange={(e) => setNewClientEmails(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>
                  Address / Location
                </label>
                <textarea
                  placeholder="e.g. 123 Main St, San Francisco, CA"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Popup Modal Footer Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '10px',
                  paddingTop: '14px',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsCreateClientModalOpen(false);
                    setClientError(null);
                  }}
                  disabled={submittingClient}
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingClient || !newClientName.trim()}
                  style={{
                    padding: '8px 20px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {submittingClient ? (
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
      )}
      {/* ========================================================================= */}
      {/* POPUP OVERLAY MODAL: ADD NEW TEAM MEMBER */}
      {/* ========================================================================= */}
      <AddTeamMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSuccess={(newEmp) => {
          if (newEmp) {
            setFetchedEmployees((prev) => [newEmp, ...prev]);
            if (newEmp._id) {
              setSelectedMembers((prev) => Array.from(new Set([...prev, newEmp._id])));
            }
          }
          setIsAddMemberModalOpen(false);
        }}
      />
    </>
  );
}
