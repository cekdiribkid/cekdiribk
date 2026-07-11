"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Edit, Trash2, Plus, ChevronDown, ChevronUp,
  Pencil, Check, X, MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, FIELD_CONFIG, type View, type SurveyData, type QuestionData } from "@/lib/app-shared";

export default function AdminSurveys({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user: currentUser } = useAuth();
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", description: "", grade: "7", field: "PRIBADI", questionsText: "" });
  const [editingSurvey, setEditingSurvey] = useState<SurveyData | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", grade: "7", field: "PRIBADI", active: true, questionsText: "" });

  // Expanded survey state
  const [expandedSurveyId, setExpandedSurveyId] = useState<string | null>(null);

  // Per-question editing state: questionId -> edited text
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState("");

  // Adding new question state: surveyId -> new question text
  const [addingForSurveyId, setAddingForSurveyId] = useState<string | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Processing states
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

  const loadSurveys = useCallback(() => {
    if (!currentUser) return;
    apiFetch("/api/admin/surveys", {}, currentUser.id, currentUser.role, String(currentUser.grade))
      .then((data) => setSurveys(data.surveys || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => { loadSurveys(); }, [loadSurveys]);

  // ==================== SURVEY CRUD ====================

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
      questionsText: (s.questions || []).map((q) => q.text).join("\n"),
    });
  };

  const handleSaveEdit = async () => {
    if (!currentUser || !editingSurvey) return;
    const questions = editForm.questionsText.split("\n").filter((q) => q.trim());
    try {
      await apiFetch(`/api/admin/surveys/${editingSurvey.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...editForm, grade: Number(editForm.grade), questions: questions.map((text) => ({ text })) }),
      }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "Survey berhasil diperbarui" });
      setEditingSurvey(null);
      loadSurveys();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal memperbarui", variant: "destructive" });
    }
  };

  const handleDeleteSurvey = async (id: string) => {
    if (!currentUser) return;
    if (!confirm("Yakin ingin menghapus survey ini?")) return;
    try {
      await apiFetch(`/api/admin/surveys/${id}`, { method: "DELETE" }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "Survey berhasil dihapus" });
      if (expandedSurveyId === id) setExpandedSurveyId(null);
      loadSurveys();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal menghapus", variant: "destructive" });
    }
  };

  // ==================== QUESTION CRUD ====================

  const handleToggleExpand = (surveyId: string) => {
    setExpandedSurveyId((prev) => (prev === surveyId ? null : surveyId));
    // Reset editing states when collapsing
    if (expandedSurveyId === surveyId) {
      setEditingQuestionId(null);
      setAddingForSurveyId(null);
      setDeleteConfirmId(null);
    }
  };

  const handleStartEditQuestion = (q: QuestionData) => {
    setEditingQuestionId(q.id);
    setEditingQuestionText(q.text);
    setDeleteConfirmId(null);
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditingQuestionText("");
  };

  const handleSaveEditQuestion = async (questionId: string, surveyId: string) => {
    if (!currentUser) return;
    const trimmed = editingQuestionText.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Teks pernyataan tidak boleh kosong", variant: "destructive" });
      return;
    }
    setSavingQuestionId(questionId);
    try {
      await apiFetch(`/api/admin/questions/${questionId}`, {
        method: "PUT",
        body: JSON.stringify({ text: trimmed }),
      }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "Pernyataan berhasil diperbarui" });
      setEditingQuestionId(null);
      setEditingQuestionText("");
      // Update local state
      setSurveys((prev) =>
        prev.map((s) =>
          s.id === surveyId
            ? { ...s, questions: (s.questions || []).map((q) => (q.id === questionId ? { ...q, text: trimmed } : q)) }
            : s
        )
      );
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal memperbarui pernyataan", variant: "destructive" });
    } finally {
      setSavingQuestionId(null);
    }
  };

  const handleStartAddQuestion = (surveyId: string) => {
    setAddingForSurveyId(surveyId);
    setNewQuestionText("");
    setEditingQuestionId(null);
    setDeleteConfirmId(null);
  };

  const handleCancelAddQuestion = () => {
    setAddingForSurveyId(null);
    setNewQuestionText("");
  };

  const handleSaveNewQuestion = async (surveyId: string) => {
    if (!currentUser) return;
    const trimmed = newQuestionText.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Teks pernyataan tidak boleh kosong", variant: "destructive" });
      return;
    }
    setAddingQuestion(true);
    try {
      const result = await apiFetch("/api/admin/questions", {
        method: "POST",
        body: JSON.stringify({ surveyId, text: trimmed }),
      }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "Pernyataan berhasil ditambahkan" });
      setAddingForSurveyId(null);
      setNewQuestionText("");
      // Update local state
      setSurveys((prev) =>
        prev.map((s) =>
          s.id === surveyId
            ? { ...s, questions: [...(s.questions || []), result.question], _count: { ...s._count!, questions: (s._count?.questions || 0) + 1 } }
            : s
        )
      );
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal menambahkan pernyataan", variant: "destructive" });
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleConfirmDeleteQuestion = (questionId: string) => {
    setDeleteConfirmId(questionId);
    setEditingQuestionId(null);
  };

  const handleCancelDeleteQuestion = () => {
    setDeleteConfirmId(null);
  };

  const handleDeleteQuestion = async (questionId: string, surveyId: string) => {
    if (!currentUser) return;
    setDeletingQuestionId(questionId);
    try {
      await apiFetch(`/api/admin/questions/${questionId}`, {
        method: "DELETE",
      }, currentUser.id, currentUser.role, String(currentUser.grade));
      toast({ title: "Berhasil", description: "Pernyataan berhasil dihapus" });
      setDeleteConfirmId(null);
      // Update local state
      setSurveys((prev) =>
        prev.map((s) => {
          if (s.id !== surveyId) return s;
          const filtered = (s.questions || []).filter((q) => q.id !== questionId);
          // Re-index order
          const reindexed = filtered.map((q, i) => ({ ...q, order: i + 1 }));
          return { ...s, questions: reindexed, _count: { ...s._count!, questions: (s._count?.questions || 1) - 1 } };
        })
      );
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

      {loading ? <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded" /></div> : (
        <div className="space-y-3">
          {surveys.map((s) => {
            const cfg = FIELD_CONFIG[s.field] || FIELD_CONFIG.PRIBADI;
            const isExpanded = expandedSurveyId === s.id;
            const questions = (s.questions || []).sort((a, b) => a.order - b.order);

            return (
              <Card key={s.id} className={`border-2 ${s.active ? "" : "border-gray-300 opacity-60"}`}>
                <CardContent className="p-0">
                  {/* Survey Header - clickable to expand */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => handleToggleExpand(s.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${cfg.color} bg-white/80`}>{cfg.icon}</div>
                        <div>
                          <h4 className="font-semibold">{s.title}</h4>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="outline">Kelas {s.grade}</Badge>
                            <Badge variant="outline">{cfg.label}</Badge>
                            <Badge variant="outline">{s._count?.questions || 0} Soal</Badge>
                            <Badge variant="outline">{s._count?.responses || 0} Respons</Badge>
                            {!s.active && <Badge className="bg-gray-200 text-gray-600">Nonaktif</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(s); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="text-rose-600" onClick={(e) => { e.stopPropagation(); handleDeleteSurvey(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                        <div className="ml-1 text-gray-400">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Question List */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Daftar Pernyataan</h5>
                        <Badge variant="secondary" className="text-xs">{questions.length} pernyataan</Badge>
                      </div>

                      {questions.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                          <MessageSquarePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Belum ada pernyataan</p>
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                          {questions.map((q, idx) => (
                            <div key={q.id} className="group">
                              {/* Delete confirmation bar */}
                              {deleteConfirmId === q.id ? (
                                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                                  <span className="text-sm text-rose-700 flex-1">Hapus pernyataan &quot;{q.text.substring(0, 50)}{q.text.length > 50 ? "..." : ""}&quot;?</span>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-xs"
                                    disabled={deletingQuestionId === q.id}
                                    onClick={() => handleDeleteQuestion(q.id, s.id)}
                                  >
                                    {deletingQuestionId === q.id ? "Menghapus..." : "Hapus"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={handleCancelDeleteQuestion}
                                    disabled={deletingQuestionId === q.id}
                                  >
                                    Batal
                                  </Button>
                                </div>
                              ) : editingQuestionId === q.id ? (
                                /* Inline edit mode */
                                <div className="flex items-center gap-2 bg-teal-50/50 border border-teal-200 rounded-lg px-3 py-2">
                                  <span className="text-sm font-medium text-gray-400 min-w-[28px]">{idx + 1}.</span>
                                  <Input
                                    value={editingQuestionText}
                                    onChange={(e) => setEditingQuestionText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveEditQuestion(q.id, s.id);
                                      if (e.key === "Escape") handleCancelEditQuestion();
                                    }}
                                    className="flex-1 h-8 text-sm border-teal-300 focus-visible:ring-teal-400"
                                    autoFocus
                                    disabled={savingQuestionId === q.id}
                                  />
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-teal-600 hover:bg-teal-700"
                                    onClick={() => handleSaveEditQuestion(q.id, s.id)}
                                    disabled={savingQuestionId === q.id || !editingQuestionText.trim()}
                                  >
                                    {savingQuestionId === q.id ? "..." : <Check className="h-3.5 w-3.5" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={handleCancelEditQuestion}
                                    disabled={savingQuestionId === q.id}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                /* Normal display mode */
                                <div className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
                                  <span className="text-sm font-medium text-gray-400 min-w-[28px]">{idx + 1}.</span>
                                  <span className="text-sm flex-1 text-gray-700">{q.text}</span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-gray-400 hover:text-teal-600 hover:bg-teal-50"
                                      onClick={() => handleStartEditQuestion(q)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                      onClick={() => handleConfirmDeleteQuestion(q.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add new question */}
                      {addingForSurveyId === s.id ? (
                        <div className="flex items-center gap-2 mt-3 bg-emerald-50/50 border border-emerald-200 rounded-lg px-3 py-2">
                          <span className="text-sm font-medium text-gray-400 min-w-[28px]">{questions.length + 1}.</span>
                          <Input
                            value={newQuestionText}
                            onChange={(e) => setNewQuestionText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveNewQuestion(s.id);
                              if (e.key === "Escape") handleCancelAddQuestion();
                            }}
                            placeholder="Tulis pernyataan baru..."
                            className="flex-1 h-8 text-sm border-emerald-300 focus-visible:ring-emerald-400"
                            autoFocus
                            disabled={addingQuestion}
                          />
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-teal-600 hover:bg-teal-700"
                            onClick={() => handleSaveNewQuestion(s.id)}
                            disabled={addingQuestion || !newQuestionText.trim()}
                          >
                            {addingQuestion ? "..." : "Simpan"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={handleCancelAddQuestion}
                            disabled={addingQuestion}
                          >
                            Batal
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full border-dashed text-gray-500 hover:text-teal-600 hover:border-teal-400 hover:bg-teal-50/50"
                          onClick={() => handleStartAddQuestion(s.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" /> Tambah Pernyataan
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
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

      {/* Edit Dialog */}
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
            <div><Label>Pernyataan (satu per baris)</Label><Textarea rows={8} value={editForm.questionsText} onChange={(e) => setEditForm({ ...editForm, questionsText: e.target.value })} /></div>
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
