import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const data = await req.json();
    const { logo } = data; // base64 data URL

    if (!logo || typeof logo !== 'string') {
      return NextResponse.json({ error: 'Logo tidak valid' }, { status: 400 });
    }

    // Validate it's an image data URL
    if (!logo.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Format harus berupa gambar (PNG, JPG, SVG, dll)' }, { status: 400 });
    }

    // Limit size to ~2MB (base64 is ~33% larger than binary, so ~1.5MB actual image)
    if (logo.length > 2_700_000) {
      return NextResponse.json({ error: 'Ukuran logo terlalu besar. Maksimal 2MB.' }, { status: 400 });
    }

    await db.setting.upsert({
      where: { key: 'schoolLogo' },
      update: { value: logo },
      create: { key: 'schoolLogo', value: logo },
    });

    return NextResponse.json({ success: true, message: 'Logo berhasil diupload' });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    await db.setting.upsert({
      where: { key: 'schoolLogo' },
      update: { value: '' },
      create: { key: 'schoolLogo', value: '' },
    });

    return NextResponse.json({ success: true, message: 'Logo berhasil dihapus' });
  } catch (error) {
    console.error('Logo delete error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
