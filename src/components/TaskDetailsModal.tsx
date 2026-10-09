'use client';

import { useCallback, useEffect, useState } from 'react';
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
  Send,
  Pause,
  Play,
  Check,
  CheckCheck,
  Paperclip,
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

interface TaskUpdateLog {
  _id: string;
  action?: string;
  message?: string;
  files?: Array<{ name?: string; url?: string; type?: string }>;
  links?: unknown[];
  timestamp?: string;
  user_id?: {
    full_name?: string;
    name?: string;
    email?: string;
  };
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
  onUpdated?: (task?: TaskDetailsTask) => void | Promise<void>;
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

const normalizeLink = (value: unknown) => {
  if (typeof value === 'string') return value.trim();

  if (value && typeof value === 'object') {
    const linkValue = value as { url?: unknown; link?: unknown };
    return String(linkValue.url || linkValue.link || '').trim();
  }

  return '';
};

const getSafeLinkHref = (value: string) => {
  try {
    const candidate = /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;
    const parsed = new URL(candidate);

    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
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
  onUpdated,
}: TaskDetailsModalProps) {
  const [showTaskLogs, setShowTaskLogs] = useState(true);
  const [showAssignee, setShowAssignee] = useState(true);

  const [updateText, setUpdateText] = useState("");
  const [updateLinks, setUpdateLinks] = useState("");
  const [updateFiles, setUpdateFiles] = useState<Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>>([]);
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [taskUpdates, setTaskUpdates] = useState<TaskUpdateLog[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  const isAdmin = Number(user?.user_role) === 1;

  const status = statusStyle(task.status);
  const priority = priorityStyle(task.priority);

  const projectColor =
    task.projectId?.color || '#3b82f6';

  const rawLinks = task.urls?.length
    ? task.urls
    : task.url
      ? [task.url]
      : [];
  const links = rawLinks
    .map(normalizeLink)
    .filter((link): link is string => Boolean(link));

  const loadTaskUpdates = useCallback(async () => {
    setLoadingUpdates(true);
    try {
      const response = await fetch(
        `/api/task-logs?taskId=${encodeURIComponent(task._id)}&limit=100`,
        { credentials: 'include', cache: 'no-store' }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load task updates');
      }

      const updates = Array.isArray(result.data)
        ? result.data.filter((entry: TaskUpdateLog) =>
            String(entry.action || '').startsWith('Posted a task update') ||
            String(entry.action || '').startsWith('Updated task status') ||
            Boolean(
              entry.message ||
              (Array.isArray(entry.files) && entry.files.length > 0) ||
              (Array.isArray(entry.links) && entry.links.length > 0)
            )
          )
        : [];

      setTaskUpdates(updates);
    } catch (error) {
      console.error('Failed to load task updates:', error);
      setTaskUpdates([]);
    } finally {
      setLoadingUpdates(false);
    }
  }, [task._id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTaskUpdates();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTaskUpdates]);

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
            const fullUrl = getSafeLinkHref(url);

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

                {fullUrl ? (
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="td-link-open"
                    title="Open link"
                  >
                    <ExternalLink size={15} />
                  </a>
                ) : null}
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
    const rawComments: unknown = task.comments;
    const addComment = (value: unknown) => {
      if (typeof value !== 'string') return;

      const text = value.trim();
      if (text && !comments.includes(text)) {
        comments.push(text);
      }
    };

    if (typeof rawComments === 'string') {
      addComment(rawComments);
    } else if (Array.isArray(rawComments)) {
      rawComments.forEach((comment: unknown) => {
        if (typeof comment === 'string') {
          addComment(comment);
        } else if (comment && typeof comment === 'object') {
          const value = comment as {
            comment?: unknown;
            content?: unknown;
          };
          addComment(value.comment ?? value.content);
        }
      });
    }

    if (task.commentsList?.length) {
      task.commentsList.forEach((comment) => {
        addComment(comment.content);
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

  const handleUpdateFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const valid = selected.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} is larger than 10 MB.`);
        return false;
      }
      return true;
    });

    try {
      const uploaded = [] as Array<{
        name: string;
        url: string;
        size?: number;
        type?: string;
      }>;

      for (const file of valid) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/uploads", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || `Failed to upload ${file.name}`);
        }

        uploaded.push(result.data);
      }

      setUpdateFiles((previous) => [...previous, ...uploaded]);
      event.target.value = "";
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to upload file");
    }
  };

  const handlePostUpdate = async () => {
    if (!user || postingUpdate) return;

    if (Number(user.user_role) !== 1 && !task.assignedTo?.some((employee) => String(employee._id) === String(user._id || user.id))) {
      alert("You can only update a task assigned to you.");
      return;
    }

    if (!updateText.trim() && !updateFiles.length && !updateLinks.trim()) {
      alert("Please add an update, status, file, or link.");
      return;
    }

    setPostingUpdate(true);
    try {
      const links = updateLinks
        .split(/\n|,/)
        .map((link) => link.trim())
        .filter(Boolean);

      const response = await fetch(`/api/tasks/${task._id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: updateText.trim(),
          files: updateFiles,
          links,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to post update");
      }

      setUpdateText("");
      setUpdateLinks("");
      setUpdateFiles([]);
      await loadTaskUpdates();
      await onUpdated?.(result.data);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to post update");
    } finally {
      setPostingUpdate(false);
    }
  };

  const handleEmployeeWorkAction = async (
    action: "start" | "pause" | "resume" | "partial" | "complete"
  ) => {
    if (!user || postingUpdate) return;

    const currentUserId = String(user._id || user.id || "");
    const currentWork = sessions.find((session) => {
      const employeeId = String(
        session.employeeId?._id || session.employeeId || ""
      );

      return (
        employeeId === currentUserId &&
        (session.status === "In Progress" || session.status === "Paused")
      );
    });

    if (action !== "start" && !currentWork) {
      alert("Start work on this task first.");
      return;
    }

    if (action === "pause" && currentWork.status !== "In Progress") {
      alert("Only active work can be paused.");
      return;
    }

    if (action === "resume" && currentWork.status !== "Paused") {
      alert("This task is not paused.");
      return;
    }

    setPostingUpdate(true);
    try {
      const links = updateLinks
        .split(/\n|,/)
        .map((link) => link.trim())
        .filter(Boolean);
      const workAction = action === "partial" || action === "complete"
        ? "complete"
        : action;

      const response = await fetch("/api/task-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: workAction,
          taskId: task._id,
          workId: currentWork?._id,
          notes: updateText.trim(),
          links,
          files: updateFiles,
          isFullyCompleted: action === "complete",
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update task work");
      }

      const nextStatus = action === "start" || action === "resume"
        ? "In Progress"
        : action === "pause"
        ? "Paused"
        : action === "partial"
          ? "Partially Done"
          : "Review";

      setUpdateText("");
      setUpdateLinks("");
      setUpdateFiles([]);
      await onUpdated?.({ ...task, status: nextStatus });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update task work");
    } finally {
      setPostingUpdate(false);
    }
  };

  const renderUpdateComposer = () => {
    if (!user) return null;

    const isAssignedEmployee = task.assignedTo?.some(
      (employee) => String(employee._id) === String(user._id || user.id)
    );

    if (Number(user.user_role) !== 2 || !isAssignedEmployee) return null;

    const currentUserId = String(user._id || user.id || "");
    const currentWork = sessions.find((session) => {
      const employeeId = String(
        session.employeeId?._id || session.employeeId || ""
      );

      return (
        employeeId === currentUserId &&
        (session.status === "In Progress" || session.status === "Paused")
      );
    });
    const isWorking = currentWork?.status === "In Progress";
    const isPaused = currentWork?.status === "Paused";
    const isLocked = task.status === "Completed" || task.status === "Review";

    return (
      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 30,
          background: "rgba(255,255,255,0.98)",
          borderTop: "1px solid #e5e7eb",
          boxShadow: "0 -8px 24px rgba(15,23,42,0.08)",
          padding: "12px 16px 14px",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <strong style={{ fontSize: 13 }}>Update task</strong>
          <span style={{ fontSize: 11, color: "#64748b" }}>
            Post progress, files, links or change the work status
          </span>
        </div> */}

        <textarea
          value={updateText}
          onChange={(event) => setUpdateText(event.target.value)}
          placeholder="Write an update about your work..."
          rows={2}
          disabled={postingUpdate || isLocked}
          style={{
            width: "100%",
            resize: "vertical",
            border: "1px solid #dbe2ea",
            borderRadius: 10,
            padding: "10px 12px",
            outline: "none",
            fontSize: 13,
            minHeight: 40,
            boxSizing: "border-box",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <label
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #dbe2ea", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer", background: "white", opacity: postingUpdate || isLocked ? 0.6 : 1 }}
          >
            <Paperclip size={14} />
            Attach
            <input type="file" multiple hidden onChange={handleUpdateFiles} disabled={postingUpdate || isLocked} />
          </label>

          <input
            value={updateLinks}
            onChange={(event) => setUpdateLinks(event.target.value)}
            disabled={postingUpdate || isLocked}
            placeholder="Add link(s), comma or newline separated"
            style={{ flex: 1, minWidth: 180, border: "1px solid #dbe2ea", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}
          />

          <button
            type="button"
            onClick={handlePostUpdate}
            disabled={postingUpdate || isLocked}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, borderRadius: 8, padding: "9px 14px", background: "#111827", color: "white", fontSize: 12, fontWeight: 600, cursor: postingUpdate || isLocked ? "not-allowed" : "pointer", opacity: postingUpdate || isLocked ? 0.6 : 1 }}
          >
            {postingUpdate ? <Loader2 size={14} className="td-spin" /> : <Send size={14} />}
            {postingUpdate ? "Posting..." : "Post Update"}
          </button>
          {!currentWork ? (
            <button
              type="button"
              onClick={() => handleEmployeeWorkAction("start")}
              disabled={postingUpdate || isLocked}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, borderRadius: 8, padding: "9px 12px", background: "#2563eb", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: postingUpdate || isLocked ? 0.55 : 1 }}
            >
              <Play size={14} />
              Start Work
            </button>
          ) : isPaused ? (
            <button
              type="button"
              onClick={() => handleEmployeeWorkAction("resume")}
              disabled={postingUpdate || isLocked}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, borderRadius: 8, padding: "9px 12px", background: "#2563eb", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <Play size={14} />
              Resume
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleEmployeeWorkAction("pause")}
              disabled={postingUpdate || isLocked || !isWorking}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #f59e0b", borderRadius: 8, padding: "9px 12px", background: "#fffbeb", color: "#b45309", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: postingUpdate || isLocked || !isWorking ? 0.55 : 1 }}
            >
              <Pause size={14} />
              Pause
            </button>
          )}

          <button
            type="button"
            onClick={() => handleEmployeeWorkAction("partial")}
            disabled={postingUpdate || isLocked || (!isWorking && !isPaused)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #f97316", borderRadius: 8, padding: "9px 12px", background: "#fff7ed", color: "#c2410c", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: postingUpdate || isLocked || (!isWorking && !isPaused) ? 0.55 : 1 }}
          >
            {/* <Check size={14} /> */}
            Partially Complete
          </button>

          <button
            type="button"
            onClick={() => handleEmployeeWorkAction("complete")}
            disabled={postingUpdate || isLocked || (!isWorking && !isPaused)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, borderRadius: 8, padding: "9px 12px", background: "#047857", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: postingUpdate || isLocked || (!isWorking && !isPaused) ? 0.55 : 1 }}
          >
            {/* <CheckCheck size={14} /> */}
            Complete &amp; Submit
          </button>
        </div>

        {updateFiles.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {updateFiles.map((file, index) => (
              <span key={`${file.url}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f1f5f9", borderRadius: 6, padding: "5px 8px", fontSize: 11 }}>
                {file.name}
                <button type="button" onClick={() => setUpdateFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))} style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  /*
   * ---------------------------------------------------------
   * TASK LOGS
   * ---------------------------------------------------------
   */

  const renderTaskUpdates = () => {
    const displayedUpdates = [...taskUpdates];

    // Older work completions stored their notes on TaskWork before the
    // completion log started carrying update details.
    sessions.forEach((session) => {
      const message = typeof session.notes === 'string' ? session.notes.trim() : '';
      const files = Array.isArray(session.files) ? session.files : [];
      const links = Array.isArray(session.links) ? session.links : [];

      if (!message && files.length === 0 && links.length === 0) return;

      const alreadyListed = displayedUpdates.some((update) =>
        String(update.message || '').trim() === message &&
        JSON.stringify(update.files || []) === JSON.stringify(files) &&
        JSON.stringify(update.links || []) === JSON.stringify(links)
      );

      if (!alreadyListed) {
        displayedUpdates.push({
          _id: `work-${session._id}`,
          action: 'Posted a task update',
          message,
          files,
          links,
          timestamp: session.updatedAt || session.createdAt,
          user_id: session.employeeId,
        });
      }
    });

    return (
      <div className="td-collapse-card">
        <div className="td-collapse-header" style={{ cursor: 'default' }}>
          <span>Updates</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {displayedUpdates.length}
          </span>
        </div>

        <div className="td-collapse-content">
          {loadingUpdates ? (
            <div className="td-sidebar-empty">Loading updates...</div>
          ) : displayedUpdates.length === 0 ? (
            <div className="td-sidebar-empty">No updates yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {displayedUpdates.map((update) => {
                const message = String(
                  update.message ||
                    String(update.action || '').split(': ').slice(1).join(': ') ||
                    ''
                ).trim();
                const updateFiles = Array.isArray(update.files) ? update.files : [];
                const updateLinks = Array.isArray(update.links)
                  ? update.links.map(normalizeLink).filter(Boolean)
                  : [];
                const author =
                  update.user_id?.full_name ||
                  update.user_id?.name ||
                  update.user_id?.email ||
                  'Team member';

                return (
                  <div
                    key={update._id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 7,
                      padding: '8px 9px',
                      background: '#fff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <strong style={{ fontSize: 11, color: '#1e293b' }}>
                        {author}
                      </strong>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>
                        {update.timestamp
                          ? new Date(update.timestamp).toLocaleString()
                          : ''}
                      </span>
                    </div>

                    {message && (
                      <div
                        style={{
                          fontSize: 11,
                          lineHeight: 1.45,
                          color: '#475569',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {message}
                      </div>
                    )}

                    {(updateFiles.length > 0 || updateLinks.length > 0) && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 5,
                          marginTop: 6,
                        }}
                      >
                        {updateFiles.map((file, index: number) => (
                          <button
                            type="button"
                            key={`update-file-${update._id}-${index}`}
                            onClick={() => {
                              if (!file?.url) return;
                              onViewFile({
                                name: file.name || 'Attached file',
                                url: file.url,
                                type: file.type,
                              });
                            }}
                            disabled={!file?.url}
                            title={file?.name || 'Attached file'}
                            style={{
                              border: 0,
                              cursor: file?.url ? 'pointer' : 'default',
                              maxWidth: 150,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              padding: '3px 5px',
                              borderRadius: 4,
                              background: '#eff6ff',
                              color: '#2563eb',
                              fontSize: 10,
                            }}
                          >
                            <Paperclip size={10} style={{ verticalAlign: 'middle' }} />{' '}
                            {file?.name || 'Attached file'}
                          </button>
                        ))}

                        {updateLinks.map((link: string, index: number) => {
                          const href = getSafeLinkHref(link);
                          return href ? (
                            <a
                              key={`update-link-${update._id}-${index}`}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={link}
                              style={{
                                maxWidth: 150,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                padding: '3px 5px',
                                borderRadius: 4,
                                background: '#f0fdf4',
                                color: '#15803d',
                                fontSize: 10,
                              }}
                            >
                              <LinkIcon size={10} style={{ verticalAlign: 'middle' }} />{' '}
                              {link}
                            </a>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

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

            {/* EMPLOYEE UPDATES */}

            {renderTaskUpdates()}

            {/* TASK LOGS */}

            {renderTaskLogs()}

            {/* ASSIGNEE */}

            {renderAssignee()}

          </aside>
        </div>

        {renderUpdateComposer()}
      </div>
    </div>
  );
}