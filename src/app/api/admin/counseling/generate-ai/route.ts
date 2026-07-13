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

    // Generate ALL four fields in one request
    const prompt = `Kamu adalah seorang Guru BK (Bimbingan Konseling) profesional di SMP. Berdasarkan topik konseling berikut, buatkan:

1. RINGKASAN: Ringkasan singkat (1 kalimat) tentang sesi konseling ini.
2. CATATAN KONSELING: Observasi awal dan kondisi siswa terkait masalah ini. Tulis dalam 2-3 kalimat profesional.
3. TINDAK LANJUT: Rencana tindak lanjut yang konkret, terukur, dan realistis untuk siswa SMP. Tulis dalam 2-3 poin.
4. SOLUSI: Solusi dan rekomendasi praktis dengan langkah-langkah yang jelas sesuai untuk siswa SMP. Tulis dalam 2-3 poin.

Topik: "${topicContext}"

Format jawaban STRICTLY seperti ini (tanpa nomor, langsung isinya):
---RINGKASAN---
[isi ringkasan di sini]
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
    let ringkasan = '';
    let notes = '';
    let followUp = '';
    let solusi = '';

    // Debug: log raw generated text
    console.log('=== RAW AI RESPONSE ===');
    console.log(generatedText);
    console.log('=======================');

    try {
      // Improved regex patterns - handle variations in formatting
      // Use [\s\S] instead of . with 's' flag for compatibility
      const ringkasanMatch = generatedText.match(/---?\s*RINGKASAN\s*---?\s*[\r\n]+([\s\S]*?)(?=[\r\n]+---?\s*CATATAN|[\r\n]+---?\s*TINDAK LANJUT|$)/i);
      const catatanMatch = generatedText.match(/---?\s*CATATAN\s*---?\s*[\r\n]+([\s\S]*?)(?=[\r\n]+---?\s*TINDAK LANJUT|[\r\n]+---?\s*SOLUSI|$)/i);
      const tindakMatch = generatedText.match(/---?\s*TINDAK LANJUT\s*---?\s*[\r\n]+([\s\S]*?)(?=[\r\n]+---?\s*SOLUSI|[\r\n]+---?\s*CATATAN|$)/i);
      const solusiMatch = generatedText.match(/---?\s*SOLUSI\s*---?\s*[\r\n]+([\s\S]*?)(?=[\r\n]+---?\s*RINGKASAN|[\r\n]+---?\s*CATATAN|$)/i);

      ringkasan = ringkasanMatch?.[1]?.trim() || '';
      notes = catatanMatch?.[1]?.trim() || '';
      followUp = tindakMatch?.[1]?.trim() || '';
      solusi = solusiMatch?.[1]?.trim() || '';

      // Fallback: if parsing failed, try to extract content differently
      if (!ringkasan && !notes && !followUp && !solusi) {
        // Try alternative parsing - look for section headers with different patterns
        const sections = generatedText.split(/(?=Ringkasan|Catatan|Tindak Lanjut|Solusi)/i);
        for (const section of sections) {
          if (section.toLowerCase().includes('ringkasan') && !ringkasan) {
            ringkasan = section.replace(/Ringkasan/gi, '').trim();
          } else if (section.toLowerCase().includes('catatan') && !notes) {
            notes = section.replace(/Catatan/gi, '').trim();
          } else if (section.toLowerCase().includes('tindak') && !followUp) {
            followUp = section.replace(/Tindak Lanjut/gi, '').trim();
          } else if (section.toLowerCase().includes('solusi') && !solusi) {
            solusi = section.replace(/Solusi/gi, '').trim();
          }
        }
      }

      // Final fallback: if parsing still failed, put everything in notes
      if (!ringkasan && !notes && !followUp && !solusi) {
        notes = generatedText;
      }
    } catch (err) {
      console.error('Parse error:', err);
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

    // Default: return all four
    return NextResponse.json({ ringkasan, notes, followUp, solusi });
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
