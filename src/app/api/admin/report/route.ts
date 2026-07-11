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
    const surveyId = url.searchParams.get('surveyId');

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 });
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
      select: { id: true, name: true, email: true, grade: true, whatsapp: true, jenisKelamin: true, image: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

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
      studentProfile: {
        name: student.name,
        email: student.email,
        grade: student.grade,
        whatsapp: student.whatsapp,
        jenisKelamin: student.jenisKelamin,
        image: student.image,
      },
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
    console.error('Admin report error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
