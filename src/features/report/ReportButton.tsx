"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Flag } from "lucide-react";
import { submitReportAction, type ReportEntity, type ReportFormState } from "./actions";

interface ReportButtonProps {
  entity: ReportEntity;
  entityId: string;
  label?: string;
  isLoggedIn: boolean;
  /** Đường dẫn quay lại sau khi đăng nhập. */
  loginNext: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "Đang gửi…" : "Gửi báo cáo"}
    </button>
  );
}

export function ReportButton({ entity, entityId, label = "Báo cáo vi phạm", isLoggedIn, loginNext }: ReportButtonProps) {
  const [state, formAction] = useFormState<ReportFormState, FormData>(submitReportAction, {});
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Gửi thành công → đóng form, xóa nội dung, chỉ để lại lời cảm ơn.
  useEffect(() => {
    if (state.ok) {
      setIsOpen(false);
      formRef.current?.reset();
    }
  }, [state]);

  const trigger = (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors hover:text-red-600">
      <Flag className="h-3 w-3" />
      {label}
    </span>
  );

  if (!isLoggedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(loginNext)}`} title="Đăng nhập để báo cáo">
        {trigger}
      </Link>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
        {trigger}
      </button>
      {state.ok && !isOpen && <p className="mt-1 text-[11px] font-medium text-emerald-600">{state.ok}</p>}
      {isOpen && (
        <form ref={formRef} action={formAction} className="mt-2 max-w-sm space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="entityId" value={entityId} />
          <textarea
            name="reason"
            required
            minLength={5}
            maxLength={1000}
            rows={3}
            aria-label="Lý do báo cáo"
            placeholder="Mô tả vi phạm (nội dung sai lệch, spam, xúc phạm, vi phạm bản quyền…)"
            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs focus:border-red-300 focus:outline-none"
          />
          {state.error && <p role="alert" className="text-[11px] font-medium text-red-600">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">
              Hủy
            </button>
            <SubmitButton />
          </div>
        </form>
      )}
    </div>
  );
}
