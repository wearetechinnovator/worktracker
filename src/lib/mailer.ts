import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({ to, subject, text }: SendMailOptions): Promise<boolean> {
  if (!to) {
    console.warn("[Mailer] No recipient email specified.");
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"WorkTracker" <${smtpUser}>`,
      to,
      subject,
      text
    });
    console.log(`[Mailer] Email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[Mailer] Error sending email to ${to}:`, error);
    return false;
  }
}

/**
 * Send OTP email
 */
export async function sendOtpMail(email: string, otp: string | number): Promise<boolean> {
  const subject = `Your OTP Code: ${otp}`;
  const text = [
    `OTP: ${otp}`,
    `Email: ${email}`,
    `Expires in: 2 minutes`,
    ``,
    `Please use this OTP to verify your account.`,
  ].join("\n");

  return sendEmail({ to: email, subject, text });
}

/**
 * Send Punch In / Out Request email to the approver (admin / manager)
 */
export async function sendPunchRequestMail(params: {
  to: string;
  employeeName: string;
  employeeEmail: string;
  requestType: "punchIn" | "punchOut" | string;
  reason: string;
  date: string;
  requestedAt?: Date | string;
  ip?: string;
  browser?: string;
}): Promise<boolean> {
  const reqTypeLabel = params.requestType === "punchIn" ? "Punch In" : "Punch Out";
  const subject = `Attendance Request: ${reqTypeLabel} from ${params.employeeName}`;
  const text = [
    `Attendance Request Received:`,
    `Employee Name: ${params.employeeName}`,
    `Employee Email: ${params.employeeEmail}`,
    `Request Type: ${reqTypeLabel}`,
    `Attendance Date: ${params.date}`,
    `Reason: ${params.reason}`,
    `Requested At: ${params.requestedAt ? new Date(params.requestedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    params.ip ? `IP Address: ${params.ip}` : null,
    params.browser ? `Browser: ${params.browser}` : null,
    `Status: Pending`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({ to: params.to, subject, text });
}

/**
 * Send Punch In / Out Acceptance (Approval) email to the employee who requested it
 */
export async function sendPunchApprovedMail(params: {
  to: string;
  employeeName: string;
  requestType: "punchIn" | "punchOut" | string;
  date: string;
  approvedByName?: string;
  approvedAt?: Date | string;
}): Promise<boolean> {
  const reqTypeLabel = params.requestType === "punchIn" ? "Punch In" : "Punch Out";
  const subject = `Attendance Request Approved: ${reqTypeLabel}`;
  const text = [
    `Your Attendance Request Has Been Approved:`,
    `Employee: ${params.employeeName}`,
    `Request Type: ${reqTypeLabel}`,
    `Attendance Date: ${params.date}`,
    `Status: Approved`,
    params.approvedByName ? `Approved By: ${params.approvedByName}` : null,
    `Approved At: ${params.approvedAt ? new Date(params.approvedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    ``,
    `Note: Approval grants permission. Please click the ${reqTypeLabel} button in your application to complete the punch action.`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({ to: params.to, subject, text });
}

/**
 * Send Task Assignment email to the assignee
 */
export async function sendTaskAssignedMail(params: {
  to: string;
  assigneeName: string;
  taskTitle: string;
  taskId?: string;
  description?: string;
  projectName?: string;
  priority?: string;
  status?: string;
  dueDate?: string | Date | null;
  dueTime?: string | Date | null;
  assignedByName?: string;
}): Promise<boolean> {
  const subject = `New Task Assigned: ${params.taskId ? `[${params.taskId}] ` : ""}${params.taskTitle}`;
  const text = [
    `You have been assigned a new task:`,
    params.taskId ? `Task ID: ${params.taskId}` : null,
    `Title: ${params.taskTitle}`,
    params.projectName ? `Project: ${params.projectName}` : null,
    params.priority ? `Priority: ${params.priority}` : null,
    params.status ? `Status: ${params.status}` : null,
    params.dueDate ? `Due Date: ${typeof params.dueDate === "string" ? params.dueDate : new Date(params.dueDate).toISOString().split("T")[0]}` : null,
    params.dueTime ? `Due Time: ${params.dueTime}` : null,
    params.assignedByName ? `Assigned By: ${params.assignedByName}` : null,
    params.description ? `\nDescription:\n${params.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({ to: params.to, subject, text });
}

/**
 * Send Employee Account Creation / Credentials email with ID and Password
 */
export async function sendEmployeeWelcomeMail(params: {
  to: string;
  employeeName: string;
  email: string;
  password: string;
  employeeId?: string;
  designation?: string | null;
  addedByName?: string;
}): Promise<boolean> {
  const subject = `Your Employee Account Details`;
  const text = [
    `Your employee account has been created:`,
    `Employee Name: ${params.employeeName}`,
    `Login Email / ID: ${params.email}`,
    `Password: ${params.password}`,
    // params.employeeId ? `Employee ID: ${params.employeeId}` : null,
    params.designation ? `Designation: ${params.designation}` : null,
    params.addedByName ? `Added By: ${params.addedByName}` : null,
    ``,
    `Please use your email and password to log in.`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({ to: params.to, subject, text });
}

/**
 * Send Task Review Notification email to the assigner / creator
 */
export async function sendTaskReviewMail(params: {
  to: string;
  creatorName?: string;
  taskTitle: string;
  taskId?: string;
  projectName?: string;
  completedByEmployees?: string[];
  submittedAt?: Date | string;
}): Promise<boolean> {
  const subject = `Task Ready for Review: ${params.taskId ? `[${params.taskId}] ` : ""}${params.taskTitle}`;
  const text = [
    `Task Completed and Ready for Review:`,
    params.creatorName ? `Assigner / Manager: ${params.creatorName}` : null,
    params.taskId ? `Task ID: ${params.taskId}` : null,
    `Title: ${params.taskTitle}`,
    params.projectName ? `Project: ${params.projectName}` : null,
    params.completedByEmployees && params.completedByEmployees.length > 0
      ? `Completed By: ${params.completedByEmployees.join(", ")}`
      : null,
    `Status: Review`,
    `Submitted At: ${params.submittedAt ? new Date(params.submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    ``,
    `${'https://tisworktracker.vercel.app/user/tasks'}`,
    `All assigned team members have completed their work. The task is now awaiting your review.`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({ to: params.to, subject, text });
}

/**
 * Send Punch In Alert email to Admin
 */
export async function sendPunchInMail(params: {
  adminEmail?: string;
  employeeEmail?: string;
  employeeName: string;
  attendanceDate: string;
  punchInTime: string;
  reason?: string;
  ip?: string;
  browser?: string;
}): Promise<boolean> {
  const recipients = [params.adminEmail]
    .map((e) => (e || "").trim())
    .filter(Boolean);

  if (!recipients.length) {
    console.warn("[Mailer] No valid admin recipient email for punch in alert.");
    return false;
  }

  const to = recipients.join(", ");
  const subject = `Employee Punch In Alert - ${params.employeeName} (${params.attendanceDate})`;
  const text = [
    `Employee Punch In Notification`,
    `========================================`,
    `Employee: ${params.employeeName}`,
    `Employee Email: ${params.employeeEmail || "N/A"}`,
    `Attendance Date: ${params.attendanceDate}`,
    `Punch In Time: ${params.punchInTime}`,
    params.reason ? `Reason / Note: ${params.reason}` : null,
    params.ip ? `IP Address: ${params.ip}` : null,
    params.browser ? `Browser / Device: ${params.browser}` : null,
    `========================================`,
    ``,
    `This notification has been sent to Admin upon employee Punch In.`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({ to, subject, text });
}

/**
 * Send Punch Out Work Summary email to both Admin and Employee
 */
export async function sendPunchOutWorkSummaryMail(params: {
  adminEmail?: string;
  employeeEmail?: string;
  employeeName: string;
  attendanceDate: string;
  punchOutTime: string;
  workSummary: string;
}): Promise<boolean> {
  const recipients = [params.adminEmail, params.employeeEmail]
    .map((e) => (e || "").trim())
    .filter(Boolean);

  if (!recipients.length) {
    console.warn("[Mailer] No valid recipient emails for punch out work summary.");
    return false;
  }

  const to = recipients.join(", ");
  const subject = `Daily Work Summary & Punch Out - ${params.employeeName} (${params.attendanceDate})`;
  const text = [
    `Daily Work Summary & Punch Out Notification`,
    `========================================`,
    `Employee: ${params.employeeName}`,
    `Employee Email: ${params.employeeEmail || "N/A"}`,
    `Attendance Date: ${params.attendanceDate}`,
    `Punch Out Time: ${params.punchOutTime}`,
    `========================================`,
    ``,
    `Work Summary / Report:`,
    `----------------------------------------`,
    params.workSummary || "No work details provided.",
    `----------------------------------------`,
    ``,
    `This notification has been sent to both Admin and Employee upon Punch Out.`,
  ].join("\n");

  return sendEmail({ to, subject, text });
}

export default transporter;
