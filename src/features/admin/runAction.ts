import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/queries/auth";
import type { UserRole } from "@/types/domain";

// Chạy 1 server action quản trị rồi quay về trang kèm ?ok= / ?error=
// (trang hiện <FlashMessage>) thay vì ném lỗi ra trang lỗi của Next.
// Quyền được kiểm ở app cho UX; DB kiểm lại trong mọi hàm/policy.

function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Có lỗi xảy ra, vui lòng thử lại.";
}

// Chỉ cho quay về trong cùng trang (chống open redirect qua field ẩn returnTo).
function resolveReturn(path: string, returnTo: FormDataEntryValue | null | undefined): URL {
  const base = new URL(path, "http://local");
  if (typeof returnTo !== "string" || !returnTo.startsWith("/")) return base;
  const target = new URL(returnTo, "http://local");
  return target.pathname.startsWith(path) ? target : base;
}

export async function runAction(options: {
  path: string;
  roles: UserRole[];
  success: string | ((result: unknown) => string);
  task: () => Promise<unknown>;
  returnTo?: FormDataEntryValue | null;
}) {
  let error: string | null = null;
  let message = "";
  try {
    await requireRole(options.roles);
    const result = await options.task();
    message = typeof options.success === "function" ? options.success(result) : options.success;
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath(options.path);

  const url = resolveReturn(options.path, options.returnTo);
  url.searchParams.delete("ok");
  url.searchParams.delete("error");
  url.searchParams.set(error ? "error" : "ok", error ?? message);
  redirect(`${url.pathname}${url.search}`);
}
