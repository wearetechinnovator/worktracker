'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  X,
  Plus,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateProjectModal from '@/components/CreateProjectModal';
import AddTeamMemberModal from '@/components/AddTeamMemberModal';

import { toast } from '@/lib/toast';
import { useModalDraft } from '@/context/ModalDraftContext';
import {
  CustomDropdown,
  CustomMultiSelectDropdown,
  CustomDatePicker,
  CustomTimePicker,
  CustomFileAttachment,
  CustomMultipleLinks,
} from '@/components/TaskFormControls';
import { ProjectAssigneeSelector } from '@/components/ProjectAssigneeSelector';

const CKEditorComponent = dynamic(
  () => import('@/components/CKEditorWrapper'),
  { ssr: false }
);

export interface ProjectOption {
  _id: string;
  name: string;
  color?: string;
  members?: any[];
  project_users?: any[];
  client?: any;
  clientId?: any;
}

export interface EmployeeOption {
  _id: string;
  name: string;
  email?: string;
  role?: string;
  Project?: string;
}

export interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (task?: any) => void;
  editingTask?: any | null;
  projectsOptions?: ProjectOption[];
  employeesList?: EmployeeOption[];
  initialProjectId?: string;
  user?: any;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  editingTask = null,
  projectsOptions,
  employeesList,
  initialProjectId = '',
  user: propUser,
}: CreateTaskModalProps) {
  const [currentUser, setCurrentUser] = useState<any>(propUser || null);
  const [projects, setProjects] = useState<ProjectOption[]>(projectsOptions || []);
  const [employees, setEmployees] = useState<EmployeeOption[]>(employeesList || []);
  const [clients, setClients] = useState<any[]>([]);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    assignedTo: [] as string[],
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    status: 'To Do' as 'To Do' | 'In Progress' | 'Paused' | 'Partially Done' | 'Partially Completed' | 'Review' | 'Completed',
    dueDate: '',
    dueTime: '',
    task_assign_date: '',
    task_delay_reason: '',
    url: '',
    urls: [] as string[],
    comments: '',
    contactPerson: '',
    contactPersons: [] as string[],
    files: [] as Array<{ name: string; url: string; size?: number; type?: string }>,
    tags: '',
  });

  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const draftKey = editingTask ? `edit-task-${editingTask._id || 'unknown'}` : 'create-task';
  const { saveDraft, getDraft, clearDraft, setModalOpenState } = useModalDraft();

  const isAdmin = currentUser?.userType === 'admin' || Number(currentUser?.user_role) === 1;

  const initialFilesSet = useMemo(() => {
    if (!editingTask || !Array.isArray(editingTask.files)) return new Set<string>();
    return new Set(
      editingTask.files.map((f: any) => {
        if (!f) return '';
        if (typeof f === 'string') return f;
        return f.url || (f as any).fileUrl || `${f.name}_${f.size || 0}`;
      })
    );
  }, [editingTask]);

  const initialUrlsSet = useMemo(() => {
    if (!editingTask) return new Set<string>();
    const existing = Array.isArray(editingTask.urls)
      ? editingTask.urls
      : (editingTask.url ? [editingTask.url] : []);
    return new Set(
      existing.map((u: any) =>
        (typeof u === 'string' ? u : (u?.url || u?.link || '')).trim()
      )
    );
  }, [editingTask]);

  // Fetch projects from API
  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch('/api/projects', { credentials: 'include', cache: 'no-store' });
      const result = await response.json();
      if (response.ok && result.success && Array.isArray(result.data)) {
        const list = result.data.map((project: any) => ({
          ...project,
          _id: String(project._id),
          name: project.name || project.project_name || project.title || '',
          project_users: Array.isArray(project.project_users) ? project.project_users : [],
        }));
        setProjects(list);
        return list;
      }
    } catch {
    } finally {
      setIsLoadingProjects(false);
    }

    setProjects([]);
    return [];
  }, []);

  // Fetch employees from API
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/users/employees', { credentials: 'include', cache: 'no-store' });
      const result = await response.json();
      if (response.ok && result.success && Array.isArray(result.data)) {
        setEmployees(result.data);
        return result.data;
      }
    } catch {
    }

    setEmployees([]);
    return [];
  }, []);

  // Fetch clients from API
  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch('/api/clients', { credentials: 'include', cache: 'no-store' });
      const result = await response.json();
      if (response.ok && result.success && Array.isArray(result.data)) {
        setClients(result.data);
        return result.data;
      }
    } catch {
      // Use the local client list when the API is temporarily unavailable.
    }

    setClients([]);
    return [];
  }, []);

  const getProjectContacts = () => {
    let matchedContacts: any[] = [];
    let clientName = '';

    if (formData.projectId) {
      const selectedProj = projects.find(
        (p: any) => p._id === formData.projectId || p._id?.toString() === formData.projectId?.toString()
      );

      const targetClientId = selectedProj?.client?._id || selectedProj?.clientId?._id || selectedProj?.client || selectedProj?.clientId;

      const projectClient = selectedProj?.client || selectedProj?.clientId;
      const embeddedContacts = projectClient && typeof projectClient === 'object'
        ? (projectClient.contact_members || projectClient.contacts)
        : [];

      if (Array.isArray(embeddedContacts) && embeddedContacts.length > 0) {
        matchedContacts = embeddedContacts;
        clientName = projectClient.name || '';
      } else if (clients && clients.length > 0) {
        const clientForProject = clients.find((c: any) => {
          const cId = c._id?.toString();
          const tId = targetClientId?.toString();
          if (tId && cId === tId) return true;
          return Array.isArray(c.projects) && c.projects.some((p: any) => (p._id || p)?.toString() === formData.projectId?.toString());
        });
        if (clientForProject) {
          matchedContacts = clientForProject.contact_members || clientForProject.contacts || [];
          clientName = clientForProject.name || '';
        }
      }
    }

    // Only return contacts that belong to the selected project/client
    const validContacts = (matchedContacts || []).filter((c: any) => c && c.name && typeof c.name === 'string' && c.name.trim().length > 0);
    return { contacts: validContacts, isFallback: false, clientName };
  };

  const getContactDropdownOptions = () => {
    if (!formData.projectId) {
      return { options: [], disabledMessage: 'Select a project first' };
    }

    const { contacts: projectContacts, clientName } = getProjectContacts();

    if (!projectContacts || projectContacts.length === 0) {
      return { options: [], disabledMessage: 'No contact persons for this project' };
    }

    const options = projectContacts.map((c: any, index: number) => {
      const contactId = c._id || c.id || c.email || `contact-${index}`;
      const designationText = c.designation ? ` (${c.designation})` : '';
      return {
        value: String(contactId),
        label: `${c.name}${designationText}`,
      };
    });

    return { options, disabledMessage: undefined };
  };

  useEffect(() => {
    if (projectsOptions && projectsOptions.length > 0) {
      setProjects(projectsOptions);
    }
  }, [projectsOptions]);

  useEffect(() => {
    if (employeesList && employeesList.length > 0) {
      setEmployees(employeesList);
    }
  }, [employeesList]);

  const lastInitializedRef = useRef<string | null>(null);
  const resourcesLoadedRef = useRef<string | null>(null);

  // Setup modal data whenever modal opens or editingTask changes
  useEffect(() => {
    if (!isOpen) {
      lastInitializedRef.current = null;
      resourcesLoadedRef.current = null;
      return;
    }

    const sessionKey = editingTask ? String(editingTask._id || JSON.stringify(editingTask)) : 'new_task';

    let activeUser = propUser;
    if (!activeUser) {
      try {
        const stored = localStorage.getItem('worktracker_user');
        if (stored) activeUser = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    if (activeUser) {
      setCurrentUser((prev: any) => {
        if (prev && (prev._id === activeUser._id || prev.id === activeUser.id) && prev.userType === activeUser.userType) {
          return prev;
        }
        return activeUser;
      });
    }

    const adminFlag = activeUser?.userType === 'admin' || Number(activeUser?.user_role) === 1;
    if (resourcesLoadedRef.current !== sessionKey) {
      resourcesLoadedRef.current = sessionKey;
      fetchProjects();
      fetchClients();
      if (adminFlag) {
        fetchEmployees();
      }
    }

    setModalOpenState(draftKey, true);

    if (lastInitializedRef.current !== sessionKey) {
      lastInitializedRef.current = sessionKey;

      const draft = getDraft(draftKey);
      if (draft) {
        setFormData(draft);
      } else if (editingTask) {
        const initialContactPersons = Array.isArray(editingTask.contactPersons) && editingTask.contactPersons.length > 0
          ? editingTask.contactPersons
          : (editingTask.contactPerson ? editingTask.contactPerson.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

        setFormData({
          title: editingTask.title || '',
          description: editingTask.description || '',
          projectId: editingTask.projectId?._id || editingTask.project_id?._id || editingTask.projectId || editingTask.project_id || '',
          assignedTo: Array.isArray(editingTask.assignedTo || editingTask.assign_to)
            ? (editingTask.assignedTo || editingTask.assign_to).map((e: any) => (typeof e === 'object' && e !== null ? e._id : e))
            : [],
          priority: editingTask.priority || 'Medium',
          status: editingTask.task_status || (typeof editingTask.status === 'string' ? editingTask.status : 'To Do'),
          dueDate: editingTask.dueDate || '',
          dueTime: editingTask.dueTime || '',
          task_assign_date: editingTask.task_assign_date ? String(editingTask.task_assign_date).slice(0, 10) : '',
          task_delay_reason: editingTask.task_delay_reason || '',
          url: editingTask.url || '',
          urls: Array.isArray(editingTask.urls)
            ? editingTask.urls
            : (editingTask.url ? [editingTask.url] : []),
          comments: editingTask.comments || '',
          contactPerson: editingTask.contactPerson || '',
          contactPersons: initialContactPersons,
          files: editingTask.files || [],
          tags: Array.isArray(editingTask.tags)
            ? editingTask.tags.join(', ')
            : (editingTask.tags || ''),
        });
      } else {
        setFormData({
          title: '',
          description: '',
          projectId: initialProjectId || (!adminFlag && projects.length === 1 ? projects[0]._id : ''),
          assignedTo: !adminFlag && activeUser?._id ? [activeUser._id] : [],
          priority: 'Medium',
          status: 'To Do',
          dueDate: '',
          dueTime: '',
          task_assign_date: '',
          task_delay_reason: '',
          url: '',
          urls: [],
          comments: '',
          contactPerson: '',
          contactPersons: [],
          files: [],
          tags: '',
        });
      }
      setError(null);
    }
  }, [isOpen, editingTask, initialProjectId, projectsOptions, employeesList, propUser, fetchProjects, fetchEmployees, fetchClients, getDraft]);

  useEffect(() => {
    if (!isAdmin && !editingTask && !formData.projectId && projects.length === 1) {
      setFormData((prev) => ({ ...prev, projectId: projects[0]._id }));
    }
  }, [projects, isAdmin, editingTask, formData.projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      const uploadedFiles = await Promise.all(
        Array.from(fileList).map(async (file) => {
          const uploadData = new FormData();
          uploadData.append('file', file);

          const response = await fetch('/api/uploads', {
            method: 'POST',
            credentials: 'include',
            body: uploadData,
          });
          const result = await response.json();

          if (!response.ok || !result.success || !result.data?.url) {
            throw new Error(result.message || `Failed to upload ${file.name}`);
          }

          return result.data;
        })
      );

      setFormData((prev) => ({
        ...prev,
        files: [...prev.files, ...uploadedFiles],
      }));
    } catch (uploadError: any) {
      setError(uploadError.message || 'Failed to upload file');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleProjectSuccess = async (newProj?: any) => {
    setIsProjectModalOpen(false);
    await fetchProjects();
    if (newProj?._id) {
      setFormData((prev) => ({ ...prev, projectId: newProj._id }));
    }
  };

  const handleEmployeeSuccess = async (newEmp?: any) => {
    setIsEmployeeModalOpen(false);
    await fetchEmployees();
    if (newEmp?._id) {
      setFormData((prev) => ({
        ...prev,
        assignedTo: prev.assignedTo.includes(newEmp._id) ? prev.assignedTo : [...prev.assignedTo, newEmp._id],
      }));
    }
  };

  const isFormDirty = () => {
    if (!editingTask) {
      return Boolean(
        formData.title.trim() ||
        formData.description.trim() ||
        formData.projectId.trim() ||
        formData.comments.trim() ||
        formData.dueDate ||
        formData.dueTime ||
        formData.tags.trim() ||
        formData.files.length > 0 ||
        formData.urls.length > 0
      );
    }
    return Boolean(
      formData.title !== (editingTask.title || '') ||
      formData.description !== (editingTask.description || '') ||
      formData.priority !== (editingTask.priority || 'Medium') ||
      formData.status !== (editingTask.status || 'To Do') ||
      formData.dueDate !== (editingTask.dueDate || '') ||
      formData.comments !== (editingTask.comments || '')
    );
  };

  const handleClose = () => {
    const closingEdit = Boolean(editingTask);

    if (isFormDirty()) {
      saveDraft(draftKey, {
        type: 'task',
        title: formData.title.trim() ? `Task: ${formData.title.trim()}` : (editingTask ? 'Edit Task' : 'New Task'),
        subtitle: formData.dueDate ? `Due: ${formData.dueDate}` : 'Draft saved',
        data: formData,
      });
    } else {
      clearDraft(draftKey);
    }

    if (closingEdit) {
      setFormData({
        title: '',
        description: '',
        projectId: initialProjectId || '',
        assignedTo: [],
        priority: 'Medium',
        status: 'To Do',
        dueDate: '',
        dueTime: '',
        task_assign_date: '',
        task_delay_reason: '',
        url: '',
        urls: [],
        comments: '',
        contactPerson: '',
        contactPersons: [],
        files: [],
        tags: '',
      });
    }

    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingTask) {
      if (!formData.projectId.trim()) {
        setError('Please choose a project');
        return;
      }

      if (!formData.title.trim()) {
        setError('Task name is required');
        return;
      }

      if (!isAdmin) {
        if (projects.length === 0) {
          setError('You are not assigned to any project and cannot create a task.');
          return;
        }

        const isAssigned = projects.some(
          (p) => String(p._id) === String(formData.projectId)
        );
        if (!isAssigned) {
          setError('You are not assigned to this project and cannot create tasks in it.');
          return;
        }
      }
    } else {
      if (isAdmin && (!formData.title.trim() || !formData.projectId.trim())) {
        setError('Please fill all required fields');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      let payload: any;

      if (!isAdmin && editingTask) {
        // Non-admin employees can ONLY update description and add new files/links.
        // Ensure existing files and links are strictly preserved.
        const existingFiles = Array.isArray(editingTask.files) ? editingTask.files : [];
        const existingUrls = Array.isArray(editingTask.urls)
          ? editingTask.urls
          : (editingTask.url ? [editingTask.url] : []);

        const mergedFiles = [...existingFiles];
        const existingFileKeys = new Set(
          existingFiles.map((f: any) => f?.url || (f as any)?.fileUrl || `${f?.name}_${f?.size || 0}`)
        );
        for (const f of formData.files) {
          const key = f?.url || (f as any)?.fileUrl || `${f?.name}_${f?.size || 0}`;
          if (!existingFileKeys.has(key)) {
            mergedFiles.push(f);
          }
        }

        const mergedUrls = [...existingUrls];
        const existingUrlSet = new Set(
          existingUrls.map((u: any) => (typeof u === 'string' ? u : u?.url || u?.link || '').trim())
        );
        for (const u of formData.urls) {
          if (!existingUrlSet.has(u.trim())) {
            mergedUrls.push(u.trim());
          }
        }

        payload = {
          description: formData.description || '',
          files: mergedFiles,
          urls: mergedUrls,
        };
      } else {
        const userId = currentUser?._id || currentUser?.id || currentUser?.email;
        const safeAssignedTo = isAdmin ? formData.assignedTo : (userId ? [userId] : []);

        payload = {
          title: formData.title.trim(),
          description: formData.description || '',
          project_id: formData.projectId || undefined,
          assign_to: safeAssignedTo,
          created_by: userId,
          priority: formData.priority,
          task_status: formData.status,
          files: formData.files,
          urls: formData.urls,
          comments: formData.comments ? [{ comment: formData.comments, user_id: userId, datetime: new Date().toISOString() }] : [],
          completion_date: formData.dueDate || undefined,
          completion_time: formData.dueTime || undefined,
          task_assign_date: formData.task_assign_date || undefined,
          task_delay_reason: formData.task_delay_reason ? (formData.task_delay_reason.trim() || undefined) : undefined,
          status: 1,

          // Backward compatibility properties
          projectId: formData.projectId || undefined,
          assignedTo: safeAssignedTo,
          createdBy: userId,
          dueDate: formData.dueDate || undefined,
          dueTime: formData.dueTime || undefined,

          url: formData.urls[0] || formData.url || undefined,
          tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
        };
      }

      let savedTask: any = null;

      const url = editingTask ? `/api/tasks/${editingTask._id}` : '/api/tasks';
      const method = editingTask ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || `Failed to ${editingTask ? 'update' : 'create'} task`);
      }

      savedTask = json.data;

      if (!savedTask) {
        savedTask = {
          _id: editingTask ? editingTask._id : 'task-' + Date.now(),
          ...payload,
          createdAt: new Date().toISOString()
        };
      }

      window.dispatchEvent(new CustomEvent('worktracker-refresh'));

      clearDraft(draftKey);
      const taskTitle = formData.title.trim();
      toast.success(editingTask ? `${taskTitle} updated successfully` : `${taskTitle} created successfully`);

      if (onSuccess) {
        onSuccess(savedTask);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" style={{ zIndex: 1200 }}>
        <div
          className="modal-container"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div className="modal-header">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h3>
            <button className="modal-close" onClick={handleClose}>
              &times;
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                marginBottom: '16px',
                borderRadius: '6px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isAdmin ? (
              <>
                {/* Row 1: Choose Project, Contact Person, & Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>
                  <CustomDropdown
                    label="Choose Project *"
                    placeholder="Choose Project"
                    value={formData.projectId}
                    options={[
                      { value: '', label: 'Choose Project' },
                      ...projects.map((p) => ({
                        value: p._id,
                        label: p.name,
                        color: p.color || '#3b82f6',
                      })),
                    ]}
                    onChange={(val) => setFormData((prev) => ({ ...prev, projectId: val, contactPersons: prev.projectId === val ? prev.contactPersons : [] }))}
                    actionButton={{
                      label: 'Add Project',
                      onClick: () => setIsProjectModalOpen(true),
                    }}
                  />

                  {(() => {
                    const { options: contactOpts, disabledMessage } = getContactDropdownOptions();
                    return (
                      <CustomMultiSelectDropdown
                        label="Contact Person"
                        placeholder="Select Contact Person"
                        values={formData.contactPersons}
                        options={contactOpts}
                        disabledMessage={disabledMessage}
                        onChange={(newVals) => setFormData({ ...formData, contactPersons: newVals })}
                      />
                    );
                  })()}

                  <CustomDropdown
                    label="Priority"
                    placeholder="Select Priority"
                    value={formData.priority}
                    options={[
                      { value: 'Low', label: 'Low', color: '#3b82f6', badgeBg: '#eff6ff', badgeColor: '#1d4ed8' },
                      { value: 'Medium', label: 'Medium', color: '#f59e0b', badgeBg: '#fffbeb', badgeColor: '#b45309' },
                      { value: 'High', label: 'High', color: '#f97316', badgeBg: '#fff7ed', badgeColor: '#c2410c' },
                      { value: 'Urgent', label: 'Urgent', color: '#ef4444', badgeBg: '#fef2f2', badgeColor: '#b91c1c' },
                    ]}
                    onChange={(val) => setFormData({ ...formData, priority: val as any })}
                  />
                </div>

                {/* Row 2: Status, Due Date, Due Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>
                  <CustomDropdown
                    label="Status"
                    placeholder="Select Status"
                    value={formData.status}
                    options={[
                      { value: 'To Do', label: 'To Do', badgeBg: '#f1f5f9', badgeColor: '#475569' },
                    ]}
                    onChange={(val) => setFormData({ ...formData, status: val as any })}
                  />

                  <CustomDatePicker
                    label="Due Date"
                    value={formData.dueDate}
                    onChange={(val) => setFormData({ ...formData, dueDate: val })}
                  />

                  <CustomTimePicker
                    label="Due Time"
                    value={formData.dueTime}
                    onChange={(val) => setFormData({ ...formData, dueTime: val })}
                    align="right"
                  />
                </div>

                {/* Task Assignment Details */}
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '14px',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '10px',
                    background: 'var(--bg-secondary, #f8fafc)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      marginBottom: '12px',
                      color: 'var(--text-primary, #0f172a)',
                    }}
                  >
                    Task Assignment Details
                  </div>

                  {/* Assign Date */}
                  <div
                    style={{
                      marginBottom: formData.task_assign_date ? '14px' : 0,
                    }}
                  >
                    <CustomDatePicker
                      label="Task Assign Date"
                      value={formData.task_assign_date}
                      onChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          task_assign_date: val,
                          task_delay_reason: val
                            ? prev.task_delay_reason
                            : '',
                        }))
                      }
                    />
                  </div>

                  {/* Assignment Reason - only visible after date is selected */}
                  {formData.task_assign_date && (
                    <div>
                      <label
                        className="form-label"
                        style={{
                          display: 'block',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          marginBottom: '6px',
                        }}
                      >
                        Assignment Reason
                      </label>

                      <textarea
                        className="form-control"
                        value={formData.task_delay_reason}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            task_delay_reason: e.target.value,
                          }))
                        }
                        placeholder="Why is this task being assigned?"
                        rows={3}
                        style={{
                          width: '100%',
                          minHeight: '72px',
                          resize: 'vertical',
                          fontSize: '0.8rem',
                          padding: '9px 10px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Assign To (Admin Only) - Dual-Column Drag & Drop / Project-Scoped Selection */}
                <ProjectAssigneeSelector
                  projectId={formData.projectId}
                  projects={projects}
                  allEmployees={employees}
                  assignedTo={formData.assignedTo}
                  onChangeAssignedTo={(newAssignedTo) =>
                    setFormData((prev) => ({ ...prev, assignedTo: newAssignedTo }))
                  }
                  onProjectUpdated={(updatedProject) => {
                    if (!updatedProject?._id) return;

                    setProjects((prev) =>
                      prev.map((p) =>
                        p._id === updatedProject._id || p._id?.toString() === updatedProject._id?.toString()
                          ? { ...p, ...updatedProject }
                          : p
                      )
                    );
                  }}
                  onAddNewEmployeeClick={() => setIsEmployeeModalOpen(true)}
                />
              </>
            ) : (
              /* =========================================================
                 EMPLOYEE TASK CREATION: Project, Task Name, Description
                 ========================================================= */
              !editingTask && (
                <>
                  {!isLoadingProjects && projects.length === 0 && (
                    <div
                      style={{
                        padding: '12px 14px',
                        marginBottom: '16px',
                        borderRadius: '8px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#991b1b',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <AlertCircle size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>No Project Assigned:</strong> You are not assigned to any project. You cannot create a task until an administrator assigns you to a project.
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <CustomDropdown
                      label="Choose Project *"
                      placeholder={
                        isLoadingProjects
                          ? 'Loading assigned projects...'
                          : projects.length === 0
                          ? 'No assigned project found'
                          : 'Choose Project'
                      }
                      value={formData.projectId}
                      disabled={projects.length === 0 || isLoadingProjects}
                      options={[
                        { value: '', label: 'Choose Project' },
                        ...projects.map((p) => ({
                          value: p._id,
                          label: p.name,
                          color: p.color || '#3b82f6',
                        })),
                      ]}
                      onChange={(val) => setFormData((prev) => ({ ...prev, projectId: val }))}
                    />
                    {!isLoadingProjects && projects.length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                        You must be assigned to at least one project to create a task.
                      </span>
                    )}
                  </div>
                </>
              )
            )}


            {/* Task Title */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">
                Task Name *
                {!isAdmin && editingTask && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 500 }}>
                    (Read-only for employee)
                  </span>
                )}
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Implement user authentication workflow"
                value={formData.title}
                disabled={(!isAdmin && Boolean(editingTask)) || (!isAdmin && !editingTask && (projects.length === 0 || isLoadingProjects))}
                style={
                  !isAdmin && editingTask
                    ? { background: 'var(--bg-tertiary)', cursor: 'not-allowed', opacity: 0.85 }
                    : {}
                }
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Task Description */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Task Description</label>
              <CKEditorComponent
                value={formData.description}
                onChange={(val: string) => setFormData({ ...formData, description: val })}
              />
            </div>

            {/* Row: Supporting Files & URL / Resource Links */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>
              <CustomFileAttachment
                label="Supporting Files"
                files={formData.files}
                onUpload={handleFileUpload}
                onRemove={handleRemoveFile}
                isRemovable={(file) => {
                  if (isAdmin || !editingTask) return true;
                  const key = file.url || (file as any).fileUrl || `${file.name}_${file.size || 0}`;
                  return !initialFilesSet.has(key);
                }}
              />

              <CustomMultipleLinks
                label="URL / Resource Links"
                links={formData.urls}
                onChange={(newLinks) => setFormData({ ...formData, urls: newLinks, url: newLinks[0] || '' })}
                isRemovable={(link) => {
                  if (isAdmin || !editingTask) return true;
                  return !initialUrlsSet.has(link.trim());
                }}
              />
            </div>

            {/* Comments & Tags (Admin Only) */}
            {isAdmin && (
              <div style={{ gap: '16px', marginBottom: '20px', alignItems: 'start' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>
                    Comments / Notes
                  </label>
                  <div className="custom-input-group" style={{ alignItems: 'flex-start' }}>
                    <span className="custom-input-addon" style={{ height: '10vh', paddingTop: '8px' }}>
                      <MessageSquare size={14} />
                    </span>
                    <textarea
                      className="custom-input-control"
                      style={{ minHeight: '62px', height: '62px', resize: 'vertical' }}
                      placeholder="Add any additional notes, remarks or comments..."
                      value={formData.comments}
                      onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <Button
                type="submit"
                loading={submitting}
                disabled={!isAdmin && !editingTask && (projects.length === 0 || isLoadingProjects)}
                className="btn btn-primary"
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL: NEW Project */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        employeesList={employees}
        onSuccess={handleProjectSuccess}
      />

      {/* MODAL: Add Employee */}
      <AddTeamMemberModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSuccess={handleEmployeeSuccess}
      />
    </>
  );
}

export { CreateTaskModal as CreateNewTaskModal };
export default CreateTaskModal;
