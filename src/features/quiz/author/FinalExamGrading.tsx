"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface PendingExamAttempt {
  id: string;
  studentName: string;
  submittedAt: string | null;
  isTimeExpired: boolean;
  answers: Array<{ question: string; answer: string }>;
}

export function FinalExamGrading({ attempts }: { attempts: PendingExamAttempt[] }) {
  const [items, setItems] = useState(attempts);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function grade(attempt: PendingExamAttempt, form: HTMLFormElement) {
    const score = Number(new FormData(form).get("score"));
    const feedback = String(new FormData(form).get("feedback") ?? "");
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      setMessage("Điểm phải là số nguyên từ 0 đến 100.");
      return;
    }
    setSaving(attempt.id);
    setMessage(null);
    const { error } = await createClient().rpc("fn_grade_final_exam_attempt", {
      p_attempt: attempt.id,
      p_score: score,
      p_feedback: feedback || null,
    });
    setSaving(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    setItems((current) => current.filter((item) => item.id !== attempt.id));
    setMessage(`Đã chấm bài của ${attempt.studentName}. Học viên sẽ nhận được thông báo.`);
  }

  if (items.length === 0) return null;

  return (
    <section className="mx-auto mt-6 max-w-5xl rounded-2xl border border-purple-200 bg-purple-50/50 p-5">
      <h2 className="text-lg font-bold text-slate-900">Bài tự luận chờ chấm ({items.length})</h2>
      <p className="mt-1 text-sm text-slate-600">Chấm điểm sau khi xem bài làm. Nếu đạt điểm chuẩn, chứng chỉ sẽ được cấp và học viên nhận thông báo.</p>
      {message && <p className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700">{message}</p>}
      <div className="mt-4 space-y-4">
        {items.map((attempt) => (
          <article key={attempt.id} className="rounded-xl border border-purple-100 bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-semibold">{attempt.studentName}</h3>
              {attempt.isTimeExpired && <span className="text-xs font-semibold text-rose-600">Nộp khi hết giờ</span>}
            </div>
            <div className="mt-3 space-y-3 text-sm">
              {attempt.answers.map((answer, index) => (
                <div key={`${attempt.id}-${index}`} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold">{answer.question}</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{answer.answer || "(Không có nội dung)"}</p>
                </div>
              ))}
            </div>
            <form className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto]" onSubmit={(event) => { event.preventDefault(); void grade(attempt, event.currentTarget); }}>
              <input name="score" type="number" min={0} max={100} required placeholder="Điểm /100" className="rounded-lg border px-3 py-2" />
              <input name="feedback" placeholder="Nhận xét (tùy chọn)" className="rounded-lg border px-3 py-2" />
              <button disabled={saving === attempt.id} className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
                {saving === attempt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Chấm bài
              </button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
