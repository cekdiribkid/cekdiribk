import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Sample data for BK assessment questions
    const sampleData = [
      { No: 1, Pertanyaan: 'Saya merasa cemas saat menghadapi ujian' },
      { No: 2, Pertanyaan: 'Saya kesulitan bergaul dengan teman sekelas' },
      { No: 3, Pertanyaan: 'Saya sering merasa sedih tanpa alasan yang jelas' },
      { No: 4, Pertanyaan: 'Saya merasa tertekan dengan tugas sekolah yang diberikan' },
      { No: 5, Pertanyaan: 'Saya kesulitan berkonsentrasi saat belajar' },
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 60 }, // Pertanyaan
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Format Import');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return as downloadable file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="format_import_pertanyaan.xlsx"',
      },
    });
  } catch (error) {
    console.error('Admin sample error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
