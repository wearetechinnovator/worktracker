import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AiSession from '@/models/AiSession';
import Task from '@/models/Task';

export async function GET() {
  try {
    await dbConnect();

    // Fetch real AI sessions recorded in database
    const sessions = await AiSession.find({}).sort({ createdAt: -1 }).lean();

    // Aggregate Analytics from real database sessions
    const totalAiSessions = sessions.length;
    const uniqueAiUsers = new Set(sessions.map((s: any) => String(s.employeeId))).size;
    const totalActiveMins = sessions.reduce((acc: number, s: any) => acc + (s.activeMinutes || 0), 0);
    const totalActiveHours = parseFloat((totalActiveMins / 60).toFixed(1));
    const aiAssociatedTasksCount = new Set(sessions.map((s: any) => String(s.taskId)).filter(Boolean)).size;

    // Team breakdown
    const teamUsageMap = new Map<string, number>();
    sessions.forEach((s: any) => {
      const projName = s.projectName || 'General';
      teamUsageMap.set(projName, (teamUsageMap.get(projName) || 0) + (s.activeMinutes || 0));
    });

    const projectBreakdown = Array.from(teamUsageMap.entries()).map(([name, mins]) => ({
      projectName: name,
      hours: parseFloat((mins / 60).toFixed(1)),
    }));

    // Tool Breakdown
    const toolMap = new Map<string, number>();
    sessions.forEach((s: any) => {
      toolMap.set(s.aiWebsite, (toolMap.get(s.aiWebsite) || 0) + 1);
    });
    const toolBreakdown = Array.from(toolMap.entries()).map(([tool, count]) => ({
      tool,
      count,
    }));

    // Insights Generation
    const topTool = toolBreakdown.length > 0 ? toolBreakdown.sort((a, b) => b.count - a.count)[0].tool : null;
    const insights = sessions.length > 0 ? [
      topTool ? `${topTool} is the most used AI tool among active team members.` : null,
      `${uniqueAiUsers} team member(s) engaged in AI-associated activity.`,
      `Total AI-associated task time reached ${totalActiveHours} hours.`,
      `Tracking signal active: AI site activity is recorded as activity signals, not absolute task completion.`,
    ].filter(Boolean) as string[] : [
      `No AI website usage logged yet.`,
      `Tracking signal active: AI site activity will be recorded automatically when employees visit AI tools during active work sessions.`,
    ];

    return NextResponse.json({
      success: true,
      sessions,
      metrics: {
        totalAiSessions,
        uniqueAiUsers,
        totalActiveHours,
        aiAssociatedTasksCount,
        projectBreakdown,
        toolBreakdown,
        insights,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const {
      employeeId,
      employeeName,
      employeeAvatarColor,
      projectId,
      projectName,
      taskId,
      taskTitle,
      aiWebsite,
      aiUrl,
      activeMinutes,
      idleMinutes,
      status,
      screenshotUrl,
    } = body;

    if (!employeeId || !aiWebsite) {
      return NextResponse.json({ success: false, error: 'Employee ID and AI Website are required' }, { status: 400 });
    }

    const newSession = await AiSession.create({
      employeeId,
      employeeName: employeeName || 'Employee',
      employeeAvatarColor: employeeAvatarColor || '#3b82f6',
      projectId,
      projectName: projectName || '',
      taskId,
      taskTitle: taskTitle || '',
      aiWebsite,
      aiUrl: aiUrl || 'https://ai.website',
      startTime: new Date(),
      activeMinutes: activeMinutes || 0,
      idleMinutes: idleMinutes || 0,
      status: status || 'Active',
      screenshotUrl: screenshotUrl || '',
      classification: 'AI-associated activity',
    });

    // Mark task as AI-associated activity
    if (taskId) {
      await Task.findByIdAndUpdate(taskId, {
        $addToSet: { tags: 'AI-associated activity' },
      });
    }

    return NextResponse.json({ success: true, session: newSession }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE Handler to clear mock/test session records
export async function DELETE() {
  try {
    await dbConnect();
    await AiSession.deleteMany({});
    return NextResponse.json({ success: true, message: 'All AI session records cleared successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
