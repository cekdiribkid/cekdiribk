import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const { name, email, grade, role, password, whatsapp, jenisKelamin, image } = await req.json();

    const data: Record<string, unknown> = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (grade) data.grade = Number(grade);
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);
    if (whatsapp !== undefined) data.whatsapp = whatsapp;
    if (jenisKelamin !== undefined) {
      if (jenisKelamin === null || jenisKelamin === '') {
        data.jenisKelamin = null;
      } else if (jenisKelamin === 'LAKI-LAKI' || jenisKelamin === 'PEREMPUAN') {
        data.jenisKelamin = jenisKelamin;
      }
    }
    // Photo update via admin
    if (image !== undefined) {
      if (image === null) {
        data.image = null;
      } else if (typeof image === 'string' && image.startsWith('data:image/') && image.length <= 2_700_000) {
        data.image = image;
      }
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, whatsapp: true, jenisKelamin: true, image: true, grade: true, role: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    await db.user.delete({ where: { id } });

    return NextResponse.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
