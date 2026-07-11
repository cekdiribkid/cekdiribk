"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Eye, ArrowLeft, Search, RefreshCw, Clock, Users,
  LogIn, LogOut, Filter, CalendarDays,
  MonitorSmartphone, ChevronLeft, ChevronRight,
  Smartphone, Tablet, Laptop, Globe, Cpu,
  Trash2, AlertTriangle, History, CalendarX, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth, apiFetch, UserPhoto, type View } from "@/lib/app-shared";

interface VisitorLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  // Photo (base64 data URL) + gender, fetched via the user relation so the
  // visitor table can render the same UserPhoto component used in Kelola
  // User / Monitoring. Both are null when the user has no photo / was
  // deleted — UserPhoto falls back to gender avatar then initials.
  userImage?: string | null;
  userJenisKelamin?: string | null;
  loginAt: string;
  logoutAt: string | null;
  durationSeconds: number | null;
  durationStr: string;
  isActive: boolean;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  deviceOS: string;
  browser: string;
  userAgent: string;
}

interface VisitorStats {
  totalVisits: number;
  activeNow: number;
}

type DeleteMode = "selected" | "olderThan" | "dateRange" | "all";

export default function AdminVisitor({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<VisitorLogEntry[]>([]);
  const [stats, setStats] = useState<VisitorStats>({ totalVisits: 0, activeNow: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Selection state for checkbox-based deletion
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete dialog state
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("selected");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteOlderDays, setDeleteOlderDays] = useState(7);
  const [deleteDateFrom, setDeleteDateFrom] = useState("");
  const [deleteDateTo, setDeleteDateTo] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        page: String(page),
        search,
        role: roleFilter,
        dateFrom,
        dateTo,
      });
      const data = await apiFetch(`/api/admin/visitors?${params.toString()}`, {}, user?.id, user?.role);
      setLogs((data.logs as VisitorLogEntry[]) || []);
      setStats((data.stats as VisitorStats) || { totalVisits: 0, activeNow: 0 });
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch visitor logs:", err);
    } finally {
      setLoading(false);
    }
  }, [user, page, search, roleFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Manual refresh handler
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const hariNama = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()];
    const tgl = d.getDate();
    const blnNama = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()];
    const thn = d.getFullYear();
    const jam = String(d.getHours()).padStart(2, "0");
    const menit = String(d.getMinutes()).padStart(2, "0");
    const detik = String(d.getSeconds()).padStart(2, "0");
    return `${hariNama}, ${tgl} ${blnNama} ${thn} ${jam}:${menit}:${detik}`;
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Helper to render device icon based on deviceType
  const getDeviceIcon = (deviceType: string) => {
    const t = (deviceType || "").toLowerCase();
    if (t.includes("smartphone") || t.includes("phone")) return <Smartphone className="h-3.5 w-3.5" />;
    if (t.includes("tablet")) return <Tablet className="h-3.5 w-3.5" />;
    if (t.includes("laptop") || t.includes("pc")) return <Laptop className="h-3.5 w-3.5" />;
    return <Cpu className="h-3.5 w-3.5" />;
  };

  // Helper to build device display text
  const getDeviceDisplay = (log: VisitorLogEntry) => {
    const parts: string[] = [];
    if (log.deviceBrand && log.deviceBrand !== "Unknown") parts.push(log.deviceBrand);
    if (log.deviceModel && log.deviceModel !== log.deviceBrand) parts.push(log.deviceModel);
    if (parts.length === 0 && log.deviceType) parts.push(log.deviceType);
    if (parts.length === 0) parts.push("Tidak diketahui");
    return parts.join(" ");
  };

  const getDeviceBadgeColor = (deviceType: string) => {
    const t = (deviceType || "").toLowerCase();
    if (t.includes("smartphone") || t.includes("phone")) return "bg-sky-100 text-sky-700 hover:bg-sky-100";
    if (t.includes("tablet")) return "bg-violet-100 text-violet-700 hover:bg-violet-100";
    if (t.includes("laptop") || t.includes("pc")) return "bg-amber-100 text-amber-700 hover:bg-amber-100";
    return "bg-gray-100 text-gray-600 hover:bg-gray-100";
  };

  // ==================== Selection helpers ====================
  const visibleIds = useMemo(() => logs.map((l) => l.id), [logs]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        visibleIds.forEach((id) => next.add(id));
      } else {
        visibleIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ==================== Delete handlers ====================
  // Use a ref to reliably track the current delete mode (avoids stale closures)
  const deleteModeRef = React.useRef<DeleteMode>("selected");

  const openDeleteDialog = (mode: DeleteMode) => {
    deleteModeRef.current = mode;
    setDeleteMode(mode);
    setDeleteResult(null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    // Read mode from ref to guarantee we get the latest value
    const mode = deleteModeRef.current;
    setDeleting(true);
    setDeleteResult(null);
    try {
      let body: Record<string, unknown> = { mode };
      if (mode === "selected") {
        body.ids = Array.from(selectedIds);
      } else if (mode === "olderThan") {
        body.days = deleteOlderDays;
      } else if (mode === "dateRange") {
        body.dateFrom = deleteDateFrom;
        body.dateTo = deleteDateTo;
      }

      const data = await apiFetch(
        "/api/admin/visitors",
        { method: "DELETE", body: JSON.stringify(body) },
        user?.id,
        user?.role
      );

      if (data.error) {
        setDeleteResult(`Gagal: ${data.error}`);
      } else {
        const count = (data.deletedCount as number) || 0;
        setDeleteResult(`Berhasil! ${count} entri log visitor telah dihapus.`);
        // Reset selection & close dialog after a short delay
        if (mode === "selected") clearSelection();
        setDeleteDateFrom("");
        setDeleteDateTo("");
        // Refresh data
        await fetchLogs();
        // Auto-close dialog after success
        setTimeout(() => {
          setDeleteDialogOpen(false);
          setDeleteResult(null);
        }, 1800);
      }
    } catch (err) {
      console.error("Delete visitor logs error:", err);
      setDeleteResult("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setDeleting(false);
    }
  };

  // Build confirmation message based on delete mode
  const deleteConfirmMessage = useMemo(() => {
    if (deleteMode === "selected") {
      return `${selectedIds.size} entri yang dipilih akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`;
    }
    if (deleteMode === "olderThan") {
      return `Semua entri log visitor yang berusia lebih dari ${deleteOlderDays} hari akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`;
    }
    if (deleteMode === "dateRange") {
      const from = deleteDateFrom || "awal";
      const to = deleteDateTo || "sekarang";
      return `Semua entri log visitor dari tanggal ${from} sampai ${to} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`;
    }
    if (deleteMode === "all") {
      return `PERINGATAN: SEMUA ${total} entri log visitor akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`;
    }
    return "";
  }, [deleteMode, selectedIds.size, deleteOlderDays, deleteDateFrom, deleteDateTo, total]);

  const canExecuteDelete = useMemo(() => {
    if (deleteMode === "selected") return selectedIds.size > 0;
    if (deleteMode === "olderThan") return deleteOlderDays > 0;
    if (deleteMode === "dateRange") return Boolean(deleteDateFrom || deleteDateTo);
    if (deleteMode === "all") return true;
    return false;
  }, [deleteMode, selectedIds.size, deleteOlderDays, deleteDateFrom, deleteDateTo]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("admin-dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6 text-cyan-600" />
            Log Visitor
          </h2>
          <p className="text-gray-500 text-sm">Riwayat aktivitas pengunjung website</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-cyan-100 rounded-xl text-cyan-600">
                <LogIn className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-700">{stats.totalVisits}</p>
                <p className="text-sm text-cyan-600">Total Kunjungan</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                <MonitorSmartphone className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{stats.activeNow}</p>
                <p className="text-sm text-emerald-600">Sedang Aktif</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Filter</span>
              {(search || roleFilter || dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-rose-500 hover:text-rose-700 ml-auto">
                  Reset Filter
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari nama user..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val === "ALL" ? "" : val); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Role</SelectItem>
                  <SelectItem value="USER">Siswa</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="pl-9"
                  placeholder="Dari tanggal"
                />
              </div>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="pl-9"
                  placeholder="Sampai tanggal"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Management Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="mb-6 border-rose-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-semibold text-gray-700">Manajemen Hapus Log</span>
              {selectedIds.size > 0 && (
                <Badge className="ml-auto bg-rose-100 text-rose-700 hover:bg-rose-100 text-[10px]">
                  {selectedIds.size} dipilih
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Delete selected (enabled when checkboxes are checked) */}
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => openDeleteDialog("selected")}
                className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                Hapus Terpilih {selectedIds.size > 0 && `(${selectedIds.size})`}
              </Button>

              {/* Delete older than N days */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setDeleteOlderDays(7); openDeleteDialog("olderThan"); }}
                className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
              >
                <History className="h-4 w-4" />
                Hapus &gt; 7 Hari
              </Button>

              {/* Delete by date range */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDeleteDialog("dateRange")}
                className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50 hover:text-violet-700"
              >
                <CalendarX className="h-4 w-4" />
                Hapus Rentang Tanggal
              </Button>

              {/* Clear selection button */}
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="gap-1 text-gray-500 hover:text-gray-700 ml-auto"
                >
                  <X className="h-3.5 w-3.5" />
                  Batalkan Pilihan
                </Button>
              )}
            </div>

            {/* Select all visible info */}
            {selectedIds.size > 0 && (
              <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {selectedIds.size} entri dipilih untuk dihapus
                </span>
                <span className="text-gray-300">·</span>
                <span>Pilihan hanya berlaku pada halaman saat ini</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Unified Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(o) => {
        if (!o && !deleting) {
          setDeleteDialogOpen(false);
          setDeleteResult(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteMode === "selected" && <AlertTriangle className="h-5 w-5 text-rose-500" />}
              {deleteMode === "olderThan" && <History className="h-5 w-5 text-amber-500" />}
              {deleteMode === "dateRange" && <CalendarX className="h-5 w-5 text-violet-500" />}
              {deleteMode === "selected" && "Hapus Log Visitor Terpilih?"}
              {deleteMode === "olderThan" && `Hapus Log Berusia > ${deleteOlderDays} Hari?`}
              {deleteMode === "dateRange" && "Hapus Log Berdasarkan Rentang Tanggal?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "dateRange"
                ? "Pilih rentang tanggal untuk menghapus semua log visitor pada periode tersebut."
                : deleteConfirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Date range inputs for dateRange mode */}
          {deleteMode === "dateRange" && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div>
                <Label className="text-xs text-gray-500 mb-1">Dari Tanggal</Label>
                <Input type="date" value={deleteDateFrom} onChange={(e) => setDeleteDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1">Sampai Tanggal</Label>
                <Input type="date" value={deleteDateTo} onChange={(e) => setDeleteDateTo(e.target.value)} />
              </div>
            </div>
          )}
          {deleteMode === "dateRange" && (
            <p className="text-[11px] text-gray-400 -mt-1">{deleteConfirmMessage}</p>
          )}

          {/* Older-than days input for olderThan mode */}
          {deleteMode === "olderThan" && (
            <div className="py-2">
              <Label className="text-xs text-gray-500 mb-1">Hapus log berusia lebih dari (hari)</Label>
              <Input
                type="number"
                min={1}
                value={deleteOlderDays}
                onChange={(e) => setDeleteOlderDays(Math.max(1, Number(e.target.value) || 1))}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Atur jumlah hari. Default 7 hari. Semua log yang login sebelum tanggal tersebut akan dihapus.
              </p>
            </div>
          )}

          {deleteResult && (
            <div className={`text-sm rounded-md px-3 py-2 ${
              deleteResult.startsWith("Berhasil")
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
              {deleteResult}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || !canExecuteDelete}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40"
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-1" /> Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" /> Ya, Hapus
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Visitor Log Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-sky-600 text-white px-4 py-3 rounded-t-lg flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-semibold text-sm">Riwayat Aktivitas Visitor</span>
              <span className="ml-auto text-xs text-cyan-100">{total} entri</span>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-cyan-400 mb-3" />
                <p className="text-gray-500 text-sm">Memuat data visitor...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <Eye className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Belum ada data visitor</p>
                <p className="text-gray-400 text-sm">Data akan muncul ketika pengguna login ke website</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 w-10">
                          <Checkbox
                            checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                            onCheckedChange={(v) => toggleSelectAll(v === true)}
                            aria-label="Pilih semua"
                          />
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 w-8">#</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Nama User</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Role</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Perangkat</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Waktu Login</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Waktu Logout</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Durasi</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, idx) => {
                        const isChecked = selectedIds.has(log.id);
                        return (
                          <tr
                            key={log.id}
                            className={`border-b border-gray-50 hover:bg-cyan-50/30 transition-colors ${
                              log.isActive ? "bg-emerald-50/40" : ""
                            } ${isChecked ? "bg-rose-50/60" : ""}`}
                          >
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(v) => toggleSelectOne(log.id, v === true)}
                                aria-label={`Pilih ${log.userName}`}
                              />
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">
                              {(page - 1) * limit + idx + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <UserPhoto
                                  user={{
                                    image: log.userImage,
                                    name: log.userName,
                                    jenisKelamin: log.userJenisKelamin,
                                  }}
                                  size="sm"
                                />
                                <span className="font-medium text-gray-800">{log.userName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge className={`text-[10px] ${
                                log.userRole === "ADMIN"
                                  ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
                                  : "bg-teal-100 text-teal-700 hover:bg-teal-100"
                              }`}>
                                {log.userRole === "ADMIN" ? "Admin" : "Siswa"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                <span className={`shrink-0 p-1 rounded-md ${getDeviceBadgeColor(log.deviceType)}`}>
                                  {getDeviceIcon(log.deviceType)}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-gray-800 truncate" title={getDeviceDisplay(log)}>
                                    {getDeviceDisplay(log)}
                                  </p>
                                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                    {log.deviceOS && (
                                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                        <Cpu className="h-2.5 w-2.5" />{log.deviceOS}
                                      </span>
                                    )}
                                    {log.browser && (
                                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                        <Globe className="h-2.5 w-2.5" />{log.browser.split(" ")[0]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-gray-700 text-xs">{formatDateTime(log.loginAt)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {log.logoutAt ? (
                                <div className="flex items-center gap-1.5">
                                  <LogOut className="h-3.5 w-3.5 text-rose-500" />
                                  <span className="text-gray-700 text-xs">{formatDateTime(log.logoutAt)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs italic">Masih aktif</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-cyan-500" />
                                <span className={`font-mono text-xs ${
                                  log.isActive ? "text-emerald-600 font-semibold" : "text-gray-700"
                                }`}>
                                  {log.durationStr}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {log.isActive ? (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
                                  Online
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-[10px]">
                                  Offline
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3 p-4">
                  {/* Select all on mobile */}
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Checkbox
                      checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleSelectAll(v === true)}
                      id="select-all-mobile"
                    />
                    <Label htmlFor="select-all-mobile" className="text-sm text-gray-600 cursor-pointer">
                      Pilih semua di halaman ini
                    </Label>
                  </div>
                  {logs.map((log, idx) => {
                    const isChecked = selectedIds.has(log.id);
                    return (
                      <div
                        key={log.id}
                        className={`rounded-xl border p-4 ${
                          isChecked
                            ? "border-rose-300 bg-rose-50/50"
                            : log.isActive
                              ? "border-emerald-200 bg-emerald-50/30"
                              : "border-gray-100 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(v) => toggleSelectOne(log.id, v === true)}
                              aria-label={`Pilih ${log.userName}`}
                            />
                            <UserPhoto
                              user={{
                                image: log.userImage,
                                name: log.userName,
                                jenisKelamin: log.userJenisKelamin,
                              }}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium text-sm text-gray-800">{log.userName}</p>
                              <Badge className={`text-[9px] mt-0.5 ${
                                log.userRole === "ADMIN"
                                  ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
                                  : "bg-teal-100 text-teal-700 hover:bg-teal-100"
                              }`}>
                                {log.userRole === "ADMIN" ? "Admin" : "Siswa"}
                              </Badge>
                            </div>
                          </div>
                          {log.isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
                              Online
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-[10px]">
                              Offline
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <LogIn className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="text-gray-500">Login:</span>
                            <span className="text-gray-800 font-medium">{formatDateTime(log.loginAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <LogOut className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span className="text-gray-500">Logout:</span>
                            <span className="text-gray-800 font-medium">
                              {log.logoutAt ? formatDateTime(log.logoutAt) : "Masih aktif"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                            <span className="text-gray-500">Durasi:</span>
                            <span className={`font-mono font-medium ${
                              log.isActive ? "text-emerald-600" : "text-gray-800"
                            }`}>
                              {log.durationStr}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
                            <span className={`shrink-0 p-1 rounded-md ${getDeviceBadgeColor(log.deviceType)}`}>
                              {getDeviceIcon(log.deviceType)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-gray-800 font-medium text-xs">{getDeviceDisplay(log)}</p>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                {log.deviceOS && (
                                  <span className="text-[10px] text-gray-500">{log.deviceOS}</span>
                                )}
                                {log.browser && (
                                  <span className="text-[10px] text-gray-500">· {log.browser.split(" ")[0]}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Halaman {page} dari {totalPages} ({total} data)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="h-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="h-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Manual refresh button */}
      <div className="mt-4 text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2 text-cyan-600 border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Memuat ulang..." : "Refresh Data Visitor"}
        </Button>
        <p className="text-xs text-gray-400 mt-2">
          Klik tombol untuk memperbarui data log visitor
        </p>
      </div>
    </div>
  );
}
