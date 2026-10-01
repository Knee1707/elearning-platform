"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Star } from "lucide-react";
import type { ReviewStatus } from "@/types/domain";
import { submitReviewAction, type ReviewFormState } from "./actions";

interface ReviewFormProps {
  courseId: string;
  coursePath: string;
  existing: { rating: number; comment: string | null; status: ReviewStatus } | null;
}

const STATUS_NOTE: Record<ReviewStatus, { label: string; className: string }> = {
  pending: { label: "Đang chờ duyệt", className: "bg-amber-50 text-amber-700" },
  visible: { label: "Đang hiển thị", className: "bg-emerald-50 text-emerald-700" },
  hidden: { label: "Đã bị ẩn bởi quản trị viên", className: "bg-slate-100 text-slate-600" },
};

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? "Đang gửi…" : isEdit ? "Cập nhật đánh giá" : "Gửi đánh giá"}
    </button>
  );
}

export function ReviewForm({ courseId, coursePath, existing }: ReviewFormProps) {
  const [state, formAction] = useFormState<ReviewFormState, FormData>(submitReviewAction, {});
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const isEdit = Boolean(existing);
  // Sau khi gửi thành công, review luôn quay về trạng thái chờ duyệt.
  const status: ReviewStatus | null = state.ok ? "pending" : existing?.status ?? null;

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="coursePath" value={coursePath} />
      <input type="hidden" name="rating" value={rating || ""} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">{isEdit ? "Đánh giá của bạn" : "Viết đánh giá của bạn"}</p>
        {status && (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_NOTE[status].className}`}>
            {STATUS_NOTE[status].label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1" role="radiogroup" aria-label="Số sao" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} sao`}
            onClick={() => setRating(value)}
            onMouseEnter={() => setHover(value)}
            className="rounded p-0.5"
          >
            <Star className={`h-6 w-6 ${value <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
          </button>
        ))}
      </div>

      <textarea
        name="comment"
        defaultValue={existing?.comment ?? ""}
        maxLength={2000}
        rows={3}
        aria-label="Nhận xét"
        placeholder="Chia sẻ cảm nhận của bạn về nội dung, giảng viên, bài tập…"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
      />

      {state.error && <p role="alert" className="text-xs font-medium text-red-600">{state.error}</p>}
      {state.ok && <p role="status" className="text-xs font-medium text-emerald-700">{state.ok}</p>}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">Sửa đánh giá sẽ cần được duyệt lại.</p>
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}
