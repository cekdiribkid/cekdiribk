"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Download, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth, apiFetch, FIELD_CONFIG, getGrade, getSelectedAnalysisUserId, KopSurat, ProfilSiswa, handlePrintPDF, type View } from "@/lib/app-shared";
import { getFieldRecommendation, getOverallRecommendation, getGradeInfo, calculateOverallPercentage, getResultGrade, type FieldName, type GradeLevel } from "@/lib/recommendations";

export default function AdminAnalysisDetail({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("keseluruhan");

  const fetchDetail = useCallback(() => {
    if (!user || !getSelectedAnalysisUserId()) return;
    apiFetch(`/api/admin/analysis?userId=${getSelectedAnalysisUserId()}`, {}, user.id, user.role, String(user.grade))
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

  // Calculate overall IYA/TIDAK
  let totalIya = 0;
  let totalTidak = 0;
  Object.values(fieldAnalysis).forEach((field: any) => {
    totalIya += field.iya || 0;
    totalTidak += field.tidak || 0;
  });

  const overallPieData = [
    { name: "IYA", value: totalIya, fill: "#ef4444" },
    { name: "TIDAK", value: totalTidak, fill: "#10b981" },
  ];

  const fields = ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as const;

  // Calculate overall percentage and recommendation
  const fieldPercentages: Record<FieldName, number> = {
    PRIBADI: fieldAnalysis.PRIBADI?.percentage || 0,
    SOSIAL: fieldAnalysis.SOSIAL?.percentage || 0,
    BELAJAR: fieldAnalysis.BELAJAR?.percentage || 0,
    KARIR: fieldAnalysis.KARIR?.percentage || 0,
  };
  const studentKelas = (studentProfile.grade || 7) as GradeLevel;
  const overallPercentage = calculateOverallPercentage(fieldPercentages);
  const overallGradeInfo = getGradeInfo(overallPercentage);
  const overallRecommendation = getOverallRecommendation(overallPercentage, studentKelas);

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
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 w-full">
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
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500" /><span className="text-sm font-medium">IYA: {totalIya} ⚠</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-500" /><span className="text-sm">TIDAK: {totalTidak}</span></div>
                    </div>
                  </div>
                  {/* Overall Percentage & Grade */}
                  <div className="flex flex-col items-center gap-3 min-w-[200px]">
                    <div className={`text-5xl font-bold ${overallGradeInfo.color}`}>{overallPercentage}%<span className="text-lg font-normal text-gray-500 ml-1">TIDAK</span></div>
                    <Badge className={`${overallGradeInfo.bgColor} ${overallGradeInfo.color} text-base px-4 py-1 whitespace-normal break-words`}>
                      Grade {overallGradeInfo.grade} — {overallGradeInfo.label}
                    </Badge>
                    <div className={`p-3 rounded-lg ${overallGradeInfo.bgColor} border`}> 
                      <p className={`text-sm font-medium ${overallGradeInfo.color}`}>Rata-rata seluruh bidang (%TIDAK)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overall Recommendation */}
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Rekomendasi Keseluruhan
              </CardTitle></CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg ${overallGradeInfo.bgColor} border-2`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={`${overallGradeInfo.bgColor} ${overallGradeInfo.color} text-sm px-3 py-0.5`}>
                      {overallRecommendation.grade} ({overallRecommendation.label})
                    </Badge>
                    <span className="text-sm text-gray-600">Rentang: {overallRecommendation.range}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Keterangan: {overallRecommendation.keterangan}</p>
                  <p className="text-sm leading-relaxed">{overallRecommendation.saran}</p>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards Per Bidang */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {fields.map((field) => {
                const cfg = FIELD_CONFIG[field];
                const fa = fieldAnalysis[field] || { iya: 0, tidak: 0, total: 0, percentage: 0 };
                const g = getGradeInfo(fa.percentage || 0);
                return (
                  <Card key={field} className={`border-2 ${g.bgColor}`}>
                    <CardContent className="p-4 text-center">
                      <div className={`inline-flex p-2 rounded-xl mb-2 ${cfg.color} bg-white/80`}>{cfg.icon}</div>
                      <p className="text-xs text-gray-500">{cfg.label}</p>
                      <p className={`text-2xl font-bold ${g.color}`}>{fa.percentage || 0}%</p>
                      <p className="text-xs text-emerald-600 font-medium">TIDAK: {fa.tidak} / {fa.total}</p>
                      <Badge className={`${g.bgColor} ${g.color} mt-1 whitespace-normal break-words leading-tight`}>Grade {g.grade} — {g.label}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Ringkasan Rekomendasi */}
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-base">Ringkasan Rekomendasi Per Bidang</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map((field) => {
                    const cfg = FIELD_CONFIG[field];
                    const fa = fieldAnalysis[field] || { percentage: 0 };
                    const pct = fa.percentage || 0;
                    const rec = getFieldRecommendation(field, studentKelas, pct);
                    const gInfo = getGradeInfo(pct);
                    return (
                      <div key={field} className={`p-4 rounded-lg border-2 ${gInfo.bgColor}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cfg.color}>{cfg.icon}</span>
                          <span className="font-semibold text-sm">{cfg.label}</span>
                          <Badge className={`${gInfo.bgColor} ${gInfo.color} text-xs ml-auto`}>
                            {rec.grade} ({rec.label})
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
                          <span>Persentase TIDAK: <strong>{pct}%</strong></span>
                          <span>•</span>
                          <span>Rentang: {rec.range}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{rec.keterangan}</p>
                        <p className="text-sm leading-relaxed">{rec.saran}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recommendation Matrix Table */}
            <Card>
              <CardHeader><CardTitle className="text-base">Matriks Rekomendasi</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bidang</TableHead>
                      <TableHead className="text-center">Persentase</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Rekomendasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field) => {
                      const cfg = FIELD_CONFIG[field];
                      const fa = fieldAnalysis[field] || { percentage: 0 };
                      const rec = getFieldRecommendation(field, studentKelas, fa.percentage || 0);
                      const gInfo = getGradeInfo(fa.percentage || 0);
                      const categories: Record<string, string> = { A: "Normal", B: "Ringan", C: "Sedang", D: "Signifikan", E: "Berat" };
                      return (
                        <TableRow key={field}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className={cfg.color}>{cfg.icon}</span>
                              {cfg.label}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{fa.percentage || 0}%</TableCell>
                          <TableCell className="text-center"><Badge className={`${gInfo.bgColor} ${gInfo.color}`}>{gInfo.grade}</Badge></TableCell>
                          <TableCell>{categories[gInfo.grade]}</TableCell>
                          <TableCell className="text-sm">{rec.saran}</TableCell>
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
                const pct = fa.percentage || 0;
                const gInfo = getGradeInfo(pct);
                const rec = getFieldRecommendation(field, studentKelas, pct);
                const fieldPieData = [
                  { name: "IYA", value: fa.iya || 0, fill: "#ef4444" },
                  { name: "TIDAK", value: fa.tidak || 0, fill: "#10b981" },
                ];

                const problems: any[] = fa.problems || [];

                // Risk level based on TIDAK percentage (higher = better/fewer problems)
                const tidakPct = pct;
                let riskLevel = "Rendah";
                let riskColor = "text-emerald-600";
                let riskBg = "bg-emerald-50";
                if (tidakPct < 50) { riskLevel = "Berat"; riskColor = "text-rose-600"; riskBg = "bg-rose-50"; }
                else if (tidakPct < 75) { riskLevel = "Signifikan"; riskColor = "text-orange-600"; riskBg = "bg-orange-50"; }
                else if (tidakPct < 90) { riskLevel = "Sedang"; riskColor = "text-amber-600"; riskBg = "bg-amber-50"; }
                else if (tidakPct < 100) { riskLevel = "Ringan"; riskColor = "text-teal-600"; riskBg = "bg-teal-50"; }

                return (
                  <Card key={field} className={`border-2 ${cfg.bgColor}`}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className={cfg.color}>{cfg.icon}</span>
                        {cfg.label}
                        <Badge className={`${gInfo.bgColor} ${gInfo.color} ml-2 whitespace-normal break-words`}>Grade {gInfo.grade} — {gInfo.label}</Badge>
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
                          <div className={`text-center mt-2 p-2 rounded-lg ${riskBg}`}>
                            <p className={`font-semibold ${riskColor}`}>Tingkat Masalah: {riskLevel} ({tidakPct}% TIDAK)</p>
                          </div>
                        </div>

                        {/* Recommendation & Problem List */}
                        <div className="space-y-4">
                          {/* Recommendation Card */}
                          <div className={`p-4 rounded-lg border-2 ${gInfo.bgColor}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className={`h-4 w-4 ${gInfo.color}`} />
                              <span className="font-semibold text-sm">Rekomendasi</span>
                              <Badge className={`${gInfo.bgColor} ${gInfo.color} text-xs ml-auto`}>
                                {rec.grade} ({rec.label})
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
                              <span>Persentase TIDAK: <strong>{pct}%</strong></span>
                              <span>•</span>
                              <span>Rentang: {rec.range}</span>
                            </div>
                            <p className="text-sm mt-1">{rec.keterangan}</p>
                            <p className="text-sm leading-relaxed">{rec.saran}</p>
                          </div>

                          {/* Problem List */}
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Masalah Teridentifikasi ({problems.length} pernyataan):</h4>
                            {problems.length > 0 ? (
                              <div className="max-h-[420px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                <ul className="space-y-1">
                                  {problems.map((p: any, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 p-1.5 bg-white/70 rounded text-sm">
                                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                                      <span>{p.text || p}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">Tidak ada masalah teridentifikasi</p>
                            )}
                          </div>
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
