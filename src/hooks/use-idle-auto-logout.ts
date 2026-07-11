"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface IdleAutoLogoutOptions {
  /** Idle timeout in milliseconds before auto-logout triggers. Default: 30 minutes. */
  idleTimeoutMs?: number;
  /** Warning time in milliseconds BEFORE the timeout triggers, to show a warning toast. Default: 5 minutes before. */
  warningBeforeMs?: number;
  /** Whether the auto-logout is enabled (e.g., only for USER role). */
  enabled: boolean;
  /** Callback invoked when the idle timeout elapses (should perform logout). */
  onTimeout: () => void;
}

/**
 * useIdleAutoLogout
 *
 * Monitors user activity (mousemove, mousedown, keydown, touchstart, click, scroll, wheel)
 * and triggers auto-logout after a configurable period of inactivity.
 *
 * Designed for student (USER role) sessions: 30 minutes idle → auto-logout.
 *
 * Features:
 * - Shows a warning toast `warningBeforeMs` before the actual logout so the user can react.
 * - Resets the timer on any user activity.
 * - Persists last-activity timestamp in localStorage so navigation/reload doesn't reset the clock.
 * - Cross-tab synchronization: activity in one tab resets the timer for all tabs.
 */
export function useIdleAutoLogout({
  idleTimeoutMs = 30 * 60 * 1000, // 30 minutes
  warningBeforeMs = 5 * 60 * 1000, // 5 minutes
  enabled,
  onTimeout,
}: IdleAutoLogoutOptions) {
  const { toast } = useToast();
  const [isWarningShown, setIsWarningShown] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(idleTimeoutMs);

  // Refs to avoid stale closures inside event listeners
  const onTimeoutRef = useRef(onTimeout);
  const warningShownRef = useRef(false);
  const lastActivityRef = useRef<number>(Date.now());
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Storage key for cross-tab last-activity timestamp
  const STORAGE_KEY = "cekdiribk_last_activity";

  // Read persisted last activity on mount
  useEffect(() => {
    if (!enabled) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ts = parseInt(stored, 10);
        if (!Number.isNaN(ts)) {
          lastActivityRef.current = ts;
        }
      } else {
        lastActivityRef.current = Date.now();
        localStorage.setItem(STORAGE_KEY, String(lastActivityRef.current));
      }
    } catch {
      lastActivityRef.current = Date.now();
    }
  }, [enabled]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, String(lastActivityRef.current));
    } catch {
      /* ignore */
    }
    if (warningShownRef.current) {
      warningShownRef.current = false;
      setIsWarningShown(false);
    }
  }, []);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled) return;

    const activityEvents: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "click",
      "scroll",
      "wheel",
    ];

    // Throttle reset to once per 10 seconds to avoid excessive writes
    let lastResetCall = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastResetCall > 10_000 || warningShownRef.current) {
        lastResetCall = now;
        resetTimer();
      } else {
        // Still update the timestamp silently for accuracy
        lastActivityRef.current = now;
        try {
          localStorage.setItem(STORAGE_KEY, String(now));
        } catch {
          /* ignore */
        }
      }
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    // Listen for cross-tab storage updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const ts = parseInt(e.newValue, 10);
        if (!Number.isNaN(ts)) {
          lastActivityRef.current = ts;
          if (warningShownRef.current) {
            warningShownRef.current = false;
            setIsWarningShown(false);
          }
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
      window.removeEventListener("storage", handleStorage);
    };
  }, [enabled, resetTimer]);

  // Ticker to check elapsed time and trigger warning/timeout
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      // Re-read from localStorage on every tick for cross-tab consistency
      // (the `storage` event only fires in OTHER tabs, not the one that wrote)
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const ts = parseInt(stored, 10);
          if (!Number.isNaN(ts) && ts > lastActivityRef.current) {
            // Another tab updated activity more recently — sync up
            lastActivityRef.current = ts;
            if (warningShownRef.current) {
              warningShownRef.current = false;
              setIsWarningShown(false);
            }
          }
        }
      } catch {
        /* ignore */
      }

      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const remaining = Math.max(0, idleTimeoutMs - elapsed);
      setRemainingMs(remaining);

      // Show warning when approaching timeout
      if (
        !warningShownRef.current &&
        remaining <= warningBeforeMs &&
        remaining > 0
      ) {
        warningShownRef.current = true;
        setIsWarningShown(true);
        const minsLeft = Math.ceil(remaining / 60_000);
        toast({
          title: "Sesi akan berakhir",
          description: `Anda akan otomatis keluar dalam ${minsLeft} menit karena tidak ada aktivitas. Silakan berinteraksi untuk memperpanjang sesi.`,
          variant: "destructive",
          duration: 10_000,
        });
      }

      // Trigger timeout
      if (elapsed >= idleTimeoutMs) {
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        toast({
          title: "Sesi berakhir",
          description: "Anda telah keluar otomatis karena 30 menit tidak ada aktivitas.",
          variant: "destructive",
          duration: 5_000,
        });
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        // Defer the actual logout slightly so the toast has time to render
        // before the page transitions and the radix toast state is reset.
        setTimeout(() => {
          onTimeoutRef.current();
        }, 300);
      }
    };

    tickIntervalRef.current = setInterval(tick, 5_000);
    tick(); // initial tick

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [enabled, idleTimeoutMs, warningBeforeMs, toast]);

  return {
    remainingMs,
    isWarningShown,
    resetTimer,
  };
}
