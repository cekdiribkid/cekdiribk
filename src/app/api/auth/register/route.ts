import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { parseUserAgent } from '@/lib/device-detector';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, grade, whatsapp, jenisKelamin, image } = await req.json();

    if (!name || !email || !password || !grade || !whatsapp || !jenisKelamin) {
      return NextResponse.json({ error: 'Semua field wajib diisi: nama, email, password, WhatsApp, jenis kelamin, dan kelas' }, { status: 400 });
    }

    if (![7, 8, 9].includes(Number(grade))) {
      return NextResponse.json({ error: 'Kelas harus 7, 8, atau 9' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });
    }

    // Validate optional photo: must be a data URL (base64) image, max ~2MB
    let photoData: string | null = null;
    if (image && typeof image === 'string') {
      if (!image.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Format foto tidak valid. Harus berupa gambar.' }, { status: 400 });
      }
      // ~2MB base64 limit (base64 is ~33% larger than binary)
      if (image.length > 2_700_000) {
        return NextResponse.json({ error: 'Ukuran foto terlalu besar. Maksimal 2 MB.' }, { status: 400 });
      }
      photoData = image;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        grade: Number(grade),
        whatsapp: whatsapp || null,
        jenisKelamin: jenisKelamin || null,
        image: photoData,
        role: 'USER',
      },
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

    // Capture device info from User-Agent header
    const userAgent = req.headers.get('user-agent') || '';
    const device = parseUserAgent(userAgent);

    // Create visitor log entry for new registration (auto-login) with device info
    const visitorLog = await db.visitorLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        loginAt: new Date(),
        deviceType: device.deviceType,
        deviceBrand: device.deviceBrand,
        deviceModel: device.deviceModel,
        deviceOS: device.deviceOS,
        browser: device.browser,
        userAgent: device.userAgent,
      },
    });

    return NextResponse.json({ user, visitorLogId: visitorLog.id });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
