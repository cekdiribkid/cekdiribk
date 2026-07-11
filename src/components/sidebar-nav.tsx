"use client";

import React from "react";
import { Home, User, ClipboardList, PieChart as PieChartIcon, FileText, LayoutDashboard, Users, MessageSquare, Download, Settings, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth, type View } from "@/lib/app-shared";

export default function SidebarNav({ currentView, onNavigate, isOpen, onClose }: {
  currentView: View;
  onNavigate: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const isAdmin = user.role === "ADMIN";

  const userMenuItems = [
    { view: "dashboard" as View, label: "Selamat Datang", icon: <Home className="h-4 w-4" /> },
    { view: "profile" as View, label: "Profil", icon: <User className="h-4 w-4" /> },
    { view: "dcm" as View, label: "Daftar Cek Masalah", icon: <ClipboardList className="h-4 w-4" /> },
    { view: "results" as View, label: "Hasil Analisa", icon: <PieChartIcon className="h-4 w-4" /> },
    { view: "student-report" as View, label: "Laporan Survey", icon: <FileText className="h-4 w-4" /> },
  ];

  const adminMenuItems = [
    { view: "admin-dashboard" as View, label: "Dashboard Admin", icon: <LayoutDashboard className="h-4 w-4" /> },
    { view: "admin-users" as View, label: "Kelola User", icon: <Users className="h-4 w-4" /> },
    { view: "admin-surveys" as View, label: "Kelola Survey", icon: <ClipboardList className="h-4 w-4" /> },
    { view: "admin-counseling" as View, label: "Konseling BK", icon: <MessageSquare className="h-4 w-4" /> },
    { view: "admin-analysis" as View, label: "Hasil Analisa", icon: <PieChartIcon className="h-4 w-4" /> },
    { view: "admin-report" as View, label: "Laporan Survey", icon: <FileText className="h-4 w-4" /> },
    { view: "admin-import" as View, label: "Import / Export", icon: <Download className="h-4 w-4" /> },
    { view: "admin-settings" as View, label: "Pengaturan", icon: <Settings className="h-4 w-4" /> },
  ];

  const menuItems = isAdmin ? [...userMenuItems, ...adminMenuItems] : userMenuItems;

  const handleLogout = () => {
    logout();
    onNavigate("landing");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-full w-72 bg-white border-r shadow-lg z-50 transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center gap-2 p-4 border-b">
          <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">BK</div>
          <div>
            <h3 className="font-bold text-sm">CekDiriBK.id</h3>
            <p className="text-xs text-gray-500">Self-Assessment BK</p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-bold">
                {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.name}</p>
              <p className="text-xs text-gray-500">Kelas {user.grade} • {user.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
          <nav className="p-2">
            {isAdmin && <p className="text-xs text-gray-400 px-3 py-2 font-medium uppercase">Menu Siswa</p>}
            {userMenuItems.map((item) => (
              <button
                key={item.view}
                onClick={() => { onNavigate(item.view); onClose(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5 ${
                  currentView === item.view ? "bg-teal-50 text-teal-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}

            {isAdmin && (
              <>
                <p className="text-xs text-gray-400 px-3 py-2 mt-3 font-medium uppercase">Menu Admin</p>
                {adminMenuItems.map((item) => (
                  <button
                    key={item.view}
                    onClick={() => { onNavigate(item.view); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5 ${
                      currentView === item.view ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </>
            )}
          </nav>
        </ScrollArea>

        {/* Logout */}
        <div className="p-3 border-t">
          <Button variant="outline" className="w-full justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Keluar
          </Button>
        </div>
      </aside>
    </>
  );
}
