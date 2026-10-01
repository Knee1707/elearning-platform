import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/queries/auth";
import { isAdminRole } from "@/lib/utils";
import { InstructorNav } from "@/features/instructor/InstructorNav";

// Khu Giảng viên: dashboard + menu riêng, tách khỏi luồng Học viên.
// Chỉ giảng viên (và admin) vào được; học viên/khách bị điều hướng nhẹ nhàng.
export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const profile = await getMyProfile();
  if (!profile) redirect("/login?next=/studio");
  if (profile.role !== "instructor" && !isAdminRole(profile.role)) redirect("/");

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <InstructorNav fullName={profile.fullName} />
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}
