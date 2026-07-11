import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const url = new URL(req.url);
    const studentId = url.searchParams.get('studentId');
    const field = url.searchParams.get('field');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId diperlukan' }, { status: 400 });
    }

    // Get all responses for this student
    const responses = await db.response.findMany({
      where: {
        userId: studentId,
        completed: true,
        ...(field && field !== 'ALL' && field !== 'SEMUA' ? { survey: { field } } : {}),
      },
      include: {
        survey: {
          select: { id: true, title: true, field: true, grade: true },
        },
        answers: {
          include: {
            question: {
              select: { id: true, text: true, order: true },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Collect all "IYA" answers with survey info
    const iyaAnswers: { questionId: string; questionText: string; questionOrder: number; surveyId: string; surveyTitle: string; field: string; grade: number; value: string }[] = [];

    for (const resp of responses) {
      for (const ans of resp.answers) {
        if (ans.value === 'IYA') {
          iyaAnswers.push({
            questionId: ans.questionId,
            questionText: ans.question.text,
            questionOrder: ans.question.order,
            surveyId: resp.surveyId,
            surveyTitle: resp.survey.title,
            field: resp.survey.field,
            grade: resp.survey.grade,
            value: ans.value,
          });
        }
      }
    }

    // Group by field
    const groupedByField: Record<string, typeof iyaAnswers> = {};
    for (const ans of iyaAnswers) {
      if (!groupedByField[ans.field]) groupedByField[ans.field] = [];
      groupedByField[ans.field].push(ans);
    }

    // Get student info
    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, grade: true, jenisKelamin: true, whatsapp: true },
    });

    return NextResponse.json({
      student,
      iyaAnswers,
      groupedByField,
      totalIya: iyaAnswers.length,
    });
  } catch (error) {
    console.error('Student answers error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
