import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Role from '@/models/Role';
import Employee from '@/models/Employee';
import { requireUser, isErrorResponse } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    // Fetch all roles from collection
    let dbRoles = await Role.find().sort({ name: 1 }).lean();

    // Scan Employee collection for any distinct roles not in DB
    const empRoles = await Employee.distinct('role');
    const dbRoleNamesLower = dbRoles.map(r => r.name.toLowerCase());

    const rolesToCreate = [];
    for (const rName of empRoles) {
      if (rName && rName.trim() && !dbRoleNamesLower.includes(rName.toLowerCase().trim())) {
        rolesToCreate.push({ name: rName.trim(), description: 'Auto-detected from employee profiles' });
      }
    }

    if (rolesToCreate.length > 0) {
      const createdRoles = await Role.insertMany(rolesToCreate);
      dbRoles = [...dbRoles, ...createdRoles.map(r => r.toObject())];
    }

    // Get all employees with their names, roles, and emails
    const allEmployees = await Employee.find().select('name email role avatarColor status userType').lean();

    // Map employees to their respective roles
    const rolesWithMembers = dbRoles.map(role => {
      const members = allEmployees.filter(emp => emp.role.toLowerCase().trim() === role.name.toLowerCase().trim());
      return {
        ...role,
        _id: role._id.toString(),
        employees: members.map(m => ({
          _id: m._id.toString(),
          name: m.name,
          email: m.email,
          avatarColor: m.avatarColor,
          status: m.status,
          userType: m.userType
        }))
      };
    });

    return NextResponse.json({ success: true, data: rolesWithMembers });
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    if (user.userType !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Role name is required' }, { status: 400 });
    }

    // Case-insensitive check
    const existing = await Role.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Role already exists' }, { status: 400 });
    }

    const newRole = await Role.create({
      name: name.trim(),
      description: description ? description.trim() : ''
    });

    return NextResponse.json({ success: true, data: newRole });
  } catch (error: any) {
    console.error('Error creating role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
