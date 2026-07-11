import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    const userGrade = req.headers.get('x-user-grade');

    if (!userId) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    let where = {};
    
    // Regular users can only see surveys for their grade
    if (userRole !== 'ADMIN' && userGrade) {
      where = { grade: Number(userGrade), active: true };
    }

    const surveys = await db.survey.findMany({
      where,
      include: {
        _count: { select: { questions: true } },
        responses: {
          where: { userId },
          select: { id: true, completed: true, completedAt: true },
        },
      },
      orderBy: [{ grade: 'asc' }, { field: 'asc' }],
    });

    return NextResponse.json({ surveys });
  } catch (error) {
    console.error('Surveys error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
