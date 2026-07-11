import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Find all USER role students who have at least one "IYA" answer
    const studentsWithProblems = await db.user.findMany({
      where: {
        role: 'USER',
        responses: {
          some: {
            completed: true,
            answers: {
              some: {
                value: 'IYA',
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        grade: true,
        email: true,
        whatsapp: true,
        jenisKelamin: true,
        responses: {
          where: { completed: true },
          include: {
            answers: {
              where: { value: 'IYA' },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Map to include IYA answer count
    const result = studentsWithProblems.map((s) => ({
      id: s.id,
      name: s.name,
      grade: s.grade,
      email: s.email,
      whatsapp: s.whatsapp,
      jenisKelamin: s.jenisKelamin,
      iyaCount: s.responses.reduce((acc: number, r: { answers: { id: string }[] }) => acc + r.answers.length, 0),
    }));

    return NextResponse.json({ students: result });
  } catch (error) {
    console.error('Problem students error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
