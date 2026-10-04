"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Chủ: M4 · Soạn quiz/đề thi (câu hỏi + đáp án + đánh dấu đúng + pass_score).
// Điền: CRUD questions/options (is_correct chỉ GV thấy) + tạo exams.
interface LessonQuiz { id: string; title: string; passScore: number }
const EMPTY_OPTIONS = ["", "", "", ""];

// Một bài học/video có thể có nhiều quiz độc lập; không dùng chung với kỳ thi cuối khóa.
export function QuizAuthor({ lessonId }: { lessonId: string }) {
  const [quizzes, setQuizzes] = useState<LessonQuiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPassScore, setNewPassScore] = useState(70);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(EMPTY_OPTIONS);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadQuizzes() {
    setIsLoading(true);
    const { data, error } = await createClient().from("quizzes").select("id, title, pass_score").eq("lesson_id", lessonId).eq("is_final", false).order("title");
    if (error) setMessage(`Không thể tải danh sách quiz: ${error.message}`);
    else {
      const items: LessonQuiz[] = (data ?? []).map((item: { id: string; title: string; pass_score: number | null }) => ({ id: String(item.id), title: String(item.title), passScore: Number(item.pass_score ?? 70) }));
      setQuizzes(items);
      setSelectedQuizId((current) => current && items.some((item) => item.id === current) ? current : items[0]?.id ?? null);
    }
    setIsLoading(false);
  }

  useEffect(() => { void loadQuizzes(); }, [lessonId]);

  async function handleCreateQuiz(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    const title = newTitle.trim();
    if (!title) return setMessage("Vui lòng nhập tên quiz.");
    if (!Number.isInteger(newPassScore) || newPassScore < 0 || newPassScore > 100) return setMessage("Điểm đạt phải từ 0 đến 100.");
    setIsCreating(true);
    try {
      const { data, error } = await createClient().from("quizzes").insert({ lesson_id: lessonId, title, pass_score: newPassScore, is_final: false }).select("id, title, pass_score").single();
      if (error) throw error;
      const created = { id: String(data.id), title: String(data.title), passScore: Number(data.pass_score) };
      setQuizzes((current) => [...current, created]); setSelectedQuizId(created.id); setNewTitle(""); setNewPassScore(70);
      setMessage(`Đã tạo quiz “${created.title}”. Hãy nhập câu hỏi bên dưới.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tạo quiz."); }
    finally { setIsCreating(false); }
  }

  async function handleAddQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    if (!selectedQuizId) return setMessage("Hãy tạo hoặc chọn một quiz trước.");
    if (!question.trim() || options.some((option) => !option.trim())) return setMessage("Nhập câu hỏi và đủ 4 đáp án.");
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: lastQuestion } = await supabase.from("questions").select("position").eq("quiz_id", selectedQuizId).order("position", { ascending: false }).limit(1).maybeSingle();
      const { data: questionData, error: questionError } = await supabase.from("questions").insert({ quiz_id: selectedQuizId, content: question.trim(), position: Number(lastQuestion?.position ?? 0) + 1 }).select("id").single();
      if (questionError) throw questionError;
      const { error: optionError } = await supabase.from("options").insert(options.map((content, index) => ({ question_id: questionData.id, content: content.trim(), is_correct: index === correctIndex })));
      if (optionError) throw optionError;
      setQuestion(""); setOptions(EMPTY_OPTIONS); setCorrectIndex(0); setMessage("Đã lưu câu hỏi vào quiz đang chọn.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu câu hỏi."); }
    finally { setIsSaving(false); }
  }

  const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedQuizId);
  return <section className="space-y-4 rounded-lg border border-border p-4">
    <div><h4 className="font-semibold">Quiz của bài học</h4><p className="text-xs text-muted-foreground">Một bài học có thể có nhiều quiz. Mỗi quiz có bộ câu hỏi và đáp án riêng.</p></div>
    <form onSubmit={handleCreateQuiz} className="grid gap-2 rounded bg-muted/30 p-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
      <div className="space-y-1"><Label htmlFor={`new-quiz-title-${lessonId}`}>Tên quiz mới</Label><Input id={`new-quiz-title-${lessonId}`} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Ví dụ: Kiểm tra bài 1" /></div>
      <div className="space-y-1"><Label htmlFor={`new-quiz-score-${lessonId}`}>Điểm đạt (%)</Label><Input id={`new-quiz-score-${lessonId}`} type="number" min={0} max={100} value={newPassScore} onChange={(event) => setNewPassScore(Number(event.target.value))} /></div>
      <Button type="submit" disabled={isCreating}>{isCreating ? "Đang tạo..." : "Tạo quiz"}</Button>
    </form>
    {isLoading ? <p className="text-sm text-muted-foreground">Đang tải quiz...</p> : quizzes.length === 0 ? <p className="text-sm text-muted-foreground">Bài học này chưa có quiz nào.</p> : <div className="space-y-2"><Label htmlFor={`lesson-quiz-select-${lessonId}`}>Quiz đang soạn</Label><select id={`lesson-quiz-select-${lessonId}`} value={selectedQuizId ?? ""} onChange={(event) => setSelectedQuizId(event.target.value)} className="w-full rounded border bg-background px-3 py-2 text-sm">{quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title} · đạt {quiz.passScore}%</option>)}</select></div>}
    {selectedQuiz && <form onSubmit={handleAddQuestion} className="space-y-3 rounded border border-dashed p-3"><p className="text-sm font-medium">Thêm câu hỏi vào: {selectedQuiz.title}</p><div className="space-y-1"><Label>Câu hỏi</Label><Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Nhập nội dung câu hỏi" /></div>{options.map((option, index) => <label key={index} className="flex items-center gap-2 text-sm"><input type="radio" name={`correct-${lessonId}-${selectedQuiz.id}`} checked={correctIndex === index} onChange={() => setCorrectIndex(index)} aria-label={`Đáp án đúng ${index + 1}`} /><Input value={option} placeholder={`Đáp án ${index + 1}`} onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>)}<Button type="submit" disabled={isSaving}>{isSaving ? "Đang lưu..." : "Lưu câu hỏi"}</Button></form>}
    {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
  </section>;
}
