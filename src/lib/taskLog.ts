import TaskLog from "@/models/TaskLog";

export async function createInitialTaskLogs(task: any) {
  const assignedUsers = Array.isArray(task.assign_to)
    ? task.assign_to.filter(Boolean)
    : [];
  const logUsers = assignedUsers.length > 0
    ? assignedUsers
    : [task.created_by];

  if (!logUsers[0]) return [];

  const operations = logUsers
    .filter(Boolean)
    .map((userId: any) => ({
      updateOne: {
        filter: {
          task_id: task._id,
          user_id: userId,
          action: "Created",
        },
        update: {
          $setOnInsert: {
            task_id: task._id,
            user_id: userId,
            status: "To Do",
            action: "Created",
            timestamp: new Date(),
          },
        },
        upsert: true,
      },
    }));

  if (!operations.length) return [];

  return TaskLog.bulkWrite(operations);
}
