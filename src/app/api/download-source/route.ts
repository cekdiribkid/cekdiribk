import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { Readable } from 'stream';

/**
 * GET /api/download-source?format=zip|tar.gz
 *
 * Dynamic source-code archive generator.
 *
 * WHY THIS EXISTS:
 *   The old static files (public/cekdiribk-source.tar.gz / .zip) were created
 *   manually with `tar`/`zip` and went STALE every time code changed. Users
 *   downloading them got outdated code that was missing recent features.
 *
 *   This endpoint generates the archive ON-DEMAND at request time, reading
 *   the LIVE source files from disk. So the download is ALWAYS current —
 *   no manual regeneration needed, ever.
 *
 * WHAT'S INCLUDED:
 *   App source only: src/, public/, prisma/, mini-services/, download/ + all
 *   config files (package.json, bun.lock, next.config.ts, ...).
 *   Excludes node_modules, .next, .git, tool-results, upload, *.log — those
 *   are regenerable or too large.
 *
 * USAGE:
 *   /api/download-source            → tar.gz (default, smaller)
 *   /api/download-source?format=zip → zip (for Windows users)
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Files & folders to include in the archive. Paths are relative to the
// project root. Order doesn't matter. MUST exist on disk (missing ones are
// skipped silently by tar/zip).
const INCLUDE_PATHS = [
  'src',
  'public',
  'prisma',
  'mini-services',
  'download',
  'package.json',
  'bun.lock',
  'next.config.ts',
  'tsconfig.json',
  'postcss.config.mjs',
  'components.json',
  'tailwind.config.ts',
  'Caddyfile',
  '.gitignore',
  'eslint.config.mjs',
  'next-env.d.ts',
];

// Exclude patterns — passed to tar --exclude and zip -x. These keep the
// archive small and avoid bundling regenerable / sensitive content.
const EXCLUDE_PATTERNS = [
  '*.log',
  'tsconfig.tsbuildinfo',
  // Exclude the OLD stale static archives from public/ so they don't end
  // up inside the fresh dynamic archive (avoids confusion + bloat).
  'public/cekdiribk-source.tar.gz',
  'public/cekdiribk-source.zip',
];

function buildArchive(format: 'zip' | 'tar.gz'): Readable {
  const cwd = process.cwd();

  if (format === 'zip') {
    // `zip -r -` → stream to stdout. `-q` for quiet. Each exclude needs `-x`.
    const args = ['-rq', '-', ...INCLUDE_PATHS];
    for (const pat of EXCLUDE_PATTERNS) {
      args.push('-x', pat);
    }
    return spawn('zip', args, { cwd }).stdout;
  }

  // tar.gz (default). `tar -czf -` → stream gzip'd tar to stdout.
  const args = ['-czf', '-'];
  for (const pat of EXCLUDE_PATTERNS) {
    args.push('--exclude', pat);
  }
  args.push(...INCLUDE_PATHS);
  return spawn('tar', args, { cwd }).stdout;
}

export async function GET(req: NextRequest) {
  const formatParam = (req.nextUrl.searchParams.get('format') || 'tar.gz').toLowerCase();
  const format: 'zip' | 'tar.gz' = formatParam === 'zip' ? 'zip' : 'tar.gz';

  const fileName =
    format === 'zip' ? 'cekdiribk-source.zip' : 'cekdiribk-source.tar.gz';
  const contentType =
    format === 'zip' ? 'application/zip' : 'application/gzip';

  try {
    const archiveStream = buildArchive(format);

    // Convert Node Readable → Web ReadableStream for the Response.
    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        const onData = (chunk: Buffer) => {
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch {
            // Controller may be closed/errored — ignore.
          }
        };
        const onError = (err: Error) => {
          console.error('[download-source] spawn error:', err);
          try {
            controller.error(err);
          } catch {
            // ignore
          }
        };
        const onClose = () => {
          try {
            controller.close();
          } catch {
            // ignore
          }
        };

        archiveStream.on('data', onData);
        archiveStream.on('error', onError);
        archiveStream.on('close', onClose);
        archiveStream.on('end', onClose);
      },
      cancel() {
        // Client disconnected — destroy the spawn to free resources.
        try {
          (archiveStream as Readable & { destroy?: () => void }).destroy?.();
        } catch {
          // ignore
        }
      },
    });

    return new NextResponse(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // attachment → forces browser to download instead of navigating.
        'Content-Disposition': `attachment; filename="${fileName}"`,
        // Don't cache — we always want the latest source.
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[download-source] error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat arsip source code' },
      { status: 500 }
    );
  }
}
