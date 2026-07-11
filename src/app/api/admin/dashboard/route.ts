import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [
      totalUsers,
      totalSurveys,
      totalResponses,
      completedResponses,
      usersByGrade,
      responsesByField,
    ] = await Promise.all([
      db.user.count(),
      db.survey.count(),
      db.response.count(),
      db.response.count({ where: { completed: true } }),
      db.user.groupBy({ by: ['grade'], _count: true }),
      db.response.findMany({
        where: { completed: true },
        include: {
          survey: { select: { field: true, grade: true } },
          answers: { select: { value: true } },
        },
      }),
    ]);

    // Calculate response statistics by field
    const fieldStats: Record<string, { total: number; iya: number; tidak: number }> = {};
    for (const resp of responsesByField) {
      const field = resp.survey?.field || 'UNKNOWN';
      if (!fieldStats[field]) {
        fieldStats[field] = { total: 0, iya: 0, tidak: 0 };
      }
      fieldStats[field].total += 1;
      for (const ans of resp.answers) {
        if (ans.value === 'IYA') fieldStats[field].iya += 1;
        else fieldStats[field].tidak += 1;
      }
    }

    // Grade distribution
    const gradeDistribution = usersByGrade.map((g) => ({
      grade: g.grade,
      count: g._count,
    }));

    // Recent responses
    const recentResponses = await db.response.findMany({
      where: { completed: true },
      include: {
        user: { select: { name: true, grade: true } },
        survey: { select: { title: true, field: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalSurveys,
        totalResponses,
        completedResponses,
      },
      gradeDistribution,
      fieldStats,
      recentResponses,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
