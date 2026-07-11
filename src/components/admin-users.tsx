"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, User, Edit, Trash2, Search, Activity, CheckCircle2, Timer, AlertCircle, ChevronDown, ChevronUp, Heart, Users, BookOpen, Briefcase, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, FIELD_CONFIG, type View, type UserData } from "@/lib/app-shared";

export default function AdminUsers({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserData[]>([]);
  const [summary, setSummary] = useState({ totalUsers: 0, completedAll: 0, inProgress: 0, notStarted: 0 });
  const [surveysByGrade, setSurveysByGrade] = useState<Record<number, Record<string, unknown>[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", grade: "7", role: "USER", whatsapp: "" });
  const [filterGrade, setFilterGrade] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"monitoring" | "users">("monitoring");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    if (!currentUser) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (filterGrade !== "ALL") params.set("grade", filterGrade);
    if (searchQuery) params.set("search", searchQuery);
    apiFetch(`/api/admin/users?${params.toString()}`, {}, currentUser.id, currentUser.role, String(currentUser.grade))
      .then((data) => {
        setUsers(data.users || []);
        setAdminUsers(data.adminUsers || []);
        setSummary(data.summary || { totalUsers: 0, completedAll: 0, inProgress: 0, notStarted: 0 });
        setSurveysByGrade(data.surveysByGrade || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser, filterGrade, searchQuery]);

  // Load users on mount and when dependencies change
  // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern requires setState after API call
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleEdit = (u: UserData) => {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, grade: String(u.grade), role: u.role, whatsapp: u.whatsapp || "" });
  };

  const handleSaveEdit = async () => {
    if (!currentUser || !editingUser) return;
    try {
      await apiFetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "User berhasil diperbarui" });
      setEditingUser(null);
      loadUsers();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal memperbarui", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    if (!confirm("Yakin ingin menghapus user ini?")) return;
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "User berhasil dihapus" });
      loadUsers();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal menghapus", variant: "destructive" });
    }
  };

  // Filter users by status
  const filteredUsers = users.filter((u) => {
    if (filterStatus === "ALL") return true;
    return (u as Record<string, unknown>).overallStatus === filterStatus;
  });

  const fieldIcons: Record<string, React.ReactNode> = {
    PRIBADI: <Heart className="h-3.5 w-3.5" />,
    SOSIAL: <Users className="h-3.5 w-3.5" />,
    BELAJAR: <BookOpen className="h-3.5 w-3.5" />,
    KARIR: <Briefcase className="h-3.5 w-3.5" />,
  };

  const fieldColors: Record<string, string> = {
    PRIBADI: "bg-rose-50 text-rose-600 border-rose-200",
    SOSIAL: "bg-emerald-50 text-emerald-600 border-emerald-200",
    BELAJAR: "bg-amber-50 text-amber-600 border-amber-200",
    KARIR: "bg-violet-50 text-violet-600 border-violet-200",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">Kelola User</h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "monitoring" ? "default" : "outline"}
          className={activeTab === "monitoring" ? "bg-teal-600 hover:bg-teal-700" : ""}
          onClick={() => setActiveTab("monitoring")}
        >
          <Activity className="h-4 w-4 mr-2" />
          Monitoring Survey
        </Button>
        <Button
          variant={activeTab === "users" ? "default" : "outline"}
          className={activeTab === "users" ? "bg-teal-600 hover:bg-teal-700" : ""}
          onClick={() => setActiveTab("users")}
        >
          <User className="h-4 w-4 mr-2" />
          Daftar User
        </Button>
      </div>

      {activeTab === "monitoring" ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="inline-flex p-2 rounded-lg bg-gray-100 mb-2"><Users className="h-5 w-5 text-gray-600" /></div>
                <p className="text-2xl font-bold text-gray-900">{summary.totalUsers}</p>
                <p className="text-xs text-gray-500">Total Siswa</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="inline-flex p-2 rounded-lg bg-emerald-100 mb-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
                <p className="text-2xl font-bold text-emerald-600">{summary.completedAll}</p>
                <p className="text-xs text-gray-500">Selesai Semua</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="inline-flex p-2 rounded-lg bg-amber-100 mb-2"><Timer className="h-5 w-5 text-amber-600" /></div>
                <p className="text-2xl font-bold text-amber-600">{summary.inProgress}</p>
                <p className="text-xs text-gray-500">Sedang Proses</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="inline-flex p-2 rounded-lg bg-rose-100 mb-2"><AlertCircle className="h-5 w-5 text-rose-600" /></div>
                <p className="text-2xl font-bold text-rose-600">{summary.notStarted}</p>
                <p className="text-xs text-gray-500">Belum Mulai</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-4 border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari siswa..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Filter Kelas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kelas</SelectItem>
                    <SelectItem value="7">Kelas 7</SelectItem>
                    <SelectItem value="8">Kelas 8</SelectItem>
                    <SelectItem value="9">Kelas 9</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status Survey" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status</SelectItem>
                    <SelectItem value="SELESAI">✅ Selesai Semua</SelectItem>
                    <SelectItem value="PROSES">⏳ Sedang Proses</SelectItem>
                    <SelectItem value="BELUM">❌ Belum Mulai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Monitoring Table */}
          {loading ? (
            <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded" /></div>
          ) : filteredUsers.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Tidak ada data siswa ditemukan</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead className="hidden md:table-cell">Kelas</TableHead>
                      <TableHead className="hidden lg:table-cell">No. WhatsApp</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => {
                      const user = u as Record<string, unknown>;
                      const surveyStatus = (user.surveyStatus || []) as Record<string, unknown>[];
                      const isExpanded = expandedUser === (user.id as string);
                      return (
                        <React.Fragment key={user.id as string}>
                          <TableRow
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => setExpandedUser(isExpanded ? null : (user.id as string))}
                          >
                            <TableCell>
                              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">
                                {(user.name as string)?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{user.name as string}</p>
                                <p className="text-xs text-gray-400">{user.email as string}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className="text-xs">Kelas {user.grade as number}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {(user.whatsapp as string) ? (
                                <a
                                  href={`https://wa.me/62${(user.whatsapp as string).replace(/^0+/, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="h-3 w-3" />
                                  {user.whatsapp as string}
                                </a>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress
                                  value={user.completionPercentage as number}
                                  className="h-2 flex-1"
                                />
                                <span className="text-xs font-medium text-gray-600 w-8 text-right">{user.completionPercentage as number}%</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {user.completedCount as number}/{user.totalSurveys as number} survey selesai
                              </p>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {(user.overallStatus === "SELESAI") && (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Selesai</Badge>
                              )}
                              {(user.overallStatus === "PROSES") && (
                                <Badge className="bg-amber-100 text-amber-700 text-xs"><Timer className="h-3 w-3 mr-1" />Proses</Badge>
                              )}
                              {(user.overallStatus === "BELUM") && (
                                <Badge className="bg-rose-100 text-rose-700 text-xs"><AlertCircle className="h-3 w-3 mr-1" />Belum</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                            </TableCell>
                          </TableRow>
                          {/* Expanded Detail Row */}
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={6} className="bg-gray-50/50 p-0">
                                <div className="p-4 pl-14">
                                  <div className="flex items-center gap-4 mb-3">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Detail Survey — Kelas {user.grade as number}
                                  </p>
                                  {(user.whatsapp as string) && (
                                    <a
                                      href={`https://wa.me/62${(user.whatsapp as string).replace(/^0+/, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline text-xs"
                                    >
                                      <Phone className="h-3 w-3" />
                                      WA: {user.whatsapp as string}
                                    </a>
                                  )}
                                </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {surveyStatus.map((s) => {
                                      const field = (s.field as string) || "PRIBADI";
                                      const completed = s.completed as boolean;
                                      const started = s.started as boolean;
                                      return (
                                        <div
                                          key={s.surveyId as string}
                                          className={`rounded-lg border p-3 flex items-center gap-3 ${
                                            completed
                                              ? "bg-emerald-50 border-emerald-200"
                                              : started
                                              ? "bg-amber-50 border-amber-200"
                                              : "bg-gray-50 border-gray-200"
                                          }`}
                                        >
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${fieldColors[field] || "bg-gray-100 text-gray-500"}`}>
                                            {fieldIcons[field] || <FileText className="h-3.5 w-3.5" />}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-gray-700 truncate">{FIELD_CONFIG[field]?.label || field}</p>
                                            <p className="text-[10px] text-gray-500">
                                              {completed
                                                ? `✅ Selesai${s.completedAt ? ` — ${new Date(s.completedAt as string).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}` : ""}`
                                                : started
                                                ? "⏳ Dikerjakan"
                                                : "❌ Belum mulai"}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* Users Tab - original user management */
        <>
          {loading ? <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded" /></div> : (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Daftar Siswa</CardTitle>
                <CardDescription>Kelola data siswa terdaftar</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="hidden md:table-cell">No. WhatsApp</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden lg:table-cell">Bergabung</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const user = u as Record<string, unknown>;
                      return (
                        <TableRow key={user.id as string}>
                          <TableCell className="font-medium">{user.name as string}</TableCell>
                          <TableCell>{user.email as string}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {(user.whatsapp as string) ? (
                              <a
                                href={`https://wa.me/62${(user.whatsapp as string).replace(/^0+/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline text-xs"
                              >
                                <Phone className="h-3 w-3" />
                                {user.whatsapp as string}
                              </a>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </TableCell>
                          <TableCell><Badge variant="outline">Kelas {user.grade as number}</Badge></TableCell>
                          <TableCell><Badge className="bg-gray-100 text-gray-700">USER</Badge></TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-gray-500">
                            {user.createdAt ? new Date(user.createdAt as string).toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit({ id: user.id as string, name: user.name as string, email: user.email as string, grade: user.grade as number, role: "USER", whatsapp: (user.whatsapp as string) || undefined })}><Edit className="h-4 w-4" /></Button>
                              <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => handleDelete(user.id as string)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {adminUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {u.whatsapp ? (
                            <a
                              href={`https://wa.me/62${u.whatsapp.replace(/^0+/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline text-xs"
                            >
                              <Phone className="h-3 w-3" />
                              {u.whatsapp}
                            </a>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="outline">Kelas {u.grade}</Badge></TableCell>
                        <TableCell><Badge className="bg-violet-100 text-violet-700">{u.role}</Badge></TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-gray-500">
                          {u.createdAt ? new Date(u.createdAt as string).toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(u)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div>
              <Label>No. WhatsApp</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">+62</span>
                <Input
                  placeholder="81234567890"
                  value={editForm.whatsapp}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value.replace(/[^0-9]/g, '') })}
                />
              </div>
            </div>
            <div><Label>Kelas</Label><Select value={editForm.grade} onValueChange={(v) => setEditForm({ ...editForm, grade: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Kelas 7</SelectItem><SelectItem value="8">Kelas 8</SelectItem><SelectItem value="9">Kelas 9</SelectItem></SelectContent></Select></div>
            <div><Label>Role</Label><Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USER">USER</SelectItem><SelectItem value="ADMIN">ADMIN</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Batal</Button>
            <Button onClick={handleSaveEdit} className="bg-teal-600 hover:bg-teal-700">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
