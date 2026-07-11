import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    const userGrade = req.headers.get('x-user-grade');

    if (!userId) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { id } = await params;
    const survey = await db.survey.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: 'asc' } },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey tidak ditemukan' }, { status: 404 });
    }

    if (userRole !== 'ADMIN' && Number(userGrade) !== survey.grade) {
      return NextResponse.json({ error: 'Anda tidak memiliki akses ke survey ini' }, { status: 403 });
    }

    return NextResponse.json({ survey });
  } catch (error) {
    console.error('Survey detail error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
