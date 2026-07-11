import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const field = url.searchParams.get('field');
    const grade = url.searchParams.get('grade');
    const search = url.searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (field && field !== 'ALL') {
      where.field = field;
    }
    if (grade && grade !== 'ALL') {
      where.student = { grade: Number(grade) };
    }
    if (search) {
      where.OR = [
        { student: { name: { contains: search } } },
        { topic: { contains: search } },
        { notes: { contains: search } },
        { bkOfficer: { contains: search } },
      ];
    }

    const counselings = await db.counseling.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, email: true, grade: true, whatsapp: true, jenisKelamin: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ counselings });
  } catch (error) {
    console.error('Counseling list error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { studentId, date, topic, field, topicItems, ringkasan, notes, followUp, solusi, status, bkOfficer } = await req.json();

    if (!studentId || !date || !topic || !field || !bkOfficer) {
      return NextResponse.json({ error: 'Field wajib harus diisi' }, { status: 400 });
    }

    const counseling = await db.counseling.create({
      data: {
        studentId,
        date: new Date(date),
        topic,
        field,
        topicItems: topicItems || null,
        ringkasan: ringkasan || null,
        notes: notes || null,
        followUp: followUp || null,
        solusi: solusi || null,
        status: status || 'TERJADWAL',
        bkOfficer,
      },
      include: {
        student: {
          select: { id: true, name: true, email: true, grade: true, whatsapp: true, jenisKelamin: true },
        },
      },
    });

    // When creating counseling, update database answers for:
    // 1. Items marked as TIDAK in topicItems (resolved problems)
    // 2. All IYA items when status is SELESAI (counseling completed)
    if (studentId && topicItems) {
      try {
        let topicItemsParsed: { text: string; answer: string; questionId?: string }[] = [];
        try {
          const parsed = JSON.parse(topicItems);
          if (Array.isArray(parsed)) topicItemsParsed = parsed;
        } catch { /* ignore */ }

        // Collect question IDs and texts to update: TIDAK items + all items if SELESAI
        const questionIdsToUpdate: string[] = [];
        const questionTextsToUpdate: string[] = [];
        for (const item of topicItemsParsed) {
          if (item.answer === 'TIDAK' || status === 'SELESAI') {
            if (item.questionId) {
              questionIdsToUpdate.push(item.questionId);
            } else {
              questionTextsToUpdate.push(String(item.text || ''));
            }
          }
        }

        if (questionIdsToUpdate.length > 0 || questionTextsToUpdate.length > 0) {
          const studentResponses = await db.response.findMany({
            where: {
              userId: studentId,
              completed: true,
              ...(field && field !== 'ALL' && field !== 'SEMUA' ? { survey: { field } } : {}),
            },
            include: {
              survey: { select: { field: true } },
              answers: {
                include: {
                  question: { select: { id: true, text: true } },
                },
              },
            },
          });

          let updatedCount = 0;
          for (const resp of studentResponses) {
            for (const ans of resp.answers) {
              if (ans.value === 'IYA') {
                // Prefer exact questionId match, fall back to text matching
                const matchesById = questionIdsToUpdate.length > 0 && questionIdsToUpdate.includes(ans.questionId);
                const matchesByText = questionTextsToUpdate.length > 0 && questionTextsToUpdate.some(
                  (tq) => ans.question?.text && tq && ans.question.text.includes(tq.slice(0, 30))
                );
                if (matchesById || matchesByText) {
                  await db.answer.update({
                    where: { id: ans.id },
                    data: { value: 'TIDAK' },
                  });
                  updatedCount++;
                }
              }
            }
          }
          console.log(`Counseling create: Updated ${updatedCount} answers from IYA to TIDAK for student ${studentId}`);
        }
      } catch (updateErr) {
        console.error('Failed to update student answers on counseling create:', updateErr);
      }
    }

    // Preserve topicItems even when SELESAI so they remain visible in history

    return NextResponse.json({ counseling });
  } catch (error) {
    console.error('Create counseling error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
