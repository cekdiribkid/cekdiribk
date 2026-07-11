"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Award, Search, ChevronRight, Shield, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth, apiFetch, FIELD_CONFIG, type View, type ResponseData } from "@/lib/app-shared";
import {
  getGradeInfo,
  calculateOverallPercentage,
  type FieldName,
} from "@/lib/recommendations";

interface StudentCertInfo {
  id: string;
  name: string;
  email: string;
  grade: number;
  jenisKelamin?: string | null;
  whatsapp?: string | null;
  fieldPercentages: Record<string, number>;
  overallPercentage: number;
  qualifies: boolean;
}

export default function AdminCertificateList({ onNavigate, onSelectCertificateStudent }: {
  onNavigate: (view: View) => void;
  onSelectCertificateStudent: (studentId: string) => void;
}) {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentCertInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>("ALL");

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;

    Promise.all([
      apiFetch("/api/admin/users", {}, user.id, user.role, String(user.grade)),
      apiFetch("/api/admin/analysis", {}, user.id, user.role, String(user.grade)),
    ])
      .then(([usersData, analysisData]) => {
        const allUsers = (usersData.users || []).filter((u: any) => u.role === "USER");
        const responses: ResponseData[] = analysisData.responses || [];

        // Group responses by userId and field
        const studentMap = new Map<string, { user: any; fieldResponses: Map<string, ResponseData[]> }>();

        for (const u of allUsers) {
          studentMap.set(u.id, { user: u, fieldResponses: new Map() });
        }

        for (const resp of responses) {
          if (!studentMap.has(resp.userId)) continue;
          const entry = studentMap.get(resp.userId)!;
          const field = resp.survey.field;
          if (!entry.fieldResponses.has(field)) {
            entry.fieldResponses.set(field, []);
          }
          entry.fieldResponses.get(field)!.push(resp);
        }

        // Calculate per-student results
        const studentResults: StudentCertInfo[] = [];
        const fields: FieldName[] = ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"];

        for (const [userId, entry] of studentMap) {
          const fieldPercentages: Record<string, number> = {};

          for (const field of fields) {
            const fieldResps = entry.fieldResponses.get(field) || [];
            // The analysis API already filters for completed responses, but
            // r.completed may be undefined in older API versions. Treat as completed.
            const completedResps = fieldResps.filter(r => r.completed !== false);
            if (completedResps.length === 0) {
              fieldPercentages[field] = -1; // Not completed
              continue;
            }

            let tidak = 0;
            let total = 0;
            for (const resp of completedResps) {
              for (const ans of resp.answers) {
                if (ans.value === "TIDAK") tidak++;
                total++;
              }
            }
            fieldPercentages[field] = total > 0 ? Math.round((tidak / total) * 100) : 0;
          }

          const completedFields = fields.filter(f => fieldPercentages[f] >= 0);
          const allCompleted = completedFields.length === 4;
          const validPercentages: Record<FieldName, number> = {} as Record<FieldName, number>;
          for (const f of completedFields) {
            validPercentages[f as FieldName] = fieldPercentages[f];
          }

          const overallPct = allCompleted ? calculateOverallPercentage(validPercentages) : -1;
          const qualifies = allCompleted && Object.values(fieldPercentages).every(p => p === 100);

          studentResults.push({
            id: userId,
            name: entry.user.name,
            email: entry.user.email,
            grade: entry.user.grade,
            jenisKelamin: entry.user.jenisKelamin,
            whatsapp: entry.user.whatsapp,
            fieldPercentages,
            overallPercentage: overallPct,
            qualifies,
          });
        }

        // Sort: qualifying first, then by name
        studentResults.sort((a, b) => {
          if (a.qualifies && !b.qualifies) return -1;
          if (!a.qualifies && b.qualifies) return 1;
          return a.name.localeCompare(b.name);
        });

        setStudents(studentResults);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (filterGrade !== "ALL" && s.grade !== Number(filterGrade)) {
        return false;
      }
      return true;
    });
  }, [students, search, filterGrade]);

  const qualifyingCount = students.filter(s => s.qualifies).length;
  const fields: FieldName[] = ["PRIBADI", "SOSIAL", "BELAJAR", "KARIR"];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-100 rounded-xl">
          <Award className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Sertifikat Siswa</h2>
          <p className="text-sm text-gray-500">
            Siswa yang mencapai <strong>100% TIDAK</strong> (tidak ada masalah) di seluruh bidang berhak mendapat sertifikat
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-amber-600" />
            <p className="text-2xl font-bold text-amber-700">{qualifyingCount}</p>
            <p className="text-xs text-amber-600">Siswa Memenuhi Syarat</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-2xl font-bold text-gray-600">{students.length - qualifyingCount}</p>
            <p className="text-xs text-gray-500">Belum Memenuhi Syarat</p>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-teal-600" />
            <p className="text-2xl font-bold text-teal-700">{students.length}</p>
            <p className="text-xs text-teal-600">Total Siswa</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari nama atau email siswa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["ALL", "7", "8", "9"].map((g) => (
            <Button
              key={g}
              size="sm"
              variant={filterGrade === g ? "default" : "outline"}
              onClick={() => setFilterGrade(g)}
              className={filterGrade === g ? "bg-teal-600 hover:bg-teal-700" : "border-teal-200 text-teal-700"}
            >
              {g === "ALL" ? "Semua" : `Kelas ${g}`}
            </Button>
          ))}
        </div>
      </div>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Tidak ada data siswa ditemukan</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student, idx) => {
            const allCompleted = fields.every(f => student.fieldPercentages[f] >= 0);

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className={`border-2 ${student.qualifies ? "border-amber-300 bg-amber-50/30" : "border-gray-200"}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Student Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800 truncate">{student.name}</span>
                          {student.qualifies && (
                            <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                              <Award className="h-3 w-3 mr-1" /> Sertifikat
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Kelas {student.grade}</span>
                          <span>{student.email}</span>
                          {student.whatsapp && <span>WA: {student.whatsapp}</span>}
                        </div>
                      </div>

                      {/* Field Progress */}
                      <div className="flex items-center gap-2">
                        {fields.map((field) => {
                          const pct = student.fieldPercentages[field];
                          const cfg = FIELD_CONFIG[field];
                          const isComplete = pct >= 0;
                          const isPerfect = pct === 100;

                          return (
                            <div
                              key={field}
                              className={`text-center px-2 py-1 rounded-lg text-xs ${
                                !isComplete ? "bg-gray-100 text-gray-400" :
                                isPerfect ? "bg-emerald-100 text-emerald-700" :
                                "bg-gray-50 text-gray-600"
                              }`}
                              title={`${cfg.label}: ${isComplete ? pct + "%" : "Belum"}`}
                            >
                              <div className="text-base mb-0.5">{cfg.icon}</div>
                              <div className="font-bold">{isComplete ? `${pct}%` : "-"}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Overall & Action */}
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[60px]">
                          {allCompleted ? (
                            <>
                              <div className={`text-lg font-bold ${student.qualifies ? "text-amber-700" : "text-gray-600"}`}>
                                {student.overallPercentage}%
                              </div>
                              <Badge className={`text-[10px] px-1.5 py-0 ${
                                student.qualifies ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                              } border-0`}>
                                Grade {getGradeInfo(student.overallPercentage).grade}
                              </Badge>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">Belum lengkap</span>
                          )}
                        </div>

                        {student.qualifies && (
                          <Button
                            size="sm"
                            onClick={() => {
                              onSelectCertificateStudent(student.id);
                              onNavigate("certificate");
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                          >
                            <Award className="h-4 w-4 mr-1" /> Lihat Sertifikat
                          </Button>
                        )}
                      </div>
                    </div>
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
