'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Briefcase, Mail, Phone, MapPin, Clock, Calendar, Plus, Search, X, AlertCircle, Edit3, Edit2, Check, Trash2, UserPlus, FileBarChart, Sparkles, Contact } from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import CreateClientModal from '@/components/CreateClientModal';
import CreateProjectModal from '@/components/CreateProjectModal';
import { CustomDatePicker } from '@/components/TaskFormControls';
import { toast } from '@/lib/toast';
import {
  getClients,
  deleteClient,
  updateClient,
  createClient,
} from "@/lib/clientApi";
import { sanitizeNumericInput } from '@/lib/inputValidation';

import './style.css';
import { ClientData } from '@/types/ClientData';
import { ProjectOption } from '@/types/ProjectOption';

// ---------------------------------------------------------------------------
// Small, deterministic color system for avatars / initials.
// Same name always maps to the same pair, so a client or contact keeps a
// stable identity color across renders, table + modal.
// ---------------------------------------------------------------------------
const AVATAR_PALETTE = [
  { bg: '#EEF2FF', fg: '#4F46E5', ring: '#C7D2FE' }, // indigo
  { bg: '#ECFDF5', fg: '#059669', ring: '#A7F3D0' }, // emerald
  { bg: '#FFF7ED', fg: '#EA580C', ring: '#FED7AA' }, // orange
  { bg: '#FDF2F8', fg: '#DB2777', ring: '#FBCFE8' }, // pink
  { bg: '#F0F9FF', fg: '#0284C7', ring: '#BAE6FD' }, // sky
  { bg: '#FEFCE8', fg: '#CA8A04', ring: '#FDE68A' }, // amber
  { bg: '#F5F3FF', fg: '#7C3AED', ring: '#DDD6FE' }, // violet
];

function getIdentityStyle(seed: string) {
  const str = seed || '?';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ClientsPage() {
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [projectsOptions, setProjectsOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailsStr, setEmailsStr] = useState('');
  const [address, setAddress] = useState('');
  const [duration, setDuration] = useState('');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [contacts, setContacts] = useState<Array<{ name: string; email: string; phone: string; designation: string; label?: string }>>([]);
  const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExploreModalOpen, setIsExploreModalOpen] = useState(false);
  const [employeesOptions, setEmployeesOptions] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok || !result.success || !result.user) {
          return;
        }

        if (!mounted) return;

        setUser({
          ...result.user,
          name: result.user.full_name ?? result.user.name ?? 'User',
          userType:
            Number(result.user.user_role) === 1
              ? 'admin'
              : 'employee',
        });
      } catch (error) {
        console.error('Failed to load current user:', error);
      }
    };

    loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [clientsRes, projectResponse] =
        await Promise.all([
          getClients(),
          fetch("/api/projects", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
        ]);

      const clientsData = clientsRes.success && Array.isArray(clientsRes.data)
        ? clientsRes.data
        : [];

      if (!clientsRes.success && clientsRes.message) {
        toast.error(clientsRes.message);
      }

      const projectResult = await projectResponse.json();

      if (!projectResponse.ok || projectResult.success === false) {
        throw new Error(
          projectResult.message || "Failed to load projects"
        );
      }

      const projectsData = Array.isArray(projectResult.data)
        ? projectResult.data
        : Array.isArray(projectResult.data?.projects)
          ? projectResult.data.projects
          : Array.isArray(projectResult.projects)
            ? projectResult.projects
            : [];

      const normalizedClients = clientsData.map(
        (client: any) => ({
          ...client,

          // UI currently expects _id
          _id: String(client.id ?? client._id),

          // DB field -> UI field
          emails: Array.isArray(client.email)
            ? client.email
            : [],

          contacts: Array.isArray(
            client.contact_members
          )
            ? client.contact_members
            : [],

          // Primary phone is stored inside
          // contact_members because DB schema
          // has no separate phone field.
          phone:
            client.phone ||
            client.contact_members?.find(
              (contact: any) =>
                contact.label === "Primary"
            )?.phone ||
            client.contact_members?.find(
              (contact: any) => contact.phone
            )?.phone ||
            "",

          contractStartDate:
            client.contractStartDate ||
            (client.contract_start_date
              ? String(client.contract_start_date).split('T')[0]
              : ''),
          contractEndDate:
            client.contractEndDate ||
            (client.contract_end_date
              ? String(client.contract_end_date).split('T')[0]
              : ''),
        })
      );

      setClients(normalizedClients);

      const normalizedProjects: ProjectOption[] = projectsData
        .map((project: any) => {
          const id =
            project?._id ??
            project?.id ??
            project?.project_id;

          const name =
            project?.name ??
            project?.project_name ??
            project?.title;

          if (!id || !name) return null;

          return {
            _id: String(id),
            name: String(name),
            color: project?.color || "#3b82f6",
          };
        })
        .filter(Boolean) as ProjectOption[];

      setProjectsOptions(normalizedProjects);
    } catch (err) {
      console.error("CLIENT FETCH ERROR:", err);

      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to load clients"
      );
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
      (client.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.phone && client.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (Array.isArray(client.emails) && client.emails.some(email => (email || '').toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (client.address && client.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.contacts && client.contacts.some(c =>
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.designation && c.designation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.toLowerCase().includes(searchQuery.toLowerCase()))
      ))
    );
  }, [clients, searchQuery]);

  const totalClientsCount = clients.length;
  const totalProjectsTagged = useMemo(() => {
    return clients.reduce((sum, client) => sum + (Array.isArray(client.projects) ? client.projects.length : 0), 0);
  }, [clients]);

  const isAdmin = Number(user?.user_role) === 1;

  const openAddModal = () => {
    setIsCreateClientModalOpen(true);
  };

  const openEditModal = (client: ClientData) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone || '');
    setEmailsStr(client.emails.join(', '));
    setAddress(client.address || '');
    setDuration(client.duration || '');
    setContractStartDate(client.contractStartDate || '');
    setContractEndDate(client.contractEndDate || '');
    setContacts(
      client.contacts && client.contacts.length > 0
        ? client.contacts.map(c => ({
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          designation: c.designation || '',
          label: c.label || '',
        }))
        : []
    );
    setSelectedProjectIds(
      (client.projects || [])
        .map((p: any) =>
          String(typeof p === 'object' ? p?._id ?? p?.id ?? '' : p)
        )
        .filter(Boolean)
    );
    setError(null);
    setShowModal(true);
  };

  const handleAddContact = () => {
    setContacts(prev => [...prev, { name: '', designation: '', email: '', phone: '', label: '' }]);
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
    if (editingLabelIndex === index) {
      setEditingLabelIndex(null);
    }
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const emails = emailsStr
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (!name.trim()) {
      setError("Client name is required");
      return;
    }

    if (!phone.trim()) {
      setError("Primary phone number is required");
      return;
    }

    if (!/^\d{10,20}$/.test(phone.trim())) {
      setError("Phone number must contain only numbers and be 10-20 digits long");
      return;
    }

    if (emails.length === 0) {
      setError("At least one valid email address is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const validContacts = contacts.filter(
        (contact) =>
          contact.name.trim() ||
          contact.email.trim() ||
          contact.phone.trim() ||
          contact.designation.trim() ||
          contact.label?.trim()
      );

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        emails,
        address: address.trim(),
        contacts: validContacts,
        projects: selectedProjectIds,
        duration: duration.trim(),
        contract_start_date: contractStartDate || null,
        contract_end_date: contractEndDate || null,
        status: 1,
      };

      let res;

      if (editingClient) {
        res = await updateClient(
          editingClient._id,
          payload
        );

        if (!res.success) {
          const errMsg = res.message || "Failed to update client";
          setError(errMsg);
          toast.error(errMsg);
          setSubmitting(false);
          return;
        }

        toast.success(
          `${name.trim()} updated successfully`
        );
      } else {
        res = await createClient(payload);

        if (!res.success) {
          const errMsg = res.message || "Failed to create client";
          setError(errMsg);
          toast.error(errMsg);
          setSubmitting(false);
          return;
        }

        toast.success(
          `${name.trim()} created successfully`
        );
      }

      await fetchData();

      setShowModal(false);
      setEditingClient(null);

      setName("");
      setPhone("");
      setEmailsStr("");
      setAddress("");
      setDuration("");
      setContractStartDate("");
      setContractEndDate("");
      setContacts([]);
      setSelectedProjectIds([]);
    } catch (err: any) {
      console.error("Save client error:", err);

      setError(
        err?.message ||
        "Failed to save client"
      );
    } finally {
      setSubmitting(false);
    }
  };
  const handleDelete = async (clientId: string) => {
    const client = clients.find(
      (c) => c._id === clientId
    );

    const clientName = client?.name || "Client";

    if (
      !confirm(
        `Are you sure you want to delete ${clientName}?`
      )
    ) {
      return;
    }

    try {
      const res = await deleteClient(clientId);

      if (!res.success) {
        toast.error(res.message || "Failed to delete client");
        return;
      }

      toast.success(
        `${clientName} deleted successfully`
      );

      await fetchData();
    } catch (err: any) {
      toast.error(
        err?.message || "Failed to delete client"
      );
    }
  };
  const handleProjectToggle = (projectId: string) => {
    setSelectedProjectIds(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };

  if (loading && clients.length === 0) {
    return <PageShimmer variant="dashboard" />;
  }

  return (
    <div className="client-page" style={{ display: 'grid', gap: '16px', paddingBottom: '30px' }}>

      <section className="client-hero">
        <div>
          <h1 className="hero-title">Clients Directory</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Every client relationship, contract, and point of contact in one place.
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
          <div className="summary-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}><Users size={14} /></div>
          <p className="summary-label">Total Registered Clients</p>
          <p className="summary-value">{totalClientsCount}</p>
        </article>
        <article className="summary-card">
          <div className="summary-icon" style={{ background: '#ECFDF5', color: '#059669' }}><Briefcase size={14} /></div>
          <p className="summary-label">Active Project Associations</p>
          <p className="summary-value">{totalProjectsTagged}</p>
        </article>
      </section>

      <section className="control-bar card" style={{ padding: '10px 14px' }}>
        <label className="search-box" htmlFor="client-search" style={{ width: '100%', position: 'relative' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            id="client-search"
            type="text"
            placeholder="Search by client name, contact, email, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingRight: searchQuery ? '28px' : undefined }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'var(--bg-tertiary)',
                border: 'none',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={11} />
            </button>
          )}
        </label>
      </section>

      <section
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {clients.length === 0 ? (
          <div
            style={{
              minHeight: '360px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(5, 150, 105, 0.12))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <UserPlus size={30} style={{ color: 'var(--accent-primary)' }} />
            </div>

            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                maxWidth: '440px',
                lineHeight: '1.5',
                marginBottom: '18px',
              }}
            >
              Add client profiles to organize contacts, contract terms, locations,
              and project associations.
            </p>

            {isAdmin && (
              <button
                className="btn btn-primary"
                onClick={openAddModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
              >
                <Plus size={15} />
                Add your first client
              </button>
            )}
          </div>
        ) : filteredClients.length === 0 ? (
          <div
            style={{
              padding: '50px 24px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            No clients match &ldquo;{searchQuery}&rdquo;. Try a different name, email, or contact.
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: '980px',
                borderCollapse: 'collapse',
                fontSize: '0.78rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <th style={{ padding: '11px 14px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                    Client
                  </th>
                  <th style={{ padding: '11px 14px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                    Phone
                  </th>
                  <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                    Email
                  </th>
                  <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                    Address
                  </th>
                  <th style={{ padding: '11px 14px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                    Contract
                  </th>
                  <th style={{ padding: '11px 14px', textAlign: 'left', minWidth: '180px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                    Projects
                  </th>
                  <th style={{ padding: '11px 14px', textAlign: 'left', minWidth: '210px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                    Contact Persons
                  </th>
                  {isAdmin && (
                    <th style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredClients.map((client, cIdx: number) => {
                  const clientColor = getIdentityStyle(client.name || `client-${cIdx}`);

                  return (
                    <tr
                      key={client._id ? String(client._id) : `client-${cIdx}`}
                      className="clients-table-row"
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                    >
                      <td style={{ padding: '13px 14px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '170px' }}>
                          <div
                            className="avatar"
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              // background: clientColor.bg,
                              color: clientColor.fg,
                              fontWeight: 800,
                              fontSize: '0.7rem',
                            }}
                          >
                            {getInitials(client.name)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 800,
                                color: 'var(--text-primary)',
                                maxWidth: '190px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={client.name}
                            >
                              {client.name}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>
                              Client
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '13px 14px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        {client.phone ? (
                          <a
                            href={`tel:${client.phone}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              color: 'var(--accent-primary)',
                              textDecoration: 'none',
                              fontWeight: 650,
                            }}
                          >
                            <Phone size={11} />
                            {client.phone}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '13px 14px', verticalAlign: 'top' }}>
                        {client.emails?.length ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                            {client.emails.slice(0, 2).map((email, idx) => (
                              <a
                                key={idx}
                                href={`mailto:${email}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  color: 'var(--text-secondary)',
                                  textDecoration: 'none',
                                  maxWidth: '230px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={email}
                              >
                                <Mail size={11} />
                                {email}
                              </a>
                            ))}
                            {client.emails.length > 2 && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>
                                +{client.emails.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '13px 14px', verticalAlign: 'top' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '5px',
                            maxWidth: '210px',
                            color: 'var(--text-secondary)',
                          }}
                          title={client.address || ''}
                        >
                          {client.address ? (
                            <>
                              <MapPin size={11} style={{ marginTop: '2px', flexShrink: 0 }} />
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                }}
                              >
                                {client.address}
                              </span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '13px 14px', verticalAlign: 'top' }}>
                        <div style={{ minWidth: '150px' }}>
                          {client.duration && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontWeight: 700,
                                marginBottom: '6px',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: 'var(--bg-tertiary)',
                                fontSize: '0.68rem',
                                color: 'var(--text-primary)',
                              }}
                            >
                              <Clock size={10} />
                              {client.duration}
                            </div>
                          )}

                          {(client.contractStartDate || client.contractEndDate) ? (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '5px',
                                color: 'var(--text-muted)',
                                fontSize: '0.68rem',
                              }}
                            >
                              <Calendar size={11} style={{ marginTop: '1px', flexShrink: 0 }} />
                              <span>
                                {client.contractStartDate
                                  ? new Date(client.contractStartDate + 'T00:00:00').toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : 'Start'}
                                {' – '}
                                {client.contractEndDate
                                  ? new Date(client.contractEndDate + 'T00:00:00').toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : 'Ongoing'}
                              </span>
                            </div>
                          ) : (
                            !client.duration && <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '13px 14px', verticalAlign: 'top' }}>
                        {client.projects?.length ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxWidth: '260px' }}>
                            {client.projects.map((project: any, pIdx: number) => {
                              const projObj =
                                typeof project === 'object' && project
                                  ? project
                                  : (
                                      projectsOptions.find((p) => p._id === project) || {
                                        _id: String(project || pIdx),
                                        name: String(project || 'Project'),
                                        color: '#3b82f6',
                                      }
                                    );
                              const chipColor = projObj.color || '#3b82f6';

                              return (
                                <span
                                  key={projObj._id || `proj-${pIdx}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 9px 4px 7px',
                                    borderRadius: '999px',
                                    background: `${chipColor}14`,
                                    color: chipColor,
                                    border: `1px solid ${chipColor}33`,
                                    fontSize: '0.66rem',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: chipColor, flexShrink: 0 }} />
                                  {projObj.name}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>No projects</span>
                        )}
                      </td>

                      <td style={{ padding: '11px 12px', verticalAlign: 'top' }}>
                        {client.contacts?.length ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '180px' }}>
                            {client.contacts.slice(0, 1).map((contact, idx) => {
                              const contactColor = getIdentityStyle(contact.name || `${client._id}-contact-${idx}`);
                              const isPrimary = (contact.label || '').toLowerCase() === 'primary';

                              return (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    gap: '8px',
                                    padding: '7px 8px',
                                    borderRadius: '8px',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '50%',
                                      background: contact.name ? contactColor.bg : 'var(--bg-secondary)',
                                      color: contact.name ? contactColor.fg : 'var(--text-muted)',
                                      border: contact.name ? 'none' : '1px dashed var(--border-color)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.6rem',
                                      fontWeight: 800,
                                      flexShrink: 0,
                                      marginTop: '1px',
                                    }}
                                  >
                                    {contact.name ? getInitials(contact.name) : <Contact size={11} />}
                                  </div>

                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                      <span
                                        style={{
                                          fontWeight: 750,
                                          fontSize: '0.72rem',
                                          color: contact.name ? 'var(--text-primary)' : 'var(--text-muted)',
                                          fontStyle: contact.name ? 'normal' : 'italic',
                                        }}
                                      >
                                        {contact.name || `Contact #${idx + 1}`}
                                      </span>
                                      {isPrimary && (
                                        <span
                                          style={{
                                            fontSize: '0.58rem',
                                            fontWeight: 700,
                                            color: '#059669',
                                            background: '#ECFDF5',
                                            padding: '1px 6px',
                                            borderRadius: '999px',
                                            lineHeight: '1.4',
                                          }}
                                        >
                                          Primary
                                        </span>
                                      )}
                                      {contact.label && !isPrimary && (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.61rem' }}>
                                          {contact.label}
                                        </span>
                                      )}
                                    </div>

                                    {contact.designation && (
                                      <div style={{ color: 'var(--accent-primary)', fontSize: '0.64rem', fontWeight: 650, marginTop: '1px' }}>
                                        {contact.designation}
                                      </div>
                                    )}

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', color: 'var(--text-muted)', fontSize: '0.62rem', marginTop: '3px' }}>
                                      {contact.phone && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                          <Phone size={9} />
                                          {contact.phone}
                                        </span>
                                      )}
                                      {contact.email && (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            maxWidth: '140px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          }}
                                          title={contact.email}
                                        >
                                          <Mail size={9} />
                                          {contact.email}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {client.contacts.length > 1 && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.64rem', paddingLeft: '2px' }}>
                                +{client.contacts.length - 1} more contact{client.contacts.length - 1 > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>No contacts</span>
                        )}
                      </td>

                      {isAdmin && (
                        <td style={{ padding: '13px 14px', verticalAlign: 'top', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '5px' }}>
                            <button
                              className="btn btn-icon"
                              onClick={() => openEditModal(client)}
                              title="Edit Client details"
                            >
                              <Edit3 size={12} />
                            </button>

                            <button
                              className="btn btn-icon btn-danger-text"
                              onClick={() => handleDelete(client._id)}
                              title="Delete Client"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CreateClientModal
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        projectsOptions={projectsOptions}
        onSuccess={async () => {
          await fetchData();
        }}
      />

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
                      placeholder="e.g. Acme Corporation"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Primary Phone Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Enter 10-20 digit phone number"
                      inputMode="numeric"
                      minLength={10}
                      maxLength={20}
                      value={phone}
                      onChange={(e) => setPhone(sanitizeNumericInput(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">General Emails (comma-separated) *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. contact@acme.com, info@acme.com"
                    value={emailsStr}
                    onChange={(e) => setEmailsStr(e.target.value)}
                  />
                </div>

                {/* Row: Contract Start Date & Contract End Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <CustomDatePicker
                    label="Contract Start Date"
                    placeholder="Pick start date"
                    value={contractStartDate}
                    onChange={(val) => setContractStartDate(val)}
                  />

                  <CustomDatePicker
                    label="Contract End Date"
                    placeholder="Pick end date"
                    value={contractEndDate}
                    onChange={(val) => setContractEndDate(val)}
                    align="right"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Address (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 123 Main St, Suite 400, New York, NY"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
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
                      <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Click to add a contact person</span> (e.g. Lead, PM, Billing)
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {editingLabelIndex === idx ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={{
                                      height: '24px',
                                      padding: '2px 6px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      width: '130px',
                                      borderRadius: '4px',
                                    }}
                                    value={contact.label !== undefined && contact.label !== '' ? contact.label : `Contact #${idx + 1}`}
                                    onChange={(e) => handleContactChange(idx, 'label', e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setEditingLabelIndex(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingLabelIndex(null);
                                      }
                                    }}
                                    autoFocus
                                    onBlur={() => setEditingLabelIndex(null)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setEditingLabelIndex(null)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--accent-primary)',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    title="Save title"
                                  >
                                    <Check size={13} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                    {contact.label?.trim() || `Contact #${idx + 1}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingLabelIndex(idx)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer',
                                      padding: '2px 4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      borderRadius: '4px',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.color = 'var(--accent-primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.color = 'var(--text-muted)';
                                    }}
                                    title="Edit contact label"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
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
                                transition: 'color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                              title="Remove contact"
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
                                onChange={(e) => handleContactChange(idx, 'phone', sanitizeNumericInput(e.target.value))}
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