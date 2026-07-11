import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { surveyId, text, order } = await req.json();

    if (!surveyId || !text) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Verify the survey exists
    const survey = await db.survey.findUnique({ where: { id: surveyId } });
    if (!survey) {
      return NextResponse.json({ error: 'Survey tidak ditemukan' }, { status: 404 });
    }

    // Determine the order for the new question
    let questionOrder: number;

    if (order !== undefined && order !== null) {
      questionOrder = Number(order);

      // Shift existing questions up (increment order by 1 where order >= new order)
      await db.question.updateMany({
        where: {
          surveyId,
          order: { gte: questionOrder },
        },
        data: {
          order: { increment: 1 },
        },
      });
    } else {
      // Find the max order in the survey and add 1
      const maxOrderResult = await db.question.aggregate({
        where: { surveyId },
        _max: { order: true },
      });
      questionOrder = (maxOrderResult._max.order ?? 0) + 1;
    }

    const question = await db.question.create({
      data: {
        surveyId,
        text,
        order: questionOrder,
      },
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Create question error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
