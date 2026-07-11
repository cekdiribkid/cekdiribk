import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Proxy Route
 *
 * This route acts as a reverse proxy to the configured AI service.
 * It reads the target baseUrl from .z-ai-config and forwards requests.
 *
 * Why: The Z AI SDK (z-ai-web-dev-sdk) needs to reach the AI server directly.
 * When deployed on localhost, the internal AI server IP (172.25.x.x) may not be
 * reachable. This proxy runs server-side, so as long as the Next.js server can
 * reach the AI service, the client will work.
 *
 * Configuration: See .z-ai-config in the project root.
 */

// Cache the config to avoid re-reading on every request
let cachedConfig: { baseUrl: string; apiKey: string; chatId?: string; token?: string; userId?: string } | null = null;
let configLoadTime = 0;
const CONFIG_CACHE_TTL = 60_000; // 1 minute

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
      // Continue to the next path
    }
  }

  throw new Error('Configuration file not found or invalid. Please create .z-ai-config in your project, home directory, or /etc/.');
}

export async function POST(req: NextRequest) {
  try {
    const config = await loadConfig();

    // Build the target URL
    let targetUrl = config.baseUrl;
    // Ensure no trailing slash
    if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);
    // Append the path after /api/ai-proxy
    // e.g., POST /api/ai-proxy/chat/completions -> baseUrl/chat/completions
    const proxyPath = req.nextUrl.pathname.replace('/api/ai-proxy', '');
    targetUrl = `${targetUrl}${proxyPath}`;

    // Get request body
    const body = await req.json();

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Z-AI-From': 'Z',
    };
    if (config.chatId) headers['X-Chat-Id'] = config.chatId;
    if (config.userId) headers['X-User-Id'] = config.userId;
    if (config.token) headers['X-Token'] = config.token;

    // Forward the request with 30s timeout to prevent hanging
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
      console.error('AI Proxy error:', response.status, errorBody);
      return NextResponse.json(
        { error: `AI service returned status ${response.status}: ${errorBody}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI Proxy error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('Configuration file not found') || errMsg.includes('.z-ai-config')) {
      return NextResponse.json({
        error: 'Konfigurasi AI belum tersedia. Pastikan file .z-ai-config ada di folder project. Lihat .z-ai-config.example untuk format yang benar.',
      }, { status: 500 });
    }
    if (errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed') || errMsg.includes('ENOTFOUND')) {
      return NextResponse.json({
        error: 'Gagal terhubung ke server AI. Pastikan baseUrl di .z-ai-config benar dan server AI dapat diakses dari server ini.',
      }, { status: 502 });
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Permintaan AI kehabisan waktu (30 detik). Silakan coba lagi.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Proxy AI gagal: ' + errMsg }, { status: 500 });
  }
}
