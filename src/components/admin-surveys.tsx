"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Search, Edit, Trash2, RefreshCw, CheckCircle2, XCircle, ChevronUp, ChevronDown, Filter, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, FIELD_CONFIG, type View, type SurveyData, type QuestionData } from "@/lib/app-shared";

export default function AdminSurveys({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user: currentUser } = useAuth();
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", description: "", grade: "7", field: "PRIBADI", questionsText: "" });
  const [editingSurvey, setEditingSurvey] = useState<SurveyData | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", grade: "7", field: "PRIBADI", active: true });
  // Per-pernyataan states
  const [expandedSurveyId, setExpandedSurveyId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [addingToSurveyId, setAddingToSurveyId] = useState<string | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  // Filter
  const [filterGrade, setFilterGrade] = useState("ALL");
  const [filterField, setFilterField] = useState("ALL");

  const loadSurveys = useCallback(() => {
    if (!currentUser) return;
    apiFetch("/api/admin/surveys", {}, currentUser.id, currentUser.role, String(currentUser.grade))
      .then((data) => setSurveys(data.surveys || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => { loadSurveys(); }, [loadSurveys]);

  // Filter surveys
  const filteredSurveys = surveys.filter((s) => {
    if (filterGrade !== "ALL" && String(s.grade) !== filterGrade) return false;
    if (filterField !== "ALL" && s.field !== filterField) return false;
    return true;
  });

  // Stats
  const totalPernyataan = filteredSurveys.reduce((acc, s) => acc + (s.questions?.length || s._count?.questions || 0), 0);
  const activeSurveys = filteredSurveys.filter((s) => s.active).length;

  const handleCreate = async () => {
    if (!currentUser) return;
    const questions = createForm.questionsText.split("\n").filter((q) => q.trim());
    if (questions.length === 0) {
      toast({ title: "Error", description: "Masukkan minimal 1 pernyataan", variant: "destructive" });
      return;
    }
    try {
      await apiFetch("/api/admin/surveys", {
        method: "POST",
        body: JSON.stringify({ ...createForm, grade: Number(createForm.grade), questions: questions.map((text) => ({ text })) }),
      }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "Survey berhasil dibuat" });
      setShowCreate(false);
      setCreateForm({ title: "", description: "", grade: "7", field: "PRIBADI", questionsText: "" });
      loadSurveys();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal membuat survey", variant: "destructive" });
    }
  };

  const handleEdit = (s: SurveyData) => {
    setEditingSurvey(s);
    setEditForm({
      title: s.title,
      description: s.description,
      grade: String(s.grade),
      field: s.field,
      active: s.active,
    });
  };

  const handleSaveEdit = async () => {
    if (!currentUser || !editingSurvey) return;
    try {
      await apiFetch(`/api/admin/surveys/${editingSurvey.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...editForm, grade: Number(editForm.grade) }),
      }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "Survey berhasil diperbarui" });
      setEditingSurvey(null);
      loadSurveys();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal memperbarui", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    if (!confirm("Yakin ingin menghapus survey ini? Semua pernyataan dan respons akan ikut terhapus.")) return;
    try {
      await apiFetch(`/api/admin/surveys/${id}`, { method: "DELETE" }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "Survey berhasil dihapus" });
      if (expandedSurveyId === id) setExpandedSurveyId(null);
      loadSurveys();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal menghapus", variant: "destructive" });
    }
  };

  // Toggle active
  const handleToggleActive = async (s: SurveyData) => {
    if (!currentUser) return;
    try {
      await apiFetch(`/api/admin/surveys/${s.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: !s.active }),
      }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: s.active ? "Survey dinonaktifkan" : "Survey diaktifkan" });
      loadSurveys();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal mengubah status", variant: "destructive" });
    }
  };

  // === Per-Pernyataan CRUD ===
  const handleAddQuestion = async () => {
    if (!currentUser || !addingToSurveyId || !newQuestionText.trim()) return;
    setSavingQuestion(true);
    try {
      await apiFetch(`/api/admin/surveys/${addingToSurveyId}/questions`, {
        method: "POST",
        body: JSON.stringify({ text: newQuestionText.trim() }),
      }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "Pernyataan berhasil ditambahkan" });
      setNewQuestionText("");
      setAddingToSurveyId(null);
      loadSurveys();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal menambahkan pernyataan", variant: "destructive" });
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleEditQuestion = (q: QuestionData) => {
    setEditingQuestionId(q.id);
    setEditQuestionText(q.text);
  };

  const handleSaveEditQuestion = async (surveyId: string) => {
    if (!currentUser || !editingQuestionId || !editQuestionText.trim()) return;
    setSavingQuestion(true);
    try {
      await apiFetch(`/api/admin/surveys/${surveyId}/questions/${editingQuestionId}`, {
        method: "PUT",
        body: JSON.stringify({ text: editQuestionText.trim() }),
      }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "Pernyataan berhasil diperbarui" });
      setEditingQuestionId(null);
      setEditQuestionText("");
      loadSurveys();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal memperbarui pernyataan", variant: "destructive" });
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (surveyId: string, questionId: string) => {
    if (!currentUser) return;
    if (!confirm("Yakin ingin menghapus pernyataan ini?")) return;
    setDeletingQuestionId(questionId);
    try {
      await apiFetch(`/api/admin/surveys/${surveyId}/questions/${questionId}`, {
        method: "DELETE",
      }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "Pernyataan berhasil dihapus" });
      if (editingQuestionId === questionId) {
        setEditingQuestionId(null);
        setEditQuestionText("");
      }
      loadSurveys();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal menghapus pernyataan", variant: "destructive" });
    } finally {
      setDeletingQuestionId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-bold">Kelola Survey</h2>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" /> Buat Survey
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{filteredSurveys.length}</p>
            <p className="text-xs text-gray-500">Total Survey</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{activeSurveys}</p>
            <p className="text-xs text-gray-500">Survey Aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{totalPernyataan}</p>
            <p className="text-xs text-gray-500">Total Pernyataan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{filteredSurveys.reduce((a, s) => a + (s._count?.responses || 0), 0)}</p>
            <p className="text-xs text-gray-500">Total Respons</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-[130px]"><Filter className="h-4 w-4 mr-2 text-gray-400" /><SelectValue placeholder="Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Kelas</SelectItem>
            <SelectItem value="7">Kelas 7</SelectItem>
            <SelectItem value="8">Kelas 8</SelectItem>
            <SelectItem value="9">Kelas 9</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterField} onValueChange={setFilterField}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Bidang" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Bidang</SelectItem>
            <SelectItem value="PRIBADI">Pribadi</SelectItem>
            <SelectItem value="SOSIAL">Sosial</SelectItem>
            <SelectItem value="BELAJAR">Belajar</SelectItem>
            <SelectItem value="KARIR">Karir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredSurveys.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Belum ada survey</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSurveys.map((s) => {
            const cfg = FIELD_CONFIG[s.field] || FIELD_CONFIG.PRIBADI;
            const isExpanded = expandedSurveyId === s.id;
            const questions = s.questions || [];
            return (
              <Card key={s.id} className={`border-2 overflow-hidden transition-all ${s.active ? "border-gray-200" : "border-gray-300 opacity-70"}`}>
                {/* Survey Header */}
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => setExpandedSurveyId(isExpanded ? null : s.id)}
                    >
                      <div className={`p-2.5 rounded-xl ${cfg.color} bg-white/80`}>{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{s.title}</h4>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <Badge variant="outline" className="text-xs">Kelas {s.grade}</Badge>
                          <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                          <Badge variant="outline" className="text-xs">{s._count?.questions || 0} Pernyataan</Badge>
                          <Badge variant="outline" className="text-xs">{s._count?.responses || 0} Respons</Badge>
                          {s.active ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">Aktif</Badge>
                          ) : (
                            <Badge className="bg-gray-200 text-gray-600 text-xs">Nonaktif</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(s)} title={s.active ? "Nonaktifkan" : "Aktifkan"}>
                        {s.active ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(s)} title="Edit Survey">
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(s.id)} title="Hapus Survey">
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedSurveyId(isExpanded ? null : s.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>

                {/* Expanded: List of Pernyataan */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t bg-gray-50/80">
                        <div className="px-4 py-3 flex items-center justify-between bg-white/60 border-b">
                          <h5 className="text-sm font-semibold text-gray-700">Daftar Pernyataan ({questions.length})</h5>
                          <Button
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700 h-7 text-xs"
                            onClick={() => {
                              setAddingToSurveyId(s.id);
                              setNewQuestionText("");
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Tambah Pernyataan
                          </Button>
                        </div>

                        {/* Add Question Inline */}
                        <AnimatePresence>
                          {addingToSurveyId === s.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 py-3 bg-teal-50 border-b border-teal-200">
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <Input
                                      placeholder="Masukkan teks pernyataan baru..."
                                      value={newQuestionText}
                                      onChange={(e) => setNewQuestionText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey && newQuestionText.trim()) {
                                          e.preventDefault();
                                          handleAddQuestion();
                                        }
                                      }}
                                      autoFocus
                                      disabled={savingQuestion}
                                    />
                                  </div>
                                  <Button
                                    onClick={handleAddQuestion}
                                    disabled={!newQuestionText.trim() || savingQuestion}
                                    className="bg-teal-600 hover:bg-teal-700"
                                  >
                                    {savingQuestion ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Simpan"}
                                  </Button>
                                  <Button variant="outline" onClick={() => { setAddingToSurveyId(null); setNewQuestionText(""); }} disabled={savingQuestion}>
                                    Batal
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Questions List */}
                        <div className="max-h-96 overflow-y-auto">
                          {questions.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">
                              Belum ada pernyataan
                            </div>
                          ) : (
                            <div className="divide-y">
                              {questions.map((q, idx) => (
                                <div
                                  key={q.id}
                                  className={`px-4 py-2.5 flex items-start gap-3 group hover:bg-white/80 transition-colors ${deletingQuestionId === q.id ? "opacity-50" : ""}`}
                                >
                                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-semibold mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    {editingQuestionId === q.id ? (
                                      <div className="flex gap-2">
                                        <Input
                                          value={editQuestionText}
                                          onChange={(e) => setEditQuestionText(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && editQuestionText.trim()) {
                                              handleSaveEditQuestion(s.id);
                                            }
                                            if (e.key === "Escape") {
                                              setEditingQuestionId(null);
                                              setEditQuestionText("");
                                            }
                                          }}
                                          autoFocus
                                          disabled={savingQuestion}
                                          className="flex-1"
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveEditQuestion(s.id)}
                                          disabled={!editQuestionText.trim() || savingQuestion}
                                          className="bg-teal-600 hover:bg-teal-700 h-9"
                                        >
                                          {savingQuestion ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Simpan"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => { setEditingQuestionId(null); setEditQuestionText(""); }}
                                          disabled={savingQuestion}
                                          className="h-9"
                                        >
                                          Batal
                                        </Button>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-700 leading-relaxed">{q.text}</p>
                                    )}
                                  </div>
                                  {editingQuestionId !== q.id && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleEditQuestion(q)}
                                        title="Edit pernyataan"
                                      >
                                        <Edit className="h-3.5 w-3.5 text-blue-600" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleDeleteQuestion(s.id, q.id)}
                                        disabled={deletingQuestionId === q.id}
                                        title="Hapus pernyataan"
                                      >
                                        {deletingQuestionId === q.id ? (
                                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-500" />
                                        ) : (
                                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Buat Survey Baru</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Judul</Label><Input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Contoh: DCM Bidang Pribadi Kelas 7" /></div>
            <div><Label>Deskripsi</Label><Textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Deskripsi survey..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Kelas</Label><Select value={createForm.grade} onValueChange={(v) => setCreateForm({ ...createForm, grade: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Kelas 7</SelectItem><SelectItem value="8">Kelas 8</SelectItem><SelectItem value="9">Kelas 9</SelectItem></SelectContent></Select></div>
              <div><Label>Bidang</Label><Select value={createForm.field} onValueChange={(v) => setCreateForm({ ...createForm, field: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PRIBADI">Pribadi</SelectItem><SelectItem value="SOSIAL">Sosial</SelectItem><SelectItem value="BELAJAR">Belajar</SelectItem><SelectItem value="KARIR">Karir</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Pernyataan (satu per baris)</Label><Textarea rows={8} value={createForm.questionsText} onChange={(e) => setCreateForm({ ...createForm, questionsText: e.target.value })} placeholder="Masukkan pernyataan, satu per baris..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700">Buat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Survey Dialog (only title, desc, grade, field, active) */}
      <Dialog open={!!editingSurvey} onOpenChange={() => setEditingSurvey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Survey</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Judul</Label><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
            <div><Label>Deskripsi</Label><Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Kelas</Label><Select value={editForm.grade} onValueChange={(v) => setEditForm({ ...editForm, grade: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Kelas 7</SelectItem><SelectItem value="8">Kelas 8</SelectItem><SelectItem value="9">Kelas 9</SelectItem></SelectContent></Select></div>
              <div><Label>Bidang</Label><Select value={editForm.field} onValueChange={(v) => setEditForm({ ...editForm, field: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PRIBADI">Pribadi</SelectItem><SelectItem value="SOSIAL">Sosial</SelectItem><SelectItem value="BELAJAR">Belajar</SelectItem><SelectItem value="KARIR">Karir</SelectItem></SelectContent></Select></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={editForm.active} onCheckedChange={(v) => setEditForm({ ...editForm, active: v })} /><Label>Aktif</Label></div>
            <p className="text-xs text-gray-400">💡 Untuk mengelola pernyataan, tutup dialog ini lalu klik panah ▼ di kartu survey untuk melihat daftar pernyataan.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSurvey(null)}>Batal</Button>
            <Button onClick={handleSaveEdit} className="bg-teal-600 hover:bg-teal-700">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
