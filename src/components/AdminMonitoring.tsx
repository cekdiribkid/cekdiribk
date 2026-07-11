"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Filter, Download, BarChart3, Users, CheckCircle2, XCircle, Phone, Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth, apiFetch, FIELD_CONFIG, getGrade, handlePrintPDF, KopSurat, UserPhoto, type View } from "@/lib/app-shared";
import { getGradeInfo, type FieldName } from "@/lib/recommendations";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, CartesianGrid,
} from "recharts";

// Color palette for the chart
const IYA_COLOR = "#ef4444";   // red-500 (problem indicator)
const TIDAK_COLOR = "#10b981"; // emerald-500 (good/neutral)

// Custom tooltip - declared outside render to avoid static-components error
function MonitoringTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{d.fullName}</p>
      {d.whatsapp && <p className="text-xs text-gray-500 mb-1">WA: {d.whatsapp}</p>}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{ background: IYA_COLOR }} />
        <span>IYA: {d.iyaCount} ({d.IYA}%)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: TIDAK_COLOR }} />
        <span className="font-semibold">TIDAK: {d.tidakCount} ({d.TIDAK}%) ✓</span>
      </div>
      <p className="text-gray-500 mt-1">Total: {d.total} pernyataan</p>
    </div>
  );
}

// Custom legend - declared outside render
function MonitoringLegend() {
  return (
    <div className="flex justify-center gap-6 mt-2">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ background: IYA_COLOR }} />
        <span className="text-sm font-medium">IYA</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ background: TIDAK_COLOR }} />
        <span className="text-sm font-medium">TIDAK</span>
      </div>
    </div>
  );
}

interface StudentMonitoring {
  id: string;
  name: string;
  grade: number;
  whatsapp: string;
  image: string | null;
  iyaCount: number;
  tidakCount: number;
  total: number;
  iyaPct: number;
  tidakPct: number;
}

export default function AdminMonitoring({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState("ALL");
  const [filterField, setFilterField] = useState("ALL");
  const [schoolSettings, setSchoolSettings] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMonitoringRef = useCallback(() => {
    if (!user) return;
    const params = new URLSearchParams();
    if (filterGrade !== "ALL") params.set("grade", filterGrade);
    if (filterField !== "ALL") params.set("field", filterField);
    apiFetch(`/api/admin/analysis?${params.toString()}`, {}, user.id, user.role, String(user.grade))
      .then((data) => {
        setAnalysisData(data);
        setSchoolSettings(data.schoolSettings || {});
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [user, filterGrade, filterField]);

  useEffect(() => { fetchMonitoringRef(); }, [fetchMonitoringRef]);

  // Build student monitoring data from analysis
  const buildStudentData = (): StudentMonitoring[] => {
    if (!analysisData) return [];
    const fieldAnalysis = analysisData.fieldAnalysis || {};
    const fields = filterField !== "ALL" ? [filterField] : ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"];

    // Collect all unique users across selected fields
    const userMap = new Map<string, { id: string; name: string; grade: number; whatsapp: string; image: string | null; iyaCount: number; tidakCount: number; total: number }>();

    for (const field of fields) {
      const fa = fieldAnalysis[field];
      if (!fa?.users) continue;
      for (const u of fa.users) {
        const existing = userMap.get(u.id);
        if (existing) {
          existing.iyaCount += u.iyaCount;
          existing.tidakCount += u.tidakCount;
          existing.total += u.total;
        } else {
          userMap.set(u.id, {
            id: u.id,
            name: u.name,
            grade: u.grade,
            whatsapp: u.whatsapp || '',
            image: u.image || null,
            iyaCount: u.iyaCount,
            tidakCount: u.tidakCount,
            total: u.total,
          });
        }
      }
    }

    return Array.from(userMap.values())
      .map((u) => ({
        ...u,
        iyaPct: u.total > 0 ? Math.round((u.iyaCount / u.total) * 100) : 0,
        tidakPct: u.total > 0 ? Math.round((u.tidakCount / u.total) * 100) : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const allStudents = buildStudentData();
  const isSearching = searchQuery.trim().length > 0;
  const students = isSearching
    ? allStudents.filter((s) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          String(s.grade).includes(q) ||
          (s.whatsapp || "").toLowerCase().includes(q)
        );
      })
    : allStudents;

  // Chart data for Recharts horizontal bar
  const chartData = students.map((s) => ({
    name: s.name.length > 20 ? s.name.slice(0, 18) + "…" : s.name,
    fullName: s.name,
    whatsapp: s.whatsapp,
    IYA: s.iyaPct,
    TIDAK: s.tidakPct,
    iyaCount: s.iyaCount,
    tidakCount: s.tidakCount,
    total: s.total,
  }));

  // Summary stats
  const totalIYA = students.reduce((s, u) => s + u.iyaCount, 0);
  const totalTIDAK = students.reduce((s, u) => s + u.tidakCount, 0);
  const totalAll = totalIYA + totalTIDAK;
  const overallIyaPct = totalAll > 0 ? Math.round((totalIYA / totalAll) * 100) : 0;
  const overallTidakPct = totalAll > 0 ? Math.round((totalTIDAK / totalAll) * 100) : 0;

  // Get filter label for display
  const getFieldLabel = () => {
    if (filterField === "ALL") return "Semua Bidang";
    return FIELD_CONFIG[filterField]?.label || filterField;
  };
  const getGradeLabel = () => {
    if (filterGrade === "ALL") return "Semua Kelas";
    return `Kelas ${filterGrade}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Monitoring Survey Siswa</h2>
          <p className="text-sm text-gray-500">Prosentase TIDAK dan IYA seluruh siswa yang sudah mengerjakan</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => handlePrintPDF("admin-monitoring-content")}>
          <Download className="h-4 w-4 mr-2" /> Cetak / PDF
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6 print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Filter:</span>
            </div>
            <Select value={filterField} onValueChange={setFilterField}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Jenjang" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Bidang</SelectItem>
                <SelectItem value="PRIBADI">Pribadi</SelectItem>
                <SelectItem value="SOSIAL">Sosial</SelectItem>
                <SelectItem value="BELAJAR">Belajar</SelectItem>
                <SelectItem value="KARIR">Karir</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kelas</SelectItem>
                <SelectItem value="7">Kelas 7</SelectItem>
                <SelectItem value="8">Kelas 8</SelectItem>
                <SelectItem value="9">Kelas 9</SelectItem>
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
              Menampilkan <strong className="text-teal-700">{students.length}</strong> dari <strong>{allStudents.length}</strong> siswa untuk pencarian &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </CardContent>
      </Card>

      {/* Printable Content */}
      <div id="admin-monitoring-content">
        {/* KOP SURAT for print */}
        <div className="hidden print:block">
          <KopSurat schoolSettings={schoolSettings} />
        </div>

        {/* Print title */}
        <div className="hidden print:block text-center mb-4">
          <h2 className="font-bold text-base uppercase">Monitoring Prosentase TIDAK dan IYA Siswa</h2>
          <p className="text-sm text-gray-600">{getFieldLabel()} — {getGradeLabel()}</p>
        </div>

        {loading ? (
          <Card><CardContent className="p-8"><div className="animate-pulse space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-gray-200 rounded" />)}</div></CardContent></Card>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">
                {isSearching ? (
                  <>Tidak ada siswa yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;</>
                ) : (
                  <>Belum ada data siswa yang mengerjakan survey</>
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-500">Jumlah Siswa</p>
                  <p className="text-3xl font-bold">{students.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-500">Total IYA</p>
                  <p className="text-3xl font-bold text-rose-600">{totalIYA}</p>
                  <p className="text-sm text-rose-500">{overallIyaPct}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-500">Total TIDAK</p>
                  <p className="text-3xl font-bold text-emerald-600">{totalTIDAK}</p>
                  <p className="text-sm text-emerald-500">{overallTidakPct}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-500">Total Pernyataan</p>
                  <p className="text-3xl font-bold text-teal-600">{totalAll}</p>
                </CardContent>
              </Card>
            </div>

            {/* Overall Stacked Bar */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-teal-600" />
                  Prosentase Keseluruhan — {getFieldLabel()} — {getGradeLabel()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex-1">
                    <div className="w-full h-10 rounded-lg overflow-hidden flex">
                      <div
                        className="h-full flex items-center justify-center text-white font-bold text-sm transition-all"
                        style={{ width: `${overallIyaPct}%`, background: IYA_COLOR }}
                      >
                        {overallIyaPct > 8 ? `${overallIyaPct}%` : ""}
                      </div>
                      <div
                        className="h-full flex items-center justify-center text-white font-bold text-sm transition-all"
                        style={{ width: `${overallTidakPct}%`, background: TIDAK_COLOR }}
                      >
                        {overallTidakPct > 8 ? `${overallTidakPct}%` : ""}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ background: IYA_COLOR }} />
                    <span className="text-sm font-medium">IYA: {totalIYA} ({overallIyaPct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ background: TIDAK_COLOR }} />
                    <span className="text-sm font-medium">TIDAK: {totalTIDAK} ({overallTidakPct}%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Horizontal Stacked Bar Chart per Student */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  Prosentase Per Siswa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ width: "100%", minHeight: students.length * 48 + 60 }}>
                  <ResponsiveContainer width="100%" height={students.length * 48 + 60}>
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                      <Tooltip content={<MonitoringTooltip />} />
                      <Legend content={<MonitoringLegend />} />
                      <Bar dataKey="IYA" stackId="a" fill={IYA_COLOR} radius={[0, 0, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`iya-${index}`} fill={IYA_COLOR} />
                        ))}
                      </Bar>
                      <Bar dataKey="TIDAK" stackId="a" fill={TIDAK_COLOR} radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`tidak-${index}`} fill={TIDAK_COLOR} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  Detail Monitoring Per Siswa
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="p-3 text-left font-medium text-gray-600">No</th>
                        <th className="p-3 text-left font-medium text-gray-600">Nama Siswa</th>
                        <th className="p-3 text-center font-medium text-gray-600">Kelas</th>
                        <th className="p-3 text-center font-medium text-gray-600">No. WhatsApp</th>
                        <th className="p-3 text-center font-medium text-gray-600">IYA</th>
                        <th className="p-3 text-center font-medium text-gray-600">TIDAK</th>
                        <th className="p-3 text-center font-medium text-gray-600">Total</th>
                        <th className="p-3 text-center font-medium text-gray-600">% IYA</th>
                        <th className="p-3 text-center font-medium text-gray-600">% TIDAK</th>
                        <th className="p-3 text-center font-medium text-gray-600 min-w-[180px]">Progres</th>
                        <th className="p-3 text-center font-medium text-gray-600">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, idx) => {
                        const gInfo = getGradeInfo(s.tidakPct);
                        return (
                          <tr key={s.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-gray-500">{idx + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <UserPhoto user={s} size="sm" />
                                <span className="font-medium">{s.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline">Kelas {s.grade}</Badge>
                            </td>
                            <td className="p-3 text-center">
                              {s.whatsapp ? (
                                <a
                                  href={`https://wa.me/${s.whatsapp.replace(/^0/, '62')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 hover:underline text-sm font-medium"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  {s.whatsapp}
                                </a>
                              ) : (
                                <span className="text-gray-300 text-sm">—</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-semibold text-red-600">{s.iyaCount}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-semibold text-emerald-600">{s.tidakCount}</span>
                            </td>
                            <td className="p-3 text-center text-gray-600">{s.total}</td>
                            <td className="p-3 text-center">
                              <Badge className="bg-red-50 text-red-700">{s.iyaPct}%</Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge className="bg-emerald-50 text-emerald-700">{s.tidakPct}%</Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-4 rounded-full overflow-hidden bg-gray-100 flex">
                                  <div
                                    className="h-full flex items-center justify-center text-[10px] text-white font-bold"
                                    style={{ width: `${s.iyaPct}%`, background: IYA_COLOR }}
                                  >
                                    {s.iyaPct > 12 ? `${s.iyaPct}%` : ""}
                                  </div>
                                  <div
                                    className="h-full flex items-center justify-center text-[10px] text-white font-bold"
                                    style={{ width: `${s.tidakPct}%`, background: TIDAK_COLOR }}
                                  >
                                    {s.tidakPct > 12 ? `${s.tidakPct}%` : ""}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge className={`${gInfo.bgColor} ${gInfo.color} whitespace-normal break-words leading-tight`}>
                                {gInfo.grade} — {gInfo.label}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
