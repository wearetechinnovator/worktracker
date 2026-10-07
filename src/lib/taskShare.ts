import "server-only";

export function createTaskShareToken(taskId: string) {
  return Buffer.from(String(taskId), "utf8").toString("base64url");
}
