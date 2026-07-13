"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Search, RefreshCw, Edit, Trash2,
  CheckCircle2, XCircle, Calendar, ChevronDown, User,
  GraduationCap, Shield, Phone, ClipboardList, MessageSquare,
  Sparkles, FileText, Eye, AlertCircle, BookOpen, X, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  useAuth, apiFetch, FIELD_CONFIG, STATUS_CONFIG,
  type View, type UserData, type CounselingData,
  KopSurat, ProfilSiswa, handlePrintPDF, UserPhoto,
} from "@/lib/app-shared";

// TopicItem for per-item IYA/TIDAK tracking
interface TopicItem {
  text: string;
  answer: "IYA" | "TIDAK";
  checked: boolean; // Whether to include in Ringkasan Topik
  field?: string; // Bidang asal (PRIBADI, SOSIAL, BELAJAR, KARIR)
  questionId?: string; // Link to analysis question for reliable matching
}

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

  // Form data
  const [formData, setFormData] = useState({
    studentId: "",
    date: "",
    topic: "",
    field: "SEMUA",
    topicItems: [] as TopicItem[],
    ringkasan: "",
    notes: "",
    followUp: "",
    solusi: "",
    status: "TERJADWAL",
    bkOfficer: "",
  });

  // Student answers & AI
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [newTopicText, setNewTopicText] = useState("");
  const [showNewTopicInput, setShowNewTopicInput] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");

  // Problem students for select
  const [problemStudents, setProblemStudents] = useState<{ id: string; name: string; grade: number; iyaCount: number }[]>([]);

  // Kartu Konseling
  const [showKartuDialog, setShowKartuDialog] = useState(false);
  const [kartuCounseling, setKartuCounseling] = useState<CounselingData | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<Record<string, string>>({});
  const kartuRef = useRef<HTMLDivElement>(null);

  // Parse topicItems from JSON string
  const parseTopicItems = (raw: string | null | undefined): TopicItem[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) => ({
          text: String(item.text || ""),
          answer: item.answer === "IYA" || item.answer === "TIDAK" ? item.answer : "IYA" as const,
          checked: item.checked !== undefined ? Boolean(item.checked) : true,
          field: item.field ? String(item.field) : undefined,
          questionId: item.questionId ? String(item.questionId) : undefined,
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

  // Fetch counseling list
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
      setFormData(prev => ({ ...prev, topicItems: [] }));
      return;
    }
    setLoadingAnswers(true);
    try {
      const params = new URLSearchParams();
      params.set("studentId", studentId);
      if (field && field !== "ALL" && field !== "SEMUA") params.set("field", field);

      const data = await apiFetch(`/api/admin/counseling/student-answers?${params.toString()}`, {}, user.id, user.role, String(user.grade));
      const answers = data.iyaAnswers || [];

      // Auto-populate topicItems from IYA answers (include questionId for analysis linking)
      const items: TopicItem[] = answers.map((a: { questionText: string; field: string; questionId: string }) => ({
        text: a.questionText,
        answer: "IYA" as const,
        checked: true,
        field: a.field,
        questionId: a.questionId,
      }));

      if (items.length > 0) {
        const ringkasan = items.map(i => i.text).join("; ");
        const topicText = items.slice(0, 3).map(i => i.text).join("; ") + (items.length > 3 ? " ..." : "");
        setFormData(prev => ({ ...prev, topicItems: items, ringkasan, topic: prev.topic || topicText }));
      } else {
        setFormData(prev => ({ ...prev, topicItems: [], ringkasan: "" }));
      }
    } catch (err) {
      console.error(err);
      setFormData(prev => ({ ...prev, topicItems: [], ringkasan: "" }));
    } finally {
      setLoadingAnswers(false);
    }
  }, [user]);

  // Handle student change
  const handleStudentChange = (val: string) => {
    setFormData(prev => ({ ...prev, studentId: val }));
    if (val) {
      fetchStudentAnswers(val, formData.field);
    } else {
      setFormData(prev => ({ ...prev, topicItems: [] }));
    }
  };

  // Handle field change - THIS IS THE KEY: re-fetch answers filtered by field
  const handleFieldChange = (val: string) => {
    setFormData(prev => {
      const updated = { ...prev, field: val };
      // Re-fetch answers with the new field value
      if (prev.studentId) {
        fetchStudentAnswers(prev.studentId, val === "SEMUA" ? "SEMUA" : val);
      }
      return updated;
    });
  };

  // Toggle topic item answer (IYA ↔ TIDAK)
  const toggleTopicItem = (index: number) => {
    setFormData(prev => {
      const newItems = [...prev.topicItems];
      newItems[index] = {
        ...newItems[index],
        answer: newItems[index].answer === "IYA" ? "TIDAK" : "IYA",
      };
      // Auto-set status to SELESAI if all TIDAK
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

  // Toggle topic item checked (for ringkasan)
  const toggleTopicChecked = (index: number) => {
    setFormData(prev => {
      const newItems = [...prev.topicItems];
      newItems[index] = { ...newItems[index], checked: !newItems[index].checked };
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
      const newItems = [...prev.topicItems, { text: newTopicText.trim(), answer: "IYA" as const, checked: true, field: prev.field !== "SEMUA" ? prev.field : undefined }];
      const ringkasan = newItems.filter(i => i.checked).map(i => i.text).join("; ");
      return { ...prev, topicItems: newItems, ringkasan };
    });
    setNewTopicText("");
    setShowNewTopicInput(false);
  };

  // AI Generation — Generate ALL (Catatan + Tindak Lanjut + Solusi) in ONE click
  const handleGenerateAllAI = async () => {
    if (!user) return;
    if (formData.topicItems.length === 0 && !formData.topic) {
      toast({ title: "Error", description: "Pilih siswa atau isi topik terlebih dahulu", variant: "destructive" });
      return;
    }
    setGeneratingAI(true);
    try {
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

        // The API returns AI-generated content
        // Handle both new format and old format with catatan, tindakLanjut, solusi
        const notes = (data as any).notes ?? (data as any).catatan ?? "";
        const followUp = (data as any).followUp ?? (data as any).tindakLanjut ?? "";
        const solusi = (data as any).solusi ?? "";
        const ringkasan = (data as any).ringkasan ?? "";
        
        setFormData(prev => ({
          ...prev,
          notes: notes || prev.notes,
          followUp: followUp || prev.followUp,
          solusi: solusi || prev.solusi,
          ringkasan: ringkasan || prev.ringkasan,
        }));

      toast({ title: "Berhasil", description: "Catatan, Ringkasan, Tindak Lanjut, dan Solusi berhasil dihasilkan AI" });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gagal generate AI";
      // Add guidance if AI not configured
      const description = errMsg.includes('belum dikonfigurasi') || errMsg.includes('Belum Dikonfigurasi')
        ? `${errMsg} Klik Pengaturan → Konfigurasi AI di sidebar.`
        : errMsg;
      toast({ title: "Generate AI Gagal", description, variant: "destructive" });
    } finally {
      setGeneratingAI(false);
    }
  };

  // Open Add Dialog
  const openAddDialog = () => {
    setEditId(null);
    setFormData({
      studentId: "",
      date: "",
      topic: "",
      field: "SEMUA",
      topicItems: [],
      ringkasan: "",
      notes: "",
      followUp: "",
      solusi: "",
      status: "TERJADWAL",
      bkOfficer: "",
    });
    setNewTopicText("");
    setShowNewTopicInput(false);
    setStudentSearchTerm("");
    fetchProblemStudents();
    setShowDialog(true);
  };

  // Open Edit Dialog
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
      solusi: c.solusi || "",
      status: c.status,
      bkOfficer: c.bkOfficer,
    });
    setNewTopicText("");
    setShowNewTopicInput(false);
    // Don't call fetchStudentAnswers here — it would overwrite saved topicItems
    // (e.g., items already marked TIDAK or cleared after SELESAI would be lost).
    // The user can refresh items by changing the student or field dropdown.
    fetchProblemStudents();
    setShowDialog(true);
  };

  // Submit
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
        notes: formData.notes || null,
        followUp: formData.followUp || null,
        solusi: formData.solusi || null,
      };

      if (editId) {
        await apiFetch(`/api/admin/counseling/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }, user.id, user.role, String(user.grade));
        toast({ title: "Berhasil", description: "Sesi konseling berhasil diperbarui" });
        setShowDialog(false);
        // Clear form topicItems after SELESAI submit so they don't persist
        if (formData.status === "SELESAI") {
          setFormData(prev => ({ ...prev, topicItems: [], ringkasan: "" }));
        }
        fetchData();
      } else {
        const result = await apiFetch("/api/admin/counseling", {
          method: "POST",
          body: JSON.stringify(payload),
        }, user.id, user.role, String(user.grade));
        toast({ title: "Berhasil", description: "Sesi konseling berhasil ditambahkan" });
        setShowDialog(false);
        // Clear form topicItems after SELESAI submit so they don't persist
        if (formData.status === "SELESAI") {
          setFormData(prev => ({ ...prev, topicItems: [], ringkasan: "" }));
        }
        fetchData();
        // Open Kartu Konseling for newly created session
        if (result.counseling) {
          setKartuCounseling(result.counseling as CounselingData);
          setShowKartuDialog(true);
          // Fetch school settings for Kartu
          try {
            const settingsData = await apiFetch("/api/admin/settings", {}, user?.id, user?.role, String(user?.grade));
            const settings: Record<string, string> = {};
            if (settingsData.settings && typeof settingsData.settings === "object") {
              for (const [key, value] of Object.entries(settingsData.settings)) {
                settings[key] = value;
              }
            }
            setSchoolSettings(settings);
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

  // Delete
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

  // Open Kartu Dialog
  const openKartuDialog = async (c: CounselingData) => {
    setKartuCounseling(c);
    setShowKartuDialog(true);
    try {
      const data = await apiFetch("/api/admin/settings", {}, user?.id, user?.role, String(user?.grade));
      const settings: Record<string, string> = {};
      if (data.settings && typeof data.settings === "object") {
        for (const [key, value] of Object.entries(data.settings)) {
          settings[key] = value;
        }
      }
      setSchoolSettings(settings);
    } catch {
      setSchoolSettings({});
    }
  };

  // Stats
  const totalSessions = counselings.length;
  const terjadwal = counselings.filter(c => c.status === "TERJADWAL").length;
  const selesai = counselings.filter(c => c.status === "SELESAI").length;

  // Get student info for kartu
  const kartuStudent = kartuCounseling?.student
    ? { name: kartuCounseling.student.name, email: kartuCounseling.student.email, grade: kartuCounseling.student.grade, whatsapp: kartuCounseling.student.whatsapp, jenisKelamin: kartuCounseling.student.jenisKelamin || null }
    : null;

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
        <div className="flex items-center gap-2">
          <a
            href="https://preview-chat-3a7ced49-d3b8-44df-9baf-0d4c1727c671.space-z.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <BookOpen className="h-4 w-4" /> Panduan Konselor
          </a>
          <Button onClick={openAddDialog} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" /> Tambah Sesi
          </Button>
        </div>
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
                            <Badge variant="outline" className="text-xs">{cTidakPct}% TIDAK</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{c.student.name}</span>
                          <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />Kelas {c.student.grade}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(c.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                          <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" />{c.bkOfficer}</span>
                        </div>
                        {cItems.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${cTidakPct >= 100 ? "bg-emerald-500" : cTidakPct >= 90 ? "bg-teal-500" : cTidakPct >= 75 ? "bg-amber-500" : cTidakPct >= 50 ? "bg-orange-500" : "bg-rose-500"}`} style={{ width: `${cTidakPct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 shrink-0">{cTidakCount} TIDAK / {cItems.length}</span>
                          </div>
                        )}
                        {/* Pernyataan Masalah — langsung tampil di card untuk TERJADWAL & SELESAI */}
                        {cItems.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
                              <ClipboardList className="h-3 w-3" />
                              Pernyataan Masalah
                            </p>
                            <div className="space-y-1">
                              {cItems.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm bg-white/70 rounded-lg px-2.5 py-1.5 border border-gray-100">
                                  <span className="text-gray-400 w-5 text-right shrink-0 text-xs pt-0.5">{idx + 1}.</span>
                                  <span className="flex-1 text-gray-700 text-xs leading-relaxed">{item.text}</span>
                                  <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${item.answer === "IYA" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"} border`}>
                                    {item.answer}
                                  </Badge>
                                </div>
                              ))}
                              {cItems.length > 5 && (
                                <p className="text-xs text-gray-400 pl-7">+{cItems.length - 5} pernyataan lainnya (klik untuk melihat semua)</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-teal-600" onClick={() => openKartuDialog(c)} title="Kartu Konseling">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openEditDialog(c)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-gray-200/50">
                        {cItems.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-gray-400 mb-2">TOPIK PERNYATAAN</p>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                              {cItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm bg-white rounded-lg px-3 py-2 border">
                                  <span className="text-gray-500 w-6 text-right shrink-0 text-xs">{idx + 1}.</span>
                                  <span className="flex-1 text-gray-700">{item.text}</span>
                                  {item.field && (
                                    <Badge variant="outline" className="text-[10px] shrink-0">{item.field}</Badge>
                                  )}
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
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">{c.notes || <span className="italic text-gray-400">Tidak ada catatan</span>}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-1">TINDAK LANJUT</p>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">{c.followUp || <span className="italic text-gray-400">Belum ada tindak lanjut</span>}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-1">SOLUSI</p>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">{c.solusi || <span className="italic text-gray-400">Belum ada solusi</span>}</p>
                          </div>
                        </div>
                        {c.student.whatsapp && (
                          <div className="mt-3">
                            <a
                              href={`https://wa.me/${c.student.whatsapp.startsWith("0") ? "62" + c.student.whatsapp.slice(1) : c.student.whatsapp.startsWith("62") ? c.student.whatsapp : "62" + c.student.whatsapp}`}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 hover:underline"
                            >
                              <Phone className="h-3.5 w-3.5" />WhatsApp: {c.student.whatsapp}
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

      {/* ==================== ADD/EDIT DIALOG ==================== */}
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
              <div className="flex gap-2">
                <Select value={formData.studentId} onValueChange={handleStudentChange}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih siswa bermasalah" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {(problemStudents.length > 0 ? problemStudents : students)
                      .filter((s) => !studentSearchTerm || s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                      .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — Kelas {s.grade}{"iyaCount" in s && s.iyaCount > 0 ? ` (${s.iyaCount} masalah)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative w-[180px] shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Cari nama siswa..."
                    className="pl-8 h-9 text-sm"
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">Hanya menampilkan siswa yang memiliki jawaban IYA (bermasalah)</p>
              {formData.studentId && (() => {
                const sel = students.find(s => s.id === formData.studentId);
                if (!sel) return null;
                return (
                  <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100 mt-2">
                    <UserPhoto user={sel} size="lg" className="ring-2 ring-teal-200" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{sel.name}</p>
                      <p className="text-sm text-gray-500">
                        Kelas {sel.grade}{sel.jenisKelamin ? ` • ${sel.jenisKelamin === "L" ? "Laki-laki" : sel.jenisKelamin === "P" ? "Perempuan" : sel.jenisKelamin}` : ""}{sel.whatsapp ? ` • ${sel.whatsapp}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })()}
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

            {/* 3. Bidang — KEY FEATURE: filters topic list */}
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
              <p className="text-xs text-gray-400">
                {formData.field === "SEMUA"
                  ? "Menampilkan topik dari semua bidang"
                  : `Hanya menampilkan topik bidang ${FIELD_CONFIG[formData.field]?.label || formData.field}`}
              </p>
            </div>

            {/* 4. Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(val) => {
                if (val === "SELESAI") {
                  // Auto-set all topicItems to TIDAK when marking as SELESAI
                  // Use functional updater to avoid stale closure bugs
                  setFormData(prev => {
                    if (prev.topicItems.length > 0) {
                      const newItems = prev.topicItems.map(item => ({
                        ...item,
                        answer: "TIDAK" as const,
                      }));
                      const ringkasan = newItems.filter(i => i.checked).map(i => i.text).join("; ");
                      return { ...prev, status: val, topicItems: newItems, ringkasan };
                    }
                    return { ...prev, status: val };
                  });
                } else {
                  setFormData(prev => ({ ...prev, status: val }));
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TERJADWAL">Terjadwal</SelectItem>
                  <SelectItem value="SELESAI">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 5. Topik Konseling — filtered by bidang */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Topik Konseling
                </Label>
                {loadingAnswers && <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />}
              </div>

              {/* Topic Items from student answers */}
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

              {/* Add custom topic */}
              {showNewTopicInput ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Masukkan topik baru..."
                    value={newTopicText}
                    onChange={(e) => setNewTopicText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTopicItem()}
                    className="flex-1"
                    autoFocus
                  />
                  <Button type="button" size="sm" onClick={addTopicItem} className="bg-teal-600 hover:bg-teal-700">Tambah</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setShowNewTopicInput(false); setNewTopicText(""); }}>Batal</Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewTopicInput(true)} className="w-full">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Topik Manual
                </Button>
              )}

              {/* Topic text input */}
              <Input
                placeholder="Topik konseling (otomatis dari masalah terpilih)"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              />
              <p className="text-xs text-gray-400">Topik otomatis dari masalah terpilih, atau ketik manual</p>
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

            <Separator />

            {/* GENERATE ALL AI — single button for Catatan, Tindak Lanjut, Solusi */}
            <div className="space-y-2">
              <Button
                type="button"
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                disabled={generatingAI || (!formData.topic && formData.topicItems.length === 0)}
                onClick={handleGenerateAllAI}
              >
                {generatingAI ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {generatingAI ? "Menghasilkan AI..." : "Generate AI Semua (Catatan, Tindak Lanjut & Solusi)"}
              </Button>
              <p className="text-xs text-gray-400 text-center">
                Klik sekali untuk mengisi otomatis Catatan, Tindak Lanjut, dan Solusi menggunakan AI.
                {!formData.topic && formData.topicItems.length === 0 && " Pilih siswa terlebih dahulu."}
              </p>
              <p className="text-xs text-amber-500 text-center">
                Jika gagal, pastikan AI sudah dikonfigurasi di menu Pengaturan → Konfigurasi AI
              </p>
            </div>

            <Separator />

            {/* 7. Ringkasan */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Ringkasan Konseling
              </Label>
              <Textarea
                placeholder="Ringkasan konseling (otomatis dari topik)"
                value={formData.ringkasan}
                onChange={(e) => setFormData({ ...formData, ringkasan: e.target.value })}
                rows={2}
              />
              <p className="text-xs text-gray-400">Otomatis terisi dari topik terpilih, dapat diedit</p>
            </div>

            {/* 8. Catatan */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Catatan
              </Label>
              <Textarea
                placeholder="Catatan sesi konseling..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* 9. Tindak Lanjut */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Tindak Lanjut
              </Label>
              <Textarea
                placeholder="Rencana tindak lanjut..."
                value={formData.followUp}
                onChange={(e) => setFormData({ ...formData, followUp: e.target.value })}
                rows={3}
              />
            </div>

            {/* 10. Solusi */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Solusi
              </Label>
              <Textarea
                placeholder="Solusi dan rekomendasi..."
                value={formData.solusi}
                onChange={(e) => setFormData({ ...formData, solusi: e.target.value })}
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

      {/* ==================== KARTU KONSELING DIALOG ==================== */}
      <Dialog open={showKartuDialog} onOpenChange={setShowKartuDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kartu Konseling</DialogTitle>
            <DialogDescription>Detail sesi konseling siswa</DialogDescription>
          </DialogHeader>

          <div id="kartu-konseling-content" ref={kartuRef} className="bg-white p-6 print:p-4">
            {/* Kop Surat */}
            <KopSurat schoolSettings={schoolSettings} />

            <div className="text-center mb-4">
              <h3 className="text-lg font-bold uppercase">Kartu Konseling</h3>
            </div>

            {/* Profil Siswa */}
            {kartuStudent && <ProfilSiswa student={kartuStudent} />}

            {/* Counseling Details */}
            {kartuCounseling && (
              <div className="mt-4">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 w-40 text-gray-600 font-medium">Tanggal</td>
                      <td className="py-2">: {new Date(kartuCounseling.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-600 font-medium">Bidang</td>
                      <td className="py-2">: {FIELD_CONFIG[kartuCounseling.field]?.label || kartuCounseling.field}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-600 font-medium">Topik</td>
                      <td className="py-2">: {kartuCounseling.topic}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-600 font-medium">Status</td>
                      <td className="py-2">: {STATUS_CONFIG[kartuCounseling.status]?.label || kartuCounseling.status}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-600 font-medium">Petugas BK</td>
                      <td className="py-2">: {kartuCounseling.bkOfficer}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Topic Items */}
                {(() => {
                  const items = parseTopicItems(kartuCounseling.topicItems);
                  if (items.length === 0) return null;
                  return (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">Pernyataan Masalah:</p>
                      <div className="space-y-1">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500 w-6 text-right shrink-0">{idx + 1}.</span>
                            <span className="flex-1">{item.text}</span>
                            <span className={`text-xs font-medium ${item.answer === "IYA" ? "text-amber-700" : "text-emerald-700"}`}>
                              [{item.answer}]
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {(kartuCounseling.ringkasan || kartuCounseling.notes || kartuCounseling.followUp || kartuCounseling.solusi) && (
                  <div className="mt-4 space-y-3">
                    {kartuCounseling.ringkasan && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Ringkasan:</p>
                        <p className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded border">{kartuCounseling.ringkasan}</p>
                      </div>
                    )}
                    {kartuCounseling.notes && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Catatan:</p>
                        <p className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded border">{kartuCounseling.notes}</p>
                      </div>
                    )}
                    {kartuCounseling.followUp && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Tindak Lanjut:</p>
                        <p className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded border">{kartuCounseling.followUp}</p>
                      </div>
                    )}
                    {kartuCounseling.solusi && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Solusi:</p>
                        <p className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded border">{kartuCounseling.solusi}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handlePrintPDF("kartu-konseling-content")}>
              <Printer className="h-4 w-4 mr-2" /> Cetak / PDF
            </Button>
            <Button variant="outline" onClick={() => setShowKartuDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
