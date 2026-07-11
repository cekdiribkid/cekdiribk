import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Gateway — External Proxy to Z AI Service
 *
 * This route exposes the Z AI service through the Next.js server,
 * making it accessible from OUTSIDE the sandbox network.
 *
 * Usage from your localhost:
 *   .z-ai-config baseUrl = "http://YOUR_SANDBOX_URL:81/api/ai-gateway"
 *
 * This proxy reads the internal .z-ai-config for credentials
 * and forwards all requests to the Z AI service.
 */

// Cache config
let cachedConfig: { baseUrl: string; apiKey: string; chatId?: string; token?: string; userId?: string } | null = null;
let configLoadTime = 0;
const CONFIG_CACHE_TTL = 60_000;

async function loadConfig() {
  const now = Date.now();
  if (cachedConfig && (now - configLoadTime) < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  const fs = await import('fs/promises');
  const path = await import('path');
  const os = await import('os');

  const homeDir = os.homedir();
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(homeDir, '.z-ai-config'),
    '/etc/.z-ai-config',
  ];

  for (const filePath of configPaths) {
    try {
      const configStr = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(configStr);
      if (config.baseUrl && config.apiKey) {
        cachedConfig = config;
        configLoadTime = now;
        return config;
      }
    } catch {
      // Continue
    }
  }

  throw new Error('Configuration file not found');
}

export async function POST(req: NextRequest) {
  try {
    const config = await loadConfig();

    // Build target URL: baseUrl + /chat/completions
    let targetUrl = config.baseUrl;
    if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);
    targetUrl = `${targetUrl}/chat/completions`;

    // Get request body
    const body = await req.json();

    // Build headers with internal credentials
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Z-AI-From': 'Z',
    };
    if (config.chatId) headers['X-Chat-Id'] = config.chatId;
    if (config.userId) headers['X-User-Id'] = config.userId;
    if (config.token) headers['X-Token'] = config.token;

    // Forward to internal Z AI service with 30s timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let response;
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('AI Gateway upstream error:', response.status, errorBody);
      return NextResponse.json(
        { error: `AI service error: ${response.status}`, detail: errorBody },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI Gateway error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('Configuration file not found')) {
      return NextResponse.json({ error: 'AI Gateway: Konfigurasi tidak ditemukan' }, { status: 500 });
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'AI Gateway: Permintaan kehabisan waktu (30 detik).' }, { status: 504 });
    }
    return NextResponse.json({ error: 'AI Gateway error: ' + errMsg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'CekDiriBK AI Gateway',
    status: 'active',
    description: 'Proxy ke Z AI Service untuk akses eksternal',
    usage: 'POST ke /api/ai-gateway/chat/completions dengan body OpenAI-compatible',
  });
}
