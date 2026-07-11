import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const gradeFilter = req.nextUrl.searchParams.get('grade');

    // Get all users (non-admin) with their responses
    const whereClause: Record<string, unknown> = { role: 'USER' };
    if (gradeFilter) whereClause.grade = Number(gradeFilter);

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        grade: true,
        responses: {
          where: { completed: true },
          include: {
            survey: {
              select: { id: true, title: true, field: true, grade: true },
            },
            answers: {
              select: { value: true },
            },
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    });

    // Calculate per-user statistics
    const userResults = users.map((user) => {
      let totalIya = 0;
      let totalTidak = 0;
      const fieldBreakdown: Record<string, { iya: number; tidak: number; total: number }> = {};

      for (const resp of user.responses) {
        const field = resp.survey.field;
        if (!fieldBreakdown[field]) {
          fieldBreakdown[field] = { iya: 0, tidak: 0, total: 0 };
        }
        for (const ans of resp.answers) {
          if (ans.value === 'IYA') {
            totalIya++;
            fieldBreakdown[field].iya++;
          } else {
            totalTidak++;
            fieldBreakdown[field].tidak++;
          }
          fieldBreakdown[field].total++;
        }
      }

      const totalAnswers = totalIya + totalTidak;
      const iyaPercentage = totalAnswers > 0 ? Math.round((totalIya / totalAnswers) * 100) : 0;
      const tidakPercentage = totalAnswers > 0 ? Math.round((totalTidak / totalAnswers) * 100) : 0;

      // Per-survey breakdown
      const surveyBreakdown = user.responses.map((resp) => {
        const iya = resp.answers.filter((a) => a.value === 'IYA').length;
        const tidak = resp.answers.filter((a) => a.value === 'TIDAK').length;
        const total = resp.answers.length;
        return {
          surveyId: resp.surveyId,
          surveyTitle: resp.survey.title,
          field: resp.survey.field,
          grade: resp.survey.grade,
          iya,
          tidak,
          total,
          iyaPercentage: total > 0 ? Math.round((iya / total) * 100) : 0,
          tidakPercentage: total > 0 ? Math.round((tidak / total) * 100) : 0,
        };
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        grade: user.grade,
        completedSurveys: user.responses.length,
        overall: {
          totalIya,
          totalTidak,
          totalAnswers,
          iyaPercentage,
          tidakPercentage,
        },
        fieldBreakdown,
        surveyBreakdown,
      };
    });

    // Calculate aggregate stats per grade
    const gradeAggregate: Record<number, { iya: number; tidak: number; total: number; userCount: number }> = {};
    for (const ur of userResults) {
      const g = ur.grade;
      if (!gradeAggregate[g]) gradeAggregate[g] = { iya: 0, tidak: 0, total: 0, userCount: 0 };
      gradeAggregate[g].iya += ur.overall.totalIya;
      gradeAggregate[g].tidak += ur.overall.totalTidak;
      gradeAggregate[g].total += ur.overall.totalAnswers;
      gradeAggregate[g].userCount += 1;
    }

    // Calculate aggregate stats per field
    const fieldAggregate: Record<string, { iya: number; tidak: number; total: number }> = {};
    for (const ur of userResults) {
      for (const [field, stats] of Object.entries(ur.fieldBreakdown)) {
        if (!fieldAggregate[field]) fieldAggregate[field] = { iya: 0, tidak: 0, total: 0 };
        fieldAggregate[field].iya += stats.iya;
        fieldAggregate[field].tidak += stats.tidak;
        fieldAggregate[field].total += stats.total;
      }
    }

    // Overall aggregate
    let grandIya = 0;
    let grandTidak = 0;
    for (const ur of userResults) {
      grandIya += ur.overall.totalIya;
      grandTidak += ur.overall.totalTidak;
    }
    const grandTotal = grandIya + grandTidak;

    return NextResponse.json({
      users: userResults,
      gradeAggregate,
      fieldAggregate,
      grandAggregate: {
        totalIya: grandIya,
        totalTidak: grandTidak,
        totalAnswers: grandTotal,
        iyaPercentage: grandTotal > 0 ? Math.round((grandIya / grandTotal) * 100) : 0,
        tidakPercentage: grandTotal > 0 ? Math.round((grandTidak / grandTotal) * 100) : 0,
        totalUsers: userResults.length,
        usersWithData: userResults.filter((u) => u.overall.totalAnswers > 0).length,
      },
    });
  } catch (error) {
    console.error('Admin user results error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
