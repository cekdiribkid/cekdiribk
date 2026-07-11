import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    // Both USER and ADMIN can access, but USER only sees their own data
    const where: Record<string, unknown> = {};
    if (userRole !== 'ADMIN') {
      where.studentId = userId;
    }

    const counselings = await db.counseling.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, email: true, grade: true, whatsapp: true, jenisKelamin: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ counselings });
  } catch (error) {
    console.error('Counseling history error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}