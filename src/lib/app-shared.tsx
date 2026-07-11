"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Heart, Users, BookOpen, Briefcase,
  CheckCircle2, XCircle, Calendar,
} from "lucide-react";

// ==================== TYPES ====================
export type View = "landing" | "dashboard" | "dcm" | "survey" | "results" | "result-detail" | "profile" | "student-counseling" | "student-certificate" | "admin-dashboard" | "admin-users" | "admin-surveys" | "admin-import" | "admin-counseling" | "admin-analysis" | "admin-analysis-detail" | "admin-report" | "admin-monitoring" | "admin-settings" | "admin-certificate" | "admin-visitor" | "certificate-view" | "student-report";

export interface UserData {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  jenisKelamin?: string;
  grade: number;
  role: string;
  image?: string;
  createdAt?: string;
  visitorLogId?: string; // Track current session's visitor log
}

export interface SurveyData {
  id: string;
  title: string;
  description: string;
  grade: number;
  field: string;
  active: boolean;
  _count?: { questions: number; responses: number };
  questions?: QuestionData[];
  responses?: { id: string; completed: boolean; completedAt: string | null }[];
}

export interface QuestionData {
  id: string;
  text: string;
  order: number;
}

export interface ResponseData {
  id: string;
  userId: string;
  surveyId: string;
  completed: boolean;
  completedAt: string | null;
  survey: { id: string; title: string; grade: number; field: string; description?: string };
  answers: AnswerData[];
}

export interface AnswerData {
  id: string;
  questionId: string;
  value: string;
  question: { id: string; text: string; order: number };
}

export interface CounselingData {
  id: string;
  studentId: string;
  date: string;
  topic: string;
  field: string;
  topicItems?: string | null;
  ringkasan: string | null;
  notes: string | null;
  followUp: string | null;
  solusi: string | null;
  status: string;
  bkOfficer: string;
  createdAt: string;
  student: { id: string; name: string; email: string; grade: number; whatsapp: string | null; jenisKelamin?: string | null };
}

// ==================== AUTH CONTEXT ====================
interface AuthContextType {
  user: UserData | null;
  setUser: (u: UserData | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ==================== API HELPER ====================
export async function apiFetch(path: string, options: RequestInit = {}, userId?: string, userRole?: string, userGrade?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (userId) headers["x-user-id"] = userId;
  if (userRole) headers["x-user-role"] = userRole;
  if (userGrade) headers["x-user-grade"] = String(userGrade);

  // Retry logic: server may be temporarily restarting
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(path, { ...options, headers });

      // Handle non-JSON responses (e.g., HTML error pages from proxy when server is down)
      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();
      if (contentType.includes("text/html") || text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
        if (attempt < MAX_RETRIES) {
          // Server might be restarting, wait and retry
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          continue;
        }
        throw new Error(`Server sedang memuat ulang. Silakan coba lagi dalam beberapa detik.`);
      }

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Gagal memproses respons dari server. Respons: ${text.substring(0, 200)}`);
      }

      if (!res.ok) throw new Error((data.error as string) || "Terjadi kesalahan");
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only retry on network errors or HTML responses (not on API errors like 400/401)
      if (err instanceof Error && err.message.includes("Server sedang memuat ulang")) {
        continue; // retry
      }
      if (err instanceof TypeError && err.message.includes("fetch")) {
        // Network error (server down), retry
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          continue;
        }
      }
      // For other errors (like 400/401 API errors), don't retry
      throw err;
    }
  }

  throw lastError || new Error("Gagal terhubung ke server setelah beberapa percobaan.");
}

// ==================== SCHOOL SETTINGS HOOK ====================
// Fetches public school settings (including logo) once and caches the result
// at module level so every component using this hook shares the same data
// without re-fetching.
interface SchoolSettings {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolLogo: string;
  schoolNpsn: string;
  schoolPrincipal: string;
  schoolPrincipalNip: string;
  bkCoordinator: string;
  bkCoordinatorNip: string;
  academicYear: string;
  whatsappContactNumber: string;
  // "Pelajari Lebih Lanjut" content (editable from admin settings)
  learnMoreEnabled: string;
  learnMoreStudentTitle: string;
  learnMoreStudentContent: string;
  learnMoreAdminTitle: string;
  learnMoreAdminContent: string;
}

const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: "",
  schoolAddress: "",
  schoolPhone: "",
  schoolEmail: "",
  schoolLogo: "",
  schoolNpsn: "",
  schoolPrincipal: "",
  schoolPrincipalNip: "",
  bkCoordinator: "",
  bkCoordinatorNip: "",
  academicYear: "",
  whatsappContactNumber: "",
  learnMoreEnabled: "true",
  learnMoreStudentTitle: "",
  learnMoreStudentContent: "",
  learnMoreAdminTitle: "",
  learnMoreAdminContent: "",
};

let _schoolSettingsCache: SchoolSettings | null = null;
let _schoolSettingsPromise: Promise<SchoolSettings> | null = null;

async function fetchSchoolSettings(): Promise<SchoolSettings> {
  if (_schoolSettingsCache) return _schoolSettingsCache;
  if (_schoolSettingsPromise) return _schoolSettingsPromise;
  _schoolSettingsPromise = (async () => {
    try {
      const data = await apiFetch("/api/settings", {});
      const s = (data.settings as Record<string, string>) || {};
      // Lazily import defaults to avoid circular deps and keep bundle split.
      const { getDefaultLearnMoreValue } = await import("./learn-more-defaults");
      const merged: SchoolSettings = {
        ...DEFAULT_SCHOOL_SETTINGS,
        schoolName: s.schoolName || "",
        schoolAddress: s.schoolAddress || "",
        schoolPhone: s.schoolPhone || "",
        schoolEmail: s.schoolEmail || "",
        schoolLogo: s.schoolLogo || "",
        schoolNpsn: s.schoolNpsn || "",
        schoolPrincipal: s.schoolPrincipal || "",
        schoolPrincipalNip: s.schoolPrincipalNip || "",
        bkCoordinator: s.bkCoordinator || "",
        bkCoordinatorNip: s.bkCoordinatorNip || "",
        academicYear: s.academicYear || "",
        whatsappContactNumber: s.whatsappContactNumber || "",
        // Use stored value if present, otherwise fall back to built-in defaults
        learnMoreEnabled: s.learnMoreEnabled !== undefined ? s.learnMoreEnabled : "true",
        learnMoreStudentTitle: s.learnMoreStudentTitle || getDefaultLearnMoreValue("learnMoreStudentTitle"),
        learnMoreStudentContent: s.learnMoreStudentContent || getDefaultLearnMoreValue("learnMoreStudentContent"),
        learnMoreAdminTitle: s.learnMoreAdminTitle || getDefaultLearnMoreValue("learnMoreAdminTitle"),
        learnMoreAdminContent: s.learnMoreAdminContent || getDefaultLearnMoreValue("learnMoreAdminContent"),
      };
      _schoolSettingsCache = merged;
      return merged;
    } catch {
      return DEFAULT_SCHOOL_SETTINGS;
    } finally {
      _schoolSettingsPromise = null;
    }
  })();
  return _schoolSettingsPromise;
}

/**
 * Hook that returns the public school settings (logo, name, etc.).
 * The result is cached at module level so subsequent mounts don't refetch.
 */
export function useSchoolSettings(): SchoolSettings {
  const [settings, setSettings] = useState<SchoolSettings>(
    _schoolSettingsCache || DEFAULT_SCHOOL_SETTINGS
  );
  useEffect(() => {
    let mounted = true;
    fetchSchoolSettings().then((s) => {
      if (mounted) setSettings(s);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return settings;
}

/**
 * Refresh the cached school settings (call after admin updates logo/settings).
 */
export function refreshSchoolSettings() {
  _schoolSettingsCache = null;
  _schoolSettingsPromise = null;
  return fetchSchoolSettings();
}

// ==================== SCHOOL LOGO COMPONENT ====================
/**
 * Renders the school logo image if configured, otherwise falls back to a
 * gradient circle with "BK" text. Used in sidebar header & mobile header.
 *
 * Props:
 *  - size: "sm" (mobile header, 24px) | "md" (sidebar, 36px) | "lg" (landing, 40px)
 */
export function SchoolLogo({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const settings = useSchoolSettings();
  const dims =
    size === "sm"
      ? "w-6 h-6 text-[10px] rounded-md"
      : size === "lg"
        ? "w-10 h-10 text-base rounded-xl"
        : "w-9 h-9 text-xs rounded-xl";

  if (settings.schoolLogo) {
    return (
      <img
        src={settings.schoolLogo}
        alt="Logo Sekolah"
        className={`${dims} object-contain bg-white/15 backdrop-blur-sm ring-1 ring-white/30 shadow-lg ${className}`}
      />
    );
  }
  return (
    <div
      className={`${dims} shrink-0 bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg ring-1 ring-white/30 ${className}`}
    >
      BK
    </div>
  );
}

// ==================== USER PHOTO COMPONENT ====================
/**
 * Detects gender from the jenisKelamin field (supports multiple formats).
 * Returns "L" (laki-laki), "P" (perempuan), or "" (unknown).
 */
export function detectGender(jenisKelamin?: string | null): "L" | "P" | "" {
  if (!jenisKelamin) return "";
  const v = jenisKelamin.trim().toUpperCase();
  if (v.startsWith("L") || v === "LAKI-LAKI" || v === "LAKI LAKI" || v === "COWOK" || v === "PRIA") return "L";
  if (v.startsWith("P") || v === "PEREMPUAN" || v === "CEWEK" || v === "WANITA") return "P";
  return "";
}

/**
 * Renders a user's photo with smart fallback:
 *  1. If user has uploaded a photo (user.image) → show it
 *  2. Else, if user has a gender → show gender-based cartoon avatar (boy/girl)
 *  3. Else, fall back to the school logo (if configured)
 *  4. Else, fall back to a gradient circle with the user's initials
 *
 * Props:
 *  - user: { image?: string; name: string; jenisKelamin?: string | null } (pass the user object)
 *  - size: "xs" (24px, table rows) | "sm" (32px) | "md" (40px) | "lg" (80px, profile)
 *  - className: extra classes
 *  - showInitialsOnFallback: if true (default), show initials when no photo AND no logo
 */
export function UserPhoto({
  user,
  size = "sm",
  className = "",
  showInitialsOnFallback = true,
}: {
  user: { image?: string | null; name: string; jenisKelamin?: string | null };
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showInitialsOnFallback?: boolean;
}) {
  const settings = useSchoolSettings();
  const dims =
    size === "xs"
      ? "w-6 h-6 text-[9px]"
      : size === "sm"
        ? "w-8 h-8 text-[10px]"
        : size === "lg"
          ? "w-20 h-20 text-xl"
          : "w-10 h-10 text-xs";

  const initials = (user.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // 1. User-uploaded photo takes priority
  if (user.image) {
    return (
      <img
        src={user.image}
        alt={`Foto ${user.name}`}
        className={`${dims} rounded-full object-cover ring-1 ring-gray-200 shrink-0 ${className}`}
      />
    );
  }

  // 2. Gender-based cartoon avatar (boy for laki-laki, girl for perempuan)
  const gender = detectGender(user.jenisKelamin);
  if (gender === "L") {
    return (
      <img
        src="/avatars/boy.png"
        alt={`Avatar Laki-laki - ${user.name}`}
        className={`${dims} rounded-full object-cover bg-teal-50 ring-1 ring-gray-200 shrink-0 ${className}`}
      />
    );
  }
  if (gender === "P") {
    return (
      <img
        src="/avatars/girl.png"
        alt={`Avatar Perempuan - ${user.name}`}
        className={`${dims} rounded-full object-cover bg-pink-50 ring-1 ring-gray-200 shrink-0 ${className}`}
      />
    );
  }

  // 3. Fall back to school logo (if configured) — for users without gender info (e.g. admins)
  if (settings.schoolLogo) {
    return (
      <img
        src={settings.schoolLogo}
        alt="Logo Sekolah"
        className={`${dims} rounded-full object-contain bg-gray-50 ring-1 ring-gray-200 shrink-0 ${className}`}
      />
    );
  }

  // 4. Fall back to initials avatar
  if (showInitialsOnFallback) {
    return (
      <div
        className={`${dims} rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold flex items-center justify-center shrink-0 ring-1 ring-gray-200 ${className}`}
        title={user.name}
      >
        {initials}
      </div>
    );
  }

  // No fallback requested
  return null;
}

// ==================== FIELD CONFIG ====================
export const FIELD_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string; description: string }> = {
  PRIBADI: {
    label: "Bidang Pribadi",
    icon: <Heart className="h-5 w-5" />,
    color: "text-rose-600",
    bgColor: "bg-rose-50 border-rose-200 hover:bg-rose-100",
    description: "Mengenali masalah pribadi dan emosi",
  },
  SOSIAL: {
    label: "Bidang Sosial",
    icon: <Users className="h-5 w-5" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
    description: "Memahami hubungan sosial dan teman",
  },
  BELAJAR: {
    label: "Bidang Belajar",
    icon: <BookOpen className="h-5 w-5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    description: "Mengatasi kesulitan belajar",
  },
  KARIR: {
    label: "Bidang Karir",
    icon: <Briefcase className="h-5 w-5" />,
    color: "text-violet-600",
    bgColor: "bg-violet-50 border-violet-200 hover:bg-violet-100",
    description: "Merencanakan masa depan dan karir",
  },
};

export const CHART_COLORS = ["#e11d48", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#f97316"];

// ==================== STATUS CONFIG (Counseling) ====================
export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  TERJADWAL: { label: "Terjadwal", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-300", icon: <Calendar className="h-3.5 w-3.5" /> },
  SELESAI: { label: "Selesai", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-300", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
};

// ==================== MODULE-LEVEL STATE (shared selection state) ====================
// Using a simple store pattern for cross-component state
let _selectedAnalysisUserId = "";
let _selectedReportUserId = "";

export function getSelectedAnalysisUserId() { return _selectedAnalysisUserId; }
export function setSelectedAnalysisUserId(id: string) { _selectedAnalysisUserId = id; }
export function getSelectedReportUserId() { return _selectedReportUserId; }
export function setSelectedReportUserId(id: string) { _selectedReportUserId = id; }

// ==================== KOP SURAT HELPER ====================
export function KopSurat({ schoolSettings }: { schoolSettings: Record<string, string> }) {
  const hasLogo = !!schoolSettings.schoolLogo;
  return (
    <div className="border-b-2 border-black pb-3 mb-4">
      <div className="flex items-center">
        {/* Logo on the left */}
        <div className="shrink-0">
          {hasLogo ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
              <img
                src={schoolSettings.schoolLogo}
                alt="Logo Sekolah"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
              BK
            </div>
          )}
        </div>
        {/* School info centered in the remaining space */}
        <div className="flex-1 text-center pr-16 sm:pr-20">
          <h2 className="text-sm sm:text-lg font-bold uppercase tracking-wide">{schoolSettings.schoolName || 'SMP Negeri 1 Contoh'}</h2>
          <p className="text-[10px] sm:text-xs">{schoolSettings.schoolAddress || 'Jl. Pendidikan No. 1'}</p>
          <div className="flex items-center justify-center gap-3 text-[10px] sm:text-xs mt-0.5">
            {schoolSettings.schoolPhone && <span>Telp: {schoolSettings.schoolPhone}</span>}
            {schoolSettings.schoolEmail && <span>Email: {schoolSettings.schoolEmail}</span>}
          </div>
          {schoolSettings.schoolNpsn && <p className="text-[10px] sm:text-xs">NPSN: {schoolSettings.schoolNpsn}</p>}
        </div>
      </div>
    </div>
  );
}

// ==================== PROFIL SISWA HELPER ====================
export function ProfilSiswa({ student, schoolSettings }: { student: { name: string; grade: number; jenisKelamin?: string | null; whatsapp?: string | null; email: string; image?: string | null }; schoolSettings?: Record<string, string> }) {
  // Format hari, tanggal, bulan, tahun dalam Bahasa Indonesia
  const now = new Date();
  const hariNama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
  const tanggal = now.getDate();
  const bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][now.getMonth()];
  const tahun = now.getFullYear();
  const tanggalLengkap = `${hariNama}, ${tanggal} ${bulanNama} ${tahun}`;

  // Resolve which photo to show: student photo > gender cartoon > school logo > nothing
  const gender = detectGender(student.jenisKelamin);
  const photoSrc = student.image
    || (gender === "L" ? "/avatars/boy.png" : gender === "P" ? "/avatars/girl.png" : "")
    || schoolSettings?.schoolLogo
    || "";

  return (
    <div className="mb-4">
      <h3 className="font-bold text-sm uppercase mb-2 border-b pb-1">PROFIL SISWA</h3>
      <div className="flex gap-4 items-start">
        {/* Photo (student photo, fallback to gender cartoon, then school logo) */}
        {photoSrc && (
          <div className="shrink-0">
            <img
              src={photoSrc}
              alt={`Foto ${student.name}`}
              className="w-20 h-24 object-cover rounded border border-gray-300"
            />
          </div>
        )}
        <table className="flex-1 text-sm">
          <tbody>
            <tr><td className="py-1 w-40 text-gray-600">Nama Siswa</td><td className="py-1">: {student.name}</td></tr>
            <tr><td className="py-1 text-gray-600">Kelas</td><td className="py-1">: {student.grade}</td></tr>
            <tr><td className="py-1 text-gray-600">Jenis Kelamin</td><td className="py-1">: {student.jenisKelamin || '-'}</td></tr>
            <tr><td className="py-1 text-gray-600">No. WhatsApp</td><td className="py-1">: {student.whatsapp || '-'}</td></tr>
            <tr><td className="py-1 text-gray-600">Email</td><td className="py-1">: {student.email}</td></tr>
            <tr><td className="py-1 text-gray-600">Hari / Tanggal</td><td className="py-1">: {tanggalLengkap}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== PRINT PDF HELPER ====================
export function handlePrintPDF(elementId: string) {
  const content = document.getElementById(elementId);
  if (!content) return;

  // Temporarily expand all scrollable containers so hidden content becomes visible for cloning
  const scrollContainers = content.querySelectorAll('[class*="overflow-y-auto"], [class*="overflow-auto"], [class*="max-h-"]');
  const savedStyles: Array<{ el: HTMLElement; maxHeight: string; overflow: string }> = [];
  scrollContainers.forEach((el) => {
    const htmlEl = el as HTMLElement;
    savedStyles.push({ el: htmlEl, maxHeight: htmlEl.style.maxHeight, overflow: htmlEl.style.overflow });
    htmlEl.style.maxHeight = 'none';
    htmlEl.style.overflow = 'visible';
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Restore styles even if print window fails
    savedStyles.forEach(({ el, maxHeight, overflow }) => {
      el.style.maxHeight = maxHeight;
      el.style.overflow = overflow;
    });
    return;
  }

  const styles = Array.from(document.styleSheets).map(sheet => {
    try { return Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); }
    catch(e) { return ''; }
  }).join('\n');
  const contentClone = content.cloneNode(true) as HTMLElement;

  // Restore original scrollable container styles on the live page
  savedStyles.forEach(({ el, maxHeight, overflow }) => {
    el.style.maxHeight = maxHeight;
    el.style.overflow = overflow;
  });

  // Also expand scrollable containers in the clone (in case inline styles were cloned)
  const cloneScrollContainers = contentClone.querySelectorAll('[class*="overflow-y-auto"], [class*="overflow-auto"], [class*="max-h-"]');
  cloneScrollContainers.forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.maxHeight = 'none';
    htmlEl.style.overflow = 'visible';
  });

  // Hide elements with print:hidden class
  const elementsToHide = contentClone.querySelectorAll('[class*="print:hidden"]');
  elementsToHide.forEach((el: Element) => { (el as HTMLElement).style.display = 'none'; });

  // Hide inactive tab content to prevent duplicate rendering in print
  const inactiveTabs = contentClone.querySelectorAll('[data-state="inactive"]');
  inactiveTabs.forEach((el: Element) => { (el as HTMLElement).style.display = 'none'; });

  // Also set hidden attribute on inactive tabs for extra safety
  const inactiveTabPanels = contentClone.querySelectorAll('[data-state="inactive"]');
  inactiveTabPanels.forEach((el: Element) => { el.setAttribute('hidden', ''); });

  // Hide tab navigation buttons in print (they're interactive UI, not content)
  const tabsLists = contentClone.querySelectorAll('[data-slot="tabs-list"]');
  tabsLists.forEach((el: Element) => { (el as HTMLElement).style.display = 'none'; });

  // Print-specific CSS overrides
  const printStyles = `
    @media print {
      body { margin: 0; padding: 20px; font-size: 12px; }
      [data-state="inactive"] { display: none !important; }
      [data-slot="tabs-list"] { display: none !important; }
      [data-slot="tabs-trigger"] { display: none !important; }
      .print\\:hidden { display: none !important; }
    }
    @page { margin: 1.5cm; }
    /* Expand all scrollable containers in print — show all content */
    [class*="overflow-y-auto"],
    [class*="overflow-auto"],
    [class*="max-h-"] {
      max-height: none !important;
      overflow: visible !important;
    }
  `;

  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${styles}${printStyles}</style></head><body>${contentClone.innerHTML}</body></html>`);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); }, 500);
}

// ==================== GRADE HELPER ====================
// TIDAK-based: higher TIDAK% = fewer problems = better grade
// 100% TIDAK = A (Baik), 90-99% = B, 75-89% = C, 50-74% = D, 0-49% = E
export function getGrade(tidakPercentage: number): { grade: string; color: string; bgColor: string; label: string; keterangan: string; saran: string } {
  if (tidakPercentage === 100) return { grade: "A", color: "text-emerald-700", bgColor: "bg-emerald-50", label: "Baik", keterangan: "Tidak ada masalah yang signifikan.", saran: "Siswa dalam kondisi baik. Tetap berikan dukungan dan pantau perkembangan secara berkala." };
  if (tidakPercentage >= 90) return { grade: "B", color: "text-teal-700", bgColor: "bg-teal-50", label: "Cukup Baik", keterangan: "Masalah ringan, monitor saja.", saran: "Siswa memiliki beberapa masalah ringan. Berikan perhatian khusus dan lakukan monitoring rutin." };
  if (tidakPercentage >= 75) return { grade: "C", color: "text-amber-700", bgColor: "bg-amber-50", label: "Cukup", keterangan: "Perlu perhatian dasar.", saran: "Siswa mengalami masalah sedang. Disarankan konseling berkala dan intervensi pada bidang yang bermasalah." };
  if (tidakPercentage >= 50) return { grade: "D", color: "text-orange-700", bgColor: "bg-orange-50", label: "Kurang", keterangan: "Urgensi sedang, intervensi kelompok.", saran: "Siswa mengalami masalah signifikan. Diperlukan konseling intensif dan melibatkan orang tua/wali." };
  return { grade: "E", color: "text-rose-700", bgColor: "bg-rose-50", label: "Kurang Sekali", keterangan: "Masalah berat, konseling individual segera.", saran: "Siswa memerlukan penanganan segera. Libatkan orang tua/wali dan pertimbangkan rujukan ke psikolog." };
}

// ==================== RECOMMENDATION HELPERS (delegate to recommendations.ts) ====================
import { getFieldRecommendation as _getFieldRec, getOverallRecommendation as _getOverallRec, type FieldName, type GradeLevel } from "./recommendations";

export type { FieldName, GradeLevel };

/**
 * Get per-field recommendation with keterangan and saran for a specific kelas
 * tidakPercentage = (tidakCount / total) * 100
 */
export function getRecommendation(field: string, kelas: number, tidakPercentage: number): { keterangan: string; saran: string; grade: string; label: string; range: string } {
  const rec = _getFieldRec(field as FieldName, kelas as GradeLevel, tidakPercentage);
  return { keterangan: rec.keterangan, saran: rec.saran, grade: rec.grade, label: rec.label, range: rec.range };
}

/**
 * Get overall recommendation with keterangan and saran for a specific kelas
 * tidakPercentage = overall TIDAK%
 */
export function getOverallRecommendation(tidakPercentage: number, kelas: number = 7): { keterangan: string; saran: string; grade: string; label: string; range: string } {
  const rec = _getOverallRec(tidakPercentage, kelas as GradeLevel);
  return { keterangan: rec.keterangan, saran: rec.saran, grade: rec.grade, label: rec.label, range: rec.range };
}

// ==================== LEARN MORE — MARKDOWN RENDERER ====================
/**
 * Renders a small subset of markdown into an array of React nodes suitable
 * for display inside the "Pelajari Lebih Lanjut" dialog on the landing page.
 *
 * Supported syntax:
 *   ## Heading 2
 *   ### Heading 3
 *   #### Heading 4
 *   - bullet item (consecutive lines become a <ul>)
 *   **bold text** (inline)
 *   plain paragraph (any other non-empty line)
 *   empty line separates blocks
 *
 * This is intentionally minimal so admins can edit content safely without
 * allowing arbitrary HTML.
 */
export function renderLearnMoreMarkdown(md: string): React.ReactNode {
  if (!md) return null;
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  // Inline formatter: converts **bold** into <strong> elements.
  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const re = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(<strong key={`b-${key++}`} className="font-semibold text-gray-900">{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines (they only separate blocks)
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("#### ")) {
      blocks.push(
        <h4 key={`h-${key++}`} className="text-sm font-semibold text-teal-700 mt-4 mb-1">
          {renderInline(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h-${key++}`} className="text-base font-semibold text-teal-800 mt-5 mb-1.5">
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h-${key++}`} className="text-lg font-bold text-gray-900 mt-6 mb-2 pb-1 border-b border-teal-100">
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // Bullet list (consecutive "- " lines)
    if (line.startsWith("- ")) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(
          <li key={`li-${key++}`} className="ml-1">
            {renderInline(lines[i].slice(2))}
          </li>
        );
        i++;
      }
      blocks.push(
        <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1 text-sm text-gray-700 mb-2 marker:text-teal-500">
          {items}
        </ul>
      );
      continue;
    }

    // Numbered list (consecutive "1. " "2. " lines)
    if (/^\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const m = lines[i].match(/^\d+\.\s(.*)$/);
        items.push(
          <li key={`ol-${key++}`} className="ml-1">
            {renderInline(m ? m[1] : lines[i])}
          </li>
        );
        i++;
      }
      blocks.push(
        <ol key={`ol-${key++}`} className="list-decimal pl-5 space-y-1 text-sm text-gray-700 mb-2 marker:text-teal-500 marker:font-semibold">
          {items}
        </ol>
      );
      continue;
    }

    // Paragraph (single line)
    blocks.push(
      <p key={`p-${key++}`} className="text-sm text-gray-700 leading-relaxed mb-2">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0">{blocks}</div>;
}
