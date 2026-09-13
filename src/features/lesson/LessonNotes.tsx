"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, Bookmark, Sparkles, Loader2 } from "lucide-react";
import { getMyNotes, addNote, type LessonNote } from "@/lib/queries/qa";

interface LessonNotesProps {
  lessonId: string;
  currentTime: number;
  onSeek: (seconds: number) => void;
}

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function LessonNotes({ lessonId, currentTime, onSeek }: LessonNotesProps) {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [capturedSeconds, setCapturedSeconds] = useState<number>(0);

  // Tải danh sách ghi chú khi lessonId thay đổi
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function fetchNotes() {
      try {
        const data = await getMyNotes(lessonId);
        if (isMounted) {
          setNotes(data);
        }
      } catch {
        // Dự phòng dữ liệu mẫu nếu DB chưa kết nối
        if (isMounted) {
          const localKey = `demo_notes_${lessonId}`;
          const localSaved = typeof window !== "undefined" ? localStorage.getItem(localKey) : null;
          if (localSaved) {
            try {
              setNotes(JSON.parse(localSaved));
            } catch {
              setNotes([]);
            }
          } else {
            // Mẫu ban đầu
            setNotes([
              {
                id: "mock-note-1",
                lessonId,
                timestampSeconds: 15,
                content: "Kiến trúc tổng quan: Server Components chạy hoàn toàn trên server giúp giảm bundle client.",
                createdAt: new Date().toISOString(),
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

    fetchNotes();

    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  // Cập nhật mốc giây mỗi khi bấm chuẩn bị tạo ghi chú
  function handleCaptureCurrentTime() {
    setCapturedSeconds(Math.floor(currentTime));
  }

  // Thêm ghi chú mới
  async function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    const targetSeconds = capturedSeconds > 0 ? capturedSeconds : Math.floor(currentTime);

    try {
      const newId = await addNote(lessonId, targetSeconds, content.trim());
      const newNote: LessonNote = {
        id: newId,
        lessonId,
        timestampSeconds: targetSeconds,
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      setNotes((prev) => [...prev, newNote].sort((a, b) => a.timestampSeconds - b.timestampSeconds));
      setContent("");
      setCapturedSeconds(0);
    } catch {
      // Lưu local khi offline
      const newNote: LessonNote = {
        id: `local-${Date.now()}`,
        lessonId,
        timestampSeconds: targetSeconds,
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      const updated = [...notes, newNote].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
      setNotes(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem(`demo_notes_${lessonId}`, JSON.stringify(updated));
      }
      setContent("");
      setCapturedSeconds(0);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Form tạo ghi chú */}
      <form onSubmit={handleSubmitNote} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Bookmark className="h-4 w-4 text-blue-600" />
            <span>Tạo ghi chú học tập</span>
          </div>

          <button
            type="button"
            onClick={handleCaptureCurrentTime}
            className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Gắn mốc video: {formatSeconds(capturedSeconds > 0 ? capturedSeconds : currentTime)}</span>
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nhập nội dung ghi nhớ, lưu ý quan trọng tại mốc thời gian này..."
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400 font-medium">
            Mốc ghi nhớ: <strong className="text-slate-800 font-mono">{formatSeconds(capturedSeconds > 0 ? capturedSeconds : currentTime)}</strong>
          </span>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                <span>Lưu ghi chú</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Danh sách ghi chú */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Ghi chú của bạn ({notes.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">Bấm vào mốc thời gian để tua video</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="ml-2 text-xs font-medium">Đang tải danh sách ghi chú...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-xs">
            <Sparkles className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-800">Chưa có ghi chú nào cho bài học này</p>
            <p className="mt-1 text-xs text-slate-400 font-medium">
              Hãy ghi lại những điểm chính hoặc công thức cần nhớ trong lúc xem video nhé!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 transition-all hover:border-blue-300 shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => onSeek(note.timestampSeconds)}
                  className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-mono font-bold text-blue-700 transition-colors hover:bg-blue-600 hover:text-white border border-blue-200/60"
                  title="Tua đến mốc thời gian này"
                >
                  <Clock className="h-3 w-3" />
                  <span>{formatSeconds(note.timestampSeconds)}</span>
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">{note.content}</p>
                  <p className="mt-1.5 text-[11px] text-slate-400 font-medium">
                    {new Date(note.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} •{" "}
                    {new Date(note.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
