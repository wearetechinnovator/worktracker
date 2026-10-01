'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Mail, CheckCircle, X } from 'lucide-react';
import { punchService } from '@/lib/punchService';
import { toast } from '@/lib/toast';

interface PunchOutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onRequestRequired?: (meta: {
    message?: string;
    currentTime?: string;
    startTime?: string | null;
    endTime?: string | null;
  }) => void;
}

export default function PunchOutSummaryModal({
  isOpen,
  onClose,
  onSuccess,
  onRequestRequired,
}: PunchOutSummaryModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mailContent, setMailContent] = useState('');
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const prepareSummary = async () => {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/task-work?limit=1000`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const json = await res.json();

        let entries: any[] = [];
        if (json.success && Array.isArray(json.data)) {
          entries = json.data.filter((item: any) => {
            if (!item.date) return true;
            const itemDate = new Date(item.date).toISOString().split('T')[0];
            return itemDate === todayStr;
          });
          if (entries.length === 0 && json.data.length > 0) {
            entries = json.data;
          }
        }

        setTaskCount(entries.length);

        let draft = `Daily Work Summary (${todayStr})\n\n`;

        if (entries.length > 0) {
          draft += entries
            .map((entry: any, index: number) => {
              const projectName = entry.taskId?.project_id?.name || 'General';
              const taskTitle = entry.taskId?.title || 'Untitled Task';
              const notes = entry.notes || 'Work completed.';
              const minutes = entry.totalMinutes || 0;
              const hrs = (minutes / 60).toFixed(1).replace(/\.0$/, '');
              const duration = `${hrs} hrs (${minutes} mins)`;
              const status = entry.status || 'Completed';

              return `Task ${index + 1}:
- Project: ${projectName}
- Task: ${taskTitle}
- Duration: ${duration}
- Status: ${status}
- Notes: ${notes}`;
            })
            .join('\n\n');
        } else {
          draft += 'No work entries logged for today.';
        }

        setMailContent(draft);
      } catch (err) {
        console.error('Failed to load work summary for punch out:', err);
        const todayStr = new Date().toISOString().split('T')[0];
        setMailContent(`Daily Work Summary (${todayStr})\n\nShift punch out report.`);
        setTaskCount(0);
      } finally {
        setLoading(false);
      }
    };

    prepareSummary();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmPunchOut = async () => {
    setSubmitting(true);
    try {
      await punchService.punchOut({
        reason: mailContent.trim(),
      });

      toast.success(
        'Punched out successfully. Work summary email sent to admin & copy sent to your email.'
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Punch out modal error:', error);
      if (error?.requiresRequest || error?.requestType) {
        onClose();
        if (onRequestRequired) {
          onRequestRequired({
            message: error?.message,
            currentTime: error?.currentTime,
            startTime: error?.punchOutStartTime,
            endTime: error?.punchOutEndTime,
          });
        }
      } else {
        toast.error(error?.message || 'Failed to punch out.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1200 }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(640px, 94vw)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={20} style={{ color: '#2563eb' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                Punch Out & Daily Work Summary
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Review and edit your daily work report email before confirming punch out.
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 0 8px' }}>
          {loading ? (
            <div style={{ minHeight: 200, display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                <span>Preparing work summary report...</span>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  marginBottom: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                }}
              >
                <div>
                  <strong>Work logged today:</strong> {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </div>
                <div style={{ color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={14} /> Ready to send
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                  Email Content (Editable Preview)
                </label>
                <textarea
                  className="form-control"
                  value={mailContent}
                  onChange={(e) => setMailContent(e.target.value)}
                  style={{
                    minHeight: '220px',
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    lineHeight: '1.5',
                    padding: '10px',
                    borderRadius: '8px',
                  }}
                  placeholder="Type or edit your daily work summary..."
                />
              </div>

              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                * Upon confirmation, punch out will be recorded and this email report will be sent to your Admin with a copy sent to your email.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmPunchOut}
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Punching Out...
                    </>
                  ) : (
                    'Confirm Punch Out & Send Mail'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
