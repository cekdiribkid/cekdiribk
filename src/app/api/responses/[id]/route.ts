import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { id } = await params;
    const response = await db.response.findUnique({
      where: { id },
      include: {
        survey: { select: { id: true, title: true, grade: true, field: true, description: true } },
        answers: {
          include: {
            question: { select: { id: true, text: true, order: true } },
          },
        },
      },
    });

    if (!response) {
      return NextResponse.json({ error: 'Response tidak ditemukan' }, { status: 404 });
    }

    if (response.userId !== userId) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 });
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Response detail error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
