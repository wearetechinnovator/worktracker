'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  UserPlus,
  FolderPlus,
  Building2,
  Plus,
  Clock,
  ChevronDown,
} from 'lucide-react';

import NotificationCenter from '@/components/NotificationCenter';
import AddTeamMemberModal from '@/components/AddTeamMemberModal';
import CreateProjectModal from '@/components/CreateProjectModal';
import CreateClientModal from '@/components/CreateClientModal';
import CreateTaskModal from '@/components/CreateTaskModal';
import PunchRequestModal from '@/components/PunchRequestModal';
import { punchService } from '@/lib/punchService';
import { toast } from '@/lib/toast';

export default function TopNavbar() {
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // =========================================================
  // LIVE CLOCK
  // =========================================================

  const [liveTime, setLiveTime] = useState('');
  const [liveDate, setLiveDate] = useState('');

  // =========================================================
  // PUNCH STATUS
  // =========================================================

  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [canPunchOut, setCanPunchOut] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  // Punch Request Modal State
  const [isPunchRequestModalOpen, setIsPunchRequestModalOpen] = useState(false);
  const [punchRequestType, setPunchRequestType] = useState<'punchIn' | 'punchOut'>('punchIn');
  const [punchRequestMeta, setPunchRequestMeta] = useState<{
    message?: string;
    currentTime?: string;
    startTime?: string | null;
    endTime?: string | null;
  }>({});

  // Prevent multiple punch requests while processing
  const [isPunching, setIsPunching] = useState(false);

  // =========================================================
  // SHARED DATA
  // =========================================================

  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);

  // =========================================================
  // MODAL STATES
  // =========================================================

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] =
    useState(false);

  const [isClientModalOpen, setIsClientModalOpen] =
    useState(false);

  const [isProjectModalOpen, setIsProjectModalOpen] =
    useState(false);

  const [isTaskModalOpen, setIsTaskModalOpen] =
    useState(false);

  // =========================================================
  // DROPDOWN STATES
  // =========================================================

  const [isCreateMenuOpen, setIsCreateMenuOpen] =
    useState(false);

  const [isPresetMenuOpen, setIsPresetMenuOpen] =
    useState(false);

  const [isDateRangePickerOpen, setIsDateRangePickerOpen] =
    useState(false);

  const [isFilterMenuOpen, setIsFilterMenuOpen] =
    useState(false);

  // =========================================================
  // FILTER / PRESET STATES
  // =========================================================

  const [selectedPreset, setSelectedPreset] =
    useState('This Week');

  const [dateRangeText, setDateRangeText] =
    useState('Aug 24 – Aug 30, 2026');

  const [startDate, setStartDate] =
    useState('');

  const [endDate, setEndDate] =
    useState('');

  const [filterProjectId, setFilterProjectId] =
    useState('');

  const [filterStatus, setFilterStatus] =
    useState('');

  const [filterPriority, setFilterPriority] =
    useState('');

  const [filterEmployeeId, setFilterEmployeeId] =
    useState('');

  // =========================================================
  // PRESET DATE RANGE
  // =========================================================

  const getPresetDateRangeText = (
    preset: string
  ): string => {
    const now = new Date();

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const currentYear =
      now.getFullYear();

    if (preset === 'Today') {
      return `${months[now.getMonth()]} ${now.getDate()}, ${currentYear}`;
    }

    if (preset === 'Yesterday') {
      const prev = new Date(now);

      prev.setDate(
        now.getDate() - 1
      );

      return `${months[prev.getMonth()]} ${prev.getDate()}, ${prev.getFullYear()}`;
    }

    if (preset === 'This Week') {
      const curr = new Date(now);

      const dayOfWeek =
        curr.getDay();

      const distanceToMon =
        dayOfWeek === 0
          ? -6
          : 1 - dayOfWeek;

      const monday = new Date(curr);

      monday.setDate(
        curr.getDate() +
        distanceToMon
      );

      const sunday =
        new Date(monday);

      sunday.setDate(
        monday.getDate() + 6
      );

      return `${months[monday.getMonth()]} ${monday.getDate()} – ${months[sunday.getMonth()]} ${sunday.getDate()}, ${sunday.getFullYear()}`;
    }

    if (preset === 'Last Week') {
      const curr = new Date(now);

      const dayOfWeek =
        curr.getDay();

      const distanceToMon =
        (dayOfWeek === 0
          ? -6
          : 1 - dayOfWeek) - 7;

      const monday = new Date(curr);

      monday.setDate(
        curr.getDate() +
        distanceToMon
      );

      const sunday =
        new Date(monday);

      sunday.setDate(
        monday.getDate() + 6
      );

      return `${months[monday.getMonth()]} ${monday.getDate()} – ${months[sunday.getMonth()]} ${sunday.getDate()}, ${sunday.getFullYear()}`;
    }

    if (preset === 'This Month') {
      const first = new Date(
        currentYear,
        now.getMonth(),
        1
      );

      const last = new Date(
        currentYear,
        now.getMonth() + 1,
        0
      );

      return `${months[first.getMonth()]} 01 – ${months[last.getMonth()]} ${last.getDate()}, ${currentYear}`;
    }

    if (preset === 'Last Month') {
      const first = new Date(
        currentYear,
        now.getMonth() - 1,
        1
      );

      const last = new Date(
        currentYear,
        now.getMonth(),
        0
      );

      return `${months[first.getMonth()]} 01 – ${months[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;
    }

    if (preset === 'All Time') {
      return 'All Time';
    }

    return 'Aug 24 – Aug 30, 2026';
  };

  // =========================================================
  // PRESET SELECT
  // =========================================================

  const handleSelectPreset = (
    preset: string
  ) => {
    setSelectedPreset(preset);

    const text =
      getPresetDateRangeText(
        preset
      );

    setDateRangeText(text);

    setIsPresetMenuOpen(false);

    window.dispatchEvent(
      new CustomEvent(
        'worktracker-filter-change',
        {
          detail: {
            preset,
            dateRangeText: text,
            filterProjectId,
            filterStatus,
            filterPriority,
            filterEmployeeId,
          },
        }
      )
    );
  };

  // =========================================================
  // CUSTOM DATE
  // =========================================================

  const handleApplyCustomDate = () => {
    let formatted =
      dateRangeText;

    if (startDate && endDate) {
      const sDate =
        new Date(startDate);

      const eDate =
        new Date(endDate);

      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];

      formatted = `${months[sDate.getMonth()]} ${sDate.getDate()} – ${months[eDate.getMonth()]} ${eDate.getDate()}, ${eDate.getFullYear()}`;

      setDateRangeText(formatted);
      setSelectedPreset('Custom');
    }

    setIsDateRangePickerOpen(false);

    window.dispatchEvent(
      new CustomEvent(
        'worktracker-filter-change',
        {
          detail: {
            preset: 'Custom',
            dateRangeText: formatted,
            startDate,
            endDate,
            filterProjectId,
            filterStatus,
            filterPriority,
            filterEmployeeId,
          },
        }
      )
    );
  };

  // =========================================================
  // LIVE CLOCK
  // =========================================================

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setLiveTime(
        now.toLocaleTimeString(
          'en-US',
          {
            hour12: true,
          }
        )
      );

      setLiveDate(
        now.toLocaleDateString(
          'en-US',
          {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: '2-digit',
          }
        )
      );
    };

    updateTime();

    const interval =
      setInterval(
        updateTime,
        1000
      );

    return () =>
      clearInterval(interval);
  }, []);

  // =========================================================
  // PUNCH TOGGLE
  // =========================================================

  const handlePunchToggle =
    async () => {
      if (isAdmin) return;

      if (isPunching) return;

      if (pendingRequest) {
        alert(
          `You already have a ${
            pendingRequest.request_type === 'punchIn' ? 'Punch In' : 'Punch Out'
          } request pending admin approval.`
        );
        return;
      }

      setIsPunching(true);

      const action =
        isPunchedIn
          ? 'punchOut'
          : 'punchIn';

      try {
        const nextPunchState =
          action === 'punchIn'
            ? await punchService.punchIn(
              {
                reason:
                  'TopNavbar punch in',
              }
            )
            : await punchService.punchOut(
              {
                reason:
                  'TopNavbar punch out',
              }
            );

        setIsPunchedIn(
          nextPunchState.isPunchedIn
        );

        setCanPunchOut(
          nextPunchState.canPunchOut
        );

        setPendingRequest(
          nextPunchState.pendingRequest || null
        );

        window.dispatchEvent(
          new CustomEvent(
            'worktracker-refresh'
          )
        );
      } catch (error: any) {
        console.error(
          'Punch status update failed:',
          error
        );

        /*
         * Server says the employee
         * is outside the configured
         * Punch In / Punch Out window.
         */
        if (
          error?.requiresRequest ||
          error?.requestType
        ) {
          setPunchRequestType(action);
          setPunchRequestMeta({
            message: error?.message,
            currentTime: error?.currentTime,
            startTime:
              action === 'punchIn'
                ? error?.punchInStartTime
                : error?.punchOutStartTime,
            endTime:
              action === 'punchIn'
                ? error?.punchInEndTime
                : error?.punchOutEndTime,
          });
          setIsPunchRequestModalOpen(true);
          return;
        }

        /*
         * Normal validation error.
         */
        alert(
          error?.message ||
          `Failed to ${action === 'punchIn'
            ? 'punch in'
            : 'punch out'}`
        );
      } finally {
        setIsPunching(false);
      }
    };

  // =========================================================
  // LOAD USER + RESOURCES
  // =========================================================

  const loadUserAndResources =
    async () => {
      try {
        // =====================================================
        // CURRENT USER
        // =====================================================

        const response =
          await fetch(
            '/api/auth/me',
            {
              method: 'GET',
              credentials:
                'include',
              cache: 'no-store',
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success ||
          !result.user
        ) {
          setUser(null);
          setIsAdmin(false);
          return;
        }

        const currentUser =
          result.user;

        setUser(
          currentUser
        );

        /*
         * user_role:
         *
         * 1 = Admin
         * 2 = Employee
         */
        const userRole =
          Number(
            currentUser.user_role
          );

        setIsAdmin(
          userRole === 1
        );

        // =====================================================
        // SHARED RESOURCES
        // =====================================================

        const [
          employeesResponse,
          projectsResponse,
          clientsResponse,
        ] = await Promise.all([
          fetch(
            '/api/users/employees',
            {
              method: 'GET',
              credentials:
                'include',
              cache: 'no-store',
            }
          ),

          fetch(
            '/api/projects',
            {
              method: 'GET',
              credentials:
                'include',
              cache: 'no-store',
            }
          ),

          fetch(
            '/api/clients',
            {
              method: 'GET',
              credentials:
                'include',
              cache: 'no-store',
            }
          ),
        ]);

        const [
          employeesResult,
          projectsResult,
          clientsResult,
        ] = await Promise.all([
          employeesResponse.json(),
          projectsResponse.json(),
          clientsResponse.json(),
        ]);

        // =====================================================
        // EMPLOYEES
        // =====================================================

        if (
          employeesResponse.ok &&
          employeesResult.success
        ) {
          setEmployees(
            Array.isArray(
              employeesResult.data
            )
              ? employeesResult.data
              : []
          );
        } else {
          setEmployees([]);
        }

        // =====================================================
        // PROJECTS
        // =====================================================

        if (
          projectsResponse.ok &&
          projectsResult.success
        ) {
          const normalizedProjects =
            (
              Array.isArray(
                projectsResult.data
              )
                ? projectsResult.data
                : []
            )
              .map(
                (project: any) => ({
                  _id: String(
                    project?._id ??
                    project?.id ??
                    project?.project_id ??
                    ''
                  ),

                  name: String(
                    project?.name ??
                    project?.project_name ??
                    project?.title ??
                    ''
                  ),

                  color:
                    project?.color ||
                    '#3b82f6',

                  project_users:
                    Array.isArray(
                      project?.project_users
                    )
                      ? project.project_users
                      : [],
                })
              )
              .filter(
                (project: any) =>
                  project._id &&
                  project.name
              );

          setProjects(
            normalizedProjects
          );
        } else {
          setProjects([]);
        }

        // =====================================================
        // CLIENTS
        // =====================================================

        if (
          clientsResponse.ok &&
          clientsResult.success
        ) {
          setClientsList(
            Array.isArray(
              clientsResult.data
            )
              ? clientsResult.data
              : []
          );
        } else {
          setClientsList([]);
        }

        // =====================================================
        // PUNCH STATUS
        // =====================================================

        // const punch =
        //   await punchService.fetchPunchStatus();

        // setIsPunchedIn(
        //   punch.isPunchedIn
        // );

        // setCanPunchOut(
        //   punch.canPunchOut
        // );
      } catch (error) {
        console.error(
          'Failed to load current user:',
          error
        );

        setUser(null);
        setIsAdmin(false);
      }
    };
  useEffect(() => {
    const loadPunchStatus = async () => {
      const punch =
        await punchService.fetchPunchStatus();

      setIsPunchedIn(
        punch.isPunchedIn
      );

      setCanPunchOut(
        punch.canPunchOut
      );

      setPendingRequest(
        punch.pendingRequest || null
      );
    };

    loadPunchStatus();
  }, []);
  // =========================================================
  // INITIAL LOAD + EVENTS
  // =========================================================

  useEffect(() => {
    loadUserAndResources();

    const handleRefresh =
      () => {
        loadUserAndResources();
      };

    const handleRestoreModal =
      (e: any) => {
        const { type } =
          e.detail || {};

        if (
          type === 'employee'
        ) {
          setIsEmployeeModalOpen(
            true
          );
        }

        if (
          type === 'client'
        ) {
          setIsClientModalOpen(
            true
          );
        }

        if (
          type === 'project'
        ) {
          setIsProjectModalOpen(
            true
          );
        }

        if (type === 'task') {
          if (!isAdmin && projects.length === 0) {
            toast.error('You are not assigned to any project. You cannot create a task.');
            return;
          }
          setIsTaskModalOpen(
            true
          );
        }
      };

    const handlePunchChanged =
      (e: any) => {
        if (e.detail) {
          setIsPunchedIn(
            Boolean(
              e.detail.isPunchedIn
            )
          );

          setCanPunchOut(
            Boolean(
              e.detail.canPunchOut
            )
          );

          setPendingRequest(
            e.detail.pendingRequest || null
          );
        } else {
          loadUserAndResources();
        }
      };

    window.addEventListener(
      'punch-status-changed',
      handlePunchChanged
    );

    window.addEventListener(
      'worktracker-refresh',
      handleRefresh
    );

    window.addEventListener(
      'app-restore-modal',
      handleRestoreModal as EventListener
    );

    return () => {
      window.removeEventListener(
        'punch-status-changed',
        handlePunchChanged
      );

      window.removeEventListener(
        'worktracker-refresh',
        handleRefresh
      );

      window.removeEventListener(
        'app-restore-modal',
        handleRestoreModal as EventListener
      );
    };
  }, [pathname]);

  // =========================================================
  // HIDE ON LOGIN
  // =========================================================

  if (
    !user ||
    pathname === '/login'
  ) {
    return null;
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <>
      {/* =====================================================
          BACKDROP
      ===================================================== */}

      {(
        isCreateMenuOpen ||
        isPresetMenuOpen ||
        isDateRangePickerOpen ||
        isFilterMenuOpen
      ) && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1050,
              background:
                'transparent',
            }}
            onClick={() => {
              setIsCreateMenuOpen(
                false
              );

              setIsPresetMenuOpen(
                false
              );

              setIsDateRangePickerOpen(
                false
              );

              setIsFilterMenuOpen(
                false
              );
            }}
          />
        )}

      {/* =====================================================
          TOP NAVBAR
      ===================================================== */}

      <header
        className="top-navbar no-print"
        style={{
          zIndex: 1060,
        }}
      >
        {/* ===================================================
            LIVE CLOCK
        =================================================== */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background:
              'var(--bg-secondary)',
            border:
              '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '5px 14px',
            boxShadow:
              'var(--shadow-sm)',
          }}
        >
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 850,
              fontFamily:
                'monospace',
              color:
                'var(--accent-primary)',
              letterSpacing:
                '0.5px',
            }}
          >
            {liveTime}
          </span>

          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color:
                'var(--text-secondary)',
            }}
          >
            {liveDate}
          </span>
        </div>

        {/* ===================================================
            RIGHT SIDE
        =================================================== */}

        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          {/* =================================================
              CREATE BUTTON
          ================================================= */}

          <div
            style={{
              position: 'relative',
            }}
          >
            {isAdmin ? (
              <>
                <div
                  style={{
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    borderRadius:
                      '8px',
                    overflow:
                      'hidden',
                    background:
                      '#3b82f6',
                    boxShadow:
                      '0 1px 3px 0 rgba(59, 130, 246, 0.35)',
                    height: '38px',
                  }}
                >
                  {/* CREATE TASK */}

                  <button
                    type="button"
                    onClick={() => {
                      if (!isAdmin && projects.length === 0) {
                        toast.error('You are not assigned to any project. You cannot create a task.');
                        return;
                      }

                      setIsTaskModalOpen(
                        true
                      );

                      setIsCreateMenuOpen(
                        false
                      );
                    }}
                    style={{
                      display:
                        'inline-flex',
                      alignItems:
                        'center',
                      gap: '6px',
                      padding:
                        '0 16px',
                      height:
                        '100%',
                      background:
                        'transparent',
                      border: 'none',
                      color:
                        '#ffffff',
                      fontSize:
                        '0.84rem',
                      cursor:
                        'pointer',
                      transition:
                        'background-color 0.15s ease',
                    }}
                    onMouseEnter={(
                      e
                    ) =>
                    (e.currentTarget.style.backgroundColor =
                      '#2563eb')
                    }
                    onMouseLeave={(
                      e
                    ) =>
                    (e.currentTarget.style.backgroundColor =
                      'transparent')
                    }
                  >
                    <Plus
                      size={16}
                    />

                    <span>
                      Create Task
                    </span>
                  </button>

                  {/* DIVIDER */}

                  <div
                    style={{
                      width: '1px',
                      height: '22px',
                      background:
                        'rgba(255, 255, 255, 0.3)',
                    }}
                  />

                  {/* DROPDOWN */}

                  <button
                    type="button"
                    onClick={(
                      e
                    ) => {
                      e.stopPropagation();

                      setIsCreateMenuOpen(
                        !isCreateMenuOpen
                      );

                      setIsDateRangePickerOpen(
                        false
                      );

                      setIsPresetMenuOpen(
                        false
                      );

                      setIsFilterMenuOpen(
                        false
                      );
                    }}
                    style={{
                      display:
                        'inline-flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      padding:
                        '0 12px',
                      height:
                        '100%',
                      background:
                        'transparent',
                      border: 'none',
                      color:
                        '#ffffff',
                      cursor:
                        'pointer',
                    }}
                  >
                    <ChevronDown
                      size={14}
                    />
                  </button>
                </div>

                {/* CREATE DROPDOWN */}

                {isCreateMenuOpen && (
                  <div
                    style={{
                      position:
                        'absolute',
                      top:
                        'calc(100% + 6px)',
                      right: 0,
                      background:
                        '#ffffff',
                      border:
                        '1px solid #e2e8f0',
                      borderRadius:
                        '10px',
                      boxShadow:
                        '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                      minWidth:
                        '170px',
                      padding:
                        '6px',
                      zIndex:
                        1100,
                      display:
                        'flex',
                      flexDirection:
                        'column',
                      gap: '2px',
                    }}
                  >
                    {/* ADD EMPLOYEE */}

                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMenuOpen(
                          false
                        );

                        setIsEmployeeModalOpen(
                          true
                        );
                      }}
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap: '10px',
                        padding:
                          '9px 12px',
                        border:
                          'none',
                        background:
                          'transparent',
                        borderRadius:
                          '6px',
                        cursor:
                          'pointer',
                        fontSize:
                          '0.82rem',
                        fontWeight:
                          550,
                        color:
                          '#1e293b',
                        textAlign:
                          'left',
                        width:
                          '100%',
                      }}
                      onMouseEnter={(
                        e
                      ) =>
                      (e.currentTarget.style.backgroundColor =
                        '#f1f5f9')
                      }
                      onMouseLeave={(
                        e
                      ) =>
                      (e.currentTarget.style.backgroundColor =
                        'transparent')
                      }
                    >
                      <UserPlus
                        size={15}
                        style={{
                          color:
                            '#3b82f6',
                        }}
                      />

                      <span>
                        Add Employee
                      </span>
                    </button>

                    {/* ADD CLIENT */}

                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMenuOpen(
                          false
                        );

                        setIsClientModalOpen(
                          true
                        );
                      }}
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap: '10px',
                        padding:
                          '9px 12px',
                        border:
                          'none',
                        background:
                          'transparent',
                        borderRadius:
                          '6px',
                        cursor:
                          'pointer',
                        fontSize:
                          '0.82rem',
                        fontWeight:
                          550,
                        color:
                          '#1e293b',
                        textAlign:
                          'left',
                        width:
                          '100%',
                      }}
                      onMouseEnter={(
                        e
                      ) =>
                      (e.currentTarget.style.backgroundColor =
                        '#f1f5f9')
                      }
                      onMouseLeave={(
                        e
                      ) =>
                      (e.currentTarget.style.backgroundColor =
                        'transparent')
                      }
                    >
                      <Building2
                        size={15}
                        style={{
                          color:
                            '#10b981',
                        }}
                      />

                      <span>
                        Add Client
                      </span>
                    </button>

                    {/* NEW PROJECT */}

                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMenuOpen(
                          false
                        );

                        setIsProjectModalOpen(
                          true
                        );
                      }}
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap: '10px',
                        padding:
                          '9px 12px',
                        border:
                          'none',
                        background:
                          'transparent',
                        borderRadius:
                          '6px',
                        cursor:
                          'pointer',
                        fontSize:
                          '0.82rem',
                        fontWeight:
                          550,
                        color:
                          '#1e293b',
                        textAlign:
                          'left',
                        width:
                          '100%',
                      }}
                      onMouseEnter={(
                        e
                      ) =>
                      (e.currentTarget.style.backgroundColor =
                        '#f1f5f9')
                      }
                      onMouseLeave={(
                        e
                      ) =>
                      (e.currentTarget.style.backgroundColor =
                        'transparent')
                      }
                    >
                      <FolderPlus
                        size={15}
                        style={{
                          color:
                            '#8b5cf6',
                        }}
                      />

                      <span>
                        New Project
                      </span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* =================================================
                 EMPLOYEE CREATE TASK
              ================================================= */

              <button
                type="button"
                onClick={() => {
                  if (
                    !isPunchedIn
                  ) {
                    alert(
                      'You are currently in View-Only mode because you are punched out. Please punch in first to create tasks.'
                    );

                    return;
                  }

                  if (projects.length === 0) {
                    toast.error('You are not assigned to any project. You cannot create a task.');
                    return;
                  }

                  setIsTaskModalOpen(
                    true
                  );
                }}
                style={{
                  display:
                    'inline-flex',
                  alignItems:
                    'center',
                  gap: '6px',
                  padding:
                    '0 16px',
                  height: '38px',
                  borderRadius:
                    '8px',
                  background:
                    !isPunchedIn
                      ? '#94a3b8'
                      : '#3b82f6',
                  border: 'none',
                  color:
                    '#ffffff',
                  fontSize:
                    '0.84rem',
                  cursor:
                    !isPunchedIn
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    !isPunchedIn
                      ? 0.75
                      : 1,
                  boxShadow:
                    '0 1px 3px 0 rgba(59, 130, 246, 0.35)',
                  transition:
                    'all 0.15s ease',
                }}
                title={
                  !isPunchedIn
                    ? 'View-Only Mode: Punch in to create tasks'
                    : 'Create Task'
                }
                onMouseEnter={(
                  e
                ) => {
                  if (
                    isPunchedIn
                  ) {
                    e.currentTarget.style.backgroundColor =
                      '#2563eb';
                  }
                }}
                onMouseLeave={(
                  e
                ) => {
                  if (
                    isPunchedIn
                  ) {
                    e.currentTarget.style.backgroundColor =
                      '#3b82f6';
                  }
                }}
              >
                <Plus
                  size={16}
                />

                <span>
                  Create Task
                </span>
              </button>
            )}
          </div>

          {/* =================================================
              VIEW MODE
          ================================================= */}

          {/* {!isAdmin &&
            !isPunchedIn && (
              <div
                title="You are currently punched out. All actions are in View-Only mode."
                style={{
                  display:
                    'inline-flex',
                  alignItems:
                    'center',
                  gap: '5px',
                  padding:
                    '0 10px',
                  height: '38px',
                  borderRadius:
                    '8px',
                  background:
                    '#fffbeb',
                  color:
                    '#b45309',
                  border:
                    '1px solid #fde68a',
                  fontSize:
                    '0.78rem',
                  fontWeight:
                    650,
                  userSelect:
                    'none',
                }}
              >
                <span>
                  View Mode
                </span>
              </div>
            )} */}

          {/* =================================================
              EMPLOYEE PUNCH
          ================================================= */}

          {!isAdmin && (
            <button
              type="button"
              onClick={
                handlePunchToggle
              }
              disabled={
                isPunching ||
                Boolean(pendingRequest)
              }
              title={
                isPunching
                  ? 'Processing...'
                  : pendingRequest
                    ? `${
                        pendingRequest.request_type === 'punchIn'
                          ? 'Punch In'
                          : 'Punch Out'
                      } request is pending admin approval`
                    : isPunchedIn
                      ? 'Punch Out'
                      : 'Punch In'
              }
              style={{
                display:
                  'inline-flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                gap: '7px',
                height: '38px',
                padding:
                  '0 14px',
                borderRadius:
                  '8px',
                background: pendingRequest
                  ? '#fef3c7'
                  : isPunchedIn
                    ? '#fff1f2'
                    : '#ecfdf5',
                color: pendingRequest
                  ? '#b45309'
                  : isPunchedIn
                    ? '#be123c'
                    : '#047857',
                border: pendingRequest
                  ? '1px solid #fde68a'
                  : isPunchedIn
                    ? '1px solid #fecdd3'
                    : '1px solid #a7f3d0',
                fontSize:
                  '0.82rem',
                fontWeight:
                  650,
                cursor:
                  isPunching ||
                  Boolean(pendingRequest)
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  isPunching ||
                  Boolean(pendingRequest)
                    ? 0.7
                    : 1,
                transition:
                  'all 0.15s ease',
                boxShadow:
                  '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              <Clock size={15} />
              <span>
                {pendingRequest
                  ? `${
                      pendingRequest.request_type === 'punchIn'
                        ? 'Punch In'
                        : 'Punch Out'
                    } (Pending)`
                  : isPunchedIn
                    ? 'Punch Out'
                    : 'Punch In'}
              </span>
            </button>
          )}

          {/* =================================================
              NOTIFICATION CENTER
          ================================================= */}

          <NotificationCenter />
        </div>
      </header>

      {/* =====================================================
          ADD EMPLOYEE
      ===================================================== */}

      <AddTeamMemberModal
        isOpen={
          isEmployeeModalOpen
        }
        onClose={() =>
          setIsEmployeeModalOpen(
            false
          )
        }
        projectsList={
          projects
        }
        onSuccess={async () => {
          await loadUserAndResources();

          window.dispatchEvent(
            new CustomEvent(
              'worktracker-refresh'
            )
          );
        }}
      />

      {/* =====================================================
          ADD CLIENT
      ===================================================== */}

      <CreateClientModal
        isOpen={
          isClientModalOpen
        }
        onClose={() =>
          setIsClientModalOpen(
            false
          )
        }
        projectsOptions={
          projects
        }
        onSuccess={async () => {
          await loadUserAndResources();

          window.dispatchEvent(
            new CustomEvent(
              'worktracker-refresh'
            )
          );
        }}
      />

      {/* =====================================================
          CREATE PROJECT
      ===================================================== */}

      <CreateProjectModal
        isOpen={
          isProjectModalOpen
        }
        onClose={() =>
          setIsProjectModalOpen(
            false
          )
        }
        clientsList={
          clientsList
        }
        employeesList={
          employees
        }
        onSuccess={async () => {
          await loadUserAndResources();

          window.dispatchEvent(
            new CustomEvent(
              'worktracker-refresh'
            )
          );
        }}
      />

      {/* =====================================================
          CREATE TASK
      ===================================================== */}

      <CreateTaskModal
        isOpen={
          isTaskModalOpen
        }
        onClose={() =>
          setIsTaskModalOpen(
            false
          )
        }
        user={user}
        projectsOptions={
          projects
        }
        employeesList={
          employees
        }
      />

      {/* =====================================================
          PUNCH REQUEST MODAL
      ===================================================== */}

      <PunchRequestModal
        isOpen={isPunchRequestModalOpen}
        onClose={() => setIsPunchRequestModalOpen(false)}
        requestType={punchRequestType}
        message={punchRequestMeta.message}
        currentTime={punchRequestMeta.currentTime}
        startTime={punchRequestMeta.startTime}
        endTime={punchRequestMeta.endTime}
        onSuccess={async () => {
          const punch = await punchService.fetchPunchStatus();
          setIsPunchedIn(punch.isPunchedIn);
          setCanPunchOut(punch.canPunchOut);
          setPendingRequest(punch.pendingRequest || null);
        }}
      />
    </>
  );
}