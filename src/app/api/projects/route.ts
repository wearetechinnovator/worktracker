import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Project';
import WorkEntry from '@/models/WorkEntry';

export async function GET() {
  try {
    await dbConnect();


    // Fetch projects and populate their members
    const projects = await Project.find({})
      .populate('members')
      .sort({ createdAt: -1 });

    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const stats = await WorkEntry.aggregate([
          { $match: { projectId: project._id } },
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
          members: project.members,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          totalMinutes,
          entryCount,
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
      members: members || []
    });

    const populated = await project.populate('members');
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
