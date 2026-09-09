'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  X,
  Plus,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
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
    status: 'To Do' as 'To Do' | 'In Progress' | 'Partially Completed' | 'Review' | 'Completed',
    dueDate: '',
    dueTime: '',
    url: '',
    urls: [] as string[],
    comments: '',
    contactPerson: '',
    contactPersons: [] as string[],
    files: [] as Array<{ name: string; url: string; size?: number; type?: string }>,
    tags: '',
  });

  const draftKey = editingTask ? `edit-task-${editingTask._id || 'unknown'}` : 'create-task';
  const { saveDraft, getDraft, clearDraft, setModalOpenState } = useModalDraft();

  const isAdmin = currentUser?.userType === 'admin';

  // Fetch projects from API
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProjects(data.data);
        return data.data;
      }
    } catch (err) {
      console.error('Failed to fetch projects in CreateTaskModal:', err);
    }
    return [];
  }, []);

  // Fetch employees from API
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEmployees(data.data);
        return data.data;
      }
    } catch (err) {
      console.error('Failed to fetch employees in CreateTaskModal:', err);
    }
    return [];
  }, []);

  // Fetch clients from API
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setClients(data.data);
        return data.data;
      }
    } catch (err) {
      console.error('Failed to fetch clients in CreateTaskModal:', err);
    }
    return [];
  }, []);

  const getProjectContacts = () => {
    let matchedContacts: any[] = [];
    let clientName = '';

    if (formData.projectId) {
      const selectedProj = projects.find(
        (p: any) => p._id === formData.projectId || p._id?.toString() === formData.projectId?.toString()
      );

      const targetClientId = selectedProj?.clientId?._id || selectedProj?.clientId;

      if (selectedProj && selectedProj.clientId && typeof selectedProj.clientId === 'object' && Array.isArray((selectedProj.clientId as any).contacts) && (selectedProj.clientId as any).contacts.length > 0) {
        matchedContacts = (selectedProj.clientId as any).contacts;
        clientName = (selectedProj.clientId as any).name || '';
      } else if (clients && clients.length > 0) {
        const clientForProject = clients.find((c: any) => {
          const cId = c._id?.toString();
          const tId = targetClientId?.toString();
          if (tId && cId === tId) return true;
          return Array.isArray(c.projects) && c.projects.some((p: any) => (p._id || p)?.toString() === formData.projectId?.toString());
        });
        if (clientForProject && Array.isArray(clientForProject.contacts)) {
          matchedContacts = clientForProject.contacts;
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

    const options = projectContacts.map((c: any) => {
      const designationText = c.designation ? ` (${c.designation})` : '';
      return {
        value: c.name,
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

  // Setup modal data whenever modal opens or editingTask changes
  useEffect(() => {
    if (!isOpen) {
      lastInitializedRef.current = null;
      return;
    }

    let activeUser = propUser;
    if (!activeUser) {
      try {
        const stored = localStorage.getItem('worktracker_user');
        if (stored) activeUser = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    setCurrentUser(activeUser);

    if (!projectsOptions || projectsOptions.length === 0) {
      fetchProjects();
    }

    fetchClients();

    const adminFlag = activeUser?.userType === 'admin';
    if (adminFlag && (!employeesList || employeesList.length === 0)) {
      fetchEmployees();
    }

    setModalOpenState(draftKey, true);

    const sessionKey = editingTask ? String(editingTask._id || JSON.stringify(editingTask)) : 'new_task';
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
          projectId: editingTask.projectId?._id || editingTask.projectId || '',
          assignedTo: Array.isArray(editingTask.assignedTo)
            ? editingTask.assignedTo.map((e: any) => (typeof e === 'object' && e !== null ? e._id : e))
            : [],
          priority: editingTask.priority || 'Medium',
          status: editingTask.status || 'To Do',
          dueDate: editingTask.dueDate || '',
          dueTime: editingTask.dueTime || '',
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
          projectId: initialProjectId || '',
          assignedTo: !adminFlag && activeUser?._id ? [activeUser._id] : [],
          priority: 'Medium',
          status: 'To Do',
          dueDate: '',
          dueTime: '',
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({
          ...prev,
          files: [...prev.files, { name: file.name, url: String(reader.result), size: file.size, type: file.type }],
        }));
      };
      reader.readAsDataURL(file);
    });
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
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.projectId.trim()) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const userId = currentUser?._id || currentUser?.id || currentUser?.email;
      const safeAssignedTo = isAdmin ? formData.assignedTo : (userId ? [userId] : []);

      const payload = {
        ...formData,
        assignedTo: safeAssignedTo,
        createdBy: userId,
        userId: userId,
        userEmail: currentUser?.email,
        email: currentUser?.email,
        projectId: formData.projectId || undefined,
        Project: currentUser?.Project || undefined,
        dueDate: formData.dueDate || undefined,
        dueTime: formData.dueTime || undefined,
        url: formData.urls[0] || formData.url || undefined,
        urls: formData.urls,
        comments: formData.comments || undefined,
        contactPerson: formData.contactPersons.join(', ') || undefined,
        contactPersons: formData.contactPersons,
        files: formData.files,
        tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      };

      const url = editingTask ? `/api/tasks/${editingTask._id}` : '/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || `Failed to ${editingTask ? 'update' : 'create'} task`);
      }

      window.dispatchEvent(new CustomEvent('worktracker-refresh'));

      clearDraft(draftKey);
      const taskTitle = data.data?.title || formData.title.trim();
      toast.success(editingTask ? `${taskTitle} updated successfully` : `${taskTitle} created successfully`);

      if (onSuccess) {
        onSuccess(data.data);
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
            {isAdmin && (
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
                      label: 'add project',
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
                      { value: 'Medium', label: 'Medium', color: '#f59e0b',  badgeBg: '#fffbeb', badgeColor: '#b45309' },
                      { value: 'High', label: 'High', color: '#f97316',  badgeBg: '#fff7ed', badgeColor: '#c2410c' },
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
                      // { value: 'In Progress', label: 'In Progress',  badgeBg: '#eff6ff', badgeColor: '#1d4ed8' },
                      // { value: 'Partially Completed', label: 'Partially Completed', badgeBg: '#fff7ed', badgeColor: '#c2410c' },
                      // { value: 'Review', label: 'Review', badgeBg: '#faf5ff', badgeColor: '#7e22ce' },
                      // { value: 'Completed', label: 'Completed', badgeBg: '#ecfdf5', badgeColor: '#047857' },
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
                    setProjects((prev) =>
                      prev.map((p) =>
                        p._id === updatedProject._id || p._id?.toString() === updatedProject._id?.toString()
                          ? { ...p, ...updatedProject }
                          : p
                      )
                    );
                    fetchProjects();
                  }}
                  onAddNewEmployeeClick={() => setIsEmployeeModalOpen(true)}
                />
              </>
            )}


            {/* Task Title */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Task Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Implement user authentication workflow"
                value={formData.title}
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
              />

              <CustomMultipleLinks
                label="URL / Resource Links"
                links={formData.urls}
                onChange={(newLinks) => setFormData({ ...formData, urls: newLinks, url: newLinks[0] || '' })}
              />
            </div>

            {/* Comments & Tags (Admin Only) */}
            {isAdmin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', alignItems: 'start' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>
                    Comments / Notes
                  </label>
                  <div className="custom-input-group" style={{ alignItems: 'flex-start' }}>
                    <span className="custom-input-addon" style={{ height: 'auto', paddingTop: '8px' }}>
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

                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>
                    Tags (comma separated)
                  </label>
                  <textarea
                    className="form-control"
                    style={{ minHeight: '62px', height: '62px', resize: 'vertical', fontSize: '0.8rem', padding: '8px 10px' }}
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g., frontend, urgent, bug"
                  />
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
              <button type="submit" className="btn btn-primary" >
                {submitting
                  ? editingTask
                    ? 'Updating...'
                    : 'Creating...'
                  : editingTask
                  ? 'Update Task'
                  : 'Create Task'}
              </button>
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
