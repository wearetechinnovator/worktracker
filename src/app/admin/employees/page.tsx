'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import {
  UserPlus,
  Mail,
  Edit3,
  Trash2,
  AlertCircle,
  Clock,
  Briefcase,
} from 'lucide-react';

import { formatMinutesToDuration } from '@/lib/time';
import EmployeeAttendanceCalendarModal from '@/components/EmployeeAttendanceCalendarModal';
import AddTeamMemberModal from '@/components/AddTeamMemberModal';
import PageShimmer from '@/components/PageShimmer';
import { toast } from '@/lib/toast';

type Employee = {
  _id: string;

  full_name: string;
  email: string;

  phone_number?: number | null;

  profile_picture?: string | null;

  designation?: string | null;

  group?: string | null;

  user_role: number;

  isVerify?: boolean;

  status?: boolean;

  createdAt?: string;
  updatedAt?: string;

  // Attendance data if API provides it
  totalMinutes?: number;

  todayAttendance?: {
    allowPunchInDate?: string;
    allowPunchOutDate?: string;
  };
};

export default function EmployeesPage() {
  const [user, setUser] = useState<any>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [isAddModalOpen, setIsAddModalOpen] =
    useState(false);

  const [isEditModalOpen, setIsEditModalOpen] =
    useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] =
    useState(false);

  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);

  const ITEMS_PER_PAGE = 10;

  /*
   * =========================================================
   * GET CURRENT USER
   * =========================================================
   */

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      const result = await response.json();

      if (
        !response.ok ||
        !result.success ||
        !result.user
      ) {
        throw new Error(
          result.message ||
            'Authentication required'
        );
      }

      setUser(result.user);

      return result.user;
    } catch (error) {
      console.error(
        'Failed to fetch current user:',
        error
      );

      setUser(null);

      throw error;
    }
  }, []);

  /*
   * =========================================================
   * GET EMPLOYEES FROM DATABASE
   * =========================================================
   */

  const fetchEmployees = useCallback(async () => {
  try {
    setLoading(true);

    const response = await fetch(
      "/api/users/employees",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to load employees"
      );
    }

    setEmployees(result.data || []);
  } catch (error: any) {
    console.error("Failed to fetch employees:", error);
    setError(
      error.message || "Failed to load employees"
    );
  } finally {
    setLoading(false);
  }
}, []);

  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */

  useEffect(() => {
    const initializePage = async () => {
      try {
        const currentUser =
          await fetchCurrentUser();

        /*
         * Only fetch employees after
         * authentication is confirmed.
         */
        if (currentUser) {
          await fetchEmployees();
        }
      } catch {
        setLoading(false);
        setError(
          'Authentication required'
        );
      }
    };

    initializePage();
  }, [
    fetchCurrentUser,
    fetchEmployees,
  ]);

  /*
   * =========================================================
   * OPEN EMPLOYEE FROM URL
   * /employees?select=<employeeId>
   * =========================================================
   */

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      employees.length === 0
    ) {
      return;
    }

    const selectId =
      new URLSearchParams(
        window.location.search
      ).get('select');

    if (!selectId) {
      return;
    }

    const matchedEmployee =
      employees.find(
        (employee) =>
          String(employee._id) ===
          String(selectId)
      );

    if (matchedEmployee) {
      setSelectedEmployee(
        matchedEmployee
      );

      setIsDetailModalOpen(true);
    }
  }, [employees]);

  /*
   * =========================================================
   * EMPLOYEES
   *
   * API already returns:
   * user_role: 2
   * current user excluded
   *
   * So DO NOT filter using:
   * emp.role
   * emp.userType
   * emp.name
   * =========================================================
   */

  const filteredEmployees = useMemo(() => {
    return employees;
  }, [employees]);

  /*
   * =========================================================
   * PAGINATION
   * =========================================================
   */

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(
        filteredEmployees.length /
          ITEMS_PER_PAGE
      )
    );

    if (
      currentPage > totalPages
    ) {
      setCurrentPage(totalPages);
    }
  }, [
    filteredEmployees.length,
    currentPage,
  ]);

  const paginatedEmployees =
    filteredEmployees.slice(
      (currentPage - 1) *
        ITEMS_PER_PAGE,
      currentPage *
        ITEMS_PER_PAGE
    );

  /*
   * =========================================================
   * EDIT
   * =========================================================
   */

  const openEditModal = (
    employee: Employee
  ) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };

  /*
   * =========================================================
   * DETAILS
   * =========================================================
   */

  const openEmployeeDetails = (
    employee: Employee
  ) => {
    setSelectedEmployee(employee);
    setIsDetailModalOpen(true);
  };

  /*
   * =========================================================
   * DELETE
   *
   * NOTE:
   * This UI handler currently removes from state.
   * Connect DELETE API here when your delete endpoint
   * is ready.
   * =========================================================
   */
const handleDelete = async (empId: string) => {
  const emp = employees.find(
    (e) => String(e._id) === String(empId)
  );

  const empName =
    (emp as any)?.full_name ||
    (emp as any)?.name ||
    "Employee";

  if (
    !confirm(
      `Are you sure you want to delete ${empName}? This action is irreversible.`
    )
  ) {
    return;
  }

  try {
    const response = await fetch(
      `/api/users/employees?id=${encodeURIComponent(empId)}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Failed to delete employee"
      );
    }

    setEmployees((prev) =>
      prev.filter(
        (e) => String(e._id) !== String(empId)
      )
    );

    toast.success(
      `${empName} deleted successfully`
    );
  } catch (error: any) {
    console.error("Delete employee error:", error);

    toast.error(
      error.message || "Failed to delete employee"
    );
  }
};
  /*
   * =========================================================
   * PUNCH OVERRIDE
   * =========================================================
   */

  const handleTogglePunchOverride =
    async (
      employeeId: string,
      action:
        | 'allowPunchIn'
        | 'allowPunchOut'
    ) => {
      try {
        /*
         * TODO:
         * Connect this to attendance API.
         */

        console.log(
          'Punch override',
          employeeId,
          action
        );

        toast.success(
          `Permission updated for ${action}`
        );
      } catch (error) {
        console.error(
          'Punch override error:',
          error
        );

        toast.error(
          'Failed to update permission'
        );
      }
    };

  /*
   * =========================================================
   * PAGINATION UI
   * =========================================================
   */

  const renderPagination = (
    totalItems: number,
    itemsPerPage: number,
    page: number,
    onPageChange: (
      page: number
    ) => void
  ) => {
    const totalPages = Math.ceil(
      totalItems / itemsPerPage
    );

    if (totalPages <= 1) {
      return null;
    }

    return (
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          marginTop: '20px',
          padding: '12px 16px',
          background:
            'var(--bg-secondary)',
          borderRadius: '8px',
          border:
            '1px solid var(--border-color)',
          width: '100%',
          gridColumn: '1 / -1',
        }}
        className="no-print"
      >
        <div
          style={{
            fontSize: '0.8rem',
            color:
              'var(--text-secondary)',
          }}
        >
          Showing{' '}
          <strong>
            {totalItems === 0
              ? 0
              : (page - 1) *
                  itemsPerPage +
                1}
            -
            {Math.min(
              totalItems,
              page * itemsPerPage
            )}
          </strong>{' '}
          of{' '}
          <strong>
            {totalItems}
          </strong>{' '}
          entries
        </div>

        <div
          style={{
            display: 'flex',
            gap: '6px',
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={() =>
              onPageChange(page - 1)
            }
            disabled={page === 1}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              opacity:
                page === 1 ? 0.5 : 1,
            }}
          >
            Previous
          </button>

          {Array.from({
            length: totalPages,
          }).map((_, index) => {
            const pageNumber =
              index + 1;

            if (
              pageNumber === 1 ||
              pageNumber ===
                totalPages ||
              Math.abs(
                pageNumber - page
              ) <= 1
            ) {
              return (
                <button
                  key={pageNumber}
                  className={
                    page === pageNumber
                      ? 'btn btn-primary'
                      : 'btn btn-secondary'
                  }
                  onClick={() =>
                    onPageChange(
                      pageNumber
                    )
                  }
                  style={{
                    padding:
                      '4px 10px',
                    fontSize:
                      '0.75rem',
                  }}
                >
                  {pageNumber}
                </button>
              );
            }

            if (
              pageNumber === 2 ||
              pageNumber ===
                totalPages - 1
            ) {
              return (
                <span
                  key={pageNumber}
                  style={{
                    color:
                      'var(--text-muted)',
                    alignSelf:
                      'center',
                    padding:
                      '0 4px',
                  }}
                >
                  ...
                </span>
              );
            }

            return null;
          })}

          <button
            className="btn btn-secondary"
            onClick={() =>
              onPageChange(page + 1)
            }
            disabled={
              page === totalPages
            }
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              opacity:
                page === totalPages
                  ? 0.5
                  : 1,
            }}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (
    loading &&
    employees.length === 0
  ) {
    return (
      <PageShimmer variant="employees" />
    );
  }

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
            }}
          >
            Team Directory
          </h1>

          <p>
            See your employees and
            their details here
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() =>
            setIsAddModalOpen(true)
          }
        >
          <UserPlus size={14} />

          <span>
            Add Employee
          </span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="card"
          style={{
            borderLeft:
              '4px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <AlertCircle
            style={{
              color: '#ef4444',
            }}
          />

          <p
            style={{
              fontWeight: 650,
            }}
          >
            {error}
          </p>
        </div>
      )}

      {/* Employee Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px',
        }}
      >
        {filteredEmployees.length ===
        0 ? (
          <p
            style={{
              color:
                'var(--text-muted)',
              textAlign: 'center',
              padding: '32px',
              gridColumn: '1 / -1',
            }}
          >
            No registered employees
            found. Click Add Employee
            to create one.
          </p>
        ) : (
          paginatedEmployees.map(
            (employee) => {
              const employeeName =
                employee.full_name ||
                'Employee';

              const initials =
                employeeName
                  .split(' ')
                  .filter(Boolean)
                  .map(
                    (part) =>
                      part[0]
                  )
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

              const today =
                new Date()
                  .toISOString()
                  .split('T')[0];

              const allowPunchIn =
                employee
                  .todayAttendance
                  ?.allowPunchInDate ===
                today;

              const allowPunchOut =
                employee
                  .todayAttendance
                  ?.allowPunchOutDate ===
                today;

              const isActive =
                employee.status !==
                false;

              return (
                <div
                  key={employee._id}
                  className="card"
                  onClick={() =>
                    openEmployeeDetails(
                      employee
                    )
                  }
                  style={{
                    display: 'flex',
                    flexDirection:
                      'column',
                    justifyContent:
                      'space-between',
                    gap: '12px',
                    cursor:
                      'pointer',
                  }}
                >
                  <div>
                    {/* Avatar + Status */}
                    <div
                      style={{
                        display:
                          'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'flex-start',
                      }}
                    >
                      <div
                        className="avatar"
                        style={{
                          width: '36px',
                          height: '36px',
                          fontSize:
                            '0.95rem',
                          overflow:
                            'hidden',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                        }}
                      >
                        {employee.profile_picture ? (
                          <img
                            src={
                              employee.profile_picture
                            }
                            alt={
                              employeeName
                            }
                            style={{
                              width:
                                '100%',
                              height:
                                '100%',
                              objectFit:
                                'cover',
                            }}
                          />
                        ) : (
                          initials
                        )}
                      </div>

                      <span
                        className={`badge-status ${
                          isActive
                            ? 'active'
                            : 'inactive'
                        }`}
                      >
                        {isActive
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </div>

                    {/* Employee Information */}
                    <div
                      style={{
                        marginTop:
                          '10px',
                      }}
                    >
                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '4px',
                          flexWrap:
                            'wrap',
                        }}
                      >
                        <h3
                          style={{
                            fontSize:
                              '0.85rem',
                            fontWeight:
                              800,
                          }}
                        >
                          {
                            employeeName
                          }
                        </h3>

                        <div
                          style={{
                            display:
                              'flex',
                            gap: '4px',
                            marginTop:
                              '2px',
                            flexWrap:
                              'wrap',
                          }}
                        >
                          <span
                            className="tag-badge"
                            style={{
                              fontSize:
                                '0.50rem',
                            }}
                          >
                            Employee
                          </span>

                          {employee.group && (
                            <span
                              className="tag-badge"
                              style={{
                                fontSize:
                                  '0.50rem',
                              }}
                            >
                              {
                                employee.group
                              }
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Designation */}
                      <p
                        style={{
                          color:
                            'var(--text-secondary)',
                          fontSize:
                            '0.75rem',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '6px',
                          marginTop:
                            '6px',
                        }}
                      >
                        <Briefcase
                          size={12}
                          style={{
                            color:
                              'var(--text-muted)',
                          }}
                        />

                        {employee.designation ||
                          'Employee'}
                      </p>

                      {/* Email */}
                      <p
                        style={{
                          color:
                            'var(--text-muted)',
                          fontSize:
                            '0.72rem',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '6px',
                          marginTop:
                            '4px',
                        }}
                      >
                        <Mail
                          size={12}
                        />

                        {employee.email}
                      </p>

                      {/* Punch Override */}
                      <div
                        style={{
                          display:
                            'flex',
                          gap: '6px',
                          marginTop:
                            '12px',
                        }}
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <button
                          type="button"
                          className="btn"
                          style={{
                            fontSize:
                              '0.65rem',
                            padding:
                              '4px 8px',
                            fontWeight:
                              700,
                            background:
                              allowPunchIn
                                ? '#dcfce7'
                                : '#15803d',
                            color:
                              allowPunchIn
                                ? '#15803d'
                                : '#dcfce7',
                            border:
                              '1px solid ' +
                              (allowPunchIn
                                ? '#86efac'
                                : 'var(--border-color)'),
                          }}
                          onClick={() =>
                            handleTogglePunchOverride(
                              employee._id,
                              'allowPunchIn'
                            )
                          }
                        >
                          {allowPunchIn
                            ? '✓ In Allowed'
                            : 'Allow In'}
                        </button>

                        <button
                          type="button"
                          className="btn"
                          style={{
                            fontSize:
                              '0.65rem',
                            padding:
                              '4px 8px',
                            fontWeight:
                              700,
                            background:
                              allowPunchOut
                                ? '#fee2e2'
                                : '#b91c1c',
                            color:
                              allowPunchOut
                                ? '#b91c1c'
                                : '#fee2e2',
                            border:
                              '1px solid ' +
                              (allowPunchOut
                                ? '#fca5a5'
                                : 'var(--border-color)'),
                          }}
                          onClick={() =>
                            handleTogglePunchOverride(
                              employee._id,
                              'allowPunchOut'
                            )
                          }
                        >
                          {allowPunchOut
                            ? '✓ Out Allowed'
                            : 'Allow Out'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      borderTop:
                        '1px solid var(--border-color)',
                      paddingTop:
                        '10px',
                      display:
                        'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'center',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize:
                            '0.65rem',
                          color:
                            'var(--text-muted)',
                          fontWeight:
                            700,
                          textTransform:
                            'uppercase',
                          display:
                            'block',
                        }}
                      >
                        TOTAL TIME
                      </span>

                      <span
                        style={{
                          fontWeight:
                            800,
                          color:
                            'var(--accent-primary)',
                          fontSize:
                            '0.95rem',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '4px',
                          marginTop:
                            '2px',
                        }}
                      >
                        <Clock
                          size={12}
                        />

                        {formatMinutesToDuration(
                          employee.totalMinutes ??
                            0
                        )}
                      </span>
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        display:
                          'flex',
                        gap: '4px',
                      }}
                      className="no-print"
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      <button
                        type="button"
                        className="action-btn"
                        title="Edit Employee"
                        onClick={() =>
                          openEditModal(
                            employee
                          )
                        }
                        style={{
                          backgroundColor:
                            '#cdfe9c',
                        }}
                      >
                        <Edit3
                          size={12}
                        />
                      </button>

                      <button
                        type="button"
                        className="action-btn btn-delete-item"
                        title="Delete Employee"
                        onClick={() =>
                          handleDelete(
                            employee._id
                          )
                        }
                        style={{
                          backgroundColor:
                            '#f38686',
                        }}
                      >
                        <Trash2
                          size={12}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          )
        )}

        {/* Pagination */}
        {renderPagination(
          filteredEmployees.length,
          ITEMS_PER_PAGE,
          currentPage,
          setCurrentPage
        )}
      </div>

      {/* Details Modal */}
      <EmployeeAttendanceCalendarModal
        employee={
          selectedEmployee as any
        }
        isOpen={
          isDetailModalOpen
        }
        onClose={() =>
          setIsDetailModalOpen(false)
        }
      />

      {/* Add Employee */}
      <AddTeamMemberModal
        isOpen={
          isAddModalOpen
        }
        onClose={() =>
          setIsAddModalOpen(false)
        }
        onSuccess={async () => {
          setIsAddModalOpen(false);
          await fetchEmployees();
        }}
      />

      {/* Edit Employee */}
      <AddTeamMemberModal
        isOpen={
          isEditModalOpen
        }
        mode="edit"
        employee={
          selectedEmployee as any
        }
        onClose={() =>
          setIsEditModalOpen(false)
        }
        onSuccess={async () => {
          setIsEditModalOpen(false);
          await fetchEmployees();
        }}
      />
    </div>
  );
}