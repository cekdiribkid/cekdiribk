"use client";

import React from "react";
import { ArrowLeft, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, type View } from "@/lib/app-shared";

function ProfilePage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();

  if (!user) return null;

  const formatWaDisplay = (wa: string) => {
    if (wa.startsWith("0")) return wa;
    if (wa.startsWith("62")) return "0" + wa.slice(2);
    return wa;
  };
  const formatWaLink = (wa: string) => {
    if (wa.startsWith("0")) return "62" + wa.slice(1);
    if (wa.startsWith("62")) return wa;
    if (wa.startsWith("+62")) return wa.slice(1);
    return "62" + wa;
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
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-2xl font-bold">
                {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
              <AvatarImage src={user.image} />
            </Avatar>
            <div>
              <h3 className="text-xl font-bold">{user.name}</h3>
              <p className="text-gray-500">{user.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
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
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-500">Nama</span><span className="font-medium">{user.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{user.email}</span></div>
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
                <a href={`https://wa.me/${formatWaLink(user.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="font-medium text-green-600 hover:text-green-700 hover:underline flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />{formatWaDisplay(user.whatsapp)}
                </a>
              ) : (
                <span className="text-gray-400 italic">Belum diisi</span>
              )}
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Kelas</span><span className="font-medium">{user.grade}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Role</span><span className="font-medium">{user.role}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Bergabung</span><span className="font-medium">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "-"}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProfilePage;
