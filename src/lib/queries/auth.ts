import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

// Chủ: L. Phiên đăng nhập + hồ sơ + kiểm quyền.

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    role: data.role,
    isBanned: data.is_banned,
    createdAt: data.created_at,
  };
}

export async function requireRole(roles: Profile["role"][]): Promise<Profile> {
  const profile = await getMyProfile();
  if (!profile || !roles.includes(profile.role)) {
    throw new Error("Không đủ quyền truy cập");
  }
  if (profile.isBanned) {
    throw new Error("Tài khoản của bạn đã bị khóa");
  }
  return profile;
}
