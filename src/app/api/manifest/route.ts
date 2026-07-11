import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Dynamic PWA manifest.
 *
 * Serves a manifest.webmanifest that points to /api/pwa/icon/[size] for every
 * icon size. Because those icon endpoints generate PNGs from the school's
 * uploaded logo (see src/app/api/pwa/icon/[size]/route.ts), the icon shown
 * on the user's home screen after install will use the school's branding.
 *
 * The school name (if configured) is also used as the app name so the label
 * under the icon on the home screen matches the school.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

export async function GET() {
  // Pull school name + short name from settings.
  let schoolName = 'CekDiriBK.id';
  let shortName = 'CekDiriBK';
  try {
    const rows = await db.setting.findMany({
      where: { key: { in: ['schoolName'] } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    if (map.schoolName && map.schoolName.trim()) {
      schoolName = map.schoolName.trim();
      // Build a short name: take the first 1-2 words, capped at 12 chars,
      // so the home-screen label doesn't get truncated.
      const words = schoolName.split(/\s+/).filter(Boolean);
      let candidate = words.slice(0, 2).join(' ');
      if (candidate.length > 12) {
        candidate = words[0] || 'CekDiriBK';
      }
      shortName = candidate.slice(0, 12);
    }
  } catch {
    // Fall back to defaults on DB error.
  }

  const icons = ICON_SIZES.map((s) => ({
    src: `/api/pwa/icon/${s}`,
    sizes: `${s}x${s}`,
    type: 'image/png',
    purpose: 'maskable any',
  }));

  // Also include the apple-touch-icon as a separate endpoint so iOS home
  // screen icons use the school logo too.
  const manifest = {
    name: `${schoolName} - CekDiriBK`,
    short_name: shortName,
    description:
      'Kenali dirimu, Pahami masalahmu. DCM (Daftar Cek Masalah) Bimbingan Konseling untuk siswa SMP.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0d9488',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'id',
    categories: ['education', 'health'],
    icons,
    screenshots: [],
    prefer_related_applications: false,
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
