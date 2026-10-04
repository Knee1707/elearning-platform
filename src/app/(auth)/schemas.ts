// app/(auth)/schemas.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/, "Số điện thoại Việt Nam không hợp lệ"),
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
