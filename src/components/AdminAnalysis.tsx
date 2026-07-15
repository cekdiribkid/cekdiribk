"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Filter, PieChart as PieChartIcon, Phone, Search, X, AlertCircle, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, apiFetch, FIELD_CONFIG, getGrade, CHART_COLORS, setSelectedAnalysisUserId, UserPhoto, type View } from "@/lib/app-shared";
import { calculateOverallPercentage, getGradeInfo, getFieldRecommendation, type FieldName, type GradeLevel } from "@/lib/recommendations";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, XAxis, YAxis, Bar, Legend, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

export default function AdminAnalysis({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState("ALL");
  const [filterField, setFilterField] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [topProblemsScope, setTopProblemsScope] = useState<string>("ALL"); // ALL = keseluruhan

  const fetchAnalysis = useCallback(() => {
    if (!user) return;
    // Clear filterField if it's not "ALL" and there's no specific userId
    // This prevents the API from returning no data when filtering by field on the main analysis page
    if (filterField !== "ALL" && !analysisData?.studentProfile) {
      setFilterField("ALL");
      return; // Re-fetch will happen due to filterField change
    }
    const params = new URLSearchParams();
    if (filterGrade !== "ALL") params.set("grade", filterGrade);
    if (filterField !== "ALL") params.set("field", filterField);
    apiFetch(`/api/admin/analysis?${params.toString()}`, {}, user.id, user.role, String(user.grade))
      .then(setAnalysisData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, filterGrade, filterField]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  const fieldAnalysis = analysisData?.fieldAnalysis || {};
  const allUsers = analysisData?.responses ? [...new Map((analysisData.responses as any[]).map((r: any) => [r.userId, r.user])).values()] as any[] : [];
  const allStudents = allUsers.map((u: any) => {
    const pribadiUser = fieldAnalysis.PRIBADI?.users?.find((us: any) => us.id === u.id);
    const sosialUser = fieldAnalysis.SOSIAL?.users?.find((us: any) => us.id === u.id);
    const belajarUser = fieldAnalysis.BELAJAR?.users?.find((us: any) => us.id === u.id);
    const karirUser = fieldAnalysis.KARIR?.users?.find((us: any) => us.id === u.id);
    const pribadiPercentage = pribadiUser?.percentage;
    const sosialPercentage = sosialUser?.percentage;
    const belajarPercentage = belajarUser?.percentage;
    const karirPercentage = karirUser?.percentage;
    // Calculate overall only when at least one field is completed
    const fieldPercentages: Record<FieldName, number> = {
      PRIBADI: pribadiPercentage ?? 0,
      SOSIAL: sosialPercentage ?? 0,
      BELAJAR: belajarPercentage ?? 0,
      KARIR: karirPercentage ?? 0,
    };
    const hasAnyData = pribadiPercentage !== undefined || sosialPercentage !== undefined || belajarPercentage !== undefined || karirPercentage !== undefined;
    const overallPercentage = hasAnyData ? calculateOverallPercentage(fieldPercentages) : undefined;
    const overallGradeInfo = overallPercentage !== undefined ? getGradeInfo(overallPercentage) : null;
    return {
      id: u.id,
      name: u.name,
      grade: u.grade,
      whatsapp: u.whatsapp || '',
      image: u.image || '',
      completed: !!(pribadiUser || sosialUser || belajarUser || karirUser),
      pribadiPercentage,
      sosialPercentage,
      belajarPercentage,
      karirPercentage,
      overallPercentage,
      overallGradeInfo,
    };
  });
  const isSearching = searchQuery.trim().length > 0;
  const students = allStudents.filter((s: any) => {
    if (!isSearching) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      String(s.grade).includes(q) ||
      (s.whatsapp || "").toLowerCase().includes(q)
    );
  });
  const totalStudents = allStudents.length;
  const completedStudents = allStudents.filter((s: any) => s.completed).length;

  const grades = [7, 8, 9];
  const fields = ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as const;

  const fieldChartData = fields.map(field => {
    const key = `${field.toLowerCase()}Percentage` as keyof typeof allStudents[number];
    const total = allStudents.filter(s => s[key] !== undefined && s[key] !== null).length;
    const avgPercentage = total > 0
      ? allStudents.reduce((sum, s) => sum + ((s[key] as number) ?? 0), 0) / total
      : 0;
    return {
      name: FIELD_CONFIG[field].label,
      "Rata-rata % TIDAK": parseFloat(avgPercentage.toFixed(2)),
      fill: FIELD_CONFIG[field].color.replace("text-", "#").replace("-600", ""), // Extract hex color
    };
  });

  const gradeChartData = grades.map(grade => {
    const studentsInGrade = allStudents.filter(s => s.grade === grade);
    const total = studentsInGrade.filter(s => s.overallPercentage !== undefined).length;
    const avgPercentage = total > 0
      ? studentsInGrade.reduce((sum, s) => sum + (s.overallPercentage ?? 0), 0) / total
      : 0;
    return {
      name: `Kelas ${grade}`,
      "Rata-rata % TIDAK": parseFloat(avgPercentage.toFixed(2)),
      fill: "#3b82f6", // Blue color for grades
    };
  });

  // ===== Data untuk chart-chart baru =====
  // (a) Top 5 Masalah — hitung langsung dari responses agar tidak bergantung pada fieldAnalysis/topProblems dari API
  // API fieldAnalysis.topProblems bisa ter-filter oleh filterField, jadi kita hitung di klien.
  const computeTopProblems = (fieldFilter?: string, gradeFilter?: string): { text: string; count: number }[] => {
    const filtered = (analysisData?.responses ?? []).filter((r: any) => {
      if (fieldFilter && fieldFilter !== "ALL") {
        const surveyField = r.survey?.field ?? r.survey?.survey?.field;
        if (surveyField !== fieldFilter) return false;
      }
      if (gradeFilter && gradeFilter !== "ALL") {
        if (r.user?.grade !== Number(gradeFilter)) return false;
      }
      return true;
    });
    const problemCounts = new Map<string, number>();
    for (const r of filtered) {
      for (const a of r.answers || []) {
        if (a.value === "IYA" && a.question?.text) {
          const prev = problemCounts.get(a.question.text) ?? 0;
          problemCounts.set(a.question.text, prev + 1);
        }
      }
    }
    return Array.from(problemCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([text, count]) => ({ text, count }));
  };

  const gradeFromFilter = filterGrade !== "ALL" ? filterGrade : undefined;
  const topProblemsAll = topProblemsScope === "ALL"
    ? computeTopProblems("ALL", gradeFromFilter)
    : computeTopProblems(topProblemsScope, gradeFromFilter);

  // Format untuk BarChart — konversi count -> Jumlah
  const chartTopProblems = topProblemsAll.map(p => ({ text: p.text, Jumlah: p.count }));

  // (b) Distribusi Predikat (A/B/C/D/E) dihitung dari overall siswa
  const GRADE_HEX: Record<string, string> = {
    A: "#10b981", B: "#14b8a6", C: "#f59e0b", D: "#f97316", E: "#e11d48",
  };
  const predikatCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  allStudents.forEach((s: any) => {
    if (s.overallPercentage !== undefined && s.overallGradeInfo) {
      const g = s.overallGradeInfo.grade as string;
      if (predikatCounts[g] !== undefined) predikatCounts[g] += 1;
    }
  });
  const predikatChartData = Object.keys(predikatCounts).map(grade => ({
    name: `Grade ${grade}`,
    count: predikatCounts[grade],
    fill: GRADE_HEX[grade],
  }));
  const totalPredikat = predikatChartData.reduce((sum, d) => sum + d.count, 0);

  // (c) Matriks Rekomendasi & (d) Radar — sama-sama pakai recommendationMatrix
  const recommendationMatrix = analysisData?.recommendationMatrix;
  const matrixChartData = fields.map(field => {
    const row: Record<string, number | string> = { bidang: FIELD_CONFIG[field].label };
    grades.forEach(g => {
      const cell = recommendationMatrix?.[field]?.[g];
      row[`Kelas ${g}`] = cell ? cell.percentage : 0;
    });
    return row;
  });
  const radarChartData = fields.map(field => {
    const row: Record<string, number | string> = { bidang: FIELD_CONFIG[field].label };
    grades.forEach(g => {
      const cell = recommendationMatrix?.[field]?.[g];
      row[`Kelas ${g}`] = cell ? cell.percentage : 0;
    });
    return row;
  });

  // Palet 3 kelas untuk grouped bar & radar
  const GRADE_BAR_COLORS: Record<number, string> = { 7: "#3b82f6", 8: "#a855f7", 9: "#f97316" };

  // ===== Topik Masalah Teratas (agregasi dari responses) =====
  // Hitung frekuensi tiap pertanyaan yang dijawab IYA, dikelompokkan per cakupan.
  // totalSiswaPenyumbang = jumlah siswa unik yang menjawab IYA pada pernyataan tsb.
  type TopicStat = { text: string; siswa: number; totalSiswa: number; pct: number };
  const allResponses: any[] = analysisData?.responses ?? [];
  // jumlah siswa unik yang sudah menyelesaikan assessment (penyebut persen)
  const uniqueRespondentIds = new Set(allResponses.map(r => r.userId));
  const totalRespondents = uniqueRespondentIds.size;

  const computeTopics = (responses: any[], scopeTotalSiswa: number, limit: number): TopicStat[] => {
    // map: questionText -> Set(userId) agar siswa dihitung unik
    const map = new Map<string, Set<string>>();
    for (const r of responses) {
      for (const a of r.answers || []) {
        if (a.value === "IYA" && a.question?.text) {
          if (!map.has(a.question.text)) map.set(a.question.text, new Set());
          map.get(a.question.text)!.add(r.userId);
        }
      }
    }
    return Array.from(map.entries())
      .map(([text, users]) => ({
        text,
        siswa: users.size,
        totalSiswa: scopeTotalSiswa,
        pct: scopeTotalSiswa > 0 ? Math.round((users.size / scopeTotalSiswa) * 100) : 0,
      }))
      .sort((a, b) => b.siswa - a.siswa || b.pct - a.pct)
      .slice(0, limit);
  };

  // (a) Keseluruhan — top 10
  const overallTopics = computeTopics(allResponses, totalRespondents, 10);

  // (b) Per Bidang — top 5 untuk masing-masing PRIBADI/SOSIAL/BELAJAR/KARIR
  const perFieldTopics: Record<string, TopicStat[]> = {};
  fields.forEach(field => {
    const fr = allResponses.filter(r => r.survey?.field === field);
    // siswa unik di bidang ini (yang sudah menjawab bidang tsb, sebagai penyebut)
    const fieldSiswa = new Set(fr.map(r => r.userId)).size;
    perFieldTopics[field] = computeTopics(fr, fieldSiswa, 5);
  });

  // (c) Per Kelas — top 5 untuk kelas 7/8/9
  const perGradeTopics: Record<number, TopicStat[]> = {};
  grades.forEach(g => {
    const gr = allResponses.filter(r => r.user?.grade === g);
    const gradeSiswa = new Set(gr.map(r => r.userId)).size;
    perGradeTopics[g] = computeTopics(gr, gradeSiswa, 5);
  });

  // Tingkat prioritas berdasarkan % siswa yang menjawab IYA
  const priorityInfo = (pct: number): { label: string; color: string; bar: string } => {
    if (pct >= 75) return { label: "Prioritas Tinggi", color: "text-rose-700", bar: "bg-rose-500" };
    if (pct >= 50) return { label: "Prioritas Sedang", color: "text-orange-700", bar: "bg-orange-500" };
    if (pct >= 25) return { label: "Prioritas Rendah", color: "text-amber-700", bar: "bg-amber-500" };
    return { label: "Waspada", color: "text-teal-700", bar: "bg-teal-500" };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Hasil Analisa</h2>
          <p className="text-sm text-gray-500">Analisa hasil DCM seluruh siswa</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Filter:</span>
            </div>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kelas</SelectItem>
                <SelectItem value="7">Kelas 7</SelectItem>
                <SelectItem value="8">Kelas 8</SelectItem>
                <SelectItem value="9">Kelas 9</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterField} onValueChange={setFilterField}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Bidang" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Bidang</SelectItem>
                <SelectItem value="PRIBADI">Pribadi</SelectItem>
                <SelectItem value="SOSIAL">Sosial</SelectItem>
                <SelectItem value="BELAJAR">Belajar</SelectItem>
                <SelectItem value="KARIR">Karir</SelectItem>
              </SelectContent>
            </Select>
            {/* Search box */}
            <div className="relative flex-1 min-w-[200px] max-w-md ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Cari siswa: nama, kelas, WhatsApp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
                aria-label="Pencarian siswa"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-gray-700"
                  onClick={() => setSearchQuery("")}
                  title="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {isSearching && (
            <p className="text-xs text-gray-500 mt-2">
              Menampilkan <strong className="text-teal-700">{students.length}</strong> dari <strong>{totalStudents}</strong> siswa untuk pencarian &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-500">Total Siswa</p><p className="text-3xl font-bold">{totalStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-500">Selesai Assessment</p><p className="text-3xl font-bold text-emerald-600">{completedStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-500">Belum Selesai</p><p className="text-3xl font-bold text-amber-600">{totalStudents - completedStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-500">Tingkat Penyelesaian</p><p className="text-3xl font-bold text-teal-600">{totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0}%</p></CardContent></Card>
      </div>

      {/* Tabs: Grafik / Tabel */}
      <Tabs defaultValue="grafik" className="mb-6">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="grafik">📊 Grafik</TabsTrigger>
          <TabsTrigger value="tabel">📋 Tabel Siswa</TabsTrigger>
        </TabsList>

        {/* ===================== TAB GRAFIK ===================== */}
        <TabsContent value="grafik" className="space-y-6">
          {totalStudents === 0 || loading ? (
            <Card><CardContent className="p-12 text-center">
              <PieChartIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">{loading ? "Memuat data..." : "Belum ada data siswa untuk ditampilkan"}</p>
            </CardContent></Card>
          ) : (
            <>
              {/* Baris 1: chart lama */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Rata-rata % TIDAK per Bidang</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={fieldChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Rata-rata % TIDAK" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Rata-rata % TIDAK per Kelas</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={gradeChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Rata-rata % TIDAK" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Baris 2: Top 5 Masalah + Distribusi Predikat */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <h3 className="text-lg font-semibold">Top 5 Masalah (Pertanyaan IYA)</h3>
                      <Select value={topProblemsScope} onValueChange={setTopProblemsScope}>
                        <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Keseluruhan</SelectItem>
                          <SelectItem value="PRIBADI">Bidang Pribadi</SelectItem>
                          <SelectItem value="SOSIAL">Bidang Sosial</SelectItem>
                          <SelectItem value="BELAJAR">Bidang Belajar</SelectItem>
                          <SelectItem value="KARIR">Bidang Karir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {chartTopProblems.length === 0 ? (
                      <p className="text-sm text-gray-500 py-16 text-center">Belum ada data masalah pada ruang lingkup ini.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartTopProblems} layout="vertical" margin={{ left: 30, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="text" width={220} tick={{ fontSize: 11 }} interval={0} />
                          <Tooltip />
                          <Bar dataKey="Jumlah" radius={[0, 4, 4, 0]}>
                            {chartTopProblems.map((entry: { text: string; Jumlah: number }, i: number) => (
                              <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Distribusi Predikat Siswa</h3>
                    {totalPredikat === 0 ? (
                      <p className="text-sm text-gray-500 py-16 text-center">Belum ada siswa yang menyelesaikan assessment.</p>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie data={predikatChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="count" paddingAngle={2}
                              label={({ name, percent }) => `${name} ${(percent! * 100).toFixed(0)}%`}>
                              {predikatChartData.map((entry, i) => (
                                <Cell key={`cell-${i}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                          {predikatChartData.map(d => (
                            <div key={d.name} className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: d.fill }} />
                              <span className="text-xs font-medium">{d.name}: {d.count}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Baris 3: Matriks Rekomendasi (grouped bar, full width) */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-1">Matriks Rekomendasi per Bidang × Kelas</h3>
                  <p className="text-xs text-gray-500 mb-4">Persentase TIDAK (%) — makin tinggi makin baik (masalah makin sedikit).</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={matrixChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bidang" />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip />
                      <Legend />
                      {grades.map(g => (
                        <Bar key={g} dataKey={`Kelas ${g}`} fill={GRADE_BAR_COLORS[g]} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Baris 4: Radar Profil Rata-rata (full width) */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-1">Radar Profil Rata-rata per Kelas</h3>
                  <p className="text-xs text-gray-500 mb-4">Bentuk profil masalah siswa per bidang untuk tiap kelas (semakin ke pusat = makin banyak masalah).</p>
                  <ResponsiveContainer width="100%" height={340}>
                    <RadarChart data={radarChartData} outerRadius={110}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="bidang" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 100]} angle={90} tick={{ fontSize: 10 }} />
                      {grades.map(g => (
                        <Radar key={g} name={`Kelas ${g}`} dataKey={`Kelas ${g}`} stroke={GRADE_BAR_COLORS[g]} fill={GRADE_BAR_COLORS[g]} fillOpacity={0.18} />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Baris 5: Rekomendasi per Bidang × Kelas (full width) */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <h3 className="text-lg font-semibold">Rekomendasi &amp; Keterangan per Bidang × Kelas</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Persentase TIDAK (%) dihitung dari gabungan seluruh siswa pada kombinasi Bidang &amp; Kelas. Makin tinggi makin baik (masalah makin sedikit).
                  </p>
                  {fields.map((field) => {
                    const cfg = FIELD_CONFIG[field];
                    return (
                      <div key={field} className="mb-5 last:mb-0">
                        <div className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-lg ${cfg.bgColor}`}>
                          <span className={cfg.color}>{cfg.icon}</span>
                          <span className="font-semibold text-sm">{cfg.label}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {grades.map(g => {
                            const cell = recommendationMatrix?.[field]?.[g];
                            const pct = cell ? cell.percentage : 0;
                            const hasData = cell && cell.total > 0;
                            const rec = getFieldRecommendation(field, g as GradeLevel, pct);
                            const gInfo = getGradeInfo(pct);
                            return (
                              <div key={g} className={`p-3 rounded-lg border ${hasData ? gInfo.bgColor : "bg-gray-50 border-gray-200"}`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-xs font-bold text-gray-700">Kelas {g}</span>
                                  <Badge className={`${gInfo.bgColor} ${gInfo.color} text-[10px] ml-auto px-1.5 py-0`}>
                                    {rec.grade} ({rec.label})
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mb-1 text-[11px] text-gray-600">
                                  <span>% TIDAK: <strong>{hasData ? pct : "—"}{hasData ? "%" : ""}</strong></span>
                                  <span>•</span>
                                  <span>{rec.range}</span>
                                </div>
                                <p className="text-[11px] text-gray-600 mb-1"><span className="font-medium">Keterangan:</span> {hasData ? rec.keterangan : "Belum ada data"}</p>
                                <p className="text-xs leading-snug">{hasData ? rec.saran : "—"}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Baris 6: Topik Masalah Teratas (full width) — Keseluruhan, Per Bidang, Per Kelas */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="h-5 w-5 text-rose-500" />
                    <h3 className="text-lg font-semibold">Topik Masalah Teratas</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Pernyataan yang paling banyak dijawab <strong>IYA</strong> oleh siswa (diurutkan dari tertinggi).
                    <strong> % IYA</strong> = proporsi siswa yang mengalami masalah tsb pada cakupan tersebut.
                  </p>

                  {/* (a) Keseluruhan */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="inline-block w-1.5 h-4 bg-rose-500 rounded" />
                      Keseluruhan (Top 10)
                      <span className="text-xs font-normal text-gray-500">— dari {totalRespondents} siswa</span>
                    </h4>
                    {overallTopics.length === 0 ? (
                      <p className="text-sm text-gray-500 italic py-4">Belum ada data masalah.</p>
                    ) : (
                      <div className="space-y-2">
                        {overallTopics.map((t, i) => {
                          const p = priorityInfo(t.pct);
                          return (
                            <div key={`o-${i}`} className="p-3 rounded-lg border bg-white">
                              <div className="flex items-start gap-2 mb-1.5">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                <span className="flex-1 text-sm">{t.text}</span>
                                <Badge variant="outline" className={`text-[10px] ${p.color} border-current flex-shrink-0`}>{p.label}</Badge>
                              </div>
                              <div className="flex items-center gap-3 ml-8">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${p.bar}`} style={{ width: `${t.pct}%` }} />
                                </div>
                                <span className="text-xs font-semibold whitespace-nowrap">{t.siswa} dari {t.totalSiswa} siswa ({t.pct}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* (b) Per Bidang */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="inline-block w-1.5 h-4 bg-violet-500 rounded" />
                      Per Bidang (Top 5)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fields.map(field => {
                        const cfg = FIELD_CONFIG[field];
                        const topics = perFieldTopics[field] || [];
                        return (
                          <div key={field} className={`p-3 rounded-lg border ${cfg.bgColor}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={cfg.color}>{cfg.icon}</span>
                              <span className="font-semibold text-sm">{cfg.label}</span>
                            </div>
                            {topics.length === 0 ? (
                              <p className="text-xs text-gray-500 italic">Belum ada data.</p>
                            ) : (
                              <ol className="space-y-1.5">
                                {topics.map((t, i) => {
                                  const p = priorityInfo(t.pct);
                                  return (
                                    <li key={`f-${field}-${i}`} className="text-xs">
                                      <div className="flex items-start gap-1.5 mb-0.5">
                                        <span className="flex-shrink-0 text-gray-400 font-bold">{i + 1}.</span>
                                        <span className="flex-1">{t.text}</span>
                                        <span className={`font-semibold flex-shrink-0 ${p.color}`}>{t.pct}%</span>
                                      </div>
                                      <div className="ml-4 h-1.5 bg-white/60 rounded-full overflow-hidden">
                                        <div className={`h-full ${p.bar}`} style={{ width: `${t.pct}%` }} />
                                      </div>
                                      <p className="text-[10px] text-gray-500 ml-4 mt-0.5">{t.siswa} dari {t.totalSiswa} siswa</p>
                                    </li>
                                  );
                                })}
                              </ol>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* (c) Per Kelas */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="inline-block w-1.5 h-4 bg-blue-500 rounded" />
                      Per Kelas (Top 5)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {grades.map(g => {
                        const topics = perGradeTopics[g] || [];
                        return (
                          <div key={g} className="p-3 rounded-lg border bg-blue-50/40 border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-blue-700">Kelas {g}</span>
                              <span className="text-[10px] text-blue-600 ml-auto">{topics[0]?.totalSiswa ?? 0} siswa</span>
                            </div>
                            {topics.length === 0 ? (
                              <p className="text-xs text-gray-500 italic">Belum ada data.</p>
                            ) : (
                              <ol className="space-y-1.5">
                                {topics.map((t, i) => {
                                  const p = priorityInfo(t.pct);
                                  return (
                                    <li key={`g-${g}-${i}`} className="text-xs">
                                      <div className="flex items-start gap-1.5 mb-0.5">
                                        <span className="flex-shrink-0 text-gray-400 font-bold">{i + 1}.</span>
                                        <span className="flex-1">{t.text}</span>
                                        <span className={`font-semibold flex-shrink-0 ${p.color}`}>{t.pct}%</span>
                                      </div>
                                      <div className="ml-4 h-1.5 bg-white/60 rounded-full overflow-hidden">
                                        <div className={`h-full ${p.bar}`} style={{ width: `${t.pct}%` }} />
                                      </div>
                                    </li>
                                  );
                                })}
                              </ol>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Keterangan prioritas */}
                  <div className="mt-5 pt-4 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600">
                    <span className="font-semibold">Keterangan prioritas:</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />Tinggi (≥75%)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" />Sedang (50-74%)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Rendah (25-49%)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" />Waspada (&lt;25%)</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ===================== TAB TABEL ===================== */}
        <TabsContent value="tabel">
          {/* Students Table */}
          {loading ? (
            <Card><CardContent className="p-8"><div className="animate-pulse space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-200 rounded" />)}</div></CardContent></Card>
          ) : students.length === 0 ? (
            <Card><CardContent className="p-12 text-center">
              <PieChartIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">
                {isSearching ? (
                  <>Tidak ada siswa yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;</>
                ) : (
                  <>Belum ada data siswa</>
                )}
              </p>
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>No. WhatsApp</TableHead>
                      <TableHead className="text-center">Pribadi</TableHead>
                      <TableHead className="text-center">Sosial</TableHead>
                      <TableHead className="text-center">Belajar</TableHead>
                      <TableHead className="text-center">Karir</TableHead>
                      <TableHead className="text-center">Rata-rata (%TIDAK)</TableHead>
                      <TableHead className="text-center">Rekomendasi</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s: any, i: number) => (
                      <TableRow key={s.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserPhoto user={s} size="sm" />
                            <span className="font-medium">{s.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">Kelas {s.grade}</Badge></TableCell>
                        <TableCell>
                          {s.whatsapp ? (
                            <a
                              href={`https://wa.me/${s.whatsapp.replace(/^0/, '62')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline text-xs font-medium"
                            >
                              <Phone className="h-3 w-3" />
                              {s.whatsapp}
                            </a>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.pribadiPercentage !== undefined ? (
                            <Badge className={getGrade(s.pribadiPercentage).bgColor + " " + getGrade(s.pribadiPercentage).color}>
                              {s.pribadiPercentage}%
                            </Badge>
                          ) : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.sosialPercentage !== undefined ? (
                            <Badge className={getGrade(s.sosialPercentage).bgColor + " " + getGrade(s.sosialPercentage).color}>
                              {s.sosialPercentage}%
                            </Badge>
                          ) : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.belajarPercentage !== undefined ? (
                            <Badge className={getGrade(s.belajarPercentage).bgColor + " " + getGrade(s.belajarPercentage).color}>
                              {s.belajarPercentage}%
                            </Badge>
                          ) : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.karirPercentage !== undefined ? (
                            <Badge className={getGrade(s.karirPercentage).bgColor + " " + getGrade(s.karirPercentage).color}>
                              {s.karirPercentage}%
                            </Badge>
                          ) : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.overallPercentage !== undefined ? (
                            <span className="font-semibold text-sm">{s.overallPercentage}%</span>
                          ) : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.overallGradeInfo ? (
                            <Badge className={`${s.overallGradeInfo.bgColor} ${s.overallGradeInfo.color} whitespace-normal break-words leading-tight`}>
                              {s.overallGradeInfo.grade} — {s.overallGradeInfo.label}
                            </Badge>
                          ) : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedAnalysisUserId(s.id);
                            onNavigate("admin-analysis-detail");
                          }}>
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
