"use client";

import React, { useState, useEffect } from "react";
import { Users, ClipboardList, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAuth, apiFetch, FIELD_CONFIG, type View } from "@/lib/app-shared";

function AdminDashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    stats: { totalUsers: number; totalSurveys: number; totalResponses: number; completedResponses: number };
    gradeDistribution: { grade: number; count: number }[];
    fieldStats: Record<string, { total: number; iya: number; tidak: number }>;
    recentResponses: { id: string; user: { name: string; grade: number }; survey: { title: string; field: string }; completedAt: string | null }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/admin/dashboard", {}, user.id, user.role, String(user.grade))
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/4" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-24 bg-gray-200 rounded" />)}</div></div></div>;
  }

  const gradeData = (stats?.gradeDistribution || []).map((g) => ({
    name: `Kelas ${g.grade}`,
    Jumlah: g.count,
  }));

  const fieldBarData = Object.entries(stats?.fieldStats || {}).map(([field, s]) => ({
    name: FIELD_CONFIG[field]?.label || field,
    IYA: s.iya,
    TIDAK: s.tidak,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-2 mb-2"><Users className="h-5 w-5 text-teal-500" /><p className="text-sm text-gray-500">Total User</p></div><p className="text-3xl font-bold">{stats?.stats.totalUsers || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-2 mb-2"><ClipboardList className="h-5 w-5 text-emerald-500" /><p className="text-sm text-gray-500">Total Survey</p></div><p className="text-3xl font-bold">{stats?.stats.totalSurveys || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-2 mb-2"><FileText className="h-5 w-5 text-amber-500" /><p className="text-sm text-gray-500">Total Response</p></div><p className="text-3xl font-bold">{stats?.stats.totalResponses || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-2 mb-2"><CheckCircle2 className="h-5 w-5 text-violet-500" /><p className="text-sm text-gray-500">Selesai</p></div><p className="text-3xl font-bold">{stats?.stats.completedResponses || 0}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-base">Distribusi Siswa per Kelas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Jumlah" fill="#14b8a6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Statistik Jawaban per Bidang</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fieldBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="IYA" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="TIDAK" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Respons Terbaru</CardTitle>
            <Button variant="outline" size="sm" onClick={() => onNavigate("admin-users")}>Lihat Semua</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siswa</TableHead>
                <TableHead>Survey</TableHead>
                <TableHead>Bidang</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stats?.recentResponses || []).map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.user.name} (Kelas {r.user.grade})</TableCell>
                  <TableCell>{r.survey.title}</TableCell>
                  <TableCell><Badge variant="outline">{r.survey.field}</Badge></TableCell>
                  <TableCell>{r.completedAt ? new Date(r.completedAt).toLocaleDateString("id-ID") : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminDashboard;
