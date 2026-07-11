"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/app-shared";

// WhatsApp SVG icon path (reused for FAB + popup button).
const WA_PATH =
  "M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.128-1.958A15.914 15.914 0 0 0 16.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.342 22.616c-.39 1.1-1.932 2.014-3.164 2.28-.844.18-1.946.324-5.66-1.216-4.748-1.97-7.804-6.78-8.038-7.094-.226-.314-1.886-2.512-1.886-4.79s1.194-3.398 1.618-3.864c.39-.428.852-.536 1.136-.536.282 0 .566.002.812.016.262.012.614-.1.96.732.356.854 1.21 2.95 1.316 3.164.108.214.18.466.036.748-.136.282-.204.458-.408.706-.214.248-.448.554-.638.744-.214.214-.436.446-.188.876.248.428 1.104 1.82 2.37 2.948 1.63 1.452 3.004 1.902 3.432 2.116.428.214.676.18.924-.108.248-.288 1.064-1.24 1.348-1.666.282-.428.566-.356.952-.214.39.142 2.478 1.168 2.902 1.382.428.214.712.322.818.498.108.178.108 1.022-.282 2.12z";

// Module-scoped cache so repeated mounts (e.g. navigating between pages after
// login) don't each re-fetch /api/settings. Stale for 10 minutes max.
let cachedWaNumber: string | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

const FALLBACK_WA_NUMBER = "6289504186122";

/**
 * Normalize a WhatsApp number: strip spaces/dashes/parens/leading "+" and
 * convert leading "0" to "62" (Indonesia). Returns the cleaned string.
 */
function normalizeWaNumber(raw: string): string {
  let s = (raw || "").replace(/[\s\-()]/g, "");
  if (!s) return "";
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("0")) s = "62" + s.slice(1);
  else if (!s.startsWith("62") && /^\d{8,}$/.test(s)) s = "62" + s;
  return s;
}

function WhatsAppFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  // Initialize from cache if available (avoids setState-in-effect warning
  // for the cache-hit path). The fetch path uses setState in an async
  // callback, which is safe.
  const [waNumber, setWaNumber] = useState<string>(() => {
    if (cachedWaNumber && Date.now() < cacheExpiry) {
      return cachedWaNumber;
    }
    return FALLBACK_WA_NUMBER;
  });

  // Fetch the WhatsApp number from public settings on mount (or use cache).
  useEffect(() => {
    // Cache still fresh → no need to refetch.
    if (cachedWaNumber && Date.now() < cacheExpiry) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/api/settings");
        if (cancelled) return;
        const settings = (data?.settings || {}) as Record<string, string>;
        const raw = settings.bkWhatsApp || "";
        const normalized = normalizeWaNumber(raw) || FALLBACK_WA_NUMBER;
        cachedWaNumber = normalized;
        cacheExpiry = Date.now() + CACHE_TTL_MS;
        setWaNumber(normalized);
      } catch {
        // Keep fallback on error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const waMessage = encodeURIComponent("Halo Guru BK, saya ingin bertanya/mohon bantuan terkait CekDiriBK.id.");
  const waLink = `https://wa.me/${waNumber}?text=${waMessage}`;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 print:hidden">
      {/* Chat Bubble Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-[260px]"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 32 32" className="h-6 w-6 fill-white">
                  <path d={WA_PATH} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">Bantuan BK</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Ada yang bisa kami bantu? Chat kami via WhatsApp
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 -mt-1"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              <svg viewBox="0 0 32 32" className="h-4 w-4 fill-white">
                <path d={WA_PATH} />
              </svg>
              Mulai Chat
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg flex items-center justify-center text-white transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Hubungi via WhatsApp"
        title="Hubungi via WhatsApp"
      >
        {/* Pulse ring animation */}
        <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
        <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white relative z-10">
          <path d={WA_PATH} />
        </svg>
      </motion.button>
    </div>
  );
}

export default WhatsAppFloatingButton;
