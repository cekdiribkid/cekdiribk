"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Settings, RefreshCw, CheckCircle2, Bot, Wifi, WifiOff, Eye, EyeOff, Trash2, AlertTriangle, GraduationCap, ShieldCheck, XCircle, ExternalLink, Copy, Check, Sparkles, RotateCcw, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, type View, KopSurat, refreshSchoolSettings } from "@/lib/app-shared";
import {
  DEFAULT_LEARN_MORE_STUDENT_TITLE,
  DEFAULT_LEARN_MORE_STUDENT_CONTENT,
  DEFAULT_LEARN_MORE_ADMIN_TITLE,
  DEFAULT_LEARN_MORE_ADMIN_CONTENT,
} from "@/lib/learn-more-defaults";

interface ProviderPreset {
  label: string;
  baseUrl: string;
  models: string[];
  description: string;
  keyPrefix?: string;
  signupUrl?: string;
}

export default function AdminSettings({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [form, setForm] = useState({
    schoolName: "",
    schoolNpsn: "",
    schoolAddress: "",
    schoolPhone: "",
    schoolEmail: "",
    schoolPrincipal: "",
    schoolPrincipalNip: "",
    bkCoordinator: "",
    bkCoordinatorNip: "",
    bkWhatsApp: "",
    academicYear: "",
  });

  // AI Config state
  const [aiConfig, setAiConfig] = useState({
    ai_provider: "",
    ai_base_url: "",
    ai_api_key: "",
    ai_model: "",
    ai_chat_id: "",
    ai_token: "",
    ai_user_id: "",
  });
  const [providers, setProviders] = useState<Record<string, ProviderPreset>>({});
  const [aiSaving, setAiSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validating, setValidating] = useState(false);
  const [keyValidation, setKeyValidation] = useState<{ valid: boolean; message: string; models?: string[] } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // "Pelajari Lebih Lanjut" content state (editable from this page)
  const [learnMore, setLearnMore] = useState({
    learnMoreEnabled: "true",
    learnMoreStudentTitle: "",
    learnMoreStudentContent: "",
    learnMoreAdminTitle: "",
    learnMoreAdminContent: "",
  });
  const [learnMoreSaving, setLearnMoreSaving] = useState(false);
  const [learnMoreTab, setLearnMoreTab] = useState<"student" | "admin">("student");

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/admin/settings", {}, user.id, user.role, String(user.grade))
      .then((data) => {
        const s = data.settings || {};
        setSettings(s);
        setForm({
          schoolName: s.schoolName || "",
          schoolNpsn: s.schoolNpsn || "",
          schoolAddress: s.schoolAddress || "",
          schoolPhone: s.schoolPhone || "",
          schoolEmail: s.schoolEmail || "",
          schoolPrincipal: s.schoolPrincipal || "",
          schoolPrincipalNip: s.schoolPrincipalNip || "",
          bkCoordinator: s.bkCoordinator || "",
          bkCoordinatorNip: s.bkCoordinatorNip || "",
          bkWhatsApp: s.bkWhatsApp || "",
          academicYear: s.academicYear || "",
        });
        // Populate "Pelajari Lebih Lanjut" fields. If empty in DB, fall back to built-in defaults
        // so the admin sees the current public content immediately.
        setLearnMore({
          learnMoreEnabled: s.learnMoreEnabled !== undefined && s.learnMoreEnabled !== "" ? s.learnMoreEnabled : "true",
          learnMoreStudentTitle: s.learnMoreStudentTitle || DEFAULT_LEARN_MORE_STUDENT_TITLE,
          learnMoreStudentContent: s.learnMoreStudentContent || DEFAULT_LEARN_MORE_STUDENT_CONTENT,
          learnMoreAdminTitle: s.learnMoreAdminTitle || DEFAULT_LEARN_MORE_ADMIN_TITLE,
          learnMoreAdminContent: s.learnMoreAdminContent || DEFAULT_LEARN_MORE_ADMIN_CONTENT,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Load AI config
    apiFetch("/api/admin/ai-config", {}, user.id, user.role, String(user.grade))
      .then((data) => {
        setAiConfig(data.settings || {});
        setProviders(data.providers || {});
      })
      .catch(console.error)
      .finally(() => setAiLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const data = await apiFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(form),
      }, user.id, user.role, String(user.grade));
      setSettings(data.settings || {});
      toast({ title: "Berhasil", description: "Pengaturan berhasil disimpan" });
    } catch (err: unknown) {
      console.error("Settings save error:", err);
      const msg = err instanceof Error ? err.message : "Gagal menyimpan pengaturan. Periksa koneksi internet Anda dan coba lagi.";
      toast({ title: "Gagal Menyimpan", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAiSave = async () => {
    if (!user) return;

    // Client-side validation: check required fields before making API call
    const missingFields: string[] = [];
    if (!aiConfig.ai_provider) missingFields.push("Provider AI");
    if (!aiConfig.ai_base_url) missingFields.push("Base URL");
    if (!aiConfig.ai_api_key || aiConfig.ai_api_key.includes('****')) missingFields.push("API Key");

    if (missingFields.length > 0) {
      toast({
        title: "Data Belum Lengkap",
        description: `Harap isi: ${missingFields.join(", ")}. Semua field wajib diisi sebelum menyimpan.`,
        variant: "destructive",
      });
      return;
    }

    // Validate API key format before saving
    if (aiConfig.ai_api_key && !aiConfig.ai_api_key.includes('****')) {
      const preset = providers[aiConfig.ai_provider];
      if (preset?.keyPrefix && !aiConfig.ai_api_key.startsWith(preset.keyPrefix)) {
        toast({
          title: "Format API Key Salah",
          description: `API Key ${preset.label} harus dimulai dengan "${preset.keyPrefix}". Key Anda dimulai dengan "${aiConfig.ai_api_key.substring(0, 4)}..."`,
          variant: "destructive",
        });
        return;
      }
    }

    setAiSaving(true);
    setAiTestResult(null);
    setKeyValidation(null);
    try {
      const data = await apiFetch("/api/admin/ai-config", {
        method: "PUT",
        body: JSON.stringify(aiConfig),
      }, user.id, user.role, String(user.grade));
      setAiConfig(data.settings || {});
      toast({ title: "Berhasil", description: "Konfigurasi AI berhasil disimpan. Klik 'Validasi & Tes Koneksi' untuk memastikan berjalan." });
    } catch (err: unknown) {
      console.error("AI Config save error:", err);
      const msg = err instanceof Error ? err.message : "Gagal menyimpan konfigurasi AI";
      toast({ title: "Gagal Menyimpan", description: msg, variant: "destructive" });
    } finally {
      setAiSaving(false);
    }
  };

  const handleValidateKey = async () => {
    if (!user) return;

    // Check if we have the needed values
    if (!aiConfig.ai_provider || !aiConfig.ai_base_url || !aiConfig.ai_api_key) {
      toast({ title: "Lengkapi Data", description: "Provider, Base URL, dan API Key harus diisi terlebih dahulu", variant: "destructive" });
      return;
    }

    // Don't validate masked keys
    if (aiConfig.ai_api_key.includes('****')) {
      toast({ title: "API Key Ter-masked", description: "Silakan masukkan API Key baru (bukan yang bertanda ****)", variant: "destructive" });
      return;
    }

    setValidating(true);
    setKeyValidation(null);
    try {
      const data = await apiFetch("/api/admin/ai-config/test", {
        method: "POST",
        body: JSON.stringify({
          mode: "validate",
          provider: aiConfig.ai_provider,
          baseUrl: aiConfig.ai_base_url,
          apiKey: aiConfig.ai_api_key,
        }),
      }, user.id, user.role, String(user.grade));
      setKeyValidation({ valid: data.success, message: data.message, models: data.models });
      toast({
        title: data.success ? "API Key Valid" : "API Key Tidak Valid",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memvalidasi API Key";
      setKeyValidation({ valid: false, message: msg });
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const handleAiTest = async () => {
    if (!user) return;
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const data = await apiFetch("/api/admin/ai-config/test", {
        method: "POST",
      }, user.id, user.role, String(user.grade));
      setAiTestResult({ success: data.success, message: data.message });
      toast({
        title: data.success ? "Koneksi Berhasil" : "Koneksi Gagal",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menguji koneksi";
      setAiTestResult({ success: false, message: msg });
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setAiTesting(false);
    }
  };

  const handleAiDelete = async () => {
    if (!user) return;
    if (!confirm("Apakah Anda yakin ingin menghapus konfigurasi AI?")) return;
    try {
      await apiFetch("/api/admin/ai-config", {
        method: "DELETE",
      }, user.id, user.role, String(user.grade));
      setAiConfig({
        ai_provider: "",
        ai_base_url: "",
        ai_api_key: "",
        ai_model: "",
        ai_chat_id: "",
        ai_token: "",
        ai_user_id: "",
      });
      setAiTestResult(null);
      setKeyValidation(null);
      toast({ title: "Berhasil", description: "Konfigurasi AI berhasil dihapus" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal menghapus", variant: "destructive" });
    }
  };

  const handleProviderChange = (provider: string) => {
    const preset = providers[provider];
    if (preset) {
      setAiConfig(prev => ({
        ...prev,
        ai_provider: provider,
        ai_base_url: preset.baseUrl || prev.ai_base_url,
        ai_model: preset.models?.[0] || prev.ai_model,
      }));
    } else {
      setAiConfig(prev => ({ ...prev, ai_provider: provider }));
    }
    setKeyValidation(null);
    setAiTestResult(null);
  };

  // Save "Pelajari Lebih Lanjut" content (uses the same /api/admin/settings PUT endpoint,
  // which accepts arbitrary string key/value pairs).
  const handleLearnMoreSave = async () => {
    if (!user) return;
    setLearnMoreSaving(true);
    try {
      const payload: Record<string, string> = {
        learnMoreEnabled: learnMore.learnMoreEnabled,
        learnMoreStudentTitle: learnMore.learnMoreStudentTitle,
        learnMoreStudentContent: learnMore.learnMoreStudentContent,
        learnMoreAdminTitle: learnMore.learnMoreAdminTitle,
        learnMoreAdminContent: learnMore.learnMoreAdminContent,
      };
      const data = await apiFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      }, user.id, user.role, String(user.grade));
      setSettings(data.settings || {});
      // Invalidate the public school-settings cache so the landing page picks up the new content.
      refreshSchoolSettings();
      toast({ title: "Berhasil", description: "Konten 'Pelajari Lebih Lanjut' berhasil disimpan. Perubahan langsung tampil di beranda." });
    } catch (err: unknown) {
      console.error("LearnMore save error:", err);
      const msg = err instanceof Error ? err.message : "Gagal menyimpan konten. Coba lagi.";
      toast({ title: "Gagal Menyimpan", description: msg, variant: "destructive" });
    } finally {
      setLearnMoreSaving(false);
    }
  };

  // Reset "Pelajari Lebih Lanjut" fields back to built-in defaults (for the currently active tab).
  const handleLearnMoreReset = (which: "student" | "admin" | "all") => {
    if (which === "student" || which === "all") {
      setLearnMore(prev => ({
        ...prev,
        learnMoreStudentTitle: DEFAULT_LEARN_MORE_STUDENT_TITLE,
        learnMoreStudentContent: DEFAULT_LEARN_MORE_STUDENT_CONTENT,
      }));
    }
    if (which === "admin" || which === "all") {
      setLearnMore(prev => ({
        ...prev,
        learnMoreAdminTitle: DEFAULT_LEARN_MORE_ADMIN_TITLE,
        learnMoreAdminContent: DEFAULT_LEARN_MORE_ADMIN_CONTENT,
      }));
    }
    toast({ title: "Direset ke Default", description: which === "all" ? "Semua konten dikembalikan ke default." : `Konten ${which === "student" ? "Siswa" : "Admin/Guru"} dikembalikan ke default. Klik Simpan untuk menerapkan.` });
  };

  const isNewKey = aiConfig.ai_api_key && !aiConfig.ai_api_key.includes('****');
  const hasConfig = aiConfig.ai_provider && aiConfig.ai_base_url && aiConfig.ai_api_key;

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/4" /><div className="h-64 bg-gray-200 rounded" /></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Pengaturan</h2>
          <p className="text-gray-500">Kelola informasi sekolah dan konfigurasi AI</p>
        </div>
      </div>

      {/* Profil Sekolah */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-teal-600" />
            Profil Sekolah
          </CardTitle>
          <CardDescription>Informasi ini akan ditampilkan di kop surat laporan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo Sekolah</Label>
            <div className="flex items-center gap-4">
              {settings.schoolLogo ? (
                <div className="relative">
                  <img
                    src={settings.schoolLogo}
                    alt="Logo Sekolah"
                    className="w-20 h-20 object-contain rounded-xl border border-gray-200 bg-white p-2"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-xl flex items-center justify-center text-teal-400">
                  <GraduationCap className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/png,image/jpeg,image/svg+xml,image/webp';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast({ title: 'Error', description: 'Ukuran file terlalu besar. Maksimal 2MB.', variant: 'destructive' });
                          return;
                        }
                        setUploadingLogo(true);
                        try {
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const base64 = ev.target?.result as string;
                            if (user) {
                              await apiFetch('/api/admin/settings/logo', {
                                method: 'POST',
                                body: JSON.stringify({ logo: base64 }),
                              }, user.id, user.role, String(user.grade));
                              setSettings(prev => ({ ...prev, schoolLogo: base64 }));
                              // Refresh the shared cache so sidebar/mobile header update immediately
                              refreshSchoolSettings();
                              toast({ title: 'Berhasil', description: 'Logo berhasil diupload' });
                            }
                          };
                          reader.readAsDataURL(file);
                        } catch (err) {
                          toast({ title: 'Error', description: 'Gagal mengupload logo', variant: 'destructive' });
                        } finally {
                          setUploadingLogo(false);
                        }
                      };
                      input.click();
                    }}
                  >
                    {uploadingLogo ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  {settings.schoolLogo && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={async () => {
                        if (!user) return;
                        try {
                          await apiFetch('/api/admin/settings/logo', {
                            method: 'DELETE',
                          }, user.id, user.role, String(user.grade));
                          setSettings(prev => ({ ...prev, schoolLogo: '' }));
                          // Refresh the shared cache so sidebar/mobile header update immediately
                          refreshSchoolSettings();
                          toast({ title: 'Berhasil', description: 'Logo berhasil dihapus' });
                        } catch {
                          toast({ title: 'Error', description: 'Gagal menghapus logo', variant: 'destructive' });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" /> Hapus
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-400">Format: PNG, JPG, SVG, WebP. Maks: 2MB. Logo akan tampil di halaman depan dan kop surat.</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Sekolah</Label>
              <Input value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} placeholder="SMP Negeri 1 Contoh" />
            </div>
            <div className="space-y-2">
              <Label>NPSN</Label>
              <Input value={form.schoolNpsn} onChange={(e) => setForm({ ...form, schoolNpsn: e.target.value })} placeholder="12345678" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Alamat</Label>
            <Textarea value={form.schoolAddress} onChange={(e) => setForm({ ...form, schoolAddress: e.target.value })} placeholder="Jl. Pendidikan No. 1" rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input value={form.schoolPhone} onChange={(e) => setForm({ ...form, schoolPhone: e.target.value })} placeholder="(021) 1234567" />
            </div>
            <div className="space-y-2">
              <Label>Email Sekolah</Label>
              <Input value={form.schoolEmail} onChange={(e) => setForm({ ...form, schoolEmail: e.target.value })} placeholder="sekolah@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Koordinator BK</Label>
              <Input value={form.bkCoordinator} onChange={(e) => setForm({ ...form, bkCoordinator: e.target.value })} placeholder="Nama Koordinator BK" />
            </div>
            <div className="space-y-2">
              <Label>NIP Konselor Pendidikan</Label>
              <Input value={form.bkCoordinatorNip} onChange={(e) => setForm({ ...form, bkCoordinatorNip: e.target.value })} placeholder="NIP Konselor" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>No. WhatsApp Bantuan BK</Label>
            <Input
              value={form.bkWhatsApp}
              onChange={(e) => setForm({ ...form, bkWhatsApp: e.target.value })}
              placeholder="6289504186122"
              inputMode="tel"
            />
            <p className="text-xs text-gray-500">
              Nomor WhatsApp yang menerima pesan dari tombol mengambang "Bantuan BK" (tampil di
              semua halaman, sebelum &amp; sesudah login). Format: kode negara + nomor tanpa
              <code className="px-1 mx-0.5 bg-gray-100 rounded">+</code> atau
              <code className="px-1 mx-0.5 bg-gray-100 rounded">0</code> di depan. Contoh:
              <strong className="text-teal-700"> 6289504186122</strong>.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kepala Sekolah</Label>
              <Input value={form.schoolPrincipal} onChange={(e) => setForm({ ...form, schoolPrincipal: e.target.value })} placeholder="Nama Kepala Sekolah" />
            </div>
            <div className="space-y-2">
              <Label>NIP Kepala Sekolah</Label>
              <Input value={form.schoolPrincipalNip} onChange={(e) => setForm({ ...form, schoolPrincipalNip: e.target.value })} placeholder="NIP Kepala Sekolah" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tahun Ajaran</Label>
              <Input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2024/2025" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            setForm({ schoolName: settings.schoolName || "", schoolNpsn: settings.schoolNpsn || "", schoolAddress: settings.schoolAddress || "", schoolPhone: settings.schoolPhone || "", schoolEmail: settings.schoolEmail || "", schoolPrincipal: settings.schoolPrincipal || "", schoolPrincipalNip: settings.schoolPrincipalNip || "", bkCoordinator: settings.bkCoordinator || "", bkCoordinatorNip: settings.bkCoordinatorNip || "", bkWhatsApp: settings.bkWhatsApp || "", academicYear: settings.academicYear || "" });
          }}>Reset</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </CardFooter>
      </Card>

      {/* Preview KOP SURAT */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Preview Kop Surat</CardTitle>
        </CardHeader>
        <CardContent>
          <KopSurat schoolSettings={{ ...form, schoolLogo: settings.schoolLogo }} />
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-teal-600" />
            Konfigurasi AI untuk Sesi Konseling
          </CardTitle>
          <CardDescription>
            AI digunakan untuk menghasilkan Catatan Konseling, Tindak Lanjut, dan Solusi secara otomatis berdasarkan hasil asesmen siswa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Memuat konfigurasi AI...</span>
            </div>
          ) : (
            <>
              {/* Status Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                {hasConfig ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                    <Wifi className="h-3 w-3" />
                    AI Terkonfigurasi ({providers[aiConfig.ai_provider]?.label || aiConfig.ai_provider})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500 flex items-center gap-1">
                    <WifiOff className="h-3 w-3" />
                    AI Belum Dikonfigurasi
                  </Badge>
                )}
                {keyValidation && (
                  <Badge className={keyValidation.valid ? "bg-green-50 text-green-700 border-green-200 flex items-center gap-1" : "bg-red-50 text-red-700 border-red-200 flex items-center gap-1"}>
                    {keyValidation.valid ? <ShieldCheck className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {keyValidation.valid ? "Key Terverifikasi" : "Key Tidak Valid"}
                  </Badge>
                )}
              </div>

              {!hasConfig && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Fitur Generate AI memerlukan konfigurasi.</strong> Pilih provider dan masukkan API Key di bawah.
                    Untuk penggunaan <strong>gratis</strong>, rekomendasi: <strong>Groq</strong> — daftar di{" "}
                    <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline inline-flex items-center gap-0.5">
                      console.groq.com <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              {/* Provider Selection */}
              <div className="space-y-2">
                <Label className="font-semibold">1. Pilih Provider AI</Label>
                <Select value={aiConfig.ai_provider} onValueChange={handleProviderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Provider AI" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(providers).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span className="font-medium">{preset.label}</span>
                          <span className="text-xs text-gray-500">{preset.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Base URL */}
              <div className="space-y-2">
                <Label className="font-semibold">2. Base URL</Label>
                <Input
                  value={aiConfig.ai_base_url}
                  onChange={(e) => { setAiConfig({ ...aiConfig, ai_base_url: e.target.value }); setKeyValidation(null); }}
                  placeholder="https://api.groq.com/openai/v1"
                />
                <p className="text-xs text-gray-500">
                  Otomatis terisi saat memilih provider. Jangan tambahkan /chat/completions di akhir.
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label className="font-semibold">
                  3. API Key{" "}
                  {providers[aiConfig.ai_provider]?.keyPrefix && (
                    <span className="text-rose-500 font-normal text-xs">
                      (harus dimulai dengan <code className="bg-gray-100 px-1 rounded">{providers[aiConfig.ai_provider].keyPrefix}</code>)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={aiConfig.ai_api_key}
                    onChange={(e) => { setAiConfig({ ...aiConfig, ai_api_key: e.target.value }); setKeyValidation(null); }}
                    placeholder={providers[aiConfig.ai_provider]?.keyPrefix ? `${providers[aiConfig.ai_provider].keyPrefix}...` : "Masukkan API Key"}
                    className={`pr-10 ${keyValidation ? (keyValidation.valid ? 'border-green-400 focus:border-green-500' : 'border-red-400 focus:border-red-500') : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                {/* API Key format warning */}
                {aiConfig.ai_api_key && !aiConfig.ai_api_key.includes('****') && providers[aiConfig.ai_provider]?.keyPrefix && !aiConfig.ai_api_key.startsWith(providers[aiConfig.ai_provider].keyPrefix) && (
                  <div className="flex items-center gap-1.5 text-rose-600 text-xs mt-1">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      API Key {providers[aiConfig.ai_provider]?.label} harus dimulai dengan &quot;{providers[aiConfig.ai_provider].keyPrefix}&quot;.
                      Key Anda dimulai dengan &quot;{aiConfig.ai_api_key.substring(0, 6)}...&quot; — pastikan Anda mengcopy API Key yang benar.
                    </span>
                  </div>
                )}

                {/* API Key format OK */}
                {aiConfig.ai_api_key && !aiConfig.ai_api_key.includes('****') && providers[aiConfig.ai_provider]?.keyPrefix && aiConfig.ai_api_key.startsWith(providers[aiConfig.ai_provider].keyPrefix) && !keyValidation && (
                  <div className="flex items-center gap-1.5 text-green-600 text-xs mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Format API Key sudah benar. Klik &quot;Validasi Key&quot; untuk memverifikasi.</span>
                  </div>
                )}

                {/* Validation result */}
                {keyValidation && (
                  <div className={`flex items-start gap-1.5 text-xs mt-1 ${keyValidation.valid ? 'text-green-600' : 'text-rose-600'}`}>
                    {keyValidation.valid ? <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                    <span className="whitespace-pre-line">{keyValidation.message}</span>
                  </div>
                )}

                {/* Validate Key Button */}
                {isNewKey && aiConfig.ai_provider && aiConfig.ai_base_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleValidateKey}
                    disabled={validating}
                    className="mt-1"
                  >
                    {validating ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
                    {validating ? "Memvalidasi..." : "Validasi Key"}
                  </Button>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  {aiConfig.ai_provider === 'groq' ? (
                    <>Buat API Key gratis di{" "}
                      <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline inline-flex items-center gap-0.5">
                        console.groq.com/keys <ExternalLink className="h-3 w-3" />
                      </a>
                      {" "}&rarr; klik &quot;Create API Key&quot; &rarr; copy key yang dimulai <code className="bg-gray-100 px-1 rounded">gsk_</code>
                    </>
                  ) : aiConfig.ai_provider === 'openai' ? (
                    <>Buat API Key di{" "}
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline inline-flex items-center gap-0.5">
                        platform.openai.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  ) : (
                    <>Masukkan API Key dari provider Anda</>
                  )}
                </p>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label className="font-semibold">4. Model AI</Label>
                {providers[aiConfig.ai_provider]?.models?.length ? (
                  <Select value={aiConfig.ai_model} onValueChange={(v) => setAiConfig({ ...aiConfig, ai_model: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers[aiConfig.ai_provider].models.map((m: string) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={aiConfig.ai_model}
                    onChange={(e) => setAiConfig({ ...aiConfig, ai_model: e.target.value })}
                    placeholder="gpt-3.5-turbo atau nama model"
                  />
                )}
                {aiConfig.ai_provider === 'groq' && (
                  <p className="text-xs text-gray-500">
                    Rekomendasi: <strong>llama-3.3-70b-versatile</strong> (kualitas terbaik) atau <strong>llama-3.1-8b-instant</strong> (paling cepat)
                  </p>
                )}
              </div>

              {/* Advanced Settings for Z AI */}
              {aiConfig.ai_provider === 'z-ai' && (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? '▼' : '▶'} Pengaturan Lanjutan (Z AI)
                  </Button>
                  {showAdvanced && (
                    <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                      <div className="space-y-1">
                        <Label className="text-sm">Chat ID</Label>
                        <Input
                          value={aiConfig.ai_chat_id}
                          onChange={(e) => setAiConfig({ ...aiConfig, ai_chat_id: e.target.value })}
                          placeholder="chat-..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">Token</Label>
                        <Input
                          type="password"
                          value={aiConfig.ai_token}
                          onChange={(e) => setAiConfig({ ...aiConfig, ai_token: e.target.value })}
                          placeholder="eyJ..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">User ID</Label>
                        <Input
                          value={aiConfig.ai_user_id}
                          onChange={(e) => setAiConfig({ ...aiConfig, ai_user_id: e.target.value })}
                          placeholder="uuid..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Test Result */}
              {aiTestResult && (
                <Alert variant={aiTestResult.success ? "default" : "destructive"}>
                  {aiTestResult.success ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  <AlertDescription className="whitespace-pre-line">{aiTestResult.message}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            {hasConfig && (
              <Button variant="outline" size="sm" onClick={handleAiDelete} className="text-rose-600 hover:text-rose-700">
                <Trash2 className="h-4 w-4 mr-1" />
                Hapus Config
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {hasConfig && (
              <Button variant="outline" onClick={handleAiTest} disabled={aiTesting}>
                {aiTesting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Wifi className="h-4 w-4 mr-2" />}
                {aiTesting ? "Menguji..." : "Tes Koneksi"}
              </Button>
            )}
            <Button onClick={handleAiSave} disabled={aiSaving} className="bg-teal-600 hover:bg-teal-700">
              {aiSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {aiSaving ? "Menyimpan..." : "Simpan AI Config"}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Panduan Konfigurasi AI - Collapsible */}
      <Card className="mt-6">
        <CardHeader className="cursor-pointer" onClick={() => setShowGuide(!showGuide)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Panduan Lengkap Konfigurasi AI
              </CardTitle>
              <CardDescription className="mt-1">
                Klik untuk {showGuide ? 'menutup' : 'membuka'} panduan langkah demi langkah
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              {showGuide ? '▲' : '▼'}
            </Button>
          </div>
        </CardHeader>
        {showGuide && (
          <CardContent className="text-sm space-y-4">
            {/* Groq - Primary Recommendation */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200">
              <h4 className="font-bold text-teal-700 mb-2 flex items-center gap-2">
                🚀 Groq — GRATIS & Cepat (Rekomendasi #1)
              </h4>
              <div className="space-y-2 text-gray-700">
                <p className="font-medium">Langkah-langkah mendapatkan API Key Groq yang valid:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>
                    Buka{" "}
                    <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline font-medium inline-flex items-center gap-0.5">
                      console.groq.com <ExternalLink className="h-3 w-3" />
                    </a>
                    {" "}dan daftar akun (bisa pakai Google/GitHub)
                  </li>
                  <li>
                    <strong>Verifikasi email</strong> jika diminta — cek inbox/spam untuk email dari Groq
                  </li>
                  <li>
                    Setelah login, buka menu{" "}
                    <strong>API Keys</strong>{" "}
                    (di sidebar kiri atau{" "}
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline inline-flex items-center gap-0.5">
                      langsung ke sini <ExternalLink className="h-3 w-3" />
                    </a>
                    )
                  </li>
                  <li>
                    Klik tombol <strong>&quot;Create API Key&quot;</strong>
                  </li>
                  <li>
                    Beri nama (misal: &quot;CekDiriBK&quot;) lalu klik <strong>Submit</strong>
                  </li>
                  <li>
                    <span className="text-rose-600 font-semibold">PENTING:</span> Copy API Key yang muncul SEKARANG juga.
                    Key hanya ditampilkan sekali! Key harus dimulai dengan <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-xs">gsk_</code>
                  </li>
                  <li>
                    Paste API Key tersebut di kolom &quot;API Key&quot; di atas
                  </li>
                  <li>
                    Klik <strong>&quot;Validasi Key&quot;</strong> untuk memastikan key berfungsi
                  </li>
                  <li>
                    Klik <strong>&quot;Simpan AI Config&quot;</strong>, lalu <strong>&quot;Tes Koneksi&quot;</strong>
                  </li>
                </ol>

                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-amber-800 text-xs font-medium">⚠️ Sering Terjadi Error 403 — Penyebab & Solusi:</p>
                  <ul className="text-amber-700 text-xs mt-1 space-y-1">
                    <li>• <strong>Key salah copy:</strong> Pastikan copy FULL key dari gsk_ sampai akhir tanpa spasi</li>
                    <li>• <strong>Key expired:</strong> Hapus key lama di Groq console, buat key baru</li>
                    <li>• <strong>Belum verifikasi email:</strong> Cek email verifikasi dari Groq</li>
                    <li>• <strong>Key bukan API Key:</strong> Pastikan bukan mengcopy App ID atau ID lain — harus yang dimulai <code className="bg-white px-1 rounded">gsk_</code></li>
                    <li>• <strong>Baru buat akun:</strong> Tunggu 5-10 menit setelah buat key pertama kali</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* OpenAI */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">💰 OpenAI (Berbayar)</h4>
              <ol className="list-decimal list-inside text-gray-600 space-y-1 mt-1">
                <li>Buka{" "}
                  <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline inline-flex items-center gap-0.5">
                    platform.openai.com <ExternalLink className="h-3 w-3" />
                  </a>
                  {" "}dan daftar
                </li>
                <li>Top up credit minimal $5</li>
                <li>Buat API Key di menu API Keys (awalan <code className="bg-gray-100 px-1 rounded">sk-</code>)</li>
                <li>Model: <strong>gpt-4o-mini</strong> (murah ~$0.15/1M token) atau <strong>gpt-4o</strong> (lebih baik)</li>
              </ol>
            </div>

            <Separator />

            {/* Custom / Local */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">🏠 Custom / Ollama Lokal</h4>
              <ol className="list-decimal list-inside text-gray-600 space-y-1 mt-1">
                <li>Jalankan Ollama atau LM Studio di komputer Anda</li>
                <li>Pilih provider <strong>Custom</strong></li>
                <li>Base URL: <code className="bg-gray-100 px-1 rounded">http://localhost:11434/v1</code> (Ollama)</li>
                <li>API Key: isi apa saja (misalnya: &quot;local&quot;)</li>
                <li>Model: nama model Ollama (misalnya: <strong>llama3</strong>)</li>
              </ol>
            </div>

            <Separator />

            {/* FAQ */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-semibold text-blue-700 mb-1">❓ Pertanyaan Umum</h4>
              <div className="text-blue-700 text-xs space-y-2">
                <p><strong>Q: Groq benar-benar gratis?</strong><br />A: Ya! Groq menyediakan free tier dengan batas request per menit. Cukup untuk penggunaan BK sekolah.</p>
                <p><strong>Q: Kenapa error 403 Forbidden?</strong><br />A: API Key tidak valid atau sudah expired. Hapus config, buat API Key baru di Groq, dan simpan ulang.</p>
                <p><strong>Q: Data siswa aman dengan AI?</strong><br />A: AI hanya menerima topik masalah (contoh: &quot;kesulitan belajar matematika&quot;), bukan data pribadi siswa. Nama siswa bersifat opsional.</p>
                <p><strong>Q: Bisa tanpa AI?</strong><br />A: Ya, Anda bisa menulis catatan konseling secara manual tanpa tombol Generate AI.</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ===== Konten "Pelajari Lebih Lanjut" Beranda ===== */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            Konten &quot;Pelajari Lebih Lanjut&quot; di Beranda
          </CardTitle>
          <CardDescription>
            Edit judul dan isi panduan fitur yang tampil di blok menyala &quot;Pelajari Lebih Lanjut&quot; pada beranda (sebelum login). Pengunjung bisa memilih melihat panduan untuk Siswa atau untuk Admin/Guru.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable / disable toggle */}
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-teal-50/60 border border-teal-100">
            <div className="flex-1">
              <Label className="font-semibold text-gray-800">Tampilkan blok &quot;Pelajari Lebih Lanjut&quot; di beranda</Label>
              <p className="text-xs text-gray-500 mt-0.5">
                Jika dimatikan, blok menyala tidak akan tampil di beranda. Konten tetap tersimpan di sini.
              </p>
            </div>
            <Switch
              checked={learnMore.learnMoreEnabled === "true"}
              onCheckedChange={(checked) =>
                setLearnMore((prev) => ({ ...prev, learnMoreEnabled: checked ? "true" : "false" }))
              }
            />
          </div>

          <Separator />

          {/* Tabs: Siswa | Admin/Guru */}
          <Tabs value={learnMoreTab} onValueChange={(v) => setLearnMoreTab(v as "student" | "admin")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student" className="gap-1.5">
                <GraduationCap className="h-4 w-4" /> Siswa
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-1.5">
                <BookOpen className="h-4 w-4" /> Admin / Guru / Konselor
              </TabsTrigger>
            </TabsList>

            {/* Siswa tab */}
            <TabsContent value="student" className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label className="font-semibold">Judul — Siswa</Label>
                <Input
                  value={learnMore.learnMoreStudentTitle}
                  onChange={(e) => setLearnMore((prev) => ({ ...prev, learnMoreStudentTitle: e.target.value }))}
                  placeholder="Contoh: Panduan Fitur untuk Siswa"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Isi Konten — Siswa</Label>
                <Textarea
                  value={learnMore.learnMoreStudentContent}
                  onChange={(e) => setLearnMore((prev) => ({ ...prev, learnMoreStudentContent: e.target.value }))}
                  placeholder="Tulis panduan fitur untuk siswa di sini..."
                  rows={18}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-500">
                  Mendukung format markdown sederhana: <code className="bg-gray-100 px-1 rounded">## Heading</code>,{" "}
                  <code className="bg-gray-100 px-1 rounded">### Sub-heading</code>,{" "}
                  <code className="bg-gray-100 px-1 rounded">- bullet</code>,{" "}
                  <code className="bg-gray-100 px-1 rounded">**tebal**</code>, dan baris kosong untuk pemisah paragraf.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLearnMoreReset("student")}
                className="text-gray-600"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset ke Default (Siswa)
              </Button>
            </TabsContent>

            {/* Admin/Guru tab */}
            <TabsContent value="admin" className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label className="font-semibold">Judul — Admin / Guru / Konselor</Label>
                <Input
                  value={learnMore.learnMoreAdminTitle}
                  onChange={(e) => setLearnMore((prev) => ({ ...prev, learnMoreAdminTitle: e.target.value }))}
                  placeholder="Contoh: Panduan Fitur untuk Guru/Konselor (Admin)"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Isi Konten — Admin / Guru / Konselor</Label>
                <Textarea
                  value={learnMore.learnMoreAdminContent}
                  onChange={(e) => setLearnMore((prev) => ({ ...prev, learnMoreAdminContent: e.target.value }))}
                  placeholder="Tulis panduan fitur untuk admin/guru di sini..."
                  rows={18}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-500">
                  Mendukung format markdown sederhana: <code className="bg-gray-100 px-1 rounded">## Heading</code>,{" "}
                  <code className="bg-gray-100 px-1 rounded">### Sub-heading</code>,{" "}
                  <code className="bg-gray-100 px-1 rounded">- bullet</code>,{" "}
                  <code className="bg-gray-100 px-1 rounded">**tebal**</code>, dan baris kosong untuk pemisah paragraf.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLearnMoreReset("admin")}
                className="text-gray-600"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset ke Default (Admin)
              </Button>
            </TabsContent>
          </Tabs>

          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Setelah disimpan, perubahan langsung tampil di beranda (sebelum login). Pengunjung yang klik blok
              &quot;Pelajari Lebih Lanjut&quot; akan melihat pilihan <strong>Siswa</strong> atau{" "}
              <strong>Admin/Guru</strong>, lalu dapat membaca panduan sesuai pilihan.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLearnMoreReset("all")}
            className="text-gray-600"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset Semua ke Default
          </Button>
          <Button onClick={handleLearnMoreSave} disabled={learnMoreSaving} className="bg-teal-600 hover:bg-teal-700">
            {learnMoreSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {learnMoreSaving ? "Menyimpan..." : "Simpan Konten"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
