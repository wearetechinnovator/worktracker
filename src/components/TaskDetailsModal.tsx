'use client';

import { useState } from 'react';
import {
  Archive,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Link as LinkIcon,
  Loader2,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import './TaskDetailsModal.css';
import { formatTimeTo12H } from '@/lib/time';

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

  // Kept for parent compatibility
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

  onViewFile: (file: {
    name: string;
    url: string;
    type?: string;
  }) => void;

  onDownloadFile: (file: {
    name: string;
    url: string;
  }) => void;

  onDownloadAllFiles: () => void;
}

const initials = (name?: string) =>
  name
    ?.split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const formatDate = (value?: string) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '';

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const statusStyle = (status: string) => {
  const map: Record<
    string,
    {
      bg: string;
      color: string;
      border: string;
    }
  > = {
    Completed: {
      bg: '#ecfdf5',
      color: '#047857',
      border: '#a7f3d0',
    },

    'In Progress': {
      bg: '#eff6ff',
      color: '#1d4ed8',
      border: '#bfdbfe',
    },

    Paused: {
      bg: '#fef3c7',
      color: '#b45309',
      border: '#fde68a',
    },

    'Partially Done': {
      bg: '#fff7ed',
      color: '#c2410c',
      border: '#fed7aa',
    },

    'Partially Completed': {
      bg: '#fff7ed',
      color: '#c2410c',
      border: '#fed7aa',
    },

    Review: {
      bg: '#f5f3ff',
      color: '#6d28d9',
      border: '#ddd6fe',
    },

    'To Do': {
      bg: '#f8fafc',
      color: '#475569',
      border: '#cbd5e1',
    },
  };

  return (
    map[status] || {
      bg: '#f8fafc',
      color: '#475569',
      border: '#cbd5e1',
    }
  );
};

const priorityStyle = (priority: string) => {
  const map: Record<
    string,
    {
      bg: string;
      color: string;
      border: string;
    }
  > = {
    Urgent: {
      bg: '#fef2f2',
      color: '#b91c1c',
      border: '#fecaca',
    },

    High: {
      bg: '#fff7ed',
      color: '#c2410c',
      border: '#fed7aa',
    },

    Medium: {
      bg: '#fffbeb',
      color: '#b45309',
      border: '#fde68a',
    },

    Low: {
      bg: '#f0fdf4',
      color: '#15803d',
      border: '#bbf7d0',
    },
  };

  return (
    map[priority] || {
      bg: '#fffbeb',
      color: '#b45309',
      border: '#fde68a',
    }
  );
};

export default function TaskDetailsModal({
  task,
  sessions,
  loadingSessions,
  user,
  isDownloadingZip,

  onClose,
  onEdit,
  onDelete,

  onViewFile,
  onDownloadFile,
  onDownloadAllFiles,
}: TaskDetailsModalProps) {
  const [showTaskLogs, setShowTaskLogs] = useState(true);
  const [showAssignee, setShowAssignee] = useState(true);

  const isAdmin = Number(user?.user_role) === 1;

  const status = statusStyle(task.status);
  const priority = priorityStyle(task.priority);

  const projectColor =
    task.projectId?.color || '#3b82f6';

  const links = task.urls?.length
    ? task.urls
    : task.url
      ? [task.url]
      : [];

  /*
   * ---------------------------------------------------------
   * FILES
   * ---------------------------------------------------------
   */

  const renderFiles = () => {
    if (!task.files?.length) {
      return null;
    }

    return (
      <section className="td-simple-section">
        <div className="td-resource-header">
          <div className="td-resource-title">
            <FileText size={15} />
            <span>Files</span>
          </div>

          <button
            type="button"
            className="td-download-all-btn"
            onClick={onDownloadAllFiles}
            disabled={isDownloadingZip}
          >
            {isDownloadingZip ? (
              <Loader2
                size={14}
                className="td-spin"
              />
            ) : (
              <Archive size={14} />
            )}

            {isDownloadingZip
              ? 'Preparing...'
              : 'Download all'}
          </button>
        </div>

        <div className="td-file-list">
          {task.files.map((file, index) => {
            const isImage =
              file.type?.startsWith('image/') ||
              /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(
                file.name
              );

            return (
              <div
                className="td-file-row"
                key={`${file.name}-${index}`}
              >
                <button
                  type="button"
                  className="td-file-preview"
                  onClick={() => onViewFile(file)}
                >
                  {isImage ? (
                    <img
                      src={file.url}
                      alt={file.name}
                    />
                  ) : (
                    <FileText size={18} />
                  )}
                </button>

                <div className="td-file-info">
                  <strong title={file.name}>
                    {file.name}
                  </strong>

                  <span>
                    {formatBytes(file.size) ||
                      file.type ||
                      'Attachment'}
                  </span>
                </div>

                <button
                  type="button"
                  className="td-resource-action"
                  onClick={() =>
                    onDownloadFile(file)
                  }
                  title="Download file"
                >
                  <Download size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  /*
   * ---------------------------------------------------------
   * LINKS
   * ---------------------------------------------------------
   */

  const renderLinks = () => {
    if (!links.length) {
      return null;
    }

    return (
      <section className="td-simple-section">
        <div className="td-resource-title">
          <LinkIcon size={15} />
          <span>Link</span>
        </div>

        <div className="td-link-list-simple">
          {links.map((url, index) => {
            const fullUrl = url.startsWith('http')
              ? url
              : `https://${url}`;

            return (
              <div
                className="td-link-row"
                key={`${url}-${index}`}
              >
                <LinkIcon
                  size={15}
                  className="td-link-row-icon"
                />

                <div className="td-link-text">
                  <strong>{url}</strong>
                </div>

                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="td-link-open"
                  title="Open link"
                >
                  <ExternalLink size={15} />
                </a>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  /*
   * ---------------------------------------------------------
   * COMMENT
   *
   * ONLY COMMENT CONTENT.
   * No composer.
   * No author.
   * No date.
   * No copy button.
   * No timeline.
   * ---------------------------------------------------------
   */

  const renderComment = () => {
    const comments: string[] = [];

    if (task.comments?.trim()) {
      comments.push(task.comments.trim());
    }

    if (task.commentsList?.length) {
      task.commentsList.forEach((comment) => {
        if (comment.content?.trim()) {
          comments.push(comment.content.trim());
        }
      });
    }

    if (!comments.length) {
      return null;
    }

    return (
      <section className="td-simple-section td-comment-section">
        <div className="td-simple-heading">
          Comment
        </div>

        <div className="td-comment-content">
          {comments.map((comment, index) => (
            <p key={index}>{comment}</p>
          ))}
        </div>
      </section>
    );
  };

  /*
   * ---------------------------------------------------------
   * TASK LOGS
   * ---------------------------------------------------------
   */

  const renderTaskLogs = () => {
    return (
      <div className="td-collapse-card">
        <button
          type="button"
          className="td-collapse-header"
          onClick={() =>
            setShowTaskLogs((previous) => !previous)
          }
        >
          <span>Task Logs</span>

          <span
            className={`td-collapse-button ${
              showTaskLogs ? 'open' : ''
            }`}
          >
            ↓
          </span>
        </button>

        {showTaskLogs && (
          <div className="td-collapse-content">
            {loadingSessions ? (
              <div className="td-sidebar-empty">
                <Loader2
                  size={15}
                  className="td-spin"
                />
                Loading...
              </div>
            ) : sessions.length === 0 ? (
              <div className="td-sidebar-empty">
                No task logs
              </div>
            ) : (
              <div className="td-log-list">
                {sessions.map((session) => {
                  const startTime =
                    session.startTime
                      ? formatTimeTo12H(
                          session.startTime
                        )
                      : '—';

                  const endTime =
                    session.endTime
                      ? formatTimeTo12H(
                          session.endTime
                        )
                      : session.status === 'Paused'
                        ? 'Paused'
                        : 'Active';

                  const totalMinutes = Number(
                    session.totalMinutes || 0
                  );

                  const duration =
                    totalMinutes > 0
                      ? totalMinutes >= 60
                        ? `${Math.floor(
                            totalMinutes / 60
                          )}h ${
                            totalMinutes % 60
                          }m`
                        : `${totalMinutes}m`
                      : '0m';

                  return (
                    <div
                      className="td-log-item"
                      key={session._id}
                    >
                      <div className="td-log-time">
                        {startTime} – {endTime}
                      </div>

                      <div className="td-log-info">
                        <strong>
                          {session.employeeId
                            ?.name ||
                            'Unknown Employee'}
                        </strong>

                        <span>{duration}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /*
   * ---------------------------------------------------------
   * ASSIGNEE
   * ---------------------------------------------------------
   */

  const renderAssignee = () => {
    return (
      <div className="td-collapse-card">
        <button
          type="button"
          className="td-collapse-header"
          onClick={() =>
            setShowAssignee((previous) => !previous)
          }
        >
          <span>Assignee</span>

          <span
            className={`td-collapse-button ${
              showAssignee ? 'open' : ''
            }`}
          >
            ↑
          </span>
        </button>

        {showAssignee && (
          <div className="td-collapse-content">
            {task.assignedTo?.length ? (
              <div className="td-assignee-list-simple">
                {task.assignedTo.map((employee) => (
                  <div
                    className="td-assignee-row-simple"
                    key={employee._id}
                  >
                    <div>
                      <strong>
                        {employee.name}
                      </strong>

                      {employee.email && (
                        <span>
                          {employee.email}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="td-sidebar-empty">
                Unassigned
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div
      className="td-overlay"
      onClick={onClose}
    >
      <div
        className="td-modal"
        style={
          {
            '--td-project-color':
              projectColor,
          } as React.CSSProperties
        }
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* -------------------------------------------------
            HEADER
        ------------------------------------------------- */}

        <header className="td-header">
          <div className="td-header-top">
            <div className="td-header-left">
              <div className="td-kicker">
                <span className="td-chip td-number">
                  {task.task_id || 'TASK'}
                </span>

                <h2 className="td-title">
                  {task.title}
                </h2>

                {(task.projectId?.name ||
                  task.Project) && (
                  <span className="td-chip td-project">
                    <Folder size={14} />

                    {task.projectId?.name ||
                      task.Project}
                  </span>
                )}

                <span
                  className="td-chip"
                  style={{
                    background:
                      priority.bg,
                    color: priority.color,
                    border: `1px solid ${priority.border}`,
                  }}
                >
                  {task.priority}
                </span>

                <span
                  className="td-chip"
                  style={{
                    background:
                      status.bg,
                    color: status.color,
                    border: `1px solid ${status.border}`,
                  }}
                >
                  {task.status}
                </span>
              </div>
            </div>

            <div className="td-header-actions">
              {isAdmin && onEdit && (
                <button
                  type="button"
                  className="td-action-btn"
                  onClick={onEdit}
                >
                  <FileText size={15} />
                  <span>Edit</span>
                </button>
              )}

              {isAdmin && onDelete && (
                <button
                  type="button"
                  className="td-action-btn danger"
                  onClick={onDelete}
                >
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
        </header>

        {/* -------------------------------------------------
            BODY
        ------------------------------------------------- */}

        <div className="td-body">

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <main className="td-main">

            {/* DESCRIPTION */}

            <section className="td-simple-section">
              <div className="td-description">
                {task.description ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html:
                        task.description,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: '#94a3b8',
                    }}
                  >
                    No description added for
                    this task.
                  </span>
                )}
              </div>
            </section>

            {/* FILES */}

            {renderFiles()}

            {/* LINKS */}

            {renderLinks()}

            {/* COMMENT */}

            {renderComment()}
          </main>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <aside className="td-sidebar">

            {/* TASK LOGS */}

            {renderTaskLogs()}

            {/* ASSIGNEE */}

            {renderAssignee()}

          </aside>
        </div>
      </div>
    </div>
  );
}