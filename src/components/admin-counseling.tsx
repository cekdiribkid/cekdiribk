"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Search, RefreshCw, Edit, Trash2, CheckCircle2, XCircle, X, User, GraduationCap, Calendar, Shield, FileText, Phone, ClipboardList, Zap, Eye, MessageSquare, ChevronDown, BookOpen, FileDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, FIELD_CONFIG, type View, type UserData, KopSurat, ProfilSiswa, handlePrintPDF } from "@/lib/app-shared";

// ==================== ADMIN COUNSELING ====================
interface TopicItem {
  text: string;
  answer: "IYA" | "TIDAK";
  checked: boolean; // Whether to include in Ringkasan Topik
  field?: string; // Bidang asal (PRIBADI, SOSIAL, BELAJAR, KARIR)
}

interface CounselingData {
  id: string;
  studentId: string;
  date: string;
  topic: string;
  field: string;
  topicItems: string | null; // JSON string of TopicItem[]
  ringkasan: string | null;
  notes: string | null;
  followUp: string | null;
  solution: string | null;
  status: string;
  bkOfficer: string;
  createdAt: string;
  student: { id: string; name: string; email: string; grade: number; whatsapp: string | null; jenisKelamin?: string | null };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  TERJADWAL: { label: "Terjadwal", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-300", icon: <Calendar className="h-3.5 w-3.5" /> },
  SELESAI: { label: "Selesai", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-300", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },

};

export default function AdminCounseling({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [counselings, setCounselings] = useState<CounselingData[]>([]);
  const [students, setStudents] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterGrade, setFilterGrade] = useState("ALL");
  const [filterField, setFilterField] = useState("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    studentId: "",
    date: "",
    topic: "",
    field: "PRIBADI",
    topicItems: [] as TopicItem[],
    ringkasan: "",
    notes: "",
    followUp: "",
    solution: "",
    status: "TERJADWAL",
    bkOfficer: "",
  });
  // Student answers & AI
  const [studentAnswers, setStudentAnswers] = useState<{ questionId: string; questionText: string; field: string; value: string }[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [newTopicText, setNewTopicText] = useState("");
  const [showNewTopicInput, setShowNewTopicInput] = useState(false);
  // Problem students for select
  const [problemStudents, setProblemStudents] = useState<{ id: string; name: string; grade: number; iyaCount: number }[]>([]);
  // Kartu Konseling
  const [showKartuDialog, setShowKartuDialog] = useState(false);
  const [kartuCounseling, setKartuCounseling] = useState<CounselingData | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterField !== "ALL") params.set("field", filterField);
      if (filterGrade !== "ALL") params.set("grade", filterGrade);
      if (searchTerm) params.set("search", searchTerm);

      const [counselingData, userData] = await Promise.all([
        apiFetch(`/api/admin/counseling?${params.toString()}`, {}, user.id, user.role, String(user.grade)),
        apiFetch("/api/admin/users", {}, user.id, user.role, String(user.grade)),
      ]);
      setCounselings(counselingData.counselings || []);
      setStudents((userData.users || []).filter((u: UserData) => u.role === "USER"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, filterStatus, filterField, filterGrade, searchTerm]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch problem students
  const fetchProblemStudents = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch("/api/admin/counseling/problem-students", {}, user.id, user.role, String(user.grade));
      setProblemStudents(data.students || []);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  // Fetch student IYA answers when studentId or field changes
  const fetchStudentAnswers = useCallback(async (studentId: string, field: string) => {
    if (!user || !studentId) {
      setStudentAnswers([]);
      return;
    }
    setLoadingAnswers(true);
    try {
      const params = new URLSearchParams();
      params.set("studentId", studentId);
      if (field && field !== "ALL" && field !== "SEMUA") params.set("field", field);
      const data = await apiFetch(`/api/admin/counseling/student-answers?${params.toString()}`, {}, user.id, user.role, String(user.grade));
      const answers = (data.iyaAnswers || []).map((a: { questionId: string; questionText: string; field: string; value: string }) => ({
        questionId: a.questionId,
        questionText: a.questionText,
        field: a.field,
        value: a.value,
      }));
      setStudentAnswers(answers);
      // Auto-populate topicItems from IYA answers
      const items: TopicItem[] = answers.map((a: { questionText: string; field: string }) => ({
        text: a.questionText,
        answer: "IYA" as const,
        checked: true,
        field: a.field,
      }));
      if (items.length > 0) {
        const ringkasan = items.map(i => i.text).join("; ");
        setFormData(prev => ({ ...prev, topicItems: items, ringkasan }));
      } else {
        setFormData(prev => ({ ...prev, topicItems: [], ringkasan: "" }));
      }
    } catch (err) {
      console.error(err);
      setStudentAnswers([]);
      setFormData(prev => ({ ...prev, topicItems: [], ringkasan: "" }));
    } finally {
      setLoadingAnswers(false);
    }
  }, [user]);

  // Handle studentId change
  const handleStudentChange = (val: string) => {
    setFormData(prev => ({ ...prev, studentId: val }));
    if (val) {
      fetchStudentAnswers(val, formData.field);
    } else {
      setStudentAnswers([]);
      setFormData(prev => ({ ...prev, topicItems: [] }));
    }
  };

  // Handle field change
  const handleFieldChange = (val: string) => {
    setFormData(prev => {
      const updated = { ...prev, field: val };
      // Fetch answers with the new field value using the studentId from prev
      if (prev.studentId) {
        fetchStudentAnswers(prev.studentId, val === "SEMUA" ? "SEMUA" : val);
      }
      return updated;
    });
  };

  // Toggle topic item answer
  const toggleTopicItem = (index: number) => {
    setFormData(prev => {
      const newItems = [...prev.topicItems];
      newItems[index] = {
        ...newItems[index],
        answer: newItems[index].answer === "IYA" ? "TIDAK" : "IYA",
      };
      // Auto-set status to SELESAI if all TIDAK
      const allTidak = newItems.length > 0 && newItems.every(item => item.answer === "TIDAK");
      // Auto-update ringkasan from checked items
      const ringkasan = newItems.filter(i => i.checked).map(i => i.text).join("; ");
      return {
        ...prev,
        topicItems: newItems,
        ringkasan,
        status: allTidak ? "SELESAI" : prev.status === "SELESAI" && !allTidak ? "TERJADWAL" : prev.status,
      };
    });
  };

  // Toggle topic item checked (for ringkasan)
  const toggleTopicChecked = (index: number) => {
    setFormData(prev => {
      const newItems = [...prev.topicItems];
      newItems[index] = {
        ...newItems[index],
        checked: !newItems[index].checked,
      };
      const ringkasan = newItems.filter(i => i.checked).map(i => i.text).join("; ");
      return { ...prev, topicItems: newItems, ringkasan };
    });
  };

  // Update topic item text
  const updateTopicItemText = (index: number, text: string) => {
    setFormData(prev => {
      const newItems = [...prev.topicItems];
      newItems[index] = { ...newItems[index], text };
      const ringkasan = newItems.filter(i => i.checked).map(i => i.text).join("; ");
      return { ...prev, topicItems: newItems, ringkasan };
    });
  };

  // Remove topic item
  const removeTopicItem = (index: number) => {
    setFormData(prev => {
      const newItems = prev.topicItems.filter((_, i) => i !== index);
      const allTidak = newItems.length > 0 && newItems.every(item => item.answer === "TIDAK");
      const ringkasan = newItems.filter(i => i.checked).map(i => i.text).join("; ");
      return {
        ...prev,
        topicItems: newItems,
        ringkasan,
        status: allTidak ? "SELESAI" : prev.status === "SELESAI" && !allTidak ? "TERJADWAL" : prev.status,
      };
    });
  };

  // Add custom topic item
  const addTopicItem = () => {
    if (!newTopicText.trim()) return;
    setFormData(prev => {
      const newItems = [...prev.topicItems, { text: newTopicText.trim(), answer: "IYA" as const, checked: true }];
      const ringkasan = newItems.filter(i => i.checked).map(i => i.text).join("; ");
      return { ...prev, topicItems: newItems, ringkasan };
    });
    setNewTopicText("");
    setShowNewTopicInput(false);
  };

  // Generate AI content
  const handleGenerateAI = async () => {
    if (!user) return;
    if (formData.topicItems.length === 0 && !formData.topic) {
      toast({ title: "Error", description: "Pilih siswa atau isi topik terlebih dahulu", variant: "destructive" });
      return;
    }
    setGeneratingAI(true);
    try {
      // Find student from both students and problemStudents arrays
      const selectedStudent = students.find(s => s.id === formData.studentId) 
        || problemStudents.find(s => s.id === formData.studentId);
      const data = await apiFetch("/api/admin/counseling/generate-ai", {
        method: "POST",
        body: JSON.stringify({
          topic: formData.topic,
          field: formData.field,
          studentName: selectedStudent?.name || "",
          grade: selectedStudent?.grade || "",
          topicItems: formData.topicItems,
        }),
      }, user.id, user.role, String(user.grade));
      setFormData(prev => ({
        ...prev,
        notes: data.notes || prev.notes,
        followUp: data.followUp || prev.followUp,
        solution: data.solution || prev.solution,
      }));
      toast({ title: "Berhasil", description: "Konten AI berhasil di-generate" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal generate AI", variant: "destructive" });
    } finally {
      setGeneratingAI(false);
    }
  };

  // Parse topicItems from JSON string
  const parseTopicItems = (raw: string | null): TopicItem[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Ensure backward compatibility: default checked to true if missing
        return parsed.map((item: Record<string, unknown>) => ({
          text: String(item.text || ""),
          answer: item.answer === "IYA" || item.answer === "TIDAK" ? item.answer : "IYA" as const,
          checked: item.checked !== undefined ? Boolean(item.checked) : true,
        }));
      }
      return [];
    } catch {
      return [];
    }
  };

  // TIDAK-based: higher TIDAK% = fewer problems = better grade
  const tidakCount = formData.topicItems.filter(i => i.answer === "TIDAK").length;
  const totalItems = formData.topicItems.length;
  const tidakPercentage = totalItems > 0 ? Math.round((tidakCount / totalItems) * 100) : 0;

  const openAddDialog = () => {
    setEditId(null);
    setFormData({ studentId: "", date: "", topic: "", field: "SEMUA", topicItems: [], ringkasan: "", notes: "", followUp: "", solution: "", status: "TERJADWAL", bkOfficer: "" });
    setStudentAnswers([]);
    setNewTopicText("");
    setShowNewTopicInput(false);
    fetchProblemStudents();
    setShowDialog(true);
  };

  const openEditDialog = (c: CounselingData) => {
    setEditId(c.id);
    const dateStr = new Date(c.date).toISOString().slice(0, 16);
    const items = parseTopicItems(c.topicItems);
    setFormData({
      studentId: c.studentId,
      date: dateStr,
      topic: c.topic,
      field: c.field,
      topicItems: items,
      ringkasan: c.ringkasan || "",
      notes: c.notes || "",
      followUp: c.followUp || "",
      solution: c.solution || "",
      status: c.status,
      bkOfficer: c.bkOfficer,
    });
    setNewTopicText("");
    setShowNewTopicInput(false);
    // Fetch answers for context
    if (c.studentId && user) {
      fetchStudentAnswers(c.studentId, c.field === "SEMUA" ? "SEMUA" : c.field);
    }
    fetchProblemStudents();
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    // Auto-generate topic from checked topicItems
    let finalTopic = formData.topic;
    const checkedItems = formData.topicItems.filter(i => i.checked);
    if (!finalTopic && checkedItems.length > 0) {
      finalTopic = checkedItems.slice(0, 3).map(i => i.text).join("; ");
      if (checkedItems.length > 3) finalTopic += " ...";
    } else if (!finalTopic && formData.topicItems.length > 0) {
      const iyaItems = formData.topicItems.filter(i => i.answer === "IYA");
      if (iyaItems.length > 0) {
        finalTopic = iyaItems.slice(0, 3).map(i => i.text).join("; ");
        if (iyaItems.length > 3) finalTopic += " ...";
      } else {
        finalTopic = formData.topicItems.slice(0, 3).map(i => i.text).join("; ");
      }
    }
    if (!formData.studentId || !formData.date || !finalTopic || !formData.field || !formData.bkOfficer) {
      toast({ title: "Error", description: "Lengkapi field wajib (Siswa, Tanggal, Topik/Bidang, Petugas BK)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        topic: finalTopic,
        topicItems: formData.topicItems.length > 0 ? JSON.stringify(formData.topicItems) : null,
        ringkasan: formData.ringkasan || null,
      };
      if (editId) {
        await apiFetch(`/api/admin/counseling/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }, user.id, user.role, String(user.grade));
        toast({ title: "Berhasil", description: "Sesi konseling berhasil diperbarui" });
        setShowDialog(false);
        fetchData();
      } else {
        const result = await apiFetch("/api/admin/counseling", {
          method: "POST",
          body: JSON.stringify(payload),
        }, user.id, user.role, String(user.grade));
        toast({ title: "Berhasil", description: "Sesi konseling berhasil ditambahkan" });
        setShowDialog(false);
        fetchData();
        // Open Kartu Konseling for newly created session
        if (result.counseling) {
          setKartuCounseling(result.counseling);
          setShowKartuDialog(true);
          // Fetch school settings for Kartu
          try {
            const settingsData = await apiFetch("/api/admin/settings", {}, user?.id, user?.role, String(user?.grade));
            setSchoolSettings(settingsData.settings || {});
          } catch {
            setSchoolSettings({});
          }
        }
      }
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await apiFetch(`/api/admin/counseling/${id}`, { method: "DELETE" }, user.id, user.role, String(user.grade));
      toast({ title: "Berhasil", description: "Sesi konseling berhasil dihapus" });
      fetchData();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" });
    }
  };

  // Open Kartu Konseling
  const openKartuDialog = async (c: CounselingData) => {
    setKartuCounseling(c);
    setShowKartuDialog(true);
    // Fetch school settings
    try {
      const data = await apiFetch("/api/admin/settings", {}, user?.id, user?.role, String(user?.grade));
      setSchoolSettings(data.settings || {});
    } catch {
      setSchoolSettings({});
    }
  };

  // Stats
  const totalSessions = counselings.length;
  const terjadwal = counselings.filter(c => c.status === "TERJADWAL").length;
  const selesai = counselings.filter(c => c.status === "SELESAI").length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Konseling BK</h2>
            <p className="text-sm text-gray-500">Kelola sesi konseling dan tindak lanjut siswa</p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" /> Tambah Sesi
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-2 border-gray-100">
          <CardContent className="p-4 text-center">
            <ClipboardList className="h-6 w-6 mx-auto mb-1 text-gray-500" />
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-xs text-gray-500">Total Sesi</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-100">
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold text-blue-700">{terjadwal}</p>
            <p className="text-xs text-gray-500">Terjadwal</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-emerald-100">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold text-emerald-700">{selesai}</p>
            <p className="text-xs text-gray-500">Selesai</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari nama siswa, topik, atau catatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="TERJADWAL">Terjadwal</SelectItem>
                <SelectItem value="SELESAI">Selesai</SelectItem>
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
            <Button variant="outline" size="icon" onClick={() => fetchData()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Counseling List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-5"><div className="h-4 bg-gray-200 rounded w-3/4 mb-3" /><div className="h-3 bg-gray-200 rounded w-1/2" /></CardContent></Card>
          ))}
        </div>
      ) : counselings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">Belum ada sesi konseling</p>
            <p className="text-sm text-gray-400">Klik &quot;Tambah Sesi&quot; untuk menambahkan sesi konseling baru</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {counselings.map((c) => {
            const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.TERJADWAL;
            const fieldCfg = FIELD_CONFIG[c.field] || FIELD_CONFIG.PRIBADI;
            const isExpanded = expandedId === c.id;
            const cItems = parseTopicItems(c.topicItems);
            const cTidakCount = cItems.filter(i => i.answer === "TIDAK").length;
            const cTidakPct = cItems.length > 0 ? Math.round((cTidakCount / cItems.length) * 100) : 0;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`border-2 ${statusCfg.borderColor} ${statusCfg.bgColor} overflow-hidden`}>
                  <CardContent className="p-4">
                    {/* Main Row */}
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-white/80 ${fieldCfg.color} shrink-0`}>
                        {fieldCfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold text-gray-900">{c.topic}</h4>
                          <Badge className={`${statusCfg.bgColor} ${statusCfg.color} border ${statusCfg.borderColor} text-xs`}>
                            {statusCfg.icon}
                            <span className="ml-1">{statusCfg.label}</span>
                          </Badge>
                          <Badge variant="outline" className="text-xs">{fieldCfg.label}</Badge>
                          {cItems.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {cTidakPct}% TIDAK
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {c.student.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3.5 w-3.5" />
                            Kelas {c.student.grade}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(c.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5" />
                            {c.bkOfficer}
                          </span>
                        </div>
                        {/* Mini progress bar for topic items */}
                        {cItems.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${cTidakPct >= 100 ? "bg-emerald-500" : cTidakPct >= 90 ? "bg-teal-500" : cTidakPct >= 75 ? "bg-amber-500" : cTidakPct >= 50 ? "bg-orange-500" : "bg-rose-500"}`}
                                style={{ width: `${cTidakPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 shrink-0">{cTidakCount} TIDAK / {cItems.length}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-teal-600 hover:text-teal-700" onClick={() => openKartuDialog(c)} title="Kartu Konseling">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" onClick={() => openEditDialog(c)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-gray-200/50">
                        {/* Topic Items */}
                        {cItems.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-gray-400 mb-2">TOPIK PERNYATAAN</p>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                              {cItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm bg-white rounded-lg px-3 py-2 border">
                                  <span className="text-gray-500 w-6 text-right shrink-0">{idx + 1}.</span>
                                  <span className="flex-1 text-gray-700">{item.text}</span>
                                  <Badge className={`text-xs ${item.answer === "IYA" ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-emerald-50 text-emerald-700 border-emerald-300"} border`}>
                                    {item.answer}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-1">CATATAN</p>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">
                              {c.notes || <span className="italic text-gray-400">Tidak ada catatan</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-1">TINDAK LANJUT</p>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">
                              {c.followUp || <span className="italic text-gray-400">Belum ada tindak lanjut</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-1">SOLUSI</p>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">
                              {c.solution || <span className="italic text-gray-400">Belum ada solusi</span>}
                            </p>
                          </div>
                        </div>
                        {c.student.whatsapp && (
                          <div className="mt-3">
                            <a
                              href={`https://wa.me/${c.student.whatsapp.startsWith("0") ? "62" + c.student.whatsapp.slice(1) : c.student.whatsapp.startsWith("62") ? c.student.whatsapp : "62" + c.student.whatsapp}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 hover:underline"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              WhatsApp: {c.student.whatsapp}
                            </a>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Sesi Konseling" : "Tambah Sesi Konseling"}</DialogTitle>
            <DialogDescription>
              {editId ? "Perbarui data sesi konseling" : "Isi data untuk sesi konseling baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 1. Pilih Siswa */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Pilih Siswa <span className="text-rose-500">*</span>
              </Label>
              <Select value={formData.studentId} onValueChange={handleStudentChange}>
                <SelectTrigger><SelectValue placeholder="Pilih siswa bermasalah" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {(problemStudents.length > 0 ? problemStudents : students).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — Kelas {s.grade}{"iyaCount" in s && s.iyaCount > 0 ? ` (${s.iyaCount} masalah)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Hanya menampilkan siswa yang memiliki jawaban IYA (bermasalah)</p>
            </div>

            {/* 2. Tanggal Konseling */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Tanggal Konseling <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            {/* 3. Bidang */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Bidang <span className="text-rose-500">*</span>
              </Label>
              <Select value={formData.field} onValueChange={handleFieldChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua Bidang</SelectItem>
                  <SelectItem value="PRIBADI">Pribadi</SelectItem>
                  <SelectItem value="SOSIAL">Sosial</SelectItem>
                  <SelectItem value="BELAJAR">Belajar</SelectItem>
                  <SelectItem value="KARIR">Karir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TERJADWAL">Terjadwal</SelectItem>
                  <SelectItem value="SELESAI">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 5. Topik Konseling */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Topik Konseling (dari Jawaban Siswa)
                </Label>
                {loadingAnswers && <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />}
              </div>
              {formData.topicItems.length > 0 && (
                <div className="space-y-2">
                  {/* Percentage bar — TIDAK-based: higher TIDAK% = fewer problems = better grade */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${tidakPercentage >= 100 ? "bg-emerald-500" : tidakPercentage >= 90 ? "bg-teal-500" : tidakPercentage >= 75 ? "bg-amber-500" : tidakPercentage >= 50 ? "bg-orange-500" : "bg-rose-500"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${tidakPercentage}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 shrink-0">{tidakPercentage}% TIDAK ({tidakCount}/{totalItems})</span>
                  </div>
                  {/* Topic items list */}
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 border rounded-lg p-3 bg-gray-50/50">
                    {formData.topicItems.map((item, idx) => {
                      const itemFieldCfg = item.field ? FIELD_CONFIG[item.field] : null;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm bg-white rounded-lg px-3 py-2 border group">
                          {/* Checkbox for ringkasan */}
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleTopicChecked(idx)}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0 cursor-pointer"
                            title="Centang untuk masuk ke Ringkasan Topik"
                          />
                          <span className="text-gray-400 w-6 text-right shrink-0 text-xs">{idx + 1}.</span>
                          {/* Field badge */}
                          {itemFieldCfg && (
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${itemFieldCfg.color} bg-white/60 border`}>
                              {item.field}
                            </span>
                          )}
                          {/* Editable text */}
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => updateTopicItemText(idx, e.target.value)}
                            className="flex-1 text-gray-700 text-xs md:text-sm bg-transparent border-none outline-none focus:ring-0 p-0 min-w-0"
                          />
                          {/* IYA/TIDAK toggle */}
                          <button
                            type="button"
                            onClick={() => toggleTopicItem(idx)}
                            className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                              item.answer === "IYA"
                                ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                            }`}
                          >
                            {item.answer}
                          </button>
                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => removeTopicItem(idx)}
                            className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Add new topic item */}
              {showNewTopicInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Masukkan pernyataan baru..."
                    value={newTopicText}
                    onChange={(e) => setNewTopicText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopicItem(); } }}
                    className="text-sm"
                    autoFocus
                  />
                  <Button type="button" size="sm" onClick={addTopicItem} className="bg-teal-600 hover:bg-teal-700 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setShowNewTopicInput(false); setNewTopicText(""); }} className="shrink-0">
                    Batal
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewTopicInput(true)} className="w-full border-dashed">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Pernyataan Custom
                </Button>
              )}
              {formData.topicItems.length === 0 && !loadingAnswers && (
                <p className="text-xs text-gray-400 italic">Pilih siswa dan bidang untuk auto-populate dari jawaban survei, atau tambah pernyataan manual</p>
              )}
            </div>

            {/* 6. Petugas BK */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Petugas BK <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Nama petugas BK"
                value={formData.bkOfficer}
                onChange={(e) => setFormData({ ...formData, bkOfficer: e.target.value })}
              />
            </div>

            {/* 7. Ringkasan Konseling */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Ringkasan Konseling
              </Label>
              <Textarea
                placeholder="Ringkasan topik konseling (auto-generated dari topik yang dicentang)..."
                value={formData.ringkasan}
                onChange={(e) => setFormData({ ...formData, ringkasan: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-gray-400">Auto-generated dari topik yang dicentang. Anda juga dapat mengedit manual.</p>
            </div>

            <Separator />

            {/* AI Generate Button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateAI}
                disabled={generatingAI || (formData.topicItems.length === 0 && !formData.topic)}
                className="flex-1 border-teal-300 text-teal-700 hover:bg-teal-50"
              >
                {generatingAI ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {generatingAI ? "Generating AI..." : "Generate AI (Catatan, Tindak Lanjut, Solusi)"}
              </Button>
            </div>

            {/* 8. Catatan */}
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Catatan sesi konseling..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            {/* 9. Tindak Lanjut */}
            <div className="space-y-2">
              <Label>Tindak Lanjut</Label>
              <Textarea
                placeholder="Rencana tindak lanjut..."
                value={formData.followUp}
                onChange={(e) => setFormData({ ...formData, followUp: e.target.value })}
                rows={3}
              />
            </div>
            {/* 10. Solusi */}
            <div className="space-y-2">
              <Label>Solusi</Label>
              <Textarea
                placeholder="Solusi dan saran untuk siswa..."
                value={formData.solution}
                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {editId ? "Simpan Perubahan" : "Tambah Sesi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kartu Konseling Dialog */}
      <Dialog open={showKartuDialog} onOpenChange={setShowKartuDialog}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              Kartu Konseling
            </DialogTitle>
            <DialogDescription>Cetak atau simpan kartu konseling siswa</DialogDescription>
          </DialogHeader>
          {kartuCounseling && (
            <>
              <div id="kartu-konseling-content" className="bg-white p-6 text-gray-900 text-sm border rounded-lg">
                {/* Kop Surat */}
                <KopSurat schoolSettings={schoolSettings} />

                {/* Title */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold uppercase tracking-wide">Kartu Konseling Siswa</h3>
                  <p className="text-xs text-gray-500">
                    Bidang {kartuCounseling.field === "SEMUA" ? "Semua Bidang" : (FIELD_CONFIG[kartuCounseling.field]?.label || kartuCounseling.field)} — {new Date(kartuCounseling.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>

                {/* Student Profile */}
                <ProfilSiswa student={{
                  name: kartuCounseling.student.name,
                  grade: kartuCounseling.student.grade,
                  jenisKelamin: kartuCounseling.student.jenisKelamin || null,
                  whatsapp: kartuCounseling.student.whatsapp || null,
                  email: kartuCounseling.student.email,
                  createdAt: null,
                }} />

                {/* Topic */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm uppercase mb-1 border-b pb-1">TOPIK</h3>
                  <p className="text-sm">{kartuCounseling.topic}</p>
                </div>

                {/* Topic Items Table */}
                {(() => {
                  const kartuItems = parseTopicItems(kartuCounseling.topicItems);
                  if (kartuItems.length === 0) return null;
                  return (
                    <div className="mb-4">
                      <h3 className="font-bold text-sm uppercase mb-2 border-b pb-1">DAFTAR PERNYATAAN</h3>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border px-3 py-2 text-center w-10">No</th>
                            <th className="border px-3 py-2 text-left">Pernyataan</th>
                            <th className="border px-3 py-2 text-center w-24">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kartuItems.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="border px-3 py-2 text-center">{idx + 1}</td>
                              <td className="border px-3 py-2">{item.text}</td>
                              <td className="border px-3 py-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.answer === "IYA" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                                  {item.answer}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <span>IYA: {kartuItems.filter(i => i.answer === "IYA").length}</span>
                        <span>•</span>
                        <span>TIDAK: {kartuItems.filter(i => i.answer === "TIDAK").length}</span>
                        <span>•</span>
                        <span>Progres: {kartuItems.length > 0 ? Math.round((kartuItems.filter(i => i.answer === "TIDAK").length / kartuItems.length) * 100) : 0}% selesai</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Ringkasan Konseling */}
                {kartuCounseling.ringkasan && (
                  <div className="mb-4">
                    <h3 className="font-bold text-sm uppercase mb-1 border-b pb-1">RINGKASAN KONSELING</h3>
                    <p className="text-sm whitespace-pre-wrap mt-2">{kartuCounseling.ringkasan}</p>
                  </div>
                )}

                {/* Catatan */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm uppercase mb-1 border-b pb-1">CATATAN</h3>
                  <p className="text-sm whitespace-pre-wrap mt-2">{kartuCounseling.notes || "Tidak ada catatan"}</p>
                </div>

                {/* Tindak Lanjut */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm uppercase mb-1 border-b pb-1">TINDAK LANJUT</h3>
                  <p className="text-sm whitespace-pre-wrap mt-2">{kartuCounseling.followUp || "Belum ada tindak lanjut"}</p>
                </div>

                {/* Solusi */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm uppercase mb-1 border-b pb-1">SOLUSI</h3>
                  <p className="text-sm whitespace-pre-wrap mt-2">{kartuCounseling.solution || "Belum ada solusi"}</p>
                </div>

                {/* Signature Area */}
                <div className="mt-8 flex justify-between">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Mengetahui,</p>
                    <p className="text-xs text-gray-500">Kepala Sekolah</p>
                    <div className="h-20" />
                    <p className="text-sm font-medium border-b border-black inline-block min-w-[150px]">
                      {schoolSettings.schoolName || "............................"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Petugas BK,</p>
                    <div className="h-20" />
                    <p className="text-sm font-medium border-b border-black inline-block min-w-[150px]">
                      {kartuCounseling.bkOfficer}
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-row gap-2 sm:justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePrintPDF("kartu-konseling-content")}
                    className="gap-1.5"
                  >
                    <FileDown className="h-4 w-4" />
                    Cetak
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handlePrintPDF("kartu-konseling-content")}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    Simpan PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => { /* View just keeps the dialog open */ }}
                  >
                    <Eye className="h-4 w-4" />
                    Lihat
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setShowKartuDialog(false)}>
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
