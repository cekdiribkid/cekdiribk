// ==================== RECOMMENDATION / SARAN GRADING SYSTEM ====================
// Based on acuan jawaban 'TIDAK': percentage = TIDAK% = non-problem rate
// Higher TIDAK% = fewer problems = better grade
// Grade A: 100% TIDAK — Baik (no problems at all)
// Grade B: 90%-99% TIDAK — Cukup Baik
// Grade C: 75%-89% TIDAK — Cukup
// Grade D: 50%-74% TIDAK — Kurang
// Grade E: 0%-49% TIDAK — Kurang Sekali

export type FieldName = "PRIBADI" | "SOSIAL" | "BELAJAR" | "KARIR";
export type GradeLevel = 7 | 8 | 9;

export interface GradeInfo {
  grade: string;
  label: string;
  color: string;
  bgColor: string;
  description: string;
  keterangan: string;
}

export interface RecommendationInfo {
  grade: string;
  label: string;
  range: string;
  keterangan: string;
  saran: string;
}

// ==================== KETERANGAN PER GRADE ====================
const GRADE_KETERANGAN: Record<string, string> = {
  A: "Tidak ada masalah yang signifikan.",
  B: "Masalah ringan, monitor saja.",
  C: "Perlu perhatian dasar.",
  D: "Urgensi sedang, intervensi kelompok.",
  E: "Masalah berat, konseling individual segera.",
};

// ==================== GRADE RANGES (TIDAK-referenced) ====================
const GRADE_RANGES: Record<string, { label: string; range: string; keterangan: string }> = {
  A: { label: "Baik", range: "100% TIDAK", keterangan: GRADE_KETERANGAN.A },
  B: { label: "Cukup Baik", range: "90%-99% TIDAK", keterangan: GRADE_KETERANGAN.B },
  C: { label: "Cukup", range: "75%-89% TIDAK", keterangan: GRADE_KETERANGAN.C },
  D: { label: "Kurang", range: "50%-74% TIDAK", keterangan: GRADE_KETERANGAN.D },
  E: { label: "Kurang Sekali", range: "0%-49% TIDAK", keterangan: GRADE_KETERANGAN.E },
};

// ==================== PER-BIDANG PER-KELAS SARAN ====================

// --- BIDANG PRIBADI ---
const SARAN_PRIBADI: Record<GradeLevel, Record<string, string>> = {
  7: {
    A: "Wah, kamu sudah bagus banget! Terus jaga semangat belajar, percaya diri, dan kebiasaan baikmu ya. Kamu hebat!",
    B: "Kamu hampir sempurna! Ada sedikit hal kecil yang bisa diperbaiki. Coba cerita ke guru BK kalau ada yang mengganggu, dan terus semangat ya!",
    C: "Ada beberapa hal yang bikin kamu kurang nyaman. Coba latihan bernapas dalam kalau cemas, dan cerita ke teman atau guru BK. Kamu pasti bisa lebih baik!",
    D: "Kamu butuh bantuan sedikit lebih ya. Ikut kelompok bimbingan di sekolah, latihan buat lebih percaya diri, dan jangan ragu cerita ke orang tua atau guru. Kita bantu bareng!",
    E: "Sekarang waktunya dapat bantuan khusus. Datang ke guru BK untuk ngobrol pribadi ya. Kamu nggak sendirian, kita bantu supaya kamu lebih senang dan kuat!",
  },
  8: {
    A: "Keren banget! Kamu sudah kuat mengendalikan emosi dan percaya diri. Terus jaga ya, kamu role model buat teman-teman!",
    B: "Kamu hampir top! Ada sedikit cemas atau ragu, coba tarik napas dalam 5 kali kalau lagi tegang. Pasti makin mantap!",
    C: "Ada tantangan seperti kurang percaya diri atau mudah marah. Latihan bilang \"Aku bisa!\" setiap pagi, dan cerita perasaan ke guru BK. Kamu pasti lebih tenang!",
    D: "Butuh bantuan untuk kuatkan diri. Ikut kelompok bimbingan emosi di sekolah, buat jadwal harian sederhana, dan diskusi bareng teman. Kita dukung kamu!",
    E: "Sekarang dapat konseling pribadi ya. Datang ke guru BK untuk ngobrol soal perasaan, latihan relaksasi, dan rencana positif. Kamu nggak sendiri, yuk bangkit bareng!",
  },
  9: {
    A: "Keren abis! Kamu sudah kuat emosi, percaya diri, dan bahagia. Terus jaga, kamu siap hadapi masa depan!",
    B: "Kamu hampir sempurna! Ada sedikit sedih atau cemas, coba jurnal harian: Tulis 3 hal baik hari ini. Pasti lebih ringan!",
    C: "Ada tantangan seperti minder atau sulit kontrol emosi. Latihan afirmasi \"Aku kuat & berharga\", olahraga 15 menit/hari, dan cerita ke guru BK. Kamu bisa lebih percaya diri!",
    D: "Butuh bantuan kelompok. Ikut sesi pengelolaan emosi sekolah, buat rutinitas positif, dan diskusi bareng teman. Kita dukung kamu bangkit!",
    E: "Sekarang konseling individual segera ya. Datang ke guru BK untuk bantuan pribadi, atasi pikiran negatif, dan rencana kesehatan mental. Kamu berharga, yuk mulai sekarang!",
  },
};

// --- BIDANG SOSIAL ---
const SARAN_SOSIAL: Record<GradeLevel, Record<string, string>> = {
  7: {
    A: "Keren! Kamu sudah jago bergaul, kerja sama, dan nyaman sama teman & keluarga. Terus jaga persahabatanmu ya, kamu luar biasa!",
    B: "Kamu hampir sempurna dalam bersosial! Ada sedikit hal kecil, seperti mulai obrolan lebih lancar. Coba senyum dan sapa teman dulu, pasti lebih asyik!",
    C: "Ada beberapa tantangan bergaul atau kerja sama. Coba latihan dengar teman bicara, bilang \"maaf\" kalau salah, dan ikut kegiatan kelompok. Kamu bisa lebih dekat sama orang lain!",
    D: "Kamu butuh bantuan untuk lebih nyaman sosial. Ikut kelompok bimbingan sekolah, latihan bikin teman baru, dan cerita ke guru BK kalau ada masalah bullying atau pertengkaran. Kita bantu bareng!",
    E: "Sekarang saatnya dapat bantuan khusus. Datang ke guru BK untuk ngobrol pribadi soal teman, keluarga, atau rasa dikucilkan. Kamu nggak sendirian, kita dukung kamu!",
  },
  8: {
    A: "Hebat! Kamu sudah jago bergaul, kerja sama, dan harmonis sama teman & keluarga. Terus jadi teman yang asyik ya!",
    B: "Kamu hampir sempurna! Ada sedikit canggung atau salah paham, coba sapa teman dulu atau bilang \"maaf\" cepat. Pasti makin seru!",
    C: "Ada tantangan seperti tersisih atau konflik teman. Latihan dengar dulu pendapat orang lain, dan cerita masalah ke guru BK. Kamu bisa punya circle teman solid!",
    D: "Butuh bantuan untuk hubungan sosial. Ikut kelompok bimbingan persahabatan di sekolah, latihan kerja tim, dan diskusi keluarga. Kita bantu bangun relasi kuat!",
    E: "Sekarang dapat konseling pribadi ya. Datang ke guru BK untuk ngobrol soal teman, keluarga, atau rasa tersisih. Kamu layak punya hubungan bahagia!",
  },
  9: {
    A: "Super! Kamu sudah mahir bergaul, kerja tim, dan punya pertemanan solid. Terus jaga, kamu leader alami!",
    B: "Kamu hampir perfect! Ada sedikit canggung atau salah paham, coba mulai obrolan dengan pertanyaan sederhana. Pasti makin nyaman!",
    C: "Ada tantangan seperti dikucilkan atau sulit kerja kelompok. Latihan empati: \"Gimana perasaanmu?\", dan cerita ke guru BK. Kamu bisa bangun circle positif!",
    D: "Butuh bantuan kelompok. Ikut workshop anti-bullying & teamwork sekolah, latihan komunikasi, dan cari teman suportif. Kita bantu perbaiki relasi!",
    E: "Sekarang konseling individual segera ya. Datang ke guru BK untuk atasi kesepian/bullying, bangun kepercayaan diri, dan strategi sosial. Kamu layak bahagia bareng orang lain!",
  },
};

// --- BIDANG BELAJAR ---
const SARAN_BELAJAR: Record<GradeLevel, Record<string, string>> = {
  7: {
    A: "Mantap! Kamu sudah pintar belajar, fokus, dan rajin. Terus jaga jadwalmu ya, kamu juara belajar!",
    B: "Kamu hampir sempurna! Ada sedikit hal seperti fokus lebih lama atau catat pelajaran. Coba buat jadwal harian sederhana, pasti makin mantap!",
    C: "Ada tantangan seperti bosan atau menunda tugas. Coba belajar 20 menit dulu, istirahat 5 menit, dan tanya guru kalau bingung. Kamu bisa naik kelas pintar!",
    D: "Kamu butuh bantuan untuk belajar lebih enak. Ikut kelompok belajar di sekolah, matikan HP saat belajar, dan cerita ke guru BK soal susah paham. Kita bantu bareng!",
    E: "Sekarang waktunya dapat bantuan khusus. Datang ke guru BK untuk konseling belajar pribadi, buat rencana belajar bareng, dan jangan takut tanya. Kamu pasti bisa berubah!",
  },
  8: {
    A: "Wah, top markotop! Kamu sudah pro belajar, fokus, dan termotivasi. Terus tingkatkan, prestasi menanti!",
    B: "Kamu hampir juara! Ada sedikit bosan atau menunda, coba timer 25 menit belajar + 5 menit istirahat. Makin asyik deh!",
    C: "Ada tantangan seperti susah konsentrasi atau cemas ujian. Buat jadwal belajar harian, tanya guru kalau bingung, dan coba app belajar seru. Kamu bisa naik level!",
    D: "Butuh bantuan kelompok belajar. Ikut bimbingan sekolah, matikan gadget saat belajar, dan diskusi cara efektif sama guru BK. Kita bantu capai target nilai!",
    E: "Sekarang konseling pribadi yuk. Datang ke guru BK untuk rencana belajar khusus, atasi rasa takut, dan dukungan orang tua. Perubahan dimulai sekarang!",
  },
  9: {
    A: "Juara! Kamu sudah disiplin, fokus, dan siap UN. Terus gaspol, masa SMA menanti dengan prestasi tinggi!",
    B: "Kamu hampir top! Atasi sedikit malas atau lupa dengan reminder HP & jadwal sederhana. Pasti makin mantap!",
    C: "Ada tantangan seperti bosan atau cemas ujian. Buat jadwal harian, latihan soal 30 menit/hari, tanya guru langsung. Kamu bisa naik nilai drastis!",
    D: "Butuh bantuan kelompok. Ikut try-out & bimbingan UN sekolah, matikan HP saat belajar, diskusi guru BK. Kita bantu capai target lulus!",
    E: "Sekarang konseling individual segera ya. Datang ke guru BK untuk rencana belajar intensif, motivasi, dan dukungan orang tua. Perubahan besar dimulai hari ini!",
  },
};

// --- BIDANG KARIR ---
const SARAN_KARIR: Record<GradeLevel, Record<string, string>> = {
  7: {
    A: "Super! Kamu sudah punya gambaran cita-cita dan rencana masa depan. Terus eksplorasi bakatmu ya, masa depan cerah!",
    B: "Kamu hampir oke soal karir! Tambah info sedikit, seperti tanya orang tua soal pekerjaan mereka. Coba tulis 3 cita-cita favoritmu!",
    C: "Kamu mulai bingung soal cita-cita atau bakat. Coba catat apa yang kamu suka lakukan, tonton video profesi keren, dan diskusi sama guru BK. Kamu pasti nemu jalannya!",
    D: "Butuh bantuan untuk rencana karir. Ikut kelompok bimbingan karir di sekolah, coba hobi baru, dan tanya panutanmu. Kita bantu buat rencana langkah demi langkah!",
    E: "Sekarang dapat bantuan khusus ya. Datang ke guru BK untuk konseling karir pribadi, tes bakat, dan bikin mimpi masa depan bareng. Kamu bisa sukses besar!",
  },
  8: {
    A: "Mantap! Kamu sudah punya rencana karir jelas dan dukungan bagus. Terus eksplorasi, masa depanmu bright!",
    B: "Kamu hampir siap! Tambah diskusi cita-cita sama orang tua, coba googling jurusan SMA/SMK. Langkah kecil bikin yakin!",
    C: "Ada bingung soal cita-cita atau jurusan. Catat bakatmu, tonton video profesi di YouTube, dan ngobrol sama guru BK. Kamu pasti nemu passion-mu!",
    D: "Butuh bantuan kelompok karir. Ikut workshop sekolah, cari info online bareng teman, dan diskusi orang tua. Kita bantu buat roadmap sukses!",
    E: "Sekarang konseling pribadi yuk. Datang ke guru BK untuk tes bakat, rencana jurusan, dan atasi ragu-ragu. Kamu bisa wujudkan mimpi besar!",
  },
  9: {
    A: "Mantap! Kamu sudah jelas cita-cita, jurusan, & rencana SMA/SMK. Terus persiapan UN, sukses menanti!",
    B: "Kamu hampir siap! Tambah info sekolah favorit via PPDB online & diskusi orang tua. Pilihanmu pasti tepat!",
    C: "Ada bingung jurusan atau takut salah pilih. Ikut tes minat bakat gratis, googling \"jurusan SMK sesuai bakat\", & konsultasi guru BK. Kamu bisa putuskan yang terbaik!",
    D: "Butuh bantuan kelompok. Ikut workshop karir & try-out PPDB sekolah, diskusi orang tua, cari beasiswa. Kita bantu buat rencana masuk sekolah impian!",
    E: "Sekarang konseling individual segera ya. Datang ke guru BK untuk tes bakat lengkap, motivasi, & roadmap karir pribadi. Masa depanmu cerah, yuk mulai!",
  },
};

// --- OVERALL SARAN PER KELAS ---
const SARAN_OVERALL: Record<GradeLevel, Record<string, string>> = {
  7: {
    A: "Luar biasa! Kamu sudah sangat baik di semua bidang. Terus jaga semangat, kebiasaan positif, dan keseimbangan hidupmu ya. Kamu contoh yang hebat!",
    B: "Kamu hampir sempurna di semua bidang! Ada sedikit hal kecil yang bisa diperbaiki. Coba cerita ke guru BK kalau ada yang mengganggu, dan terus semangat ya!",
    C: "Ada beberapa tantangan di beberapa bidang. Coba perbaiki satu per satu, mulai dari yang paling mengganggu. Guru BK siap bantu kamu agar lebih baik!",
    D: "Kamu butuh bantuan di beberapa bidang. Ikut kelompok bimbingan di sekolah, cerita ke guru BK, dan jangan ragu minta bantuan. Kita bantu bareng!",
    E: "Sekarang waktunya dapat bantuan khusus di beberapa bidang. Datang ke guru BK untuk ngobrol lengkap, dan kita buat rencana perbaikan bareng. Kamu nggak sendirian!",
  },
  8: {
    A: "Keren banget! Kamu sudah kuat dan seimbang di semua bidang. Terus jaga ya, kamu role model buat teman-teman!",
    B: "Kamu hampir top di semua bidang! Sedikit perbaikan di beberapa hal, coba tarik napas dalam kalau tegang dan cerita ke guru BK. Pasti makin mantap!",
    C: "Ada tantangan di beberapa bidang. Fokus perbaiki yang paling penting dulu, dan cerita ke guru BK. Kamu pasti bisa lebih baik!",
    D: "Butuh bantuan di beberapa bidang. Ikut bimbingan sekolah, diskusi guru BK, dan jangan ragu minta dukungan. Kita dukung kamu!",
    E: "Sekarang dapat konseling lengkap ya. Datang ke guru BK untuk evaluasi semua bidang, dan kita buat rencana perbaikan. Kamu berharga, yuk bangkit!",
  },
  9: {
    A: "Juara! Kamu sudah seimbang dan kuat di semua bidang. Terus gaspol, masa depan cerah menanti dengan prestasi tinggi!",
    B: "Kamu hampir sempurna di semua bidang! Sedikit penyesuaian, pasti makin mantap menghadapi masa depan!",
    C: "Ada tantangan di beberapa bidang yang perlu perhatian. Buat rencana perbaikan, cerita ke guru BK, dan fokus yang paling penting dulu. Kamu bisa bangkit!",
    D: "Butuh bantuan di beberapa bidang. Ikut bimbingan intensif, diskusi guru BK, dan fokus perbaikan. Kita dukung kamu capai target!",
    E: "Sekarang konseling komprehensif segera ya. Datang ke guru BK untuk evaluasi semua bidang dan rencana perbaikan total. Perubahan besar dimulai hari ini!",
  },
};

// Field-to-saran lookup
const FIELD_SARAN: Record<FieldName, Record<GradeLevel, Record<string, string>>> = {
  PRIBADI: SARAN_PRIBADI,
  SOSIAL: SARAN_SOSIAL,
  BELAJAR: SARAN_BELAJAR,
  KARIR: SARAN_KARIR,
};

// ==================== CORE FUNCTIONS ====================

// Grade lookup based on TIDAK percentage (non-problem rate): 100% = best, lower = worse
// TIDAK% = (tidakCount / total) * 100
// 100% TIDAK = A (Baik), 90-99% = B, 75-89% = C, 50-74% = D, 0-49% = E
export function getGradeInfo(tidakPercentage: number): GradeInfo {
  if (isNaN(tidakPercentage) || tidakPercentage === null || tidakPercentage === undefined) {
    return { grade: "-", label: "Data Tidak Tersedia", color: "text-gray-500", bgColor: "bg-gray-50", description: "Data tidak tersedia untuk dinilai", keterangan: "Data tidak tersedia" };
  }
  if (tidakPercentage === 100) return { grade: "A", label: "Baik", color: "text-emerald-700", bgColor: "bg-emerald-50", description: "Tidak ada masalah", keterangan: GRADE_KETERANGAN.A };
  if (tidakPercentage >= 90) return { grade: "B", label: "Cukup Baik", color: "text-teal-700", bgColor: "bg-teal-50", description: "Masalah ringan", keterangan: GRADE_KETERANGAN.B };
  if (tidakPercentage >= 75) return { grade: "C", label: "Cukup", color: "text-amber-700", bgColor: "bg-amber-50", description: "Masalah sedang", keterangan: GRADE_KETERANGAN.C };
  if (tidakPercentage >= 50) return { grade: "D", label: "Kurang", color: "text-orange-700", bgColor: "bg-orange-50", description: "Masalah signifikan", keterangan: GRADE_KETERANGAN.D };
  return { grade: "E", label: "Kurang Sekali", color: "text-rose-700", bgColor: "bg-rose-50", description: "Masalah berat", keterangan: GRADE_KETERANGAN.E };
}

// Get the result grade letter based on TIDAK percentage
export function getResultGrade(tidakPercentage: number): string {
  if (tidakPercentage === 100) return "A";
  if (tidakPercentage >= 90) return "B";
  if (tidakPercentage >= 75) return "C";
  if (tidakPercentage >= 50) return "D";
  return "E";
}

// Calculate overall TIDAK percentage across all fields (average of TIDAK%)
export function calculateOverallPercentage(fieldPercentages: Record<FieldName, number>): number {
  const fields: FieldName[] = ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"];
  const validFields = fields.filter(f => {
    const val = fieldPercentages[f];
    return val !== undefined && !isNaN(val) && val >= 0;
  });

  if (validFields.length === 0) return 0;

  const sum = validFields.reduce((acc, f) => acc + fieldPercentages[f], 0);
  return Math.round(sum / validFields.length);
}

// Per-field, per-kelas recommendation with specific saran
// tidakPercentage = (tidakCount / total) * 100
export function getFieldRecommendation(field: FieldName, kelas: GradeLevel, tidakPercentage: number): RecommendationInfo {
  const gradeLetter = getResultGrade(tidakPercentage);
  const saran = FIELD_SARAN[field]?.[kelas]?.[gradeLetter] || "Tidak ada rekomendasi spesifik.";
  const rangeInfo = GRADE_RANGES[gradeLetter] || { label: "-", range: "-", keterangan: "-" };

  return {
    grade: gradeLetter,
    label: rangeInfo.label,
    range: rangeInfo.range,
    keterangan: rangeInfo.keterangan,
    saran,
  };
}

// Overall recommendation with per-kelas saran
// tidakPercentage = overall TIDAK%
export function getOverallRecommendation(tidakPercentage: number, kelas: GradeLevel = 7): RecommendationInfo {
  const gradeLetter = getResultGrade(tidakPercentage);
  const rangeInfo = GRADE_RANGES[gradeLetter] || { label: "-", range: "-", keterangan: "-" };
  const saran = SARAN_OVERALL[kelas]?.[gradeLetter] || "Tidak ada rekomendasi.";

  return {
    grade: gradeLetter,
    label: rangeInfo.label,
    range: rangeInfo.range,
    keterangan: rangeInfo.keterangan,
    saran,
  };
}

// Format grade display: "A (Baik) – Tidak ada masalah yang signifikan."
export function formatGradeDisplay(tidakPercentage: number): string {
  const gradeLetter = getResultGrade(tidakPercentage);
  const rangeInfo = GRADE_RANGES[gradeLetter];
  if (!rangeInfo) return "-";
  return `${gradeLetter} (${rangeInfo.label}) – ${rangeInfo.keterangan}`;
}
