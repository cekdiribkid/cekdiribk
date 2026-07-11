"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Settings, RefreshCw, CheckCircle2, Bot, Wifi, WifiOff, Eye, EyeOff, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, type View, KopSurat } from "@/lib/app-shared";

interface ProviderPreset {
  label: string;
  baseUrl: string;
  models: string[];
  description: string;
}

export default function AdminSettings({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    schoolName: "",
    schoolNpsn: "",
    schoolAddress: "",
    schoolPhone: "",
    schoolEmail: "",
    bkCoordinator: "",
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
          bkCoordinator: s.bkCoordinator || "",
          academicYear: s.academicYear || "",
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
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal menyimpan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAiSave = async () => {
    if (!user) return;
    setAiSaving(true);
    setAiTestResult(null);
    try {
      const data = await apiFetch("/api/admin/ai-config", {
        method: "PUT",
        body: JSON.stringify(aiConfig),
      }, user.id, user.role, String(user.grade));
      setAiConfig(data.settings || {});
      toast({ title: "Berhasil", description: "Konfigurasi AI berhasil disimpan" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal menyimpan", variant: "destructive" });
    } finally {
      setAiSaving(false);
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
  };

  const isConfigured = aiConfig.ai_provider && aiConfig.ai_base_url && aiConfig.ai_api_key;

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
              <Label>Tahun Ajaran</Label>
              <Input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2024/2025" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            setForm({ schoolName: settings.schoolName || "", schoolNpsn: settings.schoolNpsn || "", schoolAddress: settings.schoolAddress || "", schoolPhone: settings.schoolPhone || "", schoolEmail: settings.schoolEmail || "", bkCoordinator: settings.bkCoordinator || "", academicYear: settings.academicYear || "" });
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
          <KopSurat schoolSettings={form} />
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-teal-600" />
            Konfigurasi AI
          </CardTitle>
          <CardDescription>
            Atur layanan AI untuk fitur Generate AI di sesi konseling. Mendukung berbagai provider OpenAI-compatible.
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
              <div className="flex items-center gap-2">
                {isConfigured ? (
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
              </div>

              {!isConfigured && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Fitur Generate AI memerlukan konfigurasi layanan AI. Pilih provider dan masukkan kredensial Anda di bawah. 
                    Untuk penggunaan gratis, Anda bisa mendaftar di <strong>Groq</strong> (console.groq.com) atau <strong>Together AI</strong> (api.together.xyz).
                  </AlertDescription>
                </Alert>
              )}

              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>Provider AI</Label>
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
                <Label>Base URL</Label>
                <Input
                  value={aiConfig.ai_base_url}
                  onChange={(e) => setAiConfig({ ...aiConfig, ai_base_url: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
                <p className="text-xs text-gray-500">
                  URL dasar API (tanpa /chat/completions). Contoh: https://api.openai.com/v1
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={aiConfig.ai_api_key}
                    onChange={(e) => setAiConfig({ ...aiConfig, ai_api_key: e.target.value })}
                    placeholder="sk-... atau gsk_..."
                    className="pr-10"
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
                <p className="text-xs text-gray-500">
                  Kunci API dari provider. Untuk Groq: buat di console.groq.com → API Keys
                </p>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label>Model</Label>
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
                  <AlertDescription>{aiTestResult.message}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            {isConfigured && (
              <Button variant="outline" size="sm" onClick={handleAiDelete} className="text-rose-600 hover:text-rose-700">
                <Trash2 className="h-4 w-4 mr-1" />
                Hapus
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {isConfigured && (
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

      {/* Panduan Konfigurasi */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Panduan Konfigurasi AI
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div>
            <h4 className="font-semibold text-gray-700">Groq (Gratis & Cepat - Rekomendasi)</h4>
            <ol className="list-decimal list-inside text-gray-600 space-y-1 mt-1">
              <li>Buka <strong>console.groq.com</strong> dan daftar akun gratis</li>
              <li>Buat API Key di menu API Keys</li>
              <li>Pilih provider <strong>Groq</strong>, masukkan API Key (awalan gsk_...)</li>
              <li>Model: <strong>llama-3.3-70b-versatile</strong> (rekomendasi)</li>
              <li>Klik &quot;Tes Koneksi&quot; untuk memastikan berjalan</li>
            </ol>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold text-gray-700">OpenAI (Berbayar)</h4>
            <ol className="list-decimal list-inside text-gray-600 space-y-1 mt-1">
              <li>Buka <strong>platform.openai.com</strong> dan daftar</li>
              <li>Buat API Key di menu API Keys</li>
              <li>Pilih provider <strong>OpenAI</strong>, masukkan API Key (awalan sk-...)</li>
              <li>Model: <strong>gpt-4o-mini</strong> (murah) atau <strong>gpt-4o</strong> (lebih baik)</li>
            </ol>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold text-gray-700">Custom / Ollama Lokal</h4>
            <ol className="list-decimal list-inside text-gray-600 space-y-1 mt-1">
              <li>Jalankan Ollama atau LM Studio di komputer Anda</li>
              <li>Pilih provider <strong>Custom</strong></li>
              <li>Base URL: <strong>http://localhost:11434/v1</strong> (Ollama) atau sesuai port LM Studio</li>
              <li>API Key: isi apa saja (misalnya: &quot;local&quot;)</li>
              <li>Model: nama model Ollama (misalnya: <strong>llama3</strong>)</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
