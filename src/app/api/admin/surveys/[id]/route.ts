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
    const { title, description, grade, field, active, questions } = await req.json();

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (grade !== undefined) data.grade = Number(grade);
    if (field !== undefined) data.field = field;
    if (active !== undefined) data.active = active;

    // If questions are provided, delete existing and recreate
    if (questions && Array.isArray(questions)) {
      await db.question.deleteMany({ where: { surveyId: id } });
      data.questions = {
        create: questions.map((q: { text: string }, i: number) => ({
          text: q.text,
          order: i + 1,
        })),
      };
    }

    const survey = await db.survey.update({
      where: { id },
      data,
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    return NextResponse.json({ survey });
  } catch (error) {
    console.error('Update survey error:', error);
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
    await db.survey.delete({ where: { id } });

    return NextResponse.json({ message: 'Survey berhasil dihapus' });
  } catch (error) {
    console.error('Delete survey error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
