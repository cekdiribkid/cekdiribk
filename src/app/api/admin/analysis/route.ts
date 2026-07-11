import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const grade = url.searchParams.get('grade');
    const field = url.searchParams.get('field');

    // Get school settings
    const settingsRows = await db.setting.findMany();
    const schoolSettings: Record<string, string> = {};
    for (const s of settingsRows) {
      schoolSettings[s.key] = s.value;
    }

    // Build where clause for responses
    const responseWhere: Record<string, unknown> = { completed: true };
    if (userId) {
      responseWhere.userId = userId;
    }
    if (grade && grade !== 'ALL') {
      responseWhere.user = { grade: Number(grade) };
    }
    if (field && field !== 'ALL') {
      responseWhere.survey = { field };
    }

    // Get all completed responses with answers
    const responses = await db.response.findMany({
      where: responseWhere,
      include: {
        user: {
          select: { id: true, name: true, email: true, grade: true, whatsapp: true, jenisKelamin: true, image: true },
        },
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

    // Get all users for analysis
    const userWhere: Record<string, unknown> = { role: 'USER' };
    if (grade && grade !== 'ALL') {
      userWhere.grade = Number(grade);
    }
    const users = await db.user.findMany({
      where: userWhere,
      select: { id: true, name: true, email: true, grade: true, whatsapp: true, jenisKelamin: true, image: true },
    });

    // If specific user requested, include their profile
    let studentProfile: { name: string; email: string; grade: number; whatsapp: string | null; jenisKelamin: string | null; image: string | null } | null = null;
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, grade: true, whatsapp: true, jenisKelamin: true, image: true },
      });
      if (user) {
        studentProfile = {
          name: user.name,
          email: user.email,
          grade: user.grade,
          whatsapp: user.whatsapp,
          jenisKelamin: user.jenisKelamin,
          image: user.image,
        };
      }
    }

    // Group analysis by field
    const FIELD_NAMES: Record<string, string> = {
      PRIBADI: 'Bidang Pribadi',
      SOSIAL: 'Bidang Sosial',
      BELAJAR: 'Bidang Belajar',
      KARIR: 'Bidang Karir',
    };

    interface FieldAnalysisEntry {
      field: string;
      totalStudents: number;
      completedStudents: number;
      iya: number;
      tidak: number;
      total: number;
      percentage: number;
      problems: string[];
      users: { id: string; name: string; grade: number; whatsapp: string; image: string | null; iyaCount: number; tidakCount: number; total: number; percentage: number }[];
    }

    const fieldAnalysis: Record<string, FieldAnalysisEntry> = {};

    for (const fieldName of Object.keys(FIELD_NAMES)) {
      const fieldResponses = responses.filter(r => r.survey.field === fieldName);
      const uniqueUserIds = [...new Set(fieldResponses.map(r => r.userId))];

      const userBreakdown = uniqueUserIds.map(uid => {
        const userResponses = fieldResponses.filter(r => r.userId === uid);
        const userObj = userResponses[0]?.user;
        const iyaCount = userResponses.reduce((sum, r) => sum + r.answers.filter(a => a.value === 'IYA').length, 0);
        const tidakCount = userResponses.reduce((sum, r) => sum + r.answers.filter(a => a.value === 'TIDAK').length, 0);
        const total = iyaCount + tidakCount;
        return {
          id: uid,
          name: userObj?.name || 'Unknown',
          grade: userObj?.grade || 0,
          whatsapp: userObj?.whatsapp || '',
          image: userObj?.image || null,
          iyaCount,
          tidakCount,
          total,
          percentage: total > 0 ? Math.round((tidakCount / total) * 100) : 0,
        };
      });

      // If viewing specific user, collect their problem questions
      const problems: string[] = [];
      if (userId) {
        const userFieldResponses = fieldResponses.filter(r => r.userId === userId);
        for (const resp of userFieldResponses) {
          for (const answer of resp.answers) {
            if (answer.value === 'IYA') {
              problems.push(answer.question.text);
            }
          }
        }
      }

      const iya = fieldResponses.reduce((sum, r) => sum + r.answers.filter(a => a.value === 'IYA').length, 0);
      const tidak = fieldResponses.reduce((sum, r) => sum + r.answers.filter(a => a.value === 'TIDAK').length, 0);
      const total = iya + tidak;

      fieldAnalysis[fieldName] = {
        field: fieldName,
        totalStudents: users.length,
        completedStudents: uniqueUserIds.length,
        iya,
        tidak,
        total,
        percentage: total > 0 ? Math.round((tidak / total) * 100) : 0,
        problems,
        users: userBreakdown,
      };
    }

    // Recommendation grading per bidang per kelas
    // TIDAK-based: higher TIDAK% = fewer problems = better grade
    // 100% TIDAK = A (Baik), 90-99% = B, 75-89% = C, 50-74% = D, 0-49% = E
    const getRecommendationGrade = (tidakPercentage: number) => {
      if (tidakPercentage === 100) return 'A';
      if (tidakPercentage >= 90) return 'B';
      if (tidakPercentage >= 75) return 'C';
      if (tidakPercentage >= 50) return 'D';
      return 'E';
    };

    const gradeGroups = [7, 8, 9];
    const recommendationMatrix: Record<string, Record<number, { grade: string; percentage: number; iyaCount: number; total: number }>> = {};

    for (const fieldName of Object.keys(FIELD_NAMES)) {
      recommendationMatrix[fieldName] = {};
      for (const g of gradeGroups) {
        const gradeResponses = responses.filter(r => r.survey.field === fieldName && r.user.grade === g);
        const iya = gradeResponses.reduce((sum, r) => sum + r.answers.filter(a => a.value === 'IYA').length, 0);
        const tidak = gradeResponses.reduce((sum, r) => sum + r.answers.filter(a => a.value === 'TIDAK').length, 0);
        const total = gradeResponses.reduce((sum, r) => sum + r.answers.length, 0);
        const pct = total > 0 ? Math.round((tidak / total) * 100) : 0;
        recommendationMatrix[fieldName][g] = {
          grade: getRecommendationGrade(pct),
          percentage: pct,
          iyaCount: iya,
          total,
        };
      }
    }

    return NextResponse.json({
      schoolSettings,
      studentProfile,
      fieldAnalysis,
      recommendationMatrix,
      responses: responses.map(r => ({
        id: r.id,
        userId: r.userId,
        surveyId: r.surveyId,
        completedAt: r.completedAt,
        user: r.user,
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
    console.error('Admin analysis error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
