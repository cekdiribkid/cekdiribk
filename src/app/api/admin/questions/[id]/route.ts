import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const { text, order } = await req.json();

    // Find the existing question
    const existing = await db.question.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pertanyaan tidak ditemukan' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (text !== undefined) data.text = text;

    if (order !== undefined && order !== null) {
      const newOrder = Number(order);
      const oldOrder = existing.order;

      if (newOrder !== oldOrder) {
        if (newOrder < oldOrder) {
          // Moving up: shift questions between newOrder and oldOrder-1 down by 1
          await db.question.updateMany({
            where: {
              surveyId: existing.surveyId,
              order: { gte: newOrder, lt: oldOrder },
            },
            data: {
              order: { increment: 1 },
            },
          });
        } else {
          // Moving down: shift questions between oldOrder+1 and newOrder up by 1
          await db.question.updateMany({
            where: {
              surveyId: existing.surveyId,
              order: { gt: oldOrder, lte: newOrder },
            },
            data: {
              order: { decrement: 1 },
            },
          });
        }

        data.order = newOrder;
      }
    }

    const question = await db.question.update({
      where: { id },
      data,
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Update question error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { id } = await params;

    // Find the question to get its order and surveyId
    const existing = await db.question.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pertanyaan tidak ditemukan' }, { status: 404 });
    }

    // Delete the question
    await db.question.delete({ where: { id } });

    // Reorder remaining questions (decrement order for questions with order > deleted order)
    await db.question.updateMany({
      where: {
        surveyId: existing.surveyId,
        order: { gt: existing.order },
      },
      data: {
        order: { decrement: 1 },
      },
    });

    return NextResponse.json({ message: 'Pertanyaan berhasil dihapus' });
  } catch (error) {
    console.error('Delete question error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
