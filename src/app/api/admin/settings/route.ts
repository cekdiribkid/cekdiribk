import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEFAULT_SETTINGS: Record<string, string> = {
  schoolName: 'SMP Negeri 1 Contoh',
  schoolAddress: 'Jl. Pendidikan No. 1, Kota Contoh',
  schoolPhone: '(021) 1234567',
  schoolLogo: '',
  bkCoordinator: 'Guru BK',
  academicYear: '2024/2025',
  schoolNpsn: '',
  schoolEmail: '',
  schoolPrincipal: '',
  schoolPrincipalNip: '',
  bkCoordinatorNip: '',
  bkWhatsApp: '6289504186122',
  // "Pelajari Lebih Lanjut" beranda content (editable from admin)
  learnMoreEnabled: 'true',
  learnMoreStudentTitle: '',
  learnMoreStudentContent: '',
  learnMoreAdminTitle: '',
  learnMoreAdminContent: '',
};

export async function GET() {
  try {
    const settings = await db.setting.findMany();
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return NextResponse.json({ settings: result });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      console.warn('Settings PUT: Access denied, role=', userRole);
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    let data: Record<string, unknown>;
    try {
      data = await req.json();
    } catch (parseError) {
      console.error('Settings PUT: Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    // Upsert each setting
    const entries = Object.entries(data).filter(([, v]) => typeof v === 'string');
    if (entries.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk disimpan' }, { status: 400 });
    }

    for (const [key, value] of entries) {
      await db.setting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      });
    }

    // Return all settings
    const settings = await db.setting.findMany();
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return NextResponse.json({ settings: result });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}
