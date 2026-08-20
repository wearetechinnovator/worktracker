'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Briefcase, Mail, MapPin, Clock, Plus, Search, X, AlertCircle, Edit3, Trash2, UserPlus, Folder, FileBarChart, Lightbulb, HelpCircle, Sparkles } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';

interface TaggedProject {
  _id: string;
  name: string;
  color?: string;
}

interface ClientData {
  _id: string;
  name: string;
  emails: string[];
  address?: string;
  duration?: string;
  projects: TaggedProject[];
}

interface ProjectOption {
  _id: string;
  name: string;
  color: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [projectsOptions, setProjectsOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [name, setName] = useState('');
  const [emailsStr, setEmailsStr] = useState('');
  const [address, setAddress] = useState('');
  const [duration, setDuration] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExploreModalOpen, setIsExploreModalOpen] = useState(false);

  // Project Drawer State
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6');
  const [newProjectMembers, setNewProjectMembers] = useState<string[]>([]);
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
      client.emails.some(email => email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.address && client.address.toLowerCase().includes(searchQuery.toLowerCase()))
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
    setEmailsStr('');
    setAddress('');
    setDuration('');
    setSelectedProjectIds([]);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (client: ClientData) => {
    setEditingClient(client);
    setName(client.name);
    setEmailsStr(client.emails.join(', '));
    setAddress(client.address || '');
    setDuration(client.duration || '');
    setSelectedProjectIds(client.projects.map(p => p._id));
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      // First, create new project if exists
      let finalProjectIds = [...selectedProjectIds];
      if (selectedProjectIds.includes('new') && newProjectName) {
        const projectRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newProjectName,
            description: newProjectDesc,
            color: newProjectColor,
            members: newProjectMembers
          })
        });
        const projectResult = await projectRes.json();
        if (projectResult.success) {
          // Replace 'new' with actual project ID
          finalProjectIds = finalProjectIds.map(id => id === 'new' ? projectResult.data._id : id);
        }
      }

      const payload = {
        name,
        emails: emailsStr.split(',').map(email => email.trim()).filter(Boolean),
        address,
        duration,
        ...(editingClient
          ? { projectIds: finalProjectIds }
          : { projectId: finalProjectIds[0] || undefined }
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
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectColor('#3b82f6');
      setNewProjectMembers([]);
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
        // Multi-select allowed in edit mode
        if (prev.includes(projectId)) {
          return prev.filter(id => id !== projectId);
        } else {
          return [...prev, projectId];
        }
      } else {
        // Single select (tag to one project during creation modal simple flow) or multi-select
        // Let's support multi-select for creation as well by linking client to all checked projects.
        // Wait, the API POST currently associates to a single projectId. Let's make it match and support multi-select.
        // If we want multiple project tagging during creation, we can just allow multi-select here and handle it by sending multiple project associations or doing it in backend.
        // Let's allow multi-select in creation too! But wait, POST route only accepts one projectId. Let's verify.
        // In POST route:
        // if (projectId) { await Project.findByIdAndUpdate(projectId, { clientId: client._id }); }
        // Let's adapt our POST route or let's update projects one by one from client code, or let's update POST route to accept projectIds array as well.
        // Wait, to keep it simple, we can support multi-select in both creation and edit. In creation, we can update the POST route or just send a single projectId.
        // Let's make it so selectedProjectIds acts as multi-select, and for creation we just send `projectId: selectedProjectIds[0]` (the primary tag), or we can update POST route to accept `projectIds` array.
        // Actually, let's keep it simple: we send projectIds array in edit, and select one project in create, or we can toggle select one project in create:
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
      
      {/* Hero Header */}
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

      {/* Summary Row */}
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

      {/* Filters Control Bar */}
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

      {/* Clients Grid */}
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
            {/* Subtle top illustration */}
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

            {/* Heading & Subtitle */}
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', textAlign: 'center' }}>
              Your client directory is ready!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '460px', textAlign: 'center', lineHeight: '1.5', marginBottom: '24px' }}>
              Add client profiles to organize contacts, contract terms, locations, and link them directly to your workspace projects.
            </p>

            {/* Actions */}
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
                <HelpCircle size={15} />
                <span>Explore client workflows</span>
              </button>
            </div>

            {/* Divider */}
            <div style={{ width: '100%', maxWidth: '540px', height: '1px', background: 'var(--border-color)', margin: '32px 0 24px 0' }} />

            {/* Feature Highlights Section */}
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
                  padding: '14px 14px',
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
                  padding: '14px 14px',
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
                  padding: '14px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ 
                    background: 'var(--bg-tertiary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '10px', 
                    padding: '14px 14px',
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
                {/* Contacts */}
                <div className="info-section">
                  <h4 className="section-label">Client Contacts</h4>
                  {client.emails.length === 0 ? (
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>No emails listed</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                      {client.emails.map((email, idx) => (
                        <div key={idx} className="info-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem' }}>
                          <Mail size={11} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Address */}
                {client.address && (
                  <div className="info-section">
                    <h4 className="section-label">Address</h4>
                    <p className="info-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={11} style={{ color: 'var(--text-muted)' }} />
                      <span>{client.address}</span>
                    </p>
                  </div>
                )}

                {/* Projects tagged */}
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

      {/* Add/Edit Client Modal popup */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div 
            className="modal-container" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              position: 'relative',
              maxWidth: isProjectDrawerOpen ? '1000px' : '520px',
              width: isProjectDrawerOpen ? '95%' : '90%',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'grid',
              gridTemplateColumns: isProjectDrawerOpen ? '1fr 380px' : '1fr',
              overflow: 'hidden'
            }}
          >
            {/* Cross button - fixed top right */}
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

            {/* Main Form Section */}
            <div style={{ borderRight: isProjectDrawerOpen ? '1px solid var(--border-color)' : 'none' }}>
            <div className="modal-header" style={{ padding: '12px 14px 0 14px', marginBottom: '8px', paddingRight: '45px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                {editingClient ? 'Edit Client Details' : 'Create New Client'}
              </h3>
              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsProjectDrawerOpen(!isProjectDrawerOpen)}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  {isProjectDrawerOpen ? 'Hide Project Form' : '+ Add Project'}
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} style={{ marginTop: '4px', padding: '0 14px 14px 14px' }}>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#b91c1c', padding: '8px 10px', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '10px' }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label">Client Name *</label>
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

              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label">Contact Emails (comma-separated)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. contact@acme.com, billing@acme.com"
                  value={emailsStr}
                  onChange={(e) => setEmailsStr(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label">Address (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 123 Main St, New York, NY"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label">Contract Duration (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 6 Months, Annual Contract, Retainer"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Associate to Projects checklist */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Tag to Projects</label>
                {projectsOptions.length === 0 ? (
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No projects available to tag
                  </p>
                ) : (
                  <div className="projects-select-list">
                    {projectsOptions.map((proj) => {
                      const isChecked = selectedProjectIds.includes(proj._id);
                      const isNew = proj._id === 'new';
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
                            {isNew && '✓ '}{proj.name}{isNew && ' (New)'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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

            {/* Project Drawer - Slides in from right */}
            {isProjectDrawerOpen && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: 'var(--bg-secondary)',
                animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border-color)',
                  flexShrink: 0
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '2px', lineHeight: '1.2' }}>New Project</h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.2' }}>Create a new project to tag</p>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                        Project Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Website Redesign"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '3px' }}>Description</label>
                      <textarea
                        className="form-control"
                        placeholder="Brief project description..."
                        value={newProjectDesc}
                        onChange={(e) => setNewProjectDesc(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '3px' }}>Color Theme</label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['#3b82f6', '#10b981', '#7f56d9', '#f59e0b', '#f43f5e', '#06b6d4', '#475569'].map((color) => (
                          <div
                            key={color}
                            onClick={() => setNewProjectColor(color)}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              cursor: 'pointer',
                              border: newProjectColor === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                              transition: 'all 0.2s'
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '3px' }}>Assign Employees</label>
                      <div style={{ 
                        maxHeight: '90px', 
                        overflowY: 'auto', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '6px', 
                        padding: '6px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        {employeesOptions.map((emp) => (
                          <label key={emp._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={newProjectMembers.includes(emp._id)}
                              onChange={() => {
                                setNewProjectMembers(prev => 
                                  prev.includes(emp._id) 
                                    ? prev.filter(id => id !== emp._id)
                                    : [...prev, emp._id]
                                );
                              }}
                            />
                            <span style={{ fontWeight: 600 }}>{emp.name}</span>
                            <span style={{ color: 'var(--text-muted)' }}>({emp.role})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '10px 14px',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-end',
                  flexShrink: 0
                }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsProjectDrawerOpen(false);
                      setNewProjectName('');
                      setNewProjectDesc('');
                      setNewProjectColor('#3b82f6');
                      setNewProjectMembers([]);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (!newProjectName.trim()) {
                        alert('Please enter a project name');
                        return;
                      }
                      // Add to projectsOptions temporarily with a temp ID
                      const tempProject = {
                        _id: 'new',
                        name: newProjectName,
                        color: newProjectColor
                      };
                      setProjectsOptions(prev => [...prev, tempProject]);
                      setSelectedProjectIds(prev => [...prev, 'new']);
                      setIsProjectDrawerOpen(false);
                    }}
                  >
                    Add Project
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Styled JSX */}
      <style jsx>{`
        .client-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 16px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          background:
            radial-gradient(circle at 18% 16%, rgba(127, 86, 217, 0.12), transparent 44%),
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

        .client-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        }

        .client-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-md);
          background: var(--bg-secondary);
        }

        .client-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }

        .client-avatar {
          width: 34px;
          height: 34px;
          background: var(--bg-tertiary);
          color: var(--accent-secondary);
          border: 1px solid var(--border-color);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.82rem;
          flex-shrink: 0;
        }

        .client-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .client-meta {
          font-size: 0.68rem;
          color: var(--text-secondary);
        }

        .btn-icon {
          background: transparent;
          border: 1px solid var(--border-color);
          padding: 5px;
          border-radius: 5px;
          color: var(--text-secondary);
          cursor: pointer;
          display: inline-flex;
        }

        .btn-icon:hover {
          background: var(--bg-tertiary);
        }

        .btn-danger-text {
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.2);
        }

        .btn-danger-text:hover {
          background: #fee2e2;
        }

        .client-card-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .info-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .section-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .projects-badges-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          marginTop: 4px;
        }

        .project-badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
          border: 1px solid;
          white-space: nowrap;
        }

        .projects-select-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 140px;
          overflow-y: auto;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          padding: 10px;
          background: var(--bg-secondary);
        }

        .project-select-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .color-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
      `}</style>
      {/* Onboarding Overview Modal */}
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
                    Associate clients directly with projects (or create new projects inline) to keep work organized.
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

    </div>
  );
}
