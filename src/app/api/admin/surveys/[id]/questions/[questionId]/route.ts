import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT - Edit a single question/pernyataan
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id, questionId } = await params;
    const { text, order } = await req.json();

    // Verify question belongs to this survey
    const existing = await db.question.findFirst({
      where: { id: questionId, surveyId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Pernyataan tidak ditemukan' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (text !== undefined) data.text = text.trim();
    if (order !== undefined) data.order = order;

    const question = await db.question.update({
      where: { id: questionId },
      data,
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Update question error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE - Delete a single question/pernyataan
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id, questionId } = await params;

    // Verify question belongs to this survey
    const existing = await db.question.findFirst({
      where: { id: questionId, surveyId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Pernyataan tidak ditemukan' }, { status: 404 });
    }

    await db.question.delete({ where: { id: questionId } });

    // Reorder remaining questions
    const remaining = await db.question.findMany({
      where: { surveyId: id },
      orderBy: { order: 'asc' },
    });

    const updates = remaining.map((q, i) =>
      db.question.update({
        where: { id: q.id },
        data: { order: i + 1 },
      })
    );

    await Promise.all(updates);

    return NextResponse.json({ message: 'Pernyataan berhasil dihapus' });
  } catch (error) {
    console.error('Delete question error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
