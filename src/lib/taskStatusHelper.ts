import mongoose from 'mongoose';
import Task from '@/models/Task';
import TaskWork from '@/models/TaskWork';
import User from '@/models/User';
import Project from '@/models/Project';
import { sendTaskReviewMail } from '@/lib/mailer';

/**
 * Re-evaluates and synchronizes a parent task's overall task_status based on:
 * 1. Active work sessions: If any assignee is currently working ('In Progress'), task_status is 'In Progress'.
 * 2. Multi-assignee completion state:
 *    - If task has assigned employees:
 *      - ALL assigned employees must have completed at least one work session AND their most recent session must be marked as fully completed (`isFullyCompleted === true`).
 *      - If at least one assignee has worked (partially or fully) but not ALL assignees are fully completed, overall task_status is 'Partially Completed'.
 *      - If no assignees have logged work yet, task_status reverts to 'To Do'.
 *    - If task has no assigned employees:
 *      - Evaluates the most recent completed work session on the task.
 */
export async function syncTaskStatus(taskId: string | mongoose.Types.ObjectId) {
  try {
    const parentTask = await Task.findById(taskId);
    if (!parentTask) return null;

    const previousStatus = parentTask.task_status;

    // Fetch all work sessions for this task sorted by most recent first
    const allTaskWorks = await TaskWork.find({ taskId: parentTask._id }).sort({ createdAt: -1 });

    // 1. If any employee is currently working on this task, overall task_status is 'In Progress'
    const hasActiveSession = allTaskWorks.some(tw => tw.status === 'In Progress');
    if (hasActiveSession) {
      if (parentTask.task_status !== 'In Progress') {
        parentTask.task_status = 'In Progress';
        await parentTask.save();
      }
      return parentTask;
    }

    // 2. If NO employee is currently 'In Progress', but at least one employee has a 'Paused' session
    const hasPausedSession = allTaskWorks.some(tw => tw.status === 'Paused');
    if (hasPausedSession) {
      if (parentTask.task_status !== 'Paused') {
        parentTask.task_status = 'Paused';
        await parentTask.save();
      }
      return parentTask;
    }

    // 3. Multi-assignee completion resolution
    const assignedEmployees = ((parentTask.assign_to && parentTask.assign_to.length > 0) ? parentTask.assign_to : parentTask.assignedTo || []).map((emp: any) =>
      (emp?._id || emp)?.toString()
    ).filter(Boolean);

    const completedSessions = allTaskWorks.filter(tw => tw.status === 'Completed');

    if (assignedEmployees.length === 0) {
      // No assigned employees specified
      if (completedSessions.length > 0) {
        const latestSession = completedSessions[0];
        if (latestSession.isFullyCompleted) {
          if (parentTask.task_status !== 'Completed') {
            parentTask.task_status = 'Review';
          }
        } else {
          parentTask.task_status = 'Partially Done';
        }
      } else {
        if (['In Progress', 'Paused', 'Partially Completed', 'Partially Done', 'Review', 'Completed'].includes(parentTask.task_status)) {
          parentTask.task_status = 'To Do';
        }
      }
    } else {
      // Multiple or single assigned employees
      let allAssigneesCompleted = true;
      let anyWorkDone = false;

      for (const empId of assignedEmployees) {
        // Find completed sessions for this specific employee
        const empCompletedSessions = completedSessions.filter(
          tw => (tw.employeeId?._id?.toString() || tw.employeeId?.toString()) === empId
        );

        if (empCompletedSessions.length === 0) {
          // This employee has never completed any work session on this task
          allAssigneesCompleted = false;
        } else {
          anyWorkDone = true;
          // Most recent completed session for this employee
          const latestSession = empCompletedSessions[0];
          if (!latestSession.isFullyCompleted) {
            // Employee marked 'Partially Done'
            allAssigneesCompleted = false;
          }
        }
      }

      if (allAssigneesCompleted && anyWorkDone) {
        if (parentTask.task_status !== 'Completed') {
          parentTask.task_status = 'Review';
        }
      } else if (anyWorkDone) {
        parentTask.task_status = 'Partially Done';
      } else {
        if (['In Progress', 'Paused', 'Partially Completed', 'Partially Done', 'Review', 'Completed'].includes(parentTask.task_status)) {
          parentTask.task_status = 'To Do';
        }
      }
    }

    await parentTask.save();

    // If task moved to Review, send email notification to the assigner / creator
    if (parentTask.task_status === 'Review' && previousStatus !== 'Review') {
      try {
        let assigner: any = null;
        if (parentTask.created_by) {
          const creatorUser = await User.findById(parentTask.created_by).select('email full_name name user_role');
          if (creatorUser) {
            if (Number(creatorUser.user_role) === 1 || !parentTask.admin_id) {
              assigner = creatorUser;
            }
          }
        }
        if (!assigner && parentTask.admin_id) {
          assigner = await User.findById(parentTask.admin_id).select('email full_name name');
        }

        if (assigner?.email) {
          let projectName = '';
          if (parentTask.project_id) {
            const proj = await Project.findById(parentTask.project_id).select('name');
            if (proj?.name) projectName = proj.name;
          }

          let completedByNames: string[] = [];
          if (assignedEmployees.length > 0) {
            const users = await User.find({ _id: { $in: assignedEmployees } }).select('full_name name email');
            completedByNames = users.map((u: any) => u.full_name || u.name || u.email);
          } else {
            const latestEmpId = completedSessions[0]?.employeeId;
            if (latestEmpId) {
              const user = await User.findById(latestEmpId).select('full_name name email');
              if (user) completedByNames = [user.full_name || user.name || user.email];
            }
          }

          sendTaskReviewMail({
            to: assigner.email,
            creatorName: assigner.full_name || assigner.name || 'Admin',
            taskTitle: parentTask.title,
            taskId: parentTask.task_id,
            projectName,
            completedByEmployees: completedByNames,
            submittedAt: new Date(),
          }).catch((err) => console.error('[Mailer] Error sending task review email:', err));
        }
      } catch (mailErr) {
        console.error('[Mailer] Error triggering review email:', mailErr);
      }
    }

    return parentTask;
  } catch (error) {
    console.error('Error synchronizing task status:', error);
    return null;
  }
}
