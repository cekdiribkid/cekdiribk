"use client";

import React, { useState, useCallback, useSyncExternalStore, Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AuthContext,
  type View,
  type UserData,
  SchoolLogo,
} from "@/lib/app-shared";
import { useIdleAutoLogout } from "@/hooks/use-idle-auto-logout";

// ====== Loading Component for dynamic imports ======
function DynamicLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Memuat halaman...</p>
      </div>
    </div>
  );
}

// ====== Error Boundary ======
class DynamicErrorBoundary extends Component<
  { children: ReactNode; name: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; name: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[DynamicErrorBoundary:${this.props.name}]`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Gagal Memuat Komponen</h3>
            <p className="text-gray-500 text-sm mb-4">
              Terjadi kesalahan saat memuat halaman &ldquo;{this.props.name}&rdquo;. 
              Silakan refresh halaman atau coba lagi nanti.
            </p>
            <details className="text-left bg-gray-50 p-3 rounded-lg mb-4">
              <summary className="text-xs text-gray-500 cursor-pointer">Detail Error</summary>
              <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap overflow-auto max-h-32">
                {this.state.error?.message || "Unknown error"}
              </pre>
            </details>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Refresh Halaman
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy-load all components to reduce initial bundle size
const LandingPage = dynamic(() => import("@/components/LandingPage"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const UserDashboard = dynamic(() => import("@/components/UserDashboard"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const DCMListPage = dynamic(() => import("@/components/DCMListPage"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const SurveyPage = dynamic(() => import("@/components/SurveyPage"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const ResultsPage = dynamic(() => import("@/components/ResultsPage"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const ProfilePage = dynamic(() => import("@/components/ProfilePage"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const AdminDashboard = dynamic(() => import("@/components/AdminDashboard"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const AdminUsers = dynamic(() => import("@/components/AdminUsers"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const AdminSurveys = dynamic(() => import("@/components/AdminSurveys"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const AdminImportExport = dynamic(() => import("@/components/AdminImportExport"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const AdminCounseling = dynamic(() => import("@/components/AdminCounseling"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const AdminSettings = dynamic(() => import("@/components/AdminSettings"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const AdminAnalysis = dynamic(() => import("@/components/AdminAnalysis"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const AdminAnalysisDetail = dynamic(() => import("@/components/AdminAnalysisDetail"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const AdminMonitoring = dynamic(() => import("@/components/AdminMonitoring"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const AdminVisitor = dynamic(() => import("@/components/AdminVisitor"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const AdminReporting = dynamic(() => import("@/components/AdminReporting"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const StudentReporting = dynamic(() => import("@/components/StudentReporting"), {
  ssr: false,
  loading: DynamicLoading
});
const StudentCounselingHistory = dynamic(() => import("@/components/StudentCounselingHistory"), {
  ssr: false,
  loading: DynamicLoading
});
const CertificateList = dynamic(() => import("@/components/CertificateList"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const Certificate = dynamic(() => import("@/components/Certificate"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const StudentCertificate = dynamic(() => import("@/components/StudentCertificate"), { 
  ssr: false, 
  loading: DynamicLoading 
});
const SidebarNav = dynamic(() => import("@/components/SidebarNav"), {
  ssr: false,
  loading: () => <div className="hidden md:block w-60" />
});
const PWAInstallPrompt = dynamic(() => import("@/components/PWAInstallPrompt"), {
  ssr: false,
  loading: () => null
});
// Floating WhatsApp "Bantuan BK" button — rendered on every page (before
// and after login) so users can always reach the counselor. The number is
// read from the admin-configured `bkWhatsApp` setting at runtime.
const WhatsAppFloatingButton = dynamic(() => import("@/components/whatsapp-button"), {
  ssr: false,
  loading: () => null
});

// ====== localStorage external store for useSyncExternalStore ======
const STORAGE_KEY = "cekdiribk_user";
const storageListeners = new Set<() => void>();

function subscribeToStorage(callback: () => void) {
  storageListeners.add(callback);
  return () => { storageListeners.delete(callback); };
}

function getStorageSnapshot(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function getServerSnapshot(): null {
  return null;
}

function notifyStorageListeners() {
  storageListeners.forEach((l) => l());
}

function writeToStorage(u: UserData | null) {
  try {
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    notifyStorageListeners();
  } catch { /* ignore storage errors */ }
}

// ==================== MAIN APP ====================
export default function CekDiriBKApp() {
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Track explicit navigation (null = derive from user existence)
  const [navigatedView, setNavigatedView] = useState<View | null>(null);

  // useSyncExternalStore: server returns null, client returns actual localStorage value
  // React handles hydration mismatch gracefully with a synchronous client re-render
  const storedUserJson = useSyncExternalStore(
    subscribeToStorage,
    getStorageSnapshot,
    getServerSnapshot
  );

  // Derive user from localStorage — no useState needed for user
  const user = React.useMemo<UserData | null>(() => {
    if (!storedUserJson) return null;
    try { return JSON.parse(storedUserJson); } catch { return null; }
  }, [storedUserJson]);

  // Handle browser close/tab close — record visitor logout via sendBeacon
  React.useEffect(() => {
    if (!user?.visitorLogId) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability during page unload
      const blob = new Blob([JSON.stringify({ visitorLogId: user.visitorLogId })], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/auth/logout", blob);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user?.visitorLogId]);

  // ====== Idle auto-logout — only for student (USER role) ======
  // 30 minutes of inactivity → automatic logout with warning at 25 min mark.
  useIdleAutoLogout({
    enabled: !!user && user.role === "USER",
    idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
    warningBeforeMs: 5 * 60 * 1000, // warn 5 minutes before
    onTimeout: () => {
      // Record visitor logout then clear local user state
      if (user?.visitorLogId) {
        try {
          fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorLogId: user.visitorLogId }),
          }).catch(() => {});
        } catch {
          /* ignore */
        }
      }
      writeToStorage(null);
      setNavigatedView(null);
    },
  });

  // Compute current view: explicit navigation takes priority, otherwise derive from user
  const currentView: View = navigatedView ?? (user ? "dashboard" : "landing");

  const handleSetUser = useCallback((u: UserData | null) => {
    writeToStorage(u);
    if (u) setNavigatedView("dashboard");
  }, []);

  const handleLogout = useCallback(() => {
    // Record logout time in visitor log before clearing user data
    if (user?.visitorLogId) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorLogId: user.visitorLogId }),
      }).catch(() => {}); // Fire and forget
    }
    writeToStorage(null);
    setNavigatedView(null);
  }, [user]);

  const handleNavigate = useCallback((view: View) => {
    setNavigatedView(view);
    window.scrollTo(0, 0);
  }, []);

  const handleSelectSurvey = useCallback((id: string) => {
    setSelectedSurveyId(id);
  }, []);

  const handleSelectStudent = useCallback((id: string) => {
    setSelectedStudentId(id);
  }, []);

  // If not logged in, show landing page
  if (!user) {
    return (
      <AuthContext.Provider value={{ user, setUser: handleSetUser, logout: handleLogout }}>
        <DynamicErrorBoundary name="Landing">
          <LandingPage />
        </DynamicErrorBoundary>
        <PWAInstallPrompt />
        <WhatsAppFloatingButton />
      </AuthContext.Provider>
    );
  }

  // Logged in layout with sidebar
  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser, logout: handleLogout }}>
      <div className="md:ml-60 min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100/80 px-3 py-2 flex items-center gap-2 md:hidden shadow-sm shadow-gray-100/30">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="hover:bg-teal-50 h-8 w-8">
            <Menu className="h-4 w-4 text-gray-600" />
          </Button>
          <div className="flex items-center gap-2">
            <SchoolLogo size="sm" />
            <span className="font-bold text-xs bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">CekDiriBK.id</span>
          </div>
        </header>

        <DynamicErrorBoundary name="Sidebar">
          <SidebarNav
            currentView={currentView}
            onNavigate={handleNavigate}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </DynamicErrorBoundary>

        <main className="p-4 md:p-6 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DynamicErrorBoundary name={currentView}>
                {currentView === "dashboard" && <UserDashboard onNavigate={handleNavigate} onSelectSurvey={handleSelectSurvey} />}
                {currentView === "dcm" && <DCMListPage onNavigate={handleNavigate} onSelectSurvey={handleSelectSurvey} />}
                {currentView === "survey" && selectedSurveyId && <SurveyPage surveyId={selectedSurveyId} onNavigate={handleNavigate} />}
                {currentView === "results" && <ResultsPage onNavigate={handleNavigate} surveyIdFilter={selectedSurveyId} />}
                {currentView === "profile" && <ProfilePage onNavigate={handleNavigate} />}
                {currentView === "admin-dashboard" && <AdminDashboard onNavigate={handleNavigate} />}
                {currentView === "admin-users" && <AdminUsers onNavigate={handleNavigate} />}
                {currentView === "admin-surveys" && <AdminSurveys onNavigate={handleNavigate} />}
                {currentView === "admin-import" && <AdminImportExport onNavigate={handleNavigate} />}
                {currentView === "admin-counseling" && <AdminCounseling onNavigate={handleNavigate} />}
                {currentView === "admin-analysis" && <AdminAnalysis onNavigate={handleNavigate} />}
                {currentView === "admin-analysis-detail" && <AdminAnalysisDetail onNavigate={handleNavigate} />}
                {currentView === "admin-report" && <AdminReporting onNavigate={handleNavigate} />}
                {currentView === "admin-monitoring" && <AdminMonitoring onNavigate={handleNavigate} />}
                {currentView === "admin-visitor" && <AdminVisitor onNavigate={handleNavigate} />}
                {currentView === "admin-settings" && <AdminSettings onNavigate={handleNavigate} />}
                {currentView === "admin-certificate" && <CertificateList onNavigate={handleNavigate} onSelectStudent={handleSelectStudent} />}
                {currentView === "student-report" && <StudentReporting onNavigate={handleNavigate} />}
                {currentView === "student-counseling" && <StudentCounselingHistory onNavigate={handleNavigate} />}
                {currentView === "student-certificate" && <StudentCertificate onNavigate={handleNavigate} />}
                {currentView === "certificate-view" && selectedStudentId && <Certificate onNavigate={handleNavigate} studentId={selectedStudentId} />}
              </DynamicErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-100/80 bg-white/60 backdrop-blur-sm py-4 mt-auto">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-xs text-gray-500">
              Hak Cipta dan Dibuat oleh Team 6. Didukung oleh CekDiriBK.id
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Kenali dirimu, Pahami masalahmu, dan temukan solusi terbaik bersama BK.
            </p>
          </div>
        </footer>
        <PWAInstallPrompt />
        <WhatsAppFloatingButton />
      </div>
    </AuthContext.Provider>
  );
}
