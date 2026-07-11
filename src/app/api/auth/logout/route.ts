import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { visitorLogId } = body;

    // If visitorLogId provided, update the visitor log with logout time
    if (visitorLogId) {
      const log = await db.visitorLog.findUnique({
        where: { id: visitorLogId },
      });

      if (log && !log.logoutAt) {
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
      }
    }

    return NextResponse.json({ message: 'Logout berhasil' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ message: 'Logout berhasil' });
  }
}
