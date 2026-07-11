"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Filter, PieChart as PieChartIcon, Phone, Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth, apiFetch, FIELD_CONFIG, getGrade, setSelectedAnalysisUserId, UserPhoto, type View } from "@/lib/app-shared";
import { calculateOverallPercentage, getGradeInfo, type FieldName } from "@/lib/recommendations";

export default function AdminAnalysis({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState("ALL");
  const [filterField, setFilterField] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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
    </div>
  );
}
