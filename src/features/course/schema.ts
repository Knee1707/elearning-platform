import { z } from "zod";

export const courseSchema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề khóa học."),
  description: z.string().trim().min(1, "Vui lòng nhập mô tả khóa học."),
  categoryId: z.string().uuid("Danh mục không hợp lệ.").nullable(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  price: z.coerce.number().min(0, "Giá không được âm."),
  status: z.enum(["draft", "published", "pending", "rejected", "hidden"]).optional(),
  instructorIds: z.array(z.string()).optional(),
});

export type CourseInput = z.infer<typeof courseSchema>;

