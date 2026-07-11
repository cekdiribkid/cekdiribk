import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/visitors/login - Record a visitor login
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'UserId diperlukan' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const log = await db.visitorLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        loginAt: new Date(),
      },
    });

    return NextResponse.json({ visitorLogId: log.id });
  } catch (error) {
    console.error('Visitor login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// PUT /api/visitors/logout - Record a visitor logout
export async function PUT(req: NextRequest) {
  try {
    const { visitorLogId } = await req.json();
    if (!visitorLogId) {
      return NextResponse.json({ error: 'VisitorLogId diperlukan' }, { status: 400 });
    }

    const log = await db.visitorLog.findUnique({
      where: { id: visitorLogId },
    });

    if (!log) {
      return NextResponse.json({ error: 'Log tidak ditemukan' }, { status: 404 });
    }

    if (log.logoutAt) {
      return NextResponse.json({ message: 'Sudah logout' });
    }

    const now = new Date();
    const durationSeconds = Math.floor(
      (now.getTime() - new Date(log.loginAt).getTime()) / 1000
    );

    await db.visitorLog.update({
      where: { id: visitorLogId },
      data: {
        logoutAt: now,
        durationSeconds,
      },
    });

    return NextResponse.json({ message: 'Logout tercatat', durationSeconds });
  } catch (error) {
    console.error('Visitor logout error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
