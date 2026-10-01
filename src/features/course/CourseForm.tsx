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
  // Nơi chuyển tới sau khi tạo khóa (studio cho giảng viên, /admin/courses cho quản trị).
  editPath = (id: string) => `/studio/${id}`,
}: {
  editPath?: (id: string) => string;
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
    formState: { errors, isSubmitting },
  } = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: { categoryId: null, level: "beginner", price: 0 },
  });

  async function onSubmit(values: CourseInput) {
    setServerError(null);
    try {
      const { id } = await createCourse(values);
      router.push(editPath(id));
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Tạo khóa thất bại.");
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

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Đang tạo..." : "Tạo khóa (nháp)"}
      </Button>
    </form>
  );
}