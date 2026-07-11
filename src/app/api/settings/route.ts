import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDefaultLearnMoreValue } from '@/lib/learn-more-defaults';

const PUBLIC_SETTINGS_KEYS = [
  'schoolName',
  'schoolAddress',
  'schoolPhone',
  'schoolLogo',
  'bkCoordinator',
  'academicYear',
  'schoolNpsn',
  'schoolEmail',
  'schoolPrincipal',
  'schoolPrincipalNip',
  'bkCoordinatorNip',
  // WhatsApp number for the floating "Bantuan BK" button (shown on every
  // page, before and after login). Format: international digits without "+",
  // e.g. "6289504186122". Editable from Admin Settings.
  'bkWhatsApp',
  // "Pelajari Lebih Lanjut" content (editable from Admin Settings)
  'learnMoreEnabled',
  'learnMoreStudentTitle',
  'learnMoreStudentContent',
  'learnMoreAdminTitle',
  'learnMoreAdminContent',
];

const DEFAULT_SETTINGS: Record<string, string> = {
  schoolName: 'SMP Negeri 1 Kota Madiun',
  schoolAddress: 'Jl. Pendidikan No. 1, Kota Madiun',
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
  learnMoreEnabled: 'true',
  learnMoreStudentTitle: getDefaultLearnMoreValue('learnMoreStudentTitle'),
  learnMoreStudentContent: getDefaultLearnMoreValue('learnMoreStudentContent'),
  learnMoreAdminTitle: getDefaultLearnMoreValue('learnMoreAdminTitle'),
  learnMoreAdminContent: getDefaultLearnMoreValue('learnMoreAdminContent'),
};

export async function GET() {
  try {
    const settings = await db.setting.findMany({
      where: { key: { in: PUBLIC_SETTINGS_KEYS } },
    });

    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const s of settings) {
      result[s.key] = s.value;
    }

    // For learnMore content keys, fall back to built-in defaults if DB value is empty.
    // This ensures the landing page always has presentable content even before the
    // admin visits the settings page for the first time.
    if (!result.learnMoreEnabled) result.learnMoreEnabled = 'true';
    if (!result.learnMoreStudentTitle) result.learnMoreStudentTitle = getDefaultLearnMoreValue('learnMoreStudentTitle');
    if (!result.learnMoreStudentContent) result.learnMoreStudentContent = getDefaultLearnMoreValue('learnMoreStudentContent');
    if (!result.learnMoreAdminTitle) result.learnMoreAdminTitle = getDefaultLearnMoreValue('learnMoreAdminTitle');
    if (!result.learnMoreAdminContent) result.learnMoreAdminContent = getDefaultLearnMoreValue('learnMoreAdminContent');

    const publicResult: Record<string, string> = {};
    for (const key of PUBLIC_SETTINGS_KEYS) {
      publicResult[key] = result[key] || '';
    }

    return NextResponse.json({ settings: publicResult });
  } catch (error) {
    console.error('Public settings GET error:', error);
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }
}
