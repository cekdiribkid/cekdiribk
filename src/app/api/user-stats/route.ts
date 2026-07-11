import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    // Get all completed responses for this user
    const responses = await db.response.findMany({
      where: { 
        userId,
        completed: true,
      },
      include: {
        survey: {
          select: { id: true, title: true, field: true, grade: true },
        },
        answers: {
          select: { value: true },
        },
      },
    });

    // Calculate overall stats
    let totalIya = 0;
    let totalTidak = 0;
    const fieldBreakdown: Record<string, { iya: number; tidak: number; total: number }> = {};

    for (const resp of responses) {
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
    const surveyBreakdown = responses.map((resp) => {
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

    return NextResponse.json({
      overall: {
        totalIya,
        totalTidak,
        totalAnswers,
        iyaPercentage,
        tidakPercentage,
        completedSurveys: responses.length,
      },
      fieldBreakdown,
      surveyBreakdown,
    });
  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
