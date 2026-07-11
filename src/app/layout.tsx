import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0d9488",
};

export const metadata: Metadata = {
  title: "CekDiriBK.id - Self-Assessment Bimbingan Konseling",
  description: "Kenali dirimu, Pahami masalahmu, dan temukan solusi terbaik bersama BK. DCM (Daftar Cek Masalah) untuk siswa SMP.",
  keywords: ["CekDiriBK", "Bimbingan Konseling", "DCM", "Self-Assessment", "SMP", "Masalah Siswa"],
  authors: [{ name: "Team 6" }],
  // Use the DYNAMIC icon endpoints so the favicon / apple-touch-icon / PWA
  // icon reflect the school's uploaded logo (admin-configurable in Pengaturan).
  // Falls back to the static default icons if no logo is set.
  icons: {
    icon: [
      { url: "/api/pwa/favicon", sizes: "32x32", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/api/pwa/apple-touch-icon",
  },
  // Dynamic manifest — icons inside point to /api/pwa/icon/[size] so the
  // app icon installed on the user's home screen uses the school logo.
  manifest: "/api/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CekDiriBK.id",
  },
  openGraph: {
    type: "website",
    title: "CekDiriBK.id - Self-Assessment BK",
    description: "Kenali dirimu, Pahami masalahmu. DCM Bimbingan Konseling untuk siswa SMP.",
    siteName: "CekDiriBK.id",
  },
  formatDetection: {
    telephone: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="CekDiriBK.id" />
        <meta name="msapplication-TileColor" content="#0d9488" />
        <meta name="msapplication-navbutton-color" content="#0d9488" />
        <link rel="apple-touch-icon" href="/api/pwa/apple-touch-icon" />
        <link rel="icon" type="image/png" sizes="32x32" href="/api/pwa/favicon" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        {/* Service Worker Registration — safe, no reload loops */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[PWA] Service Worker terdaftar:', registration.scope);

                      // If a new SW is waiting, force it to activate immediately
                      if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                      }

                      // Listen for new SW taking over — but ONLY reload once per session
                      // to prevent infinite reload loops in dev mode
                      var hasReloaded = false;
                      navigator.serviceWorker.addEventListener('controllerchange', function() {
                        if (!hasReloaded) {
                          hasReloaded = true;
                          window.location.reload();
                        }
                      });

                      // Check for updates periodically (every 30 minutes)
                      setInterval(function() {
                        registration.update();
                      }, 30 * 60 * 1000);
                    })
                    .catch(function(error) {
                      console.log('[PWA] Gagal mendaftarkan Service Worker:', error);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
