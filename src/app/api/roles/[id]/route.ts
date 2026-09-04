import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Role from '@/models/Role';
import Employee from '@/models/Employee';
import { requireUser, isErrorResponse } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    if (user.userType !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingRole = await Role.findById(id);
    if (!existingRole) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    // Protect system role names if changed
    if (existingRole.isSystemRole && body.name && body.name !== existingRole.name) {
      return NextResponse.json({ success: false, error: 'System role names cannot be modified' }, { status: 400 });
    }

    if (body.name && body.name.trim() !== existingRole.name) {
      const duplicate = await Role.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${body.name.trim()}$`, 'i') },
      });
      if (duplicate) {
        return NextResponse.json({ success: false, error: 'Another role with this name already exists' }, { status: 400 });
      }
    }

    const updateFields: any = {};
    if (body.name) updateFields.name = body.name.trim();
    if (body.description !== undefined) updateFields.description = body.description.trim();
    if (body.color) updateFields.color = body.color;
    if (body.position !== undefined) updateFields.position = body.position;
    if (body.isSystemAdmin !== undefined) updateFields.isSystemAdmin = body.isSystemAdmin;
    if (Array.isArray(body.permissions)) updateFields.permissions = body.permissions;

    const updatedRole = await Role.findByIdAndUpdate(id, updateFields, { new: true });

    return NextResponse.json({ success: true, data: updatedRole });
  } catch (error: any) {
    console.error('Error updating role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    if (user.userType !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const roleToDelete = await Role.findById(id);

    if (!roleToDelete) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    if (roleToDelete.isSystemRole) {
      return NextResponse.json({ success: false, error: 'System default roles cannot be deleted' }, { status: 400 });
    }

    const employeeRole = await Role.findOne({ name: /^Employee$/i });
    await Employee.updateMany(
      { roleId: roleToDelete._id },
      employeeRole
        ? { roleId: employeeRole._id }
        : { $unset: { roleId: 1 } }
    );

    await Role.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Role deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
