import { NextResponse, type NextRequest } from "next/server";
import { getMyProfile } from "@/lib/queries/auth";
import { getPayouts } from "@/features/super-admin/queries";

// Xuất payout ra CSV (mở được bằng Excel). Route handler KHÔNG đi qua layout
// nên phải tự kiểm quyền super_admin ở đây.

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export async function GET(request: NextRequest) {
  const profile = await getMyProfile();
  if (!profile || profile.role !== "super_admin" || profile.isBanned) {
    return NextResponse.json({ error: "Không đủ quyền truy cập" }, { status: 403 });
  }

  const requested = request.nextUrl.searchParams.get("period") ?? "";
  const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : undefined;
  const payouts = await getPayouts(period);

  const header = ["Kỳ", "Giảng viên", "Doanh thu", "Phí nền tảng", "Thực nhận", "Trạng thái"];
  const rows = payouts.map((p) => [
    p.period,
    p.instructorName ?? "",
    p.gross,
    p.platformFee,
    p.net,
    p.status === "paid" ? "Đã chi trả" : "Nháp",
  ]);
  // BOM để Excel đọc đúng tiếng Việt (UTF-8).
  const csv = "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payout-${period ?? "tat-ca"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
