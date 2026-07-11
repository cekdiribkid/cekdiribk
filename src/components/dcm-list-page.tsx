"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, ArrowRight, GraduationCap, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth, apiFetch, FIELD_CONFIG, type View, type SurveyData } from "@/lib/app-shared";

function DCMListPage({ onNavigate, onSelectSurvey }: { onNavigate: (view: View) => void; onSelectSurvey: (id: string) => void }) {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState<string>("ALL");

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/surveys", {}, user.id, user.role, String(user.grade))
      .then((data) => setSurveys(data.surveys || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const filteredSurveys = selectedField === "ALL" ? surveys : surveys.filter((s) => s.field === selectedField);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Daftar Cek Masalah</h2>
          <p className="text-gray-500">Kelas {user?.grade} — Pilih bidang assessment</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={selectedField === "ALL" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedField("ALL")}
          className={selectedField === "ALL" ? "bg-teal-600 hover:bg-teal-700" : ""}
        >
          Semua
        </Button>
        {Object.entries(FIELD_CONFIG).map(([key, cfg]) => (
          <Button
            key={key}
            variant={selectedField === key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedField(key)}
            className={selectedField === key ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            {cfg.icon}
            <span className="ml-1">{cfg.label}</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-4 bg-gray-200 rounded w-3/4" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSurveys.map((survey) => {
            const cfg = FIELD_CONFIG[survey.field] || FIELD_CONFIG.PRIBADI;
            const isCompleted = survey.responses?.[0]?.completed;
            const questionCount = survey._count?.questions || 0;

            return (
              <Card key={survey.id} className={`border-2 ${isCompleted ? "border-emerald-200 bg-emerald-50/50" : cfg.bgColor} cursor-pointer transition-all hover:shadow-md`}>
                <CardContent className="p-5" onClick={() => {
                  if (!isCompleted) {
                    onSelectSurvey(survey.id);
                    onNavigate("survey");
                  } else {
                    onSelectSurvey(survey.id);
                    onNavigate("results");
                  }
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${cfg.color} bg-white/80`}>
                        {cfg.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold">{survey.title}</h4>
                        <p className="text-sm text-gray-500">{survey.description}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <GraduationCap className="h-3 w-3 mr-1" />Kelas {survey.grade}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{questionCount} Pernyataan</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Selesai</Badge>
                      ) : (
                        <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                          Mulai <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredSurveys.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Tidak ada survey tersedia</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DCMListPage;
