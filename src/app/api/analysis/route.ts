import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    // Get school settings
    const settingsRows = await db.setting.findMany();
    const schoolSettings: Record<string, string> = {};
    for (const s of settingsRows) {
      schoolSettings[s.key] = s.value;
    }

    // Get student profile
    const student = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, grade: true, whatsapp: true, jenisKelamin: true },
    });

    const studentProfile = student ? {
      name: student.name,
      email: student.email,
      grade: student.grade,
      whatsapp: student.whatsapp,
      jenisKelamin: student.jenisKelamin,
    } : null;

    // Get student's completed responses
    const responses = await db.response.findMany({
      where: { userId, completed: true },
      include: {
        survey: {
          select: { id: true, title: true, field: true, grade: true, description: true },
        },
        answers: {
          include: {
            question: { select: { id: true, text: true, order: true } },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Group analysis by field
    const fieldAnalysis: Record<string, {
      field: string;
      iyaCount: number;
      tidakCount: number;
      total: number;
      percentage: number;
    }> = {};

    const FIELD_NAMES: Record<string, string> = {
      PRIBADI: 'Bidang Pribadi',
      SOSIAL: 'Bidang Sosial',
      BELAJAR: 'Bidang Belajar',
      KARIR: 'Bidang Karir',
    };

    for (const fieldName of Object.keys(FIELD_NAMES)) {
      const fieldResponses = responses.filter(r => r.survey.field === fieldName);
      const iyaCount = fieldResponses.reduce((sum, r) => sum + r.answers.filter(a => a.value === 'IYA').length, 0);
      const tidakCount = fieldResponses.reduce((sum, r) => sum + r.answers.filter(a => a.value === 'TIDAK').length, 0);
      const total = iyaCount + tidakCount;

      fieldAnalysis[fieldName] = {
        field: fieldName,
        iyaCount,
        tidakCount,
        total,
        percentage: total > 0 ? Math.round((tidakCount / total) * 100) : 0,
      };
    }

    // Recommendation grading
    // TIDAK-based: higher TIDAK% = fewer problems = better grade
    // 100% TIDAK = A (Baik), 90-99% = B, 75-89% = C, 50-74% = D, 0-49% = E
    const getRecommendationGrade = (tidakPercentage: number) => {
      if (tidakPercentage === 100) return 'A';
      if (tidakPercentage >= 90) return 'B';
      if (tidakPercentage >= 75) return 'C';
      if (tidakPercentage >= 50) return 'D';
      return 'E';
    };

    const recommendations: Record<string, { grade: string; percentage: number }> = {};
    for (const [fieldName, analysis] of Object.entries(fieldAnalysis)) {
      recommendations[fieldName] = {
        grade: getRecommendationGrade(analysis.percentage),
        percentage: analysis.percentage,
      };
    }

    return NextResponse.json({
      schoolSettings,
      studentProfile,
      fieldAnalysis,
      recommendations,
      responses: responses.map(r => ({
        id: r.id,
        surveyId: r.surveyId,
        completedAt: r.completedAt,
        survey: r.survey,
        answers: r.answers.map(a => ({
          id: a.id,
          questionId: a.questionId,
          value: a.value,
          question: a.question,
        })),
      })),
    });
  } catch (error) {
    console.error('Student analysis error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
