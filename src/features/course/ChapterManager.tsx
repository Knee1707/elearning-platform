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

import { addChapter, addLesson } from "./courseActions";
import { reorderChapters, reorderLessons } from "./reorderActions";
import { uploadLessonVideo } from "./uploadActions";
import { QuizAuthor } from "@/features/quiz/author/QuizAuthor";

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  duration_seconds: number;
  is_free: boolean;
  position: number;
}
interface Chapter {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

const DRAG_HANDLE = "⠿"; // không phụ thuộc icon-library nào — tránh thêm dependency mới.

function DragHandle() {
  return <span aria-hidden className="cursor-grab select-none px-1 text-muted-foreground active:cursor-grabbing">{DRAG_HANDLE}</span>;
}

function SortableLesson({ courseId, lesson }: { courseId: string; lesson: Lesson }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

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
        <span className="text-sm text-muted-foreground">{Math.round(lesson.duration_seconds / 60)} phút</span>
      </div>

      <form action={uploadLessonVideo} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lesson.id} />
        <input type="file" name="file" accept="video/mp4,video/webm,video/quicktime" required className="text-sm" />
        <button className="rounded border px-3 py-1.5 text-sm" type="submit">Tải video lên</button>
        {lesson.video_url && <span className="text-xs text-muted-foreground">Đã có video</span>}
      </form>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm underline">Soạn quiz</summary>
        <div className="mt-3"><QuizAuthor lessonId={lesson.id} /></div>
      </details>
    </li>
  );
}

function SortableChapter({ courseId, chapter }: { courseId: string; chapter: Chapter }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [lessons, setLessons] = useState(chapter.lessons);
  useEffect(() => setLessons(chapter.lessons), [chapter.lessons]);

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
    setLessons(reordered); // cập nhật giao diện ngay, không đợi server.

    startTransition(() => {
      reorderLessons(courseId, reordered.map((l) => l.id)).catch(() => setLessons(chapter.lessons)); // rollback nếu lỗi
    });
  }

  return (
    <article ref={setNodeRef} style={style} className="rounded-lg border p-4">
      <h3 className="flex items-center font-semibold">
        <button type="button" {...attributes} {...listeners} aria-label="Kéo để sắp xếp chương">
          <DragHandle />
        </button>
        {chapter.position}. {chapter.title}
      </h3>

      <DndContext sensors={lessonSensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
        <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <ul className="mt-3 space-y-2">
            {lessons.map((lesson) => (
              <SortableLesson key={lesson.id} courseId={courseId} lesson={lesson} />
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
              <SortableChapter key={chapter.id} courseId={courseId} chapter={chapter} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}