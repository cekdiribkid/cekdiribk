import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

/**
 * Dynamic favicon (32x32) generated from the school's logo on a teal
 * background. Falls back to /icons/favicon-32x32.png (read directly) if
 * no logo is set or any error occurs.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SIZE = 32;

function parseDataUrl(dataUrl: string): { buffer: Buffer } | null {
  const m = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (!m) return null;
  try {
    return { buffer: Buffer.from(m[2], 'base64') };
  } catch {
    return null;
  }
}

async function streamFallback(): Promise<NextResponse> {
  try {
    const p = path.join(process.cwd(), 'public', 'icons', 'favicon-32x32.png');
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
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
    // ignore
  }
  return new NextResponse('Icon not found', { status: 404 });
}

export async function GET() {
  try {
    const setting = await db.setting.findUnique({ where: { key: 'schoolLogo' } });
    const logoDataUrl = setting?.value || '';

    if (!logoDataUrl || !logoDataUrl.startsWith('data:image/')) {
      return streamFallback();
    }

    const parsed = parseDataUrl(logoDataUrl);
    if (!parsed) {
      return streamFallback();
    }

    const innerSize = Math.round(SIZE * 0.82);
    const logoBuffer = await sharp(parsed.buffer)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const bgSvg = Buffer.from(
      `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0d9488"/>
            <stop offset="100%" stop-color="#10b981"/>
          </linearGradient>
        </defs>
        <rect width="${SIZE}" height="${SIZE}" fill="url(#g)" rx="6"/>
      </svg>`
    );

    const composited = await sharp(bgSvg)
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .png()
      .toBuffer();

    return new NextResponse(composited, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=2592000, immutable',
        'X-Icon-Source': 'school-logo',
      },
    });
  } catch (err) {
    console.error('[api/pwa/favicon] error:', err);
    return streamFallback();
  }
}
