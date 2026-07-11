"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Calendar, User, GraduationCap, Shield, MessageSquare,
  ClipboardList, ChevronDown, RefreshCw,
  BookOpen, Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  useAuth, apiFetch, FIELD_CONFIG, STATUS_CONFIG,
  type View, type CounselingData,
} from "@/lib/app-shared";

interface TopicItem {
  text: string;
  answer: "IYA" | "TIDAK";
  checked: boolean;
  field?: string;
  questionId?: string;
}

export default function StudentCounselingHistory({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [counselings, setCounselings] = useState<CounselingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("ALL");

  const parseTopicItems = (raw: string | null | undefined): TopicItem[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) => ({
          text: String(item.text || ""),
          answer: item.answer === "IYA" || item.answer === "TIDAK" ? item.answer : "IYA" as const,
          checked: item.checked !== undefined ? Boolean(item.checked) : true,
          field: item.field ? String(item.field) : undefined,
          questionId: item.questionId ? String(item.questionId) : undefined,
        }));
      }
      return [];
    } catch {
      return [];
    }
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiFetch("/api/counseling/history", {}, user.id, user.role, String(user.grade));
      setCounselings(data.counselings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredCounselings = filterStatus === "ALL"
    ? counselings
    : counselings.filter(c => c.status === filterStatus);

  const terjadwalCount = counselings.filter(c => c.status === "TERJADWAL").length;
  const selesaiCount = counselings.filter(c => c.status === "SELESAI").length;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-teal-600" />
          Riwayat Konseling BK
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Daftar sesi konseling yang telah dijadwalkan atau selesai untuk Anda
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{terjadwalCount}</p>
            <p className="text-xs text-blue-600 mt-0.5">Terjadwal</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{selesaiCount}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Selesai</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filterStatus === "ALL" ? "default" : "outline"}
          className={filterStatus === "ALL" ? "bg-teal-600 hover:bg-teal-700 text-white" : "text-gray-600"}
          onClick={() => setFilterStatus("ALL")}
        >
          Semua ({counselings.length})
        </Button>
        <Button
          size="sm"
          variant={filterStatus === "TERJADWAL" ? "default" : "outline"}
          className={filterStatus === "TERJADWAL" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-gray-600"}
          onClick={() => setFilterStatus("TERJADWAL")}
        >
          Terjadwal ({terjadwalCount})
        </Button>
        <Button
          size="sm"
          variant={filterStatus === "SELESAI" ? "default" : "outline"}
          className={filterStatus === "SELESAI" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-gray-600"}
          onClick={() => setFilterStatus("SELESAI")}
        >
          Selesai ({selesaiCount})
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" className="text-gray-400" onClick={fetchData}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCounselings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">Belum ada riwayat konseling</p>
            <p className="text-sm text-gray-400 mt-1">Riwayat konseling Anda akan tampil di sini setelah guru BK menjadwalkan sesi konseling</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCounselings.map((c) => {
            const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.TERJADWAL;
            const fieldCfg = FIELD_CONFIG[c.field] || FIELD_CONFIG.PRIBADI;
            const isExpanded = expandedId === c.id;
            const cItems = parseTopicItems(c.topicItems);
            const cTidakCount = cItems.filter(i => i.answer === "TIDAK").length;
            const cTidakPct = cItems.length > 0 ? Math.round((cTidakCount / cItems.length) * 100) : 0;

            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`border-2 ${statusCfg.borderColor} ${statusCfg.bgColor} overflow-hidden`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-white/80 ${fieldCfg.color} shrink-0`}>
                        {fieldCfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Title + Badges */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold text-gray-900">{c.topic}</h4>
                          <Badge className={`${statusCfg.bgColor} ${statusCfg.color} border ${statusCfg.borderColor} text-xs`}>
                            {statusCfg.icon}
                            <span className="ml-1">{statusCfg.label}</span>
                          </Badge>
                          <Badge variant="outline" className="text-xs">{fieldCfg.label}</Badge>
                          {cItems.length > 0 && (
                            <Badge variant="outline" className="text-xs">{cTidakPct}% TIDAK</Badge>
                          )}
                        </div>

                        {/* Info row */}
                        <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(c.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5" />
                            {c.bkOfficer}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            {c.field}
                          </span>
                        </div>

                        {/* Progress bar */}
                        {cItems.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  cTidakPct >= 100 ? "bg-emerald-500" : cTidakPct >= 90 ? "bg-teal-500" : cTidakPct >= 75 ? "bg-amber-500" : cTidakPct >= 50 ? "bg-orange-500" : "bg-rose-500"
                                }`}
                                style={{ width: `${cTidakPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 shrink-0">{cTidakCount} TIDAK / {cItems.length}</span>
                          </div>
                        )}

                        {/* Pernyataan Masalah — langsung tampil untuk TERJADWAL & SELESAI */}
                        {cItems.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
                              <ClipboardList className="h-3 w-3" />
                              Pernyataan Masalah
                            </p>
                            <div className="space-y-1">
                              {cItems.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm bg-white/70 rounded-lg px-2.5 py-1.5 border border-gray-100">
                                  <span className="text-gray-400 w-5 text-right shrink-0 text-xs pt-0.5">{idx + 1}.</span>
                                  <span className="flex-1 text-gray-700 text-xs leading-relaxed">{item.text}</span>
                                  <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${
                                    item.answer === "IYA"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  } border`}>
                                    {item.answer}
                                  </Badge>
                                </div>
                              ))}
                              {cItems.length > 5 && (
                                <p className="text-xs text-gray-400 pl-7">+{cItems.length - 5} pernyataan lainnya (klik untuk melihat semua)</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Expand button */}
                      <div className="shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 pt-4 border-t border-gray-200/50"
                      >
                        {/* Full topic items list */}
                        {cItems.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-gray-400 mb-2">SEMUA PERNYATAAN</p>
                            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                              {cItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm bg-white rounded-lg px-3 py-2 border">
                                  <span className="text-gray-500 w-6 text-right shrink-0 text-xs">{idx + 1}.</span>
                                  <span className="flex-1 text-gray-700">{item.text}</span>
                                  {item.field && (
                                    <Badge variant="outline" className="text-[10px] shrink-0">{item.field}</Badge>
                                  )}
                                  <Badge className={`text-xs ${
                                    item.answer === "IYA"
                                      ? "bg-amber-50 text-amber-700 border-amber-300"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  } border`}>
                                    {item.answer}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-1">RINGKASAN</p>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">
                              {c.ringkasan || <span className="italic text-gray-400">Tidak ada ringkasan</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-1">TINDAK LANJUT</p>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">
                              {c.followUp || <span className="italic text-gray-400">Belum ada tindak lanjut</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-1">SOLUSI</p>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">
                              {c.solusi || <span className="italic text-gray-400">Belum ada solusi</span>}
                            </p>
                          </div>
                        </div>

                        {c.notes && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-400 mb-1">CATATAN</p>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">{c.notes}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}