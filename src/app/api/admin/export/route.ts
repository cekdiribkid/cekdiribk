import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const surveyId = req.nextUrl.searchParams.get('surveyId');
    
    if (surveyId) {
      // Export specific survey questions
      const survey = await db.survey.findUnique({
        where: { id: surveyId },
        include: { questions: { orderBy: { order: 'asc' } } },
      });

      if (!survey) {
        return NextResponse.json({ error: 'Survey tidak ditemukan' }, { status: 404 });
      }

      const data = survey.questions.map((q, i) => ({
        No: i + 1,
        Pernyataan: q.text,
        Bidang: survey.field,
        Kelas: survey.grade,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Questions');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="survey_${survey.field}_kelas${survey.grade}.xlsx"`,
        },
      });
    }

    // Export all survey results
    const responses = await db.response.findMany({
      where: { completed: true },
      include: {
        user: { select: { name: true, email: true, grade: true } },
        survey: { select: { title: true, field: true, grade: true } },
        answers: {
          include: { question: { select: { text: true, order: true } } },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    const data = responses.map((r) => {
      const row: Record<string, unknown> = {
        'Nama Siswa': r.user.name,
        'Email': r.user.email,
        'Kelas': r.user.grade,
        'Survey': r.survey.title,
        'Bidang': r.survey.field,
        'Tanggal': r.completedAt?.toISOString().split('T')[0],
        'Jumlah IYA': r.answers.filter((a) => a.value === 'IYA').length,
        'Jumlah TIDAK': r.answers.filter((a) => a.value === 'TIDAK').length,
      };
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="hasil_assessment.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat export' }, { status: 500 });
  }
}
