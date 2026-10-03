"use client";

import { useEffect, useState } from "react";
import { Award, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Row = { courseId: string; title: string; status: "none" | "pending" | "approved" };

// Học viên xin cấp chứng chỉ cho khóa đã học (DB kiểm tra điều kiện ĐẠT bài thi).
export function CertificateRequests() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const [{ data: progress }, { data: certs }] = await Promise.all([
          supabase.from("view_course_progress").select("course_id, course_title"),
          supabase.from("certificates").select("course_id, status").eq("user_id", session.user.id),
        ]);
        const certMap = new Map<string, string>((certs ?? []).map((c: any) => [c.course_id, c.status]));
        const list: Row[] = (progress ?? []).map((p: any) => ({
          courseId: p.course_id,
          title: p.course_title,
          status: (certMap.get(p.course_id) as Row["status"]) ?? "none",
        }));
        if (mounted) setRows(list);
      } catch {
        /* bỏ qua */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function request(courseId: string) {
    setBusy(courseId);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("fn_request_certificate", { p_course: courseId });
      if (error) {
        showToast(error.message || "Không gửi được yêu cầu.");
      } else {
        setRows((prev) => prev.map((r) => (r.courseId === courseId ? { ...r, status: "pending" } : r)));
        showToast("Đã gửi yêu cầu cấp chứng chỉ! Chờ giảng viên duyệt.");
      }
    } catch {
      showToast("Không gửi được yêu cầu. Vui lòng thử lại.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <div className="mb-10">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900">
        <Award className="h-5 w-5 text-blue-600" />
        Xin cấp chứng chỉ
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Hoàn thành toàn bộ nội dung và đạt kỳ thi cuối khóa; yêu cầu sẽ được gửi để giảng viên duyệt.
      </p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.courseId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className="text-sm font-semibold text-slate-800">{r.title}</span>
            {r.status === "approved" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Đã có chứng chỉ
              </span>
            ) : r.status === "pending" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <Clock className="h-3.5 w-3.5" /> Chờ giảng viên duyệt
              </span>
            ) : (
              <button
                onClick={() => request(r.courseId)}
                disabled={busy === r.courseId}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy === r.courseId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}
                Xin cấp chứng chỉ
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
