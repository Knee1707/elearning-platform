import { z } from "zod";

export const courseSchema = z.object({
  title: z.string().min(3, "Tiêu đề tối thiểu 3 ký tự"),
  description: z.string().min(10, "Mô tả tối thiểu 10 ký tự"),
  categoryId: z.string().uuid("Chọn danh mục").nullable(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  price: z.coerce.number().min(0, "Giá không được âm"),
});
export type CourseInput = z.infer<typeof courseSchema>;