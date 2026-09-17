"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Chủ: M4 · Soạn quiz/đề thi (câu hỏi + đáp án + đánh dấu đúng + pass_score).
// Điền: CRUD questions/options (is_correct chỉ GV thấy) + tạo exams.
export function QuizAuthor({ lessonId }: { lessonId: string }) {
  const [quizId, setQuizId] = useState<string | null>(null);
  const [title, setTitle] = useState("Bài kiểm tra");
  const [passScore, setPassScore] = useState(70);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("quizzes").select("id, title, pass_score").eq("lesson_id", lessonId).maybeSingle().then(({ data, error }) => {
      if (error) setMessage(error.message);
      if (data) { setQuizId(String(data.id)); setTitle(String(data.title)); setPassScore(Number(data.pass_score)); }
    });
  }, [lessonId]);

  async function ensureQuiz() {
    const supabase = createClient();
    if (quizId) {
      const { error } = await supabase.from("quizzes").update({ title, pass_score: passScore }).eq("id", quizId);
      if (error) throw error;
      return quizId;
    }
    const { data, error } = await supabase.from("quizzes").insert({ lesson_id: lessonId, title, pass_score: passScore }).select("id").single();
    if (error) throw error;
    const id = String(data.id); setQuizId(id); return id;
  }

  async function handleAddQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    if (!question.trim() || options.some((option) => !option.trim())) { setMessage("Nhập câu hỏi và đủ 4 đáp án."); return; }
    try {
      const id = await ensureQuiz(); const supabase = createClient();
      const { data: questionData, error: questionError } = await supabase.from("questions").insert({ quiz_id: id, content: question, position: Date.now() }).select("id").single();
      if (questionError) throw questionError;
      const { error: optionError } = await supabase.from("options").insert(options.map((content, index) => ({ question_id: questionData.id, content, is_correct: index === correctIndex })));
      if (optionError) throw optionError;
      setQuestion(""); setOptions(["", "", "", ""]); setCorrectIndex(0); setMessage("Đã lưu câu hỏi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu quiz."); }
  }

  return <section className="space-y-4 rounded-lg border border-border p-4"><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor={`quiz-title-${lessonId}`}>Tên quiz</Label><Input id={`quiz-title-${lessonId}`} value={title} onChange={(e) => setTitle(e.target.value)} /></div><div className="space-y-1"><Label htmlFor={`quiz-score-${lessonId}`}>Điểm đạt (%)</Label><Input id={`quiz-score-${lessonId}`} type="number" min={0} max={100} value={passScore} onChange={(e) => setPassScore(Number(e.target.value))} /></div></div><form onSubmit={handleAddQuestion} className="space-y-3"><div className="space-y-1"><Label>Câu hỏi</Label><Input value={question} onChange={(e) => setQuestion(e.target.value)} /></div>{options.map((option, index) => <label key={index} className="flex items-center gap-2 text-sm"><input type="radio" name={`correct-${lessonId}`} checked={correctIndex === index} onChange={() => setCorrectIndex(index)} aria-label={`Đáp án đúng ${index + 1}`} /><Input value={option} placeholder={`Đáp án ${index + 1}`} onChange={(e) => setOptions(options.map((item, itemIndex) => itemIndex === index ? e.target.value : item))} /></label>)}<Button type="submit">Lưu câu hỏi</Button></form>{message && <p className="text-sm text-muted-foreground">{message}</p>}</section>;
}
