"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Trophy,
  FileQuestion,
} from "lucide-react";
import type { Chapter, Lesson } from "@/types/domain";

export interface LessonListProps {
  courseId: string;
  courseTitle?: string;
  courseSlug?: string;
  chapters?: Array<Chapter & { lessons: Lesson[] }>;
  currentLessonId?: string;
  completedLessonIds?: string[];
  onSelectLesson?: (lessonId: string) => void;
  className?: string;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "10 phút";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs} giây`;
  if (secs === 0) return `${mins} phút`;
  return `${mins}p ${secs}s`;
}

export function LessonList({
  courseTitle = "Khóa học",
  courseSlug = "course",
  chapters = [],
  currentLessonId,
  completedLessonIds = [],
  onSelectLesson,
  className = "",
}: LessonListProps) {
  // Trạng thái đóng/mở từng chương (mặc định mở hết để học viên tiện theo dõi)
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

  function toggleChapter(chapterId: string) {
    setCollapsedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  }

  // Thống kê tiến độ toàn khóa
  const allLessons = chapters.flatMap((c) => c.lessons);
  const totalLessons = allLessons.length;
  const completedCount = completedLessonIds.length;
  const progressPercent = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

  return (
    <aside
      className={`flex flex-col border-r border-slate-200 bg-white ${className}`}
      aria-label="Mục lục khóa học"
    >
      {/* Header mục lục */}
      <div className="border-b border-slate-100 p-4 bg-white">
        <Link
          href={`/courses/${courseSlug}`}
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Về trang giới thiệu</span>
        </Link>

        <h2 className="line-clamp-2 text-sm font-black text-slate-900" title={courseTitle}>
          {courseTitle}
        </h2>

        {/* Thanh tiến độ */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500">Tiến độ hoàn thành</span>
            <span className="font-bold text-blue-600 font-mono">
              {completedCount}/{totalLessons} bài ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressPercent === 100 && (
            <div className="flex items-center gap-1.5 pt-1 text-xs font-bold text-emerald-600 animate-in fade-in">
              <Trophy className="h-3.5 w-3.5" />
              <span>Chúc mừng! Bạn đã hoàn thành toàn bộ khóa học.</span>
            </div>
          )}
        </div>
      </div>

      {/* Danh sách chương & bài học */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F8FAFC]">
        {chapters.map((chapter, chapterIndex) => {
          const isCollapsed = Boolean(collapsedChapters[chapter.id]);
          const chapterCompletedCount = chapter.lessons.filter((l) => completedLessonIds.includes(l.id)).length;

          return (
            <div key={chapter.id} className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
              {/* Header chương */}
              <button
                type="button"
                onClick={() => toggleChapter(chapter.id)}
                className="flex w-full items-center justify-between bg-slate-50/80 p-3.5 text-left transition-colors hover:bg-slate-100/70"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    Chương {chapterIndex + 1}: {chapter.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
                    {chapterCompletedCount}/{chapter.lessons.length} bài đã học
                  </p>
                </div>
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                )}
              </button>

              {/* Danh sách bài giảng trong chương */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100">
                  {chapter.lessons.map((lesson) => {
                    const isCurrent = lesson.id === currentLessonId;
                    const isCompleted = completedLessonIds.includes(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => onSelectLesson?.(lesson.id)}
                        className={`flex w-full items-start gap-2.5 p-3 text-left transition-colors ${
                          isCurrent
                            ? "bg-blue-50/80 border-l-4 border-blue-600 text-blue-700 font-bold"
                            : "hover:bg-slate-50/80 text-slate-700"
                        }`}
                      >
                        {/* Trạng thái bài */}
                        <div className="mt-0.5 shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : isCurrent ? (
                            <PlayCircle className="h-4 w-4 text-blue-600 animate-pulse" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-300" />
                          )}
                        </div>

                        {/* Tiêu đề & metadata bài */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs leading-snug line-clamp-2">{lesson.title}</p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                            <span>{formatDuration(lesson.durationSeconds)}</span>
                            {lesson.isFree && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/50">
                                Học thử
                              </span>
                            )}
                            {/* Quiz gợi ý nếu có trong bài */}
                            {lesson.title.toLowerCase().includes("quiz") && (
                              <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/50">
                                <FileQuestion className="h-3 w-3" />
                                Quiz
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
