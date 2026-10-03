"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FinalExamAuthor({ courseId }: { courseId: string }) {
  const [examId, setExamId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [title, setTitle] = useState("Kỳ thi cuối khóa");
  const [timeLimit, setTimeLimit] = useState(60);
  const [passScore, setPassScore] = useState(70);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("exams")
      .select("id, title, time_limit_minutes, pass_score, quiz_id")
      .eq("course_id", courseId)
      .eq("is_final", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setMessage(error.message);
        if (data) {
          setExamId(String(data.id));
          setQuizId(data.quiz_id ? String(data.quiz_id) : null);
          setTitle(String(data.title));
          setTimeLimit(Number(data.time_limit_minutes));
          setPassScore(Number(data.pass_score));
        }
      });
  }, [courseId]);

  async function createExam() {
    const { data, error } = await createClient().rpc("fn_create_final_exam", {
      p_course: courseId,
      p_title: title,
      p_time_limit: timeLimit,
      p_pass_score: passScore,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    setExamId(String(row.exam_id));
    setQuizId(String(row.quiz_id));
  }

  async function handleAddQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      let currentQuizId = quizId;
      if (!currentQuizId) {
        await createExam();
        const { data } = await createClient().from("exams").select("quiz_id").eq("course_id", courseId).eq("is_final", true).single();
        currentQuizId = String(data?.quiz_id ?? "");
        setQuizId(currentQuizId);
      }
      if (!currentQuizId || !question.trim() || options.some((option) => !option.trim())) {
        setMessage("Hãy nhập câu hỏi và đủ 4 đáp án.");
        return;
      }
      const supabase = createClient();
      const { data: q, error: qError } = await supabase
        .from("questions")
        .insert({ quiz_id: currentQuizId, content: question.trim(), position: Date.now() })
        .select("id")
        .single();
      if (qError) throw qError;
      const { error: oError } = await supabase
        .from("options")
        .insert(options.map((content, index) => ({ question_id: q.id, content: content.trim(), is_correct: index === correctIndex })));
      if (oError) throw oError;
      setQuestion("");
      setOptions(["", "", "", ""]);
      setCorrectIndex(0);
      setMessage("Đã lưu câu hỏi kỳ thi cuối khóa.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu kỳ thi.");
    }
  }

  return (
    <section className="mt-8 space-y-4 rounded-lg border border-amber-200 bg-amber-50/40 p-5">
      <div>
        <h2 className="text-xl font-semibold">Kỳ thi cuối khóa</h2>
        <p className="mt-1 text-sm text-muted-foreground">Học viên chỉ được thi sau khi hoàn thành toàn bộ bài học.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-1"><Label>Tên kỳ thi</Label><Input value={title} disabled={Boolean(examId)} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1"><Label>Thời lượng (phút)</Label><Input type="number" min={1} value={timeLimit} disabled={Boolean(examId)} onChange={(e) => setTimeLimit(Number(e.target.value))} /></div>
        <div className="space-y-1"><Label>Điểm đạt (%)</Label><Input type="number" min={0} max={100} value={passScore} disabled={Boolean(examId)} onChange={(e) => setPassScore(Number(e.target.value))} /></div>
      </div>
      {!examId && <Button type="button" onClick={() => createExam().then(() => setMessage("Đã tạo kỳ thi. Hãy thêm câu hỏi.")).catch((error) => setMessage(error instanceof Error ? error.message : "Không thể tạo kỳ thi."))}>Tạo kỳ thi cuối khóa</Button>}
      {examId && <form onSubmit={handleAddQuestion} className="space-y-3 rounded border bg-background p-4"><Label>Thêm câu hỏi</Label><Input value={question} required placeholder="Nội dung câu hỏi" onChange={(e) => setQuestion(e.target.value)} />{options.map((option, index) => <label key={index} className="flex items-center gap-2"><input type="radio" name={`final-correct-${courseId}`} checked={correctIndex === index} onChange={() => setCorrectIndex(index)} /><Input value={option} required placeholder={`Đáp án ${index + 1}`} onChange={(e) => setOptions(options.map((item, itemIndex) => itemIndex === index ? e.target.value : item))} /></label>)}<Button type="submit">Lưu câu hỏi</Button></form>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
