"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getClassAttendance, type AttendanceRecord } from "@/lib/queries/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Chủ: M4 · Tạo buổi live + xem điểm danh lớp.
// Điền: form tạo live_sessions (title, meet_url, scheduled_at) + bảng getClassAttendance (M2).
export function LiveManager({ courseId }: { courseId: string }) {
  const [title, setTitle] = useState("");
  const [meetUrl, setMeetUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [minDateTime, setMinDateTime] = useState("");

  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    setMinDateTime(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00`);
  }, []);

  const loadAttendance = useCallback(async () => {
    try {
      setAttendance(await getClassAttendance(courseId));
    } catch {
      setMessage("Không thể tải danh sách điểm danh.");
      setIsError(true);
    }
  }, [courseId]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  function handleScheduledAtChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const year = val.split("T", 1)[0]?.split("-", 1)[0] ?? "";

    // datetime-local không hỗ trợ maxLength. Không ghi lại giá trị đã cắt
    // trong onChange vì sẽ làm trình duyệt và React lặp lại khi đang nhập.
    // Bỏ qua lần nhập thứ 5 để giữ nguyên giá trị hợp lệ trước đó.
    if (/^\d{5,}$/.test(year)) return;

    setScheduledAt(val);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsError(false);
    setIsSaving(true);

    if (!scheduledAt) {
      setMessage("Vui lòng chọn thời gian buổi học.");
      setIsError(true);
      setIsSaving(false);
      return;
    }

    // 1. Ràng buộc năm học: chỉ gồm đúng 4 chữ số (1000 - 9999)
    const datePart = scheduledAt.split("T")[0] || "";
    const yearStr = datePart.split("-")[0] || "";
    const yearNum = parseInt(yearStr, 10);
    if (yearStr.length !== 4 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
      setMessage("Năm học chỉ được gồm 4 chữ số (ví dụ: 2026).");
      setIsError(true);
      setIsSaving(false);
      return;
    }

    // 2. Ràng buộc ngày tạo lịch học: phải bằng hoặc lớn hơn ngày hiện tại
    const selectedDate = new Date(scheduledAt);
    if (isNaN(selectedDate.getTime())) {
      setMessage("Thời gian buổi học không hợp lệ.");
      setIsError(true);
      setIsSaving(false);
      return;
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const selectedDateStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();

    if (selectedDateStart < todayStart) {
      setMessage("Ngày tạo lịch học phải bằng hoặc lớn hơn ngày hiện tại.");
      setIsError(true);
      setIsSaving(false);
      return;
    }

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMessage("Vui lòng đăng nhập lại.");
      setIsError(true);
      setIsSaving(false);
      return;
    }
    const { error } = await supabase.from("live_sessions").insert({
      course_id: courseId,
      title,
      meet_url: meetUrl,
      scheduled_at: new Date(scheduledAt).toISOString(),
      created_by: userData.user.id,
    });
    setIsSaving(false);
    if (error) {
      setMessage(error.message);
      setIsError(true);
      return;
    }
    setTitle("");
    setMeetUrl("");
    setScheduledAt("");
    setMessage("Đã tạo buổi học trực tiếp.");
    setIsError(false);
  }

  return (
    <section className="space-y-6 rounded-lg border border-border p-5">
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor={`live-title-${courseId}`}>Tên buổi học</Label><Input id={`live-title-${courseId}`} value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor={`live-url-${courseId}`}>Google Meet URL</Label><Input id={`live-url-${courseId}`} type="url" value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)} required /></div>
        <div className="space-y-2">
          <Label htmlFor={`live-time-${courseId}`}>Thời gian</Label>
          <Input
            id={`live-time-${courseId}`}
            type="datetime-local"
            value={scheduledAt}
            min={minDateTime}
            max="9999-12-31T23:59"
            onChange={handleScheduledAtChange}
            required
          />
        </div>
        <div className="flex items-end"><Button type="submit" disabled={isSaving}>{isSaving ? "Đang tạo..." : "Tạo buổi học"}</Button></div>
      </form>
      {message && <p className={`text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>}
      <div>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-medium">Điểm danh</h3><Button type="button" variant="outline" onClick={loadAttendance}>Tải lại</Button></div>
        {attendance.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có lượt điểm danh.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-left text-muted-foreground"><tr><th className="p-2">Học viên</th><th className="p-2">Nguồn</th><th className="p-2">Buổi/Bài</th><th className="p-2">Thời điểm</th></tr></thead><tbody>{attendance.map((record) => <tr key={record.id} className="border-b"><td className="p-2">{record.studentName}</td><td className="p-2">{record.source === "live" ? "Trực tiếp" : "Video"}</td><td className="p-2">{record.liveSessionTitle ?? record.lessonTitle ?? "—"}</td><td className="p-2">{new Date(record.attendedAt).toLocaleString("vi-VN")}</td></tr>)}</tbody></table></div>}
      </div>
    </section>
  );
}
