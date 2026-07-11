// Recommendation/Saran system for DCM Analysis Results
// Percentage = TIDAK/total (achievement rate)
// 100% TIDAK = no problems = Grade A (Baik)
// 0-49% TIDAK = many problems = Grade E (Kurang Sekali)
// 4 fields (PRIBADI, SOSIAL, BELAJAR, KARIR) × 3 grades (7,8,9) × 5 levels (A,B,C,D,E) = 60 entries

export type GradeLevel = 7 | 8 | 9;
export type FieldName = "PRIBADI" | "SOSIAL" | "BELAJAR" | "KARIR";
export type ResultGrade = "A" | "B" | "C" | "D" | "E";

export interface RecommendationEntry {
  grade: ResultGrade;
  label: string;
  range: string;
  saran: string;
}

export interface FieldRecommendation {
  field: FieldName;
  kelas: GradeLevel;
  entries: RecommendationEntry[];
}

// ====== BIDANG PRIBADI ======
const PRIBADI_7: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Wah, kamu sudah bagus banget! Tidak ada masalah yang teridentifikasi. Terus jaga semangat belajar, percaya diri, dan kebiasaan baikmu ya. Kamu hebat!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir sempurna! Ada sedikit hal kecil yang bisa diperbaiki. Coba cerita ke guru BK kalau ada yang mengganggu, dan terus semangat ya!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada beberapa hal yang bikin kamu kurang nyaman. Coba latihan bernapas dalam kalau cemas, dan cerita ke teman atau guru BK. Kamu pasti bisa lebih baik!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Kamu butuh bantuan sedikit lebih ya. Ikut kelompok bimbingan di sekolah, latihan buat lebih percaya diri, dan jangan ragu cerita ke orang tua atau guru. Kita bantu bareng!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang waktunya dapat bantuan khusus. Datang ke guru BK untuk ngobrol pribadi ya. Kamu nggak sendirian, kita bantu supaya kamu lebih senang dan kuat!" },
];

const PRIBADI_8: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Keren banget! Kamu sudah kuat mengendalikan emosi dan percaya diri. Tidak ada masalah yang teridentifikasi. Terus jaga ya, kamu role model buat teman-teman!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir top! Ada sedikit cemas atau ragu, coba tarik napas dalam 5 kali kalau lagi tegang. Pasti makin mantap!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada tantangan seperti kurang percaya diri atau mudah marah. Latihan bilang \"Aku bisa!\" setiap pagi, dan cerita perasaan ke guru BK. Kamu pasti lebih tenang!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Butuh bantuan untuk kuatkan diri. Ikut kelompok bimbingan emosi di sekolah, buat jadwal harian sederhana, dan diskusi bareng teman. Kita dukung kamu!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang dapat konseling pribadi ya. Datang ke guru BK untuk ngobrol soal perasaan, latihan relaksasi, dan rencana positif. Kamu nggak sendiri, yuk bangkit bareng!" },
];

const PRIBADI_9: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Keren abis! Kamu sudah kuat emosi, percaya diri, dan bahagia. Tidak ada masalah yang teridentifikasi. Terus jaga, kamu siap hadapi masa depan!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir sempurna! Ada sedikit sedih atau cemas, coba jurnal harian: Tulis 3 hal baik hari ini. Pasti lebih ringan!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada tantangan seperti minder atau sulit kontrol emosi. Latihan afirmasi \"Aku kuat & berharga\", olahraga 15 menit/hari, dan cerita ke guru BK. Kamu bisa lebih percaya diri!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Butuh bantuan kelompok. Ikut sesi pengelolaan emosi sekolah, buat rutinitas positif, dan diskusi bareng teman. Kita dukung kamu bangkit!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang konseling individual segera ya. Datang ke guru BK untuk bantuan pribadi, atasi pikiran negatif, dan rencana kesehatan mental. Kamu berharga, yuk mulai sekarang!" },
];

// ====== BIDANG SOSIAL ======
const SOSIAL_7: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Keren! Kamu sudah jago bergaul, kerja sama, dan nyaman sama teman & keluarga. Tidak ada masalah yang teridentifikasi. Terus jaga persahabatanmu ya, kamu luar biasa!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir sempurna dalam bersosial! Ada sedikit hal kecil, seperti mulai obrolan lebih lancar. Coba senyum dan sapa teman dulu, pasti lebih asyik!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada beberapa tantangan bergaul atau kerja sama. Coba latihan dengar teman bicara, bilang \"maaf\" kalau salah, dan ikut kegiatan kelompok. Kamu bisa lebih dekat sama orang lain!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Kamu butuh bantuan untuk lebih nyaman sosial. Ikut kelompok bimbingan sekolah, latihan bikin teman baru, dan cerita ke guru BK kalau ada masalah bullying atau pertengkaran. Kita bantu bareng!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang saatnya dapat bantuan khusus. Datang ke guru BK untuk ngobrol pribadi soal teman, keluarga, atau rasa dikucilkan. Kamu nggak sendirian, kita dukung kamu!" },
];

const SOSIAL_8: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Hebat! Kamu sudah jago bergaul, kerja sama, dan harmonis sama teman & keluarga. Tidak ada masalah yang teridentifikasi. Terus jadi teman yang asyik ya!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir sempurna! Ada sedikit canggung atau salah paham, coba sapa teman dulu atau bilang \"maaf\" cepat. Pasti makin seru!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada tantangan seperti tersisih atau konflik teman. Latihan dengar dulu pendapat orang lain, dan cerita masalah ke guru BK. Kamu bisa punya circle teman solid!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Butuh bantuan untuk hubungan sosial. Ikut kelompok bimbingan persahabatan di sekolah, latihan kerja tim, dan diskusi keluarga. Kita bantu bangun relasi kuat!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang dapat konseling pribadi ya. Datang ke guru BK untuk ngobrol soal teman, keluarga, atau rasa tersisih. Kamu layak punya hubungan bahagia!" },
];

const SOSIAL_9: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Super! Kamu sudah mahir bergaul, kerja tim, dan punya pertemanan solid. Tidak ada masalah yang teridentifikasi. Terus jaga, kamu leader alami!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir perfect! Ada sedikit canggung atau salah paham, coba mulai obrolan dengan pertanyaan sederhana. Pasti makin nyaman!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada tantangan seperti dikucilkan atau sulit kerja kelompok. Latihan empati: \"Gimana perasaanmu?\", dan cerita ke guru BK. Kamu bisa bangun circle positif!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Butuh bantuan kelompok. Ikut workshop anti-bullying & teamwork sekolah, latihan komunikasi, dan cari teman suportif. Kita bantu perbaiki relasi!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang konseling individual segera ya. Datang ke guru BK untuk atasi kesepian/bullying, bangun kepercayaan diri, dan strategi sosial. Kamu layak bahagia bareng orang lain!" },
];

// ====== BIDANG BELAJAR ======
const BELAJAR_7: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Mantap! Kamu sudah pintar belajar, fokus, dan rajin. Tidak ada masalah yang teridentifikasi. Terus jaga jadwalmu ya, kamu juara belajar!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir sempurna! Ada sedikit hal seperti fokus lebih lama atau catat pelajaran. Coba buat jadwal harian sederhana, pasti makin mantap!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada tantangan seperti bosan atau menunda tugas. Coba belajar 20 menit dulu, istirahat 5 menit, dan tanya guru kalau bingung. Kamu bisa naik kelas pintar!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Kamu butuh bantuan untuk belajar lebih enak. Ikut kelompok belajar di sekolah, matikan HP saat belajar, dan cerita ke guru BK soal susah paham. Kita bantu bareng!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang waktunya dapat bantuan khusus. Datang ke guru BK untuk konseling belajar pribadi, buat rencana belajar bareng, dan jangan takut tanya. Kamu pasti bisa berubah!" },
];

const BELAJAR_8: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Wah, top markotop! Kamu sudah pro belajar, fokus, dan termotivasi. Tidak ada masalah yang teridentifikasi. Terus tingkatkan, prestasi menanti!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir juara! Ada sedikit bosan atau menunda, coba timer 25 menit belajar + 5 menit istirahat. Makin asyik deh!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada tantangan seperti susah konsentrasi atau cemas ujian. Buat jadwal belajar harian, tanya guru kalau bingung, dan coba app belajar seru. Kamu bisa naik level!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Butuh bantuan kelompok belajar. Ikut bimbingan sekolah, matikan gadget saat belajar, dan diskusi cara efektif sama guru BK. Kita bantu capai target nilai!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang konseling pribadi yuk. Datang ke guru BK untuk rencana belajar khusus, atasi rasa takut, dan dukungan orang tua. Perubahan dimulai sekarang!" },
];

const BELAJAR_9: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Juara! Kamu sudah disiplin, fokus, dan siap UN. Tidak ada masalah yang teridentifikasi. Terus gaspol, masa SMA menanti dengan prestasi tinggi!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir top! Atasi sedikit malas atau lupa dengan reminder HP & jadwal sederhana. Pasti makin mantap!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada tantangan seperti bosan atau cemas ujian. Buat jadwal harian, latihan soal 30 menit/hari, tanya guru langsung. Kamu bisa naik nilai drastis!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Butuh bantuan kelompok. Ikut try-out & bimbingan UN sekolah, matikan HP saat belajar, diskusi guru BK. Kita bantu capai target lulus!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang konseling individual segera ya. Datang ke guru BK untuk rencana belajar intensif, motivasi, dan dukungan orang tua. Perubahan besar dimulai hari ini!" },
];

// ====== BIDANG KARIR ======
const KARIR_7: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Super! Kamu sudah punya gambaran cita-cita dan rencana masa depan yang jelas. Tidak ada masalah yang teridentifikasi. Terus eksplorasi bakatmu ya, masa depan cerah!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir oke soal karir! Tambah info sedikit, seperti tanya orang tua soal pekerjaan mereka. Coba tulis 3 cita-cita favoritmu!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Kamu mulai bingung soal cita-cita atau bakat. Coba catat apa yang kamu suka lakukan, tonton video profesi keren, dan diskusi sama guru BK. Kamu pasti nemu jalannya!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Butuh bantuan untuk rencana karir. Ikut kelompok bimbingan karir di sekolah, coba hobi baru, dan tanya panutanmu. Kita bantu buat rencana langkah demi langkah!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang dapat bantuan khusus ya. Datang ke guru BK untuk konseling karir pribadi, tes bakat, dan bikin mimpi masa depan bareng. Kamu bisa sukses besar!" },
];

const KARIR_8: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Mantap! Kamu sudah punya rencana karir jelas dan dukungan bagus. Tidak ada masalah yang teridentifikasi. Terus eksplorasi, masa depanmu bright!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir siap! Tambah diskusi cita-cita sama orang tua, coba googling jurusan SMA/SMK. Langkah kecil bikin yakin!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada bingung soal cita-cita atau jurusan. Catat bakatmu, tonton video profesi di YouTube, dan ngobrol sama guru BK. Kamu pasti nemu passion-mu!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Butuh bantuan kelompok karir. Ikut workshop sekolah, cari info online bareng teman, dan diskusi orang tua. Kita bantu buat roadmap sukses!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang konseling pribadi yuk. Datang ke guru BK untuk tes bakat, rencana jurusan, dan atasi ragu-ragu. Kamu bisa wujudkan mimpi besar!" },
];

const KARIR_9: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Mantap! Kamu sudah jelas cita-cita, jurusan, & rencana SMA/SMK. Tidak ada masalah yang teridentifikasi. Terus persiapan UN, sukses menanti!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir siap! Tambah info sekolah favorit via PPDB online & diskusi orang tua. Pilihanmu pasti tepat!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada bingung jurusan atau takut salah pilih. Ikut tes minat bakat gratis, googling \"jurusan SMK sesuai bakat\", & konsultasi guru BK. Kamu bisa putuskan yang terbaik!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Butuh bantuan kelompok. Ikut workshop karir & try-out PPDB sekolah, diskusi orang tua, cari beasiswa. Kita bantu buat rencana masuk sekolah impian!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang konseling individual segera ya. Datang ke guru BK untuk tes bakat lengkap, motivasi, & roadmap karir pribadi. Masa depanmu cerah, yuk mulai!" },
];

// Overall recommendation (average of all fields)
const OVERALL: RecommendationEntry[] = [
  { grade: "A", label: "Baik", range: "100% TIDAK", saran: "Luar biasa! Kamu sudah dalam kondisi sangat baik di seluruh bidang. Tidak ada masalah yang teridentifikasi. Terus jaga keseimbangan dan semangat positifmu ya. Kamu contoh yang inspiratif!" },
  { grade: "B", label: "Cukup Baik", range: "90%-99% TIDAK", saran: "Kamu hampir sempurna! Ada sedikit hal yang bisa ditingkatkan. Tetap jaga kebiasaan baikmu dan jangan ragu mencari bantuan kalau butuh. Kamu luar biasa!" },
  { grade: "C", label: "Cukup", range: "75%-89% TIDAK", saran: "Ada beberapa area yang perlu perhatian. Coba fokus perbaiki sedikit demi sedikit, cerita ke guru BK, dan jaga semangat. Kamu pasti bisa lebih baik!" },
  { grade: "D", label: "Kurang", range: "50%-74% TIDAK", saran: "Kamu butuh dukungan lebih di beberapa bidang. Ikut program bimbingan sekolah, diskusi bareng guru BK dan orang tua, dan buat langkah kecil setiap hari. Kita bantu bareng!" },
  { grade: "E", label: "Kurang Sekali", range: "0%-49% TIDAK", saran: "Sekarang waktunya dapat bantuan lebih intensif. Datang ke guru BK untuk konseling menyeluruh, buat rencana perbaikan bareng, dan ingat kamu nggak sendirian. Kita dukung kamu bangkit!" },
];

// ====== Lookup Functions ======

const FIELD_RECOMMENDATIONS: Record<FieldName, Record<GradeLevel, RecommendationEntry[]>> = {
  PRIBADI: { 7: PRIBADI_7, 8: PRIBADI_8, 9: PRIBADI_9 },
  SOSIAL: { 7: SOSIAL_7, 8: SOSIAL_8, 9: SOSIAL_9 },
  BELAJAR: { 7: BELAJAR_7, 8: BELAJAR_8, 9: BELAJAR_9 },
  KARIR: { 7: KARIR_7, 8: KARIR_8, 9: KARIR_9 },
};

/**
 * Get the result grade (A-E) based on TIDAK percentage
 * Higher TIDAK% = fewer problems = better grade
 * A: 100% TIDAK (no problems)
 * B: 90-99% TIDAK
 * C: 75-89% TIDAK
 * D: 50-74% TIDAK
 * E: 0-49% TIDAK (many problems)
 */
export function getResultGrade(tidakPercentage: number): ResultGrade {
  if (tidakPercentage === 100) return "A";
  if (tidakPercentage >= 90) return "B";
  if (tidakPercentage >= 75) return "C";
  if (tidakPercentage >= 50) return "D";
  return "E";
}

/**
 * Get the grade label and color based on TIDAK percentage
 */
export function getGradeInfo(tidakPercentage: number): { grade: ResultGrade; label: string; color: string; bgColor: string } {
  const grade = getResultGrade(tidakPercentage);
  const gradeMap: Record<ResultGrade, { label: string; color: string; bgColor: string }> = {
    A: { label: "Baik", color: "text-emerald-700", bgColor: "bg-emerald-100" },
    B: { label: "Cukup Baik", color: "text-teal-700", bgColor: "bg-teal-100" },
    C: { label: "Cukup", color: "text-amber-700", bgColor: "bg-amber-100" },
    D: { label: "Kurang", color: "text-orange-700", bgColor: "bg-orange-100" },
    E: { label: "Kurang Sekali", color: "text-red-700", bgColor: "bg-red-100" },
  };
  return { grade, ...gradeMap[grade] };
}

/**
 * Get recommendation for a specific field, grade level, and TIDAK percentage
 */
export function getFieldRecommendation(
  field: FieldName,
  kelas: GradeLevel,
  tidakPercentage: number
): RecommendationEntry {
  const grade = getResultGrade(tidakPercentage);
  const entries = FIELD_RECOMMENDATIONS[field]?.[kelas] ?? OVERALL;
  return entries.find((e) => e.grade === grade) ?? OVERALL.find((e) => e.grade === grade)!;
}

/**
 * Get overall recommendation based on average TIDAK percentage
 */
export function getOverallRecommendation(tidakPercentage: number): RecommendationEntry {
  const grade = getResultGrade(tidakPercentage);
  return OVERALL.find((e) => e.grade === grade)!;
}

/**
 * Get all field recommendations for a student
 */
export function getAllFieldRecommendations(
  kelas: GradeLevel,
  fieldPercentages: Record<FieldName, number>
): Record<FieldName, RecommendationEntry & { percentage: number }> {
  const result = {} as Record<FieldName, RecommendationEntry & { percentage: number }>;
  for (const field of ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as FieldName[]) {
    const pct = fieldPercentages[field] ?? 0;
    const rec = getFieldRecommendation(field, kelas, pct);
    result[field] = { ...rec, percentage: pct };
  }
  return result;
}

/**
 * Calculate overall TIDAK percentage as average of all field TIDAK percentages
 */
export function calculateOverallPercentage(fieldPercentages: Record<FieldName, number>): number {
  const fields = ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as FieldName[];
  const total = fields.reduce((sum, f) => sum + (fieldPercentages[f] ?? 0), 0);
  return Math.round(total / fields.length);
}
