'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Loader2, X } from 'lucide-react';
import { CustomDatePicker, CustomDropdown } from '@/components/TaskFormControls';

type AttendanceRequest = {
  _id: string;
  attendance_date: string;
  request_type: 'punchIn' | 'punchOut';
  reason: string;
  requested_punch_at: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejection_reason?: string | null;
  employee_id?: {
    _id?: string;
    full_name?: string;
    email?: string;
    designation?: string;
  } | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AttendanceRequestsPanel() {
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [employeeList, setEmployeeList] = useState<
    Array<{ _id: string; full_name?: string; email?: string }>
  >([]);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/attendance/requests', {
        credentials: 'include',
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Failed to load attendance requests.'
        );
      }

      setRequests(Array.isArray(result.data) ? result.data : []);
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          'Failed to load attendance requests.'
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    fetch('/api/users/employees')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setEmployeeList(json.data);
        }
      })
      .catch(() => { });
  }, []);

  const employeeOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string }>();

    // From employee API
    employeeList.forEach((emp) => {
      const id = String(emp._id || emp.email || '');
      if (id) {
        map.set(id, {
          id,
          name: emp.full_name || emp.email || 'Employee',
          email: emp.email,
        });
      }
    });

    // From loaded requests
    requests.forEach((req) => {
      const emp = req.employee_id;
      if (emp) {
        const id = String(emp._id || emp.email || emp.full_name || '');
        if (id && !map.has(id)) {
          map.set(id, {
            id,
            name: emp.full_name || emp.email || 'Employee',
            email: emp.email,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [employeeList, requests]);

  const employeeDropdownOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Employees' },
      ...employeeOptions.map((emp) => ({
        value: emp.id,
        label: emp.name + (emp.email ? ` (${emp.email})` : ''),
      })),
    ];
  }, [employeeOptions]);

  const actionDropdownOptions = useMemo(
    () => [
      { value: 'all', label: 'All Actions' },
      { value: 'punchIn', label: 'Punch In' },
      { value: 'punchOut', label: 'Punch Out' },
    ],
    []
  );

  const hasActiveFilters =
    filterEmployee !== 'all' ||
    filterDate !== '' ||
    filterAction !== 'all';

  const resetFilters = () => {
    setFilterEmployee('all');
    setFilterDate('');
    setFilterAction('all');
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Employee filter
      if (filterEmployee !== 'all') {
        const empId = req.employee_id?._id ? String(req.employee_id._id).toLowerCase() : '';
        const empEmail = req.employee_id?.email ? String(req.employee_id.email).toLowerCase() : '';
        const empName = req.employee_id?.full_name ? String(req.employee_id.full_name).toLowerCase() : '';
        const selected = filterEmployee.toLowerCase();

        const matches =
          (empId && empId === selected) ||
          (empEmail && empEmail === selected) ||
          (empName && empName === selected);

        if (!matches) return false;
      }

      // Date filter
      if (filterDate) {
        const matchesDate =
          req.attendance_date === filterDate ||
          (Boolean(req.requested_punch_at) &&
            String(req.requested_punch_at).startsWith(filterDate));
        if (!matchesDate) return false;
      }

      // Action filter
      if (filterAction !== 'all') {
        if (req.request_type !== filterAction) return false;
      }

      return true;
    });
  }, [requests, filterEmployee, filterDate, filterAction]);

  const closeRejectModal = () => {
    if (processingId) return;

    setShowRejectModal(false);
    setSelectedRequest(null);
    setRejectionReason('');
    setRejectError(null);
  };

  const openRejectModal = (request: AttendanceRequest) => {
    if (processingId) return;

    setSelectedRequest(request);
    setRejectionReason('');
    setRejectError(null);
    setShowRejectModal(true);
  };

  const reviewRequest = async (
    request: AttendanceRequest,
    action: 'approve' | 'reject',
    reason = ''
  ) => {
    try {
      setProcessingId(request._id);
      setError(null);

      const response = await fetch(
        `/api/attendance/request/${request._id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action,
            rejectionReason: reason,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          'Failed to review attendance request.'
        );
      }

      await loadRequests();

      window.dispatchEvent(
        new CustomEvent('worktracker-refresh')
      );

      if (action === 'reject') {
        setShowRejectModal(false);
        setSelectedRequest(null);
        setRejectionReason('');
        setRejectError(null);
      }
    } catch (requestError: unknown) {
      const message = getErrorMessage(
        requestError,
        'Failed to review attendance request.'
      );

      if (action === 'reject') {
        setRejectError(message);
      } else {
        setError(message);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    const reason = rejectionReason.trim();

    if (!reason) {
      setRejectError('Please enter a rejection reason.');
      return;
    }

    if (!selectedRequest) return;

    await reviewRequest(
      selectedRequest,
      'reject',
      reason
    );
  };

  return (
    <div
      className="card"
      style={{
        marginTop: '20px',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px',
          marginBottom: '12px',
        }}
      >
        <div>
          <h3
            className="card-title"
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              marginBottom: '4px',
            }}
          >
            Attendance Requests
          </h3>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.76rem',
              margin: 0,
            }}
          >
            Review employee requests submitted outside the configured
            punch window.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          type="button"
          onClick={loadRequests}
          disabled={loading}
          style={{ gap: '6px' }}
        >
          {loading ? (
            <Loader2
              size={13}
              className="animate-spin"
            />
          ) : (
            <Clock3 size={13} />
          )}
          Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'flex-end',
          padding: '12px 14px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--border-radius-sm, 6px)',
          border: '1px solid var(--border-color)',
          marginBottom: '16px',
        }}
      >
        <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 700,
              marginBottom: '5px',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Employee
          </label>
          <CustomDropdown
            value={filterEmployee}
            onChange={(val) => setFilterEmployee(val)}
            options={employeeDropdownOptions}
            placeholder="Select employee"
          />
        </div>

        <div style={{ flex: '1 1 160px', minWidth: '160px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 700,
              marginBottom: '5px',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Date
          </label>
          <CustomDatePicker
            value={filterDate}
            onChange={(val) => setFilterDate(val)}
            placeholder="Select date"
          />
        </div>

        <div style={{ flex: '1 1 160px', minWidth: '150px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 700,
              marginBottom: '5px',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Action
          </label>
          <CustomDropdown
            value={filterAction}
            onChange={(val) => setFilterAction(val)}
            options={actionDropdownOptions}
            placeholder="Select action"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={resetFilters}
            style={{
              height: '36px',
              fontSize: '0.78rem',
              padding: '0 14px',
              whiteSpace: 'nowrap',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <p
          style={{
            color: '#b91c1c',
            fontSize: '0.8rem',
            marginBottom: '12px',
          }}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p
          style={{
            color: 'var(--text-muted)',
            padding: '18px 0',
            textAlign: 'center',
          }}
        >
          Loading requests...
        </p>
      ) : requests.length === 0 ? (
        <p
          style={{
            color: 'var(--text-muted)',
            padding: '18px 0',
            textAlign: 'center',
          }}
        >
          No attendance requests found.
        </p>
      ) : filteredRequests.length === 0 ? (
        <div
          style={{
            color: 'var(--text-muted)',
            padding: '24px 0',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            No attendance requests match the selected filters.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={resetFilters}
            style={{
              marginTop: '10px',
              fontSize: '0.75rem',
              padding: '4px 12px',
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Action</th>
                <th>Date / Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Review</th>
              </tr>
            </thead>

            <tbody>
              {filteredRequests.map((request) => {
                const isPending =
                  request.status === 'Pending';

                const isProcessing =
                  processingId === request._id;

                return (
                  <tr key={request._id}>
                    <td>
                      <strong>
                        {request.employee_id?.full_name ||
                          'Unknown employee'}
                      </strong>

                      <div
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.72rem',
                        }}
                      >
                        {request.employee_id?.email || ''}
                      </div>
                    </td>

                    <td>
                      {request.request_type === 'punchIn'
                        ? 'Punch In'
                        : 'Punch Out'}
                    </td>

                    <td>
                      {request.attendance_date}

                      <div
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.72rem',
                        }}
                      >
                        {new Date(
                          request.requested_punch_at
                        ).toLocaleTimeString()}
                      </div>
                    </td>

                    <td
                      style={{
                        maxWidth: '220px',
                        whiteSpace: 'normal',
                      }}
                    >
                      {request.reason}
                    </td>

                    <td>
                      {request.status}


                    </td>

                    <td>
                      {isPending ? (
                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                          }}
                        >
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() =>
                              reviewRequest(
                                request,
                                'approve'
                              )
                            }
                            disabled={isProcessing}
                            title="Approve request"
                            style={{
                              padding: '6px 8px',
                            }}
                          >
                            Approve
                            {isProcessing ? (
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                            ) : (
                              
                            <Check size={13} />
                            )}
                          </button>

                          <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={() =>
                              openRejectModal(request)
                            }
                            disabled={
                              Boolean(processingId)
                            }
                            title="Reject request"
                            style={{
                              padding: '6px 8px',
                              color: '#b91c1c',
                            }}
                          >
                            Reject <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {request.rejection_reason ? (
                            <div
                              style={{
                                color: '#b91c1c',
                                fontSize: '0.72rem',
                              }}
                            >
                              {request.rejection_reason}
                            </div>
                          ) : '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && selectedRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-attendance-title"
          onClick={closeRejectModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="card"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '22px',
              position: 'relative',
              boxShadow:
                '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '18px',
              }}
            >
              <div>
                <h3
                  id="reject-attendance-title"
                  style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: 800,
                  }}
                >
                  Reject Attendance Request
                </h3>

                <p
                  style={{
                    margin: '6px 0 0',
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem',
                  }}
                >
                  {selectedRequest.employee_id
                    ?.full_name ||
                    'Unknown employee'}{' '}
                  ·{' '}
                  {selectedRequest.request_type ===
                    'punchIn'
                    ? 'Punch In'
                    : 'Punch Out'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeRejectModal}
                disabled={Boolean(processingId)}
                aria-label="Close"
                style={{
                  width: '32px',
                  height: '32px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={17} />
              </button>
            </div>

            <label
              htmlFor="attendance-rejection-reason"
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '7px',
              }}
            >
              Rejection Reason <span style={{ color: '#dc2626' }}>*</span>
            </label>

            <textarea
              id="attendance-rejection-reason"
              value={rejectionReason}
              onChange={(event) => {
                setRejectionReason(event.target.value);
                if (rejectError) {
                  setRejectError(null);
                }
              }}
              placeholder="Enter the reason for rejecting this request..."
              rows={5}
              autoFocus
              disabled={Boolean(processingId)}
              style={{
                width: '100%',
                resize: 'vertical',
                minHeight: '120px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '11px 12px',
                fontSize: '0.84rem',
                outline: 'none',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box',
              }}
            />

            {rejectError && (
              <p
                style={{
                  margin: '7px 0 0',
                  color: '#b91c1c',
                  fontSize: '0.76rem',
                }}
              >
                {rejectError}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '18px',
              }}
            >
              <button
                className="btn btn-secondary"
                type="button"
                onClick={closeRejectModal}
                disabled={Boolean(processingId)}
              >
                Cancel
              </button>

              <button
                className="btn btn-primary"
                type="button"
                onClick={handleRejectSubmit}
                disabled={
                  Boolean(processingId) ||
                  !rejectionReason.trim()
                }
                style={{
                  background: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#fff',
                  minWidth: '125px',
                }}
              >
                {processingId ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <X size={14} />
                    Reject Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
