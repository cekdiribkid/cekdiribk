import { NextRequest, NextResponse } from 'next/server';
import { callAI, clearAIConfigCache } from '@/lib/ai-config';

/**
 * AI Counseling Generator
 *
 * Uses the shared AI config utility (reads from DB first, then .z-ai-config file).
 * Supports multiple OpenAI-compatible providers.
 *
 * Configure AI via: Admin Panel → Pengaturan → Konfigurasi AI
 */

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const { topic, type, studentName, grade, field, topicItems } = body;

    if (!topic && (!topicItems || topicItems.length === 0)) {
      return NextResponse.json({ error: 'Topik harus diisi' }, { status: 400 });
    }

    // Build topic context
    let topicContext = topic || '';
    if (field) {
      const fieldLabels: Record<string, string> = {
        PRIBADI: 'Pribadi', SOSIAL: 'Sosial', BELAJAR: 'Belajar', KARIR: 'Karir', SEMUA: 'Semua Bidang',
      };
      topicContext += ` (Bidang: ${fieldLabels[field] || field})`;
    }
    if (studentName) {
      topicContext += ` - Siswa: ${studentName}`;
    }
    if (grade) {
      topicContext += ` Kelas ${grade}`;
    }
    if (topicItems && Array.isArray(topicItems) && topicItems.length > 0) {
      const iyaItems = topicItems.filter((i: { answer: string }) => i.answer === 'IYA').map((i: { text: string }) => i.text);
      if (iyaItems.length > 0) {
        topicContext += `\nMasalah siswa: ${iyaItems.join('; ')}`;
      }
    }

    // Generate ALL three fields in one request
    const prompt = `Kamu adalah seorang Guru BK (Bimbingan Konseling) profesional di SMP. Berdasarkan topik konseling berikut, buatkan:

1. CATATAN KONSELING: Observasi awal dan kondisi siswa terkait masalah ini. Tulis dalam 2-3 kalimat profesional.
2. TINDAK LANJUT: Rencana tindak lanjut yang konkret, terukur, dan realistis untuk siswa SMP. Tulis dalam 2-3 poin.
3. SOLUSI: Solusi dan rekomendasi praktis dengan langkah-langkah yang jelas sesuai untuk siswa SMP. Tulis dalam 2-3 poin.

Topik: "${topicContext}"

Format jawaban STRICTLY seperti ini (tanpa nomor, langsung isinya):
---CATATAN---
[isi catatan di sini]
---TINDAK LANJUT---
[isi tindak lanjut di sini]
---SOLUSI---
[isi solusi di sini]

Gunakan bahasa Indonesia yang baik dan sopan.`;

    const generatedText = await callAI([
      { role: 'system', content: 'Kamu adalah seorang Guru BK (Bimbingan Konseling) profesional di SMP. Tulis dalam bahasa Indonesia yang baik dan sopan. Ikuti format yang diminta persis.' },
      { role: 'user', content: prompt },
    ]);

    // Parse the response to extract each section
    let notes = '';
    let followUp = '';
    let solusi = '';

    try {
      const catatanMatch = generatedText.match(/---CATATAN---\s*([\s\S]*?)(?=---TINDAK LANJUT---|$)/);
      const tindakMatch = generatedText.match(/---TINDAK LANJUT---\s*([\s\S]*?)(?=---SOLUSI---|$)/);
      const solusiMatch = generatedText.match(/---SOLUSI---\s*([\s\S]*?)$/);

      notes = catatanMatch?.[1]?.trim() || '';
      followUp = tindakMatch?.[1]?.trim() || '';
      solusi = solusiMatch?.[1]?.trim() || '';

      // Fallback: if parsing failed, put everything in notes
      if (!notes && !followUp && !solusi) {
        notes = generatedText;
      }
    } catch {
      notes = generatedText;
    }

    // If type is specified, return only that type (backward compatible)
    if (type === 'catatan') {
      return NextResponse.json({ result: notes });
    } else if (type === 'tindakLanjut') {
      return NextResponse.json({ result: followUp });
    } else if (type === 'solusi') {
      return NextResponse.json({ result: solusi });
    }

    // Default: return all three
    return NextResponse.json({ notes, followUp, solusi });
  } catch (error) {
    console.error('Generate AI error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg === 'AI_NOT_CONFIGURED') {
      return NextResponse.json({
        error: 'AI belum dikonfigurasi. Buka menu Pengaturan → Konfigurasi AI, lalu pilih provider (rekomendasi: Groq gratis di console.groq.com) dan masukkan API Key.',
      }, { status: 500 });
    }
    if (errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed') || errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNRESET')) {
      return NextResponse.json({
        error: 'Gagal terhubung ke server AI. Pastikan Base URL dan API Key sudah benar di Pengaturan → Konfigurasi AI. Jika menggunakan Z AI, pastikan Base URL adalah https://internal-api.z.ai/v1',
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
    if (errMsg.includes('429')) {
      return NextResponse.json({
        error: 'Terlalu banyak request ke AI (rate limit). Tunggu beberapa saat dan coba lagi.',
      }, { status: 500 });
    }
    if (errMsg.includes('AI service error')) {
      return NextResponse.json({ error: `Layanan AI error: ${errMsg}. Periksa konfigurasi AI di Pengaturan.` }, { status: 500 });
    }
    return NextResponse.json({ error: `Gagal menghasilkan teks AI: ${errMsg}` }, { status: 500 });
  }
}
