import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Client from '@/models/Client';
import Project from '@/models/Project';
import { requireUser, isErrorResponse } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    // Fetch all clients and sort by name
    const clients = await Client.find().sort({ name: 1 }).lean();

    // Fetch all projects to map them to their clients
    const projects = await Project.find().select('name clientId').lean();

    const clientsWithProjects = clients.map((client) => {
      const clientProjects = projects.filter(
        (p) => p.clientId?.toString() === client._id.toString()
      );
      return {
        ...client,
        _id: client._id.toString(),
        projects: clientProjects.map((p) => ({
          _id: p._id.toString(),
          name: p.name,
        })),
      };
    });

    return NextResponse.json({ success: true, data: clientsWithProjects });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    // We can allow all logged in users to create clients or restrict to admin
    if (user.userType !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, emails, address, duration, contacts, projectId, projects } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Client name is required' }, { status: 400 });
    }

    // Process emails: can be array or string
    let processedEmails: string[] = [];
    if (Array.isArray(emails)) {
      processedEmails = emails.map((e: any) => String(e).trim()).filter(Boolean);
    } else if (typeof emails === 'string') {
      processedEmails = emails.split(',').map((e) => e.trim()).filter(Boolean);
    }

    // Process contacts
    let processedContacts: any[] = [];
    if (Array.isArray(contacts)) {
      processedContacts = contacts
        .filter((c: any) => c && (c.name || c.email || c.phone || c.designation))
        .map((c: any) => ({
          name: String(c.name || '').trim(),
          email: String(c.email || '').trim().toLowerCase(),
          phone: String(c.phone || '').trim(),
          designation: String(c.designation || '').trim(),
        }));
    }

    const client = await Client.create({
      name: name.trim(),
      phone: phone ? phone.trim() : undefined,
      emails: processedEmails,
      address: address ? address.trim() : '',
      duration: duration ? duration.trim() : '',
      contacts: processedContacts,
    });

    // Associate the new client with any projects selected in the modal.
    const projectIds = Array.isArray(projects)
      ? projects.filter((id: any) => typeof id === 'string' && id)
      : projectId
        ? [projectId]
        : [];
    if (projectIds.length > 0) {
      await Project.updateMany(
        { _id: { $in: projectIds } },
        { $set: { clientId: client._id } }
      );
    }

    return NextResponse.json({ success: true, data: client }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
