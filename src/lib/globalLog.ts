import "server-only";

import GlobalLog from "@/models/GlobalLog";

type CreateGlobalLogParams = {
  actorId: string;

  action:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "ADD"
    | "REMOVE"
    | "ASSIGN"
    | "UNASSIGN"
    | "APPROVE"
    | "REJECT"
    | "REVIEW"
    | "PUNCH_IN"
    | "PUNCH_OUT"
    | "LOGIN"
    | "LOGOUT"
    | "REQUEST"
    | "START"
    | "PAUSE"
    | "RESUME"
    | "COMPLETE";

  entityType:
    | "User"
    | "Task"
    | "Project"
    | "Client"
    | "Role"
    | "Designation"
    | "Attendance"
    | "AttendanceRequest"
    | "TaskWork"
    | "Settings";

  entityId?: string | null;

  targetUserId?: string | null;

  description: string;

  information?: Record<string, unknown> | null;
};

export async function createGlobalLog({
  actorId,
  action,
  entityType,
  entityId = null,
  targetUserId = null,
  description,
  information = null,
}: CreateGlobalLogParams) {
  try {
    await GlobalLog.create({
      actor_id: actorId,
      action,

      entity_type: entityType,
      entity_id: entityId,

      target_user_id: targetUserId,

      description,

      information: information
        ? JSON.stringify(information)
        : null,

      status: true,

      created_at: new Date(),
    });
  } catch (error) {
    // Logging failure must NOT break the actual business action
    console.error("GLOBAL LOG ERROR:", error);
  }
}