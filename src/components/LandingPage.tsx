"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LogIn, UserPlus, Eye, EyeOff,
  RefreshCw, Phone, Mail, Lock,
  GraduationCap, MapPin, Hash, User, Calendar,
  Camera, Upload, X,
  Sparkles, ArrowLeft, BookOpen, ShieldCheck,
  ChevronUp, ChevronDown, Download, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, FIELD_CONFIG, renderLearnMoreMarkdown, UserData } from "@/lib/app-shared";

export default function LandingPage() {
  const { setUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<Record<string, string>>({});
  const [photoData, setPhotoData] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // "Pelajari Lebih Lanjut" dialog state
  // - learnMoreOpen: whether the dialog is shown
  // - learnMoreRole: null = show role selection, "student" / "admin" = show content
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [learnMoreRole, setLearnMoreRole] = useState<"student" | "admin" | null>(null);
  // Scroll state for the "Pelajari Lebih Lanjut" dialog body — drives the
  // floating scroll-to-top / scroll-to-bottom buttons and the progress bar.
  const learnMoreBodyRef = useRef<HTMLDivElement | null>(null);
  const [learnMoreScrollPct, setLearnMoreScrollPct] = useState(0);
  const [learnMoreCanScrollUp, setLearnMoreCanScrollUp] = useState(false);
  const [learnMoreCanScrollDown, setLearnMoreCanScrollDown] = useState(false);

  const handleLearnMoreScroll = useCallback(() => {
    const el = learnMoreBodyRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const pct = maxScroll > 0 ? (el.scrollTop / maxScroll) * 100 : 0;
    setLearnMoreScrollPct(Math.min(100, Math.max(0, pct)));
    setLearnMoreCanScrollUp(el.scrollTop > 8);
    setLearnMoreCanScrollDown(el.scrollTop < maxScroll - 8);
  }, []);

  const learnMoreScrollTo = useCallback((where: "top" | "bottom") => {
    const el = learnMoreBodyRef.current;
    if (!el) return;
    el.scrollTo({
      top: where === "top" ? 0 : el.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  // Whenever the dialog opens, role changes, or content updates — reset
  // scroll position to top and recalc scroll state on next tick.
  useEffect(() => {
    if (!learnMoreOpen) return;
    const el = learnMoreBodyRef.current;
    if (!el) return;
    el.scrollTop = 0;
    // Allow content to paint before measuring.
    const id = window.setTimeout(handleLearnMoreScroll, 60);
    return () => window.clearTimeout(id);
  }, [learnMoreOpen, learnMoreRole, handleLearnMoreScroll]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    jenisKelamin: "",
    password: "",
    confirmPassword: "",
    grade: "",
  });

  // Track which fields have been touched (for showing validation errors)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: string): string | null => {
    if (isLogin) return null;
    if (!touched[field]) return null;
    switch (field) {
      case "name": return formData.name.trim() === "" ? "Nama lengkap wajib diisi" : null;
      case "email": return formData.email.trim() === "" ? "Email wajib diisi" : null;
      case "whatsapp": return formData.whatsapp.trim() === "" ? "No. WhatsApp wajib diisi" : null;
      case "jenisKelamin": return formData.jenisKelamin === "" ? "Jenis kelamin wajib dipilih" : null;
      case "password": return formData.password.trim() === "" ? "Password wajib diisi" : formData.password.length < 6 ? "Password minimal 6 karakter" : null;
      case "confirmPassword": return formData.confirmPassword.trim() === "" ? "Konfirmasi password wajib diisi" : formData.password !== formData.confirmPassword ? "Password tidak cocok" : null;
      case "grade": return formData.grade === "" ? "Jenjang kelas wajib dipilih" : null;
      default: return null;
    }
  };

  const getInputClass = (field: string) => {
    const error = getFieldError(field);
    return error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : "";
  };

  // Fetch school settings for profil sekolah section
  useEffect(() => {
    apiFetch("/api/settings", {})
      .then((data) => setSchoolInfo(data.settings as Record<string, string> || {}))
      .catch(() => {});
  }, []);

  const isRegisterFormValid = !isLogin &&
    formData.name.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.whatsapp.trim() !== "" &&
    formData.jenisKelamin !== "" &&
    formData.password.trim() !== "" &&
    formData.password.length >= 6 &&
    formData.confirmPassword.trim() !== "" &&
    formData.grade !== "" &&
    formData.password === formData.confirmPassword;

  // Count missing required fields for display
  const missingFields = !isLogin ? [
    !formData.name.trim() && "Nama Lengkap",
    !formData.email.trim() && "Email",
    !formData.whatsapp.trim() && "No. WhatsApp",
    !formData.jenisKelamin && "Jenis Kelamin",
    !formData.password.trim() && "Password",
    formData.password && formData.password.length < 6 && "Password (min. 6 karakter)",
    !formData.confirmPassword.trim() && "Konfirmasi Password",
    formData.password !== formData.confirmPassword && "Cocokkan Password",
    !formData.grade && "Jenjang Kelas",
  ].filter(Boolean) as string[] : [];

  // Reset touched when switching between login/register
  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setTouched({});
    setPhotoData("");
  };

  // Handle photo file selection — convert to base64 data URL (max 2MB)
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setPhotoData(reader.result as string);
    };
    reader.onerror = () => {
      toast({ title: "Error", description: "Gagal membaca file foto", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoData("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched on submit attempt (to show validation errors)
    if (!isLogin) {
      setTouched({
        name: true,
        email: true,
        whatsapp: true,
        jenisKelamin: true,
        password: true,
        confirmPassword: true,
        grade: true,
      });
      if (!isRegisterFormValid) {
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const data: { user: UserData; visitorLogId: string } = await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });
        setUser({ ...data.user, visitorLogId: data.visitorLogId });
        toast({ title: "Login berhasil!", description: `Selamat datang, ${data.user.name}` });
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast({ title: "Error", description: "Password tidak cocok", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (!formData.whatsapp) {
          toast({ title: "Error", description: "Masukkan nomor WhatsApp", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (!formData.jenisKelamin) {
          toast({ title: "Error", description: "Pilih jenis kelamin", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (!formData.grade) {
          toast({ title: "Error", description: "Pilih jenjang kelas", variant: "destructive" });
          setLoading(false);
          return;
        }
        const data = await apiFetch("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            whatsapp: formData.whatsapp,
            jenisKelamin: formData.jenisKelamin,
            password: formData.password,
            grade: Number(formData.grade),
            image: photoData || undefined,
          }),
        });
        setUser({ ...data.user as UserData, visitorLogId: data.visitorLogId } as UserData);
        toast({ title: "Registrasi berhasil!", description: `Selamat datang, ${data.user.name}` });
        setPhotoData("");
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/60">
      {/* Header */}
      <header className="border-b border-teal-100/50 bg-white/70 backdrop-blur-md sticky top-0 z-50 shadow-sm shadow-teal-50/30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {schoolInfo.schoolLogo ? (
              <img
                src={schoolInfo.schoolLogo}
                alt="Logo Sekolah"
                className="w-10 h-10 object-contain rounded-lg"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
                BK
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg text-gray-900">CekDiriBK.id</h1>
              <p className="text-xs text-gray-500">Self-Assessment BK</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <Badge className="mb-4 bg-teal-100 text-teal-700 hover:bg-teal-100">
            Self-Assessment Bimbingan Konseling
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Kenali Dirimu, <span className="text-teal-600">Pahami Masalahmu</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-2">
            Temukan solusi terbaik bersama BK
          </p>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            DCM (Daftar Cek Masalah) adalah daftar untuk membantu kamu mengenali berbagai masalah
            yang mungkin kamu alami, seperti pribadi, sosial, belajar, karir. Jawabanmu akan dijaga
            kerahasiaannya dan hanya digunakan untuk membantumu.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10"
        >
          {Object.entries(FIELD_CONFIG).map(([key, cfg]) => (
            <Card key={key} className={`border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${cfg.bgColor}`}>
              <CardContent className="p-4 text-center">
                <div className={`inline-flex p-3 rounded-xl mb-2 bg-white/80 ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <h3 className="font-semibold text-sm">{cfg.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{cfg.description}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* ===== "Pelajari Lebih Lanjut" glowing block ===== */}
        {schoolInfo.learnMoreEnabled !== "false" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-8 flex justify-center"
          >
            <button
              type="button"
              onClick={() => {
                setLearnMoreRole(null);
                setLearnMoreOpen(true);
              }}
              className="group relative w-full max-w-2xl overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 p-[2px] shadow-lg shadow-teal-200/50 transition-all hover:shadow-xl hover:shadow-teal-300/60 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 animate-glow"
              aria-label="Pelajari lebih lanjut fitur CekDiriBK.id"
            >
              {/* Animated glow layer */}
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.45),transparent)] bg-[length:200%_100%] animate-shimmer" />
              <span className="relative flex items-center justify-center gap-3 rounded-2xl bg-white/95 px-6 py-5 backdrop-blur-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md ring-1 ring-white/40">
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="flex flex-col items-start text-left">
                  <span className="text-base font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">Pelajari Lebih Lanjut</span>
                  <span className="text-xs text-gray-600">
                    Kenali seluruh fitur CekDiriBK.id — pilih panduan untuk <strong>Siswa</strong> atau <strong>Admin/Guru</strong>.
                  </span>
                </span>
                <span className="ml-auto hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-600 transition-transform group-hover:translate-x-0.5">
                  <BookOpen className="h-4 w-4" />
                </span>
              </span>
            </button>
          </motion.div>
        )}
      </section>

      {/* Profil Sekolah Section */}
      {schoolInfo.schoolName && (
        <section className="max-w-4xl mx-auto px-4 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="border shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  {schoolInfo.schoolLogo ? (
                    <img
                      src={schoolInfo.schoolLogo}
                      alt="Logo Sekolah"
                      className="w-10 h-10 object-contain rounded-lg bg-white/20 p-1"
                    />
                  ) : (
                    <GraduationCap className="h-8 w-8 text-white" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-white">Profil Sekolah</h3>
                    <p className="text-teal-100 text-sm">Informasi sekolah penyelenggara assessment</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  {schoolInfo.schoolLogo && (
                    <img
                      src={schoolInfo.schoolLogo}
                      alt="Logo Sekolah"
                      className="w-20 h-20 object-contain mx-auto mb-3"
                    />
                  )}
                  <h4 className="text-lg font-bold text-gray-900 uppercase">{schoolInfo.schoolName}</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {schoolInfo.schoolAddress && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <MapPin className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Alamat</p>
                        <p className="text-sm text-gray-900">{schoolInfo.schoolAddress}</p>
                      </div>
                    </div>
                  )}
                  {schoolInfo.schoolPhone && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <Phone className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Telepon</p>
                        <p className="text-sm text-gray-900">{schoolInfo.schoolPhone}</p>
                      </div>
                    </div>
                  )}
                  {schoolInfo.schoolEmail && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <Mail className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Email</p>
                        <p className="text-sm text-gray-900">{schoolInfo.schoolEmail}</p>
                      </div>
                    </div>
                  )}
                  {schoolInfo.schoolNpsn && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <Hash className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">NPSN</p>
                        <p className="text-sm text-gray-900">{schoolInfo.schoolNpsn}</p>
                      </div>
                    </div>
                  )}
                  {schoolInfo.bkCoordinator && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <User className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Koordinator BK</p>
                        <p className="text-sm text-gray-900">{schoolInfo.bkCoordinator}</p>
                      </div>
                    </div>
                  )}
                  {schoolInfo.academicYear && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <Calendar className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500">Tahun Ajaran</p>
                        <p className="text-sm text-gray-900">{schoolInfo.academicYear}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>
      )}

      {/* Auth Section */}
      <section className="max-w-md mx-auto px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="shadow-lg border-0 shadow-teal-100/50 bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">
                {isLogin ? "Selamat Datang!" : "Buat Akun Baru"}
              </CardTitle>
              <CardDescription>
                {isLogin
                  ? "Masuk untuk memulai perjalanan mengenali dirimu"
                  : "Daftar untuk memulai perjalanan mengenali dirimu bersama CekDiriBK.id"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="flex flex-col items-center gap-2">
                    <Label className="text-sm font-medium">Foto Profil <span className="text-gray-400 font-normal">(opsional)</span></Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative w-24 h-24 rounded-full border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/50 hover:bg-teal-50 flex items-center justify-center overflow-hidden transition-colors"
                        title="Klik untuk upload foto"
                      >
                        {photoData ? (
                          <img src={photoData} alt="Preview foto" className="w-full h-full object-cover rounded-full" />
                        ) : schoolInfo.schoolLogo ? (
                          <img src={schoolInfo.schoolLogo} alt="Logo sekolah (default)" className="w-full h-full object-contain p-1 opacity-60" />
                        ) : (
                          <div className="flex flex-col items-center text-teal-500">
                            <Camera className="h-7 w-7" />
                            <Upload className="h-3 w-3 mt-0.5" />
                          </div>
                        )}
                      </button>
                      {photoData && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md"
                          title="Hapus foto"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 text-center max-w-[260px]">
                      {photoData ? "Foto terpasang. Klik foto untuk ganti." : "Jika tidak diupload, akan tampil logo sekolah. Maks. 2 MB."}
                    </p>
                  </div>
                )}
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap <span className="text-rose-500">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        placeholder="Contoh: Ahmad Fauzi"
                        className={`pl-10 ${getInputClass("name")}`}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        onBlur={() => markTouched("name")}
                        required
                      />
                    </div>
                    {getFieldError("name") && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">{getFieldError("name")}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email {!isLogin && <span className="text-rose-500">*</span>}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={!isLogin ? "Contoh: ahmad@email.com" : "contoh@email.com"}
                      className={`pl-10 ${!isLogin ? getInputClass("email") : ""}`}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onBlur={() => { if (!isLogin) markTouched("email"); }}
                      required
                    />
                  </div>
                  {!isLogin && getFieldError("email") && (
                    <p className="text-xs text-rose-500 flex items-center gap-1">{getFieldError("email")}</p>
                  )}
                </div>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">No. WhatsApp <span className="text-rose-500">*</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="whatsapp"
                        type="tel"
                        placeholder="Contoh: 081234567890"
                        className={`pl-10 ${getInputClass("whatsapp")}`}
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        onBlur={() => markTouched("whatsapp")}
                        required
                      />
                    </div>
                    {getFieldError("whatsapp") ? (
                      <p className="text-xs text-rose-500 flex items-center gap-1">{getFieldError("whatsapp")}</p>
                    ) : (
                      <p className="text-xs text-gray-400">Untuk kontak Guru BK</p>
                    )}
                  </div>
                )}
                {!isLogin && (
                  <div className="space-y-2">
                    <Label>Jenis Kelamin <span className="text-rose-500">*</span></Label>
                    <Select
                      value={formData.jenisKelamin}
                      onValueChange={(val) => { setFormData({ ...formData, jenisKelamin: val }); markTouched("jenisKelamin"); }}
                    >
                      <SelectTrigger className={getInputClass("jenisKelamin")}>
                        <SelectValue placeholder="Pilih: Laki-laki / Perempuan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LAKI-LAKI">Laki-laki</SelectItem>
                        <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                    {getFieldError("jenisKelamin") && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">{getFieldError("jenisKelamin")}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">Password {!isLogin && <span className="text-rose-500">*</span>}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={!isLogin ? "Min. 6 karakter" : "Masukkan password"}
                      className={`pl-10 pr-10 ${!isLogin ? getInputClass("password") : ""}`}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      onBlur={() => { if (!isLogin) markTouched("password"); }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {!isLogin && getFieldError("password") && (
                    <p className="text-xs text-rose-500 flex items-center gap-1">{getFieldError("password")}</p>
                  )}
                  {isLogin && (
                    <p className="text-xs text-gray-400">Klik ikon mata untuk menampilkan password</p>
                  )}
                </div>
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Konfirmasi Password <span className="text-rose-500">*</span></Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Ulangi password yang sama"
                          className={`pl-10 pr-10 ${getInputClass("confirmPassword")}`}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          onBlur={() => markTouched("confirmPassword")}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {getFieldError("confirmPassword") && (
                        <p className="text-xs text-rose-500 flex items-center gap-1">{getFieldError("confirmPassword")}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Jenjang Kelas <span className="text-rose-500">*</span></Label>
                      <Select
                        value={formData.grade}
                        onValueChange={(val) => { setFormData({ ...formData, grade: val }); markTouched("grade"); }}
                      >
                        <SelectTrigger className={getInputClass("grade")}>
                          <SelectValue placeholder="Pilih: Kelas 7 / 8 / 9" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Kelas 7</SelectItem>
                          <SelectItem value="8">Kelas 8</SelectItem>
                          <SelectItem value="9">Kelas 9</SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError("grade") && (
                        <p className="text-xs text-rose-500 flex items-center gap-1">{getFieldError("grade")}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Missing fields summary */}
                {!isLogin && missingFields.length > 0 && Object.keys(touched).length > 0 && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                    <p className="text-xs font-medium text-rose-700 mb-1">
                      Lengkapi field berikut:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {missingFields.map((f, i) => (
                        <span key={i} className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading || (!isLogin && !isRegisterFormValid)}>
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : isLogin ? (
                    <LogIn className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {loading ? "Memproses..." : isLogin ? "Masuk" : "Daftar"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Separator className="my-3" />
                <p className="text-sm text-gray-500">
                  {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
                  <button
                    onClick={handleToggleMode}
                    className="text-teal-600 font-medium hover:underline"
                  >
                    {isLogin ? "Daftar sekarang" : "Masuk"}
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* ===== Download Aplikasi Section ===== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-16 mb-8 px-4"
      >
        <div className="max-w-2xl mx-auto text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <Download className="h-5 w-5 text-teal-600" />
            Download Aplikasi
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Install {schoolInfo.schoolName || "CekDiriBK.id"} langsung di HP Anda
          </p>
        </div>

        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Android */}
          <button
            type="button"
            onClick={async () => {
              if (typeof window === "undefined") return;
              // Try direct PWA install via captured beforeinstallprompt
              const anyWin = window as any;
              if (anyWin.__pwaDeferredPrompt) {
                try {
                  anyWin.__pwaDeferredPrompt.prompt();
                  const { outcome } = await anyWin.__pwaDeferredPrompt.userChoice;
                  if (outcome === "dismissed") {
                    // User dismissed — show manual instructions
                    window.dispatchEvent(new Event("trigger-pwa-ios-instructions"));
                  }
                  anyWin.__pwaDeferredPrompt = null;
                  return;
                } catch {}
              }
              // Fallback: try event-based trigger (for PWAInstallPrompt component)
              const evt = new Event("trigger-pwa-install");
              window.dispatchEvent(evt);
              // If still no action after a short delay, show instructions directly
              setTimeout(() => {
                window.dispatchEvent(new Event("trigger-pwa-ios-instructions"));
              }, 800);
            }}
            className="group flex items-center gap-4 p-5 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/50 transition-all hover:-translate-y-0.5 text-left"
          >
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden border border-emerald-100">
              {schoolInfo.schoolLogo ? (
                <img src={schoolInfo.schoolLogo} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <GraduationCap className="h-7 w-7 text-teal-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-emerald-800">{schoolInfo.schoolName || "CekDiriBK.id"}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Android</p>
            </div>
            <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center group-hover:bg-emerald-700 transition-colors">
              <Download className="h-5 w-5 text-white" />
            </div>
          </button>

          {/* iOS / iPhone */}
          <button
            type="button"
            onClick={() => {
              if (typeof window === "undefined") return;
              // iOS doesn't support beforeinstallprompt — always show instructions
              const evt = new Event("trigger-pwa-ios-instructions");
              window.dispatchEvent(evt);
              // Fallback: ensure dialog opens even if PWAInstallPrompt not mounted
              setTimeout(() => {
                const dialog = document.querySelector('[role="dialog"]');
                if (!dialog) {
                  // PWAInstallPrompt may not be listening — show alert as last resort
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  if (isIOS) {
                    alert('Cara Install:\n\n1. Tap tombol Share (ikon ⬆️ di bawah Safari)\n2. Pilih "Add to Home Screen"\n3. Tap "Add"\n\nAplikasi akan muncul di home screen Anda.');
                  }
                }
              }, 1000);
            }}
            className="group flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-300 bg-gradient-to-br from-gray-50/80 to-slate-50/60 hover:border-gray-400 hover:shadow-lg hover:shadow-gray-100/50 transition-all hover:-translate-y-0.5 text-left"
          >
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden border border-gray-200">
              {schoolInfo.schoolLogo ? (
                <img src={schoolInfo.schoolLogo} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <GraduationCap className="h-7 w-7 text-teal-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-800">{schoolInfo.schoolName || "CekDiriBK.id"}</p>
              <p className="text-xs text-gray-500 mt-0.5">iOS / iPhone</p>
            </div>
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-gray-900 transition-colors">
              <Download className="h-5 w-5 text-white" />
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
          <Smartphone className="h-3 w-3" />
          Aplikasi akan terpasang di home screen HP Anda seperti app biasa
        </p>
      </motion.section>

      {/* Footer */}
      <footer className="border-t bg-white/80 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          {schoolInfo.schoolName && (
            <div className="mb-3 flex items-center justify-center gap-2">
              {schoolInfo.schoolLogo && (
                <img
                  src={schoolInfo.schoolLogo}
                  alt="Logo Sekolah"
                  className="w-8 h-8 object-contain"
                />
              )}
              <div>
                <p className="font-semibold text-gray-700">{schoolInfo.schoolName}</p>
                {schoolInfo.schoolAddress && <p className="text-xs text-gray-500">{schoolInfo.schoolAddress}</p>}
              </div>
            </div>
          )}
          <p className="text-sm text-gray-500">
            Hak Cipta dan Dibuat oleh Team 6. Didukung oleh CekDiriBK.id
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Kenali dirimu, Pahami masalahmu, dan temukan solusi terbaik bersama BK.
          </p>
        </div>
      </footer>

      {/* NOTE: The floating WhatsApp "Bantuan BK" button is rendered globally
          by src/app/page.tsx (via <WhatsAppFloatingButton />) so it shows on
          every page — before AND after login — using the admin-configured
          bkWhatsApp number. Do not add a second one here. */}

      {/* ===== "Pelajari Lebih Lanjut" Dialog ===== */}
      <Dialog
        open={learnMoreOpen}
        onOpenChange={(open) => {
          setLearnMoreOpen(open);
          if (!open) setLearnMoreRole(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[88vh] p-0 gap-0 overflow-hidden flex flex-col">
          {/* Header (sticky) */}
          <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex-shrink-0 relative z-20">
            <div className="flex items-center gap-3">
              {learnMoreRole && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-gray-600 hover:bg-white/60"
                  onClick={() => setLearnMoreRole(null)}
                  title="Kembali ke pilihan"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shrink-0">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-bold text-gray-900 truncate">
                    {learnMoreRole === null
                      ? "Pelajari Lebih Lanjut"
                      : learnMoreRole === "student"
                        ? (schoolInfo.learnMoreStudentTitle || "Panduan Fitur untuk Siswa")
                        : (schoolInfo.learnMoreAdminTitle || "Panduan Fitur untuk Admin/Guru")}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-600 truncate">
                    {learnMoreRole === null
                      ? "Pilih panduan sesuai peranmu untuk menjelajahi fitur CekDiriBK.id."
                      : learnMoreRole === "student"
                        ? "Panduan lengkap fitur untuk siswa."
                        : "Panduan lengkap fitur untuk guru/konselor (admin)."}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Body (scrollable) — uses native overflow-y-auto so the scrollbar
              is reliably visible & draggable on the right side. */}
          <div
            ref={learnMoreBodyRef}
            onScroll={handleLearnMoreScroll}
            className="learn-more-scroll relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          >
            {/* Scroll progress bar (right edge) — visible slider showing position */}
            {learnMoreRole !== null && (
              <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-1.5 z-10">
                <div
                  className="w-full bg-gradient-to-b from-teal-400 to-emerald-500 transition-[height] duration-75"
                  style={{
                    height: `${Math.max(8, Math.min(100, learnMoreScrollPct))}%`,
                    opacity: learnMoreCanScrollUp || learnMoreCanScrollDown ? 0.85 : 0,
                  }}
                />
              </div>
            )}

            {learnMoreRole === null ? (
              /* ----- Role selection view ----- */
              <div className="p-6 grid sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setLearnMoreRole("student")}
                  className="group text-left rounded-2xl border-2 border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-50 p-6 transition-all hover:border-teal-300 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md ring-1 ring-white/40 group-hover:scale-105 transition-transform">
                      <GraduationCap className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">Siswa</h3>
                      <p className="text-xs text-gray-600">Akses akun siswa</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Panduan lengkap fitur untuk siswa: Login &amp; Registrasi, Dashboard, Daftar Cek Masalah (DCM),
                    Mengerjakan Survey, Hasil Analisa, Laporan Survey, Sertifikat, dan Profil.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 group-hover:gap-2 transition-all">
                    Lihat panduan siswa <BookOpen className="h-4 w-4" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLearnMoreRole("admin")}
                  className="group text-left rounded-2xl border-2 border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 transition-all hover:border-violet-300 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md ring-1 ring-white/40 group-hover:scale-105 transition-transform">
                      <ShieldCheck className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">Admin / Konselor / Guru</h3>
                      <p className="text-xs text-gray-600">Akses admin</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Panduan lengkap 11 menu admin: Dashboard, Kelola User, Kelola Survey, Konseling BK (+AI),
                    Hasil Analisa, Sertifikat, Log Visitor, Monitoring, Laporan Survey, Import/Export, dan Pengaturan.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 group-hover:gap-2 transition-all">
                    Lihat panduan admin <BookOpen className="h-4 w-4" />
                  </span>
                </button>
              </div>
            ) : (
              /* ----- Content view (rendered markdown) ----- */
              <div className="px-6 py-5 pb-24">
                {learnMoreRole === "student"
                  ? renderLearnMoreMarkdown(schoolInfo.learnMoreStudentContent || "")
                  : renderLearnMoreMarkdown(schoolInfo.learnMoreAdminContent || "")}

                {/* End-of-content marker — confirms to the user they've reached the bottom */}
                <div className="mt-8 mb-2 flex items-center gap-2 text-xs text-teal-600">
                  <span className="h-px flex-1 bg-teal-100" />
                  <span className="font-medium">Akhir panduan</span>
                  <span className="h-px flex-1 bg-teal-100" />
                </div>
              </div>
            )}

            {/* Floating scroll-to-top / scroll-to-bottom buttons (right side, sticky) */}
            {learnMoreRole !== null && (learnMoreCanScrollUp || learnMoreCanScrollDown) && (
              <div className="sticky bottom-3 z-20 flex w-full justify-end pr-3 pointer-events-none">
                <div className="flex flex-col gap-2 items-end pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => learnMoreScrollTo("top")}
                    disabled={!learnMoreCanScrollUp}
                    aria-label="Gulir ke atas"
                    title="Gulir ke atas"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-teal-200 text-teal-700 transition hover:bg-teal-50 hover:ring-teal-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => learnMoreScrollTo("bottom")}
                    disabled={!learnMoreCanScrollDown}
                    aria-label="Gulir ke bawah"
                    title="Gulir ke bawah"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-teal-200 text-teal-700 transition hover:bg-teal-50 hover:ring-teal-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer (sticky) */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-2 flex-shrink-0">
            <p className="text-xs text-gray-500">
              {learnMoreRole === null
                ? "Konten dapat diedit oleh admin di menu Pengaturan."
                : `Menampilkan panduan untuk ${learnMoreRole === "student" ? "Siswa" : "Admin/Guru"}.`}
            </p>
            <div className="flex gap-2">
              {learnMoreRole && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLearnMoreRole(null)}
                  className="text-gray-600"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Ganti Panduan
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  setLearnMoreOpen(false);
                  setLearnMoreRole(null);
                }}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
