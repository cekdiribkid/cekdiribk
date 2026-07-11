/**
 * AI Configuration Utility
 *
 * Reads AI config from the database (Settings table) first,
 * then falls back to .z-ai-config file.
 *
 * Supports multiple OpenAI-compatible providers:
 * - z-ai: Internal Z AI Service (needs special headers)
 * - openai: OpenAI API
 * - groq: Groq API
 * - together: Together AI
 * - custom: Any OpenAI-compatible API
 */

import { db } from '@/lib/db';

export interface AIConfig {
  provider: string;    // "z-ai" | "openai" | "groq" | "together" | "custom"
  baseUrl: string;     // API base URL (e.g., "https://api.openai.com/v1")
  apiKey: string;      // API key
  model: string;       // Model name (e.g., "gpt-3.5-turbo", "llama3-70b-8192")
  chatId?: string;     // Z AI specific
  token?: string;      // Z AI specific
  userId?: string;     // Z AI specific
  source: 'database' | 'file' | 'default';
}

const AI_SETTINGS_KEYS = [
  'ai_provider',
  'ai_base_url',
  'ai_api_key',
  'ai_model',
  'ai_chat_id',
  'ai_token',
  'ai_user_id',
];

// Cache for DB-based config
let cachedDbConfig: AIConfig | null = null;
let dbConfigLoadTime = 0;
const DB_CONFIG_CACHE_TTL = 30_000; // 30 seconds

/**
 * Load AI config from database (Settings table)
 */
async function loadConfigFromDb(): Promise<AIConfig | null> {
  const now = Date.now();
  if (cachedDbConfig && (now - dbConfigLoadTime) < DB_CONFIG_CACHE_TTL) {
    return cachedDbConfig;
  }

  try {
    const settings = await db.setting.findMany({
      where: { key: { in: AI_SETTINGS_KEYS } },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    // Must have at least provider, baseUrl, and apiKey
    if (!map.ai_provider || !map.ai_base_url || !map.ai_api_key) {
      return null;
    }

    const config: AIConfig = {
      provider: map.ai_provider || 'custom',
      baseUrl: map.ai_base_url,
      apiKey: map.ai_api_key,
      model: map.ai_model || 'default',
      chatId: map.ai_chat_id || undefined,
      token: map.ai_token || undefined,
      userId: map.ai_user_id || undefined,
      source: 'database',
    };

    cachedDbConfig = config;
    dbConfigLoadTime = now;
    return config;
  } catch {
    return null;
  }
}

/**
 * Load AI config from .z-ai-config file
 */
async function loadConfigFromFile(): Promise<AIConfig | null> {
  try {
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
        const raw = JSON.parse(configStr);
        if (raw.baseUrl && raw.apiKey) {
          return {
            provider: 'z-ai', // .z-ai-config is always Z AI format
            baseUrl: raw.baseUrl,
            apiKey: raw.apiKey,
            model: raw.model || 'default',
            chatId: raw.chatId || undefined,
            token: raw.token || undefined,
            userId: raw.userId || undefined,
            source: 'file',
          };
        }
      } catch {
        // Continue to next path
      }
    }
  } catch {
    // fs import failed
  }

  return null;
}

/**
 * Get AI configuration - tries DB first, then file, then returns null
 */
export async function getAIConfig(): Promise<AIConfig | null> {
  // Try database first
  const dbConfig = await loadConfigFromDb();
  if (dbConfig) return dbConfig;

  // Fall back to file
  const fileConfig = await loadConfigFromFile();
  if (fileConfig) return fileConfig;

  return null;
}

/**
 * Clear the cached config (call after saving new settings)
 */
export function clearAIConfigCache(): void {
  cachedDbConfig = null;
  dbConfigLoadTime = 0;
}

/**
 * Safely parse JSON from a Response object.
 * Handles cases where the response is HTML or non-JSON.
 */
async function safeParseJSON(response: Response): Promise<{ data: unknown; error: string | null }> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  // Check if response is HTML
  if (contentType.includes('text/html') || text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
    return { data: null, error: `Server mengembalikan HTML, bukan JSON. Kemungkinan URL API salah atau tidak dapat diakses. Pastikan Base URL diakhiri dengan /v1` };
  }

  try {
    const data = JSON.parse(text);
    return { data, error: null };
  } catch {
    return { data: null, error: `Gagal memproses respons dari server AI. Respons: ${text.substring(0, 200)}` };
  }
}

/**
 * Validate an API key against a provider's /models endpoint.
 * Returns { valid, message, models? }
 */
export async function validateApiKey(provider: string, baseUrl: string, apiKey: string): Promise<{
  valid: boolean;
  message: string;
  models?: string[];
}> {
  if (!apiKey || !baseUrl) {
    return { valid: false, message: 'API Key dan Base URL harus diisi' };
  }

  // Check API key format
  if (provider === 'groq' && !apiKey.startsWith('gsk_')) {
    return {
      valid: false,
      message: 'API Key Groq harus dimulai dengan "gsk_". Pastikan Anda mengcopy API Key yang benar dari console.groq.com → API Keys. Key yang Anda masukkan mungkin bukan API Key melainkan ID lain.',
    };
  }

  if (provider === 'openai' && !apiKey.startsWith('sk-')) {
    return {
      valid: false,
      message: 'API Key OpenAI harus dimulai dengan "sk-". Pastikan Anda mengcopy API Key yang benar dari platform.openai.com → API Keys.',
    };
  }

  let cleanUrl = baseUrl.trim();
  if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

  const modelsUrl = `${cleanUrl}/models`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `HTTP ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.error?.message || errorJson.message || errorMsg;
      } catch {
        errorMsg += ` - ${errorText.substring(0, 200)}`;
      }

      if (response.status === 401 || response.status === 403) {
        if (provider === 'groq') {
          return {
            valid: false,
            message: `API Key Groq ditolak (error ${response.status}). Kemungkinan penyebab:\n` +
              `1. API Key sudah expired atau di-revoke — buat key baru di console.groq.com\n` +
              `2. API Key salah copy — pastikan full key dimulai dari gsk_ sampai akhir\n` +
              `3. Akun Groq belum terverifikasi — cek email verifikasi dari Groq\n` +
              `4. Jika baru buat akun, tunggu 5-10 menit lalu coba lagi\n` +
              `Detail error: ${errorMsg}`,
          };
        }
        return {
          valid: false,
          message: `API Key ditolak (error ${response.status}). Pastikan API Key benar dan masih aktif. Detail: ${errorMsg}`,
        };
      }

      return {
        valid: false,
        message: `Gagal memvalidasi API Key (error ${response.status}): ${errorMsg}`,
      };
    }

    const { data, error: parseError } = await safeParseJSON(response);
    if (parseError) {
      return { valid: true, message: 'API Key valid (tidak dapat membaca daftar model)' };
    }

    const result = data as { data?: Array<{ id: string }> };
    const modelList = result.data?.map(m => m.id) || [];

    if (provider === 'groq') {
      return {
        valid: true,
        message: `API Key Groq valid! Ditemukan ${modelList.length} model tersedia.`,
        models: modelList,
      };
    }

    return {
      valid: true,
      message: `API Key valid! Ditemukan ${modelList.length} model tersedia.`,
      models: modelList,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';

    if (msg.includes('abort') || msg.includes('timeout')) {
      return { valid: false, message: 'Koneksi timeout saat memvalidasi API Key. Periksa koneksi internet dan Base URL.' };
    }
    if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
      return { valid: false, message: `Domain tidak ditemukan: ${baseUrl}. Periksa kembali Base URL.` };
    }

    return { valid: false, message: `Gagal memvalidasi: ${msg}` };
  }
}

/**
 * Call AI with the appropriate provider configuration
 * Uses Z AI SDK for z-ai provider, direct fetch for others
 */
export async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const config = await getAIConfig();

  if (!config) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  // For Z AI provider, use the Z AI SDK which handles internal routing
  if (config.provider === 'z-ai') {
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      // Wrap in a timeout to prevent indefinite hangs
      const response = await Promise.race([
        zai.chat.completions.create({
          model: config.model || 'default',
          messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
          thinking: { type: 'disabled' },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Z AI SDK timeout (30s)')), 30_000)
        ),
      ]);
      return response.choices?.[0]?.message?.content || '';
    } catch (sdkError) {
      const errMsg = sdkError instanceof Error ? sdkError.message : String(sdkError);
      console.error('Z AI SDK error:', errMsg);
      // If SDK fails, fall through to direct fetch attempt
      // (might work if internal API is accessible directly)
    }
  }

  // Direct fetch for non-Z AI providers or Z AI SDK fallback
  let targetUrl = config.baseUrl;
  if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);
  targetUrl = `${targetUrl}/chat/completions`;

  // Build headers based on provider
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };

  // Z AI specific headers
  if (config.provider === 'z-ai') {
    headers['X-Z-AI-From'] = 'Z';
    if (config.chatId) headers['X-Chat-Id'] = config.chatId;
    if (config.userId) headers['X-User-Id'] = config.userId;
    if (config.token) headers['X-Token'] = config.token;
  }

  // Determine effective model - fix deprecated models
  let effectiveModel = config.model || 'default';
  if (config.provider === 'groq') {
    // Auto-fix deprecated Groq models
    const deprecatedModels: Record<string, string> = {
      'mixtral-8x7b-32768': 'llama-3.3-70b-versatile',
      'llama2-70b-4096': 'llama-3.3-70b-versatile',
      'llama2-7b-4096': 'llama-3.1-8b-instant',
      'gemma-7b-it': 'gemma2-9b-it',
    };
    if (deprecatedModels[effectiveModel]) {
      console.log(`Auto-fixing deprecated Groq model: ${effectiveModel} -> ${deprecatedModels[effectiveModel]}`);
      effectiveModel = deprecatedModels[effectiveModel];
    }
  }

  // Build request body
  const body: Record<string, unknown> = {
    model: effectiveModel,
    messages,
  };

  // Z AI needs thinking disabled
  if (config.provider === 'z-ai') {
    body.thinking = { type: 'disabled' };
  }

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch (fetchError) {
    const errMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
    if (errMsg.includes('ECONNREFUSED')) {
      throw new Error(`Gagal terhubung ke ${targetUrl}. Server AI menolak koneksi. Pastikan Base URL benar.`);
    }
    if (errMsg.includes('ENOTFOUND')) {
      throw new Error(`Domain tidak ditemukan: ${config.baseUrl}. Periksa kembali Base URL.`);
    }
    if (errMsg.includes('ECONNRESET')) {
      throw new Error(`Koneksi terputus saat menghubungi AI. Coba lagi.`);
    }
    if (errMsg.includes('abort') || errMsg.includes('timeout')) {
      throw new Error(`Koneksi timeout (30 detik). Server AI terlalu lama merespons. Coba lagi atau ganti model yang lebih ringan.`);
    }
    throw new Error(`Gagal menghubungi AI: ${errMsg}`);
  }

  if (!response.ok) {
    const { data, error: parseError } = await safeParseJSON(response);
    if (parseError) {
      throw new Error(`AI service error (${response.status}): Server mengembalikan respons tidak valid. Pastikan Base URL dan API Key benar.`);
    }
    const errorData = data as { error?: { message?: string }; message?: string };
    const errorMsg = errorData?.error?.message || errorData?.message || JSON.stringify(data).substring(0, 200);

    // Provide provider-specific error guidance
    if (response.status === 401 || response.status === 403) {
      if (config.provider === 'groq') {
        throw new Error(
          `Groq API Key ditolak (error ${response.status}). ` +
          `Kemungkinan penyebab:\n` +
          `1. API Key sudah expired/di-revoke — buat baru di console.groq.com\n` +
          `2. API Key tidak lengkap — pastikan full key dari gsk_ sampai akhir\n` +
          `3. Akun belum terverifikasi — cek email dari Groq\n` +
          `Solusi: Hapus konfigurasi, buat API Key baru, lalu simpan ulang.\n` +
          `Detail: ${errorMsg}`
        );
      }
      throw new Error(
        `API Key ditolak (error ${response.status}). Pastikan API Key benar dan masih aktif. Detail: ${errorMsg}`
      );
    }

    if (response.status === 404 && config.provider === 'groq') {
      throw new Error(
        `Model "${effectiveModel}" tidak ditemukan di Groq. ` +
        `Model ini mungkin sudah tidak tersedia. Ganti ke model lain seperti "llama-3.3-70b-versatile". ` +
        `Detail: ${errorMsg}`
      );
    }

    throw new Error(`AI service error (${response.status}): ${errorMsg}`);
  }

  const { data, error: parseError } = await safeParseJSON(response);
  if (parseError) {
    throw new Error(parseError);
  }

  const result = data as { choices?: Array<{ message?: { content?: string } }> };
  return result.choices?.[0]?.message?.content || '';
}

/**
 * Get provider presets for UI
 * Updated with current available models (March 2025)
 */
export const AI_PROVIDER_PRESETS: Record<string, { label: string; baseUrl: string; models: string[]; description: string; keyPrefix?: string; signupUrl?: string }> = {
  'groq': {
    label: 'Groq (Gratis - Rekomendasi)',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'gemma2-9b-it',
      'deepseek-r1-distill-llama-70b',
    ],
    description: 'Groq API - cepat dan gratis! Daftar di console.groq.com',
    keyPrefix: 'gsk_',
    signupUrl: 'https://console.groq.com',
  },
  'openai': {
    label: 'OpenAI (Berbayar)',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    description: 'OpenAI API - memerlukan API key berbayar dari platform.openai.com',
    keyPrefix: 'sk-',
    signupUrl: 'https://platform.openai.com',
  },
  'together': {
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    models: ['meta-llama/Llama-3-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    description: 'Together AI - platform AI open-source, ada free tier',
    signupUrl: 'https://api.together.xyz',
  },
  'z-ai': {
    label: 'Z AI Service (Sandbox)',
    baseUrl: 'https://internal-api.z.ai/v1',
    models: ['default'],
    description: 'Internal Z AI Service (otomatis di sandbox Z.ai)',
  },
  'custom': {
    label: 'Custom / Lainnya',
    baseUrl: '',
    models: [],
    description: 'API OpenAI-compatible lainnya (Ollama, LM Studio, dll)',
  },
};
