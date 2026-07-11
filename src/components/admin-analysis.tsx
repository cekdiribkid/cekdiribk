"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, AlertCircle, Filter, Download, Award, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, FIELD_CONFIG, type View, selectedAnalysisUserId, KopSurat, ProfilSiswa, handlePrintPDF, getGrade, getRecommendation, getOverallRecommendation } from "@/lib/app-shared";

export default function AdminAnalysis({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState("ALL");
  const [filterField, setFilterField] = useState("ALL");

  const fetchAnalysis = useCallback(() => {
    if (!user) return;
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
  const students = allUsers.map((u: any) => {
    const pribadiUser = fieldAnalysis.PRIBADI?.users?.find((us: any) => us.id === u.id);
    const sosialUser = fieldAnalysis.SOSIAL?.users?.find((us: any) => us.id === u.id);
    const belajarUser = fieldAnalysis.BELAJAR?.users?.find((us: any) => us.id === u.id);
    const karirUser = fieldAnalysis.KARIR?.users?.find((us: any) => us.id === u.id);
    return {
      id: u.id,
      name: u.name,
      grade: u.grade,
      whatsapp: u.whatsapp || '',
      completed: !!(pribadiUser || sosialUser || belajarUser || karirUser),
      pribadiPercentage: pribadiUser?.percentage,
      sosialPercentage: sosialUser?.percentage,
      belajarPercentage: belajarUser?.percentage,
      karirPercentage: karirUser?.percentage,
    };
  });
  const totalStudents = students.length;
  const completedStudents = students.filter((s: any) => s.completed).length;

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
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-500">Total Siswa</p><p className="text-3xl font-bold">{totalStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-500">Selesai Assessment</p><p className="text-3xl font-bold text-emerald-600">{completedStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-500">Belum Selesai</p><p className="text-3xl font-bold text-amber-600">{totalStudents - completedStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-500">Tingkat Penyelesaian</p><p className="text-3xl font-bold text-teal-600">{totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0}%</p></CardContent></Card>
      </div>

      {/* Students Table */}
      {loading ? (
        <Card><CardContent className="p-8"><div className="animate-pulse space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-200 rounded" />)}</div></CardContent></Card>
      ) : students.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><PieChartIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Belum ada data siswa</p></CardContent></Card>
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
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s: any, i: number) => (
                  <TableRow key={s.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
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
                      <Button size="sm" variant="outline" onClick={() => {
                        selectedAnalysisUserId = s.id;
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
    </div>
  );
}

// ==================== ADMIN ANALYSIS DETAIL ====================
export function AdminAnalysisDetail({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("keseluruhan");

  const fetchDetail = useCallback(() => {
    if (!user || !selectedAnalysisUserId) return;
    apiFetch(`/api/admin/analysis?userId=${selectedAnalysisUserId}`, {}, user.id, user.role, String(user.grade))
      .then(setAnalysisData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/4" /><div className="h-64 bg-gray-200 rounded" /></div></div>;
  }

  if (!analysisData) {
    return <div className="max-w-5xl mx-auto px-4 py-8 text-center"><AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Data analisa tidak ditemukan</p><Button onClick={() => onNavigate("admin-analysis")} className="mt-4 bg-teal-600">Kembali</Button></div>;
  }

  const schoolSettings = analysisData.schoolSettings || {};
  const studentProfile = analysisData.studentProfile || {};
  const fieldAnalysis = analysisData.fieldAnalysis || {};
  const recommendationMatrix = analysisData.recommendationMatrix || {};
  const responses = analysisData.responses || [];

  // Calculate overall IYA/TIDAK
  let totalIya = 0;
  let totalTidak = 0;
  Object.values(fieldAnalysis).forEach((field: any) => {
    totalIya += field.iya || 0;
    totalTidak += field.tidak || 0;
  });

  const overallPieData = [
    { name: "IYA", value: totalIya, fill: "#f43f5e" },
    { name: "TIDAK", value: totalTidak, fill: "#14b8a6" },
  ];

  const fields = ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as const;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-analysis")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Detail Analisa</h2>
          <p className="text-sm text-gray-500">{studentProfile.name} — Kelas {studentProfile.grade}</p>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => handlePrintPDF("admin-analysis-detail-content")}>
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      <div id="admin-analysis-detail-content" className="bg-white rounded-lg p-6 shadow-sm">
        {/* KOP SURAT - appears ONCE */}
        <KopSurat schoolSettings={schoolSettings} />

        {/* PROFIL SISWA */}
        <ProfilSiswa student={studentProfile} />

        {/* Title */}
        <h2 className="text-center font-bold text-base uppercase mb-4">LAPORAN HASIL ANALISA DAFTAR CEK MASALAH (DCM)</h2>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 print:hidden">
            <TabsTrigger value="keseluruhan" className="print:hidden">Keseluruhan</TabsTrigger>
            <TabsTrigger value="per-bidang" className="print:hidden">Per Bidang</TabsTrigger>
          </TabsList>

          <TabsContent value="keseluruhan" className="mt-4">
            {/* Overall Pie Chart */}
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-base">Diagram Keseluruhan</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={overallPieData} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {overallPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500" /><span className="text-sm">IYA: {totalIya}</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-500" /><span className="text-sm">TIDAK: {totalTidak}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards Per Bidang */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {fields.map((field) => {
                const cfg = FIELD_CONFIG[field];
                const fa = fieldAnalysis[field] || { iya: 0, tidak: 0, total: 0, percentage: 0 };
                const g = getGrade(fa.percentage || 0);
                return (
                  <Card key={field} className={`border-2 ${g.bgColor}`}>
                    <CardContent className="p-4 text-center">
                      <div className={`inline-flex p-2 rounded-xl mb-2 ${cfg.color} bg-white/80`}>{cfg.icon}</div>
                      <p className="text-xs text-gray-500">{cfg.label}</p>
                      <p className={`text-2xl font-bold ${g.color}`}>{fa.percentage || 0}%</p>
                      <p className="text-xs text-gray-500">IYA: {fa.iya} / {fa.total}</p>
                      <Badge className={`${g.bgColor} ${g.color} mt-1 whitespace-normal break-words leading-tight`}>Grade {g.grade} — {g.label}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Overall Recommendation with detailed saran */}
            {(() => {
              const overallPct = totalIya + totalTidak > 0 ? Math.round((totalIya / (totalIya + totalTidak)) * 100) : 0;
              const overallRec = getOverallRecommendation(overallPct, studentProfile.grade || 7);
              const og = getGrade(overallPct);
              return (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-5 w-5 text-teal-500" />
                      Rekomendasi & Saran Keseluruhan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`p-4 rounded-xl ${og.bgColor} mb-4`}>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={`${og.bgColor} ${og.color} border-0 text-base px-3 py-1 whitespace-normal break-words`}>Grade {og.grade} — {og.label}</Badge>
                        <span className={`font-semibold ${og.color}`}>{overallPct}% Masalah Keseluruhan</span>
                      </div>
                      <p className={`font-medium text-sm ${og.color}`}>Keterangan: {overallRec.keterangan}</p>
                      <div className="mt-2 p-3 bg-white/70 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">💡 Saran:</p>
                        <p className="text-sm text-gray-600 mt-1">{overallRec.saran}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Recommendation Matrix Table with detailed saran */}
            <Card>
              <CardHeader><CardTitle className="text-base">Matriks Rekomendasi Per Bidang</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bidang</TableHead>
                      <TableHead className="text-center">Persentase</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead>Saran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field) => {
                      const cfg = FIELD_CONFIG[field];
                      const fa = fieldAnalysis[field] || { percentage: 0 };
                      const g = getGrade(fa.percentage || 0);
                      const rec = getRecommendation(field, studentProfile.grade || 7, fa.percentage || 0);
                      return (
                        <TableRow key={field}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className={cfg.color}>{cfg.icon}</span>
                              {cfg.label}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{fa.percentage || 0}%</TableCell>
                          <TableCell className="text-center"><Badge className={`${g.bgColor} ${g.color}`}>{g.grade}</Badge></TableCell>
                          <TableCell className="text-sm">{rec.keterangan}</TableCell>
                          <TableCell className="text-sm max-w-[300px]">{rec.saran}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="per-bidang" className="mt-4">
            <div className="space-y-6">
              {fields.map((field) => {
                const cfg = FIELD_CONFIG[field];
                const fa = fieldAnalysis[field] || { iya: 0, tidak: 0, total: 0, percentage: 0, problems: [] };
                const g = getGrade(fa.percentage || 0);
                const fieldPieData = [
                  { name: "IYA", value: fa.iya || 0, fill: "#f43f5e" },
                  { name: "TIDAK", value: fa.tidak || 0, fill: "#14b8a6" },
                ];

                const problems: any[] = fa.problems || [];
                const problemPercentage = fa.percentage || 0;
                const rec = getRecommendation(field, studentProfile.grade || 7, problemPercentage);

                let riskLevel = "Rendah";
                let riskColor = "text-emerald-600";
                let riskBg = "bg-emerald-50";
                if (problemPercentage >= 51) { riskLevel = "Berat"; riskColor = "text-rose-600"; riskBg = "bg-rose-50"; }
                else if (problemPercentage >= 26) { riskLevel = "Signifikan"; riskColor = "text-orange-600"; riskBg = "bg-orange-50"; }
                else if (problemPercentage >= 11) { riskLevel = "Sedang"; riskColor = "text-amber-600"; riskBg = "bg-amber-50"; }
                else if (problemPercentage >= 1) { riskLevel = "Ringan"; riskColor = "text-teal-600"; riskBg = "bg-teal-50"; }

                return (
                  <Card key={field} className={`border-2 ${cfg.bgColor}`}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className={cfg.color}>{cfg.icon}</span>
                        {cfg.label}
                        <Badge className={`${g.bgColor} ${g.color} ml-2 whitespace-normal break-words`}>Grade {g.grade} — {g.label}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pie Chart */}
                        <div>
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie data={fieldPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {fieldPieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className={`text-center mt-2 p-2 rounded-lg ${g.bgColor}`}>
                            <p className={`font-semibold ${g.color}`}>{rec.keterangan}</p>
                          </div>
                        </div>

                        {/* Recommendation & Problem List */}
                        <div>
                          {/* Recommendation Saran */}
                          <div className={`p-3 rounded-lg ${g.bgColor} mb-3`}>
                            <p className={`font-medium text-sm ${g.color}`}>💡 Saran:</p>
                            <p className="text-sm text-gray-700 mt-1">{rec.saran}</p>
                          </div>

                          <h4 className="font-semibold text-sm mb-2">Masalah Teridentifikasi ({problems.length} pernyataan):</h4>
                          {problems.length > 0 ? (
                            <ScrollArea className="max-h-48">
                              <ul className="space-y-1">
                                {problems.map((p: any, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 p-1.5 bg-white/70 rounded text-sm">
                                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                                    <span>{p.text || p}</span>
                                  </li>
                                ))}
                              </ul>
                            </ScrollArea>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Tidak ada masalah teridentifikasi</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
