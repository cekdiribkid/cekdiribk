import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all responses for current user
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const responses = await db.response.findMany({
      where: { userId },
      include: {
        survey: {
          select: { id: true, title: true, grade: true, field: true },
        },
        answers: {
          include: {
            question: { select: { id: true, text: true, order: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ responses });
  } catch (error) {
    console.error('Responses error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// POST submit survey answers
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    const userGrade = req.headers.get('x-user-grade');

    if (!userId) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { surveyId, answers } = await req.json();

    if (!surveyId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    // Verify survey exists and user has access
    const survey = await db.survey.findUnique({
      where: { id: surveyId },
      include: { questions: true },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey tidak ditemukan' }, { status: 404 });
    }

    if (userRole !== 'ADMIN' && Number(userGrade) !== survey.grade) {
      return NextResponse.json({ error: 'Anda tidak memiliki akses' }, { status: 403 });
    }

    // Check if already completed
    const existing = await db.response.findFirst({
      where: { userId, surveyId, completed: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'Anda sudah menyelesaikan survey ini' }, { status: 400 });
    }

    // Create or update response
    const response = await db.response.create({
      data: {
        userId,
        surveyId,
        completed: true,
        completedAt: new Date(),
        answers: {
          create: answers.map((a: { questionId: string; value: string }) => ({
            questionId: a.questionId,
            value: a.value,
          })),
        },
      },
      include: {
        survey: { select: { title: true, grade: true, field: true } },
        answers: {
          include: {
            question: { select: { id: true, text: true, order: true } },
          },
        },
      },
    });

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Submit response error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
