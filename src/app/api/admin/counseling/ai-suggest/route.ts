import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-config';

/**
 * AI Suggest Route
 *
 * Uses the shared AI config utility (reads from DB first, then .z-ai-config file).
 * Supports multiple OpenAI-compatible providers.
 */

const SYSTEM_PROMPT = `Kamu adalah seorang ahli Bimbingan Konseling (BK) di sekolah menengah pertama (SMP) di Indonesia. Kamu akan diberikan topik/topik ringkasan masalah siswa. Berikan respons dalam format berikut:

### CATATAN
[Tulis catatan profesional tentang masalah siswa berdasarkan topik yang diberikan]

### TINDAK LANJUT
[Tulis rekomendasi tindak lanjut yang harus dilakukan oleh Guru BK]

### SOLUSI
[Tulis solusi dan strategi yang dapat diterapkan untuk membantu siswa mengatasi masalahnya]`;

function parseAIResponse(text: string): {
  catatan: string;
  tindakLanjut: string;
  solusi: string;
} {
  const catatanMatch = text.split('### CATATAN');
  const tindakLanjutMatch = text.split('### TINDAK LANJUT');
  const solusiMatch = text.split('### SOLUSI');

  const catatan = catatanMatch.length > 1
    ? catatanMatch[1].split('### TINDAK LANJUT')[0].trim()
    : '';

  const tindakLanjut = tindakLanjutMatch.length > 1
    ? tindakLanjutMatch[1].split('### SOLUSI')[0].trim()
    : '';

  const solusi = solusiMatch.length > 1
    ? solusiMatch[1].trim()
    : '';

  return { catatan, tindakLanjut, solusi };
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const { topic, field } = body as { topic: string; field?: string };

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return NextResponse.json(
        { error: 'Topik konseling wajib diisi' },
        { status: 400 }
      );
    }

    let userPrompt = `Topik masalah siswa: ${topic.trim()}`;
    if (field && field.trim() !== '') {
      userPrompt += `\nBidang: ${field.trim()}`;
    }

    const responseText = await callAI([
      { role: 'assistant', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);

    if (!responseText) {
      return NextResponse.json(
        { error: 'Gagal menghasilkan saran dari AI' },
        { status: 500 }
      );
    }

    const parsed = parseAIResponse(responseText);

    if (!parsed.catatan && !parsed.tindakLanjut && !parsed.solusi) {
      return NextResponse.json(
        { error: 'Format respons AI tidak valid' },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('AI suggest error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg === 'AI_NOT_CONFIGURED') {
      return NextResponse.json({
        error: 'AI belum dikonfigurasi. Buka menu Pengaturan → Konfigurasi AI, lalu pilih provider (rekomendasi: Groq gratis di console.groq.com) dan masukkan API Key.',
      }, { status: 500 });
    }
    if (errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed') || errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNRESET')) {
      return NextResponse.json({
        error: 'Gagal terhubung ke server AI. Pastikan Base URL dan API Key sudah benar di Pengaturan → Konfigurasi AI.',
      }, { status: 502 });
    }
    if (errMsg.includes('401')) {
      return NextResponse.json({
        error: 'API Key tidak valid (error 401). Periksa kembali API Key di Pengaturan → Konfigurasi AI.',
      }, { status: 500 });
    }
    if (errMsg.includes('404')) {
      return NextResponse.json({
        error: 'Model atau endpoint tidak ditemukan (error 404). Periksa Base URL dan nama model di Pengaturan → Konfigurasi AI.',
      }, { status: 500 });
    }
    return NextResponse.json(
      { error: `Gagal menghasilkan saran AI: ${errMsg}` },
      { status: 500 }
    );
  }
}
