import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Employee from '@/models/Employee';
import Role from '@/models/Role';
import { currentUser, isErrorResponse } from '@/lib/auth';
import { ALL_PERMISSION_KEYS } from '@/lib/permissions';

export async function GET() {
  try {
    await dbConnect();
    const user = await currentUser();
    if (!user || isErrorResponse(user)) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const employee = await Employee.findById(user.id)
      .select('_id name email role userType Project status avatarColor workMode')
      .lean();

    if (!employee || employee.status !== 'Active') {
      return NextResponse.json({ success: false, error: 'Account inactive or not found' }, { status: 403 });
    }

    let roleDoc = null;
    if (employee.role) {
      roleDoc = await Role.findOne({
        name: { $regex: new RegExp(`^${employee.role.trim()}$`, 'i') },
      }).lean();
    }

    const isSystemAdmin = employee.userType === 'admin' || Boolean(roleDoc?.isSystemAdmin);
    const permissions: string[] = roleDoc?.permissions || (isSystemAdmin ? ALL_PERMISSION_KEYS : []);

    const userPayload = {
      _id: employee._id.toString(),
      id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      role: employee.role,
      userType: employee.userType,
      Project: employee.Project,
      avatarColor: employee.avatarColor,
      workMode: employee.workMode || 'Hybrid',
      isSystemAdmin,
      permissions,
    };

    return NextResponse.json({ success: true, data: userPayload });
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
