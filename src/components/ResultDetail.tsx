"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Download, AlertCircle, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth, apiFetch, FIELD_CONFIG, KopSurat, ProfilSiswa, handlePrintPDF, type ResponseData } from "@/lib/app-shared";
import { getFieldRecommendation, getGradeInfo, type FieldName, type GradeLevel } from "@/lib/recommendations";

export default function ResultDetail({ response, onBack }: { response: ResponseData; onBack: () => void }) {
  const { user } = useAuth();
  const [schoolSettings, setSchoolSettings] = useState<Record<string, string>>({});
  const survey = response.survey;
  const cfg = FIELD_CONFIG[survey.field] || FIELD_CONFIG.PRIBADI;
  const iyaCount = response.answers.filter((a) => a.value === "IYA").length;
  const tidakCount = response.answers.filter((a) => a.value === "TIDAK").length;

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/analysis", {}, user.id, user.role, String(user.grade))
      .then((data) => setSchoolSettings(data.schoolSettings || {}))
      .catch(() => {});
  }, [user]);

  const pieData = [
    { name: "IYA", value: iyaCount, fill: "#ef4444" },
    { name: "TIDAK", value: tidakCount, fill: "#10b981" },
  ];

  // Category breakdown - group questions by patterns
  const questionAnalysis = response.answers.map((a) => ({
    question: a.question.text,
    answer: a.value,
    isProblem: a.value === "IYA",
  }));

  const problemQuestions = questionAnalysis.filter((q) => q.isProblem);
  const tidakPercentage = Math.round((tidakCount / response.answers.length) * 100);
  const gradeInfo = getGradeInfo(tidakPercentage);

  let riskLevel = "Rendah";
  let riskColor = "text-emerald-600";
  let riskBg = "bg-emerald-50";
  if (tidakPercentage < 50) {
    riskLevel = "Tinggi";
    riskColor = "text-rose-600";
    riskBg = "bg-rose-50";
  } else if (tidakPercentage < 75) {
    riskLevel = "Sedang";
    riskColor = "text-amber-600";
    riskBg = "bg-amber-50";
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Hasil Analisa</h2>
          <p className="text-gray-500">{survey.title}</p>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => handlePrintPDF("result-detail-content")}>
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      <div id="result-detail-content" className="bg-white rounded-lg p-6 shadow-sm">
        <KopSurat schoolSettings={schoolSettings} />
        {user && <ProfilSiswa student={{ name: user.name, grade: user.grade, jenisKelamin: user.jenisKelamin, whatsapp: user.whatsapp, email: user.email }} />}
        <h2 className="text-center font-bold text-base uppercase mb-4">LAPORAN HASIL ANALISA DAFTAR CEK MASALAH (DCM)</h2>
        <p className="text-center text-sm text-gray-600 mb-6">Bidang: {cfg.label}</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Total Pernyataan</p>
              <p className="text-3xl font-bold">{response.answers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Jawaban IYA</p>
              <p className="text-3xl font-bold text-rose-600">{iyaCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Jawaban TIDAK</p>
              <p className="text-3xl font-bold text-emerald-600">{tidakCount}</p>
            </CardContent>
          </Card>
          <Card className={riskBg}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Tingkat Masalah</p>
              <p className={`text-3xl font-bold ${riskColor}`}>{riskLevel}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Diagram Lingkaran (Pie Chart)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Diagram Batang (Bar Chart)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pieData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Problem Analysis */}
        {problemQuestions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Masalah yang Teridentifikasi ({problemQuestions.length} dari {response.answers.length})
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${gradeInfo.bgColor} ${gradeInfo.color} whitespace-normal break-words text-sm`}>
                    Grade {gradeInfo.grade} — {gradeInfo.label}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-600">{tidakPercentage}% TIDAK</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                <ul className="space-y-2">
                  {problemQuestions.map((pq, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="text-sm">{pq.question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-teal-500" />
              Rekomendasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-xl ${riskBg}`}>
              {(() => {
                const field = survey.field as FieldName;
                const kelas = (user?.grade || 7) as GradeLevel;
                const rec = getFieldRecommendation(field, kelas, tidakPercentage);
                const gInfo = getGradeInfo(tidakPercentage);
                return (
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className={`${gInfo.bgColor} ${gInfo.color} border-0 text-sm px-3 py-1 whitespace-normal break-words`}>
                        Grade {gInfo.grade} — {gInfo.label}
                      </Badge>
                      <span className="text-sm font-medium">{tidakPercentage}% TIDAK</span>
                    </div>
                    <p className={`font-medium text-sm ${gInfo.color}`}>{rec.keterangan}</p>
                    <div className="mt-2 p-3 bg-white/70 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">💡 Saran:</p>
                      <p className="text-sm text-gray-600 mt-1">{rec.saran}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
