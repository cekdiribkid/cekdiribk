import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const url = new URL(req.url);
    const surveyId = url.searchParams.get('surveyId');

    // Get school settings
    const settingsRows = await db.setting.findMany();
    const schoolSettings: Record<string, string> = {};
    for (const s of settingsRows) {
      schoolSettings[s.key] = s.value;
    }

    // Get student profile
    const student = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, grade: true, whatsapp: true, jenisKelamin: true, image: true },
    });

    const studentProfile = student ? {
      name: student.name,
      email: student.email,
      grade: student.grade,
      whatsapp: student.whatsapp,
      jenisKelamin: student.jenisKelamin,
      image: student.image,
    } : null;

    // Build where clause
    const responseWhere: Record<string, unknown> = { userId, completed: true };
    if (surveyId) {
      responseWhere.surveyId = surveyId;
    }

    const responses = await db.response.findMany({
      where: responseWhere,
      include: {
        survey: {
          select: { id: true, title: true, field: true, grade: true, description: true },
        },
        answers: {
          include: {
            question: { select: { id: true, text: true, order: true } },
          },
          orderBy: { question: { order: 'asc' } },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    return NextResponse.json({
      schoolSettings,
      studentProfile,
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
    console.error('Student report error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
