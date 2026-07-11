"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  X,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  Share,
  Plus,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/app-shared";

/**
 * PWAInstallPrompt
 * ----------------
 * Reliable install + version-freshness banner for CekDiriBK.id.
 *
 * Why this exists:
 *   The browser's native PWA install mini-infobar (Chrome) is inconsistent —
 *   it sometimes appears, sometimes doesn't, and disappears quickly. So we
 *   capture the `beforeinstallprompt` event ourselves and show OUR OWN
 *   always-visible banner so users actually get a chance to install.
 *
 * Two modes:
 *   1. "install"  — shown when the app is NOT installed yet.
 *      • Chrome/Edge (Android + desktop): a real "Install Sekarang" button
 *        that calls the captured `beforeinstallprompt.prompt()`.
 *      • iOS Safari / Firefox (no `beforeinstallprompt`): an "Cara Install"
 *        button that opens a dialog with step-by-step instructions.
 *   2. "version"  — shown when the app IS already installed (standalone
 *      mode). Reminds the user to verify they have the latest version, and
 *      recommends uninstalling the old app + reinstalling to force a clean
 *      update. Becomes more urgent when a new Service Worker is waiting.
 *
 * Persistence:
 *   • Install banner: dismissed per-session (sessionStorage). A "Jangan
 *     tampilkan lagi" link permanently dismisses (localStorage).
 *   • Version banner: acknowledged per APP_VERSION (localStorage). Bump
 *     APP_VERSION below whenever you ship a meaningful update so already-
 *     installed users get re-reminded.
 *
 * Positioning:
 *   Left-bottom (`fixed bottom-6 left-6`) so it never overlaps the
 *   WhatsApp floating button which lives at right-bottom.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PromptMode = "install" | "version" | null;

// ── App version ──────────────────────────────────────────────────────
// Bump this whenever you ship an update that installed users MUST get.
// Each bump re-shows the "verify latest version" reminder for installed
// users until they ack it. Format: major.minor.patch.
const APP_VERSION = "1.1.0";

// localStorage / sessionStorage keys
const LS_INSTALL_PERMANENT_DISMISS = "pwa-install-permanent-dismissed";
const SS_INSTALL_SESSION_DISMISS = "pwa-install-session-dismissed";
const LS_VERSION_ACK = "pwa-version-ack";

// ── Helpers ──────────────────────────────────────────────────────────
function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneMQ = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
    true;
  return standaloneMQ || iosStandalone;
}

/**
 * Does this browser fire `beforeinstallprompt`? (i.e. can we trigger a
 * native install dialog programmatically?) Chrome & Edge do, on desktop +
 * Android. iOS Safari and Firefox do NOT — for those we show instructions.
 */
function isInstallableBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  // iOS Safari — never fires beforeinstallprompt.
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(ua) && "ontouchend" in document);
  if (isIOS) return false;
  // Firefox — no beforeinstallprompt.
  if (/Firefox/i.test(ua)) return false;
  // Chrome / Edge / other Chromium.
  return /Chrome|Chromium|Edg/i.test(ua);
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(ua) && "ontouchend" in document);
}

/**
 * Detect Android (any browser). Used to show Android-specific install
 * instructions, because on Android Chrome `beforeinstallprompt` sometimes
 * doesn't fire on first visit (SW not yet active) or after the user
 * previously dismissed a prompt (Chrome cooldown). In those cases the user
 * can still install via the Chrome menu (⋮ → Install app).
 */
function isAndroid(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  return /Android/i.test(ua);
}

/**
 * Detect Android Chrome specifically. Chrome Android DOES fire
 * `beforeinstallprompt`, but sometimes not on the first page load (SW not
 * active yet) or during Chrome's dismissal cooldown. When that happens we
 * guide the user to install via the Chrome menu instead.
 */
function isAndroidChrome(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  if (!/Android/i.test(ua)) return false;
  // Chrome on Android — but NOT Edge, Samsung, Opera, etc. which also
  // report as Chrome. We use the "Chrome/" + NOT "Edg/" / "SamsungBrowser"
  // / "OPR" heuristic.
  if (/Edg\//i.test(ua)) return false;
  if (/SamsungBrowser/i.test(ua)) return false;
  if (/OPR\//i.test(ua)) return false;
  return /Chrome\//i.test(ua);
}

export default function PWAInstallPrompt() {
  const [mode, setMode] = useState<PromptMode>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  // Ref to hold handleInstall so event listeners can call the latest version
  const handleInstallRef = useRef<() => void>(() => {});
  // True when a new Service Worker is waiting to activate — makes the
  // version banner more urgent ("update tersedia" vs. generic check).
  const [swUpdateWaiting, setSwUpdateWaiting] = useState(false);

  const [schoolLogo, setSchoolLogo] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");

  // Keep a ref to the latest deferredPrompt so async handlers always see
  // the current value without stale-closure issues.
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // ── Fetch school settings (logo + name) ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/api/settings");
        if (cancelled) return;
        const settings = (data?.settings || {}) as Record<string, string>;
        setSchoolLogo(settings.schoolLogo || "");
        setSchoolName(settings.schoolName || "");
      } catch {
        // Non-fatal — fall back to defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Decide which mode to show + wire up events ────────────────────
  useEffect(() => {
    const standalone = isStandaloneMode();

    const decideMode = () => {
      if (standalone) {
        // Installed — check version-freshness ack.
        const ackedVersion =
          (typeof window !== "undefined" &&
            window.localStorage.getItem(LS_VERSION_ACK)) ||
          null;
        if (ackedVersion !== APP_VERSION) {
          setMode("version");
        } else {
          setMode(null);
        }
      } else {
        // Not installed — show install banner unless permanently or
        // per-session dismissed.
        const permanentDismissed =
          window.localStorage.getItem(LS_INSTALL_PERMANENT_DISMISS) === "true";
        const sessionDismissed =
          window.sessionStorage.getItem(SS_INSTALL_SESSION_DISMISS) === "true";
        if (permanentDismissed || sessionDismissed) {
          setMode(null);
          return;
        }
        // Show the banner on any browser — even those without
        // beforeinstallprompt (they get the instructions dialog). This
        // is the whole point: a RELIABLE, always-visible prompt.
        setMode("install");
      }
    };

    // Small delay so it doesn't pop instantly on page load. BUT if this
    // is a "retry load" (user clicked "Muat Ulang & Coba Install" from
    // the instructions dialog), show immediately so they can tap
    // "Install Sekarang" right away — the SW should now be active so
    // beforeinstallprompt fires quickly.
    const isRetryLoad =
      window.sessionStorage.getItem("pwa-retry-load") === "true";
    if (isRetryLoad) {
      window.sessionStorage.removeItem("pwa-retry-load");
    }
    const decideTimer = setTimeout(decideMode, isRetryLoad ? 600 : 2500);

    // Capture beforeinstallprompt so we control WHEN to show the native
    // install dialog (via deferredPrompt.prompt()).
    const bipHandler = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = evt;
      setDeferredPrompt(evt);
      // Expose on window so LandingPage download buttons can use it directly
      (window as any).__pwaDeferredPrompt = evt;
      // If user is not installed and hasn't dismissed, make sure the
      // install banner is visible so they actually have a chance to act.
      if (!isStandaloneMode()) {
        const permanentDismissed =
          window.localStorage.getItem(LS_INSTALL_PERMANENT_DISMISS) === "true";
        const sessionDismissed =
          window.sessionStorage.getItem(SS_INSTALL_SESSION_DISMISS) === "true";
        if (!permanentDismissed && !sessionDismissed) {
          setMode("install");
        }
      }
    };
    window.addEventListener("beforeinstallprompt", bipHandler);

    // When the app gets installed, switch to version-check mode.
    const installedHandler = () => {
      setDeferredPrompt(null);
      deferredPromptRef.current = null;
      (window as any).__pwaDeferredPrompt = null;
      // Ack the current version so we don't immediately nag a user who
      // just installed. They'll be re-reminded when APP_VERSION bumps.
      window.localStorage.setItem(LS_VERSION_ACK, APP_VERSION);
      setMode(null);
      // Re-evaluate after a beat — now standalone → version-check path.
      setTimeout(() => {
        const acked = window.localStorage.getItem(LS_VERSION_ACK);
        if (acked !== APP_VERSION) {
          setMode("version");
        }
      }, 1200);
    };
    window.addEventListener("appinstalled", installedHandler);

    // ── Service Worker update detection ───────────────────────────
    // If a new SW is waiting to activate, the installed app is stale →
    // surface that in the version banner. We also re-check on focus.
    const checkSwUpdate = async () => {
      try {
        if (!("serviceWorker" in navigator)) return;
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.waiting) {
          setSwUpdateWaiting(true);
          // If installed and not yet acked for this version, ensure the
          // version banner shows.
          if (isStandaloneMode()) {
            const acked = window.localStorage.getItem(LS_VERSION_ACK);
            if (acked !== APP_VERSION) setMode("version");
          }
        }
      } catch {
        // ignore
      }
    };
    checkSwUpdate();
    window.addEventListener("focus", checkSwUpdate);

    // ── Listen for install triggers from LandingPage download buttons ──
    const handleTriggerInstall = () => {
      handleInstallRef.current();
    };
    const handleTriggerIos = () => {
      setShowInstructions(true);
    };
    window.addEventListener("trigger-pwa-install", handleTriggerInstall);
    window.addEventListener("trigger-pwa-ios-instructions", handleTriggerIos);

    return () => {
      clearTimeout(decideTimer);
      window.removeEventListener("beforeinstallprompt", bipHandler);
      window.removeEventListener("appinstalled", installedHandler);
      window.removeEventListener("focus", checkSwUpdate);
      window.removeEventListener("trigger-pwa-install", handleTriggerInstall);
      window.removeEventListener("trigger-pwa-ios-instructions", handleTriggerIos);
    };
  }, []);

  // ── Install action ────────────────────────────────────────────────
  const handleInstall = useCallback(async () => {
    const evt = deferredPrompt || deferredPromptRef.current;
    if (!evt) {
      // No native prompt available (iOS Safari / Firefox). Show the
      // instructions dialog so the user knows how to install manually.
      setShowInstructions(true);
      return;
    }
    setInstalling(true);
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === "accepted") {
        // The appinstalled event will handle the rest.
        setMode(null);
      } else if (outcome === "dismissed") {
        // User dismissed the native prompt — keep our banner hidden for
        // this session so we don't annoy them.
        window.sessionStorage.setItem(SS_INSTALL_SESSION_DISMISS, "true");
        setMode(null);
      }
    } catch (err) {
      console.error("[PWA] Install prompt error:", err);
      // Fall back to instructions dialog.
      setShowInstructions(true);
    } finally {
      setDeferredPrompt(null);
      deferredPromptRef.current = null;
      (window as any).__pwaDeferredPrompt = null;
      setInstalling(false);
    }
  }, [deferredPrompt]);

  // Keep ref in sync so event listeners can call it
  handleInstallRef.current = handleInstall;

  // ── Dismiss handlers ──────────────────────────────────────────────
  const handleDismissInstall = useCallback(
    (permanent: boolean) => {
      if (permanent) {
        window.localStorage.setItem(LS_INSTALL_PERMANENT_DISMISS, "true");
      } else {
        window.sessionStorage.setItem(SS_INSTALL_SESSION_DISMISS, "true");
      }
      setMode(null);
    },
    []
  );

  const handleAckVersion = useCallback(() => {
    window.localStorage.setItem(LS_VERSION_ACK, APP_VERSION);
    setMode(null);
  }, []);

  // Reload the page so the Service Worker is already active on the next
  // load — this usually makes `beforeinstallprompt` fire on Android Chrome
  // (on the first visit the SW may not be active yet when Chrome checks
  // PWA eligibility, so the event never fires). We also clear the session
  // dismiss flag so the install banner shows again after reload.
  const handleReloadAndRetry = useCallback(() => {
    try {
      window.sessionStorage.removeItem(SS_INSTALL_SESSION_DISMISS);
      // Remember that we just did a retry-load so the banner shows
      // immediately (no 2.5s delay) on the next page.
      window.sessionStorage.setItem("pwa-retry-load", "true");
    } catch {
      // ignore
    }
    window.location.reload();
  }, []);

  // ── Render ────────────────────────────────────────────────────────
  const hasLogo = !!(schoolLogo && schoolLogo.startsWith("data:image/"));
  const appName = schoolName || "CekDiriBK.id";

  return (
    <>
      <AnimatePresence>
        {mode && (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            // Left-bottom so it never clashes with the WhatsApp FAB
            // (right-bottom). Constrain width on mobile so it doesn't
            // span the whole screen.
            className="fixed bottom-6 left-4 right-4 sm:right-auto sm:w-80 z-40 print:hidden"
          >
            {mode === "install" ? (
              <InstallCard
                appName={appName}
                hasLogo={hasLogo}
                schoolLogo={schoolLogo}
                installing={installing}
                canInstallNatively={!!deferredPrompt}
                onInstall={handleInstall}
                onDismissSession={() => handleDismissInstall(false)}
                onDismissPermanent={() => handleDismissInstall(true)}
                onShowInstructions={() => setShowInstructions(true)}
              />
            ) : (
              <VersionCard
                appName={appName}
                hasLogo={hasLogo}
                schoolLogo={schoolLogo}
                swUpdateWaiting={swUpdateWaiting}
                onAck={handleAckVersion}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual install instructions — platform-aware.
          Three branches: iOS Safari, Android Chrome, Other. On Android
          Chrome, beforeinstallprompt often doesn't fire on the first visit
          (SW not active yet) or during Chrome's dismissal cooldown, so we
          guide the user to install via the Chrome menu and offer a
          reload-and-retry that makes the native prompt fire on the next
          load. */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-teal-600" />
              Cara Install {appName}
            </DialogTitle>
            <DialogDescription>
              Ikuti langkah berikut untuk menambahkan {appName} ke layar utama
              HP kamu.
            </DialogDescription>
          </DialogHeader>

          {isIOS() ? (
            /* ── iOS Safari ── */
            <ol className="space-y-3 text-sm text-gray-700 mt-2">
              <Step
                num={1}
                icon={<Share className="h-4 w-4" />}
                title="Buka Menu Share"
                desc="Tap tombol Share (ikon kotak dengan panah ke atas) di bilah bawah Safari."
              />
              <Step
                num={2}
                icon={<Plus className="h-4 w-4" />}
                title="Pilih Add to Home Screen"
                desc="Scroll ke bawah, lalu pilih “Add to Home Screen”."
              />
              <Step
                num={3}
                icon={<Smartphone className="h-4 w-4" />}
                title="Konfirmasi"
                desc="Tap “Add”. Ikon CekDiriBK.id akan muncul di home screen HP kamu."
              />
            </ol>
          ) : isAndroidChrome() || isAndroid() ? (
            /* ── Android Chrome / Android lainnya ──
               Key fix: on Android Chrome, beforeinstallprompt often
               doesn't fire on the first visit (SW not active) or during
               Chrome's dismissal cooldown. Instead of saying "browser
               doesn't support install" (which is FALSE for Chrome Android),
               we guide the user to install via the Chrome menu and offer a
               reload-and-retry that makes the native prompt fire on the
               next load. */
            <div className="space-y-4 text-sm text-gray-700 mt-2">
              <div className="rounded-lg bg-teal-50 border border-teal-100 p-3">
                <p className="font-medium text-teal-900 mb-1">
                  Opsi 1 — Install via Menu Chrome (paling mudah)
                </p>
                <ol className="space-y-2 mt-2">
                  <Step
                    num={1}
                    icon={<Smartphone className="h-4 w-4" />}
                    title="Buka menu Chrome"
                    desc="Tap ikon titik tiga (⋮) di pojok kanan atas browser Chrome."
                  />
                  <Step
                    num={2}
                    icon={<Download className="h-4 w-4" />}
                    title="Pilih “Install aplikasi” / “Add to Home screen”"
                    desc="Cari opsi “Install aplikasi” atau “Add to Home screen” di menu, lalu tap."
                  />
                  <Step
                    num={3}
                    icon={<Plus className="h-4 w-4" />}
                    title="Konfirmasi"
                    desc={`Tap “Install” / “Add”. Ikon ${appName} akan muncul di home screen HP kamu.`}
                  />
                </ol>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                <p className="font-medium text-amber-900 mb-1">
                  Opsi 2 — Muat Ulang & Coba Install Otomatis
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Jika opsi “Install aplikasi” tidak muncul di menu, coba
                  muat ulang halaman ini. Pada pemuatan ke-2, Service Worker
                  sudah aktif sehingga tombol{" "}
                  <strong>Install Sekarang</strong> biasanya muncul dan bisa
                  langsung diklik.
                </p>
                <Button
                  onClick={handleReloadAndRetry}
                  size="sm"
                  className="mt-2 bg-amber-600 hover:bg-amber-700 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Muat Ulang & Coba Install
                </Button>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                <strong>Catatan:</strong> Jika kamu pernah menutup prompt
                install sebelumnya, Chrome sementara menyembunyikan prompt
                otomatis (cooldown). Tunggu beberapa jam lalu coba lagi, atau
                gunakan Opsi 1 (menu Chrome) yang selalu tersedia.
              </p>
            </div>
          ) : (
            /* ── Other (desktop Firefox, etc.) ── */
            <div className="space-y-3 text-sm text-gray-700 mt-2">
              <p>
                Browser kamu tidak mendukung install otomatis. Untuk
                pengalaman terbaik, gunakan{" "}
                <strong>Google Chrome</strong> di Android atau desktop, lalu
                buka kembali situs ini dan tap tombol{" "}
                <strong>Install Sekarang</strong>.
              </p>
              <p className="text-xs text-gray-500">
                Alternatif: pada Chrome Android, buka menu ⋮ →{" "}
                <em>Install aplikasi</em>. Pada Chrome desktop, klik ikon
                install di ujung kanan address bar.
              </p>
            </div>
          )}

          <DialogFooter className="mt-2 gap-2">
            {(isAndroidChrome() || isAndroid()) && (
              <Button
                onClick={handleReloadAndRetry}
                variant="outline"
                className="border-teal-300 text-teal-700 hover:bg-teal-50"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Muat Ulang & Coba Lagi
              </Button>
            )}
            <Button
              onClick={() => setShowInstructions(false)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Mengerti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function LogoBadge({
  hasLogo,
  schoolLogo,
  size = "md",
}: {
  hasLogo: boolean;
  schoolLogo: string;
  size?: "md" | "sm";
}) {
  const dim = size === "sm" ? "w-9 h-9" : "w-12 h-12";
  if (hasLogo) {
    return (
      <div
        className={`${dim} rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0 p-1.5 shadow-sm ring-1 ring-white/40`}
      >
        <img
          src={schoolLogo}
          alt="Logo sekolah"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }
  return (
    <div
      className={`${dim} bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center shrink-0`}
    >
      <Smartphone className="h-5 w-5 text-white" />
    </div>
  );
}

function InstallCard({
  appName,
  hasLogo,
  schoolLogo,
  installing,
  canInstallNatively,
  onInstall,
  onDismissSession,
  onDismissPermanent,
  onShowInstructions,
}: {
  appName: string;
  hasLogo: boolean;
  schoolLogo: string;
  installing: boolean;
  canInstallNatively: boolean;
  onInstall: () => void;
  onDismissSession: () => void;
  onDismissPermanent: () => void;
  onShowInstructions: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-teal-100 p-4 relative">
      {/* Close (session dismiss) */}
      <button
        onClick={onDismissSession}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors p-1"
        aria-label="Tutup (tampilkan lagi nanti)"
        title="Tutup (tampilkan lagi nanti)"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <LogoBadge hasLogo={hasLogo} schoolLogo={schoolLogo} />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900">
            Install {appName}
          </h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Akses lebih cepat langsung dari home screen HP kamu. Pasang
            sekarang, gratis!
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={onInstall}
              disabled={installing}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-xs"
            >
              {installing ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
              )}
              {installing
                ? "Memproses..."
                : canInstallNatively
                ? "Install Sekarang"
                : "Cara Install"}
            </Button>
            <Button
              onClick={onDismissSession}
              disabled={installing}
              size="sm"
              variant="ghost"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Nanti saja
            </Button>
          </div>

          {!canInstallNatively && (
            <button
              onClick={onShowInstructions}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-800 hover:underline"
            >
              <Info className="h-3 w-3" />
              Lihat panduan install manual
            </button>
          )}

          <button
            onClick={onDismissPermanent}
            className="mt-2 block text-[11px] text-gray-400 hover:text-gray-600 hover:underline"
          >
            Jangan tampilkan lagi
          </button>
        </div>
      </div>
    </div>
  );
}

function VersionCard({
  appName,
  hasLogo,
  schoolLogo,
  swUpdateWaiting,
  onAck,
}: {
  appName: string;
  hasLogo: boolean;
  schoolLogo: string;
  swUpdateWaiting: boolean;
  onAck: () => void;
}) {
  return (
    <div
      className={`rounded-2xl shadow-xl border p-4 relative ${
        swUpdateWaiting
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-teal-100"
      }`}
    >
      <button
        onClick={onAck}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors p-1"
        aria-label="Tutup"
        title="Tutup"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            swUpdateWaiting
              ? "bg-gradient-to-br from-amber-500 to-orange-600"
              : "bg-gradient-to-br from-teal-500 to-emerald-600"
          }`}
        >
          {swUpdateWaiting ? (
            <AlertTriangle className="h-6 w-6 text-white" />
          ) : (
            <RefreshCw className="h-6 w-6 text-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
            {swUpdateWaiting
              ? "Update Terbaru Tersedia!"
              : "Pastikan Versi Terbaru"}
          </h4>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            {swUpdateWaiting ? (
              <>
                Versi {appName} yang terpasang di HP kamu sudah kedaluwarsa.
                Untuk mendapatkan fitur terbaru, hapus (uninstall) aplikasi
                lama lalu install ulang.
              </>
            ) : (
              <>
                Pastikan aplikasi {appName} di HP kamu adalah versi terbaru.
                Jika ragu, hapus (uninstall) aplikasi lama lalu install ulang
                dari website ini.
              </>
            )}
          </p>

          <ol className="mt-2 space-y-1 text-[11px] text-gray-600">
            <li>
              <strong>1.</strong> Tekan lama ikon {appName} di home screen →
              pilih <em>Hapus / Uninstall</em>.
            </li>
            <li>
              <strong>2.</strong> Buka kembali website ini via Chrome.
            </li>
            <li>
              <strong>3.</strong> Tap <em>Install Sekarang</em> untuk memasang
              versi terbaru.
            </li>
          </ol>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={onAck}
              size="sm"
              className={`text-xs ${
                swUpdateWaiting
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              Saya Mengerti
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({
  num,
  icon,
  title,
  desc,
}: {
  num: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold text-sm">
        {num}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900 flex items-center gap-1.5">
          <span className="text-teal-600">{icon}</span>
          {title}
        </p>
        <p className="text-gray-600 mt-0.5">{desc}</p>
      </div>
    </li>
  );
}
