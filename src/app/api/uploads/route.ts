import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'A file is required' },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File must be between 1 byte and 10 MB' },
        { status: 400 }
      );
    }

    const extension = path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const uploadDirectory = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadDirectory, fileName);

    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      success: true,
      data: {
        name: file.name,
        url: `/uploads/${fileName}`,
        size: file.size,
        type: file.type || 'application/octet-stream',
      },
    });
  } catch (error) {
    console.error('POST /api/uploads Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
