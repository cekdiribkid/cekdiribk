"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Award, Printer, Download, X, Star, CheckCircle2, Shield, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth, apiFetch, FIELD_CONFIG, type View, type ResponseData, handlePrintPDF, detectGender } from "@/lib/app-shared";
import {
  getGradeInfo,
  calculateOverallPercentage,
  type FieldName,
} from "@/lib/recommendations";

interface CertificateProps {
  onNavigate: (view: View) => void;
  studentId?: string;
}

export default function Certificate({ onNavigate, studentId }: CertificateProps) {
  const { user } = useAuth();
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<Record<string, string>>({});
  const [studentProfile, setStudentProfile] = useState<{ name: string; grade: number; jenisKelamin?: string | null; email: string; whatsapp?: string | null; createdAt?: string; image?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // Pre-print signature form state
  const [signatureForm, setSignatureForm] = useState({
    schoolPrincipal: "",
    schoolPrincipalNip: "",
    bkCoordinator: "",
    bkCoordinatorNip: "",
  });
  const [showSignatureForm, setShowSignatureForm] = useState(false);

  // Certificate is admin-only
  const isAdmin = user?.role === "ADMIN";

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      onNavigate("dashboard");
    }
  }, [user, isAdmin, onNavigate]);

  useEffect(() => {
    if (!user || !isAdmin || !studentId) return;

    Promise.all([
      apiFetch(`/api/admin/analysis?userId=${studentId}`, {}, user.id, user.role, String(user.grade)),
      apiFetch("/api/admin/users", {}, user.id, user.role, String(user.grade)),
      apiFetch("/api/admin/settings", {}, user.id, user.role, String(user.grade)),
    ])
      .then(([analysisData, usersData, settingsData]) => {
        setSchoolSettings(analysisData.schoolSettings || {});

        // Merge settings from admin/settings API (more complete)
        const adminSettings = settingsData.settings || {};
        setSchoolSettings(prev => ({ ...prev, ...adminSettings }));

        // Initialize signature form from settings
        setSignatureForm({
          schoolPrincipal: adminSettings.schoolPrincipal || "",
          schoolPrincipalNip: adminSettings.schoolPrincipalNip || "",
          bkCoordinator: adminSettings.bkCoordinator || "",
          bkCoordinatorNip: adminSettings.bkCoordinatorNip || "",
        });

        // Find student profile
        const allUsers = usersData.users || [];
        const student = allUsers.find((u: any) => u.id === studentId);
        if (student) {
          setStudentProfile({
            name: student.name,
            grade: student.grade,
            jenisKelamin: student.jenisKelamin,
            email: student.email,
            whatsapp: student.whatsapp,
            createdAt: student.createdAt,
            image: student.image,
          });
        }

        // Convert analysis data to responses
        // The analysis API already filters for completed: true, but r.completed
        // may be undefined in older API versions. Treat undefined as completed.
        const resps = (analysisData.responses || []).filter((r: ResponseData) => r.completed !== false);
        setResponses(resps);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, studentId, isAdmin]);

  // Calculate per-field percentages
  const fieldAnalysis = useMemo(() => {
    const fields: FieldName[] = ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"];
    const result: Record<string, { iya: number; tidak: number; total: number; percentage: number }> = {};

    for (const field of fields) {
      const fieldResponses = responses.filter((r) => r.survey.field === field);
      if (fieldResponses.length === 0) continue;

      let iya = 0;
      let tidak = 0;
      for (const resp of fieldResponses) {
        for (const ans of resp.answers) {
          if (ans.value === "IYA") iya++;
          else tidak++;
        }
      }
      const total = iya + tidak;
      const percentage = total > 0 ? Math.round((tidak / total) * 100) : 0;
      result[field] = { iya, tidak, total, percentage };
    }

    return result;
  }, [responses]);

  const overallData = useMemo(() => {
    const fieldPercentages: Record<FieldName, number> = {} as Record<FieldName, number>;
    for (const [field, data] of Object.entries(fieldAnalysis)) {
      fieldPercentages[field as FieldName] = data.percentage;
    }
    if (Object.keys(fieldPercentages).length === 0) return null;
    const overallPct = calculateOverallPercentage(fieldPercentages);
    return { percentage: overallPct, gradeInfo: getGradeInfo(overallPct) };
  }, [fieldAnalysis]);

  // Check if student qualifies for certificate: completed all 4 fields AND overall 100% TIDAK (Grade A - Baik)
  const allFieldsCompleted = ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"].every((f) => fieldAnalysis[f]);
  const qualifiesForCertificate = allFieldsCompleted && (overallData?.percentage ?? 0) === 100;
  const overallGradeInfo = overallData ? getGradeInfo(overallData.percentage) : null;

  // Format date in Indonesian from registration date
  const regDate = studentProfile?.createdAt ? new Date(studentProfile.createdAt) : new Date();
  const hariNama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][regDate.getDay()];
  const tanggal = regDate.getDate();
  const bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][regDate.getMonth()];
  const tahun = regDate.getFullYear();
  const tanggalLengkap = `${hariNama}, ${tanggal} ${bulanNama} ${tahun}`;

  // Handle print with signature check
  const handlePrint = () => {
    handlePrintPDF("certificate-content");
  };

  // Merged settings for display (signature form values override schoolSettings)
  const displaySettings = {
    ...schoolSettings,
    schoolPrincipal: signatureForm.schoolPrincipal,
    schoolPrincipalNip: signatureForm.schoolPrincipalNip,
    bkCoordinator: signatureForm.bkCoordinator,
    bkCoordinatorNip: signatureForm.bkCoordinatorNip,
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!qualifiesForCertificate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-certificate")}>
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Sertifikat</h2>
            <p className="text-gray-500">{studentProfile?.name || "Siswa"} — Belum memenuhi syarat</p>
          </div>
        </div>
        <Card className="p-8 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">Belum Memenuhi Syarat Sertifikat</h3>
          <p className="text-gray-500 mb-4">
            Sertifikat diberikan kepada siswa yang telah <strong>menyelesaikan semua bidang assessment</strong> dan mencapai
            pencapaian <strong>100% TIDAK (Grade A - Baik)</strong> secara keseluruhan.
          </p>
          {!allFieldsCompleted && (
            <p className="text-sm text-amber-600 mb-2">
              Siswa belum menyelesaikan semua bidang assessment. Selesaikan Pribadi, Sosial, Belajar, dan Karir terlebih dahulu.
            </p>
          )}
          {allFieldsCompleted && !qualifiesForCertificate && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-1">Pencapaian keseluruhan: <strong>{overallData?.percentage}% TIDAK</strong> (Grade {overallGradeInfo?.grade})</p>
              <p className="text-sm text-amber-600 mb-3">Dibutuhkan pencapaian 100% TIDAK (Grade A - Baik) untuk mendapat sertifikat.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
                {(["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as FieldName[]).map((field) => {
                  const cfg = FIELD_CONFIG[field];
                  const data = fieldAnalysis[field];
                  const pct = data?.percentage ?? 0;
                  return (
                    <div key={field} className="text-center p-3 rounded-lg bg-gray-50 border">
                      <div className="text-2xl mb-1">{cfg.icon}</div>
                      <p className="text-xs font-medium text-gray-600">{cfg.label.replace("Bidang ", "")}</p>
                      <p className={`text-lg font-bold ${pct >= 90 ? "text-emerald-600" : pct >= 75 ? "text-amber-600" : "text-rose-600"}`}>
                        {pct}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <Button onClick={() => onNavigate("admin-certificate")} className="mt-6 bg-teal-600 hover:bg-teal-700">
            Kembali ke Daftar Sertifikat
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header buttons */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-certificate")}>
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6 text-amber-500" />
              Sertifikat
            </h2>
            <p className="text-gray-500">{studentProfile?.name || "Siswa"} — Memenuhi syarat sertifikat</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSignatureForm(true)}
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <PenLine className="h-4 w-4 mr-2" /> Isi Penandatangan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="border-teal-200 text-teal-700 hover:bg-teal-50"
          >
            <Printer className="h-4 w-4 mr-2" /> Cetak
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Download className="h-4 w-4 mr-2" /> Save PDF
          </Button>
        </div>
      </div>

      {/* Pre-Print Signature Form Dialog */}
      {showSignatureForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PenLine className="h-5 w-5 text-amber-600" />
                Isi Penandatangan Sertifikat
              </CardTitle>
              <p className="text-sm text-gray-500">
                Lengkapi nama dan NIP penandatangan sebelum mencetak sertifikat. Data ini akan tersimpan di pengaturan sekolah.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Kepala Sekolah */}
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-xs">KS</div>
                  <h4 className="font-semibold text-sm text-blue-800">Kepala Sekolah</h4>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Nama Kepala Sekolah</Label>
                    <Input
                      value={signatureForm.schoolPrincipal}
                      onChange={(e) => setSignatureForm({ ...signatureForm, schoolPrincipal: e.target.value })}
                      placeholder="Dr. Hj. Siti Nurhaliza, M.Pd."
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">NIP</Label>
                    <Input
                      value={signatureForm.schoolPrincipalNip}
                      onChange={(e) => setSignatureForm({ ...signatureForm, schoolPrincipalNip: e.target.value })}
                      placeholder="196805121990032001"
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Konselor Pendidikan */}
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 font-bold text-xs">KP</div>
                  <h4 className="font-semibold text-sm text-emerald-800">Konselor Pendidikan</h4>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Nama Konselor Pendidikan</Label>
                    <Input
                      value={signatureForm.bkCoordinator}
                      onChange={(e) => setSignatureForm({ ...signatureForm, bkCoordinator: e.target.value })}
                      placeholder="Ahmad Fauzi, S.Pd., M.Pd."
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">NIP</Label>
                    <Input
                      value={signatureForm.bkCoordinatorNip}
                      onChange={(e) => setSignatureForm({ ...signatureForm, bkCoordinatorNip: e.target.value })}
                      placeholder="198207152006041002"
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Info about missing data */}
              {(!signatureForm.schoolPrincipal || !signatureForm.bkCoordinator) && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-700">
                    ⚠️ Nama penandatangan belum diisi. Sertifikat akan menampilkan titik-titik jika kosong.
                  </p>
                </div>
              )}
            </CardContent>
            <div className="px-6 pb-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSignatureForm(false)}
              >
                Batal
              </Button>
              <Button
                onClick={async () => {
                  // Save to settings
                  if (user) {
                    try {
                      await apiFetch("/api/admin/settings", {
                        method: "PUT",
                        body: JSON.stringify({
                          schoolPrincipal: signatureForm.schoolPrincipal,
                          schoolPrincipalNip: signatureForm.schoolPrincipalNip,
                          bkCoordinator: signatureForm.bkCoordinator,
                          bkCoordinatorNip: signatureForm.bkCoordinatorNip,
                        }),
                      }, user.id, user.role, String(user.grade));
                    } catch {
                      // Silently fail - still allow printing
                    }
                  }
                  setShowSignatureForm(false);
                }}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Simpan & Tutup
              </Button>
              <Button
                onClick={() => {
                  setShowSignatureForm(false);
                  setTimeout(() => handlePrint(), 300);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Printer className="h-4 w-4 mr-2" /> Simpan & Cetak
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Certificate */}
      <div id="certificate-content" ref={printRef}>
        <div className="relative border-[5px] border-double border-amber-600 p-[2px]">
          <div className="relative border-[2px] border-amber-500/50 px-3 py-2 sm:px-5 sm:py-3 bg-gradient-to-br from-amber-50/50 via-white to-emerald-50/50">

            {/* Decorative corner elements */}
            <div className="absolute top-1.5 left-1.5 w-6 h-6 border-t-2 border-l-2 border-amber-500/60" />
            <div className="absolute top-1.5 right-1.5 w-6 h-6 border-t-2 border-r-2 border-amber-500/60" />
            <div className="absolute bottom-1.5 left-1.5 w-6 h-6 border-b-2 border-l-2 border-amber-500/60" />
            <div className="absolute bottom-1.5 right-1.5 w-6 h-6 border-b-2 border-r-2 border-amber-500/60" />

            {/* School Header */}
            <div className="mb-1.5 relative">
              <div className="flex items-center">
                {/* Logo on the left */}
                <div className="shrink-0">
                  {displaySettings.schoolLogo ? (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                      <img
                        src={displaySettings.schoolLogo}
                        alt="Logo Sekolah"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                      BK
                    </div>
                  )}
                </div>
                {/* School info centered in the remaining space */}
                <div className="flex-1 text-center pr-14 sm:pr-16">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-gray-700">
                    {displaySettings.schoolName || "SMP Negeri 1 Contoh"}
                  </h2>
                  {(displaySettings.schoolAddress || displaySettings.schoolPhone) && (
                    <p className="text-[8px] sm:text-[10px] text-gray-500">
                      {displaySettings.schoolAddress}
                      {displaySettings.schoolPhone && ` | Telp: ${displaySettings.schoolPhone}`}
                    </p>
                  )}
                  {displaySettings.schoolNpsn && (
                    <p className="text-[8px] sm:text-[10px] text-gray-500">NPSN: {displaySettings.schoolNpsn}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent mb-1.5" />

            {/* Certificate Title */}
            <div className="text-center mb-2">
              <p className="text-[8px] sm:text-[10px] font-medium text-gray-500 uppercase tracking-widest">Nomor: {displaySettings.academicYear || "2024/2025"}/CERT/{String(tahun).slice(2)}-{String(studentProfile?.name?.substring(0, 3)).toUpperCase()}{regDate.getMonth() + 1}{regDate.getDate()}</p>
              <h1 className="text-lg sm:text-2xl font-extrabold text-amber-700 uppercase tracking-wider">
                Sertifikat
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-emerald-700 uppercase tracking-wide">
                Penghargaan
              </p>
              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                <Star className="h-2 w-2 sm:h-3 sm:w-3 text-amber-500" />
                <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />
                <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500" />
                <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />
                <Star className="h-2 w-2 sm:h-3 sm:w-3 text-amber-500" />
              </div>
            </div>

            {/* Recipient */}
            <div className="text-center mb-2">
              <p className="text-[9px] sm:text-xs text-gray-600">Diberikan kepada:</p>
              {/* Student photo (fallback: gender cartoon, then school logo) */}
              {(() => {
                const g = detectGender(studentProfile?.jenisKelamin);
                const photoSrc = studentProfile?.image
                  || (g === "L" ? "/avatars/boy.png" : g === "P" ? "/avatars/girl.png" : "")
                  || displaySettings.schoolLogo
                  || "";
                if (!photoSrc) return null;
                return (
                  <div className="flex justify-center mb-1.5">
                    <img
                      src={photoSrc}
                      alt={`Foto ${studentProfile?.name || 'Siswa'}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-full border-2 border-amber-400 shadow-sm"
                    />
                  </div>
                );
              })()}
              <h2 className="text-base sm:text-xl font-bold text-gray-800 border-b-2 border-amber-400 inline-block pb-0.5 px-3">
                {studentProfile?.name || "Siswa"}
              </h2>
              <p className="text-[9px] sm:text-xs text-gray-600 mt-0.5">
                Kelas {studentProfile?.grade || "-"} | {studentProfile?.jenisKelamin || "-"} | {displaySettings.academicYear || "2024/2025"}
              </p>
            </div>

            {/* Achievement Description */}
            <div className="text-center mb-2">
              <p className="text-[9px] sm:text-xs text-gray-700 leading-relaxed max-w-xl mx-auto">
                Atas pencapaian <strong className="text-emerald-700">{overallData?.percentage}% TIDAK</strong> pada
                seluruh bidang assessment <strong>Daftar Cek Masalah (DCM)</strong> Bimbingan Konseling,
                yang menunjukkan kondisi siswa dalam keadaan <strong className="text-emerald-700">{overallGradeInfo?.label || "Baik"}</strong> di semua aspek.
              </p>
            </div>

            {/* Achievement Table */}
            <div className="mb-2">
              <table className="w-full max-w-xs mx-auto border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
                    <th className="border border-teal-600 px-2 py-0.5 text-[9px] sm:text-xs font-semibold text-left">Bidang</th>
                    <th className="border border-teal-600 px-2 py-0.5 text-[9px] sm:text-xs font-semibold text-center">Pencapaian</th>
                    <th className="border border-teal-600 px-2 py-0.5 text-[9px] sm:text-xs font-semibold text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {(["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as FieldName[]).map((field, idx) => {
                    const cfg = FIELD_CONFIG[field];
                    const data = fieldAnalysis[field];
                    const pct = data?.percentage ?? 0;
                    const fGrade = data ? getGradeInfo(data.percentage) : null;
                    return (
                      <tr key={field} className={idx % 2 === 0 ? "bg-emerald-50/50" : "bg-white"}>
                        <td className="border border-gray-200 px-2 py-0.5 text-[9px] sm:text-xs font-medium text-gray-700">
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[10px]">{cfg.icon}</span>
                            {cfg.label.replace("Bidang ", "")}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-2 py-0.5 text-center">
                          <span className="text-[9px] sm:text-xs font-bold text-emerald-600">{pct}% TIDAK</span>
                        </td>
                        <td className="border border-gray-200 px-2 py-0.5 text-center">
                          <span className={`inline-flex items-center gap-0.5 text-[8px] sm:text-[10px] font-bold px-1.5 py-0 rounded-full ${
                            fGrade?.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                            fGrade?.grade === 'B' ? 'bg-teal-100 text-teal-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            <CheckCircle2 className="h-2 w-2" /> {fGrade?.grade || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gradient-to-r from-amber-50 to-amber-100/80 font-semibold">
                    <td className="border border-gray-200 px-2 py-0.5 text-[9px] sm:text-xs text-gray-800">Keseluruhan</td>
                    <td className="border border-gray-200 px-2 py-0.5 text-center">
                      <span className="text-[9px] sm:text-xs font-bold text-amber-700">{overallData?.percentage || 0}% TIDAK</span>
                    </td>
                    <td className="border border-gray-200 px-2 py-0.5 text-center">
                      <span className="inline-flex items-center gap-0.5 bg-amber-200 text-amber-800 text-[8px] sm:text-[10px] font-bold px-1.5 py-0 rounded-full">
                        <Award className="h-2 w-2" /> {overallGradeInfo?.grade || '-'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Date & Signatures */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-1 sm:gap-3 mt-1.5">
              {/* Date */}
              <div className="text-center sm:text-left">
                <p className="text-[9px] sm:text-xs text-gray-600">Diberikan di: {displaySettings.schoolAddress?.split(",")[0] || "Kota"}</p>
                <p className="text-[9px] sm:text-xs text-gray-600">Pada tanggal: {tanggalLengkap}</p>
              </div>

              {/* Signatures */}
              <div className="flex gap-6 sm:gap-8">
                <div className="text-center">
                  <p className="text-[8px] sm:text-[10px] text-gray-500">Kepala Sekolah</p>
                  <div className="w-20 sm:w-24 h-8 border-b border-dashed border-gray-400" />
                  <p className="text-[9px] sm:text-xs font-semibold text-gray-800">{displaySettings.schoolPrincipal || "..........................."}</p>
                  <p className="text-[7px] sm:text-[9px] text-gray-500">NIP. {displaySettings.schoolPrincipalNip || "..........................."}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] sm:text-[10px] text-gray-500">Konselor Pendidikan</p>
                  <div className="w-20 sm:w-24 h-8 border-b border-dashed border-gray-400" />
                  <p className="text-[9px] sm:text-xs font-semibold text-gray-800">{displaySettings.bkCoordinator || "..........................."}</p>
                  <p className="text-[7px] sm:text-[9px] text-gray-500">NIP. {displaySettings.bkCoordinatorNip || "..........................."}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-1.5 text-center">
              <p className="text-[7px] sm:text-[9px] text-gray-400 italic">
                Sertifikat ini diterbitkan secara otomatis oleh Sistem DCM Bimbingan Konseling — CekDiriBK.id
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
