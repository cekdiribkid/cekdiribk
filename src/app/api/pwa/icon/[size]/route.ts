import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

/**
 * Dynamic PWA icon generator.
 *
 * Returns a square PNG icon at the requested size (e.g. /api/pwa/icon/192)
 * that uses the school's logo (uploaded by the admin in Pengaturan) on a
 * teal background — so the icon installed on the user's home screen matches
 * the school's branding instead of the default CekDiriBK.id icon.
 *
 * Behavior:
 *   - If a `schoolLogo` setting exists in the DB (as a data URL), it is
 *     composited onto a teal (#0d9488 → #10b981) gradient background,
 *     padded so the logo fills ~78% of the icon with a safe-zone margin.
 *   - If no logo is set (or any error occurs), falls back to streaming the
 *     static default icon from /public/icons/icon-{size}x{size}.png — we
 *     read the file directly because NextResponse.redirect() requires an
 *     absolute URL which we cannot reliably construct in all environments.
 *   - Sets long-cache headers (30 days, immutable) keyed by the logo's
 *     content hash so changes to the logo invalidate the cache.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

function parseSize(sizeParam: string | undefined): number | null {
  if (!sizeParam) return null;
  // Accept "192" or "192x192"
  const n = parseInt(sizeParam.split('x')[0], 10);
  if (Number.isNaN(n) || n < 16 || n > 1024) return null;
  return n;
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const m = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (!m) return null;
  try {
    return {
      mime: m[1],
      buffer: Buffer.from(m[2], 'base64'),
    };
  } catch {
    return null;
  }
}

/** Simple FNV-1a hash for cache-busting ETag. */
function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * Stream a static fallback icon directly from /public/icons/.
 * We pick the closest supported size >= requested (so we never upscale a
 * blurry icon). Falls back to logo.svg rendered to PNG if the exact size
 * file doesn't exist.
 */
async function streamFallbackIcon(size: number): Promise<NextResponse> {
  const cacheKeySize = ICON_SIZES.find((s) => s >= size) ?? 512;
  const exactPath = path.join(process.cwd(), 'public', 'icons', `icon-${cacheKeySize}x${cacheKeySize}.png`);
  try {
    if (fs.existsSync(exactPath)) {
      const buf = fs.readFileSync(exactPath);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
          'X-Icon-Source': 'fallback-default',
        },
      });
    }
  } catch {
    // ignore — try svg fallback below
  }

  // Last resort: render logo.svg to a PNG at the requested size.
  try {
    const svgPath = path.join(process.cwd(), 'public', 'logo.svg');
    if (fs.existsSync(svgPath)) {
      const svgBuf = fs.readFileSync(svgPath);
      const pngBuf = await sharp(svgBuf, { density: 384 })
        .resize(size, size, { fit: 'contain', background: { r: 13, g: 148, b: 136, alpha: 1 } })
        .png()
        .toBuffer();
      return new NextResponse(pngBuf, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
          'X-Icon-Source': 'fallback-svg',
        },
      });
    }
  } catch {
    // ignore
  }

  return new NextResponse('Icon not found', { status: 404 });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await ctx.params;
  const size = parseSize(sizeParam);
  if (size === null) {
    return new NextResponse('Invalid icon size', { status: 400 });
  }

  try {
    const setting = await db.setting.findUnique({ where: { key: 'schoolLogo' } });
    const logoDataUrl = setting?.value || '';

    // No logo configured → fall back to static default icon.
    if (!logoDataUrl || !logoDataUrl.startsWith('data:image/')) {
      return streamFallbackIcon(size);
    }

    const parsed = parseDataUrl(logoDataUrl);
    if (!parsed) {
      return streamFallbackIcon(size);
    }

    // Build the icon: teal gradient background + composited logo.
    // Logo is fit to ~78% of the canvas with an ~11% margin so it reads
    // well as a maskable icon (safe zone) on Android adaptive icons.
    const logo = sharp(parsed.buffer);
    const logoMeta = await logo.metadata().catch(() => null);
    if (!logoMeta) {
      return streamFallbackIcon(size);
    }

    const innerSize = Math.round(size * 0.78);
    const resizedLogo = logo
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png();

    // Build a teal gradient SVG background the size of the icon.
    const bgSvg = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0d9488"/>
            <stop offset="100%" stop-color="#10b981"/>
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" fill="url(#g)"/>
      </svg>`
    );

    const logoBuffer = await resizedLogo.toBuffer();
    const composited = await sharp(bgSvg)
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .png()
      .toBuffer();

    const logoHash = hashString(logoDataUrl);
    return new NextResponse(composited, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=2592000, immutable',
        'ETag': `"${logoHash}-${size}"`,
        'X-Icon-Source': 'school-logo',
      },
    });
  } catch (err) {
    console.error('[api/pwa/icon] error:', err);
    return streamFallbackIcon(size);
  }
}
