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
      <form onSubmit={handleSubmitNote} className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Bookmark className="h-4 w-4 text-primary" />
            <span>Tạo ghi chú học tập</span>
          </div>

          <button
            type="button"
            onClick={handleCaptureCurrentTime}
            className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
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
          className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Mốc ghi nhớ: <strong className="text-foreground">{formatSeconds(capturedSeconds > 0 ? capturedSeconds : currentTime)}</strong>
          </span>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
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
          <h3 className="text-sm font-semibold text-foreground">
            Ghi chú của bạn ({notes.length})
          </h3>
          <span className="text-xs text-muted-foreground">Bấm vào mốc thời gian để tua video</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-xs">Đang tải danh sách ghi chú...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium text-foreground">Chưa có ghi chú nào cho bài học này</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hãy ghi lại những điểm chính hoặc công thức cần nhớ trong lúc xem video nhé!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 p-3.5 transition-colors hover:border-primary/40 hover:bg-card"
              >
                <button
                  type="button"
                  onClick={() => onSeek(note.timestampSeconds)}
                  className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  title="Tua đến mốc thời gian này"
                >
                  <Clock className="h-3 w-3" />
                  <span>{formatSeconds(note.timestampSeconds)}</span>
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">{note.content}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
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
