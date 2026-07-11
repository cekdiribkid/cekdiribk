import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clearAIConfigCache, AI_PROVIDER_PRESETS } from '@/lib/ai-config';

const AI_SETTINGS_KEYS = [
  'ai_provider',
  'ai_base_url',
  'ai_api_key',
  'ai_model',
  'ai_chat_id',
  'ai_token',
  'ai_user_id',
];

const DEFAULT_AI_SETTINGS: Record<string, string> = {
  ai_provider: '',
  ai_base_url: '',
  ai_api_key: '',
  ai_model: '',
  ai_chat_id: '',
  ai_token: '',
  ai_user_id: '',
};

export async function GET() {
  try {
    const settings = await db.setting.findMany({
      where: { key: { in: AI_SETTINGS_KEYS } },
    });

    const result: Record<string, string> = { ...DEFAULT_AI_SETTINGS };
    for (const s of settings) {
      result[s.key] = s.value;
    }

    // Mask the API key for security
    if (result.ai_api_key) {
      const key = result.ai_api_key;
      if (key.length > 8) {
        result.ai_api_key = key.slice(0, 4) + '****' + key.slice(-4);
      } else {
        result.ai_api_key = '****';
      }
    }

    return NextResponse.json({
      settings: result,
      providers: AI_PROVIDER_PRESETS,
    });
  } catch (error) {
    console.error('AI config GET error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      console.warn('AI config PUT: Access denied, role=', userRole);
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    let data: Record<string, unknown>;
    try {
      data = await req.json();
    } catch (parseError) {
      console.error('AI config PUT: Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    // Validate required fields
    if (!data.ai_provider || !data.ai_base_url || !data.ai_api_key) {
      const missing: string[] = [];
      if (!data.ai_provider) missing.push('Provider');
      if (!data.ai_base_url) missing.push('Base URL');
      if (!data.ai_api_key) missing.push('API Key');
      return NextResponse.json({
        error: `Field wajib belum diisi: ${missing.join(', ')}`,
      }, { status: 400 });
    }

    // Check if API key is masked (****) — if so, don't update it
    const settingsToSave: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && AI_SETTINGS_KEYS.includes(key)) {
        // Skip masked API keys
        if (key === 'ai_api_key' && value.includes('****')) {
          continue;
        }
        // Skip empty optional fields
        if (!value && !['ai_provider', 'ai_base_url', 'ai_api_key'].includes(key)) {
          continue;
        }
        settingsToSave[key] = value;
      }
    }

    for (const [key, value] of Object.entries(settingsToSave)) {
      await db.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    // Clear the cached config so next request picks up new settings
    clearAIConfigCache();

    // Return the saved config (with masked key)
    const resultSettings = await db.setting.findMany({
      where: { key: { in: AI_SETTINGS_KEYS } },
    });
    const result: Record<string, string> = { ...DEFAULT_AI_SETTINGS };
    for (const s of resultSettings) {
      result[s.key] = s.value;
    }
    if (result.ai_api_key) {
      const key = result.ai_api_key;
      if (key.length > 8) {
        result.ai_api_key = key.slice(0, 4) + '****' + key.slice(-4);
      } else {
        result.ai_api_key = '****';
      }
    }

    return NextResponse.json({
      settings: result,
      message: 'Konfigurasi AI berhasil disimpan',
    });
  } catch (error) {
    console.error('AI config PUT error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await db.setting.deleteMany({
      where: { key: { in: AI_SETTINGS_KEYS } },
    });
    clearAIConfigCache();
    return NextResponse.json({ message: 'Konfigurasi AI berhasil dihapus' });
  } catch (error) {
    console.error('AI config DELETE error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
