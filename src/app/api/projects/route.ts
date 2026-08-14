import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Project';
import WorkEntry from '@/models/WorkEntry';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    const query = employeeId ? { members: employeeId } : {};

    // Fetch projects and populate their members
    const workMatch = employeeId && mongoose.Types.ObjectId.isValid(employeeId)
      ? { employeeId: new mongoose.Types.ObjectId(employeeId) }
      : {};
    const [projects, stats] = await Promise.all([
      Project.find(query)
        .populate('members', 'name role avatarColor')
        .sort({ createdAt: -1 })
        .lean(),
      WorkEntry.aggregate<{ _id: string; totalMinutes: number; entryCount: number }>([
        { $match: workMatch },
        { $group: { _id: '$projectId', totalMinutes: { $sum: '$actualTime' }, entryCount: { $sum: 1 } } },
      ]),
    ]);
    const statsByProject = new Map(stats.map((stat) => [stat._id.toString(), stat]));

    const projectsWithStats = projects.map((project) => {
        const stat = statsByProject.get(project._id.toString());

        return {
          _id: project._id.toString(),
          name: project.name,
          description: project.description,
          color: project.color,
          members: project.members.map((m: any) => ({
            _id: m._id.toString(),
            name: m.name,
            role: m.role,
            avatarColor: m.avatarColor,
          })),
          totalMinutes: stat?.totalMinutes ?? 0,
          entryCount: stat?.entryCount ?? 0,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      });

    return NextResponse.json({ success: true, data: projectsWithStats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, description, color, members } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Project name is required' }, { status: 400 });
    }

    const project = await Project.create({
      name,
      description,
      color,
      members: members || [],
    });

    const populated = await project.populate('members');

    return NextResponse.json({
      success: true,
      data: {
        _id: populated._id.toString(),
        name: populated.name,
        description: populated.description,
        color: populated.color,
        members: populated.members.map((m: any) => ({
          _id: m._id.toString(),
          name: m.name,
          role: m.role,
          avatarColor: m.avatarColor,
        })),
        totalMinutes: 0,
        entryCount: 0,
        createdAt: populated.createdAt,
        updatedAt: populated.updatedAt,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
