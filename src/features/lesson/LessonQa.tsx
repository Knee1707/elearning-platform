"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send, CornerDownRight, Sparkles, Loader2, UserCheck, ShieldCheck } from "lucide-react";
import { getLessonQa, askQuestion, answerQuestion, type QaQuestion } from "@/lib/queries/qa";

interface LessonQaProps {
  lessonId: string;
}

export function LessonQa({ lessonId }: LessonQaProps) {
  const [questions, setQuestions] = useState<QaQuestion[]>([]);
  const [newQuestionContent, setNewQuestionContent] = useState<string>("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState<boolean>(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);

  // Tải danh sách câu hỏi thảo luận
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function fetchQa() {
      try {
        const data = await getLessonQa(lessonId);
        if (isMounted) {
          setQuestions(data);
        }
      } catch {
        // Dữ liệu mẫu phong phú khi offline hoặc DB chưa kết nối
        if (isMounted) {
          const localKey = `demo_qa_${lessonId}`;
          const localSaved = typeof window !== "undefined" ? localStorage.getItem(localKey) : null;
          if (localSaved) {
            try {
              setQuestions(JSON.parse(localSaved));
            } catch {
              setQuestions([]);
            }
          } else {
            setQuestions([
              {
                id: "mock-q-1",
                lessonId,
                userId: "00000000-0000-0000-0000-000000000002",
                content: "Tại sao Server Components lại không thể dùng được hook useState hay useEffect ạ?",
                createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
                answers: [
                  {
                    id: "mock-a-1",
                    questionId: "mock-q-1",
                    userId: "00000000-0000-0000-0000-000000000001",
                    content:
                      "Chào bạn! Vì useState và useEffect phụ thuộc vào vòng đời của trình duyệt (Client-side lifecycle). Server Components chỉ render một lần duy nhất tại Server và gửi HTML/RSC payload về nên không có state để cập nhật sau đó.",
                    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
                  },
                ],
              },
            ]);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchQa();

    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  // Đăng câu hỏi mới
  async function handleAskQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestionContent.trim()) return;

    setIsSubmittingQuestion(true);
    try {
      const newId = await askQuestion(lessonId, newQuestionContent.trim());
      const newQ: QaQuestion = {
        id: newId,
        lessonId,
        userId: "current-user",
        content: newQuestionContent.trim(),
        createdAt: new Date().toISOString(),
        answers: [],
      };
      setQuestions((prev) => [newQ, ...prev]);
      setNewQuestionContent("");
    } catch {
      // Fallback local
      const newQ: QaQuestion = {
        id: `local-q-${Date.now()}`,
        lessonId,
        userId: "current-user",
        content: newQuestionContent.trim(),
        createdAt: new Date().toISOString(),
        answers: [],
      };
      const updated = [newQ, ...questions];
      setQuestions(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem(`demo_qa_${lessonId}`, JSON.stringify(updated));
      }
      setNewQuestionContent("");
    } finally {
      setIsSubmittingQuestion(false);
    }
  }

  // Gửi câu trả lời
  async function handleAnswer(questionId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setIsSubmittingReply(true);
    try {
      const newAnsId = await answerQuestion(questionId, replyContent.trim());
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id === questionId) {
            return {
              ...q,
              answers: [
                ...(q.answers ?? []),
                {
                  id: newAnsId,
                  questionId,
                  userId: "current-user",
                  content: replyContent.trim(),
                  createdAt: new Date().toISOString(),
                },
              ],
            };
          }
          return q;
        }),
      );
      setReplyContent("");
      setReplyingToId(null);
    } catch {
      // Fallback local
      const newAnswers = {
        id: `local-a-${Date.now()}`,
        questionId,
        userId: "current-user",
        content: replyContent.trim(),
        createdAt: new Date().toISOString(),
      };
      const updated = questions.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            answers: [...(q.answers ?? []), newAnswers],
          };
        }
        return q;
      });
      setQuestions(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem(`demo_qa_${lessonId}`, JSON.stringify(updated));
      }
      setReplyContent("");
      setReplyingToId(null);
    } finally {
      setIsSubmittingReply(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Form đặt câu hỏi */}
      <form onSubmit={handleAskQuestion} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <span>Hỏi đáp & Thảo luận bài học</span>
        </div>

        <textarea
          value={newQuestionContent}
          onChange={(e) => setNewQuestionContent(e.target.value)}
          placeholder="Bạn có câu hỏi hoặc thắc mắc về nội dung bài giảng này? Hãy chia sẻ để giảng viên và các bạn cùng giải đáp nhé..."
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        />

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmittingQuestion || !newQuestionContent.trim()}
            className="flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
          >
            {isSubmittingQuestion ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Đang gửi câu hỏi...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Gửi câu hỏi</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Danh sách câu hỏi và phản hồi */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Các câu hỏi ({questions.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">Mới nhất lên đầu</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="ml-2 text-xs font-medium">Đang tải thảo luận...</span>
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-xs">
            <Sparkles className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-800">Chưa có thảo luận nào trong bài này</p>
            <p className="mt-1 text-xs text-slate-400 font-medium">
              Hãy là người đầu tiên đặt câu hỏi cho giảng viên và cộng đồng nhé!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
                {/* Người hỏi & câu hỏi */}
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 shadow-xs">
                    H
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Học viên</span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(q.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} •{" "}
                        {new Date(q.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">{q.content}</p>
                  </div>
                </div>

                {/* Danh sách câu trả lời */}
                {q.answers && q.answers.length > 0 && (
                  <div className="ml-5 sm:ml-7 space-y-3 border-l-2 border-blue-200 pl-4 pt-1">
                    {q.answers.map((ans) => {
                      const isInstructor = ans.userId === "00000000-0000-0000-0000-000000000001";
                      return (
                        <div key={ans.id} className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                          <div className="flex items-center gap-2">
                            {isInstructor ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                <ShieldCheck className="h-3 w-3" />
                                Giảng viên
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                <UserCheck className="h-3 w-3 text-slate-500" />
                                Bạn học
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(ans.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} •{" "}
                              {new Date(ans.createdAt).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">
                            {ans.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Nút hoặc form trả lời */}
                <div className="pt-1">
                  {replyingToId === q.id ? (
                    <form onSubmit={(e) => handleAnswer(q.id, e)} className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Nhập câu trả lời của bạn để hỗ trợ bạn học..."
                        rows={2}
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyContent("");
                          }}
                          className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200/60 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingReply || !replyContent.trim()}
                          className="flex items-center gap-1 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                          {isSubmittingReply ? "Đang gửi..." : "Gửi trả lời"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReplyingToId(q.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <CornerDownRight className="h-3.5 w-3.5" />
                      <span>Trả lời câu hỏi</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
