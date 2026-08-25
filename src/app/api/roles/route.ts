import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Role from '@/models/Role';
import Employee from '@/models/Employee';
import { requireUser, isErrorResponse } from '@/lib/auth';
import { DEFAULT_SYSTEM_ROLES } from '@/lib/permissions';

export async function GET() {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    let dbRoles = await Role.find().sort({ position: 1, name: 1 }).lean();

    // Auto-seed default system roles if collection is empty
    if (dbRoles.length === 0) {
      await Role.insertMany(DEFAULT_SYSTEM_ROLES);
      dbRoles = await Role.find().sort({ position: 1, name: 1 }).lean();
    } else {
      // Ensure missing system default roles are created
      const dbNamesLower = dbRoles.map((r) => r.name.toLowerCase().trim());
      const missingDefaults = DEFAULT_SYSTEM_ROLES.filter(
        (def) => !dbNamesLower.includes(def.name.toLowerCase().trim())
      );
      if (missingDefaults.length > 0) {
        await Role.insertMany(missingDefaults);
        dbRoles = await Role.find().sort({ position: 1, name: 1 }).lean();
      }
    }

    // Scan Employee collection for any distinct roles not in DB
    const empRoles = await Employee.distinct('role');
    const dbRoleNamesLower = dbRoles.map((r) => r.name.toLowerCase().trim());

    const rolesToCreate = [];
    for (const rName of empRoles) {
      if (rName && rName.trim() && !dbRoleNamesLower.includes(rName.toLowerCase().trim())) {
        rolesToCreate.push({
          name: rName.trim(),
          description: 'Auto-detected from employee profiles',
          color: '#94a3b8',
          position: dbRoles.length + 1,
          isSystemRole: false,
          isSystemAdmin: false,
          permissions: ['tasks:read', 'projects:read', 'attendance:punch'],
        });
      }
    }

    if (rolesToCreate.length > 0) {
      const createdRoles = await Role.insertMany(rolesToCreate);
      dbRoles = [...dbRoles, ...createdRoles.map((r) => r.toObject())];
    }

    // Fetch all employees
    const allEmployees = await Employee.find().select('name email role avatarColor status userType').lean();

    // Map employees to roles
    const rolesWithMembers = dbRoles.map((role) => {
      const members = allEmployees.filter(
        (emp) => emp.role && emp.role.toLowerCase().trim() === role.name.toLowerCase().trim()
      );
      return {
        ...role,
        _id: role._id.toString(),
        employees: members.map((m) => ({
          _id: m._id.toString(),
          name: m.name,
          email: m.email,
          avatarColor: m.avatarColor,
          status: m.status,
          userType: m.userType,
        })),
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
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { name, description, color, permissions, isSystemAdmin } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Role name is required' }, { status: 400 });
    }

    // Case-insensitive duplicate check
    const existing = await Role.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'A role with this name already exists' }, { status: 400 });
    }

    const highestPosRole = await Role.findOne().sort({ position: -1 }).lean();
    const nextPosition = (highestPosRole?.position || 0) + 1;

    const newRole = await Role.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      color: color || '#7f56d9',
      position: nextPosition,
      isSystemRole: false,
      isSystemAdmin: Boolean(isSystemAdmin),
      permissions: Array.isArray(permissions) ? permissions : ['tasks:read', 'projects:read', 'attendance:punch'],
    });

    return NextResponse.json({ success: true, data: newRole });
  } catch (error: any) {
    console.error('Error creating role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
