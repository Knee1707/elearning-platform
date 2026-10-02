"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  addChapter,
  addLesson,
  updateChapterTitle,
  deleteChapter,
  updateLesson,
  deleteLesson,
} from "./courseActions";
import { reorderChapters, reorderLessons } from "./reorderActions";
import { uploadLessonVideo, uploadLessonAttachment, deleteAttachment } from "./uploadActions";
import { QuizAuthor } from "@/features/quiz/author/QuizAuthor";

interface Attachment {
  id: string;
  name: string;
  file_url: string;
}
interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  video_review?: string | null;
  video_review_reason?: string | null;
  duration_seconds: number;
  is_free: boolean;
  position: number;
  attachments: Attachment[];
}

// Nhãn trạng thái duyệt video hiển thị cho giảng viên.
function VideoReviewBadge({ review, reason }: { review?: string | null; reason?: string | null }) {
  if (!review || review === "none") return null;
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Video chờ duyệt", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
    approved: { label: "Video đã duyệt", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    rejected: { label: "Video bị từ chối", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  };
  const m = map[review];
  if (!m) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}>{m.label}</span>
      {review === "rejected" && reason && <span className="text-xs text-muted-foreground">Lý do: {reason}</span>}
    </span>
  );
}
interface Chapter {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

function DragHandle() {
  return (
    <span aria-hidden className="cursor-grab select-none px-1 text-muted-foreground active:cursor-grabbing">
      ⠿
    </span>
  );
}

function AttachmentList({ courseId, lessonId, attachments }: { courseId: string; lessonId: string; attachments: Attachment[] }) {
  const [items, setItems] = useState(attachments);
  useEffect(() => setItems(attachments), [attachments]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(attachmentId: string) {
    if (!window.confirm("Xóa tài liệu này?")) return;
    setDeletingId(attachmentId);
    setError(null);
    try {
      await deleteAttachment(attachmentId, courseId);
      setItems((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa tài liệu.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-2">
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((att) => (
            <li key={att.id} className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1 text-sm">
              <span className="truncate">📄 {att.name}</span>
              <button
                type="button"
                onClick={() => handleDelete(att.id)}
                disabled={deletingId === att.id}
                className="text-xs text-destructive underline"
              >
                {deletingId === att.id ? "Đang xóa..." : "Xóa"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={uploadLessonAttachment} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="file" name="file" accept="application/pdf" required className="text-sm" />
        <button className="rounded border px-3 py-1.5 text-sm" type="submit">Tải tài liệu PDF</button>
      </form>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function SortableLesson({
  courseId,
  lesson,
  onDeleted,
}: {
  courseId: string;
  lesson: Lesson;
  onDeleted: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? "");
  const [durationSeconds, setDurationSeconds] = useState(lesson.duration_seconds);
  const [isFree, setIsFree] = useState(lesson.is_free);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    try {
      await updateLesson(lesson.id, courseId, {
        title,
        videoUrl: videoUrl.trim() || null,
        durationSeconds,
        isFree,
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu bài học.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Xóa bài học "${lesson.title}"? Hành động này không thể hoàn tác.`)) return;
    setIsDeleting(true);
    try {
      await deleteLesson(lesson.id, courseId);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa bài học.");
      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <li ref={setNodeRef} style={style} className="rounded border border-primary/40 bg-muted/40 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên bài học"
            className="rounded border bg-background px-2 py-1.5 text-sm"
          />
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="URL video"
            className="rounded border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            min={0}
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
            placeholder="Thời lượng (giây)"
            className="rounded border bg-background px-2 py-1.5 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
            Cho học thử
          </label>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            {isSaving ? "Đang lưu..." : "Lưu"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setTitle(lesson.title);
              setVideoUrl(lesson.video_url ?? "");
              setDurationSeconds(lesson.duration_seconds);
              setIsFree(lesson.is_free);
              setError(null);
            }}
            className="rounded border px-3 py-1.5 text-sm"
          >
            Hủy
          </button>
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style} className="rounded bg-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          <button type="button" {...attributes} {...listeners} aria-label="Kéo để sắp xếp bài học">
            <DragHandle />
          </button>
          {lesson.position}. {lesson.title}
          {lesson.is_free ? " · Học thử" : ""}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{Math.round(lesson.duration_seconds / 60)} phút</span>
          <button type="button" onClick={() => setIsEditing(true)} className="text-sm underline">
            Sửa
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-sm text-destructive underline"
          >
            {isDeleting ? "Đang xóa..." : "Xóa"}
          </button>
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

      <form action={uploadLessonVideo} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lesson.id} />
        <input type="file" name="file" accept="video/mp4,video/webm,video/quicktime" required className="text-sm" />
        <button className="rounded border px-3 py-1.5 text-sm" type="submit">Tải video lên</button>
        {lesson.video_url && <span className="text-xs text-muted-foreground">Đã có video</span>}
        <VideoReviewBadge review={lesson.video_review} reason={lesson.video_review_reason} />
      </form>

      <AttachmentList courseId={courseId} lessonId={lesson.id} attachments={lesson.attachments} />

      <details className="mt-3">
        <summary className="cursor-pointer text-sm underline">Soạn quiz</summary>
        <div className="mt-3"><QuizAuthor lessonId={lesson.id} /></div>
      </details>
    </li>
  );
}

function SortableChapter({
  courseId,
  chapter,
  onChapterDeleted,
}: {
  courseId: string;
  chapter: Chapter;
  onChapterDeleted: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [lessons, setLessons] = useState(chapter.lessons);
  useEffect(() => setLessons(chapter.lessons), [chapter.lessons]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isDeletingChapter, setIsDeletingChapter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [, startTransition] = useTransition();
  const lessonSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleLessonDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(lessons, oldIndex, newIndex);
    setLessons(reordered);
    startTransition(() => {
      reorderLessons(courseId, reordered.map((l) => l.id)).catch(() => setLessons(chapter.lessons));
    });
  }

  async function handleSaveTitle() {
    setError(null);
    setIsSavingTitle(true);
    try {
      await updateChapterTitle(chapter.id, courseId, title);
      setIsEditingTitle(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu tên chương.");
    } finally {
      setIsSavingTitle(false);
    }
  }

  async function handleDeleteChapter() {
    const count = lessons.length;
    const warning =
      count > 0
        ? `Chương "${chapter.title}" có ${count} bài học. Xóa chương sẽ xóa luôn toàn bộ bài học bên trong. Tiếp tục?`
        : `Xóa chương "${chapter.title}"?`;
    if (!window.confirm(warning)) return;

    setIsDeletingChapter(true);
    try {
      await deleteChapter(chapter.id, courseId);
      onChapterDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa chương.");
      setIsDeletingChapter(false);
    }
  }

  return (
    <article ref={setNodeRef} style={style} className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {isEditingTitle ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded border bg-background px-2 py-1 text-sm font-semibold"
            />
            <button
              type="button"
              onClick={handleSaveTitle}
              disabled={isSavingTitle}
              className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
            >
              {isSavingTitle ? "..." : "Lưu"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditingTitle(false);
                setTitle(chapter.title);
              }}
              className="rounded border px-3 py-1 text-sm"
            >
              Hủy
            </button>
          </div>
        ) : (
          <h3 className="flex items-center font-semibold">
            <button type="button" {...attributes} {...listeners} aria-label="Kéo để sắp xếp chương">
              <DragHandle />
            </button>
            {chapter.position}. {chapter.title}
          </h3>
        )}

        {!isEditingTitle && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsEditingTitle(true)} className="text-sm underline">
              Sửa
            </button>
            <button
              type="button"
              onClick={handleDeleteChapter}
              disabled={isDeletingChapter}
              className="text-sm text-destructive underline"
            >
              {isDeletingChapter ? "Đang xóa..." : "Xóa chương"}
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <DndContext sensors={lessonSensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
        <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <ul className="mt-3 space-y-2">
            {lessons.map((lesson) => (
              <SortableLesson
                key={lesson.id}
                courseId={courseId}
                lesson={lesson}
                onDeleted={() => setLessons((prev) => prev.filter((l) => l.id !== lesson.id))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <form action={addLesson} className="mt-4 grid gap-3 rounded bg-muted/30 p-3 sm:grid-cols-2">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="chapterId" value={chapter.id} />
        <input name="title" required placeholder="Tên bài học" className="rounded border bg-background px-3 py-2" />
        <input name="videoUrl" type="url" placeholder="URL video (tùy chọn)" className="rounded border bg-background px-3 py-2" />
        <input name="durationSeconds" type="number" min="0" placeholder="Thời lượng (giây)" className="rounded border bg-background px-3 py-2" />
        <label className="flex items-center gap-2 text-sm">
          <input name="isFree" type="checkbox" /> Cho học thử
        </label>
        <button className="w-fit rounded border px-3 py-2 text-sm">Thêm bài học</button>
      </form>
    </article>
  );
}

export function ChapterManager({ courseId, initialChapters }: { courseId: string; initialChapters: Chapter[] }) {
  const [chapters, setChapters] = useState(initialChapters);
  useEffect(() => setChapters(initialChapters), [initialChapters]);

  const [, startTransition] = useTransition();
  const chapterSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleChapterDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = chapters.findIndex((c) => c.id === active.id);
    const newIndex = chapters.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(chapters, oldIndex, newIndex);
    setChapters(reordered);
    startTransition(() => {
      reorderChapters(courseId, reordered.map((c) => c.id)).catch(() => setChapters(initialChapters));
    });
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">Chương và bài học</h2>

      <form action={addChapter} className="mt-4 flex gap-3">
        <input type="hidden" name="courseId" value={courseId} />
        <input name="title" required placeholder="Tên chương mới" className="flex-1 rounded border bg-background px-3 py-2" />
        <button className="rounded border px-4 py-2 text-sm">Thêm chương</button>
      </form>

      <DndContext sensors={chapterSensors} collisionDetection={closestCenter} onDragEnd={handleChapterDragEnd}>
        <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="mt-5 space-y-4">
            {chapters.map((chapter) => (
              <SortableChapter
                key={chapter.id}
                courseId={courseId}
                chapter={chapter}
                onChapterDeleted={() => setChapters((prev) => prev.filter((c) => c.id !== chapter.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}