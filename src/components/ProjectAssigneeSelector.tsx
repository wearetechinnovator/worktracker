'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  GripVertical, Users, UserPlus, UserCheck, Search, X, Check, Plus,
  ChevronDown, Loader2, ArrowRight
} from 'lucide-react';
import { staticClient } from '@/lib/staticClient';

export interface EmployeeItem {
  _id: string;
  name: string;
  email?: string;
  role?: string;
  avatarColor?: string;
  Project?: string;
  status?: string;
}

export interface ProjectItem {
  _id: string;
  name: string;
  color?: string;
  members?: any[];
  clientId?: any;
}

interface ProjectAssigneeSelectorProps {
  projectId: string;
  projects: ProjectItem[];
  allEmployees: EmployeeItem[];
  assignedTo: string[];
  onChangeAssignedTo: (newAssignedTo: string[]) => void;
  onProjectUpdated?: (updatedProject: any) => void;
  onAddNewEmployeeClick?: () => void;
}

export function ProjectAssigneeSelector({
  projectId,
  projects,
  allEmployees,
  assignedTo,
  onChangeAssignedTo,
  onProjectUpdated,
  onAddNewEmployeeClick,
}: ProjectAssigneeSelectorProps) {
  const [searchMember, setSearchMember] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [taggingLoading, setTaggingLoading] = useState(false);
  const [isDragOverRight, setIsDragOverRight] = useState(false);
  const [draggedEmpId, setDraggedEmpId] = useState<string | null>(null);

  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Close tag dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find the selected project
  const selectedProject = useMemo(() => {
    if (!projectId) return null;
    return projects.find(
      (p) => p._id === projectId || p._id?.toString() === projectId?.toString()
    ) || null;
  }, [projectId, projects]);

  // Project member IDs set
  const projectMemberIds = useMemo(() => {
    const set = new Set<string>();
    if (!selectedProject) return set;

    // Check project.members
    if (Array.isArray(selectedProject.members)) {
      selectedProject.members.forEach((m: any) => {
        const id = m?._id?.toString() || m?.toString();
        if (id) set.add(id);
      });
    }

    // Also check allEmployees with matching Project field
    allEmployees.forEach((emp) => {
      if (
        emp.Project &&
        (emp.Project === selectedProject.name ||
          emp.Project === selectedProject._id ||
          emp.Project.toString() === selectedProject._id.toString())
      ) {
        set.add(emp._id.toString());
      }
    });

    return set;
  }, [selectedProject, allEmployees]);

  // List of employees belonging to the project
  const projectMembers = useMemo(() => {
    return allEmployees.filter((emp) => projectMemberIds.has(emp._id.toString()));
  }, [allEmployees, projectMemberIds]);

  // Filtered project members by search
  const filteredProjectMembers = useMemo(() => {
    if (!searchMember.trim()) return projectMembers;
    const q = searchMember.toLowerCase().trim();
    return projectMembers.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        (emp.role && emp.role.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q))
    );
  }, [projectMembers, searchMember]);

  // Non-member employees available to be tagged to this project
  const nonMemberEmployees = useMemo(() => {
    if (!projectId) return [];
    return allEmployees.filter((emp) => !projectMemberIds.has(emp._id.toString()));
  }, [allEmployees, projectMemberIds, projectId]);

  // Filtered non-members for the Tag Dropdown
  const filteredNonMembers = useMemo(() => {
    if (!tagSearchQuery.trim()) return nonMemberEmployees;
    const q = tagSearchQuery.toLowerCase().trim();
    return nonMemberEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        (emp.role && emp.role.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q))
    );
  }, [nonMemberEmployees, tagSearchQuery]);

  // List of assigned employees for this task
  const assignedEmployees = useMemo(() => {
    return assignedTo
      .map((id) => allEmployees.find((e) => e._id.toString() === id.toString()))
      .filter(Boolean) as EmployeeItem[];
  }, [assignedTo, allEmployees]);

  // Tag an employee to this project permanently in database
  const handleTagEmployeeToProject = async (emp: EmployeeItem) => {
    if (!projectId || !selectedProject) return;
    try {
      setTaggingLoading(true);
      const currentMemberIds = Array.from(projectMemberIds);
      const updatedMemberIds = Array.from(new Set([...currentMemberIds, emp._id.toString()]));

      const data = await staticClient.updateProject(projectId, { members: updatedMemberIds });
      if (data.success) {
        if (onProjectUpdated) {
          onProjectUpdated(data.data);
        }
        setIsTagDropdownOpen(false);
        setTagSearchQuery('');
      }
    } catch (err) {
      console.error('Error tagging employee to project:', err);
    } finally {
      setTaggingLoading(false);
    }
  };

  // Toggle assigning an employee to this task
  const toggleAssign = (empId: string) => {
    if (assignedTo.includes(empId)) {
      onChangeAssignedTo(assignedTo.filter((id) => id !== empId));
    } else {
      onChangeAssignedTo([...assignedTo, empId]);
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, empId: string) => {
    setDraggedEmpId(empId);
    e.dataTransfer.setData('text/plain', empId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedEmpId(null);
  };

  const handleDropOnRight = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverRight(false);
    const empId = e.dataTransfer.getData('text/plain') || draggedEmpId;
    if (empId && !assignedTo.includes(empId)) {
      onChangeAssignedTo([...assignedTo, empId]);
    }
    setDraggedEmpId(null);
  };

  return (
    <div style={{ marginBottom: '18px' }}>
      {/* Main Label & Actions Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '0.82rem' }}>
            Assign To
          </label>
          {selectedProject && (
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-tertiary)',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
              }}
            >
              Project: <strong style={{ color: 'var(--text-primary)' }}>{selectedProject.name}</strong>
            </span>
          )}
        </div>

        {onAddNewEmployeeClick && (
          <button
            type="button"
            onClick={onAddNewEmployeeClick}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 2px',
            }}
            title="Create a new employee profile"
          >
            <Plus size={13} />
            <span>create new employee</span>
          </button>
        )}
      </div>

      {/* Two Column Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '14px',
          alignItems: 'stretch',
        }}
      >
        {/* LEFT COLUMN: Project Members */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '210px',
            maxHeight: '260px',
          }}
        >
          {/* Left Column Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Project Members
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {projectMembers.length}
              </span>
            </div>

            {/* Tag/Add Member to Project Button & Popover */}
            {selectedProject && (
              <div style={{ position: 'relative' }} ref={tagDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--accent-primary)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Search and tag an employee to this project"
                >
                  <UserPlus size={12} />
                  <span>+ Tag Member</span>
                  <ChevronDown size={11} />
                </button>

                {/* Dropdown to Search & Tag Employee to Project */}
                {isTagDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      width: '260px',
                      background: 'var(--bg-card, var(--bg-secondary))',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-md)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      zIndex: 1500,
                      padding: '8px',
                      animation: 'fadeIn 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Tag Employee to {selectedProject.name}
                    </div>

                    <div
                      style={{
                        position: 'relative',
                        marginBottom: '6px',
                      }}
                    >
                      <Search
                        size={12}
                        style={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-muted)',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Search employee to tag..."
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '5px 8px 5px 26px',
                          fontSize: '0.75rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        maxHeight: '160px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      {taggingLoading ? (
                        <div
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Loader2 size={13} className="animate-spin" />
                          Tagging to project...
                        </div>
                      ) : filteredNonMembers.length === 0 ? (
                        <div
                          style={{
                            padding: '10px 6px',
                            textAlign: 'center',
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {tagSearchQuery
                            ? 'No matching employees found'
                            : 'All employees already belong to this project'}
                        </div>
                      ) : (
                        filteredNonMembers.map((emp) => (
                          <div
                            key={emp._id}
                            onClick={() => handleTagEmployeeToProject(emp)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              background: 'var(--bg-tertiary)',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--accent-primary)';
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'var(--bg-tertiary)';
                              e.currentTarget.style.color = '';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: emp.avatarColor || '#3b82f6',
                                  color: '#fff',
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {emp.name}
                                <span style={{ opacity: 0.7, fontSize: '0.68rem', marginLeft: '4px' }}>
                                  ({emp.role || 'Team'})
                                </span>
                              </span>
                            </div>
                            <Plus size={12} style={{ flexShrink: 0 }} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Search within Project Members */}
          {selectedProject && projectMembers.length > 4 && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search
                size={12}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Filter members..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 8px 4px 24px',
                  fontSize: '0.72rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Project Members List Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              paddingRight: '2px',
            }}
          >
            {!projectId ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '120px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  gap: '6px',
                  padding: '12px',
                }}
              >
                <Users size={22} style={{ opacity: 0.4 }} />
                <span>Select a project above to view and assign its members</span>
              </div>
            ) : filteredProjectMembers.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '120px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  gap: '8px',
                  padding: '12px',
                }}
              >
                <span>No employees tagged to this project yet.</span>
                <button
                  type="button"
                  onClick={() => setIsTagDropdownOpen(true)}
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <UserPlus size={12} />
                  <span>Tag Employee to Project</span>
                </button>
              </div>
            ) : (
              filteredProjectMembers.map((emp) => {
                const isAssigned = assignedTo.includes(emp._id);
                return (
                  <div
                    key={emp._id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, emp._id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => toggleAssign(emp._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderRadius: '5px',
                      background: isAssigned ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-tertiary)',
                      border: isAssigned ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                      cursor: 'grab',
                      userSelect: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    title="Click or drag to right to assign to this task"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <GripVertical
                        size={13}
                        style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.6 }}
                      />
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => {}} // Handled by div onClick
                        style={{ cursor: 'pointer', margin: 0 }}
                      />
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: emp.avatarColor || '#3b82f6',
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: isAssigned ? 700 : 500,
                            color: isAssigned ? 'var(--accent-primary)' : 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {emp.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.66rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {emp.role || emp.Project || 'Member'}
                        </span>
                      </div>
                    </div>

                    {isAssigned ? (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(59, 130, 246, 0.15)',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={10} />
                        Assigned
                      </span>
                    ) : (
                      <ArrowRight
                        size={12}
                        style={{ color: 'var(--text-muted)', opacity: 0.5, flexShrink: 0 }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Assigned to Task (Drop Zone) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOverRight(true);
          }}
          onDragLeave={() => setIsDragOverRight(false)}
          onDrop={handleDropOnRight}
          style={{
            background: isDragOverRight
              ? 'rgba(59, 130, 246, 0.08)'
              : 'var(--bg-secondary)',
            border: isDragOverRight
              ? '2px dashed var(--accent-primary)'
              : '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '210px',
            maxHeight: '260px',
            transition: 'all 0.15s ease',
          }}
        >
          {/* Right Column Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={14} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Assigned to Task
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: assignedEmployees.length > 0 ? '#10b981' : 'var(--bg-tertiary)',
                  color: assignedEmployees.length > 0 ? '#fff' : 'var(--text-secondary)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {assignedEmployees.length}
              </span>
            </div>

            {assignedEmployees.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeAssignedTo([])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '1px 4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Assigned Employees List Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              paddingRight: '2px',
            }}
          >
            {assignedEmployees.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '120px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  gap: '6px',
                  padding: '12px',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--border-radius-sm)',
                  background: 'var(--bg-tertiary)',
                }}
              >
                <UserCheck size={22} style={{ opacity: 0.35, color: '#10b981' }} />
                <span style={{ fontWeight: 600 }}>No assignees selected yet</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>
                  Check members on the left or drag and drop them here
                </span>
              </div>
            ) : (
              assignedEmployees.map((emp) => (
                <div
                  key={emp._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: emp.avatarColor || '#3b82f6',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {emp.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {emp.role || emp.Project || 'Team'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAssign(emp._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.background = 'none';
                    }}
                    title="Remove from task assignment"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
