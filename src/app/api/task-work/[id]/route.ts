import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import TaskWork from '@/models/TaskWork';
import Task from '@/models/Task';

// PUT - End work on a task
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { notes, localTime, isFullyCompleted } = body;

    const taskWork = await TaskWork.findById(id);
    if (!taskWork) {
      return NextResponse.json({ success: false, error: 'Work session not found' }, { status: 404 });
    }

    if (taskWork.status === 'Completed') {
      return NextResponse.json(
        { success: false, error: 'This work session is already completed' },
        { status: 400 }
      );
    }

    const currentTime = localTime || new Date().toTimeString().slice(0, 8); // HH:MM:SS

    // Calculate duration in minutes
    const startParts = taskWork.startTime.split(':').map(Number);
    const endParts = currentTime.split(':').map(Number);
    
    const startMinutes = startParts[0] * 60 + startParts[1] + startParts[2] / 60;
    const endMinutes = endParts[0] * 60 + endParts[1] + endParts[2] / 60;
    
    const totalMinutes = Math.round(endMinutes - startMinutes);

    // Update task work
    taskWork.endTime = currentTime;
    taskWork.totalMinutes = totalMinutes;
    taskWork.status = 'Completed';
    if (notes) taskWork.notes = notes;
    
    await taskWork.save();

    // Update parent task completion status
    const parentTask = await Task.findById(taskWork.taskId);
    if (parentTask) {
      parentTask.status = isFullyCompleted ? 'Completed' : 'In Progress';
      await parentTask.save();
    }

    const populatedWork = await TaskWork.findById(id)
      .populate('taskId', 'title description priority status')
      .populate('employeeId', 'name email avatarColor');

    return NextResponse.json({
      success: true,
      message: `Work completed! Total time: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      data: populatedWork,
    });
  } catch (error: any) {
    console.error('Error ending work:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a work session
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;

    const taskWork = await TaskWork.findByIdAndDelete(id);
    if (!taskWork) {
      return NextResponse.json({ success: false, error: 'Work session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Work session deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting work:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
