"use client";

import React, { useState, useRef } from "react";
import {
  ArrowLeft, Phone, Mail, User, Lock, Eye, EyeOff, KeyRound,
  Camera, Upload, X, Check, RefreshCw, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, UserPhoto, type View } from "@/lib/app-shared";

export default function ProfilePage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    whatsapp: user?.whatsapp || "",
    jenisKelamin: user?.jenisKelamin || "",
  });
  const [photoData, setPhotoData] = useState<string>(user?.image || "");
  const [photoChanged, setPhotoChanged] = useState(false);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  // Password change (opt-in)
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (!user) return null;

  // Format WhatsApp for display and link
  const formatWaDisplay = (wa: string) => {
    if (!wa) return "";
    if (wa.startsWith("0")) return wa;
    if (wa.startsWith("62")) return "0" + wa.slice(2);
    return wa;
  };
  const formatWaLink = (wa: string) => {
    if (!wa) return "";
    if (wa.startsWith("0")) return "62" + wa.slice(1);
    if (wa.startsWith("62")) return wa;
    if (wa.startsWith("+62")) return wa.slice(1);
    return "62" + wa;
  };

  const startEdit = () => {
    setForm({
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp || "",
      jenisKelamin: user.jenisKelamin || "",
    });
    setPhotoData(user.image || "");
    setPhotoChanged(false);
    setPhotoRemoved(false);
    setShowPasswordFields(false);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setPhotoData(user.image || "");
    setPhotoChanged(false);
    setPhotoRemoved(false);
    setShowPasswordFields(false);
    setNewPassword("");
    setConfirmPassword("");
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
      setPhotoChanged(true);
      setPhotoRemoved(false);
    };
    reader.onerror = () => {
      toast({ title: "Error", description: "Gagal membaca file foto", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoData("");
    setPhotoChanged(false);
    setPhotoRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    // Validate password fields if user is changing password
    if (showPasswordFields) {
      if (!newPassword.trim()) {
        toast({ title: "Validasi", description: "Password baru tidak boleh kosong", variant: "destructive" });
        return;
      }
      if (newPassword.length < 6) {
        toast({ title: "Validasi", description: "Password minimal 6 karakter", variant: "destructive" });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({ title: "Validasi", description: "Konfirmasi password tidak cocok", variant: "destructive" });
        return;
      }
    }

    // Build payload — only include changed fields
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      whatsapp: form.whatsapp,
      jenisKelamin: form.jenisKelamin || null,
    };

    if (photoChanged && photoData) {
      payload.image = photoData;
    } else if (photoRemoved) {
      payload.image = null;
    }

    if (showPasswordFields && newPassword.trim()) {
      payload.password = newPassword;
    }

    setSaving(true);
    try {
      const data = await apiFetch("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }, user.id, user.role, String(user.grade));

      // Update auth context + localStorage
      const updatedUser = data.user as typeof user;
      setUser(updatedUser);

      const changedFields: string[] = [];
      if (form.name !== user.name) changedFields.push("nama");
      if (form.email !== user.email) changedFields.push("email");
      if (form.whatsapp !== (user.whatsapp || "")) changedFields.push("WhatsApp");
      if (form.jenisKelamin !== (user.jenisKelamin || "")) changedFields.push("jenis kelamin");
      if (photoChanged) changedFields.push("foto");
      else if (photoRemoved) changedFields.push("hapus foto");
      if (showPasswordFields) changedFields.push("password");

      toast({
        title: "Berhasil",
        description: changedFields.length > 0
          ? `Profil diperbarui (${changedFields.join(", ")})`
          : "Profil berhasil diperbarui",
      });
      setEditing(false);
      setShowPasswordFields(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Gagal memperbarui profil", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">Profil</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-teal-600" />
              {editing ? "Edit Profil" : "Informasi Profil"}
            </CardTitle>
            {!editing && (
              <Button size="sm" variant="outline" onClick={startEdit} className="border-teal-200 text-teal-700 hover:bg-teal-50">
                Edit Profil
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* ===== Photo Section ===== */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <div className="relative">
              {editing ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative w-28 h-28 rounded-full border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/50 hover:bg-teal-50 flex items-center justify-center overflow-hidden transition-colors"
                  title="Klik untuk ganti foto"
                >
                  {photoData ? (
                    <img src={photoData} alt="Foto profil" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="flex flex-col items-center text-teal-500">
                      <Camera className="h-8 w-8" />
                      <Upload className="h-3.5 w-3.5 mt-1" />
                      <span className="text-[10px] mt-0.5">Upload Foto</span>
                    </div>
                  )}
                </button>
              ) : (
                <UserPhoto user={user} size="lg" />
              )}
              {editing && photoData && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md"
                  title="Hapus foto"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {editing && (
              <p className="text-[11px] text-gray-400 text-center max-w-[300px]">
                {photoData ? "Klik foto untuk ganti. Jika dihapus, akan tampil logo sekolah." : "Upload foto (opsional). Jika kosong, akan tampil logo sekolah."}
              </p>
            )}
            <div className="text-center">
              <h3 className="text-xl font-bold">{user.name}</h3>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-center">
                <Badge className="bg-teal-100 text-teal-700">Kelas {user.grade}</Badge>
                {user.jenisKelamin && (
                  <Badge className={user.jenisKelamin === "LAKI-LAKI" ? "bg-sky-100 text-sky-700" : "bg-pink-100 text-pink-700"}>
                    {user.jenisKelamin === "LAKI-LAKI" ? "Laki-laki" : "Perempuan"}
                  </Badge>
                )}
                {user.whatsapp && (
                  <Badge className="bg-green-100 text-green-700">
                    <Phone className="h-3 w-3 mr-1" />
                    {formatWaDisplay(user.whatsapp)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* ===== Read-only View ===== */}
          {!editing ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Nama</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Jenis Kelamin</span>
                {user.jenisKelamin ? (
                  <Badge className={user.jenisKelamin === "LAKI-LAKI" ? "bg-sky-100 text-sky-700" : "bg-pink-100 text-pink-700"}>
                    {user.jenisKelamin === "LAKI-LAKI" ? "Laki-laki" : "Perempuan"}
                  </Badge>
                ) : (
                  <span className="text-gray-400 italic">Belum diisi</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">No. WhatsApp</span>
                {user.whatsapp ? (
                  <a
                    href={`https://wa.me/${formatWaLink(user.whatsapp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-green-600 hover:text-green-700 hover:underline flex items-center gap-1.5"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {formatWaDisplay(user.whatsapp)}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Belum diisi</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kelas</span>
                <span className="font-medium">{user.grade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <span className="font-medium">{user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bergabung</span>
                <span className="font-medium">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "-"}</span>
              </div>
            </div>
          ) : (
            /* ===== Editable Form ===== */
            <div className="space-y-4">
              {/* Nama */}
              <div>
                <Label className="flex items-center gap-1.5 mb-1">
                  <User className="h-3.5 w-3.5 text-gray-500" /> Nama
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama lengkap"
                />
              </div>

              {/* Email */}
              <div>
                <Label className="flex items-center gap-1.5 mb-1">
                  <Mail className="h-3.5 w-3.5 text-gray-500" /> Email
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@contoh.com"
                />
              </div>

              {/* Jenis Kelamin */}
              <div>
                <Label className="mb-1">Jenis Kelamin</Label>
                <Select
                  value={form.jenisKelamin}
                  onValueChange={(v) => setForm({ ...form, jenisKelamin: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LAKI-LAKI">Laki-laki</SelectItem>
                    <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* WhatsApp */}
              <div>
                <Label className="flex items-center gap-1.5 mb-1">
                  <Phone className="h-3.5 w-3.5 text-gray-500" /> No. WhatsApp
                </Label>
                <Input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
                <p className="text-[11px] text-gray-400 mt-1">Format: 08xxxxxxxxxx atau +62xxxxxxxxxxx</p>
              </div>

              {/* Password change section */}
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
                          setNewPassword("");
                          setConfirmPassword("");
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
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
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
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <p className="text-[11px] text-amber-700">
                      Password baru akan aktif setelah disimpan. Anda tetap login dengan password baru.
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  {saving ? (
                    <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-1.5" /> Simpan</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Read-only info card showing account details (always visible) */}
      {!editing && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                Klik <strong className="text-teal-700">Edit Profil</strong> untuk mengubah foto, nama, email, jenis kelamin, password, atau WhatsApp Anda.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
