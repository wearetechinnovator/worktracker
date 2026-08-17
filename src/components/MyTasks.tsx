'use client';

import { useState, useEffect } from 'react';
import { 
  CheckSquare, Play, Loader2, AlertCircle, CheckCircle2, 
  Calendar, Flag, StopCircle, X, Clock
} from 'lucide-react';
import PageShimmer from '@/components/PageShimmer';

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

// Simple Flip Digit Component
function FlipDigit({ value }: { value: string }) {
  return (
    <div style={{
      width: '45px',
      height: '60px',
      background: '#2c3e50',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <span style={{
        fontSize: '2rem',
        fontWeight: 700,
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
      }}>
        {value}
      </span>
    </div>
  );
}

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const today = getLocalDateValue(new Date());
      const [tasksRes, worksRes] = await Promise.all([
        fetch(`/api/tasks?employeeId=${userId}`),
        fetch(`/api/task-work?employeeId=${userId}&date=${today}`),
      ]);

      const tasksData = await tasksRes.json();
      const worksData = await worksRes.json();

      if (!tasksData.success) throw new Error(tasksData.error);
      if (!worksData.success) throw new Error(worksData.error);

      setTasks(tasksData.data);
      setTaskWorks(worksData.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (err: any) {
      setError(err.message);
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

      const notes = workNotes.trim() || workLinks.trim() 
        ? `${workNotes}${workNotes && workLinks ? '\n\n' : ''}${workLinks}` 
        : undefined;

      console.log('Sending request with notes:', notes);

      const localTime = getLocalTimeValue(new Date());

      const res = await fetch(`/api/task-work/${workId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, localTime }),
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
    } catch (err: any) {
      console.error('Error ending work:', err);
      setError(err.message);
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
  };

  const getActiveWork = (taskId: string): TaskWork | undefined => {
    return taskWorks.find(w => w.taskId._id === taskId && w.status === 'In Progress');
  };

  const hasCompletedWorkToday = (taskId: string): boolean => {
    return taskWorks.some(w => w.taskId._id === taskId && w.status === 'Completed');
  };

  const getCompletedWorkTime = (taskId: string): { hours: number; minutes: number } | null => {
    const completedWork = taskWorks.find(w => w.taskId._id === taskId && w.status === 'Completed');
    if (completedWork && completedWork.totalMinutes) {
      return {
        hours: Math.floor(completedWork.totalMinutes / 60),
        minutes: completedWork.totalMinutes % 60,
      };
    }
    return null;
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

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={20} style={{ color: 'var(--accent-primary)' }} />
            My Assigned Tasks
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you
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

      {tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CheckSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>No tasks assigned yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Your manager will assign tasks to you soon.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {tasks.map((task) => {
            const activeWork = getActiveWork(task._id);
            const isWorking = !!activeWork;
            const completedToday = hasCompletedWorkToday(task._id);

            return (
              <div key={task._id} className="card" style={{ position: 'relative', opacity: completedToday && !isWorking ? 0.6 : 1 }}>
                {/* Priority Indicator */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: getPriorityColor(task.priority),
                    borderRadius: '8px 0 0 8px',
                  }}
                />

                <div style={{ paddingLeft: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                          {task.description}
                        </p>
                      )}

                      {/* Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                        <span
                          className="tag-badge"
                          style={{
                            background: getStatusColor(task.status),
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                          }}
                        >
                          {task.status}
                        </span>
                        <span
                          className="tag-badge"
                          style={{
                            background: getPriorityColor(task.priority) + '20',
                            color: getPriorityColor(task.priority),
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                          }}
                        >
                          <Flag size={10} style={{ marginRight: '2px' }} />
                          {task.priority}
                        </span>
                        {task.projectId && (
                          <span
                            className="tag-badge"
                            style={{
                              background: task.projectId.color + '20',
                              color: task.projectId.color,
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                            }}
                          >
                            {task.projectId.name}
                          </span>
                        )}
                        {task.Project && !task.projectId && (
                          <span className="tag-badge" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                            {task.Project}
                          </span>
                        )}
                        {completedToday && !isWorking && (
                          <span
                            className="tag-badge"
                            style={{
                              background: '#ecfdf5',
                              color: '#065f46',
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              fontWeight: 600,
                            }}
                          >
                            ✓ Done Today
                          </span>
                        )}
                      </div>

                      {/* Due Date */}
                      {task.dueDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <Calendar size={12} />
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Work Timer Section */}
                  <div style={{ 
                    borderTop: '1px solid var(--border-color)', 
                    paddingTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    {isWorking ? (
                      <>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Working since {activeWork.startTime}
                          </div>
                          
                          {/* Simple Timer Display */}
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                          }}>
                            <FlipDigit value={getElapsedTime(activeWork.startTime).h1} />
                            <FlipDigit value={getElapsedTime(activeWork.startTime).h2} />
                            <span style={{ 
                              fontSize: '1.5rem', 
                              fontWeight: 700, 
                              color: 'var(--text-primary)',
                              margin: '0 2px',
                            }}>:</span>
                            <FlipDigit value={getElapsedTime(activeWork.startTime).m1} />
                            <FlipDigit value={getElapsedTime(activeWork.startTime).m2} />
                            <span style={{ 
                              fontSize: '1.5rem', 
                              fontWeight: 700, 
                              color: 'var(--text-primary)',
                              margin: '0 2px',
                            }}>:</span>
                            <FlipDigit value={getElapsedTime(activeWork.startTime).s1} />
                            <FlipDigit value={getElapsedTime(activeWork.startTime).s2} />
                          </div>
                        </div>
                        <button
                          onClick={() => openEndWorkDialog(activeWork._id)}
                          disabled={processingTaskId === activeWork._id}
                          className="btn btn-danger"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            padding: '10px 20px',
                            fontSize: '0.85rem'
                          }}
                        >
                          <StopCircle size={16} />
                          <span>End Work</span>
                        </button>
                      </>
                    ) : completedToday ? (
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '12px',
                          background: '#ecfdf5',
                          borderRadius: '6px',
                          marginBottom: '8px'
                        }}>
                          <div style={{ 
                            color: '#065f46',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}>
                            ✓ Work completed for today! Great job!
                          </div>
                          {(() => {
                            const timeWorked = getCompletedWorkTime(task._id);
                            if (timeWorked) {
                              return (
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  gap: '6px', 
                                  fontSize: '0.8rem', 
                                  color: '#047857',
                                  marginTop: '6px',
                                  fontWeight: 600
                                }}>
                                  <Clock size={14} />
                                  <span>
                                    Time worked: {timeWorked.hours > 0 ? `${timeWorked.hours}h ` : ''}{timeWorked.minutes}m
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flex: 1 }}>
                          Ready to start? Click the button to begin tracking time.
                        </div>
                        <button
                          onClick={() => handleStartWork(task._id)}
                          disabled={processingTaskId === task._id || task.status === 'Completed'}
                          className="btn btn-primary"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            padding: '10px 20px',
                            fontSize: '0.85rem'
                          }}
                        >
                          {processingTaskId === task._id ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                          <span>Start Work</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
              Add any notes or links related to your work before ending the session.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Work Notes (Optional)
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="What did you accomplish? Any challenges or blockers?"
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                style={{ fontSize: '0.85rem', resize: 'vertical' }}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Describe your progress, achievements, or any issues faced.
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Related Links (Optional)
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="e.g., https://github.com/user/repo/pull/123"
                value={workLinks}
                onChange={(e) => setWorkLinks(e.target.value)}
                style={{ fontSize: '0.85rem', fontFamily: 'monospace', resize: 'vertical' }}
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
                disabled={!!processingTaskId}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
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
