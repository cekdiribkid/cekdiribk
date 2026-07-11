import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const surveys = await db.survey.findMany({
      include: {
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { questions: true, responses: true } },
      },
      orderBy: [{ grade: 'asc' }, { field: 'asc' }],
    });

    return NextResponse.json({ surveys });
  } catch (error) {
    console.error('Admin surveys error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { title, description, grade, field, questions } = await req.json();

    if (!title || !grade || !field || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const survey = await db.survey.create({
      data: {
        title,
        description: description || '',
        grade: Number(grade),
        field,
        questions: {
          create: questions.map((q: { text: string }, i: number) => ({
            text: q.text,
            order: i + 1,
          })),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json({ survey });
  } catch (error) {
    console.error('Create survey error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
