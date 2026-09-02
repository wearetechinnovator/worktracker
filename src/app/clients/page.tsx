'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Briefcase, Mail, Phone, MapPin, Clock, Plus, Search, X, AlertCircle, Edit3, Trash2, UserPlus, FileBarChart, Sparkles, Contact } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import CreateProjectModal from '@/components/CreateProjectModal';
import type { ClientData } from '../../types/ClientData';
import type { ProjectOption } from '../../types/ProjectOption';
import './style.css';

export default function ClientsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [projectsOptions, setProjectsOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailsStr, setEmailsStr] = useState('');
  const [address, setAddress] = useState('');
  const [duration, setDuration] = useState('');
  const [contacts, setContacts] = useState<Array<{ name: string; email: string; phone: string; designation: string }>>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExploreModalOpen, setIsExploreModalOpen] = useState(false);
  const [employeesOptions, setEmployeesOptions] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('worktracker_user');
    if (!storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [clientsRes, projectsRes, employeesRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/projects'),
        fetch('/api/employees')
      ]);
      const clientsResult = await clientsRes.json();
      const projectsResult = await projectsRes.json();
      const employeesResult = await employeesRes.json();

      if (clientsResult.success) {
        setClients(clientsResult.data);
      }
      if (projectsResult.success) {
        setProjectsOptions(projectsResult.data);
      }
      if (employeesResult.success) {
        setEmployeesOptions(employeesResult.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const filteredClients = useMemo(() => {
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.phone && client.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      client.emails.some(email => email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.address && client.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.contacts && client.contacts.some(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.designation && c.designation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.toLowerCase().includes(searchQuery.toLowerCase()))
      ))
    );
  }, [clients, searchQuery]);

  const totalClientsCount = clients.length;
  const totalProjectsTagged = useMemo(() => {
    return clients.reduce((sum, client) => sum + client.projects.length, 0);
  }, [clients]);

  const isAdmin = user?.userType === 'admin';

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setEmailsStr('');
    setAddress('');
    setDuration('');
    setContacts([]);
    setSelectedProjectIds([]);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (client: ClientData) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone || '');
    setEmailsStr(client.emails.join(', '));
    setAddress(client.address || '');
    setDuration(client.duration || '');
    setContacts(
      client.contacts && client.contacts.length > 0
        ? client.contacts.map(c => ({
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            designation: c.designation || '',
          }))
        : []
    );
    setSelectedProjectIds(client.projects.map(p => p._id));
    setError(null);
    setShowModal(true);
  };

  const handleAddContact = () => {
    setContacts(prev => [...prev, { name: '', designation: '', email: '', phone: '' }]);
  };

  const handleContactChange = (index: number, field: string, value: string) => {
    setContacts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name,
        phone: phone.trim() || undefined,
        emails: emailsStr.split(',').map(email => email.trim()).filter(Boolean),
        address,
        duration,
        contacts: contacts.filter(c => c.name.trim() || c.email.trim() || c.phone.trim() || c.designation.trim()),
        ...(editingClient
          ? { projectIds: selectedProjectIds }
          : { projectId: selectedProjectIds[0] || undefined }
        )
      };

      const url = editingClient ? `/api/clients/${editingClient._id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save client details');
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? All associated project tags will be cleared.')) return;

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete client');
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || String(err));
    }
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjectIds(prev => {
      if (editingClient) {
        if (prev.includes(projectId)) {
          return prev.filter(id => id !== projectId);
        } else {
          return [...prev, projectId];
        }
      } else {
        if (prev.includes(projectId)) {
          return prev.filter(id => id !== projectId);
        } else {
          return [...prev, projectId];
        }
      }
    });
  };

  if (loading && clients.length === 0) {
    return <PageShimmer variant="dashboard" />;
  }

  return (
    <div style={{ display: 'grid', gap: '14px', paddingBottom: '30px' }}>
      
      <section className="client-hero">
        <div>
          <p className="hero-eyebrow">Workspace Configuration</p>
          <h1 className="hero-title">Clients Directory</h1>
          <p className="hero-copy">
            Manage clients, contact emails, addresses, project durations, and assign clients to ongoing active workspace projects.
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" type="button" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} />
            <span>Add Client</span>
          </button>
        )}
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <div className="summary-icon"><Users size={14} /></div>
          <p className="summary-label">Total Registered Clients</p>
          <p className="summary-value">{totalClientsCount}</p>
        </article>
        <article className="summary-card">
          <div className="summary-icon"><Briefcase size={14} /></div>
          <p className="summary-label">Active Project Associations</p>
          <p className="summary-value">{totalProjectsTagged}</p>
        </article>
      </section>

      <section className="control-bar card">
        <label className="search-box" htmlFor="client-search" style={{ width: '100%' }}>
          <Search size={14} />
          <input
            id="client-search"
            type="text"
            placeholder="Search clients by name, email domain, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
      </section>

      <section className="client-grid">
        {clients.length === 0 ? (
          <div className="card" style={{ 
            gridColumn: '1 / -1',
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '48px 32px', 
            minHeight: '460px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)'
            }}>
              <UserPlus size={34} style={{ color: 'var(--accent-primary)' }} />
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textAlign: 'center' }}>
              Your client directory is ready!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '460px', textAlign: 'center', lineHeight: '1.5', marginBottom: '24px' }}>
              Add client profiles to organize contacts, contract terms, locations, and link them directly to your workspace projects.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {isAdmin ? (
                <button 
                  className="btn btn-primary" 
                  onClick={openAddModal}
                  style={{ padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px' }}
                >
                  <Plus size={16} />
                  <span>Add your first client</span>
                </button>
              ) : (
                <button 
                  className="btn btn-primary" 
                  disabled 
                  title="Only admins can add clients"
                  style={{ padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', opacity: 0.6 }}
                >
                  <Plus size={16} />
                  <span>Add your first client</span>
                </button>
              )}
              <button 
                className="btn btn-secondary" 
                onClick={() => setIsExploreModalOpen(true)}
                style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
              >
                <span>Explore client workflows</span>
              </button>
            </div>

            <div style={{ width: '100%', maxWidth: '540px', height: '1px', background: 'var(--border-color)', margin: '32px 0 24px 0' }} />

            <div style={{ width: '100%', maxWidth: '640px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '14px', textAlign: 'center' }}>
                What you can do with clients
              </h4>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '12px' 
              }}>
                <div style={{ 
                  background: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px', 
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '6px', 
                    background: '#eff6ff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '8px',
                    color: '#3b82f6'
                  }}>
                    <Mail size={16} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                    Organize contacts
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                    Store email addresses, locations, and contract durations.
                  </span>
                </div>

                <div style={{ 
                  background: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px', 
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '6px', 
                    background: '#ecfdf5', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '8px',
                    color: '#10b981'
                  }}>
                    <Briefcase size={16} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                    Tag to projects
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                    Link clients directly to active workspace projects.
                  </span>
                </div>

                <div style={{ 
                  background: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px', 
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '6px', 
                    background: '#f3e8ff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '8px',
                    color: '#7f56d9'
                  }}>
                    <FileBarChart size={16} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                    Track activity
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                    View active project associations and client work entries.
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="card empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No clients match the current search query.</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <article key={client._id} className="card client-card">
              <div className="client-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="client-avatar">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="client-title">{client.name}</h3>
                    {client.duration && (
                      <p className="client-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Clock size={11} />
                        <span>Contract: {client.duration}</span>
                      </p>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-icon" onClick={() => openEditModal(client)} title="Edit Client details">
                      <Edit3 size={12} />
                    </button>
                    <button className="btn btn-icon btn-danger-text" onClick={() => handleDelete(client._id)} title="Delete Client">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div className="client-card-body">
                <div className="info-section">
                  <h4 className="section-label">Contact Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                    {client.phone && (
                      <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem' }}>
                        <Phone size={11} style={{ color: 'var(--accent-primary)' }} />
                        <a href={`tel:${client.phone}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                          {client.phone}
                        </a>
                      </div>
                    )}
                    {client.emails.length === 0 && !client.phone ? (
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>No primary contact info</p>
                    ) : (
                      client.emails.map((email, idx) => (
                        <div key={idx} className="info-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem' }}>
                          <Mail size={11} style={{ color: 'var(--text-muted)' }} />
                          <a href={`mailto:${email}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                            {email}
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {client.contacts && client.contacts.length > 0 && (
                  <div className="info-section">
                    <h4 className="section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Contact Persons ({client.contacts.length})</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                      {client.contacts.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          style={{
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '0.72rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</span>
                            {c.designation && (
                              <span style={{
                                fontSize: '0.65rem',
                                padding: '1px 6px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: 'var(--accent-primary)',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}>
                                {c.designation}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                            {c.phone && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Phone size={10} /> {c.phone}
                              </span>
                            )}
                            {c.email && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Mail size={10} /> {c.email}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {client.address && (
                  <div className="info-section">
                    <h4 className="section-label">Address</h4>
                    <p className="info-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={11} style={{ color: 'var(--text-muted)' }} />
                      <span>{client.address}</span>
                    </p>
                  </div>
                )}

                <div className="info-section">
                  <h4 className="section-label">Associated Projects</h4>
                  {client.projects.length === 0 ? (
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                      No active projects assigned
                    </p>
                  ) : (
                    <div className="projects-badges-list">
                      {client.projects.map((project) => (
                        <span
                          key={project._id}
                          className="project-badge"
                          style={{
                            background: `${project.color || '#3b82f6'}15`,
                            color: project.color || '#3b82f6',
                            borderColor: `${project.color || '#3b82f6'}30`
                          }}
                        >
                          {project.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div 
            className="modal-container" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              position: 'relative',
              maxWidth: '540px',
              width: '90%',
              height: 'min(640px, 85vh)',
              maxHeight: '85vh',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <button 
              className="modal-close" 
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '14px',
                zIndex: 10
              }}
            >
              &times;
            </button>

            <div className="modal-header" style={{ padding: '14px 16px 10px 16px', marginBottom: 0, paddingRight: '45px', flexShrink: 0, borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                {editingClient ? 'Edit Client Details' : 'Create New Client'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#b91c1c', padding: '8px 10px', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '10px' }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Client / Company Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Primary Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. +1 (555) 234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">General Emails (comma-separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. contact@acme.com, info@acme.com"
                    value={emailsStr}
                    onChange={(e) => setEmailsStr(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Contract Duration (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 6 Months, Annual Retainer"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Address (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 123 Main St, Suite 400, New York, NY"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div style={{
                marginBottom: '14px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)',
                padding: '12px',
                background: 'var(--bg-tertiary)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 800, fontSize: '0.78rem', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                    style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
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
                      padding: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-muted)',
                      fontSize: '0.74rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Plus size={14} style={{ margin: '0 auto 4px auto', display: 'block', color: 'var(--accent-primary)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>+ Click to add contact person</span> (e.g. Lead, PM, Billing)
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '2px' }}>
                    {contacts.map((contact, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '10px',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
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
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                          <div>
                            <input
                              type="text"
                              className="form-control"
                              style={{ height: '32px', fontSize: '0.75rem' }}
                              placeholder="Full Name *"
                              value={contact.name}
                              onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              className="form-control"
                              style={{ height: '32px', fontSize: '0.75rem' }}
                              placeholder="Designation / Role"
                              value={contact.designation}
                              onChange={(e) => handleContactChange(idx, 'designation', e.target.value)}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <input
                              type="email"
                              className="form-control"
                              style={{ height: '32px', fontSize: '0.75rem' }}
                              placeholder="Direct Email"
                              value={contact.email}
                              onChange={(e) => handleContactChange(idx, 'email', e.target.value)}
                            />
                          </div>
                          <div>
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
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Tag to Projects</label>
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
                      gap: '3px',
                      padding: '0 2px',
                    }}
                  >
                    <Plus size={13} />
                    <span>Add Project</span>
                  </button>
                </div>
                {projectsOptions.length === 0 ? (
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No projects available to tag
                  </p>
                ) : (
                  <div className="projects-select-list">
                    {projectsOptions.map((proj) => {
                      const isChecked = selectedProjectIds.includes(proj._id);
                      return (
                        <label key={proj._id} className="project-select-row">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleProjectToggle(proj._id)}
                            disabled={submitting}
                          />
                          <span
                            className="color-dot"
                            style={{ backgroundColor: proj.color }}
                          />
                          <span style={{ fontWeight: isChecked ? 700 : 400 }}>
                            {proj.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--border-color)', flexShrink: 0, background: 'var(--bg-secondary)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {isExploreModalOpen && (
        <div className="modal-overlay" onClick={() => setIsExploreModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '20px 24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>How Client Profiles Work</h3>
              </div>
              <button className="modal-close" onClick={() => setIsExploreModalOpen(false)}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add Client Details</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                    Enter client name, billing/contact email addresses, primary physical address, and contract terms.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Tag Active Projects</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                    Associate clients directly with projects or create new projects using the inline project modal.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Monitor & Manage</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                    Quickly inspect associated projects, edit contract info, or update emails from the directory dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setIsExploreModalOpen(false);
                  if (isAdmin) {
                    openAddModal();
                  }
                }}
              >
                {isAdmin ? 'Add First Client' : 'Got it!'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        employeesList={employeesOptions}
        clientsList={clients}
        hideClientField={true}
        onSuccess={(newProject) => {
          fetchData();
          if (newProject?._id) {
            setSelectedProjectIds((prev) => Array.from(new Set([...prev, newProject._id])));
          }
          setIsProjectModalOpen(false);
        }}
      />
    </div>
  );
}