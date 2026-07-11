"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Award, Search, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth, apiFetch, FIELD_CONFIG, UserPhoto, type View } from "@/lib/app-shared";
import {
  calculateOverallPercentage,
  getGradeInfo,
  type FieldName,
} from "@/lib/recommendations";

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  grade: number;
  jenisKelamin?: string | null;
  whatsapp?: string | null;
  image?: string | null;
  completedFields: string[];
  fieldPercentages: Record<string, number>;
  overallPercentage: number;
  gradeLabel: string;
  gradeLetter: string;
  qualifiesForCertificate: boolean;
  allFieldsCompleted: boolean;
}

export default function CertificateList({ onNavigate, onSelectStudent }: { onNavigate: (view: View) => void; onSelectStudent?: (id: string) => void }) {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "qualified" | "not-qualified">("all");

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;

    Promise.all([
      apiFetch("/api/admin/users", {}, user.id, user.role, String(user.grade)),
      apiFetch("/api/admin/analysis", {}, user.id, user.role, String(user.grade)),
    ])
      .then(([usersData, analysisData]) => {
        const allUsers = (usersData.users || []).filter((u: any) => u.role !== "ADMIN");
        const responses = analysisData.responses || [];

        // Group responses by userId
        const responsesByUser: Record<string, any[]> = {};
        for (const r of responses) {
          if (!responsesByUser[r.userId]) responsesByUser[r.userId] = [];
          responsesByUser[r.userId].push(r);
        }

        const summaryList: StudentSummary[] = allUsers.map((u: any) => {
          const userResponses = responsesByUser[u.id] || [];
          const fields: FieldName[] = ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"];

          const completedFields: string[] = [];
          const fieldPercentages: Record<string, number> = {};

          for (const field of fields) {
            const fieldResponses = userResponses.filter((r: any) => r.survey?.field === field);
            if (fieldResponses.length === 0) continue;

            let iya = 0;
            let tidak = 0;
            for (const resp of fieldResponses) {
              for (const ans of resp.answers || []) {
                if (ans.value === "IYA") iya++;
                else tidak++;
              }
            }
            const total = iya + tidak;
            if (total > 0) {
              completedFields.push(field);
              fieldPercentages[field] = Math.round((tidak / total) * 100);
            }
          }

          const allFieldsCompleted = fields.every((f) => completedFields.includes(f));
          const overallPct = allFieldsCompleted
            ? calculateOverallPercentage(fieldPercentages as Record<FieldName, number>)
            : Object.keys(fieldPercentages).length > 0
              ? Math.round(Object.values(fieldPercentages).reduce((a, b) => a + b, 0) / Object.keys(fieldPercentages).length)
              : 0;

          const gradeInfo = getGradeInfo(overallPct);

          // Certificate criteria: completed all 4 fields AND overall grade A (100% TIDAK - Baik)
          const qualifiesForCertificate = allFieldsCompleted && overallPct === 100;

          return {
            id: u.id,
            name: u.name,
            email: u.email,
            grade: u.grade,
            jenisKelamin: u.jenisKelamin,
            whatsapp: u.whatsapp,
            image: u.image,
            completedFields,
            fieldPercentages,
            overallPercentage: overallPct,
            gradeLabel: gradeInfo.label,
            gradeLetter: gradeInfo.grade,
            qualifiesForCertificate,
            allFieldsCompleted,
          };
        });

        // Sort: qualified first, then by name
        summaryList.sort((a, b) => {
          if (a.qualifiesForCertificate && !b.qualifiesForCertificate) return -1;
          if (!a.qualifiesForCertificate && b.qualifiesForCertificate) return 1;
          return a.name.localeCompare(b.name);
        });

        setStudents(summaryList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const filteredStudents = useMemo(() => {
    let list = students;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          String(s.grade).includes(q)
      );
    }

    if (filter === "qualified") {
      list = list.filter((s) => s.qualifiesForCertificate);
    } else if (filter === "not-qualified") {
      list = list.filter((s) => !s.qualifiesForCertificate);
    }

    return list;
  }, [students, search, filter]);

  const qualifiedCount = students.filter((s) => s.qualifiesForCertificate).length;
  const completedCount = students.filter((s) => s.allFieldsCompleted).length;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            Sertifikat
          </h2>
          <p className="text-gray-500">Kelola sertifikat untuk siswa yang telah menyelesaikan assessment</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{qualifiedCount}</p>
              <p className="text-xs text-gray-500">Memenuhi Syarat</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-teal-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{completedCount}</p>
              <p className="text-xs text-gray-500">Selesai Semua Bidang</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-300">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{students.length - completedCount}</p>
              <p className="text-xs text-gray-500">Belum Selesai</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="mb-6 bg-amber-50/50 border-amber-200/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Award className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Kriteria Sertifikat</p>
            <p className="text-xs text-amber-700 mt-1">
              Sertifikat diberikan kepada siswa yang telah <strong>menyelesaikan semua bidang assessment</strong> (Pribadi, Sosial, Belajar, Karir)
              dan mencapai <strong>Grade A (100% TIDAK - Baik)</strong> secara keseluruhan, yang menunjukkan kondisi siswa dalam keadaan Baik di semua aspek.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari siswa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            Semua ({students.length})
          </Button>
          <Button
            variant={filter === "qualified" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("qualified")}
            className={filter === "qualified" ? "bg-amber-600 hover:bg-amber-700" : ""}
          >
            ✓ Memenuhi Syarat ({qualifiedCount})
          </Button>
          <Button
            variant={filter === "not-qualified" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("not-qualified")}
          >
            ✗ Belum ({students.length - qualifiedCount})
          </Button>
        </div>
      </div>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <Card className="p-12 text-center">
          <Award className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">
            {search ? "Tidak ada siswa yang sesuai pencarian" : "Belum ada data siswa"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <Card
              key={student.id}
              className={`transition-all hover:shadow-md ${
                student.qualifiesForCertificate
                  ? "border-amber-200 bg-gradient-to-r from-amber-50/30 to-white"
                  : student.allFieldsCompleted
                    ? "border-gray-200"
                    : "border-gray-100 opacity-75"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Student Photo */}
                  <UserPhoto user={student} size="lg" className="shrink-0" />
                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">{student.name}</h3>
                      {student.qualifiesForCertificate && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs shrink-0">
                          <Award className="h-3 w-3 mr-1" /> Sertifikat
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Kelas {student.grade}</span>
                      <span>{student.jenisKelamin || "-"}</span>
                      <span>{student.email}</span>
                    </div>
                  </div>

                  {/* Field Progress */}
                  <div className="flex items-center gap-2">
                    {(["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as FieldName[]).map((field) => {
                      const cfg = FIELD_CONFIG[field];
                      const pct = student.fieldPercentages[field];
                      const isCompleted = student.completedFields.includes(field);
                      return (
                        <div
                          key={field}
                          className={`text-center p-2 rounded-lg min-w-[60px] ${
                            isCompleted
                              ? pct === 100
                                ? "bg-emerald-50 border border-emerald-200"
                                : pct >= 90
                                  ? "bg-teal-50 border border-teal-200"
                                  : pct >= 75
                                    ? "bg-amber-50 border border-amber-200"
                                    : "bg-rose-50 border border-rose-200"
                              : "bg-gray-50 border border-gray-200"
                          }`}
                          title={`${cfg.label}: ${isCompleted ? pct + "%" : "Belum"}`}
                        >
                          <div className="text-xs mb-0.5">{cfg.icon}</div>
                          <p className={`text-[10px] font-bold ${
                            !isCompleted ? "text-gray-400" :
                            pct >= 90 ? "text-emerald-700" :
                            pct >= 75 ? "text-amber-700" :
                            "text-rose-700"
                          }`}>
                            {isCompleted ? `${pct}%` : "-"}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall Grade & Action */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center">
                      <Badge className={`text-sm px-3 py-1 ${
                        student.allFieldsCompleted
                          ? student.overallPercentage >= 90
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : student.overallPercentage >= 75
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-rose-100 text-rose-700 border-rose-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}>
                        {student.allFieldsCompleted ? `${student.gradeLetter} - ${student.gradeLabel}` : "Belum Selesai"}
                      </Badge>
                      {student.allFieldsCompleted && (
                        <p className="text-[10px] text-gray-500 mt-1">{student.overallPercentage}% TIDAK</p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        if (student.qualifiesForCertificate && onSelectStudent) {
                          onSelectStudent(student.id);
                          onNavigate("certificate-view" as View);
                        }
                      }}
                      className={
                        student.qualifiesForCertificate
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                      }
                      disabled={!student.qualifiesForCertificate}
                    >
                      <Award className="h-4 w-4 mr-1.5" />
                      {student.qualifiesForCertificate ? "Lihat Sertifikat" : "Belum Memenuhi"}
                    </Button>
                  </div>
                </div>

                {/* Not qualified reason */}
                {student.allFieldsCompleted && !student.qualifiesForCertificate && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                    <p className="text-xs text-amber-700">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Belum memenuhi syarat sertifikat. Keseluruhan {student.overallPercentage}% TIDAK (Grade {student.gradeLetter}).
                      Dibutuhkan pencapaian <strong>100% TIDAK (Grade A - Baik)</strong> untuk mendapat sertifikat.
                    </p>
                  </div>
                )}

                {!student.allFieldsCompleted && (
                  <div className="mt-3 p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Belum menyelesaikan semua bidang. Selesaikan: {(["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as FieldName[])
                        .filter((f) => !student.completedFields.includes(f))
                        .map((f) => FIELD_CONFIG[f].label.replace("Bidang ", ""))
                        .join(", ")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
