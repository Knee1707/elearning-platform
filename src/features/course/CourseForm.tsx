// src/features/course/CourseForm.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Search, UserCheck, Users, Sparkles, GraduationCap } from "lucide-react";

import { courseSchema, type CourseInput } from "./schema";
import {
  createCourse,
  getCategories,
  getInstructors,
  type CategoryOption,
  type InstructorOption,
} from "./courseActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CourseForm({
  // Khu dùng form: "studio" (giảng viên) hoặc "admin" (quản trị) — quyết định
  // trang chỉnh sửa sẽ chuyển tới sau khi tạo. Dùng prop chuỗi (serializable)
  // thay vì hàm để truyền được từ Server Component.
  area = "studio",
}: {
  area?: "studio" | "admin";
} = {}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<string[]>([]);
  const [instructorSearch, setInstructorSearch] = useState("");

  useEffect(() => {
    Promise.all([getCategories(), getInstructors()])
      .then(([cats, insts]) => {
        setCategories(cats);
        setInstructors(insts);
        // Mặc định chọn giảng viên đầu tiên nếu có
        setSelectedInstructorIds((prev) =>
          prev.length === 0 && insts.length > 0 ? [insts[0].id] : prev,
        );
      })
      .catch(() => {
        setCategories([]);
        setInstructors([]);
      });
  }, []);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      categoryId: null,
      level: "beginner",
      price: 0,
      status: area === "admin" ? "published" : "draft",
      instructorIds: [],
    },
  });

  // Cập nhật giá trị instructorIds vào form khi thay đổi
  const toggleInstructor = (id: string) => {
    setSelectedInstructorIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      setValue("instructorIds", next);
      return next;
    });
  };

  const filteredInstructors = useMemo(() => {
    if (!instructorSearch.trim()) return instructors;
    const term = instructorSearch.toLowerCase();
    return instructors.filter(
      (inst) =>
        inst.fullName.toLowerCase().includes(term) ||
        (inst.role && inst.role.toLowerCase().includes(term)),
    );
  }, [instructors, instructorSearch]);

  async function onSubmit(values: CourseInput) {
    setServerError(null);
    try {
      // Đảm bảo truyền danh sách giảng viên đã chọn
      const submissionValues: CourseInput = {
        ...values,
        instructorIds: selectedInstructorIds,
        status: area === "admin" ? (values.status ?? "published") : "draft",
      };

      const { id } = await createCourse(submissionValues);
      reset();
      router.push(area === "admin" ? `/admin/courses/${id}/edit` : `/studio/${id}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Lỗi không xác định từ máy chủ.";
      setServerError(`Không thể tạo khóa học: ${reason}`);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* THÔNG BÁO TỰ ĐỘNG THÊM VÀ XUẤT BẢN DÀNH CHO ADMIN */}
      {area === "admin" && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 shadow-xs">
          <Sparkles className="mt-0.5 h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-semibold text-emerald-950">
              Chế độ Quản trị: Tự động thêm &amp; xuất bản khóa học ngay
            </p>
            <p className="text-emerald-700 leading-relaxed">
              Khóa học do Admin tạo sẽ được <b>tự động thêm và hiển thị ngay trên hệ thống</b> (không cần qua bước gửi duyệt). Bạn có thể gán <b>1 hoặc nhiều giảng viên</b> cùng tham gia giảng dạy.
            </p>
          </div>
        </div>
      )}

      {/* TIÊU ĐỀ */}
      <div className="space-y-2">
        <Label htmlFor="title" className="font-semibold text-slate-800">
          Tiêu đề khóa học <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Ví dụ: Lập trình Web Fullstack với Next.js & TypeScript"
          className="h-10"
          {...register("title")}
        />
        {errors.title && <p className="text-xs text-destructive font-medium">{errors.title.message}</p>}
      </div>

      {/* MÔ TẢ */}
      <div className="space-y-2">
        <Label htmlFor="description" className="font-semibold text-slate-800">
          Mô tả tổng quan <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="description"
          rows={4}
          placeholder="Giới thiệu nội dung, đối tượng phù hợp và mục tiêu đầu ra của khóa học..."
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive font-medium">{errors.description.message}</p>
        )}
      </div>

      {/* PHÂN CÔNG GIẢNG VIÊN (HỖ TRỢ 1 HOẶC NHIỀU GIẢNG VIÊN) */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              <Label className="font-bold text-slate-900 text-sm">
                Giảng viên phụ trách khóa học
              </Label>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                1 hoặc nhiều giảng viên
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Chọn giảng viên tham gia hướng dẫn khóa học. Giảng viên đầu tiên sẽ là Giảng viên chính.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-600 self-start sm:self-auto">
            Đã chọn: <strong className="text-blue-600">{selectedInstructorIds.length}</strong> giảng viên
          </span>
        </div>

        {/* Ô TÌM KIẾM GIẢNG VIÊN */}
        {instructors.length > 4 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo tên giảng viên..."
              value={instructorSearch}
              onChange={(e) => setInstructorSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        {/* DANH SÁCH GIẢNG VIÊN CÓ THỂ CHỌN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
          {filteredInstructors.length > 0 ? (
            filteredInstructors.map((inst, index) => {
              const isSelected = selectedInstructorIds.includes(inst.id);
              const isPrimary = selectedInstructorIds[0] === inst.id;

              return (
                <div
                  key={inst.id}
                  onClick={() => toggleInstructor(inst.id)}
                  className={`flex items-center justify-between gap-2.5 rounded-lg border p-2.5 text-xs transition-all cursor-pointer select-none ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/80 text-blue-950 font-medium shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {inst.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="truncate font-semibold leading-tight">{inst.fullName}</p>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {inst.role === "instructor"
                          ? "Giảng viên"
                          : inst.role === "super_admin"
                            ? "Super Admin"
                            : "Admin"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPrimary && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                        Chính
                      </span>
                    )}
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="col-span-2 text-xs text-muted-foreground italic py-2">
              {instructorSearch
                ? "Không tìm thấy giảng viên phù hợp."
                : "Đang tải danh sách giảng viên..."}
            </p>
          )}
        </div>
      </div>

      {/* DANH MỤC & TRÌNH ĐỘ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categoryId" className="font-semibold text-slate-800">
            Danh mục
          </Label>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <select
                id="categoryId"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              >
                <option value="">— Chọn danh mục —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.categoryId && (
            <p className="text-xs text-destructive font-medium">{errors.categoryId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="level" className="font-semibold text-slate-800">
            Trình độ
          </Label>
          <select
            id="level"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("level")}
          >
            <option value="beginner">Cơ bản (Beginner)</option>
            <option value="intermediate">Trung cấp (Intermediate)</option>
            <option value="advanced">Nâng cao (Advanced)</option>
          </select>
        </div>
      </div>

      {/* GIÁ KHÓA HỌC */}
      <div className="space-y-2">
        <Label htmlFor="price" className="font-semibold text-slate-800">
          Giá khóa học (VNĐ)
        </Label>
        <div className="relative">
          <Input
            id="price"
            type="number"
            min={0}
            step={1000}
            placeholder="0 (Miễn phí)"
            className="h-10 pr-12"
            {...register("price")}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
            VNĐ
          </span>
        </div>
        {errors.price && <p className="text-xs text-destructive font-medium">{errors.price.message}</p>}
      </div>

      {/* TRẠNG THÁI PHÁT HÀNH DÀNH CHO ADMIN */}
      {area === "admin" && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <Label htmlFor="status" className="font-semibold text-slate-800">
            Trạng thái phát hành khóa học
          </Label>
          <select
            id="status"
            className="flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("status")}
            defaultValue="published"
          >
            <option value="published">
              ✅ Tự động thêm &amp; Xuất bản ngay (Hiển thị ngay trên Khám phá &amp; Trang chủ)
            </option>
            <option value="draft">📁 Lưu bản nháp (Chưa công khai)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Khóa học xuất bản sẽ có trạng thái <b>Đang bán</b> và có hiệu lực ngay lập tức.
          </p>
        </div>
      )}

      {serverError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive" role="alert">
          {serverError}
        </div>
      )}

      {/* NÚT SUBMIT */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto min-w-[200px] h-10 font-bold bg-primary hover:bg-primary/90 cursor-pointer shadow-sm"
        >
          {isSubmitting
            ? "Đang xử lý..."
            : area === "admin"
              ? "Tạo & Thêm khóa học ngay"
              : "Tạo khóa (nháp)"}
        </Button>
      </div>
    </form>
  );
}

