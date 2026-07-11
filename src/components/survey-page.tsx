"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useAuth, apiFetch, FIELD_CONFIG, type View, type SurveyData, type QuestionData } from "@/lib/app-shared";

function SurveyPage({ surveyId, onNavigate }: { surveyId: string; onNavigate: (view: View) => void }) {
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
        <Card className="animate-pulse"><CardContent className="p-8"><div className="h-6 bg-gray-200 rounded w-3/4 mb-4" /><div className="h-4 bg-gray-200 rounded w-1/2" /></CardContent></Card>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>Survey tidak ditemukan</p>
        <Button onClick={() => onNavigate("dcm")} className="mt-4 bg-teal-600">Kembali</Button>
      </div>
    );
  }

  const cfg = FIELD_CONFIG[survey.field] || FIELD_CONFIG.PRIBADI;
  const q = questions[currentQuestion];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dcm")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${cfg.color}`}>{cfg.icon}</div>
            <h2 className="text-lg font-bold">{survey.title}</h2>
          </div>
          <p className="text-sm text-gray-500">{survey.description}</p>
        </div>
      </div>

      {/* Welcome Message - shown before first question */}
      {currentQuestion === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Card className={`border-2 ${cfg.bgColor}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${cfg.color}`}>{cfg.icon}</div>
                <h3 className="font-bold text-gray-900">Selamat Datang di {cfg.label} Kelas {survey.grade}</h3>
              </div>
              <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
                <p className="font-semibold">Halo, Siswa Sekalian!</p>
                <p>
                  Daftar Cek Masalah (DCM) ini dibuat untuk membantumu mengenali kondisi yang sedang kamu alami, baik terkait dirimu sendiri, pergaulan, kegiatan belajar, maupun rencana masa depan.
                </p>
                <p>
                  Cara mengisinya sangat mudah, kamu cukup meng-clik pada pilihan <strong>IYA</strong> jika pernyataan tersebut sesuai dengan kondisimu, atau pilihan <strong>TIDAK</strong> jika tidak sesuai.
                </p>
                <p>
                  Tidak ada jawaban <strong>BENAR</strong> atau <strong>SALAH</strong>, jadi silakan jawab dengan jujur sesuai apa yang kamu rasakan dan alami.
                </p>
                <p>
                  Jawabanmu akan membantu Guru BK memberikan bimbingan yang tepat dan bermanfaat untukmu.
                </p>
                <p className="font-medium text-teal-700">Terima kasih atas kejujuran dan partisipasimu!</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Pernyataan {currentQuestion + 1} dari {questions.length}</span>
          <span>{Math.round(progress)}% selesai</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardDescription className="text-xs">Pernyataan #{q?.order}</CardDescription>
              <CardTitle className="text-lg leading-relaxed">{q?.text}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => q && setAnswers({ ...answers, [q.id]: "IYA" })}
                  className={`p-5 rounded-xl border-2 transition-all text-center font-semibold ${
                    answers[q?.id || ""] === "IYA"
                      ? "border-teal-500 bg-teal-50 text-teal-700 shadow-md"
                      : "border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:bg-teal-50/50"
                  }`}
                >
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-lg">IYA</span>
                  <p className="text-xs text-gray-400 mt-1">Ya, saya mengalami</p>
                </button>
                <button
                  onClick={() => q && setAnswers({ ...answers, [q.id]: "TIDAK" })}
                  className={`p-5 rounded-xl border-2 transition-all text-center font-semibold ${
                    answers[q?.id || ""] === "TIDAK"
                      ? "border-rose-500 bg-rose-50 text-rose-700 shadow-md"
                      : "border-gray-200 bg-white text-gray-600 hover:border-rose-300 hover:bg-rose-50/50"
                  }`}
                >
                  <XCircle className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-lg">TIDAK</span>
                  <p className="text-xs text-gray-400 mt-1">Tidak, saya tidak mengalami</p>
                </button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
              </Button>
              {currentQuestion === questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || Object.values(answers).some((a) => !a)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {submitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Selesai
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Selanjutnya <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Question Navigator */}
      <div className="mt-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Navigasi Pernyataan:</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    i === currentQuestion
                      ? "bg-teal-600 text-white shadow-md"
                      : answers[q.id]
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SurveyPage;
