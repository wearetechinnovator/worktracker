'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Send, X, Loader2 } from 'lucide-react';
import { punchService } from '@/lib/punchService';

interface PunchRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestType: 'punchIn' | 'punchOut';
  currentTime?: string;
  startTime?: string | null;
  endTime?: string | null;
  message?: string | null;
  onSuccess?: () => void;
}

export default function PunchRequestModal({
  isOpen,
  onClose,
  requestType,
  currentTime,
  startTime,
  endTime,
  message,
  onSuccess,
}: PunchRequestModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, requestType]);

  if (!isOpen) return null;

  const isPunchIn = requestType === 'punchIn';
  const actionLabel = isPunchIn ? 'Punch In' : 'Punch Out';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please provide a reason for this request.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await punchService.requestPunch(requestType, trimmed);

      // Notify window listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('worktracker-refresh'));
        window.dispatchEvent(new CustomEvent('punchStateChanged'));
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to submit attendance request:', err);
      setError(err?.message || 'Failed to submit attendance request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          background: 'var(--bg-primary, #ffffff)',
          color: 'var(--text-primary, #1e293b)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border-color, #e2e8f0)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '4px 10px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary, #f8fafc)',
            borderRadius: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '8px',
                background: isPunchIn ? '#ecfdf5' : '#fff1f2',
                color: isPunchIn ? '#059669' : '#e11d48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={18} />
            </div>
            <div>
              {/* <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                {actionLabel} Request
              </h3> */}
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>
                Time window closed. Admin approval required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Notice Alert */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.4 }}>
              {/* <strong>
                {message || `Configured ${actionLabel} window is currently closed.`}
              </strong> */}
                <strong className='flex gap-2'>
                  {startTime && endTime && (
                    <div>Allowed: {startTime} – {endTime}</div>
                  )}

                  {currentTime && <div>Current Time: {currentTime}</div>}
                </strong>

              <div>Please enter a reason for admin approval.</div>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.8rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label
              htmlFor="punch-request-reason"
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '6px',
                color: 'var(--text-primary, #1e293b)',
              }}
            >
              Reason for Request <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              id="punch-request-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isPunchIn
                  ? 'e.g., Punch in window passed / re-punching for overtime / returning to complete shift tasks'
                  : 'e.g., Working late on project deployment / approved overtime / shift completion'
              }
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-primary, #ffffff)',
                color: 'var(--text-primary, #1e293b)',
                fontSize: '0.85rem',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="btn btn-primary"
              style={{
                padding: '8px 18px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSubmitting || !reason.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !reason.trim() ? 0.6 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Send Request to Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
