'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from 'react';
import { Check, Clock3, Loader2, X } from 'lucide-react';

type AttendanceRequest = {
  _id: string;
  attendance_date: string;
  request_type: 'punchIn' | 'punchOut';
  reason: string;
  requested_punch_at: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejection_reason?: string | null;
  employee_id?: {
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
        throw new Error(result.message || 'Failed to load attendance requests.');
      }
      setRequests(Array.isArray(result.data) ? result.data : []);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, 'Failed to load attendance requests.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const reviewRequest = async (request: AttendanceRequest, action: 'approve' | 'reject') => {
    let rejectionReason = '';
    if (action === 'reject') {
      rejectionReason = window.prompt('Enter a rejection reason:')?.trim() || '';
      if (!rejectionReason) return;
    }

    try {
      setProcessingId(request._id);
      setError(null);
      const response = await fetch(`/api/attendance/request/${request._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, rejectionReason }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to review attendance request.');
      }
      await loadRequests();
      window.dispatchEvent(new CustomEvent('worktracker-refresh'));
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, 'Failed to review attendance request.'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="card" style={{ marginTop: '20px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
        <div>
          <h3 className="card-title" style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '4px' }}>Attendance Requests</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', margin: 0 }}>Review employee requests submitted outside the configured punch window.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={loadRequests} disabled={loading} style={{ gap: '6px' }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Clock3 size={13} />}
          Refresh
        </button>
      </div>

      {error && <p style={{ color: '#b91c1c', fontSize: '0.8rem', marginBottom: '12px' }}>{error}</p>}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '18px 0', textAlign: 'center' }}>Loading requests...</p>
      ) : requests.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', padding: '18px 0', textAlign: 'center' }}>No attendance requests found.</p>
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
              {requests.map((request) => {
                const isPending = request.status === 'Pending';
                const isProcessing = processingId === request._id;
                return (
                  <tr key={request._id}>
                    <td>
                      <strong>{request.employee_id?.full_name || 'Unknown employee'}</strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{request.employee_id?.email || ''}</div>
                    </td>
                    <td>{request.request_type === 'punchIn' ? 'Punch In' : 'Punch Out'}</td>
                    <td>{request.attendance_date}<div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{new Date(request.requested_punch_at).toLocaleTimeString()}</div></td>
                    <td style={{ maxWidth: '220px', whiteSpace: 'normal' }}>{request.reason}</td>
                    <td>{request.status}{request.rejection_reason ? <div style={{ color: '#b91c1c', fontSize: '0.72rem' }}>{request.rejection_reason}</div> : null}</td>
                    <td>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-primary" type="button" onClick={() => reviewRequest(request, 'approve')} disabled={isProcessing} title="Approve request" style={{ padding: '6px 8px' }}>
                            {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                          <button className="btn btn-secondary" type="button" onClick={() => reviewRequest(request, 'reject')} disabled={isProcessing} title="Reject request" style={{ padding: '6px 8px', color: '#b91c1c' }}>
                            <X size={13} />
                          </button>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Reviewed</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}