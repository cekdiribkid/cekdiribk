"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft, Download, FileText, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth, apiFetch, FIELD_CONFIG, KopSurat, ProfilSiswa, handlePrintPDF, type View } from "@/lib/app-shared";
import {
  getFieldRecommendation,
  getOverallRecommendation,
  getGradeInfo,
  calculateOverallPercentage,
  type FieldName,
  type GradeLevel,
} from "@/lib/recommendations";

const PIE_COLORS = ["#ef4444", "#10b981"]; // IYA=red (problem), TIDAK=green (good)

function MiniPieChart({ tidak, total, size = 80 }: { tidak: number; total: number; size?: number }) {
  const iya = total - tidak;
  const data = [
    { name: "IYA", value: iya },
    { name: "TIDAK", value: tidak },
  ];

  if (total === 0) {
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center text-xs text-gray-400">
        N/A
      </div>
    );
  }

  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={size * 0.25}
          outerRadius={size * 0.42}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          <Cell fill={PIE_COLORS[0]} />
          <Cell fill={PIE_COLORS[1]} />
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [`${value} soal`, name]}
          contentStyle={{ fontSize: 12, borderRadius: 8, padding: "4px 8px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function StudentReporting({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentReport = useCallback(() => {
    if (!user) return;
    apiFetch("/api/report", {}, user.id, user.role, String(user.grade))
      .then(setReportData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { fetchStudentReport(); }, [fetchStudentReport]);

  // Compute field percentages from responses — TIDAK-based
  const { fieldPercentages, overallPercentage, totalTidak, totalQuestions } = useMemo(() => {
    if (!reportData?.responses) {
      return { fieldPercentages: {} as Record<string, number>, overallPercentage: 0, totalTidak: 0, totalQuestions: 0 };
    }

    const responses: any[] = reportData.responses;
    const fieldMap: Record<string, { iya: number; tidak: number; total: number }> = {};
    let grandTidak = 0;
    let grandTotal = 0;

    for (const resp of responses) {
      const field = resp.field || resp.survey?.field || "PRIBADI";
      if (!fieldMap[field]) fieldMap[field] = { iya: 0, tidak: 0, total: 0 };

      const answers = resp.answers || [];
      const iyaCount = answers.filter((a: any) => a.value === "IYA").length;
      const tidakCount = answers.filter((a: any) => a.value === "TIDAK").length;
      fieldMap[field].iya += iyaCount;
      fieldMap[field].tidak += tidakCount;
      fieldMap[field].total += answers.length;
      grandTidak += tidakCount;
      grandTotal += answers.length;
    }

    // Calculate TIDAK percentage per field (TIDAK-based grading: higher TIDAK% = fewer problems = better)
    const fp: Record<string, number> = {};
    for (const [f, d] of Object.entries(fieldMap)) {
      fp[f] = d.total > 0 ? Math.round((d.tidak / d.total) * 100) : 0;
    }

    // Use calculateOverallPercentage if all 4 fields present, otherwise simple TIDAK% average
    let overall = 0;
    const allFields: FieldName[] = ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"];
    const hasAllFields = allFields.every((f) => fp[f] !== undefined);
    if (hasAllFields) {
      overall = calculateOverallPercentage(fp as Record<FieldName, number>);
    } else if (grandTotal > 0) {
      overall = Math.round((grandTidak / grandTotal) * 100);
    }

    return { fieldPercentages: fp, overallPercentage: overall, totalTidak: grandTidak, totalQuestions: grandTotal };
  }, [reportData]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/4" /><div className="h-64 bg-gray-200 rounded" /></div></div>;
  }

  const schoolSettings = reportData?.schoolSettings || {};
  const studentProfile = reportData?.studentProfile || { name: user?.name, grade: user?.grade, jenisKelamin: user?.jenisKelamin, whatsapp: user?.whatsapp, email: user?.email, image: user?.image };
  const responses = reportData?.responses || [];

  const kelas = (user?.grade || 7) as GradeLevel;
  const overallGradeInfo = getGradeInfo(overallPercentage);
  const overallRec = getOverallRecommendation(overallPercentage, kelas);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")} className="print:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Laporan Survey</h2>
          <p className="text-sm text-gray-500">Laporan hasil survey/pernyataan kamu</p>
        </div>
      </div>

      {responses.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Belum ada survey yang diselesaikan</p><Button onClick={() => onNavigate("dcm")} className="mt-4 bg-teal-600">Mulai Assessment</Button></CardContent></Card>
      ) : (
        <>
          <div className="flex justify-end mb-4 print:hidden">
            <Button variant="outline" size="sm" onClick={() => handlePrintPDF("student-report-content")}>
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>
          <div id="student-report-content" className="bg-white rounded-lg p-6 shadow-sm">
            <KopSurat schoolSettings={schoolSettings} />
            <ProfilSiswa student={studentProfile} schoolSettings={schoolSettings} />
            <h2 className="text-center font-bold text-base uppercase mb-6">LAPORAN HASIL SURVEY/PERNYATAAN</h2>

            {/* ============ OVERALL SURVEY REPORT ============ */}
            <Card className="border-2 border-gray-200 mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-teal-600" />
                  Keseluruhan Hasil Survey
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Pie Chart */}
                  <div className="flex flex-col items-center">
                    <MiniPieChart tidak={totalTidak} total={totalQuestions} size={140} />
                    <p className="text-xs text-gray-500 mt-1">TIDAK vs IYA</p>
                  </div>
                  {/* Stats */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-4xl font-bold" style={{ color: overallGradeInfo.color.includes("emerald") ? "#047857" : overallGradeInfo.color.includes("teal") ? "#0f766e" : overallGradeInfo.color.includes("amber") ? "#b45309" : overallGradeInfo.color.includes("orange") ? "#c2410c" : "#b91c1c" }}>
                        {overallPercentage}%
                      </span>
                      <Badge className={`${overallGradeInfo.bgColor} ${overallGradeInfo.color} text-sm whitespace-normal break-words`}>
                        Grade {overallGradeInfo.grade} — {overallGradeInfo.label}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                        TIDAK: <strong>{totalTidak}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                        IYA: <strong>{totalQuestions - totalTidak}</strong>
                      </span>
                      <span className="text-gray-500">dari {totalQuestions} pernyataan</span>
                    </div>
                    {/* Per-field quick summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {(["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as FieldName[]).map((field) => {
                        const cfg = FIELD_CONFIG[field];
                        const pct = fieldPercentages[field] ?? 0;
                        const fi = getGradeInfo(pct);
                        return (
                          <div key={field} className="flex flex-col items-center p-3 rounded-lg bg-gray-50 border min-h-[100px]">
                            <div className={cfg.color}>{cfg.icon}</div>
                            <p className="text-xs text-gray-600 mt-1">{cfg.label}</p>
                            <p className={`text-sm font-bold ${fi.color} mt-0.5`}>{pct}%</p>
                            <div className="mt-auto w-full">
                              <Badge className={`${fi.bgColor} ${fi.color} text-[10px] w-full justify-center whitespace-normal break-words leading-tight`}>{fi.grade} — {fi.label}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Overall Recommendation */}
                    <div className="mt-3 p-3 rounded-lg bg-gray-50 border">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Keterangan:</p>
                      <p className="text-sm text-gray-700 font-medium">{overallGradeInfo.keterangan}</p>
                      <p className="text-xs font-semibold text-gray-700 mt-2 mb-1">Saran:</p>
                      <p className="text-sm text-gray-700">{overallRec.saran}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ============ PER-FIELD REPORT SECTIONS ============ */}
            <div className="space-y-6">
              {(["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as FieldName[]).map((field) => {
                // Find responses for this field
                const fieldResponses = responses.filter((r: any) => (r.field || r.survey?.field) === field);
                if (fieldResponses.length === 0) return null;

                const cfg = FIELD_CONFIG[field];
                const pct = fieldPercentages[field] ?? 0;
                const fieldGradeInfo = getGradeInfo(pct);
                const fieldRec = getFieldRecommendation(field, kelas, pct);

                // Aggregate all answers for this field
                const allAnswers: { questionText: string; order: number; iyaCount: number; tidakCount: number; totalCount: number }[] = [];
                const questionMap = new Map<string, { text: string; order: number; iya: number; total: number }>();

                for (const resp of fieldResponses) {
                  for (const a of resp.answers || []) {
                    const qText = a.question?.text || a.text || "";
                    const qId = a.questionId || a.question?.id || qText;
                    if (!questionMap.has(qId)) {
                      questionMap.set(qId, { text: qText, order: a.question?.order ?? allAnswers.length, iya: 0, total: 0 });
                    }
                    const entry = questionMap.get(qId)!;
                    entry.total++;
                    if (a.value === "IYA") entry.iya++;
                  }
                }

                for (const [, v] of questionMap) {
                  allAnswers.push({ questionText: v.text, order: v.order, iyaCount: v.iya, tidakCount: v.total - v.iya, totalCount: v.total });
                }
                allAnswers.sort((a, b) => a.order - b.order);

                const iyaOnlyAnswers = allAnswers.filter((a) => a.iyaCount > 0);
                const fieldTotalTidak = allAnswers.reduce((s, a) => s + a.tidakCount, 0);
                const fieldTotalQ = allAnswers.reduce((s, a) => s + a.totalCount, 0);

                return (
                  <Card key={field} className={`border-2`}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-2 flex-1">
                          <span className={cfg.color}>{cfg.icon}</span>
                          <CardTitle className="text-base">{cfg.label}</CardTitle>
                          <Badge variant="outline" className="text-xs">{field}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <MiniPieChart tidak={fieldTotalTidak} total={fieldTotalQ} size={70} />
                          <div className="flex flex-col items-end gap-1">
                            <p className={`text-2xl font-bold ${fieldGradeInfo.color}`}>{pct}%</p>
                            <Badge className={`${fieldGradeInfo.bgColor} ${fieldGradeInfo.color} text-xs whitespace-normal break-words max-w-[180px] text-right`}>
                              Grade {fieldGradeInfo.grade} — {fieldGradeInfo.label}
                            </Badge>
                            <p className="text-xs text-gray-500">
                              <span className="font-semibold text-emerald-600">TIDAK</span>: {fieldTotalTidak} / {fieldTotalQ}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Recommendation */}
                      <div className="mb-4 p-3 rounded-lg bg-gray-50 border">
                        <div className="mb-1">
                          <span className={`text-sm font-bold ${fieldGradeInfo.color}`}>{fieldRec.grade} ({fieldRec.label})</span>
                          <span className="text-sm text-gray-600"> – {fieldRec.keterangan}</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Saran:</p>
                        <p className="text-sm text-gray-700">{fieldRec.saran}</p>
                      </div>

                      {/* IYA-only table */}
                      {iyaOnlyAnswers.length > 0 ? (
                        <>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Pernyataan yang dijawab <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 text-xs">IYA</Badge> ({iyaOnlyAnswers.length} pernyataan)
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">No</TableHead>
                                <TableHead>Pernyataan</TableHead>
                                <TableHead className="w-28 text-center">% TIDAK</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {iyaOnlyAnswers.map((a, idx) => {
                                const pctVal = a.totalCount > 0 ? Math.round((a.tidakCount / a.totalCount) * 100) : 0;
                                return (
                                  <TableRow key={idx} className="bg-amber-50">
                                    <TableCell className="text-center">{idx + 1}</TableCell>
                                    <TableCell className="text-sm">{a.questionText}</TableCell>
                                    <TableCell className="text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <span className="font-semibold text-emerald-700">{pctVal}%</span>
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">TIDAK</Badge>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </>
                      ) : (
                        <div className="text-center p-4 text-gray-500 text-sm">
                          <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
                          Tidak ada pernyataan yang dijawab IYA — Sangat Baik!
                        </div>
                      )}

                      {/* All answers table (collapsible detail) */}
                      <details className="mt-4">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                          Lihat semua jawaban ({allAnswers.length} pernyataan)
                        </summary>
                        <Table className="mt-2">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">No</TableHead>
                              <TableHead>Pernyataan</TableHead>
                              <TableHead className="w-20 text-center">IYA</TableHead>
                              <TableHead className="w-20 text-center">TIDAK</TableHead>
                              <TableHead className="w-24 text-center">% TIDAK</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allAnswers.map((a, idx) => {
                              const pctVal = a.totalCount > 0 ? Math.round((a.tidakCount / a.totalCount) * 100) : 0;
                              return (
                                <TableRow key={idx} className={a.iyaCount > 0 ? "bg-amber-50/50" : ""}>
                                  <TableCell className="text-center">{idx + 1}</TableCell>
                                  <TableCell className="text-sm">{a.questionText}</TableCell>
                                  <TableCell className="text-center">
                                    {a.iyaCount > 0 ? <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 text-xs">{a.iyaCount}</Badge> : <span className="text-gray-300">0</span>}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {a.tidakCount > 0 ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">{a.tidakCount}</Badge> : <span className="text-gray-300">0</span>}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className={`font-medium ${a.iyaCount > 0 ? "text-rose-700" : "text-emerald-600"}`}>{pctVal}%</span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </details>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
