// Các khóa cấu hình hệ thống mà trang Cấu hình cho sửa (khớp seed.sql).
// Khóa khác trong system_setting vẫn hiển thị nhưng chỉ đọc.

interface BaseDef {
  key: string;
  label: string;
  description: string;
}

export type SettingDef =
  | (BaseDef & { type: "number"; min: number; max: number; step: number; defaultValue: number; unit?: string })
  | (BaseDef & { type: "text"; pattern: string; defaultValue: string });

export const SETTING_DEFS: SettingDef[] = [
  {
    key: "platform_fee_percent",
    label: "Phí nền tảng",
    description: "Phần trăm doanh thu nền tảng giữ lại khi tạo payout cho giảng viên.",
    type: "number",
    min: 0,
    max: 100,
    step: 0.5,
    defaultValue: 20,
    unit: "%",
  },
  {
    key: "attendance_video_percent",
    label: "Ngưỡng điểm danh video",
    description: "Học viên xem đến mức này thì được tự động điểm danh bài học.",
    type: "number",
    min: 1,
    max: 100,
    step: 1,
    defaultValue: 95,
    unit: "%",
  },
  {
    key: "default_exam_pass_score",
    label: "Điểm đạt mặc định",
    description: "Điểm đạt mặc định (0–100) cho bài thi mới.",
    type: "number",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
  },
  {
    key: "refund_window_days",
    label: "Hạn yêu cầu hoàn tiền",
    description: "Số ngày kể từ khi mua mà học viên còn được gửi yêu cầu hoàn tiền (0 = tắt hoàn tiền, khóa học không áp dụng hoàn tiền).",
    type: "number",
    min: 0,
    max: 365,
    step: 1,
    defaultValue: 0,
    unit: "ngày",
  },
  {
    key: "currency",
    label: "Đơn vị tiền tệ",
    description: "Mã tiền tệ ISO 4217 gồm 3 chữ in hoa, ví dụ VND.",
    type: "text",
    pattern: "^[A-Z]{3}$",
    defaultValue: "VND",
  },
];

// Kiểm tra + chuyển giá trị form → giá trị jsonb. Trả về lỗi dạng chuỗi nếu sai.
export function parseSettingInput(def: SettingDef, raw: string): { value: number | string } | { error: string } {
  const text = raw.trim();
  if (def.type === "number") {
    const value = Number(text);
    if (text === "" || !Number.isFinite(value)) return { error: `${def.label}: phải là số` };
    if (value < def.min || value > def.max) return { error: `${def.label}: phải trong khoảng ${def.min}–${def.max}` };
    return { value };
  }
  const value = text.toUpperCase();
  if (!new RegExp(def.pattern).test(value)) return { error: `${def.label}: không đúng định dạng` };
  return { value };
}
