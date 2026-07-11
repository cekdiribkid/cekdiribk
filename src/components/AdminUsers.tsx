"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Edit, Trash2, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronRight, Users, UserCheck, UserX,
  ShieldHalf, Eye, EyeOff, KeyRound, Lock, Mail, Phone, Search, X,
  Camera, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, FIELD_CONFIG, UserPhoto, type View, type UserData } from "@/lib/app-shared";

interface SurveyStatusItem {
  surveyId: string;
  title: string;
  field: string;
  completed: boolean;
  completedAt: string | null;
}

interface FieldStatusItem {
  field: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
}

interface UserWithStatus extends UserData {
  totalSurveys: number;
  completedSurveys: number;
  overallStatus: "SELESAI" | "PROSES" | "BELUM";
  surveyStatus: SurveyStatusItem[];
  fieldStatus: FieldStatusItem[];
}

interface EditFormState {
  name: string;
  email: string;
  whatsapp: string;
  grade: string;
  role: string;
  jenisKelamin: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AdminUsers({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithStatus | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: "",
    email: "",
    whatsapp: "",
    grade: "7",
    role: "USER",
    jenisKelamin: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPhotoData, setEditPhotoData] = useState<string>("");
  const [editPhotoChanged, setEditPhotoChanged] = useState(false);
  const [editPhotoRemoved, setEditPhotoRemoved] = useState(false);
  const editFileInputRef = React.useRef<HTMLInputElement>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set);
  const [activeTab, setActiveTab] = useState("monitoring");
  const [searchQuery, setSearchQuery] = useState("");

  const loadUsers = useCallback(() => {
    if (!currentUser) return;
    apiFetch("/api/admin/users", {}, currentUser.id, currentUser.role, String(currentUser.grade))
      .then((data) => {
        setUsers(data.users || []);
        setAdminUsers(data.adminUsers || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleEdit = (u: UserWithStatus) => {
    setEditingUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      whatsapp: u.whatsapp || "",
      grade: String(u.grade),
      role: u.role,
      jenisKelamin: u.jenisKelamin || "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowPasswordFields(false);
    setShowPassword(false);
    setEditPhotoData(u.image || "");
    setEditPhotoChanged(false);
    setEditPhotoRemoved(false);
  };

  // Handle photo file selection in edit dialog
  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "File harus berupa gambar", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Ukuran foto maksimal 2 MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditPhotoData(reader.result as string);
      setEditPhotoChanged(true);
      setEditPhotoRemoved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleEditRemovePhoto = () => {
    setEditPhotoData("");
    setEditPhotoChanged(false);
    setEditPhotoRemoved(true);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const handleSaveEdit = async () => {
    if (!currentUser || !editingUser) return;

    // Validate password fields if user is changing password
    if (showPasswordFields) {
      if (!editForm.newPassword.trim()) {
        toast({ title: "Validasi", description: "Password baru tidak boleh kosong", variant: "destructive" });
        return;
      }
      if (editForm.newPassword.length < 6) {
        toast({ title: "Validasi", description: "Password minimal 6 karakter", variant: "destructive" });
        return;
      }
      if (editForm.newPassword !== editForm.confirmPassword) {
        toast({ title: "Validasi", description: "Konfirmasi password tidak cocok", variant: "destructive" });
        return;
      }
    }

    // Build payload — only include fields that should be updated
    const payload: Record<string, unknown> = {
      name: editForm.name,
      email: editForm.email,
      whatsapp: editForm.whatsapp,
      grade: editForm.grade,
      role: editForm.role,
      jenisKelamin: editForm.jenisKelamin || null,
    };
    if (showPasswordFields && editForm.newPassword.trim()) {
      payload.password = editForm.newPassword;
    }
    if (editPhotoChanged && editPhotoData) {
      payload.image = editPhotoData;
    } else if (editPhotoRemoved) {
      payload.image = null;
    }

    setSaving(true);
    try {
      await apiFetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }, currentUser.id, currentUser.role, String(currentUser.grade));

      const changedFields: string[] = [];
      if (editForm.name !== editingUser.name) changedFields.push("nama");
      if (editForm.email !== editingUser.email) changedFields.push("email");
      if (editForm.whatsapp !== (editingUser.whatsapp || "")) changedFields.push("WhatsApp");
      if (String(editForm.grade) !== String(editingUser.grade)) changedFields.push("kelas");
      if (editForm.role !== editingUser.role) changedFields.push("role");
      if (editForm.jenisKelamin !== (editingUser.jenisKelamin || "")) changedFields.push("jenis kelamin");
      if (showPasswordFields) changedFields.push("password");
      if (editPhotoChanged) changedFields.push("foto");
      else if (editPhotoRemoved) changedFields.push("hapus foto");

      toast({
        title: "Berhasil",
        description: changedFields.length > 0
          ? `User diperbarui (${changedFields.join(", ")})`
          : "User berhasil diperbarui",
      });
      setEditingUser(null);
      loadUsers();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal memperbarui", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string, role: string) => {
    if (!currentUser) return;
    const roleLabel = role === "ADMIN" ? "admin" : "siswa";
    if (!confirm(`Yakin ingin menghapus ${roleLabel} "${name}"?\nTindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: `${roleLabel === "admin" ? "User admin" : "Siswa"} berhasil dihapus` });
      loadUsers();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal menghapus", variant: "destructive" });
    }
  };

  const toggleExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Filter only USER role for survey monitoring
  const matchesSearch = (u: UserData) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      String(u.grade).includes(q) ||
      (u.whatsapp || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  };

  const allStudentUsers = users.filter((u) => u.role === "USER");
  const allAdminUsers = adminUsers;
  // Filtered versions for display
  const studentUsers = allStudentUsers.filter(matchesSearch);
  const completedStudents = studentUsers.filter((u) => u.overallStatus === "SELESAI");
  const incompleteStudents = studentUsers.filter((u) => u.overallStatus !== "SELESAI");
  const filteredAdminUsers = allAdminUsers.filter(matchesSearch);
  const isSearching = searchQuery.trim().length > 0;

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "SELESAI") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    if (status === "PROSES") return <Clock className="h-5 w-5 text-amber-500" />;
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "SELESAI") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Selesai Semua</Badge>;
    if (status === "PROSES") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Clock className="h-3 w-3 mr-1" />Sedang Proses</Badge>;
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><AlertCircle className="h-3 w-3 mr-1" />Belum Mulai</Badge>;
  };

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-8"><div className="animate-pulse"><div className="h-64 bg-gray-200 rounded" /></div></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">Kelola User</h2>
        <Badge className="bg-indigo-100 text-indigo-700">
          {allStudentUsers.length} siswa · {allAdminUsers.length} admin
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Search Box - persists across tabs */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari siswa / admin: nama, kelas, WhatsApp, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              aria-label="Pencarian user"
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
          {isSearching && (
            <span className="text-xs text-gray-500 self-start sm:self-auto">
              Menampilkan <strong className="text-teal-700">{studentUsers.length + filteredAdminUsers.length}</strong> dari{" "}
              <strong>{allStudentUsers.length + allAdminUsers.length}</strong> user
            </span>
          )}
        </div>

        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4">
          <TabsTrigger value="monitoring" className="flex items-center gap-1">
            <Users className="h-4 w-4" /> Monitoring
            {isSearching ? (
              <Badge className="bg-teal-100 text-teal-700 ml-1 text-[10px] px-1.5">{studentUsers.length}</Badge>
            ) : (
              <Badge className="bg-indigo-100 text-indigo-700 ml-1 text-[10px] px-1.5">{allStudentUsers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="selesai" className="flex items-center gap-1">
            <UserCheck className="h-4 w-4" /> Selesai
            <Badge className="bg-emerald-100 text-emerald-700 ml-1 text-[10px] px-1.5">{completedStudents.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="belum" className="flex items-center gap-1">
            <UserX className="h-4 w-4" /> Belum Selesai
            <Badge className="bg-red-100 text-red-700 ml-1 text-[10px] px-1.5">{incompleteStudents.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-1">
            <ShieldHalf className="h-4 w-4" /> User Admin
            <Badge className="bg-indigo-100 text-indigo-700 ml-1 text-[10px] px-1.5">{filteredAdminUsers.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ============ MONITORING SURVEY TAB ============ */}
        <TabsContent value="monitoring">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-teal-600" />
                Monitoring Survey Siswa
              </CardTitle>
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Selesai: <strong>{completedStudents.length}</strong>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Clock className="h-4 w-4 text-amber-500" /> Proses: <strong>{studentUsers.filter(u => u.overallStatus === "PROSES").length}</strong>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <AlertCircle className="h-4 w-4 text-red-500" /> Belum: <strong>{studentUsers.filter(u => u.overallStatus === "BELUM").length}</strong>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Nama</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                        {isSearching ? (
                          <>Tidak ada siswa yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;</>
                        ) : (
                          <>Belum ada siswa terdaftar</>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentUsers.map((u) => {
                    const isExpanded = expandedUsers.has(u.id);
                    return (
                      <React.Fragment key={u.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleExpanded(u.id)}
                        >
                          <TableCell>
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserPhoto user={u} size="sm" />
                              <span className="font-medium">{u.name}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">Kelas {u.grade}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${u.overallStatus === "SELESAI" ? "bg-emerald-500" : u.overallStatus === "PROSES" ? "bg-amber-400" : "bg-gray-300"}`}
                                  style={{ width: `${u.totalSurveys > 0 ? (u.completedSurveys / u.totalSurveys) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{u.completedSurveys}/{u.totalSurveys}</span>
                            </div>
                          </TableCell>
                          <TableCell><StatusBadge status={u.overallStatus} /></TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(u)} title="Edit user"><Edit className="h-4 w-4" /></Button>
                              <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => handleDelete(u.id, u.name, u.role)} title="Hapus user"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Expanded per-survey detail */}
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-gray-50 p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {u.fieldStatus.map((fs) => {
                                  const cfg = FIELD_CONFIG[fs.field];
                                  return (
                                    <div key={fs.field} className={`p-3 rounded-lg border ${fs.completed ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={cfg?.color || "text-gray-500"}>{cfg?.icon}</span>
                                        <span className="text-sm font-medium">{cfg?.label || fs.field}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {fs.completed ? (
                                          <>
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            <span className="text-xs text-emerald-700 font-medium">Selesai</span>
                                          </>
                                        ) : (
                                          <>
                                            <AlertCircle className="h-4 w-4 text-red-400" />
                                            <span className="text-xs text-red-600 font-medium">Belum</span>
                                          </>
                                        )}
                                      </div>
                                      {fs.completedAt && (
                                        <p className="text-[10px] text-gray-400 mt-1">
                                          {new Date(fs.completedAt).toLocaleDateString("id-ID")}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ SISWA SELESAI TAB ============ */}
        <TabsContent value="selesai">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                Siswa Selesai Semua Survey
                <Badge className="bg-emerald-100 text-emerald-700">{completedStudents.length} siswa</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {completedStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <UserCheck className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  {isSearching ? (
                    <>Tidak ada siswa selesai yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;</>
                  ) : (
                    <>Belum ada siswa yang menyelesaikan semua survey</>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedStudents.map((u, idx) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-center text-gray-500">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserPhoto user={u} size="sm" />
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">Kelas {u.grade}</Badge></TableCell>
                        <TableCell className="text-center">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 inline-block" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ SISWA BELUM SELESAI TAB ============ */}
        <TabsContent value="belum">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-600" />
                Siswa Belum Selesai Semua Survey
                <Badge className="bg-red-100 text-red-700">{incompleteStudents.length} siswa</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {incompleteStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-400" />
                  {isSearching ? (
                    <>Tidak ada siswa belum-selesai yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;</>
                  ) : (
                    <>Semua siswa sudah menyelesaikan survey!</>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead className="text-center">Selesai/Total</TableHead>
                      <TableHead>Belum Selesai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incompleteStudents.map((u, idx) => {
                      const missingFields = u.fieldStatus.filter((f) => !f.completed);
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="text-center text-gray-500">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserPhoto user={u} size="sm" />
                              <span className="font-medium">{u.name}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">Kelas {u.grade}</Badge></TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm">
                              <span className="font-semibold text-amber-600">{u.completedSurveys}</span>
                              <span className="text-gray-400">/</span>
                              <span>{u.totalSurveys}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {missingFields.map((f) => {
                                const cfg = FIELD_CONFIG[f.field];
                                return (
                                  <Badge key={f.field} className={`${cfg?.bgColor || "bg-gray-100"} ${cfg?.color || "text-gray-600"} text-xs border`} variant="outline">
                                    {cfg?.icon && <span className="mr-0.5">{cfg.icon}</span>}
                                    {f.field}
                                  </Badge>
                                );
                              })}
                              {missingFields.length === 0 && u.overallStatus === "BELUM" && (
                                <Badge className="bg-red-100 text-red-700 text-xs">Belum mulai</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ USER ADMIN TAB ============ */}
        <TabsContent value="admin">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldHalf className="h-5 w-5 text-indigo-600" />
                Daftar User Admin
                <Badge className="bg-indigo-100 text-indigo-700">{filteredAdminUsers.length} admin</Badge>
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Klik tombol edit untuk mengubah nama, email, no. WhatsApp, atau password admin.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {filteredAdminUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <ShieldHalf className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  {isSearching ? (
                    <>Tidak ada admin yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;</>
                  ) : (
                    <>Belum ada user admin terdaftar</>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>No. WhatsApp</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdminUsers.map((u, idx) => (
                      <TableRow key={u.id} className="hover:bg-gray-50">
                        <TableCell className="text-center text-gray-500">{idx + 1}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <UserPhoto user={u} size="sm" />
                            <span>{u.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{u.email}</TableCell>
                        <TableCell className="text-sm text-gray-600">{u.whatsapp || <span className="text-gray-400 italic">Belum diisi</span>}</TableCell>
                        <TableCell>
                          <Badge className="bg-indigo-100 text-indigo-700">
                            <ShieldHalf className="h-3 w-3 mr-1" /> {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(u)} title="Edit user">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {/* Don't allow deleting yourself */}
                            {currentUser?.id !== u.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-rose-600 hover:text-rose-700"
                                onClick={() => handleDelete(u.id, u.name, u.role)}
                                title="Hapus user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Edit Dialog ===== */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-teal-600" />
              Edit User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* User type badge */}
            {editingUser && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                {editingUser.role === "ADMIN" ? (
                  <ShieldHalf className="h-4 w-4 text-indigo-600" />
                ) : (
                  <Users className="h-4 w-4 text-teal-600" />
                )}
                <span className="text-xs text-gray-600">
                  Mengedit {editingUser.role === "ADMIN" ? "user admin" : "siswa"}: <strong>{editingUser.name}</strong>
                </span>
              </div>
            )}

            {/* Photo upload */}
            <div className="flex flex-col items-center gap-2">
              <Label className="text-sm font-medium">Foto Profil</Label>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleEditPhotoChange}
                className="hidden"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="group relative w-24 h-24 rounded-full border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/50 hover:bg-teal-50 flex items-center justify-center overflow-hidden transition-colors"
                  title="Klik untuk upload/ganti foto"
                >
                  {editPhotoData ? (
                    <img src={editPhotoData} alt="Foto user" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="flex flex-col items-center text-teal-500">
                      <Camera className="h-7 w-7" />
                      <Upload className="h-3 w-3 mt-0.5" />
                    </div>
                  )}
                </button>
                {editPhotoData && (
                  <button
                    type="button"
                    onClick={handleEditRemovePhoto}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md"
                    title="Hapus foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                {editPhotoData ? "Klik foto untuk ganti. Jika dihapus, tampil logo sekolah." : "Opsional. Jika kosong, tampil logo sekolah. Maks. 2 MB."}
              </p>
            </div>

            {/* Nama */}
            <div>
              <Label className="flex items-center gap-1.5 mb-1">
                <Users className="h-3.5 w-3.5 text-gray-500" /> Nama
              </Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>

            {/* Email */}
            <div>
              <Label className="flex items-center gap-1.5 mb-1">
                <Mail className="h-3.5 w-3.5 text-gray-500" /> Email
              </Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>

            {/* WhatsApp */}
            <div>
              <Label className="flex items-center gap-1.5 mb-1">
                <Phone className="h-3.5 w-3.5 text-gray-500" /> No. WhatsApp
              </Label>
              <Input
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={editForm.whatsapp}
                onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
              />
              <p className="text-[11px] text-gray-400 mt-1">Format: 08xxxxxxxxxx atau +62xxxxxxxxxxx</p>
            </div>

            {/* Jenis Kelamin */}
            <div>
              <Label className="mb-1">Jenis Kelamin</Label>
              <Select value={editForm.jenisKelamin} onValueChange={(v) => setEditForm({ ...editForm, jenisKelamin: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAKI-LAKI">Laki-laki</SelectItem>
                  <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kelas — only relevant for students but editable for both */}
            <div>
              <Label className="mb-1">Kelas</Label>
              <Select value={editForm.grade} onValueChange={(v) => setEditForm({ ...editForm, grade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Kelas 7</SelectItem>
                  <SelectItem value="8">Kelas 8</SelectItem>
                  <SelectItem value="9">Kelas 9</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Role */}
            <div>
              <Label className="mb-1">Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER (Siswa)</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ===== Password change section ===== */}
            <div className="pt-2 border-t border-gray-200">
              {!showPasswordFields ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordFields(true)}
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <KeyRound className="h-4 w-4 mr-1.5" /> Ubah Password
                </Button>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-amber-800">
                      <Lock className="h-3.5 w-3.5" /> Ubah Password
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowPasswordFields(false);
                        setEditForm({ ...editForm, newPassword: "", confirmPassword: "" });
                      }}
                      className="h-7 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Batal
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs mb-1">Password Baru</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 6 karakter"
                        value={editForm.newPassword}
                        onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1">Konfirmasi Password Baru</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Ulangi password baru"
                      value={editForm.confirmPassword}
                      onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                    />
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Password baru akan aktif setelah disimpan. User harus login ulang dengan password baru.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={saving}>Batal</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
