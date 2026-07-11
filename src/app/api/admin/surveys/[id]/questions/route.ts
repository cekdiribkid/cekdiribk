import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Add a new question/pernyataan to a survey
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const { text, order } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Teks pernyataan tidak boleh kosong' }, { status: 400 });
    }

    // Verify survey exists
    const survey = await db.survey.findUnique({ where: { id } });
    if (!survey) {
      return NextResponse.json({ error: 'Survey tidak ditemukan' }, { status: 404 });
    }

    // Get max order if not provided
    let questionOrder = order;
    if (questionOrder === undefined || questionOrder === null) {
      const maxOrder = await db.question.findFirst({
        where: { surveyId: id },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      questionOrder = (maxOrder?.order || 0) + 1;
    }

    const question = await db.question.create({
      data: {
        surveyId: id,
        text: text.trim(),
        order: questionOrder,
      },
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Create question error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// PUT - Update order of questions (batch reorder)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const { questions } = await req.json();

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    // Verify survey exists
    const survey = await db.survey.findUnique({ where: { id } });
    if (!survey) {
      return NextResponse.json({ error: 'Survey tidak ditemukan' }, { status: 404 });
    }

    // Update each question's order
    const updates = questions.map((q: { id: string; order: number }) =>
      db.question.update({
        where: { id: q.id, surveyId: id },
        data: { order: q.order },
      })
    );

    await Promise.all(updates);

    return NextResponse.json({ message: 'Urutan pernyataan berhasil diperbarui' });
  } catch (error) {
    console.error('Reorder questions error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
