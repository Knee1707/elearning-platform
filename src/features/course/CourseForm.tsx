// src/features/course/CourseForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { courseSchema, type CourseInput } from "./schema";
import { createCourse, getCategories, type CategoryOption } from "./courseActions";
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

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: { categoryId: null, level: "beginner", price: 0, status: area === "admin" ? "published" : "draft" },
  });

  async function onSubmit(values: CourseInput) {
    setServerError(null);
    try {
      const { id } = await createCourse(values);
      reset();
      router.push(area === "admin" ? `/admin/courses/${id}/edit` : `/studio/${id}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Lỗi không xác định từ máy chủ.";
      setServerError(`Không thể tạo khóa học: ${reason}`);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Tiêu đề khóa học</Label>
        <Input id="title" {...register("title")} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Mô tả</Label>
        <textarea
          id="description"
          rows={5}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Danh mục</Label>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <select
              id="categoryId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
          <p className="text-sm text-destructive">{errors.categoryId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="level">Trình độ</Label>
        <select
          id="level"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...register("level")}
        >
          <option value="beginner">Cơ bản</option>
          <option value="intermediate">Trung cấp</option>
          <option value="advanced">Nâng cao</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Giá (VNĐ)</Label>
        <Input id="price" type="number" min={0} step={1000} {...register("price")} />
        {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
      </div>

      {area === "admin" && (
        <div className="space-y-2">
          <Label htmlFor="status">Trạng thái phát hành</Label>
          <select
            id="status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-medium"
            {...register("status")}
            defaultValue="published"
          >
            <option value="published">Xuất bản ngay (Hiển thị lên Khám phá khóa học)</option>
            <option value="draft">Lưu bản nháp (Chưa công khai)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Khóa học xuất bản sẽ xuất hiện ngay lập tức tại trang Khám phá khóa học và trang chủ.
          </p>
        </div>
      )}

      {serverError && (
        <p className="text-sm text-destructive" role="alert" aria-live="assertive">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Đang tạo..." : area === "admin" ? "Tạo & Cấp khóa học" : "Tạo khóa (nháp)"}
      </Button>
    </form>
  );
}
