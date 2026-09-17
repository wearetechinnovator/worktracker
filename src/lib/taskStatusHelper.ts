import mongoose from 'mongoose';
import Task from '@/models/Task';
import TaskWork from '@/models/TaskWork';

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

    // 2. Multi-assignee completion resolution
    const assignedEmployees = ((parentTask.assign_to && parentTask.assign_to.length > 0) ? parentTask.assign_to : parentTask.assignedTo || []).map((emp: any) =>
      (emp?._id || emp)?.toString()
    ).filter(Boolean);

    const completedSessions = allTaskWorks.filter(tw => tw.status === 'Completed');

    if (assignedEmployees.length === 0) {
      // No assigned employees specified
      if (completedSessions.length > 0) {
        const latestSession = completedSessions[0];
        parentTask.task_status = latestSession.isFullyCompleted ? 'Completed' : 'Partially Completed';
      } else {
        if (parentTask.task_status === 'In Progress' || parentTask.task_status === 'Partially Completed' || parentTask.task_status === 'Completed') {
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
        parentTask.task_status = 'Completed';
      } else if (anyWorkDone) {
        parentTask.task_status = 'Partially Completed';
      } else {
        if (parentTask.task_status === 'In Progress' || parentTask.task_status === 'Partially Completed' || parentTask.task_status === 'Completed') {
          parentTask.task_status = 'To Do';
        }
      }
    }

    await parentTask.save();
    return parentTask;
  } catch (error) {
    console.error('Error synchronizing task status:', error);
    return null;
  }
}
