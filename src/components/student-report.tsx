"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, FIELD_CONFIG, type View, KopSurat, ProfilSiswa, handlePrintPDF } from "@/lib/app-shared";

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

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/4" /><div className="h-64 bg-gray-200 rounded" /></div></div>;
  }

  const schoolSettings = reportData?.schoolSettings || {};
  const studentProfile = reportData?.studentProfile || { name: user?.name, grade: user?.grade, jenisKelamin: user?.jenisKelamin, whatsapp: user?.whatsapp, email: user?.email, createdAt: user?.createdAt };
  const responses = reportData?.responses || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Laporan Survey</h2>
          <p className="text-sm text-gray-500">Laporan hasil survey/penyataan kamu</p>
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
            <ProfilSiswa student={studentProfile} />
            <h2 className="text-center font-bold text-base uppercase mb-6">LAPORAN HASIL SURVEY/PERNYATAAN</h2>

            <div className="space-y-6">
              {responses.map((resp: any, rIdx: number) => {
                const cfg = FIELD_CONFIG[resp.field || resp.survey?.field] || FIELD_CONFIG.PRIBADI;
                const answers = resp.answers || [];
                const tidakAnswers = answers.filter((a: any) => a.value === "TIDAK");

                return (
                  <Card key={rIdx} className="border-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className={cfg.color}>{cfg.icon}</span>
                        {resp.title || resp.survey?.title || `Survey ${rIdx + 1}`}
                        <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                      </CardTitle>
                      <p className="text-xs text-gray-500">
                        TIDAK: {tidakAnswers.length} / {answers.length} ({answers.length > 0 ? Math.round((tidakAnswers.length / answers.length) * 100) : 0}%)
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">No</TableHead>
                            <TableHead>Pernyataan</TableHead>
                            <TableHead className="w-24 text-center">Jawaban</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {answers.map((a: any, aIdx: number) => (
                            <TableRow key={aIdx} className={a.value === "IYA" ? "bg-amber-50" : ""}>
                              <TableCell className="text-center">{aIdx + 1}</TableCell>
                              <TableCell className="text-sm">{a.question?.text || a.text || `Pernyataan ${aIdx + 1}`}</TableCell>
                              <TableCell className="text-center">
                                {a.value === "IYA" ? (
                                  <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">IYA</Badge>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">TIDAK</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
