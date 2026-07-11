import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/student-answers?studentId=xxx — get all IYA answers for a student
export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const studentId = req.nextUrl.searchParams.get('studentId');
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID diperlukan' }, { status: 400 });
    }

    const answers = await db.answer.findMany({
      where: {
        value: 'IYA',
        response: {
          userId: studentId,
          completed: true,
        },
      },
      include: {
        question: {
          select: { id: true, text: true, order: true, survey: { select: { field: true, grade: true } } },
        },
        response: {
          select: { survey: { select: { field: true, grade: true } } },
        },
      },
      orderBy: { question: { order: 'asc' } },
    });

    const result = answers.map((a) => ({
      answerId: a.id,
      questionId: a.questionId,
      questionText: a.question.text,
      questionOrder: a.question.order,
      field: a.response.survey.field,
      surveyGrade: a.response.survey.grade,
      currentValue: a.value,
    }));

    return NextResponse.json({ answers: result });
  } catch (error) {
    console.error('Student answers error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
