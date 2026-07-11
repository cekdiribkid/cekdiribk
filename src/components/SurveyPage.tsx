"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  AlertCircle, RefreshCw, Sparkles, Heart, Star, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, FIELD_CONFIG, type View, type SurveyData, type QuestionData } from "@/lib/app-shared";

export default function SurveyPage({ surveyId, onNavigate }: { surveyId: string; onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !surveyId) return;
    apiFetch(`/api/surveys/${surveyId}`, {}, user.id, user.role, String(user.grade))
      .then((data) => {
        setSurvey(data.survey);
        if (data.survey?.questions) {
          const initial: Record<string, string> = {};
          data.survey.questions.forEach((q: QuestionData) => { initial[q.id] = ""; });
          setAnswers(initial);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, surveyId]);

  const questions = survey?.questions || [];
  const progress = questions.length > 0 ? (Object.values(answers).filter((a) => a !== "").length / questions.length) * 100 : 0;

  const handleSubmit = async () => {
    if (!user || !surveyId) return;
    const unanswered = Object.values(answers).filter((a) => !a).length;
    if (unanswered > 0) {
      toast({ title: "Perhatian", description: `Masih ada ${unanswered} pernyataan belum dijawab`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const answerList = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
      await apiFetch("/api/responses", {
        method: "POST",
        body: JSON.stringify({ surveyId, answers: answerList }),
      }, user.id, user.role, String(user.grade));
      toast({ title: "Berhasil!", description: "Assessment berhasil disimpan" });
      onNavigate("results");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gradient-to-r from-pink-100/60 to-violet-100/60 rounded-2xl w-3/4" />
          <div className="h-48 bg-gradient-to-r from-rose-50/40 to-purple-50/40 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-100 to-violet-100 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-violet-400" />
        </div>
        <p className="text-gray-500 font-medium">Survey tidak ditemukan</p>
        <Button onClick={() => onNavigate("dcm")} className="mt-4 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl shadow-md border-0">
          Kembali
        </Button>
      </div>
    );
  }

  const cfg = FIELD_CONFIG[survey.field] || FIELD_CONFIG.PRIBADI;
  const q = questions[currentQuestion];

  // Soft, elegant, trendy color themes per field - designed for Gen Z / young people
  const fieldTheme: Record<string, {
    accent: string; accentLight: string; accentSoft: string;
    gradient: string; gradientSoft: string; headerGradient: string;
    welcomeGradient: string; welcomeBorder: string;
    progressGradient: string; activeNav: string; activeNavText: string;
  }> = {
    PRIBADI: {
      accent: "text-rose-500",
      accentLight: "text-rose-400",
      accentSoft: "text-rose-600/70",
      gradient: "from-rose-400 via-pink-400 to-fuchsia-400",
      gradientSoft: "from-rose-50 via-pink-50 to-fuchsia-50",
      headerGradient: "from-rose-400 to-pink-400",
      welcomeGradient: "from-rose-50/80 via-pink-50/60 to-fuchsia-50/80",
      welcomeBorder: "border-rose-200/60",
      progressGradient: "from-rose-400 to-pink-400",
      activeNav: "bg-gradient-to-r from-rose-400 to-pink-400",
      activeNavText: "text-white",
    },
    SOSIAL: {
      accent: "text-sky-500",
      accentLight: "text-sky-400",
      accentSoft: "text-sky-600/70",
      gradient: "from-sky-400 via-cyan-400 to-teal-400",
      gradientSoft: "from-sky-50 via-cyan-50 to-teal-50",
      headerGradient: "from-sky-400 to-cyan-400",
      welcomeGradient: "from-sky-50/80 via-cyan-50/60 to-teal-50/80",
      welcomeBorder: "border-sky-200/60",
      progressGradient: "from-sky-400 to-cyan-400",
      activeNav: "bg-gradient-to-r from-sky-400 to-cyan-400",
      activeNavText: "text-white",
    },
    BELAJAR: {
      accent: "text-amber-500",
      accentLight: "text-amber-400",
      accentSoft: "text-amber-600/70",
      gradient: "from-amber-400 via-yellow-400 to-orange-400",
      gradientSoft: "from-amber-50 via-yellow-50 to-orange-50",
      headerGradient: "from-amber-400 to-yellow-400",
      welcomeGradient: "from-amber-50/80 via-yellow-50/60 to-orange-50/80",
      welcomeBorder: "border-amber-200/60",
      progressGradient: "from-amber-400 to-yellow-400",
      activeNav: "bg-gradient-to-r from-amber-400 to-yellow-400",
      activeNavText: "text-white",
    },
    KARIR: {
      accent: "text-violet-500",
      accentLight: "text-violet-400",
      accentSoft: "text-violet-600/70",
      gradient: "from-violet-400 via-purple-400 to-fuchsia-400",
      gradientSoft: "from-violet-50 via-purple-50 to-fuchsia-50",
      headerGradient: "from-violet-400 to-purple-400",
      welcomeGradient: "from-violet-50/80 via-purple-50/60 to-fuchsia-50/80",
      welcomeBorder: "border-violet-200/60",
      progressGradient: "from-violet-400 to-purple-400",
      activeNav: "bg-gradient-to-r from-violet-400 to-purple-400",
      activeNavText: "text-white",
    },
  };

  const theme = fieldTheme[survey.field] || fieldTheme.PRIBADI;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dcm")} className="rounded-xl hover:bg-gray-100/80">
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${theme.headerGradient} text-white shadow-md shadow-gray-200/50`}>
              {cfg.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{survey.title}</h2>
              <p className="text-xs text-gray-400">{survey.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== WELCOME MESSAGE ===== */}
      {currentQuestion === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-5"
        >
          <div className={`rounded-2xl border ${theme.welcomeBorder} bg-gradient-to-br ${theme.welcomeGradient} overflow-hidden shadow-sm`}>
            {/* Top accent line */}
            <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
            <div className="p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-800">Selamat Datang di {cfg.label} Kelas {survey.grade}</h3>
              </div>
              <div className="space-y-2.5 text-[13px] text-gray-600 leading-relaxed">
                <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-pink-400 fill-pink-400" /> Halo, Sobat!
                </p>
                <p>
                  Daftar Cek Masalah (DCM) ini dibuat untuk membantumu mengenali kondisi yang sedang kamu alami, baik terkait dirimu sendiri, pergaulan, kegiatan belajar, maupun rencana masa depan.
                </p>
                <p>
                  Cara mengisinya sangat mudah, kamu cukup meng-klik pada pilihan{" "}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-semibold text-[11px]">IYA</span>{" "}
                  jika pernyataan sesuai, atau{" "}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-semibold text-[11px]">TIDAK</span>{" "}
                  jika tidak sesuai.
                </p>
                <p>
                  Tidak ada jawaban <strong className="text-gray-800">BENAR</strong> atau <strong className="text-gray-800">SALAH</strong>, jadi silakan jawab dengan jujur sesuai apa yang kamu rasakan dan alami.
                </p>
                <p>
                  Jawabanmu akan membantu Guru BK memberikan bimbingan yang tepat dan bermanfaat untukmu.
                </p>
                <div className="flex items-center gap-1 pt-1">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <p className={`font-semibold ${theme.accent}`}>Terima kasih atas kejujuran dan partisipasimu!</p>
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== PROGRESS BAR ===== */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[13px] text-gray-400 font-medium">
            Pernyataan <span className="text-gray-700 font-semibold">{currentQuestion + 1}</span> dari {questions.length}
          </span>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${theme.gradientSoft} ${theme.accentSoft}`}>
            {Math.round(progress)}% selesai
          </span>
        </div>
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${theme.progressGradient} rounded-full`}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          {/* Glossy overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent rounded-full" />
        </div>
      </div>

      {/* ===== QUESTION CARD ===== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="rounded-2xl border border-gray-200/60 bg-white shadow-lg shadow-gray-100/30 overflow-hidden">
            {/* Question number accent strip */}
            <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
            
            {/* Question header */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br ${theme.headerGradient} text-white text-[11px] font-bold shadow-sm`}>
                  {q?.order}
                </span>
                <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Pernyataan</span>
              </div>
              <h3 className="text-[15px] font-semibold leading-relaxed text-gray-800">{q?.text}</h3>
            </div>

            {/* IYA / TIDAK Buttons */}
            <div className="px-5 pb-4">
              <div className="grid grid-cols-2 gap-3">
                {/* IYA Button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => q && setAnswers({ ...answers, [q.id]: "IYA" })}
                  className={`relative p-5 rounded-2xl border-2 transition-all duration-200 text-center group overflow-hidden ${
                    answers[q?.id || ""] === "IYA"
                      ? "border-rose-300 bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100/80 text-rose-600 shadow-md shadow-rose-100/40"
                      : "border-gray-100 bg-white text-gray-500 hover:border-rose-200 hover:bg-rose-50/40"
                  }`}
                >
                  {answers[q?.id || ""] === "IYA" && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="w-5 h-5 rounded-full bg-rose-400 flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </span>
                    </div>
                  )}
                  <div className={`w-12 h-12 mx-auto mb-2.5 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    answers[q?.id || ""] === "IYA"
                      ? "bg-gradient-to-br from-rose-400 to-pink-500 shadow-md shadow-rose-200/50"
                      : "bg-rose-50 group-hover:bg-rose-100/80"
                  }`}>
                    <CheckCircle2 className={`h-6 w-6 transition-all ${
                      answers[q?.id || ""] === "IYA" ? "text-white" : "text-rose-300 group-hover:text-rose-400"
                    }`} />
                  </div>
                  <span className="text-base font-bold">IYA</span>
                  <p className="text-[11px] text-gray-400 mt-1">Ya, saya mengalami</p>
                </motion.button>

                {/* TIDAK Button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => q && setAnswers({ ...answers, [q.id]: "TIDAK" })}
                  className={`relative p-5 rounded-2xl border-2 transition-all duration-200 text-center group overflow-hidden ${
                    answers[q?.id || ""] === "TIDAK"
                      ? "border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 text-emerald-600 shadow-md shadow-emerald-100/40"
                      : "border-gray-100 bg-white text-gray-500 hover:border-emerald-200 hover:bg-emerald-50/40"
                  }`}
                >
                  {answers[q?.id || ""] === "TIDAK" && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </span>
                    </div>
                  )}
                  <div className={`w-12 h-12 mx-auto mb-2.5 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    answers[q?.id || ""] === "TIDAK"
                      ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-200/50"
                      : "bg-emerald-50 group-hover:bg-emerald-100/80"
                  }`}>
                    <XCircle className={`h-6 w-6 transition-all ${
                      answers[q?.id || ""] === "TIDAK" ? "text-white" : "text-emerald-300 group-hover:text-emerald-400"
                    }`} />
                  </div>
                  <span className="text-base font-bold">TIDAK</span>
                  <p className="text-[11px] text-gray-400 mt-1">Tidak, saya tidak mengalami</p>
                </motion.button>
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="px-5 pb-4 pt-1 flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="rounded-xl border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-300 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
              </Button>
              {currentQuestion === questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || Object.values(answers).some((a) => !a)}
                  className={`bg-gradient-to-r ${theme.gradient} hover:opacity-90 text-white rounded-xl shadow-md border-0 disabled:opacity-50`}
                >
                  {submitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  Selesai
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                  className={`bg-gradient-to-r ${theme.gradient} hover:opacity-90 text-white rounded-xl shadow-md border-0`}
                >
                  Selanjutnya <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ===== QUESTION NAVIGATOR ===== */}
      <div className="mt-5">
        <div className="rounded-2xl border border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-gray-600">Navigasi Pernyataan</p>
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-300" /> Dijawab
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-200" /> Belum
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, i) => {
                const isCurrent = i === currentQuestion;
                const isAnswered = !!answers[q.id];
                return (
                  <motion.button
                    key={q.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCurrentQuestion(i)}
                    className={`w-9 h-9 rounded-xl text-[11px] font-bold transition-all duration-200 ${
                      isCurrent
                        ? `${theme.activeNav} ${theme.activeNavText} shadow-md scale-110`
                        : isAnswered
                        ? "bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-500 shadow-sm border border-emerald-100/50"
                        : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-500 border border-gray-100/50"
                    }`}
                  >
                    {i + 1}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
