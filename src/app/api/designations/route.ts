import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Designation from '@/models/Designation';
import { requireUser, isErrorResponse } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    if (searchParams.get('reset') === 'true') {
      await Designation.deleteMany({});
    }

    const items = await Designation.find().sort({ name: 1 }).lean();
    const names = items.map((i: any) => i.name).filter(Boolean);
    return NextResponse.json({ success: true, data: names });
  } catch (error: any) {
    console.error('Error fetching designations:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const { name } = await request.json();
    const trimmed = (name || '').trim();

    if (!trimmed) {
      return NextResponse.json(
        { success: false, error: 'Designation name is required' },
        { status: 400 }
      );
    }

    // Check if designation already exists
    const existing = await Designation.findOne({
      name: { $regex: new RegExp(`^${trimmed}$`, 'i') },
    });

    if (existing) {
      return NextResponse.json({ success: true, data: existing.name });
    }

    const created = await Designation.create({ name: trimmed });
    return NextResponse.json({ success: true, data: created.name });
  } catch (error: any) {
    console.error('Error creating designation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    await Designation.deleteMany({});
    return NextResponse.json({ success: true, message: 'All designations reset' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
