"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Upload, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, type View, type SurveyData } from "@/lib/app-shared";

export default function AdminImportExport({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user: currentUser } = useAuth();
  const [importForm, setImportForm] = useState({ grade: "7", field: "PRIBADI", title: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [surveys, setSurveys] = useState<SurveyData[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    apiFetch("/api/admin/surveys", {}, currentUser.id, currentUser.role, String(currentUser.grade))
      .then((data) => setSurveys(data.surveys || []))
      .catch(console.error);
  }, [currentUser]);

  const handleImport = async () => {
    if (!currentUser || !file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("grade", importForm.grade);
      formData.append("field", importForm.field);
      if (importForm.title) formData.append("title", importForm.title);
      if (importForm.description) formData.append("description", importForm.description);

      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "x-user-id": currentUser.id, "x-user-role": currentUser.role },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import gagal");

      toast({ title: "Import Berhasil!", description: data.message });
      setFile(null);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Import gagal", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (surveyId?: string) => {
    if (!currentUser) return;
    try {
      const url = surveyId ? `/api/admin/export?surveyId=${surveyId}` : "/api/admin/export";
      const res = await fetch(url, {
        headers: { "x-user-id": currentUser.id, "x-user-role": currentUser.role },
      });
      if (!res.ok) throw new Error("Export gagal");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = surveyId ? `survey_questions.xlsx` : `hasil_assessment.xlsx`;
      a.click();
      toast({ title: "Export Berhasil!", description: "File berhasil didownload" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Export gagal", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">Import & Export Data</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-teal-600" /> Import Data Survey</CardTitle>
            <CardDescription>Upload file Excel (.xlsx) berisi pernyataan survey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Jenjang Kelas</Label><Select value={importForm.grade} onValueChange={(v) => setImportForm({ ...importForm, grade: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Kelas 7</SelectItem><SelectItem value="8">Kelas 8</SelectItem><SelectItem value="9">Kelas 9</SelectItem></SelectContent></Select></div>
            <div><Label>Bidang</Label><Select value={importForm.field} onValueChange={(v) => setImportForm({ ...importForm, field: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PRIBADI">Pribadi</SelectItem><SelectItem value="SOSIAL">Sosial</SelectItem><SelectItem value="BELAJAR">Belajar</SelectItem><SelectItem value="KARIR">Karir</SelectItem></SelectContent></Select></div>
            <div><Label>Judul (Opsional)</Label><Input value={importForm.title} onChange={(e) => setImportForm({ ...importForm, title: e.target.value })} placeholder="DCM Bidang Pribadi Kelas 7" /></div>
            <div><Label>Deskripsi (Opsional)</Label><Input value={importForm.description} onChange={(e) => setImportForm({ ...importForm, description: e.target.value })} /></div>
            <div>
              <Label>File Excel</Label>
              <Input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-gray-400 mt-1">Format: kolom &quot;Pernyataan&quot; atau kolom pertama berisi daftar pernyataan</p>
            </div>
            <Button onClick={handleImport} disabled={!file || importing} className="w-full bg-teal-600 hover:bg-teal-700">
              {importing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {importing ? "Mengimport..." : "Import"}
            </Button>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-emerald-600" /> Export Data</CardTitle>
            <CardDescription>Download data survey dan hasil assessment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => handleExport()} className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Download className="h-4 w-4 mr-2" /> Export Semua Hasil Assessment
            </Button>
            <Separator />
            <p className="text-sm font-medium">Export Pernyataan per Survey:</p>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {surveys.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-gray-500">Kelas {s.grade} • {s._count?.questions || 0} soal</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExport(s.id)}>
                      <Download className="h-3 w-3 mr-1" /> Export
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
