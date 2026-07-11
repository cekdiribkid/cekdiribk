import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const grade = formData.get('grade') as string;
    const field = formData.get('field') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({ error: 'File harus diupload' }, { status: 400 });
    }

    if (!grade || !field) {
      return NextResponse.json({ error: 'Jenjang kelas dan bidang harus dipilih' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

    // Extract questions from the Excel
    // Expected format: column "No" and "Pernyataan" or just questions in the first column
    const questions: string[] = [];
    for (const row of data) {
      const questionText = row['Pernyataan'] || row['pernyataan'] || row['Pertanyaan'] || row['pertanyaan'] || row['Question'] || row['question'] || Object.values(row)[0] as string;
      if (questionText && typeof questionText === 'string' && questionText.trim()) {
        questions.push(questionText.trim());
      }
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: 'Tidak ada pernyataan yang ditemukan dalam file Excel' }, { status: 400 });
    }

    const survey = await db.survey.create({
      data: {
        title: title || `DCM Bidang ${field} Kelas ${grade}`,
        description: description || `Daftar Cek Masalah Bidang ${field} untuk siswa kelas ${grade}`,
        grade: Number(grade),
        field,
        questions: {
          create: questions.map((text, i) => ({
            text,
            order: i + 1,
          })),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json({ 
      survey, 
      imported: questions.length,
      message: `Berhasil mengimport ${questions.length} pernyataan` 
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat import' }, { status: 500 });
  }
}
