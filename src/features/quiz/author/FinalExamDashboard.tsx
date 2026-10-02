"use client";

import { useState } from "react";
import { FinalExamAuthor } from "./FinalExamAuthor";

type PublishedCourse = { id: string; title: string };

export function FinalExamDashboard({ courses }: { courses: PublishedCourse[] }) {
  const [courseId, setCourseId] = useState("");

  return (
    <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50/40 p-5">
      <div>
        <h2 className="text-xl font-semibold">Tạo kỳ thi cuối khóa</h2>
        <p className="mt-1 text-sm text-muted-foreground">Chọn một khóa học đã publish để tạo kỳ thi và cấp chứng nhận cho học viên đạt điểm.</p>
      </div>
      {courses.length ? (
        <label className="mt-4 block max-w-xl text-sm">
          <span className="mb-1 block font-medium">Khóa học</span>
          <select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2">
            <option value="">-- Chọn khóa học đã publish --</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-amber-300 px-3 py-2 text-sm text-muted-foreground">Chưa có khóa học nào đã publish.</p>
      )}
      {courseId && <FinalExamAuthor courseId={courseId} />}
    </section>
  );
}
