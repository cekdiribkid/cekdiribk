import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { parseUserAgent } from '@/lib/device-detector';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password harus diisi' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    // Capture device info from User-Agent header
    const userAgent = req.headers.get('user-agent') || '';
    const device = parseUserAgent(userAgent);

    // Create visitor log entry with device info
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

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        whatsapp: user.whatsapp,
        jenisKelamin: user.jenisKelamin,
        grade: user.grade,
        role: user.role,
        image: user.image,
        createdAt: user.createdAt,
      },
      visitorLogId: visitorLog.id,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
