"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, ArrowRight, ChevronRight,
  GraduationCap, ClipboardList, User, PieChart as PieChartIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth, apiFetch, FIELD_CONFIG, UserPhoto, type View, type SurveyData, type ResponseData } from "@/lib/app-shared";

export default function UserDashboard({ onNavigate, onSelectSurvey }: { onNavigate: (view: View) => void; onSelectSurvey?: (id: string) => void }) {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch("/api/surveys", {}, user.id, user.role, String(user.grade)),
      apiFetch("/api/responses", {}, user.id, user.role, String(user.grade)),
    ])
      .then(([surveyData, responseData]) => {
        setSurveys(surveyData.surveys || []);
        setResponses(responseData.responses || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const completedSurveys = responses.filter((r) => r.completed).length;
  const totalSurveys = surveys.length;

  return (
    <div className="-m-4 md:-m-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-emerald-600 text-white relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full" />
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 relative">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-4">
              <UserPhoto
                user={user || { name: "?" }}
                size="lg"
                className="ring-2 ring-white/50 shadow-xl shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold">Selamat Datang, {user?.name}! 👋</h2>
                <p className="text-teal-100 mt-1 text-sm sm:text-base">
                  Kelas {user?.grade} • Mulai kenali dirimu melalui Daftar Cek Masalah
                </p>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <Card className="bg-white/10 border-white/20 text-white flex-1">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{totalSurveys}</p>
                  <p className="text-sm text-teal-100">Survey Tersedia</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20 text-white flex-1">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{completedSurveys}</p>
                  <p className="text-sm text-teal-100">Survey Selesai</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20 text-white flex-1">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{totalSurveys - completedSurveys}</p>
                  <p className="text-sm text-teal-100">Belum Dikerjakan</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>

      {/* DCM Cards */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Daftar Cek Masalah (DCM)</h3>
            <p className="text-sm text-gray-500">Pilih bidang untuk memulai assessment</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {surveys.map((survey) => {
              const cfg = FIELD_CONFIG[survey.field] || FIELD_CONFIG.PRIBADI;
              const response = survey.responses?.[0];
              const isCompleted = response?.completed;
              const questionCount = survey._count?.questions || survey.questions?.length || 0;

              return (
                <motion.div
                  key={survey.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <Card className={`border-2 cursor-pointer transition-all ${cfg.bgColor}`}>
                    <CardContent className="p-5" onClick={() => {
                      if (isCompleted) {
                        onSelectSurvey?.(survey.id);
                        onNavigate("results");
                      } else {
                        onSelectSurvey?.(survey.id);
                        onNavigate("survey");
                      }
                    }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${cfg.color} bg-white/80`}>
                            {cfg.icon}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{survey.title}</h4>
                            <p className="text-sm text-gray-500">{cfg.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                Kelas {survey.grade}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {questionCount} Pernyataan
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {isCompleted ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Selesai
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Mulai
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("dcm")}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-teal-100 rounded-xl text-teal-600">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold">Daftar Cek Masalah</h4>
                  <p className="text-sm text-gray-500">Lihat semua survey</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("results")}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                  <PieChartIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold">Hasil Analisa</h4>
                  <p className="text-sm text-gray-500">Lihat hasil assessment</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("profile")}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-violet-100 rounded-xl text-violet-600">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold">Profil</h4>
                  <p className="text-sm text-gray-500">Kelola profil kamu</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
