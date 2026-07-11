import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface TopicItem {
  text: string;
  answer: 'IYA' | 'TIDAK';
  checked: boolean;
  field?: string;
  questionId?: string; // Link to analysis question for reliable matching
}

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
    const { studentId, date, topic, field, topicItems, ringkasan, notes, followUp, solusi, status, bkOfficer } = await req.json();

    // Check if this is a status change TO SELESAI
    const existing = await db.counseling.findUnique({
      where: { id },
      select: { status: true, studentId: true, field: true, topicItems: true },
    });

    const data: Record<string, unknown> = {};
    if (studentId) data.studentId = studentId;
    if (date) data.date = new Date(date);
    if (topic) data.topic = topic;
    if (field) data.field = field;
    if (topicItems !== undefined) data.topicItems = topicItems || null;
    if (ringkasan !== undefined) data.ringkasan = ringkasan || null;
    if (notes !== undefined) data.notes = notes || null;
    if (followUp !== undefined) data.followUp = followUp || null;
    if (solusi !== undefined) data.solusi = solusi || null;
    if (status) data.status = status;
    if (bkOfficer) data.bkOfficer = bkOfficer;

    const counseling = await db.counseling.update({
      where: { id },
      data,
      include: {
        student: {
          select: { id: true, name: true, email: true, grade: true, whatsapp: true, jenisKelamin: true },
        },
      },
    });

    const targetStudentId = studentId || existing?.studentId;
    const targetField = field || existing?.field;
    const isStatusChangedToSelesai = status === 'SELESAI' && existing && existing.status !== 'SELESAI';

    // Parse new topicItems to find TIDAK items (resolved problems)
    let newTopicItemsParsed: TopicItem[] = [];
    if (topicItems) {
      try {
        const parsed = JSON.parse(topicItems);
        if (Array.isArray(parsed)) newTopicItemsParsed = parsed;
      } catch { /* ignore */ }
    }

    // Parse old topicItems to find IYA items (previously unresolved)
    let oldTopicItemsParsed: TopicItem[] = [];
    if (existing?.topicItems) {
      try {
        const parsed = JSON.parse(existing.topicItems);
        if (Array.isArray(parsed)) oldTopicItemsParsed = parsed;
      } catch { /* ignore */ }
    }

    // Collect resolved question IDs and texts for matching
    const resolvedQuestionIds: string[] = [];
    const resolvedQuestionTexts: string[] = [];

    // Find items that changed from IYA to TIDAK
    for (const newItem of newTopicItemsParsed) {
      if (newItem.answer === 'TIDAK') {
        const oldItem = oldTopicItemsParsed.find(o => o.text === newItem.text && o.answer === 'IYA');
        if (oldItem) {
          if (newItem.questionId) {
            resolvedQuestionIds.push(newItem.questionId);
          } else {
            resolvedQuestionTexts.push(newItem.text);
          }
        }
      }
    }

    // If status changed to SELESAI, also include all remaining IYA items from new topicItems
    if (isStatusChangedToSelesai) {
      for (const item of newTopicItemsParsed) {
        if (item.answer === 'IYA') {
          if (item.questionId) {
            resolvedQuestionIds.push(item.questionId);
          } else {
            resolvedQuestionTexts.push(item.text);
          }
        }
      }
    }

    // Update database answers for resolved questions
    if ((resolvedQuestionIds.length > 0 || resolvedQuestionTexts.length > 0) && targetStudentId) {
      try {
        const studentResponses = await db.response.findMany({
          where: {
            userId: targetStudentId,
            completed: true,
            ...(targetField && targetField !== 'ALL' && targetField !== 'SEMUA' ? { survey: { field: targetField } } : {}),
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
              const matchesById = resolvedQuestionIds.length > 0 && resolvedQuestionIds.includes(ans.questionId);
              const matchesByText = resolvedQuestionTexts.length > 0 && resolvedQuestionTexts.some(
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

        console.log(`Counseling update: Updated ${updatedCount} answers from IYA to TIDAK for student ${targetStudentId}`);
      } catch (updateErr) {
        console.error('Failed to update student answers:', updateErr);
        // Don't fail the counseling update, just log the error
      }
    }

    // Preserve topicItems even when SELESAI so they remain visible in history

    return NextResponse.json({ counseling });
  } catch (error) {
    console.error('Update counseling error:', error);
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
    await db.counseling.delete({ where: { id } });

    return NextResponse.json({ message: 'Sesi konseling berhasil dihapus' });
  } catch (error) {
    console.error('Delete counseling error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
