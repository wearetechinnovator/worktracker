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
    const projects = await Project.find(query)
      .populate('members')
      .sort({ createdAt: -1 });

    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        // Aggregate statistics. If employeeId filter is set, only aggregate their logs
        const matchStage: any = { projectId: project._id };
        if (employeeId) {
          matchStage.employeeId = new mongoose.Types.ObjectId(employeeId);
        }

        const stats = await WorkEntry.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              totalMinutes: { $sum: '$actualTime' },
              entryCount: { $sum: 1 },
            },
          },
        ]);

        const totalMinutes = stats.length > 0 ? stats[0].totalMinutes : 0;
        const entryCount = stats.length > 0 ? stats[0].entryCount : 0;

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
          totalMinutes,
          entryCount,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      })
    );

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
