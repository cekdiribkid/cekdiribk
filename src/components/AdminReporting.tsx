"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Download, FileText, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, apiFetch, FIELD_CONFIG, ProfilSiswa, handlePrintPDF, UserPhoto, type View, type UserData } from "@/lib/app-shared";

export default function AdminReporting({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<UserData[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/admin/users", {}, user.id, user.role, String(user.grade))
      .then((data) => setStudents((data.users || []).filter((u: UserData) => u.role === "USER")))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const fetchReport = useCallback(() => {
    if (!user || !selectedUserId) return;
    apiFetch(`/api/admin/report?userId=${selectedUserId}`, {}, user.id, user.role, String(user.grade))
      .then(setReportData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, selectedUserId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const studentProfile = reportData?.studentProfile || {};
  const schoolSettings = reportData?.schoolSettings || {};
  const responses = reportData?.responses || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Laporan Survey</h2>
          <p className="text-sm text-gray-500">Laporan hasil survey/penyataan siswa</p>
        </div>
      </div>

      {/* Student Selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Label className="shrink-0">Pilih Siswa:</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[280px]"><SelectValue placeholder="Pilih siswa..." /></SelectTrigger>
              <SelectContent className="max-h-60">
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — Kelas {s.grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedUserId && (() => {
            const sel = students.find(s => s.id === selectedUserId);
            if (!sel) return null;
            return (
              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100 mt-3">
                <UserPhoto user={sel} size="lg" className="ring-2 ring-teal-200" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{sel.name}</p>
                  <p className="text-sm text-gray-500">
                    Kelas {sel.grade}{sel.jenisKelamin ? ` • ${sel.jenisKelamin === "LAKI-LAKI" ? "Laki-laki" : sel.jenisKelamin === "PEREMPUAN" ? "Perempuan" : sel.jenisKelamin}` : ""}{sel.whatsapp ? ` • ${sel.whatsapp}` : ""}
                  </p>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {!selectedUserId ? (
        <Card><CardContent className="p-12 text-center"><FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Pilih siswa untuk melihat laporan</p></CardContent></Card>
      ) : loading ? (
        <Card><CardContent className="p-8"><div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded" />)}</div></CardContent></Card>
      ) : !reportData ? (
        <Card><CardContent className="p-12 text-center"><AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Data laporan tidak tersedia</p></CardContent></Card>
      ) : (
        <>
          <div className="flex justify-end mb-4 print:hidden">
            <Button variant="outline" size="sm" onClick={() => handlePrintPDF("admin-report-content")}>
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>
          <div id="admin-report-content" className="bg-white rounded-lg p-6 shadow-sm">
            <ProfilSiswa student={studentProfile} schoolSettings={schoolSettings} />
            <h2 className="text-center font-bold text-base uppercase mb-6">LAPORAN HASIL SURVEY/PERNYATAAN</h2>

            {responses.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Belum ada survey yang diselesaikan</p>
            ) : (
              <div className="space-y-6">
                {responses.map((resp: any, rIdx: number) => {
                  const cfg = FIELD_CONFIG[resp.field || resp.survey?.field] || FIELD_CONFIG.PRIBADI;
                  const answers = resp.answers || [];
                  const tidakAnswers = answers.filter((a: any) => a.value === "TIDAK");
                  const iyaAnswers = answers.filter((a: any) => a.value === "IYA");

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
            )}
          </div>
        </>
      )}
    </div>
  );
}
