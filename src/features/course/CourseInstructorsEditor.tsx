// src/features/course/CourseInstructorsEditor.tsx
"use client";

import { useState, useMemo } from "react";
import { GraduationCap, Plus, Trash2, Crown, Check, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateCourseInstructors, type InstructorOption } from "./courseActions";

interface CourseInstructorsEditorProps {
  courseId: string;
  initialInstructorIds: string[];
  allInstructors: InstructorOption[];
}

export function CourseInstructorsEditor({
  courseId,
  initialInstructorIds,
  allInstructors,
}: CourseInstructorsEditorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialInstructorIds.length > 0
      ? initialInstructorIds
      : allInstructors.length > 0
        ? [allInstructors[0].id]
        : [],
  );
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Danh sách giảng viên đã được phân công
  const assignedInstructors = useMemo(() => {
    return selectedIds
      .map((id) => allInstructors.find((inst) => inst.id === id))
      .filter((inst): inst is InstructorOption => Boolean(inst));
  }, [selectedIds, allInstructors]);

  // Danh sách giảng viên chưa được phân công (để chọn thêm)
  const availableToAdd = useMemo(() => {
    const unassigned = allInstructors.filter((inst) => !selectedIds.includes(inst.id));
    if (!search.trim()) return unassigned;
    const term = search.toLowerCase();
    return unassigned.filter((inst) => inst.fullName.toLowerCase().includes(term));
  }, [allInstructors, selectedIds, search]);

  const addInstructor = (id: string) => {
    setFeedback(null);
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeInstructor = (id: string) => {
    setFeedback(null);
    if (selectedIds.length <= 1) {
      setFeedback({ type: "error", text: "Khóa học phải có ít nhất 1 giảng viên phụ trách." });
      return;
    }
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const makePrimary = (id: string) => {
    setFeedback(null);
    setSelectedIds((prev) => [id, ...prev.filter((item) => item !== id)]);
  };

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      setFeedback({ type: "error", text: "Vui lòng chọn ít nhất 1 giảng viên." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await updateCourseInstructors(courseId, selectedIds);
      setFeedback({ type: "success", text: "Đã cập nhật danh sách giảng viên thành công!" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật.";
      setFeedback({ type: "error", text: `Lỗi: ${msg}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Phân công Giảng viên</h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {assignedInstructors.length} giảng viên
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Chỉnh sửa, thêm hoặc xóa giảng viên cùng phụ trách và giảng dạy khóa học này.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          size="sm"
          className="font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          {isSaving ? "Đang lưu..." : "Lưu phân công"}
        </Button>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* DANH SÁCH GIẢNG VIÊN ĐÃ PHÂN CÔNG */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Giảng viên đang phụ trách
        </Label>

        <div className="space-y-2">
          {assignedInstructors.map((inst, index) => {
            const isPrimary = index === 0;
            return (
              <div
                key={inst.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-all ${
                  isPrimary ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isPrimary ? "bg-amber-500 text-white" : "bg-blue-600 text-white"
                    }`}
                  >
                    {inst.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 truncate">{inst.fullName}</span>
                      {isPrimary ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <Crown className="h-3 w-3" /> Giảng viên chính
                        </span>
                      ) : (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          Đồng giảng dạy
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => makePrimary(inst.id)}
                      className="text-xs text-amber-700 hover:text-amber-900 underline font-medium cursor-pointer"
                    >
                      Đặt làm GV chính
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeInstructor(inst.id)}
                    disabled={assignedInstructors.length <= 1}
                    className="inline-flex items-center gap-1 rounded p-1.5 text-xs text-destructive hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title={assignedInstructors.length <= 1 ? "Không thể xóa vì cần ít nhất 1 giảng viên" : "Xóa khỏi khóa học"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* THÊM GIẢNG VIÊN MỚI VÀO KHÓA */}
      {availableToAdd.length > 0 && (
        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Thêm giảng viên khác vào khóa
            </Label>
            {allInstructors.length > 5 && (
              <div className="relative w-48">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm giảng viên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 w-full rounded border border-slate-200 bg-white pl-7 pr-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {availableToAdd.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs hover:border-blue-300 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                    {inst.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-800 truncate">{inst.fullName}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addInstructor(inst.id)}
                  className="h-7 px-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 border-blue-200 cursor-pointer"
                >
                  <Plus className="h-3 w-3 mr-1" /> Thêm
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
