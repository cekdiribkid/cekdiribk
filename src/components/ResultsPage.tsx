"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ChevronRight, PieChart as PieChartIcon, BarChart3, AlertCircle,
  Printer, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth, apiFetch, FIELD_CONFIG, type View, type ResponseData, KopSurat, ProfilSiswa, handlePrintPDF } from "@/lib/app-shared";
import {
  getFieldRecommendation,
  getOverallRecommendation,
  getGradeInfo,
  calculateOverallPercentage,
  type FieldName,
  type GradeLevel,
} from "@/lib/recommendations";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import ResultDetail from "./ResultDetail";

const PIE_COLORS: Record<string, string> = {
  IYA: "#ef4444",
  TIDAK: "#10b981",
};

const FIELD_PIE_COLORS: Record<string, { iya: string; tidak: string }> = {
  PRIBADI: { iya: "#e11d48", tidak: "#10b981" },
  SOSIAL: { iya: "#059669", tidak: "#6ee7b7" },
  BELAJAR: { iya: "#d97706", tidak: "#fcd34d" },
  KARIR: { iya: "#7c3aed", tidak: "#c4b5fd" },
};

export default function ResultsPage({ onNavigate, surveyIdFilter }: { onNavigate: (view: View) => void; surveyIdFilter?: string }) {
  const { user } = useAuth();
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolSettings, setSchoolSettings] = useState<Record<string, string>>({});
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/responses", {}, user.id, user.role, String(user.grade))
      .then((data) => {
        const resps = (data.responses || []).filter((r: ResponseData) => r.completed);
        setResponses(resps);
        if (surveyIdFilter) {
          const found = resps.find((r: ResponseData) => r.surveyId === surveyIdFilter);
          if (found) setSelectedResponse(found);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, surveyIdFilter]);

  // Fetch school settings for kop surat
  useEffect(() => {
    if (!user) return;
    apiFetch("/api/analysis", {}, user.id, user.role, String(user.grade))
      .then((data) => setSchoolSettings(data.schoolSettings || {}))
      .catch(() => {});
  }, [user]);

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
      // Percentage = TIDAK/total (wellness rate): higher TIDAK% = fewer problems = better grade
      const percentage = total > 0 ? Math.round((tidak / total) * 100) : 0;
      result[field] = { iya, tidak, total, percentage };
    }

    return result;
  }, [responses]);

  // Calculate overall percentage
  const overallData = useMemo(() => {
    const fieldPercentages: Record<FieldName, number> = {} as Record<FieldName, number>;
    for (const [field, data] of Object.entries(fieldAnalysis)) {
      fieldPercentages[field as FieldName] = data.percentage;
    }
    if (Object.keys(fieldPercentages).length === 0) return null;

    const overallPct = calculateOverallPercentage(fieldPercentages);
    let totalIya = 0;
    let totalTidak = 0;
    for (const data of Object.values(fieldAnalysis)) {
      totalIya += data.iya;
      totalTidak += data.tidak;
    }

    return {
      percentage: overallPct,
      iya: totalIya,
      tidak: totalTidak,
      gradeInfo: getGradeInfo(overallPct),
      recommendation: getOverallRecommendation(overallPct, (user?.grade || 7) as GradeLevel),
    };
  }, [fieldAnalysis, user]);

  if (selectedResponse) {
    return <ResultDetail response={selectedResponse} onBack={() => setSelectedResponse(null)} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Hasil Analisa</h2>
          <p className="text-gray-500">Hasil assessment yang telah diselesaikan</p>
        </div>
        {responses.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrintPDF("hasil-analisa-content")}
              className="border-teal-200 text-teal-700 hover:bg-teal-50"
            >
              <Printer className="h-4 w-4 mr-2" /> Cetak
            </Button>
            <Button
              size="sm"
              onClick={() => handlePrintPDF("hasil-analisa-content")}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Download className="h-4 w-4 mr-2" /> Save PDF
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-4 bg-gray-200 rounded w-3/4" /></CardContent></Card>)}</div>
      ) : responses.length === 0 ? (
        <div className="text-center py-12">
          <PieChartIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Belum ada hasil assessment</p>
          <Button onClick={() => onNavigate("dcm")} className="mt-4 bg-teal-600 hover:bg-teal-700">Mulai Assessment</Button>
        </div>
      ) : (
        <div id="hasil-analisa-content" ref={printRef} className="bg-white">
          {/* Kop Surat - visible in print */}
          <div className="hidden print:block">
            <KopSurat schoolSettings={schoolSettings} />
            {user && <ProfilSiswa student={{ name: user.name, grade: user.grade, jenisKelamin: user.jenisKelamin, whatsapp: user.whatsapp, email: user.email }} />}
            <h2 className="text-center font-bold text-base uppercase mb-2 mt-4">LAPORAN HASIL ANALISA DAFTAR CEK MASALAH (DCM)</h2>
            <p className="text-center text-sm text-gray-600 mb-6">Tingkat Kelas {user?.grade || "-"}</p>
          </div>

          {/* ============ OVERALL ANALYSIS SECTION ============ */}
          {overallData && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <Card className="border-2 overflow-hidden">
                <div className={`h-1.5 ${
                  overallData.gradeInfo.grade === "A" ? "bg-emerald-500" :
                  overallData.gradeInfo.grade === "B" ? "bg-teal-500" :
                  overallData.gradeInfo.grade === "C" ? "bg-amber-500" :
                  overallData.gradeInfo.grade === "D" ? "bg-orange-500" :
                  "bg-red-500"
                }`} />
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-bold">Analisa Keseluruhan</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Pie Chart */}
                    <div className="flex flex-col items-center">
                      <div className="w-full max-w-[240px] h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "IYA", value: overallData.iya },
                                { name: "TIDAK", value: overallData.tidak },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={95}
                              paddingAngle={3}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill={PIE_COLORS.IYA} />
                              <Cell fill={PIE_COLORS.TIDAK} />
                            </Pie>
                            <Tooltip
                              formatter={(value: number, name: string) => [`${value} jawaban`, name]}
                              contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-gray-600 font-semibold">IYA: {overallData.iya}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-gray-600">TIDAK: {overallData.tidak}</span>
                        </div>
                      </div>
                    </div>

                    {/* Grade & Recommendation */}
                    <div className="space-y-4">
                      <div className="text-center md:text-left">
                        <p className="text-sm text-gray-500 mb-1">Persentase Keseluruhan</p>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl font-bold text-gray-800">{overallData.percentage}%</span>
                          <Badge className={`text-sm px-3 py-1 ${overallData.gradeInfo.bgColor} ${overallData.gradeInfo.color} border-0 font-bold`}>
                            {overallData.gradeInfo.grade} - {overallData.gradeInfo.label}
                          </Badge>
                        </div>
                      </div>

                      <Separator />

                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Keterangan</p>
                            <p className="text-sm text-gray-600">{overallData.gradeInfo.keterangan}</p>
                            <p className="text-sm font-semibold text-gray-700 mt-2 mb-1">Saran untuk Kamu</p>
                            <p className="text-sm text-gray-600 leading-relaxed">{overallData.recommendation.saran}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ============ PER-FIELD ANALYSIS CARDS ============ */}
          {Object.keys(fieldAnalysis).length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-gray-600" />
                Analisa Per Bidang
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as FieldName[]).map((field) => {
                  const data = fieldAnalysis[field];
                  if (!data) return null;

                  const cfg = FIELD_CONFIG[field];
                  const rec = getFieldRecommendation(field, (user?.grade || 7) as 7 | 8 | 9, data.percentage);
                  const gradeInfo = getGradeInfo(data.percentage);
                  const fieldColors = FIELD_PIE_COLORS[field] || FIELD_PIE_COLORS.PRIBADI;
                  const pieData = [
                    { name: "IYA", value: data.iya },
                    { name: "TIDAK", value: data.tidak },
                  ];

                  return (
                    <motion.div key={field} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="h-full border-2">
                        <div className={`h-1.5 ${
                          gradeInfo.grade === "A" ? "bg-emerald-500" :
                          gradeInfo.grade === "B" ? "bg-teal-500" :
                          gradeInfo.grade === "C" ? "bg-amber-500" :
                          gradeInfo.grade === "D" ? "bg-orange-500" :
                          "bg-red-500"
                        }`} />
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`p-1.5 rounded-lg ${cfg.color} bg-white/80`}>{cfg.icon}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{cfg.label}</h4>
                            </div>
                            <Badge className={`text-xs px-2 py-0.5 ${gradeInfo.bgColor} ${gradeInfo.color} border-0 font-bold`}>
                              {gradeInfo.grade}
                            </Badge>
                          </div>

                          {/* Small Pie Chart */}
                          <div className="w-full h-[100px] mb-3">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={28}
                                  outerRadius={50}
                                  paddingAngle={3}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  <Cell fill={fieldColors.iya} />
                                  <Cell fill={fieldColors.tidak} />
                                </Pie>
                                <Tooltip
                                  formatter={(value: number, name: string) => [`${value}`, name]}
                                  contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Percentage & Stats */}
                          <div className="text-center mb-3">
                            <span className="text-2xl font-bold text-gray-800">{data.percentage}%</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                              IYA: {data.iya} / TIDAK: {data.tidak}
                            </p>
                          </div>

                          <Separator className="mb-3" />

                          {/* Recommendation */}
                          <div className="bg-gray-50 rounded-lg p-2.5">
                            <p className="text-xs font-medium text-gray-600 mb-0.5">{rec.grade} ({rec.label}) – {rec.keterangan}</p>
                            <p className="text-[10px] text-gray-500 font-semibold mb-0.5">💡 Saran:</p>
                            <p className="text-[11px] text-gray-600 leading-snug">{rec.saran}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============ SUMMARY TABLE FOR PRINT ============ */}
          {overallData && Object.keys(fieldAnalysis).length > 0 && (
            <div className="hidden print:block mb-6">
              <h3 className="text-sm font-bold mb-2">Ringkasan Per Bidang</h3>
              <table className="w-full text-xs border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-left">Bidang</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">IYA</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">TIDAK</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">Total</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">Persentase TIDAK%</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">Grade</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">Keterangan</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">Saran</th>
                  </tr>
                </thead>
                <tbody>
                  {(["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"] as FieldName[]).map((field) => {
                    const data = fieldAnalysis[field];
                    if (!data) return null;
                    const gradeInfo = getGradeInfo(data.percentage);
                    const rec = getFieldRecommendation(field, (user?.grade || 7) as 7 | 8 | 9, data.percentage);
                    return (
                      <tr key={field}>
                        <td className="border border-gray-300 px-2 py-1 font-medium">{FIELD_CONFIG[field]?.label || field}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{data.iya}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{data.tidak}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{data.total}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{data.percentage}%</td>
                        <td className="border border-gray-300 px-2 py-1 text-center font-bold">{gradeInfo.grade}</td>
                        <td className="border border-gray-300 px-2 py-1 text-[10px]">{rec.keterangan}</td>
                        <td className="border border-gray-300 px-2 py-1 text-[10px]">{rec.saran}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50 font-bold">
                    <td className="border border-gray-300 px-2 py-1">Keseluruhan</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{overallData.iya}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{overallData.tidak}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{overallData.iya + overallData.tidak}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{overallData.percentage}%</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{overallData.gradeInfo.grade}</td>
                    <td className="border border-gray-300 px-2 py-1 text-[10px]">{overallData.gradeInfo.keterangan}</td>
                    <td className="border border-gray-300 px-2 py-1 text-[10px]">{overallData.recommendation.saran}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ============ INDIVIDUAL RESPONSE CARDS ============ */}
          <div className="print:hidden">
            <h3 className="text-lg font-bold mb-4">Detail Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {responses.map((response) => {
                const cfg = FIELD_CONFIG[response.survey.field] || FIELD_CONFIG.PRIBADI;
                const tidakCount = response.answers.filter((a) => a.value === "TIDAK").length;
                const iyaCount = response.answers.filter((a) => a.value === "IYA").length;
                const total = response.answers.length;
                // Percentage = TIDAK/total (wellness rate)
                const percentage = Math.round((tidakCount / total) * 100);

                return (
                  <motion.div key={response.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-2 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedResponse(response)}>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-xl ${cfg.color} bg-white/80`}>{cfg.icon}</div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{response.survey.title}</h4>
                            <p className="text-xs text-gray-500">
                              {response.completedAt && new Date(response.completedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-emerald-600 font-bold">TIDAK: {tidakCount}</span>
                              <span className="text-rose-600 font-medium">IYA: {iyaCount}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Detail <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ============ PRINT: Individual response details as table ============ */}
          <div className="hidden print:block">
            <h3 className="text-sm font-bold mb-2">Detail Jawaban Per Assessment</h3>
            {responses.map((response, rIdx) => {
              const cfg = FIELD_CONFIG[response.survey.field] || FIELD_CONFIG.PRIBADI;
              const iyaCount = response.answers.filter((a) => a.value === "IYA").length;
              const tidakCount = response.answers.filter((a) => a.value === "TIDAK").length;
              return (
                <div key={rIdx} className="mb-4">
                  <p className="text-xs font-bold mb-1">{rIdx + 1}. {cfg.label} — {response.survey.title} (IYA: {iyaCount}, TIDAK: {tidakCount})</p>
                  <table className="w-full text-[10px] border-collapse border border-gray-300 mb-2">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-1 py-0.5 w-8">No</th>
                        <th className="border border-gray-300 px-1 py-0.5 text-left">Pernyataan</th>
                        <th className="border border-gray-300 px-1 py-0.5 w-16">Jawaban</th>
                      </tr>
                    </thead>
                    <tbody>
                      {response.answers.map((ans, aIdx) => (
                        <tr key={aIdx} className={ans.value === "IYA" ? "bg-rose-50" : ""}>
                          <td className="border border-gray-300 px-1 py-0.5 text-center">{aIdx + 1}</td>
                          <td className="border border-gray-300 px-1 py-0.5">{ans.question.text}</td>
                          <td className="border border-gray-300 px-1 py-0.5 text-center font-bold">{ans.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
