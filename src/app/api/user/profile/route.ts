import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// PATCH — Update user profile (name, email, jenisKelamin, whatsapp, password, image)
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, jenisKelamin, whatsapp, password, image } = body;

    // Build update data — only include fields that are provided
    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ error: 'Nama tidak boleh kosong' }, { status: 400 });
      }
      data.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim() === '') {
        return NextResponse.json({ error: 'Email tidak boleh kosong' }, { status: 400 });
      }
      // Check email uniqueness (exclude current user)
      const existing = await db.user.findUnique({ where: { email: email.trim() } });
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: 'Email sudah digunakan oleh akun lain' }, { status: 400 });
      }
      data.email = email.trim();
    }

    if (jenisKelamin !== undefined) {
      if (jenisKelamin === null || jenisKelamin === '') {
        data.jenisKelamin = null;
      } else if (jenisKelamin === 'LAKI-LAKI' || jenisKelamin === 'PEREMPUAN') {
        data.jenisKelamin = jenisKelamin;
      } else {
        return NextResponse.json({ error: 'Jenis kelamin tidak valid' }, { status: 400 });
      }
    }

    if (whatsapp !== undefined) {
      data.whatsapp = whatsapp || null;
    }

    // Password change (optional)
    if (password !== undefined && password !== null && password !== '') {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
      }
      data.password = await bcrypt.hash(password, 10);
    }

    // Photo update: accept data URL, null (to remove), or undefined (no change)
    if (image !== undefined) {
      if (image === null) {
        data.image = null; // remove photo
      } else if (typeof image === 'string') {
        if (!image.startsWith('data:image/')) {
          return NextResponse.json({ error: 'Format foto tidak valid. Harus berupa gambar.' }, { status: 400 });
        }
        if (image.length > 2_700_000) {
          return NextResponse.json({ error: 'Ukuran foto terlalu besar. Maksimal 2 MB.' }, { status: 400 });
        }
        data.image = image;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field yang diubah' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
        jenisKelamin: true,
        image: true,
        grade: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE — Delete user account and all related data
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    if (!userId) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    // Prevent admin from deleting themselves
    if (userRole === 'ADMIN') {
      return NextResponse.json({ error: 'Akun admin tidak dapat dihapus' }, { status: 403 });
    }

    // Delete user (cascade will delete responses, answers, counselings)
    await db.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: 'Akun berhasil dihapus' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
