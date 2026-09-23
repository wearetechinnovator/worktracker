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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const initials = (name?: string) =>
  name
    ?.split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const formatDate = (value?: string, withTime = false) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime
      ? {
          hour: 'numeric',
          minute: '2-digit',
        }
      : {}),
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

const getStatusClasses = (status: string) => {
  switch (status) {
    case 'Completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'In Progress':
      return 'border-blue-200 bg-blue-50 text-blue-700';

    case 'Paused':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'Partially Done':
    case 'Partially Completed':
      return 'border-orange-200 bg-orange-50 text-orange-700';

    case 'Review':
      return 'border-violet-200 bg-violet-50 text-violet-700';

    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
};

const getPriorityClasses = (priority: string) => {
  switch (priority) {
    case 'Urgent':
      return 'border-red-200 bg-red-50 text-red-700';

    case 'High':
      return 'border-orange-200 bg-orange-50 text-orange-700';

    case 'Medium':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'Low':
      return 'border-green-200 bg-green-50 text-green-700';

    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function TaskDetailsModal({
  task,
  sessions,
  loadingSessions,
  user,
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
  const [tab, setTab] = useState<
    'details' | 'updates' | 'work' | 'files' | 'links'
  >('details');

  const isAdmin = Number(user?.user_role) === 1;

  const links = useMemo(() => {
    if (task.urls?.length) {
      return task.urls;
    }

    return task.url ? [task.url] : [];
  }, [task.urls, task.url]);

  const updateCount =
    (task.commentsList?.length || 0) + (task.comments ? 1 : 0);

  const totalMinutes = sessions.reduce(
    (sum, session) => sum + Number(session.totalMinutes || 0),
    0
  );

  const totalTime = totalMinutes
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : '0m';

  const projectColor = task.projectId?.color || '#3b82f6';

  const tabs = [
    {
      id: 'details' as const,
      label: 'Details',
      icon: FileText,
    },
    {
      id: 'updates' as const,
      label: 'Updates',
      icon: MessageSquare,
      count: updateCount || undefined,
    },
    {
      id: 'work' as const,
      label: 'Work Logs',
      icon: Clock3,
      count: sessions.length || undefined,
    },
    {
      id: 'files' as const,
      label: 'Files',
      icon: Paperclip,
      count: task.files?.length || undefined,
    },
    {
      id: 'links' as const,
      label: 'Links',
      icon: LinkIcon,
      count: links.length || undefined,
    },
  ];

  /* ------------------------------------------------------------------------ */
  /* Composer                                                                  */
  /* ------------------------------------------------------------------------ */

  const renderComposer = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
          {initials(user?.name || task.createdBy?.name)}
        </div>

        <div className="min-w-0 flex-1">
          <textarea
            value={newCommentText}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder="Write a progress update, remark, or comment..."
            rows={4}
            className="w-full resize-none border-0 bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
          />

          <div className="mt-2 flex items-center justify-between gap-4 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Bold"
                className="flex h-8 w-8 items-center justify-center rounded-md text-sm text-slate-600 transition hover:bg-slate-100"
              >
                <strong>B</strong>
              </button>

              <button
                type="button"
                aria-label="Italic"
                className="flex h-8 w-8 items-center justify-center rounded-md text-sm text-slate-600 transition hover:bg-slate-100"
              >
                <em>I</em>
              </button>

              <button
                type="button"
                aria-label="Add attachment"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100"
              >
                <Paperclip size={16} />
              </button>

              <button
                type="button"
                aria-label="Add link"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100"
              >
                <LinkIcon size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={onAddComment}
              disabled={
                submittingComment || !newCommentText.trim()
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingComment ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <MessageSquare size={15} />
              )}

              Post Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ------------------------------------------------------------------------ */
  /* Updates                                                                   */
  /* ------------------------------------------------------------------------ */

  const renderUpdates = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Activity
          </p>

          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Task updates
          </h3>
        </div>

        {updateCount > 0 && (
          <button
            type="button"
            onClick={onCopyAllComments}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {isCopiedAllComments ? (
              <Check size={15} />
            ) : (
              <Copy size={15} />
            )}

            {isCopiedAllComments ? 'Copied' : 'Copy updates'}
          </button>
        )}
      </div>

      {task.comments || task.commentsList?.length ? (
        <div className="relative space-y-4 border-l border-slate-200 pl-6">
          {task.comments && (
            <div className="relative">
              <span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full border-[3px] border-blue-100 bg-blue-600" />

              <div className="rounded-xl border border-slate-200 border-l-[3px] border-l-blue-500 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                    Initial Note
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      onCopyComment(
                        'initial',
                        task.comments || ''
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {copiedCommentId === 'initial' ? (
                      <Check size={15} />
                    ) : (
                      <Copy size={15} />
                    )}
                  </button>
                </div>

                <p className="my-4 text-sm leading-6 text-slate-700">
                  {task.comments}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white">
                    {initials(task.createdBy?.name)}
                  </div>

                  <strong className="text-slate-600">
                    {task.createdBy?.name || 'System Admin'}
                  </strong>

                  <span>•</span>

                  <span>
                    {formatDate(task.createdAt, true)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {task.commentsList?.map((comment, index) => {
            const commentId = comment._id || String(index);

            return (
              <div
                className="relative"
                key={commentId}
              >
                <span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full border-[3px] border-blue-100 bg-blue-600" />

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{
                          background:
                            comment.author?.avatarColor ||
                            '#4f46e5',
                        }}
                      >
                        {initials(comment.author?.name)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700">
                          {comment.author?.name ||
                            'Team Member'}
                        </p>

                        {comment.author?.role && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {comment.author.role}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                      <span>
                        {formatDate(
                          comment.createdAt,
                          true
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          onCopyComment(
                            commentId,
                            comment.content
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        {copiedCommentId === commentId ? (
                          <Check size={15} />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-700">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
          <MessageSquare
            size={28}
            className="mb-3 text-slate-400"
          />

          <strong className="text-sm font-semibold text-slate-700">
            No updates yet
          </strong>

          <span className="mt-1 text-sm text-slate-400">
            Add the first progress update below.
          </span>
        </div>
      )}

      {renderComposer()}
    </div>
  );

  /* ------------------------------------------------------------------------ */
  /* Work Logs                                                                 */
  /* ------------------------------------------------------------------------ */

  const renderWorkLogs = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Time tracking
          </p>

          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Work session logs
          </h3>
        </div>

        <div className="flex gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {sessions.length} sessions
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {totalTime} total
          </span>
        </div>
      </div>

      {loadingSessions ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16">
          <Loader2
            size={28}
            className="mb-3 animate-spin text-slate-400"
          />

          <strong className="text-sm font-semibold text-slate-700">
            Loading work logs…
          </strong>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Activity size={26} />
          </div>

          <strong className="text-sm font-semibold text-slate-700">
            No work sessions logged yet
          </strong>

          <span className="mt-1 max-w-md text-sm leading-6 text-slate-400">
            Employees working on this task will log their active
            hours here.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{
                      background:
                        session.employeeId?.avatarColor ||
                        '#4f46e5',
                    }}
                  >
                    {initials(
                      session.employeeId?.name
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {session.employeeId?.name ||
                        'Unknown Employee'}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {session.date || 'Work session'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                    {session.startTime || '—'} –{' '}
                    {session.endTime || 'Active'}
                  </span>

                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                    {session.status === 'Completed'
                      ? session.isFullyCompleted
                        ? 'Completed'
                        : 'Partial'
                      : 'In Progress'}
                  </span>

                  {session.totalMinutes > 0 && (
                    <strong className="text-xs text-blue-600">
                      {Math.floor(
                        session.totalMinutes / 60
                      ) > 0
                        ? `${Math.floor(
                            session.totalMinutes / 60
                          )}h ${
                            session.totalMinutes % 60
                          }m`
                        : `${session.totalMinutes}m`}
                    </strong>
                  )}
                </div>
              </div>

              {session.notes && (
                <div
                  className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-600"
                  dangerouslySetInnerHTML={{
                    __html: session.notes,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ------------------------------------------------------------------------ */
  /* Files                                                                     */
  /* ------------------------------------------------------------------------ */

  const renderFiles = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Attachments
          </p>

          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Task files
          </h3>
        </div>

        {!!task.files?.length && (
          <button
            type="button"
            onClick={onDownloadAllFiles}
            disabled={isDownloadingZip}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDownloadingZip ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <Archive size={15} />
            )}

            {isDownloadingZip
              ? 'Preparing ZIP…'
              : 'Download all'}
          </button>
        )}
      </div>

      {!task.files?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <Paperclip
            size={28}
            className="mb-3 text-slate-400"
          />

          <strong className="text-sm font-semibold text-slate-700">
            No files attached
          </strong>

          <span className="mt-1 text-sm text-slate-400">
            Files added to this task will appear here.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {task.files.map((file, index) => {
            const isImage =
              file.type?.startsWith('image/') ||
              /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(
                file.name
              );

            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <button
                  type="button"
                  onClick={() => onViewFile(file)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                >
                  {isImage ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileText size={22} />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    title={file.name}
                    className="truncate text-sm font-semibold text-slate-700"
                  >
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {formatBytes(file.size) ||
                      file.type ||
                      'Attachment'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onDownloadFile(file)}
                  title="Download"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <Download size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ------------------------------------------------------------------------ */
  /* Links                                                                     */
  /* ------------------------------------------------------------------------ */

  const renderLinks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Resources
          </p>

          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Task links
          </h3>
        </div>

        {!!links.length && (
          <button
            type="button"
            onClick={onCopyAllUrls}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {isCopiedAllUrls ? (
              <Check size={15} />
            ) : (
              <Copy size={15} />
            )}

            {isCopiedAllUrls ? 'Copied' : 'Copy all'}
          </button>
        )}
      </div>

      {!links.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <LinkIcon
            size={28}
            className="mb-3 text-slate-400"
          />

          <strong className="text-sm font-semibold text-slate-700">
            No links attached
          </strong>

          <span className="mt-1 text-sm text-slate-400">
            Useful URLs for this task will appear here.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((url, index) => {
            const fullUrl = url.startsWith('http')
              ? url
              : `https://${url}`;

            const copied = copiedUrlIndex === index;

            return (
              <div
                key={`${url}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <LinkIcon size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">
                    {url}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-400">
                    {fullUrl}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <ExternalLink size={15} />

                    <span className="hidden sm:inline">
                      Open
                    </span>
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      onCopyUrl(index, fullUrl)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {copied ? (
                      <Check size={15} />
                    ) : (
                      <Copy size={15} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ------------------------------------------------------------------------ */
  /* Main UI                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[92vh] max-h-[900px] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}

        <header className="shrink-0 border-b border-slate-200 bg-white px-6 pt-5">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  #{task._id.slice(-4)}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${getPriorityClasses(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>

                {(task.projectId?.name || task.Project) && (
                  <span
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                    style={{
                      color: projectColor,
                      borderColor: `${projectColor}40`,
                      backgroundColor: `${projectColor}10`,
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: projectColor,
                      }}
                    />

                    {task.projectId?.name || task.Project}
                  </span>
                )}

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                    task.status
                  )}`}
                >
                  {task.status}
                </span>
              </div>

              {task.task_id && (
                <p className="mb-1 text-xs font-semibold text-slate-400">
                  {task.task_id}
                </p>
              )}

              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {task.title}
              </h2>

              <p className="mt-2 max-w-3xl truncate text-sm text-slate-500">
                {task.description
                  ? task.description
                      .replace(/<[^>]*>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim()
                  : 'No description added for this task.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isAdmin && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <FileText size={15} />

                  <span className="hidden sm:inline">
                    Edit
                  </span>
                </button>
              )}

              {isAdmin && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={15} />

                  <span className="hidden sm:inline">
                    Delete
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tabs */}

          <nav className="mt-5 flex gap-1 overflow-x-auto">
            {tabs.map(
              ({
                id,
                label,
                icon: Icon,
                count,
              }) => {
                const active = tab === id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`relative flex h-12 shrink-0 items-center gap-2 px-4 text-sm font-medium transition ${
                      active
                        ? 'text-blue-600'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={16} />

                    {label}

                    {count ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          active
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    ) : null}

                    {active && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-600" />
                    )}
                  </button>
                );
              }
            )}
          </nav>
        </header>

        {/* Body */}

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main */}

          <main className="min-w-0 overflow-y-auto p-6">
            {tab === 'details' && (
              <div className="space-y-7">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Overview
                  </p>

                  <h3 className="mt-1 text-lg font-semibold text-slate-900">
                    Task description
                  </h3>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                  {task.description ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: task.description,
                      }}
                    />
                  ) : (
                    <span className="text-slate-400">
                      No description added for this task.
                    </span>
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

          {/* Sidebar */}

          <aside className="hidden min-h-0 overflow-y-auto border-l border-slate-200 bg-slate-50/60 p-5 lg:block">
            <div className="space-y-4">
              {/* Task information */}

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <CheckCircle2
                    size={17}
                    className="text-blue-600"
                  />

                  Task information
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-400">
                      Status
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-400">
                      Priority
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${getPriorityClasses(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-slate-400">
                      Due date
                    </span>

                    <div className="text-right text-sm font-medium text-slate-700">
                      <div className="flex items-center justify-end gap-2">
                        <Calendar size={14} />

                        {task.dueDate
                          ? formatDate(task.dueDate)
                          : 'No due date'}
                      </div>

                      {task.dueTime && (
                        <span className="mt-1 inline-block rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-600">
                          {task.dueTime}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-slate-400">
                      Created
                    </span>

                    <span className="text-right text-sm font-medium text-slate-700">
                      {formatDate(task.createdAt, true)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignees */}

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Users
                    size={17}
                    className="text-blue-600"
                  />

                  Assignees
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-sm text-slate-400">
                      Assigned by
                    </p>

                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{
                          background:
                            task.createdBy?.avatarColor ||
                            '#4f46e5',
                        }}
                      >
                        {initials(task.createdBy?.name)}
                      </div>

                      <strong className="text-sm text-slate-700">
                        {task.createdBy?.name ||
                          'System Admin'}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm text-slate-400">
                      Assigned to
                    </p>

                    {task.assignedTo?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {task.assignedTo.map((emp) => (
                          <span
                            key={emp._id}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-1.5 pr-3 text-xs font-medium text-slate-700"
                          >
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                              style={{
                                background:
                                  emp.avatarColor ||
                                  '#3b82f6',
                              }}
                            >
                              {initials(emp.name)}
                            </span>

                            {emp.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Work progress */}

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Activity
                    size={17}
                    className="text-blue-600"
                  />

                  Work progress

                  <span className="ml-auto text-xs font-medium text-slate-400">
                    {totalTime}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width: sessions.length
                        ? '65%'
                        : '0%',
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                  <span>
                    {sessions.length} logged sessions
                  </span>

                  <span>
                    {totalMinutes
                      ? `${totalMinutes} min`
                      : 'No time logged'}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}