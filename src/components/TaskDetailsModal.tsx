'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  Calendar,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import './TaskDetailsModal.css';

export interface TaskDetailsTask {
  _id: string;
  task_id?: string;
  title: string;
  description?: string;
  projectId?: {
    _id: string;
    name: string;
    color: string;
  };
  Project?: string;
  assignedTo?: Array<{
    _id: string;
    name: string;
    email?: string;
    avatarColor?: string;
  }>;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status:
    | 'To Do'
    | 'In Progress'
    | 'Paused'
    | 'Partially Done'
    | 'Partially Completed'
    | 'Review'
    | 'Completed';
  dueDate?: string;
  dueTime?: string;
  url?: string;
  urls?: string[];
  comments?: string;
  commentsList?: Array<{
    _id?: string;
    author: {
      _id: string;
      name: string;
      email?: string;
      avatarColor?: string;
      role?: string;
    };
    content: string;
    createdAt: string;
  }>;
  files?: Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    avatarColor?: string;
  };
  createdAt?: string;
}

export interface TaskDetailsModalProps {
  task: TaskDetailsTask;
  sessions: any[];
  loadingSessions: boolean;
  user?: {
    _id?: string;
    id?: string;
    name?: string;
    user_role?: number | string;
  } | null;
  newCommentText: string;
  newCommentStatus: string;
  submittingComment: boolean;
  copiedCommentId: string | null;
  copiedUrlIndex: number | null;
  isCopiedAllComments: boolean;
  isCopiedAllUrls: boolean;
  isDownloadingZip: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddComment: () => void;
  onCommentChange: (value: string) => void;
  onCommentStatusChange: (value: string) => void;
  onCopyComment: (id: string, content: string) => void;
  onCopyAllComments: () => void;
  onCopyUrl: (index: number, url: string) => void;
  onCopyAllUrls: () => void;
  onViewFile: (file: { name: string; url: string; type?: string }) => void;
  onDownloadFile: (file: { name: string; url: string }) => void;
  onDownloadAllFiles: () => void;
}

const initials = (name?: string) =>
  name?.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

const formatDate = (value?: string, withTime = false) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
};

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const statusStyle = (status: string) => {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    Completed: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    'In Progress': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    Paused: { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
    'Partially Done': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    'Partially Completed': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    Review: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    'To Do': { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
  };
  return map[status] || map['To Do'];
};

const priorityStyle = (priority: string) => {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    Urgent: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    High: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    Medium: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    Low: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  };
  return map[priority] || map.Medium;
};

export default function TaskDetailsModal({
  task,
  sessions,
  loadingSessions,
  newCommentText,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  newCommentStatus,
  submittingComment,
  copiedCommentId,
  copiedUrlIndex,
  isCopiedAllComments,
  isCopiedAllUrls,
  isDownloadingZip,
  user,
  onClose,
  onEdit,
  onDelete,
  onAddComment,
  onCommentChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCommentStatusChange,
  onCopyComment,
  onCopyAllComments,
  onCopyUrl,
  onCopyAllUrls,
  onViewFile,
  onDownloadFile,
  onDownloadAllFiles,
}: TaskDetailsModalProps) {
  const [tab, setTab] = useState<'details' | 'updates' | 'work' | 'files' | 'links'>('details');
  const isAdmin = Number(user?.user_role) === 1;

  const links = useMemo(() => {
    if (task.urls?.length) return task.urls;
    return task.url ? [task.url] : [];
  }, [task.urls, task.url]);

  const updateCount = (task.commentsList?.length || 0) + (task.comments ? 1 : 0);
  const totalMinutes = sessions.reduce((sum, session) => sum + Number(session.totalMinutes || 0), 0);
  const totalTime = totalMinutes
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : '0m';
  const status = statusStyle(task.status);
  const priority = priorityStyle(task.priority);
  const projectColor = task.projectId?.color || '#3b82f6';

  const tabs = [
    { id: 'details' as const, label: 'Details', icon: FileText, count: undefined },
    { id: 'updates' as const, label: 'Updates', icon: MessageSquare, count: updateCount || undefined },
    { id: 'work' as const, label: 'Work Logs', icon: Clock3, count: sessions.length || undefined },
    { id: 'files' as const, label: 'Files', icon: Paperclip, count: task.files?.length || undefined },
    { id: 'links' as const, label: 'Links', icon: LinkIcon, count: links.length || undefined },
  ];

  const renderComposer = () => (
    <div className="td-composer">
      <div
        className="td-composer-avatar"
        style={{ background: user?.name ? '#4f46e5' : task.createdBy?.avatarColor || '#4f46e5' }}
      >
        {initials(user?.name || task.createdBy?.name)}
      </div>
      <div className="td-composer-main">
        <textarea
          value={newCommentText}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Write a progress update, remark, or comment..."
          rows={3}
        />
        <div className="td-composer-footer">
          <div className="td-composer-tools">
            <button type="button" aria-label="Bold"><strong>B</strong></button>
            <button type="button" aria-label="Italic"><em>I</em></button>
            <button type="button" aria-label="Add attachment"><Paperclip size={15} /></button>
            <button type="button" aria-label="Add link"><LinkIcon size={15} /></button>
          </div>
          <button
            className="td-primary-btn"
            type="button"
            onClick={onAddComment}
            disabled={submittingComment || !newCommentText.trim()}
          >
            {submittingComment ? <Loader2 size={15} className="td-spin" /> : <MessageSquare size={15} />}
            Post Update
          </button>
        </div>
      </div>
    </div>
  );

  const renderUpdates = () => (
    <div className="td-section-stack">
      <div className="td-section-heading">
        <div>
          <span className="td-eyebrow">Activity</span>
          <h3>Task updates</h3>
        </div>
        {updateCount > 0 && (
          <button type="button" className="td-ghost-btn" onClick={onCopyAllComments}>
            {isCopiedAllComments ? <Check size={14} /> : <Copy size={14} />}
            {isCopiedAllComments ? 'Copied' : 'Copy updates'}
          </button>
        )}
      </div>

      {task.comments || task.commentsList?.length ? (
        <div className="td-timeline">
          {task.comments && (
            <div className="td-timeline-item">
              <div className="td-timeline-dot" />
              <div className="td-update-card td-initial-note">
                <div className="td-update-top">
                  <span className="td-note-badge">Initial Note</span>
                  <button
                    type="button"
                    className="td-icon-action"
                    onClick={() => onCopyComment('initial', task.comments || '')}
                    title="Copy note"
                  >
                    {copiedCommentId === 'initial' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <p>{task.comments}</p>
                <div className="td-update-meta">
                  <span
                    className="td-avatar sm"
                    style={{ background: task.createdBy?.avatarColor || '#4f46e5' }}
                  >
                    {initials(task.createdBy?.name)}
                  </span>
                  <strong>{task.createdBy?.name || 'System Admin'}</strong>
                  <span>•</span>
                  <span>{formatDate(task.createdAt, true)}</span>
                </div>
              </div>
            </div>
          )}

          {task.commentsList?.map((comment, index) => {
            const commentId = comment._id || String(index);
            return (
              <div className="td-timeline-item" key={commentId}>
                <div className="td-timeline-dot" />
                <div className="td-update-card">
                  <div className="td-update-top">
                    <div className="td-user-line">
                      <span
                        className="td-avatar sm"
                        style={{ background: comment.author?.avatarColor || '#4f46e5' }}
                      >
                        {initials(comment.author?.name)}
                      </span>
                      <div>
                        <strong>{comment.author?.name || 'Team Member'}</strong>
                        {comment.author?.role && <span>{comment.author.role}</span>}
                      </div>
                    </div>
                    <div className="td-update-actions">
                      <span>{formatDate(comment.createdAt, true)}</span>
                      <button
                        type="button"
                        className="td-icon-action"
                        onClick={() => onCopyComment(commentId, comment.content)}
                        title="Copy comment"
                      >
                        {copiedCommentId === commentId ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <p>{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="td-empty">
          <MessageSquare size={24} />
          <strong>No updates yet</strong>
          <span>Add the first progress update below.</span>
        </div>
      )}

      {renderComposer()}
    </div>
  );

  const renderWorkLogs = () => (
    <div className="td-section-stack">
      <div className="td-section-heading">
        <div>
          <span className="td-eyebrow">Time tracking</span>
          <h3>Work session logs</h3>
        </div>
        <div className="td-heading-pills">
          <span>{sessions.length} sessions</span>
          <span>{totalTime} total</span>
        </div>
      </div>

      {loadingSessions ? (
        <div className="td-empty">
          <Loader2 size={24} className="td-spin" />
          <strong>Loading work logs…</strong>
        </div>
      ) : sessions.length === 0 ? (
        <div className="td-empty td-empty-large">
          <div className="td-empty-icon"><Activity size={24} /></div>
          <strong>No work sessions logged yet</strong>
          <span>Employees working on this task will log their active hours here.</span>
        </div>
      ) : (
        <div className="td-session-list">
          {sessions.map((session) => (
            <div className="td-session-card" key={session._id}>
              <div className="td-session-main">
                <span
                  className="td-avatar sm"
                  style={{ background: session.employeeId?.avatarColor || '#4f46e5' }}
                >
                  {initials(session.employeeId?.name)}
                </span>
                <div>
                  <strong>{session.employeeId?.name || 'Unknown Employee'}</strong>
                  <span>{session.date || 'Work session'}</span>
                </div>
              </div>
              <div className="td-session-meta">
                <span>{session.startTime || '—'} – {session.endTime || 'Active'}</span>
                <span className="td-mini-status">
                  {session.status === 'Completed' ? (session.isFullyCompleted ? 'Completed' : 'Partial') : 'In Progress'}
                </span>
                {session.totalMinutes > 0 && (
                  <strong>
                    {Math.floor(session.totalMinutes / 60) > 0
                      ? `${Math.floor(session.totalMinutes / 60)}h ${session.totalMinutes % 60}m`
                      : `${session.totalMinutes}m`}
                  </strong>
                )}
              </div>
              {session.notes && (
                <div className="td-session-notes" dangerouslySetInnerHTML={{ __html: session.notes }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFiles = () => (
    <div className="td-section-stack">
      <div className="td-section-heading">
        <div>
          <span className="td-eyebrow">Attachments</span>
          <h3>Task files</h3>
        </div>
        {!!task.files?.length && (
          <button type="button" className="td-ghost-btn" onClick={onDownloadAllFiles} disabled={isDownloadingZip}>
            {isDownloadingZip ? <Loader2 size={14} className="td-spin" /> : <Archive size={14} />}
            {isDownloadingZip ? 'Preparing ZIP…' : 'Download all'}
          </button>
        )}
      </div>
      {!task.files?.length ? (
        <div className="td-empty">
          <Paperclip size={24} />
          <strong>No files attached</strong>
          <span>Files added to this task will appear here.</span>
        </div>
      ) : (
        <div className="td-file-grid">
          {task.files.map((file, index) => {
            const isImage = file.type?.startsWith('image/') || /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(file.name);
            return (
              <div className="td-file-card" key={`${file.name}-${index}`}>
                <button type="button" className="td-file-preview" onClick={() => onViewFile(file)}>
                  {isImage ? <img src={file.url} alt={file.name} /> : <FileText size={22} />}
                </button>
                <div className="td-file-info">
                  <strong title={file.name}>{file.name}</strong>
                  <span>{formatBytes(file.size) || file.type || 'Attachment'}</span>
                </div>
                <button
                  type="button"
                  className="td-icon-action"
                  onClick={() => onDownloadFile(file)}
                  title="Download"
                >
                  <Download size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderLinks = () => (
    <div className="td-section-stack">
      <div className="td-section-heading">
        <div>
          <span className="td-eyebrow">Resources</span>
          <h3>Task links</h3>
        </div>
        {!!links.length && (
          <button type="button" className="td-ghost-btn" onClick={onCopyAllUrls}>
            {isCopiedAllUrls ? <Check size={14} /> : <Copy size={14} />}
            {isCopiedAllUrls ? 'Copied' : 'Copy all'}
          </button>
        )}
      </div>
      {!links.length ? (
        <div className="td-empty">
          <LinkIcon size={24} />
          <strong>No links attached</strong>
          <span>Useful URLs for this task will appear here.</span>
        </div>
      ) : (
        <div className="td-link-list">
          {links.map((url, index) => {
            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
            const copied = copiedUrlIndex === index;
            return (
              <div className="td-link-card" key={`${url}-${index}`}>
                <span className="td-link-icon"><LinkIcon size={17} /></span>
                <div className="td-link-content">
                  <strong>{url}</strong>
                  <span>{fullUrl}</span>
                </div>
                <div className="td-link-actions">
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="td-ghost-btn td-small"
                  >
                    <ExternalLink size={14} /> Open
                  </a>
                  <button
                    type="button"
                    className="td-icon-action"
                    onClick={() => onCopyUrl(index, fullUrl)}
                    title="Copy URL"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="td-overlay" onClick={onClose}>
      <div
        className="td-modal"
        style={{ '--td-project-color': projectColor } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="td-header">
          <div className="td-header-top">
            <div className="td-header-left">
              <div className="td-kicker">
                <span className="td-chip td-number">#{task._id.slice(-4)}</span>
                <span
                  className="td-chip"
                  style={{
                    background: priority.bg,
                    color: priority.color,
                    borderColor: priority.border,
                  }}
                >
                  {task.priority}
                </span>
                {(task.projectId?.name || task.Project) && (
                  <span className="td-chip td-project">
                    <span className="td-project-dot" />
                    {task.projectId?.name || task.Project}
                  </span>
                )}
                <span
                  className="td-chip"
                  style={{
                    background: status.bg,
                    color: status.color,
                    borderColor: status.border,
                  }}
                >
                  {task.status}
                </span>
              </div>
              <div>
                {task.task_id && <div className="td-eyebrow">{task.task_id}</div>}
                <h2 className="td-title">{task.title}</h2>
              </div>
              {task.description ? (
                <div
                  className="td-description-preview"
                  dangerouslySetInnerHTML={{
                    __html: task.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
                  }}
                />
              ) : (
                <div className="td-description-preview">No description added for this task.</div>
              )}
            </div>
            <div className="td-header-actions">
              {isAdmin && onEdit && (
                <button type="button" className="td-action-btn" onClick={onEdit}>
                  <FileText size={15} />
                  <span>Edit</span>
                </button>
              )}

              {isAdmin && onDelete && (
                <button type="button" className="td-action-btn danger" onClick={onDelete}>
                  <Trash2 size={15} />
                  <span>Delete</span>
                </button>
              )}

              <button
                type="button"
                className="td-action-btn td-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>
          <nav className="td-tabs" aria-label="Task details tabs">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                type="button"
                className={`td-tab ${tab === id ? 'active' : ''}`}
                onClick={() => setTab(id)}
              >
                <Icon size={15} />
                {label}
                {count ? <span className="td-tab-count">{count}</span> : null}
              </button>
            ))}
          </nav>
        </header>

        <div className="td-body">
          <main className="td-main">
            {tab === 'details' && (
              <div className="td-section-stack">
                <div className="td-section-heading">
                  <div>
                    <span className="td-eyebrow">Overview</span>
                    <h3>Task description</h3>
                  </div>
                </div>
                <div className="td-description">
                  {task.description ? (
                    <div dangerouslySetInnerHTML={{ __html: task.description }} />
                  ) : (
                    <span style={{ color: '#94a3b8' }}>No description added for this task.</span>
                  )}
                </div>
                {renderUpdates()}
              </div>
            )}
            {tab === 'updates' && renderUpdates()}
            {tab === 'work' && renderWorkLogs()}
            {tab === 'files' && renderFiles()}
            {tab === 'links' && renderLinks()}
          </main>

          <aside className="td-sidebar">
            <div className="td-card td-sidebar-card">
              <div className="td-sidebar-title">
                <CheckCircle2 size={16} />
                Task information
              </div>
              <div className="td-info-list">
                <div className="td-info-row">
                  <span className="td-info-label">Status</span>
                  <span
                    className="td-chip"
                    style={{
                      background: status.bg,
                      color: status.color,
                      borderColor: status.border,
                    }}
                  >
                    {task.status}
                  </span>
                </div>
                <div className="td-info-row">
                  <span className="td-info-label">Priority</span>
                  <span
                    className="td-chip"
                    style={{
                      background: priority.bg,
                      color: priority.color,
                      borderColor: priority.border,
                    }}
                  >
                    {task.priority}
                  </span>
                </div>
                <div className="td-info-row">
                  <span className="td-info-label">Due date</span>
                  <span className="td-info-value">
                    <span className="td-due">
                      <Calendar size={13} />
                      {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                    </span>
                    {task.dueTime && <span className="td-due-time">{task.dueTime}</span>}
                  </span>
                </div>
                <div className="td-info-row">
                  <span className="td-info-label">Created</span>
                  <span className="td-info-value">{formatDate(task.createdAt, true)}</span>
                </div>
              </div>
            </div>

            <div className="td-card td-sidebar-card">
              <div className="td-sidebar-title">
                <Users size={16} />
                Assignees
              </div>
              <div className="td-info-list">
                <div>
                  <div className="td-info-label" style={{ marginBottom: 7 }}>Assigned by</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      className="td-avatar"
                      style={{ background: task.createdBy?.avatarColor || '#4f46e5' }}
                    >
                      {initials(task.createdBy?.name)}
                    </span>
                    <strong style={{ fontSize: 12, color: '#0f172a' }}>
                      {task.createdBy?.name || 'System Admin'}
                    </strong>
                  </div>
                </div>
                <div>
                  <div className="td-info-label" style={{ marginBottom: 7 }}>Assigned to</div>
                  {task.assignedTo?.length ? (
                    <div className="td-assignee-list">
                      {task.assignedTo.map((emp) => (
                        <span className="td-assignee" key={emp._id}>
                          <span
                            className="td-avatar sm"
                            style={{ background: emp.avatarColor || '#3b82f6' }}
                          >
                            {initials(emp.name)}
                          </span>
                          {emp.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Unassigned</span>
                  )}
                </div>
              </div>
            </div>

            <div className="td-card td-sidebar-card">
              <div className="td-sidebar-title">
                <Activity size={16} />
                Work progress
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>
                  {totalTime}
                </span>
              </div>
              <div className="td-progress">
                <div
                  className="td-progress-fill"
                  style={{ width: sessions.length ? '65%' : '0%' }}
                />
              </div>
              <div className="td-progress-meta">
                <span>{sessions.length} logged sessions</span>
                <span>{totalMinutes ? `${totalMinutes} min` : 'No time logged'}</span>
              </div>
            </div>
          </aside>
        </div>

        <footer className="td-footer">
          <div className="td-footer-left">
            {(task.projectId?._id || task.Project) && (
              <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="td-project-dot" />
                Project: <strong style={{ color: '#0f172a' }}>{task.projectId?.name || task.Project}</strong>
              </span>
            )}
          </div>
          <div className="td-footer-right">
            <button type="button" className="td-view-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}