"use client";

import React, { useState } from "react";
import {
  Home, Users, BookOpen, ClipboardList, FileText,
  LayoutDashboard, MessageSquare, PieChart as PieChartIcon,
  Settings, Download, User, LogOut, X, Menu, BarChart3,
  Award, GraduationCap, ShieldHalf, Eye,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth, type View, SchoolLogo } from "@/lib/app-shared";

export default function SidebarNav({ currentView, onNavigate, isOpen, onClose }: {
  currentView: View;
  onNavigate: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Collapsible menu sections — default both expanded.
  // Persisted to localStorage so the user's choice is remembered.
  // Lazy init: read localStorage once on first client render (SidebarNav is
  // dynamically imported with ssr:false so localStorage is always available).
  const [siswaOpen, setSiswaOpen] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem("sidebar-siswa-open");
      return s === null ? true : s === "1";
    } catch {
      return true;
    }
  });
  const [adminOpen, setAdminOpen] = useState<boolean>(() => {
    try {
      const a = localStorage.getItem("sidebar-admin-open");
      return a === null ? true : a === "1";
    } catch {
      return true;
    }
  });

  const toggleSiswa = () => {
    const next = !siswaOpen;
    setSiswaOpen(next);
    try { localStorage.setItem("sidebar-siswa-open", next ? "1" : "0"); } catch { /* ignore */ }
  };
  const toggleAdmin = () => {
    const next = !adminOpen;
    setAdminOpen(next);
    try { localStorage.setItem("sidebar-admin-open", next ? "1" : "0"); } catch { /* ignore */ }
  };

  if (!user) return null;

  const userMenuItems = [
    { view: "dashboard" as View, label: "Selamat Datang", icon: <Home className="h-4 w-4" /> },
    { view: "profile" as View, label: "Profil", icon: <User className="h-4 w-4" /> },
    { view: "dcm" as View, label: "Daftar Cek Masalah", icon: <ClipboardList className="h-4 w-4" /> },
    { view: "results" as View, label: "Hasil Analisa", icon: <PieChartIcon className="h-4 w-4" /> },
    { view: "student-counseling" as View, label: "Riwayat Konseling", icon: <MessageSquare className="h-4 w-4" /> },
    { view: "student-report" as View, label: "Laporan Survey", icon: <FileText className="h-4 w-4" /> },
  ];

  const adminMenuItems = [
    { view: "admin-dashboard" as View, label: "Dashboard Admin", icon: <LayoutDashboard className="h-4 w-4" /> },
    { view: "admin-users" as View, label: "Kelola User", icon: <Users className="h-4 w-4" /> },
    { view: "admin-surveys" as View, label: "Kelola Survey", icon: <ClipboardList className="h-4 w-4" /> },
    { view: "admin-counseling" as View, label: "Konseling BK", icon: <MessageSquare className="h-4 w-4" /> },
    { view: "admin-analysis" as View, label: "Hasil Analisa", icon: <PieChartIcon className="h-4 w-4" /> },
    { view: "admin-certificate" as View, label: "Sertifikat", icon: <Award className="h-4 w-4" /> },
    { view: "admin-visitor" as View, label: "Log Visitor", icon: <Eye className="h-4 w-4" /> },
    { view: "admin-monitoring" as View, label: "Monitoring", icon: <BarChart3 className="h-4 w-4" /> },
    { view: "admin-report" as View, label: "Laporan Survey", icon: <FileText className="h-4 w-4" /> },
    { view: "admin-import" as View, label: "Import / Export", icon: <Download className="h-4 w-4" /> },
    { view: "admin-settings" as View, label: "Pengaturan", icon: <Settings className="h-4 w-4" /> },
  ];

  const handleLogout = () => {
    logout();
    onNavigate("landing");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-100 shadow-2xl shadow-gray-200/50 z-50 transition-transform duration-300 flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>

        {/* ===== HEADER ===== */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500" />
          {/* Decorative circles */}
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-white/10 rounded-full" />

          <div className="relative flex items-center gap-2.5 px-3 py-2.5">
            <SchoolLogo size="md" />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-xs text-white tracking-wide truncate leading-tight">CekDiriBK.id</h3>
              <p className="text-[10px] text-white/75 truncate leading-tight">Self-Assessment BK</p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 md:hidden text-white/80 hover:text-white hover:bg-white/20 rounded-lg h-8 w-8" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ===== USER INFO ===== */}
        <div className="px-3 py-2 border-b border-gray-100/80">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9 ring-2 ring-teal-200/60 ring-offset-1">
              <AvatarFallback className="bg-gradient-to-br from-teal-400 to-cyan-400 text-white text-xs font-bold">
                {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs truncate text-gray-800 leading-tight">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-gray-400">Kelas {user.grade}</span>
                <span className="text-gray-300">·</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                  isAdmin
                    ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"
                    : "bg-teal-50 text-teal-600 ring-1 ring-teal-100"
                }`}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== NAVIGATION ===== */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-2">

            {/* MENU SISWA (collapsible) */}
            <div className="rounded-xl bg-gradient-to-br from-teal-50/80 via-emerald-50/50 to-cyan-50/60 border border-teal-100/50 p-1.5 shadow-sm shadow-teal-100/30">
              {/* Section Header — clickable to collapse/expand */}
              <button
                type="button"
                onClick={toggleSiswa}
                aria-expanded={siswaOpen}
                aria-controls="menu-siswa-items"
                className="w-full flex items-center gap-1.5 px-1 py-0.5 mb-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-md"
              >
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center shadow-sm shadow-teal-200/50">
                  <GraduationCap className="h-3 w-3 text-white" />
                </div>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Menu Siswa</span>
                <div className="flex-1 h-px bg-gradient-to-r from-teal-300/50 to-transparent" />
                <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-teal-500 group-hover:bg-teal-100/60 group-hover:text-teal-700 transition-colors" title={siswaOpen ? "Sembunyikan" : "Tampilkan"}>
                  {siswaOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
              </button>

              {/* Menu Items Container — collapses with smooth height animation */}
              <div
                id="menu-siswa-items"
                className={`grid transition-all duration-300 ease-in-out ${
                  siswaOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-0.5">
                    {userMenuItems.map((item) => {
                      const isActive = currentView === item.view;
                      return (
                        <button
                          key={item.view}
                          onClick={() => { onNavigate(item.view); onClose(); }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 group ${
                            isActive
                              ? "bg-white/90 text-teal-700 font-semibold shadow-sm shadow-teal-100/50 border border-teal-200/50"
                              : "text-gray-600 hover:bg-white/60 hover:text-teal-700"
                          }`}
                        >
                          <span className={`transition-all duration-200 ${
                            isActive
                              ? "text-teal-500"
                              : "text-teal-400/70 group-hover:text-teal-500"
                          }`}>
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400 shadow-sm shadow-teal-300" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Collapsed hint (shows when menu is hidden) */}
              {!siswaOpen && (
                <div className="px-1 py-1 text-[9px] text-teal-500/70 text-center italic">
                  Menu disembunyikan
                </div>
              )}
            </div>

            {/* MENU ADMIN (collapsible) */}
            {isAdmin && (
              <div className="rounded-xl bg-gradient-to-br from-slate-50/80 via-indigo-50/50 to-violet-50/40 border border-indigo-100/50 p-1.5 shadow-sm shadow-indigo-100/30">
                {/* Section Header — clickable to collapse/expand */}
                <button
                  type="button"
                  onClick={toggleAdmin}
                  aria-expanded={adminOpen}
                  aria-controls="menu-admin-items"
                  className="w-full flex items-center gap-1.5 px-1 py-0.5 mb-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-md"
                >
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-slate-500 to-indigo-500 flex items-center justify-center shadow-sm shadow-indigo-200/50">
                    <ShieldHalf className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Menu Admin</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-indigo-300/50 to-transparent" />
                  <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-indigo-500 group-hover:bg-indigo-100/60 group-hover:text-indigo-700 transition-colors" title={adminOpen ? "Sembunyikan" : "Tampilkan"}>
                    {adminOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                </button>

                {/* Menu Items Container — collapses with smooth height animation */}
                <div
                  id="menu-admin-items"
                  className={`grid transition-all duration-300 ease-in-out ${
                    adminOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-0.5">
                      {adminMenuItems.map((item) => {
                        const isActive = currentView === item.view;
                        return (
                          <button
                            key={item.view}
                            onClick={() => { onNavigate(item.view); onClose(); }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 group ${
                              isActive
                                ? "bg-white/90 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/50 border border-indigo-200/50"
                                : "text-gray-600 hover:bg-white/60 hover:text-indigo-700"
                            }`}
                          >
                            <span className={`transition-all duration-200 ${
                              isActive
                                ? "text-indigo-500"
                                : "text-indigo-300/70 group-hover:text-indigo-500"
                            }`}>
                              {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                            {isActive && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-300" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Collapsed hint (shows when menu is hidden) */}
                {!adminOpen && (
                  <div className="px-1 py-1 text-[9px] text-indigo-500/70 text-center italic">
                    Menu disembunyikan
                  </div>
                )}
              </div>
            )}
          </nav>
        </ScrollArea>

        {/* ===== LOGOUT ===== */}
        <div className="p-2 border-t border-gray-100/80">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-rose-500 hover:bg-rose-50/60 rounded-lg text-xs h-8 transition-all duration-200"
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5 mr-2" /> Keluar
          </Button>
        </div>
      </aside>
    </>
  );
}
