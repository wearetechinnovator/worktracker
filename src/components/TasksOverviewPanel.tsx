'use client';

import { Loader2, Pause, Play } from 'lucide-react';
import '../components/TasksOverviewPanel.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomSelect, { SelectOption } from './CustomSelect';
import { taskApi } from '@/lib/taskApi';
import TaskDetailsModal, { TaskDetailsTask } from './TaskDetailsModal';
import EndWorkSessionModal from './EndWorkSessionModal';


type Task = {
  _id: string;
  title: string;
  description?: string;
  status?: string;
  task_status?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  projectId?: { _id: string; name: string; color: string };
  assignedTo?: Array<{ _id: string; name: string; email?: string; avatarColor?: string }>;
  files?: Array<{ name: string; url: string; size?: number; type?: string }>;
  urls?: string[];
  url?: string;
  createdAt?: string;
};

type TaskWork = {
  _id: string;
  taskId: string | { _id: string };
  status: "In Progress" | "Paused" | "Completed";
  isFullyCompleted?: boolean;
  employeeId?: string | { _id: string };
};

const tabs = ["In Progress", "On Review", "Completed"] as const;
type Tab = (typeof tabs)[number];

const idOf = (value: string | { _id: string } | undefined) =>
  typeof value === "object" && value ? value._id : value;

export default function TasksOverviewPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("In Progress");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskWorks, setTaskWorks] = useState<TaskWork[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDetailsTask | null>(null);
  const [showEndWorkDialog, setShowEndWorkDialog] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [completionTaskId, setCompletionTaskId] = useState<string | null>(null);
  const [workNotes, setWorkNotes] = useState("");
  const [workLinks, setWorkLinks] = useState("");
  const [workFiles, setWorkFiles] = useState<Array<{ name: string; url: string; size?: number; type?: string }>>([]);
  const [completionStatus, setCompletionStatus] = useState<"partial" | "full">("full");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userResponse = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      const userResult = await userResponse.json();
      const currentUserId = userResult.success ? String(userResult.user?._id || "") : "";

      if (!userResponse.ok || !currentUserId) {
        throw new Error(userResult.message || "Unable to load your tasks");
      }

      const [taskData, workResult] = await Promise.all([
        taskApi.fetchTasksApi(),
        taskApi.getTaskWork({ employeeId: currentUserId }),
      ]);
      setUserId(currentUserId);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setTaskWorks(workResult?.success && Array.isArray(workResult.data) ? workResult.data : []);
    } catch (err) {
      console.error("Failed to load task overview:", err);
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const activeWorkFor = useCallback((taskId: string) => (
    taskWorks.find((work) =>
      idOf(work.taskId) === taskId &&
      idOf(work.employeeId) === userId &&
      (work.status === "In Progress" || work.status === "Paused")
    )
  ), [taskWorks, userId]);

  const completedByUser = useCallback((taskId: string) => (
    taskWorks.some((work) =>
      idOf(work.taskId) === taskId &&
      idOf(work.employeeId) === userId &&
      work.status === "Completed" &&
      work.isFullyCompleted
    )
  ), [taskWorks, userId]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const status = task.task_status || task.status || "To Do";
    if (activeTab === "On Review") return status === "Review" || status === "On Review";
    if (activeTab === "Completed") return status === "Completed" || completedByUser(task._id);
    return status !== "Review" && status !== "On Review" && status !== "Completed";
  }), [activeTab, completedByUser, tasks]);

  const handleStartOrPause = async (task: Task) => {
    const activeWork = activeWorkFor(task._id);
    const action = activeWork?.status === "Paused" ? "resume" : activeWork ? "pause" : "start";
    try {
      setProcessingId(task._id);
      const result = action === "start"
        ? await taskApi.startTaskWork({ taskId: task._id, employeeId: userId })
        : action === "pause"
          ? await taskApi.pauseTaskWork({ taskId: task._id, workId: activeWork?._id, employeeId: userId })
          : await taskApi.resumeTaskWork({ taskId: task._id, workId: activeWork?._id, employeeId: userId });
      if (!result.success) throw new Error(result.message || `Failed to ${action} work`);
      await loadData();
    } catch (err) {
      console.error(`Failed to ${action} task work:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${action} task`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleWorkAction = async (task: Task, option: SelectOption) => {
    const activeWork = activeWorkFor(task._id);
    if (option === "Complete" || option === "Partially Complete") {
      const work = activeWorkFor(task._id);
      if (!work) return;
      setCompletionTaskId(task._id);
      setSelectedWorkId(work._id);
      setCompletionStatus(option === "Complete" ? "full" : "partial");
      setWorkNotes("");
      setWorkLinks("");
      setWorkFiles([]);
      setShowEndWorkDialog(true);
      return;
    }

    try {
      setProcessingId(task._id);
      const result = option === "Start"
        ? await taskApi.startTaskWork({ taskId: task._id, employeeId: userId })
        : option === "Pause"
          ? activeWork
            ? await taskApi.pauseTaskWork({ taskId: task._id, workId: activeWork._id, employeeId: userId })
            : null
          : activeWork
            ? await taskApi.endTaskWork(activeWork._id, { isFullyCompleted: option === "Complete" })
            : null;
      if (!result) return;
      if (!result.success) throw new Error(result.message || `Failed to ${option.toLowerCase()} task`);
      await loadData();
    } catch (err) {
      console.error(`Failed to ${option.toLowerCase()} task:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${option.toLowerCase()} task`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleWorkFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const converted = await Promise.all(files.map((file) => new Promise<{ name: string; url: string; size: number; type: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        url: String(reader.result || ""),
        size: file.size,
        type: file.type || "application/octet-stream",
      });
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    })));
    setWorkFiles((previous) => [...previous, ...converted]);
    event.target.value = "";
  };

  const closeEndWorkDialog = () => {
    if (processingId) return;
    setShowEndWorkDialog(false);
    setSelectedWorkId(null);
    setCompletionTaskId(null);
    setWorkNotes("");
    setWorkLinks("");
    setWorkFiles([]);
    setCompletionStatus("full");
  };

  const handleEndWork = async () => {
    if (!selectedWorkId) return;
    if (completionStatus === "partial" && !workNotes.replace(/<[^>]*>/g, "").trim()) {
      setError("Please provide a reason before marking the task as partially complete.");
      return;
    }

    try {
      setProcessingId(completionTaskId);
      const result = await taskApi.endTaskWork(selectedWorkId, {
        notes: workNotes.trim() || undefined,
        links: workLinks.split(/\n|,/).map((link) => link.trim()).filter(Boolean),
        files: workFiles,
        isFullyCompleted: completionStatus === "full",
      });
      if (!result.success) {
        throw new Error(result.message || "Failed to end work");
      }
      setShowEndWorkDialog(false);
      setSelectedWorkId(null);
      setCompletionTaskId(null);
      setWorkNotes("");
      setWorkLinks("");
      setWorkFiles([]);
      setCompletionStatus("full");
      await loadData();
    } catch (err) {
      console.error("Failed to end task work:", err);
      setError(err instanceof Error ? err.message : "Failed to end work");
    } finally {
      setProcessingId(null);
    }
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTask({
      ...task,
      priority: task.priority || "Medium",
      status: (task.task_status || task.status || "To Do") as TaskDetailsTask["status"],
    });
  };

  return (
    <div className="task-container">
      <div className="header">
        <p>Your Tasks</p>

        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : "inactive"}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="content">
        {loading ? (
          <p className="empty"><Loader2 className="loading-icon" size={16} /> Loading tasks...</p>
        ) : error ? (
          <p className="empty error">{error}</p>
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div className="task-card" key={task._id}>
              <button
                type="button"
                className="task-summary"
                onClick={() => openTaskDetails(task)}
                title="View task details"
              >
                <h2>{task.title}</h2>
                <p>{task.description ? task.description.replace(/<[^>]*>/g, "").trim() : "No description"}</p>
              </button>

              <div className="task-controls">
                <div className="task-select-slot">
                  {activeTab === "In Progress" && (
                    <CustomSelect
                      options={activeWorkFor(task._id) ? undefined : ["Start"]}
                      disabled={processingId === task._id}
                      onSelect={(option) => void handleWorkAction(task, option)}
                    />
                  )}
                </div>

                <button
                  type="button"
                  className="play-btn"
                  onClick={() => void handleStartOrPause(task)}
                  disabled={processingId === task._id}
                  aria-label={activeWorkFor(task._id)?.status === "Paused" ? "Resume task" : activeWorkFor(task._id) ? "Pause task" : "Start task"}
                >
                  {processingId === task._id ? <Loader2 className="loading-icon" size={15} /> : activeWorkFor(task._id)?.status === "Paused" ? <Play size={15} /> : activeWorkFor(task._id) ? <Pause size={15} /> : <Play size={15} />}
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty">No tasks in {activeTab}.</p>
        )}
      </div>

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          sessions={[]}
          loadingSessions={false}
          user={{ _id: userId, id: userId, name: "User", user_role: 2 }}
          newCommentText=""
          newCommentStatus=""
          submittingComment={false}
          copiedCommentId={null}
          copiedUrlIndex={null}
          isCopiedAllComments={false}
          isCopiedAllUrls={false}
          isDownloadingZip={false}
          onClose={() => setSelectedTask(null)}
          onAddComment={() => undefined}
          onCommentChange={() => undefined}
          onCommentStatusChange={() => undefined}
          onCopyComment={() => undefined}
          onCopyAllComments={() => undefined}
          onCopyUrl={() => undefined}
          onCopyAllUrls={() => undefined}
          onViewFile={(file) => window.open(file.url, "_blank", "noopener,noreferrer")}
          onDownloadFile={(file) => window.open(file.url, "_blank", "noopener,noreferrer")}
          onDownloadAllFiles={() => undefined}
        />
      )}

      <EndWorkSessionModal
        isOpen={showEndWorkDialog}
        completionStatus={completionStatus}
        onCompletionStatusChange={setCompletionStatus}
        notes={workNotes}
        onNotesChange={setWorkNotes}
        links={workLinks}
        onLinksChange={setWorkLinks}
        files={workFiles}
        onFilesChange={handleWorkFilesChange}
        onRemoveFile={(index) => setWorkFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))}
        onCancel={closeEndWorkDialog}
        onSubmit={() => void handleEndWork()}
        loading={Boolean(processingId)}
      />    </div>
  );
}
