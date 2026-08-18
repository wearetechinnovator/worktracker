'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, Play, Loader2, AlertCircle, CheckCircle2, 
  Calendar, Flag, StopCircle, Clock
} from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';
import dynamic from 'next/dynamic';

const CKEditorComponent = dynamic(
  () => import('@/components/CKEditorWrapper'),
  { ssr: false }
);

interface Task {
  _id: string;
  title: string;
  description?: string;
  projectId?: {
    _id: string;
    name: string;
    color: string;
  };
  Project?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  dueDate?: string;
  tags?: string[];
}

interface TaskWork {
  _id: string;
  taskId: {
    _id: string;
    title: string;
  };
  date: string;
  startTime: string;
  endTime?: string;
  totalMinutes?: number;
  status: 'In Progress' | 'Completed';
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

export default function MyTasks({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskWorks, setTaskWorks] = useState<TaskWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);

  // End Work Dialog State
  const [showEndWorkDialog, setShowEndWorkDialog] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [workNotes, setWorkNotes] = useState('');
  const [workLinks, setWorkLinks] = useState('');
  const [completionStatus, setCompletionStatus] = useState<'partial' | 'full'>('full');

  // Calculate elapsed time for in-progress tasks
  const [currentTime, setCurrentTime] = useState(new Date());

  const getLocalDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalTimeValue = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const loadData = useCallback(async () => {
    try {
      setTimeout(() => setLoading(true), 0);
      const [tasksRes, worksRes] = await Promise.all([
        fetch(`/api/tasks?employeeId=${userId}`),
        fetch(`/api/task-work?employeeId=${userId}&limit=100`),
      ]);

      const tasksData = await tasksRes.json();
      const worksData = await worksRes.json();

      if (!tasksData.success) throw new Error(tasksData.error);
      if (!worksData.success) throw new Error(worksData.error);

      setTasks(tasksData.data);
      setTaskWorks(worksData.data);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleStartWork = async (taskId: string) => {
    try {
      setProcessingTaskId(taskId);
      setError(null);
      setSuccessMsg(null);

      const localDate = getLocalDateValue(new Date());
      const localTime = getLocalTimeValue(new Date());

      const res = await fetch('/api/task-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, employeeId: userId, localDate, localTime }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      setSuccessMsg('Work started! Timer is running...');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handleEndWork = async (workId: string) => {
    console.log('Ending work for:', workId);
    try {
      setProcessingTaskId(workId);
      setError(null);
      setSuccessMsg(null);

      const hasNotes = workNotes.trim() !== '';
      const hasLinks = stripHtml(workLinks) !== '';
      const notes = hasNotes || hasLinks
        ? `${workNotes}${hasNotes && hasLinks ? '\n\n' : ''}${workLinks}`
        : undefined;

      console.log('Sending request with notes:', notes);

      const localTime = getLocalTimeValue(new Date());

      const res = await fetch(`/api/task-work/${workId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, localTime, isFullyCompleted: completionStatus === 'full' }),
      });

      const result = await res.json();
      console.log('API Response:', result);
      
      if (!result.success) throw new Error(result.error);

      setSuccessMsg(result.message);
      setTimeout(() => setSuccessMsg(null), 4000);
      
      // Reset dialog
      setShowEndWorkDialog(false);
      setSelectedWorkId(null);
      setWorkNotes('');
      setWorkLinks('');
      
      loadData();
    } catch (err: unknown) {
      console.error('Error ending work:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingTaskId(null);
    }
  };

  const openEndWorkDialog = (workId: string) => {
    console.log('Opening end work dialog for:', workId);
    setSelectedWorkId(workId);
    setShowEndWorkDialog(true);
    console.log('Dialog state set to true');
  };

  const closeEndWorkDialog = () => {
    setShowEndWorkDialog(false);
    setSelectedWorkId(null);
    setWorkNotes('');
    setWorkLinks('');
    setCompletionStatus('full');
  };

  const getActiveWork = (taskId: string): TaskWork | undefined => {
    return taskWorks.find(w => w.taskId._id === taskId && w.status === 'In Progress');
  };

  const hasCompletedWorkToday = (taskId: string): boolean => {
    const todayStr = getLocalDateValue(new Date());
    return taskWorks.some(w => w.taskId._id === taskId && w.status === 'Completed' && w.date === todayStr);
  };

  const getCompletedWorkTime = (taskId: string): { hours: number; minutes: number; isUnderAMinute?: boolean } | null => {
    const completedSessions = taskWorks.filter(w => w.taskId._id === taskId && w.status === 'Completed');
    if (completedSessions.length === 0) return null;
    const totalMins = completedSessions.reduce((sum, w) => sum + (w.totalMinutes || 0), 0);
    if (totalMins === 0) {
      return { hours: 0, minutes: 0, isUnderAMinute: true };
    }
    return {
      hours: Math.floor(totalMins / 60),
      minutes: totalMins % 60,
    };
  };

  const getElapsedTime = (startTime: string): { h1: string; h2: string; m1: string; m2: string; s1: string; s2: string } => {
    const [hours, minutes, seconds] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, seconds);
    
    let elapsed = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
    if (elapsed < 0) {
      elapsed += 24 * 60 * 60;
    }
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');
    
    return {
      h1: hStr[0],
      h2: hStr[1],
      m1: mStr[0],
      m2: mStr[1],
      s1: sStr[0],
      s2: sStr[1],
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return '#dc2626';
      case 'High': return '#ea580c';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'var(--status-active-bg)';
      case 'In Progress': return 'var(--status-pending-bg)';
      case 'Review': return '#dbeafe';
      case 'To Do': return 'var(--bg-tertiary)';
      default: return 'var(--bg-tertiary)';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <PageShimmer variant="compact" />
      </div>
    );
  }

  const activeTasks = tasks.filter(t => t.status !== 'Completed');

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={20} style={{ color: 'var(--accent-primary)' }} />
            My Assigned Tasks
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '16px', background: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle style={{ color: '#ef4444' }} size={18} />
            <p style={{ fontWeight: 600, color: '#991b1b', fontSize: '0.85rem' }}>{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="card" style={{ borderLeft: '4px solid #10b981', marginBottom: '16px', background: '#ecfdf5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 style={{ color: '#10b981' }} size={18} />
            <p style={{ color: '#065f46', fontWeight: 700, fontSize: '0.85rem' }}>{successMsg}</p>
          </div>
        </div>
      )}

      {activeTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CheckSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>No active tasks</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            You have no active tasks assigned at this moment.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Priority</th>
                  <th>Task Name</th>
                  <th style={{ width: '120px' }}>Project</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '110px' }}>Due Date</th>
                  <th style={{ width: '220px', textAlign: 'right' }}>Actions & Tracking</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.map((task) => {
                  const activeWork = getActiveWork(task._id);
                  const isWorking = !!activeWork;
                  const completedToday = hasCompletedWorkToday(task._id);

                  return (
                    <tr key={task._id} style={{ opacity: completedToday && !isWorking ? 0.65 : 1 }}>
                      {/* Priority */}
                      <td>
                        <span
                          className="tag-badge"
                          style={{
                            background: getPriorityColor(task.priority) + '15',
                            color: getPriorityColor(task.priority),
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            border: `1px solid ${getPriorityColor(task.priority)}30`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Flag size={10} />
                          {task.priority}
                        </span>
                      </td>

                      {/* Task Name & Description */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{task.title}</span>
                          {task.description && (
                            <span 
                              style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}
                              dangerouslySetInnerHTML={{ __html: task.description }}
                            />
                          )}
                        </div>
                      </td>

                      {/* Project */}
                      <td>
                        {task.projectId ? (
                          <span
                            className="tag-badge"
                            style={{
                              background: task.projectId.color + '15',
                              color: task.projectId.color,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              border: `1px solid ${task.projectId.color}30`,
                            }}
                          >
                            {task.projectId.name}
                          </span>
                        ) : task.Project ? (
                          <span className="tag-badge" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                            {task.Project}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className="tag-badge"
                          style={{
                            background: getStatusColor(task.status),
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            fontWeight: 600,
                          }}
                        >
                          {task.status}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td>
                        {task.dueDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={12} />
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>

                      {/* Actions & Tracking */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                          {isWorking ? (
                            <>
                              {/* Compact Digital Stopwatch */}
                              {(() => {
                                const elapsed = getElapsedTime(activeWork.startTime);
                                const elapsedStr = `${elapsed.h1}${elapsed.h2}:${elapsed.m1}${elapsed.m2}:${elapsed.s1}${elapsed.s2}`;
                                return (
                                  <div style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    background: '#0284c7',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                  }}>
                                    <Clock size={12} className="animate-pulse" />
                                    <span>{elapsedStr}</span>
                                  </div>
                                );
                              })()}

                              <button
                                onClick={() => openEndWorkDialog(activeWork._id)}
                                disabled={processingTaskId === activeWork._id}
                                className="btn btn-danger"
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '4px',
                                  padding: '5px 10px',
                                  fontSize: '0.75rem'
                                }}
                              >
                                <StopCircle size={12} />
                                <span>End Work</span>
                              </button>
                            </>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              {(() => {
                                const timeWorked = getCompletedWorkTime(task._id);
                                if (timeWorked) {
                                  return (
                                    <span style={{ 
                                      fontSize: '0.75rem', 
                                      color: '#047857',
                                      fontWeight: 600,
                                      background: '#ecfdf5',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid #a7f3d0',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}>
                                      <Clock size={12} />
                                      {timeWorked.isUnderAMinute ? '< 1m' : `${timeWorked.hours > 0 ? `${timeWorked.hours}h ` : ''}${timeWorked.minutes}m`}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              
                              {completedToday && (
                                <span
                                  className="tag-badge"
                                  style={{
                                    background: '#d1fae5',
                                    color: '#065f46',
                                    fontSize: '0.7rem',
                                    padding: '2px 8px',
                                    fontWeight: 700,
                                    border: '1px solid #10b98130',
                                  }}
                                >
                                  Worked Today
                                </span>
                              )}

                              <button
                                onClick={() => handleStartWork(task._id)}
                                disabled={processingTaskId === task._id || task.status === 'Completed'}
                                className="btn btn-primary"
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '4px',
                                  padding: '5px 10px',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {processingTaskId === task._id ? (
                                  <Loader2 className="animate-spin" size={12} />
                                ) : (
                                  <Play size={12} />
                                )}
                                <span>Start Work</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* End Work Dialog */}
      {showEndWorkDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={closeEndWorkDialog}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StopCircle size={22} style={{ color: '#ef4444' }} />
                End Work Session
              </h3>
              <button
                onClick={closeEndWorkDialog}
                className="btn"
                style={{ padding: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Add status, notes or links related to your work before ending the session.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Is this task fully completed? *
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="completionStatus"
                    value="full"
                    checked={completionStatus === 'full'}
                    onChange={() => setCompletionStatus('full')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Yes, Fully Completed</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="completionStatus"
                    value="partial"
                    checked={completionStatus === 'partial'}
                    onChange={() => setCompletionStatus('partial')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>No, Partially Done (Resume Later)</span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Work Notes/Reason {completionStatus === 'partial' ? <span style={{ color: '#ef4444' }}>* (Required for partial completion)</span> : '(Optional)'}
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder={completionStatus === 'partial' ? "Specify what is completed and the reason for ending work partially..." : "What did you accomplish? Any challenges or blockers?"}
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                style={{ fontSize: '0.85rem', resize: 'vertical' }}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {completionStatus === 'partial' ? 'Explain why you are stopping and what work is left.' : 'Describe your progress, achievements, or any issues faced.'}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Related Links (Optional)
              </label>
              <CKEditorComponent
                value={workLinks}
                onChange={(val) => setWorkLinks(val)}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Add relevant URLs (GitHub PRs, Jira tickets, design files, etc.)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeEndWorkDialog}
                disabled={!!processingTaskId}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => selectedWorkId && handleEndWork(selectedWorkId)}
                disabled={!!processingTaskId || (completionStatus === 'partial' && !workNotes.trim())}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: (completionStatus === 'partial' && !workNotes.trim()) ? 0.6 : 1 }}
              >
                {processingTaskId ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Ending...</span>
                  </>
                ) : (
                  <>
                    <StopCircle size={16} />
                    <span>End Work</span>
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
