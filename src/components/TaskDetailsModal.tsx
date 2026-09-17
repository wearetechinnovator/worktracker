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
  Folder,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Play,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

export interface TaskDetailsTask {
  _id: string;
  title: string;
  description?: string;
  projectId?: { _id: string; name: string; color: string };
  Project?: string;
  assignedTo?: Array<{
    _id: string;
    name: string;
    email?: string;
    avatarColor?: string;
  }>;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Partially Completed' | 'Review' | 'Completed';
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
  files?: Array<{ name: string; url: string; size?: number; type?: string }>;
  createdBy?: { _id: string; name: string; email: string; avatarColor?: string };
  createdAt?: string;
}

export interface TaskDetailsModalProps {
  task: TaskDetailsTask;
  sessions: any[];
  loadingSessions: boolean;
  user?: { _id?: string; id?: string; name?: string } | null;
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
    'Partially Completed': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    Review: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    'To Do': { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
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
  newCommentStatus,
  submittingComment,
  copiedCommentId,
  copiedUrlIndex,
  isCopiedAllComments,
  isCopiedAllUrls,
  isDownloadingZip,
  onClose,
  onEdit,
  onDelete,
  onAddComment,
  onCommentChange,
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
      <div className="td-composer-avatar">{initials(task.createdBy?.name)}</div>
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
          <button className="td-primary-btn" type="button" onClick={onAddComment} disabled={submittingComment || !newCommentText.trim()}>
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
                  <button type="button" className="td-icon-action" onClick={() => onCopyComment('initial', task.comments || '')}>
                    {copiedCommentId === 'initial' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <p>{task.comments}</p>
                <div className="td-update-meta">
                  <span className="td-avatar sm">{initials(task.createdBy?.name)}</span>
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
                      <span className="td-avatar sm" style={{ background: comment.author?.avatarColor || '#4f46e5' }}>{initials(comment.author?.name)}</span>
                      <div>
                        <strong>{comment.author?.name || 'Team Member'}</strong>
                        {comment.author?.role && <span>{comment.author.role}</span>}
                      </div>
                    </div>
                    <div className="td-update-actions">
                      <span>{formatDate(comment.createdAt, true)}</span>
                      <button type="button" className="td-icon-action" onClick={() => onCopyComment(commentId, comment.content)}>
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
        <div className="td-empty"><Loader2 size={24} className="td-spin" /><strong>Loading work logs…</strong></div>
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
                <span className="td-avatar sm" style={{ background: session.employeeId?.avatarColor || '#4f46e5' }}>{initials(session.employeeId?.name)}</span>
                <div>
                  <strong>{session.employeeId?.name || 'Unknown Employee'}</strong>
                  <span>{session.date || 'Work session'}</span>
                </div>
              </div>
              <div className="td-session-meta">
                <span>{session.startTime || '—'} – {session.endTime || 'Active'}</span>
                <span className="td-mini-status">{session.status === 'Completed' ? (session.isFullyCompleted ? 'Completed' : 'Partial') : 'In Progress'}</span>
                {session.totalMinutes > 0 && <strong>{Math.floor(session.totalMinutes / 60) > 0 ? `${Math.floor(session.totalMinutes / 60)}h ${session.totalMinutes % 60}m` : `${session.totalMinutes}m`}</strong>}
              </div>
              {session.notes && <div className="td-session-notes" dangerouslySetInnerHTML={{ __html: session.notes }} />}
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
        <div className="td-empty"><Paperclip size={24} /><strong>No files attached</strong><span>Files added to this task will appear here.</span></div>
      ) : (
        <div className="td-file-grid">
          {task.files.map((file, index) => {
            const isImage = file.type?.startsWith('image/') || /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(file.name);
            return (
              <div className="td-file-card" key={`${file.name}-${index}`}>
                <button type="button" className="td-file-preview" onClick={() => onViewFile(file)}>
                  {isImage ? <img src={file.url} alt={file.name} /> : <FileText size={24} />}
                </button>
                <div className="td-file-info">
                  <strong title={file.name}>{file.name}</strong>
                  <span>{formatBytes(file.size) || file.type || 'Attachment'}</span>
                </div>
                <button type="button" className="td-icon-action" onClick={() => onDownloadFile(file)} title="Download">
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
        <div className="td-empty"><LinkIcon size={24} /><strong>No links attached</strong><span>Useful URLs for this task will appear here.</span></div>
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
                  <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="td-ghost-btn td-small"><ExternalLink size={14} /> Open</a>
                  <button type="button" className="td-icon-action" onClick={() => onCopyUrl(index, fullUrl)}>
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
      <style>{`
        .td-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.58);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:18px}
        .td-modal{width:min(1180px,100%);height:min(900px,94vh);background:var(--bg-primary,#fff);border:1px solid var(--border-color,#e2e8f0);border-radius:18px;box-shadow:0 30px 80px rgba(15,23,42,.24);overflow:hidden;display:flex;flex-direction:column;color:var(--text-primary,#0f172a)}
        .td-header{padding:20px 24px 0;border-bottom:1px solid var(--border-color,#e2e8f0);background:var(--bg-primary,#fff)}
        .td-header-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
        .td-header-left{min-width:0;flex:1}.td-kicker{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:10px}.td-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;border:1px solid var(--border-color,#e2e8f0);font-size:12px;font-weight:750;line-height:1}.td-number{background:var(--bg-secondary,#f8fafc);color:var(--text-secondary,#475569)}
        .td-project{background:color-mix(in srgb, var(--td-project-color) 7%, transparent);color:var(--td-project-color);border-color:color-mix(in srgb, var(--td-project-color) 22%, transparent)}.td-project-dot{width:7px;height:7px;border-radius:50%;background:var(--td-project-color)}
        .td-title{font-size:24px;line-height:1.15;letter-spacing:-.035em;font-weight:850;margin:0;color:var(--text-primary,#0f172a)}
        .td-description-preview{margin:7px 0 0;color:var(--text-secondary,#64748b);font-size:13px;max-width:760px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .td-header-actions{display:flex;gap:8px;align-items:center;flex-shrink:0}.td-action-btn{height:36px;padding:0 12px;border:1px solid var(--border-color,#dbe3ef);background:var(--bg-primary,#fff);border-radius:9px;display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:750;color:var(--text-secondary,#475569);cursor:pointer}.td-action-btn:hover{background:var(--bg-secondary,#f8fafc)}.td-action-btn.danger{color:#dc2626;border-color:#fecaca;background:#fff}.td-close{width:36px;padding:0;border-radius:50%;justify-content:center}
        .td-tabs{display:flex;gap:4px;margin-top:20px;overflow:auto}.td-tab{position:relative;border:0;background:transparent;color:var(--text-secondary,#64748b);height:44px;padding:0 13px;display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:750;white-space:nowrap;cursor:pointer}.td-tab.active{color:#2563eb}.td-tab.active:after{content:'';position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:2px;background:#2563eb}.td-tab-count{min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--bg-secondary,#f1f5f9);display:inline-flex;align-items:center;justify-content:center;font-size:10px}.td-tab.active .td-tab-count{background:#eff6ff;color:#2563eb}
        .td-body{display:grid;grid-template-columns:minmax(0,1fr) 330px;min-height:0;flex:1}.td-main{min-width:0;overflow:auto;padding:24px}.td-sidebar{overflow:auto;padding:20px;border-left:1px solid var(--border-color,#e2e8f0);background:var(--bg-secondary,#fafcff)}
        .td-card{background:var(--bg-primary,#fff);border:1px solid var(--border-color,#e2e8f0);border-radius:14px;padding:17px}.td-sidebar-card+.td-sidebar-card{margin-top:12px}.td-sidebar-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;margin-bottom:15px}.td-sidebar-title svg{color:#2563eb}.td-info-list{display:flex;flex-direction:column;gap:14px}.td-info-row{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.td-info-label{font-size:11px;color:var(--text-muted,#94a3b8);font-weight:700}.td-info-value{font-size:12px;color:var(--text-primary,#0f172a);font-weight:750;text-align:right}.td-info-value.left{text-align:left}.td-due{display:inline-flex;align-items:center;gap:6px}.td-due-time{padding:3px 6px;border-radius:5px;background:#eff6ff;color:#2563eb}
        .td-assignee-list{display:flex;flex-wrap:wrap;gap:6px}.td-assignee{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border-color,#e2e8f0);background:var(--bg-secondary,#f8fafc);border-radius:999px;padding:4px 8px 4px 4px;font-size:11px;font-weight:700}.td-avatar{width:28px;height:28px;border-radius:50%;background:#4f46e5;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex:none}.td-avatar.sm{width:26px;height:26px;font-size:9px}
        .td-progress{height:7px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin:10px 0 7px}.td-progress-fill{height:100%;border-radius:inherit;background:#2563eb;width:${sessions.length ? '65%' : '0%'}}.td-progress-meta{display:flex;justify-content:space-between;color:var(--text-muted,#94a3b8);font-size:10px;font-weight:700}
        .td-section-stack{display:flex;flex-direction:column;gap:18px}.td-section-heading{display:flex;justify-content:space-between;gap:15px;align-items:center}.td-section-heading h3{font-size:17px;margin:3px 0 0;font-weight:850;letter-spacing:-.02em}.td-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;font-weight:800}.td-heading-pills{display:flex;gap:6px;flex-wrap:wrap}.td-heading-pills span{padding:6px 9px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:10px;font-weight:800}
        .td-description{font-size:13px;line-height:1.7;color:var(--text-secondary,#475569);background:var(--bg-secondary,#f8fafc);border:1px solid var(--border-color,#e2e8f0);border-radius:12px;padding:16px}.td-description:empty{display:none}
        .td-composer{display:flex;gap:11px;border:1px solid #dbe5f1;border-radius:14px;padding:13px;background:#fff;box-shadow:0 4px 16px rgba(15,23,42,.035)}.td-composer-avatar{width:30px;height:30px;border-radius:50%;background:#4f46e5;color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:none}.td-composer-main{flex:1;min-width:0}.td-composer textarea{width:100%;border:0;outline:none;resize:vertical;min-height:74px;font:inherit;font-size:13px;color:var(--text-primary,#0f172a);background:transparent}.td-composer textarea::placeholder{color:#94a3b8}.td-composer-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #eef2f7;padding-top:9px}.td-composer-tools{display:flex;gap:3px}.td-composer-tools button{width:30px;height:28px;border:0;background:transparent;color:#64748b;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer}.td-composer-tools button:hover{background:#f1f5f9}.td-primary-btn{height:34px;border:0;border-radius:8px;padding:0 13px;background:#2563eb;color:#fff;display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;cursor:pointer}.td-primary-btn:disabled{opacity:.5;cursor:not-allowed}
        .td-ghost-btn{height:32px;padding:0 10px;border:1px solid var(--border-color,#dbe3ef);background:#fff;border-radius:8px;display:inline-flex;align-items:center;gap:6px;color:#475569;font-size:11px;font-weight:750;cursor:pointer}.td-ghost-btn:hover{background:#f8fafc}.td-ghost-btn:disabled{opacity:.55;cursor:not-allowed}.td-ghost-btn.td-small{height:30px;text-decoration:none}.td-icon-action{width:30px;height:30px;border:0;background:transparent;border-radius:7px;color:#94a3b8;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.td-icon-action:hover{background:#f1f5f9;color:#475569}
        .td-timeline{position:relative;display:flex;flex-direction:column;gap:11px;padding-left:17px}.td-timeline:before{content:'';position:absolute;left:5px;top:9px;bottom:9px;width:1px;background:#dbe3ef}.td-timeline-item{position:relative}.td-timeline-dot{position:absolute;left:-17px;top:17px;width:11px;height:11px;border-radius:50%;background:#2563eb;border:3px solid #dbeafe;box-sizing:content-box;z-index:1}.td-update-card{border:1px solid var(--border-color,#e2e8f0);background:#fff;border-radius:12px;padding:13px 14px}.td-initial-note{border-left:3px solid #2563eb}.td-update-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.td-note-badge{font-size:10px;font-weight:800;color:#2563eb;background:#eff6ff;border:1px solid #dbeafe;border-radius:6px;padding:4px 7px}.td-update-card p{font-size:12px;line-height:1.6;color:var(--text-primary,#1e293b);margin:10px 0}.td-update-meta,.td-user-line,.td-update-actions{display:flex;align-items:center;gap:7px}.td-update-meta{font-size:10px;color:#94a3b8}.td-update-meta strong,.td-user-line strong{color:#334155}.td-user-line>div{display:flex;flex-direction:column;gap:1px}.td-user-line span{font-size:9px;color:#94a3b8}.td-update-actions{font-size:10px;color:#94a3b8}
        .td-empty{border:1px dashed #dbe3ef;background:#f8fafc;border-radius:14px;padding:34px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:7px;color:#94a3b8}.td-empty strong{font-size:12px;color:#334155}.td-empty span{font-size:11px;max-width:360px;line-height:1.5}.td-empty-large{padding:70px 20px}.td-empty-icon{width:50px;height:50px;border-radius:14px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;margin-bottom:5px}
        .td-session-list{display:flex;flex-direction:column;gap:9px}.td-session-card{border:1px solid var(--border-color,#e2e8f0);background:#fff;border-radius:12px;padding:13px;display:grid;grid-template-columns:1fr auto;gap:11px}.td-session-main{display:flex;gap:9px;align-items:center}.td-session-main div{display:flex;flex-direction:column;gap:2px}.td-session-main strong{font-size:12px}.td-session-main span{font-size:10px;color:#94a3b8}.td-session-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.td-session-meta>span:first-child{font-size:10px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:4px 7px}.td-session-meta strong{font-size:10px;color:#2563eb}.td-mini-status{font-size:9px;font-weight:800;color:#047857;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:999px;padding:4px 7px}.td-session-notes{grid-column:1/-1;font-size:11px;color:#64748b;line-height:1.5;background:#f8fafc;border:1px solid #eef2f7;border-radius:8px;padding:9px 10px}
        .td-file-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}.td-file-card{border:1px solid var(--border-color,#e2e8f0);background:#fff;border-radius:12px;padding:9px;display:flex;align-items:center;gap:9px}.td-file-preview{width:42px;height:42px;border-radius:8px;border:1px solid #e2e8f0;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;flex:none}.td-file-preview img{width:100%;height:100%;object-fit:cover}.td-file-info{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}.td-file-info strong{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.td-file-info span{font-size:9px;color:#94a3b8}
        .td-link-list{display:flex;flex-direction:column;gap:9px}.td-link-card{display:flex;align-items:center;gap:10px;border:1px solid var(--border-color,#e2e8f0);background:#fff;border-radius:12px;padding:11px}.td-link-icon{width:36px;height:36px;border-radius:9px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;flex:none}.td-link-content{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}.td-link-content strong{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.td-link-content span{font-size:9px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.td-link-actions{display:flex;align-items:center;gap:3px}
        .td-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 20px;border-top:1px solid var(--border-color,#e2e8f0);background:#fff}.td-footer-left,.td-footer-right{display:flex;align-items:center;gap:8px}.td-view-btn{height:34px;padding:0 11px;border:1px solid #dbe3ef;border-radius:8px;background:#fff;color:#475569;font-size:11px;font-weight:750;display:inline-flex;align-items:center;gap:7px}
        .td-spin{animation:tdspin .8s linear infinite}@keyframes tdspin{to{transform:rotate(360deg)}}
        @media(max-width:900px){.td-body{grid-template-columns:1fr}.td-sidebar{display:none}.td-modal{height:95vh}.td-header-actions .td-action-btn span{display:none}.td-action-btn{width:36px;padding:0;justify-content:center}.td-header{padding:16px 16px 0}.td-main{padding:16px}.td-title{font-size:20px}}
        @media(max-width:560px){.td-overlay{padding:0}.td-modal{height:100vh;border-radius:0;border:0}.td-header-top{gap:10px}.td-description-preview{display:none}.td-tab{padding:0 9px}.td-tab.active:after{left:5px;right:5px}.td-composer{padding:10px}.td-composer-footer{align-items:flex-end}.td-session-card{grid-template-columns:1fr}.td-session-meta{justify-content:flex-start}.td-footer-left{display:none}.td-footer{justify-content:flex-end}}
      `}</style>

      <div className="td-modal" style={{ "--td-project-color": projectColor } as any} onClick={(e) => e.stopPropagation()}>
        <header className="td-header">
          <div className="td-header-top">
            <div className="td-header-left">
              <div className="td-kicker">
                <span className="td-chip td-number">#{task._id.slice(-4)}</span>
                <span className="td-chip" style={{ background: priority.bg, color: priority.color, borderColor: priority.border }}>{task.priority}</span>
                {(task.projectId?.name || task.Project) && (
                  <span className="td-chip td-project"><span className="td-project-dot" />{task.projectId?.name || task.Project}</span>
                )}
                <span className="td-chip" style={{ background: status.bg, color: status.color, borderColor: status.border }}>{task.status}</span>
              </div>
              <h2 className="td-title">{task.title}</h2>
              {task.description ? (
                <div className="td-description-preview" dangerouslySetInnerHTML={{ __html: task.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }} />
              ) : (
                <div className="td-description-preview">No description added for this task.</div>
              )}
            </div>
            <div className="td-header-actions">
              {onEdit && <button type="button" className="td-action-btn" onClick={onEdit}><FileText size={15} /><span>Edit</span></button>}
              <button type="button" className="td-action-btn" onClick={() => navigator.clipboard?.writeText(task.title)}><Copy size={15} /><span>Duplicate</span></button>
              {onDelete && <button type="button" className="td-action-btn danger" onClick={onDelete}><Trash2 size={15} /><span>Delete</span></button>}
              <button type="button" className="td-action-btn td-close" onClick={onClose} aria-label="Close"><X size={17} /></button>
            </div>
          </div>
          <nav className="td-tabs" aria-label="Task details tabs">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button key={id} type="button" className={`td-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                <Icon size={15} />{label}{count ? <span className="td-tab-count">{count}</span> : null}
              </button>
            ))}
          </nav>
        </header>

        <div className="td-body">
          <main className="td-main">
            {tab === 'details' && (
              <div className="td-section-stack">
                <div className="td-section-heading">
                  <div><span className="td-eyebrow">Overview</span><h3>Task description</h3></div>
                </div>
                <div className="td-description">
                  {task.description ? <div dangerouslySetInnerHTML={{ __html: task.description }} /> : <span style={{ color: '#94a3b8' }}>No description added for this task.</span>}
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
              <div className="td-sidebar-title"><CheckCircle2 size={16} />Task information</div>
              <div className="td-info-list">
                <div className="td-info-row"><span className="td-info-label">Status</span><span className="td-chip" style={{ background: status.bg, color: status.color, borderColor: status.border }}>{task.status}</span></div>
                <div className="td-info-row"><span className="td-info-label">Priority</span><span className="td-chip" style={{ background: priority.bg, color: priority.color, borderColor: priority.border }}>{task.priority}</span></div>
                <div className="td-info-row"><span className="td-info-label">Due date</span><span className="td-info-value"><span className="td-due"><Calendar size={13} />{task.dueDate ? formatDate(task.dueDate) : 'No due date'}</span>{task.dueTime && <span className="td-due-time">{task.dueTime}</span>}</span></div>
                <div className="td-info-row"><span className="td-info-label">Created</span><span className="td-info-value">{formatDate(task.createdAt, true)}</span></div>
              </div>
            </div>

            <div className="td-card td-sidebar-card">
              <div className="td-sidebar-title"><Users size={16} />Assignees</div>
              <div className="td-info-list">
                <div>
                  <div className="td-info-label" style={{ marginBottom: 7 }}>Assigned by</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="td-avatar" style={{ background: task.createdBy?.avatarColor || '#4f46e5' }}>{initials(task.createdBy?.name)}</span><strong style={{ fontSize: 12 }}>{task.createdBy?.name || 'System Admin'}</strong></div>
                </div>
                <div>
                  <div className="td-info-label" style={{ marginBottom: 7 }}>Assigned to</div>
                  {task.assignedTo?.length ? <div className="td-assignee-list">{task.assignedTo.map((emp) => <span className="td-assignee" key={emp._id}><span className="td-avatar sm" style={{ background: emp.avatarColor || '#3b82f6' }}>{initials(emp.name)}</span>{emp.name}</span>)}</div> : <span style={{ fontSize: 11, color: '#94a3b8' }}>Unassigned</span>}
                </div>
              </div>
            </div>

            <div className="td-card td-sidebar-card">
              <div className="td-sidebar-title"><Activity size={16} />Work progress <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>{totalTime}</span></div>
              <div className="td-progress"><div className="td-progress-fill" /></div>
              <div className="td-progress-meta"><span>{sessions.length} logged sessions</span><span>{totalMinutes ? `${totalMinutes} min` : 'No time logged'}</span></div>
            </div>
          </aside>
        </div>

        <footer className="td-footer">
          <div className="td-footer-left"><button type="button" className="td-view-btn"><ExternalLink size={14} />View in Project</button></div>
          <div className="td-footer-right"><button type="button" className="td-view-btn" onClick={onClose}>Close</button></div>
        </footer>
      </div>
    </div>
  );
}
