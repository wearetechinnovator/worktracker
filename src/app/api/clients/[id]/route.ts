import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Client from '@/models/Client';
import Project from '@/models/Project';
import { requireUser, isErrorResponse } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    if (user.userType !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, emails, address, duration, projectIds } = body;

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    if (name) client.name = name.trim();
    
    if (emails) {
      if (Array.isArray(emails)) {
        client.emails = emails.map((e: any) => String(e).trim()).filter(Boolean);
      } else if (typeof emails === 'string') {
        client.emails = emails.split(',').map((e) => e.trim()).filter(Boolean);
      }
    }

    if (address !== undefined) client.address = address.trim();
    if (duration !== undefined) client.duration = duration.trim();

    await client.save();

    // Handle project associations update
    if (projectIds && Array.isArray(projectIds)) {
      // Clear clientId for projects previously pointing to this client but not in projectIds
      await Project.updateMany(
        { clientId: id, _id: { $nin: projectIds } },
        { $unset: { clientId: 1 } }
      );
      // Set clientId for projects in projectIds
      await Project.updateMany(
        { _id: { $in: projectIds } },
        { clientId: id }
      );
    }

    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    if (user.userType !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const client = await Client.findByIdAndDelete(id);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    // Remove references to this client from all projects
    await Project.updateMany({ clientId: id }, { $unset: { clientId: 1 } });

    return NextResponse.json({ success: true, message: 'Client deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
