import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

const SURVEY_DATA: Record<number, Record<string, { title: string; description: string; questions: string[] }>> = {
  7: {
    PRIBADI: {
      title: "DCM Bidang Pribadi Kelas 7",
      description: "Daftar Cek Masalah Bidang Pribadi untuk siswa kelas 7. Mengenali masalah pribadi dan emosi yang mungkin kamu alami.",
      questions: [
        "Saya sering merasa sedih tanpa alasan yang jelas",
        "Saya merasa tidak percaya diri",
        "Saya sulit mengendalikan emosi saya",
        "Saya sering merasa cemas atau khawatir",
        "Saya merasa kesepian dan tidak memiliki teman dekat",
        "Saya sulit menerima kekurangan diri saya",
        "Saya sering membandingkan diri dengan orang lain",
        "Saya merasa tidak bahagia dengan kehidupan saya",
        "Saya sulit mengungkapkan perasaan kepada orang lain",
        "Saya sering merasa gelisah dan tidak tenang",
        "Saya merasa mudah marah dan tersinggung",
        "Saya sering menangis tanpa sebab yang jelas",
        "Saya merasa tidak berharga",
        "Saya sulit mengambil keputusan untuk diri sendiri",
        "Saya merasa takut gagal dalam melakukan sesuatu",
        "Saya sering merasa jenuh dan bosan",
        "Saya merasa sulit bangun di pagi hari",
        "Saya sering mengalami sakit kepala atau sakit perut tanpa sebab medis",
        "Saya merasa sulit berkonsentrasi",
        "Saya sering memiliki pikiran negatif tentang diri sendiri",
      ],
    },
    SOSIAL: {
      title: "DCM Bidang Sosial Kelas 7",
      description: "Daftar Cek Masalah Bidang Sosial untuk siswa kelas 7. Memahami hubungan sosial dan interaksi dengan teman.",
      questions: [
        "Saya sulit membuat teman baru",
        "Saya sering merasa tidak diterima oleh teman-teman",
        "Saya kesulitan berkomunikasi dengan orang lain",
        "Saya sering bertengkar dengan teman",
        "Saya merasa tidak nyaman berada di keramaian",
        "Saya sulit bekerja sama dalam kelompok",
        "Saya sering merasa tersisih di lingkungan pertemanan",
        "Saya merasa takut berbicara di depan kelas",
        "Saya sering mengalami bullying atau perundungan",
        "Saya sulit meminta bantuan kepada orang lain",
        "Saya merasa tidak mudah dipercaya oleh teman",
        "Saya sering merasa iri terhadap teman yang lebih populer",
        "Saya sulit menghargai pendapat orang lain",
        "Saya merasa sulit untuk bersikap tegas",
        "Saya sering mengikuti kehendak teman meskipun tidak setuju",
        "Saya merasa sulit menolak permintaan teman",
        "Saya sering merasa malu bertemu orang baru",
        "Saya sulit menjaga hubungan pertemanan",
        "Saya sering merasa tidak dimengerti oleh orang lain",
        "Saya merasa sulit beradaptasi di lingkungan baru",
      ],
    },
    BELAJAR: {
      title: "DCM Bidang Belajar Kelas 7",
      description: "Daftar Cek Masalah Bidang Belajar untuk siswa kelas 7. Mengatasi kesulitan belajar di jenjang SMP.",
      questions: [
        "Saya merasa kesulitan mengikuti pelajaran di kelas",
        "Saya sering tidak memahami materi yang diajarkan",
        "Saya sulit mengerjakan tugas sekolah tepat waktu",
        "Saya merasa nilai saya kurang memuaskan",
        "Saya sulit berkonsentrasi saat belajar",
        "Saya sering terlambat mengumpulkan tugas",
        "Saya merasa malas untuk belajar",
        "Saya sulit mengatur waktu belajar",
        "Saya merasa metode belajar saya kurang efektif",
        "Saya sering lupa materi yang sudah dipelajari",
        "Saya merasa kesulitan dalam mata pelajaran tertentu",
        "Saya sulit membuat catatan pelajaran yang baik",
        "Saya sering mengantuk saat belajar",
        "Saya merasa tidak termotivasi untuk belajar",
        "Saya sulit mengulang pelajaran di rumah",
        "Saya merasa takut menghadapi ujian",
        "Saya sering menunda-nunda pekerjaan rumah",
        "Saya merasa kesulitan belajar mandiri",
        "Saya sulit memahami soal-soal cerita",
        "Saya merasa belajar terlalu banyak teori dan kurang praktik",
      ],
    },
    KARIR: {
      title: "DCM Bidang Karir Kelas 7",
      description: "Daftar Cek Masalah Bidang Karir untuk siswa kelas 7. Merencanakan masa depan dan mengenal potensi diri.",
      questions: [
        "Saya belum mengetahui minat dan bakat saya",
        "Saya merasa bingung tentang cita-cita saya",
        "Saya belum mengetahui jurusan yang cocok untuk saya",
        "Saya merasa tidak yakin dengan kemampuan yang saya miliki",
        "Saya belum mengetahui jenis pekerjaan yang sesuai dengan saya",
        "Saya merasa sulit mengambil keputusan tentang masa depan",
        "Saya belum memahami potensi diri saya",
        "Saya merasa cemas memikirkan masa depan",
        "Saya belum mengetahui cara mengembangkan bakat saya",
        "Saya merasa kurang informasi tentang berbagai jenis pekerjaan",
        "Saya sulit membedakan antara hobi dan bakat",
        "Saya merasa tidak memiliki keahlian khusus",
        "Saya belum mengetahui langkah-langkah untuk mencapai cita-cita",
        "Saya merasa ragu dengan pilihan cita-cita saya",
        "Saya belum pernah berdiskusi tentang karir dengan orang dewasa",
        "Saya merasa cita-cita saya terlalu tinggi",
        "Saya belum mengetahui kelebihan dan kekurangan diri saya",
        "Saya merasa tidak ada pekerjaan yang menarik bagi saya",
        "Saya sulit menentukan prioritas antara minat dan kemampuan",
        "Saya belum memahami pentingnya perencanaan karir sejak dini",
      ],
    },
  },
  8: {
    PRIBADI: {
      title: "DCM Bidang Pribadi Kelas 8",
      description: "Daftar Cek Masalah Bidang Pribadi untuk siswa kelas 8. Mengenali masalah pribadi di masa remaja.",
      questions: [
        "Saya sering merasa mood saya berubah-ubah secara drastis",
        "Saya merasa tertekan dengan ekspektasi orang tua",
        "Saya sulit menerima perubahan fisik saya",
        "Saya merasa tidak nyaman dengan penampilan saya",
        "Saya sering merasa bersalah atas hal-hal kecil",
        "Saya sulit menghadapi tekanan dari lingkungan",
        "Saya merasa kehilangan motivasi dalam hidup",
        "Saya sering merasa lelah secara emosional",
        "Saya sulit mengelola stres",
        "Saya merasa tidak mampu mencapai target yang saya tetapkan",
        "Saya sering memikirkan masalah yang sebenarnya tidak terlalu penting",
        "Saya merasa sulit untuk bersikap positif",
        "Saya sering merasa kecewa terhadap diri sendiri",
        "Saya sulit memaafkan kesalahan yang saya buat",
        "Saya merasa tidak memiliki tujuan hidup yang jelas",
        "Saya sering merasa cemas berlebihan tentang masa depan",
        "Saya merasa sulit menyeimbangkan kegiatan dan istirahat",
        "Saya sering merasa tidak mengenali diri saya sendiri",
        "Saya sulit menghadapi kegagalan",
        "Saya merasa perubahan emosi saya mengganggu aktivitas sehari-hari",
      ],
    },
    SOSIAL: {
      title: "DCM Bidang Sosial Kelas 8",
      description: "Daftar Cek Masalah Bidang Sosial untuk siswa kelas 8. Memahami dinamika hubungan sosial di kelas 8.",
      questions: [
        "Saya merasa sulit menjaga hubungan yang sehat dengan teman",
        "Saya sering merasa salah paham dengan teman",
        "Saya merasa sulit menyelesaikan konflik dengan cara yang baik",
        "Saya merasa tertekan oleh tekanan teman sebaya (peer pressure)",
        "Saya merasa kesulitan berinteraksi dengan guru",
        "Saya sering merasa tidak diperhatikan oleh orang-orang di sekitar",
        "Saya merasa hubungan dengan keluarga semakin renggang",
        "Saya sulit menunjukkan empati kepada orang lain",
        "Saya merasa dimanfaatkan oleh teman",
        "Saya sering merasa harus mengubah diri agar diterima teman",
        "Saya merasa sulit menjaga batasan pribadi dengan teman",
        "Saya sering merasa cemburu terhadap hubungan pertemanan orang lain",
        "Saya merasa sulit berbicara jujur tanpa menyinggung",
        "Saya merasa tidak nyaman berinteraksi di media sosial",
        "Saya sering merasa dibandingkan dengan orang lain",
        "Saya merasa sulit mempertahankan prinsip di depan teman",
        "Saya merasa kesulitan membangun kepercayaan dengan orang baru",
        "Saya sering merasa tidak bisa menjadi diri sendiri di depan teman",
        "Saya merasa sulit menangani gosip atau rumor tentang saya",
        "Saya merasa kurang dukungan sosial dari lingkungan sekitar",
      ],
    },
    BELAJAR: {
      title: "DCM Bidang Belajar Kelas 8",
      description: "Daftar Cek Masalah Bidang Belajar untuk siswa kelas 8. Mengatasi tantangan akademik yang semakin kompleks.",
      questions: [
        "Saya merasa beban pelajaran di kelas 8 semakin berat",
        "Saya sulit memahami mata pelajaran yang abstrak",
        "Saya merasa nilai saya menurun dibanding kelas 7",
        "Saya sulit membagi waktu antara belajar dan kegiatan lain",
        "Saya merasa kurang persiapan menghadapi ujian",
        "Saya sering merasa jenuh dengan rutinitas belajar",
        "Saya sulit memahami pelajaran matematika",
        "Saya merasa kurang mendapat bantuan saat kesulitan belajar",
        "Saya sering merasa belajar tidak sesuai dengan cara belajar saya",
        "Saya sulit mengingat rumus-rumus yang dipelajari",
        "Saya merasa kurang aktif dalam diskusi kelas",
        "Saya sering merasa tidak siap saat ditanya guru",
        "Saya sulit mengerjakan soal-soal analisis",
        "Saya merasa lingkungan belajar saya kurang kondusif",
        "Saya sering terganggu gadget saat belajar",
        "Saya merasa kurang umpan balik dari guru tentang kemajuan saya",
        "Saya sulit memahami pelajaran bahasa asing",
        "Saya merasa tekanan nilai membuat saya stres",
        "Saya sering merasa metode mengajar guru kurang sesuai dengan saya",
        "Saya sulit memotivasi diri untuk belajar secara konsisten",
      ],
    },
    KARIR: {
      title: "DCM Bidang Karir Kelas 8",
      description: "Daftar Cek Masalah Bidang Karir untuk siswa kelas 8. Memperdalam pemahaman tentang arah karir.",
      questions: [
        "Saya merasa belum mengenal diri saya dengan baik",
        "Saya bingung memilih antara beberapa minat yang saya miliki",
        "Saya merasa tekanan dari orang tua tentang pilihan karir",
        "Saya belum mengeksplorasi berbagai bidang pekerjaan",
        "Saya merasa minat saya bertentangan dengan ekspektasi keluarga",
        "Saya sulit menemukan kegiatan yang benar-benar saya nikmati",
        "Saya merasa belum memiliki keterampilan yang relevan untuk karir",
        "Saya bingung tentang jurusan yang akan dipilih di SMA",
        "Saya merasa kurang informasi tentang prospek karir di Indonesia",
        "Saya sulit menghubungkan pelajaran sekolah dengan karir yang diinginkan",
        "Saya merasa belum siap mengambil keputusan penting tentang masa depan",
        "Saya merasa perlu bimbingan lebih dalam tentang perencanaan karir",
        "Saya bingung antara mengikuti passion atau memilih karir yang mapan",
        "Saya merasa belum mengetahui bagaimana cara mengembangkan soft skills",
        "Saya merasa cemas jika cita-cita saya tidak tercapai",
        "Saya belum mengetahui jalur pendidikan yang tepat untuk karir saya",
        "Saya merasa kurang kesempatan untuk mengembangkan bakat di sekolah",
        "Saya sulit menentukan prioritas karir jangka pendek dan panjang",
        "Saya merasa belum memiliki role model karir yang saya kagumi",
        "Saya merasa perlu lebih banyak informasi tentang dunia kerja",
      ],
    },
  },
  9: {
    PRIBADI: {
      title: "DCM Bidang Pribadi Kelas 9",
      description: "Daftar Cek Masalah Bidang Pribadi untuk siswa kelas 9. Menghadapi tantangan pribadi di masa transisi.",
      questions: [
        "Saya merasa sangat tertekan menghadapi ujian akhir",
        "Saya sering merasa cemas memikirkan kelulusan",
        "Saya merasa stres memikirkan masa depan setelah SMP",
        "Saya sulit mengelola emosi saat menghadapi tekanan",
        "Saya merasa kelelahan secara fisik dan mental",
        "Saya sering merasa tidak sanggup menghadapi tuntutan sekolah",
        "Saya merasa kesepian meskipun di tengah keramaian",
        "Saya sulit menemukan makna dan tujuan hidup saya",
        "Saya sering merasa tidak lagi mengenali diri saya sendiri",
        "Saya merasa beban tanggung jawab terlalu berat",
        "Saya sulit memisahkan masalah pribadi dengan kegiatan sekolah",
        "Saya sering merasa ingin menyerah",
        "Saya merasa sulit meminta bantuan ketika membutuhkan",
        "Saya sering merasa kecewa dengan pencapaian saya",
        "Saya merasa perubahan hormonal mengganggu keseharian saya",
        "Saya sulit menerima kritik dari orang lain",
        "Saya merasa kesulitan menjaga kesehatan mental",
        "Saya sering merasa tertekan oleh perbandingan sosial",
        "Saya merasa sulit menemukan waktu untuk diri sendiri",
        "Saya merasa perlu bantuan profesional untuk mengatasi masalah saya",
      ],
    },
    SOSIAL: {
      title: "DCM Bidang Sosial Kelas 9",
      description: "Daftar Cek Masalah Bidang Sosial untuk siswa kelas 9. Menghadapi dinamika sosial di masa transisi.",
      questions: [
        "Saya merasa akan kehilangan teman setelah lulus SMP",
        "Saya merasa sulit menjaga hubungan dengan teman yang berbeda pilihan sekolah",
        "Saya merasa tertekan oleh persaingan dengan teman sekelas",
        "Saya sulit berpisah dengan lingkungan yang sudah familiar",
        "Saya merasa cemas membina hubungan baru di lingkungan SMA",
        "Saya merasa hubungan dengan orang tua semakin rumit",
        "Saya sulit menghadapi perubahan dalam dinamika pertemanan",
        "Saya merasa tidak memiliki orang yang bisa saya percaya sepenuhnya",
        "Saya merasa sulit beradaptasi dengan perubahan sosial",
        "Saya merasa pengaruh media sosial semakin besar dalam hidup saya",
        "Saya sulit menjaga privasi di era digital",
        "Saya merasa tekanan untuk tampil sempurna di media sosial",
        "Saya merasa hubungan dengan guru semakin formal dan jauh",
        "Saya merasa sulit menangani cyberbullying",
        "Saya merasa perlu validasi dari orang lain untuk merasa berharga",
        "Saya merasa sulit menjaga hubungan yang tulus dan autentik",
        "Saya merasa kesulitan menangani perpisahan dengan orang yang dekat",
        "Saya merasa cemas tentang bagaimana orang lain menilai saya",
        "Saya merasa sulit menyeimbangkan kehidupan sosial dan akademik",
        "Saya merasa perlu belajar lebih banyak tentang komunikasi yang sehat",
      ],
    },
    BELAJAR: {
      title: "DCM Bidang Belajar Kelas 9",
      description: "Daftar Cek Masalah Bidang Belajar untuk siswa kelas 9. Menghadapi tantangan akademik tahun akhir SMP.",
      questions: [
        "Saya merasa sangat tertekan dengan ujian akhir nasional",
        "Saya merasa belum siap menghadapi ujian kelulusan",
        "Saya sulit mengulang seluruh materi dari kelas 7 sampai 9",
        "Saya merasa waktu belajar tidak cukup",
        "Saya merasa strategi belajar saya kurang efektif untuk ujian",
        "Saya sering merasa panik saat mengerjakan soal ujian",
        "Saya merasa kesulitan mengerjakan soal-soal HOTS",
        "Saya sulit memahami soal-soal yang membutuhkan analisis mendalam",
        "Saya merasa tidak percaya diri dengan kemampuan akademik saya",
        "Saya sering merasa jenuh belajar dengan materi yang sama",
        "Saya merasa perlu bimbingan belajar tambahan",
        "Saya sulit memotivasi diri di tahun terakhir SMP",
        "Saya merasa khawatir tidak lulus ujian",
        "Saya sering merasa belajar tidak memberikan hasil yang diharapkan",
        "Saya merasa kesulitan mengatur strategi belajar untuk banyak mata pelajaran",
        "Saya sulit menghadapi try out dan ujian praktik",
        "Saya merasa perbaikan nilai saya terlalu lambat",
        "Saya sering merasa tidak fokus saat belajar karena memikirkan masa depan",
        "Saya merasa perlu belajar cara menghadapi ujian dengan lebih tenang",
        "Saya merasa kesulitan belajar kelompok karena perbedaan kemampuan",
      ],
    },
    KARIR: {
      title: "DCM Bidang Karir Kelas 9",
      description: "Daftar Cek Masalah Bidang Karir untuk siswa kelas 9. Mengambil keputusan karir yang menentukan masa depan.",
      questions: [
        "Saya merasa sangat bingung memilih SMA atau SMK",
        "Saya merasa tertekan memilih jurusan di SMA",
        "Saya bingung memilih antara minat dan peluang karir",
        "Saya merasa belum siap mengambil keputusan penting tentang pendidikan",
        "Saya merasa informasi yang saya dapat tentang jurusan SMA masih kurang",
        "Saya merasa pilihan saya terbatas oleh nilai yang saya peroleh",
        "Saya bingung menentukan apakah masuk IPA, IPS, atau Bahasa",
        "Saya merasa tekanan dari keluarga tentang pilihan sekolah lanjutan",
        "Saya merasa belum memahami implikasi jangka panjang dari pilihan jurusan",
        "Saya merasa perlu tes minat bakat yang lebih mendalam",
        "Saya merasa cemas jika pilihan karir saya salah",
        "Saya merasa perlu konsultasi dengan konselor tentang perencanaan karir",
        "Saya bingung antara mengikuti minat atau peluang kerja yang lebih baik",
        "Saya merasa belum mengeksplorasi cukup banyak pilihan karir",
        "Saya merasa khawatir tentang persaingan di dunia kerja nanti",
        "Saya merasa perlu mempersiapkan portofolio atau prestasi untuk masuk SMA favorit",
        "Saya merasa kurang persiapan menghadapi tes seleksi masuk SMA",
        "Saya merasa perlu lebih memahami proses seleksi PPDB",
        "Saya merasa perlu membahas pilihan karir dengan orang yang berpengalaman",
        "Saya merasa belum memiliki rencana cadangan jika pilihan pertama gagal",
      ],
    },
  },
};

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminExists = await db.user.findUnique({ where: { email: "admin@cekdiribk.id" } });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.user.create({
      data: {
        name: "Admin CekDiriBK",
        email: "admin@cekdiribk.id",
        password: hashedPassword,
        grade: 9,
        role: "ADMIN",
      },
    });
    console.log("✅ Admin user created: admin@cekdiribk.id / admin123");
  }

  // Create demo student users
  const demoUsers = [
    { name: "Siswa Kelas 7", email: "siswa7@cekdiribk.id", grade: 7 },
    { name: "Siswa Kelas 8", email: "siswa8@cekdiribk.id", grade: 8 },
    { name: "Siswa Kelas 9", email: "siswa9@cekdiribk.id", grade: 9 },
  ];

  for (const u of demoUsers) {
    const exists = await db.user.findUnique({ where: { email: u.email } });
    if (!exists) {
      const hashedPassword = await bcrypt.hash("siswa123", 10);
      await db.user.create({
        data: { name: u.name, email: u.email, password: hashedPassword, grade: u.grade, role: "USER" },
      });
      console.log(`✅ Demo user created: ${u.email} / siswa123`);
    }
  }

  // Create surveys
  for (const [grade, fields] of Object.entries(SURVEY_DATA)) {
    for (const [field, data] of Object.entries(fields)) {
      const existing = await db.survey.findFirst({
        where: { grade: Number(grade), field },
      });
      if (!existing) {
        await db.survey.create({
          data: {
            title: data.title,
            description: data.description,
            grade: Number(grade),
            field,
            questions: {
              create: data.questions.map((text, i) => ({
                text,
                order: i + 1,
              })),
            },
          },
        });
        console.log(`✅ Survey created: ${data.title} (${data.questions.length} questions)`);
      }
    }
  }

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
