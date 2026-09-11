"use client";

import { useState } from "react";
import {
  Award,
  Share2,
  Check,
  QrCode,
  ShieldCheck,
  Printer,
  Sparkles,
  RotateCw,
} from "lucide-react";

export interface CertificateViewProps {
  code: string;
  studentName?: string;
  courseTitle?: string;
  instructorName?: string;
  issuedAt?: string;
}

interface SignatureStyle {
  id: number;
  name: string;
  fontClass: string;
  rotation: string;
  scale: string;
  color: string;
  strokeColor: string;
  flourishPath: string;
}

const SIGNATURE_STYLES: SignatureStyle[] = [
  {
    id: 0,
    name: "Mực xanh hoàng gia (Royal Blue)",
    fontClass: "font-signature italic font-semibold",
    rotation: "-rotate-6",
    scale: "scale-105",
    color: "text-[#1d4ed8] dark:text-[#60a5fa]",
    strokeColor: "#2563eb",
    flourishPath:
      "M10 25 C 50 15, 90 35, 140 20 C 160 12, 185 18, 170 30 C 150 40, 110 32, 130 22 C 145 15, 190 20, 195 24",
  },
  {
    id: 1,
    name: "Nét bút nghiêng thanh thoát (Classic Navy)",
    fontClass: "font-signature italic font-medium",
    rotation: "-rotate-3",
    scale: "scale-100",
    color: "text-[#1e3a8a] dark:text-[#93c5fd]",
    strokeColor: "#1e3a8a",
    flourishPath: "M8 28 Q 65 38 125 24 T 195 18",
  },
  {
    id: 2,
    name: "Nét lượn phóng khoáng (Midnight Ink)",
    fontClass: "font-signature italic font-bold",
    rotation: "-rotate-5",
    scale: "scale-110",
    color: "text-[#0f172a] dark:text-[#e2e8f0]",
    strokeColor: "#334155",
    flourishPath:
      "M15 22 C 40 32, 70 8, 95 24 C 120 40, 160 10, 185 26 C 150 36, 120 28, 190 32",
  },
  {
    id: 3,
    name: "Chữ ký kép tốc họa (Indigo Pen)",
    fontClass: "font-signature font-bold",
    rotation: "-rotate-4",
    scale: "scale-105",
    color: "text-[#312e81] dark:text-[#a5b4fc]",
    strokeColor: "#3730a3",
    flourishPath:
      "M10 26 C 60 20, 110 32, 190 20 M30 32 C 75 28, 120 34, 175 26",
  },
  {
    id: 4,
    name: "Nét bút lông vút cao (Bronze Seal)",
    fontClass: "font-signature italic font-semibold",
    rotation: "-rotate-2",
    scale: "scale-105",
    color: "text-[#854d0e] dark:text-[#fbbf24]",
    strokeColor: "#b45309",
    flourishPath:
      "M12 24 C 55 35, 100 12, 145 28 C 165 35, 185 15, 192 10",
  },
];

function getInitialSignatureIndex(code: string, instructorName: string): number {
  const seed = `${code}-${instructorName}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % SIGNATURE_STYLES.length;
}

export function CertificateView({
  code,
  studentName = "Trần Thị Học Viên A",
  courseTitle = "Khóa học Next.js từ cơ bản đến nâng cao",
  instructorName = "Nguyễn Văn Giảng Viên",
  issuedAt = new Date().toISOString(),
}: CertificateViewProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [signatureIndex, setSignatureIndex] = useState<number>(() =>
    getInitialSignatureIndex(code, instructorName)
  );

  const currentSignature = SIGNATURE_STYLES[signatureIndex % SIGNATURE_STYLES.length];

  const formattedDate = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(issuedAt));

  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/${code}`
      : `/verify/${code}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(verifyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  function handlePrint() {
    window.print();
  }

  function handleRandomizeSignature() {
    setSignatureIndex((prev) => (prev + 1) % SIGNATURE_STYLES.length);
  }

  return (
    <div className="space-y-6">
      {/* THANH CÔNG CỤ XUẤT VÀ CHIA SẺ (ẨN KHI IN) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>
            Mã chứng chỉ chính thức:{" "}
            <strong className="text-slate-900 font-mono">{code}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 active:scale-95"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            <span>{copied ? "Đã sao chép liên kết!" : "Sao chép link tra cứu"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-95"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>In / Lưu file PDF</span>
          </button>
        </div>
      </div>

      {/* BẢN CHỨNG CHỈ CỔ ĐIỂN TRANG TRỌNG (CLASSIC PRESTIGIOUS CERTIFICATE) */}
      <div
        id="printable-certificate"
        className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border-8 border-[#c5a059] bg-[#fdfbf7] p-3 text-neutral-900 shadow-2xl dark:border-[#967432] dark:bg-[#141311] dark:text-neutral-100 print:m-0 print:w-full print:max-w-none print:border-4 print:shadow-none"
      >
        {/* Khung viền chỉ vàng đôi bên trong */}
        <div className="relative rounded-xl border-2 border-dashed border-[#c5a059]/70 p-6 sm:p-12 text-center">
          {/* Họa tiết 4 góc trang nhã */}
          <div className="absolute top-2 left-2 h-8 w-8 border-t-2 border-l-2 border-[#c5a059]" />
          <div className="absolute top-2 right-2 h-8 w-8 border-t-2 border-r-2 border-[#c5a059]" />
          <div className="absolute bottom-2 left-2 h-8 w-8 border-b-2 border-l-2 border-[#c5a059]" />
          <div className="absolute bottom-2 right-2 h-8 w-8 border-b-2 border-r-2 border-[#c5a059]" />

          {/* Logo học viện & Phù hiệu */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#aa7c11] text-white shadow-md">
              <Award className="h-8 w-8" />
            </div>
            <span className="mt-3 font-serif text-xs font-bold tracking-[0.2em] text-[#aa7c11] dark:text-[#d4af37] uppercase">
              Nhom7EduLearn Academy of Technology
            </span>
            <p className="font-sans text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Học viện Đào tạo &amp; Khảo thí Trực tuyến
            </p>
          </div>

          {/* Tiêu đề chứng nhận */}
          <div className="my-6">
            <h1 className="font-serif text-2xl font-black tracking-normal sm:tracking-wide text-neutral-900 sm:text-3xl lg:text-4xl dark:text-neutral-50 drop-shadow-xs">
              CHỨNG NHẬN TỐT NGHIỆP
            </h1>
            <p className="font-serif italic text-xs tracking-wider text-[#aa7c11] dark:text-[#d4af37] uppercase mt-1">
              Certificate of Excellence &amp; Completion
            </p>
          </div>

          {/* Lời chứng nhận */}
          <p className="font-sans text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            Chứng nhận vinh danh học viên:
          </p>

          {/* Tên học viên */}
          <div className="my-4">
            <h2 className="font-serif text-3xl font-extrabold tracking-normal text-[#845b12] sm:text-4xl lg:text-5xl dark:text-[#e5c365]">
              {studentName}
            </h2>
            <div className="mx-auto mt-2 h-0.5 w-48 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent" />
          </div>

          {/* Tên khóa học */}
          <p className="mx-auto max-w-lg font-sans text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
            Đã hoàn thành xuất sắc toàn bộ lộ trình bài giảng thực chiến, các bài kiểm tra trắc nghiệm và bảo vệ đồ án chuyên sâu trong khóa học:
          </p>

          <h3 className="my-4 font-serif text-xl font-bold tracking-normal text-neutral-900 sm:text-2xl dark:text-neutral-100">
            &ldquo;{courseTitle}&rdquo;
          </h3>

          <p className="font-sans text-xs text-neutral-500 dark:text-neutral-400">
            Cấp ngày{" "}
            <strong className="text-neutral-800 dark:text-neutral-200">
              {formattedDate}
            </strong>{" "}
            tại TP. Hồ Chí Minh
          </p>

          {/* Chữ ký, Con dấu vàng & Mã xác thực */}
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-end border-t border-[#c5a059]/30 pt-8">
            {/* Chữ ký Giảng viên (Viết tay ngẫu nhiên & Nét bút chân thực) */}
            <div className="text-center sm:text-left">
              {/* Nút đổi kiểu chữ ký (Chỉ hiện khi xem web, ẩn khi in) */}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1.5 print:hidden">
                <button
                  type="button"
                  onClick={handleRandomizeSignature}
                  title="Nhấp để đổi sang kiểu chữ ký viết tay khác"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-2xs hover:bg-slate-100 hover:text-blue-600 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                >
                  <RotateCw className="h-2.5 w-2.5" />
                  <span>Đổi chữ ký</span>
                </button>
                <span className="text-[9px] text-slate-400">
                  #{signatureIndex + 1}
                </span>
              </div>

              {/* Vùng hiển thị chữ ký viết tay */}
              <div className="relative mx-auto sm:mx-0 h-16 w-48 flex items-center justify-center sm:justify-start">
                <div
                  className={`transition-all duration-300 transform select-none ${currentSignature.rotation} ${currentSignature.scale}`}
                >
                  <span
                    className={`${currentSignature.fontClass} text-2xl sm:text-3xl ${currentSignature.color} block tracking-normal drop-shadow-xs`}
                  >
                    {instructorName}
                  </span>
                </div>

                {/* Nét bút uốn lượn SVG (Signature Flourish Paraph) */}
                <svg
                  className="absolute bottom-0 left-0 w-full h-8 pointer-events-none opacity-80"
                  viewBox="0 0 200 40"
                  preserveAspectRatio="none"
                >
                  <path
                    d={currentSignature.flourishPath}
                    stroke={currentSignature.strokeColor}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>

              <div className="mt-1 h-px w-44 bg-neutral-400/40 dark:bg-neutral-600/40 sm:mx-0 mx-auto" />

              <p className="mt-1.5 font-sans text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                {instructorName}
              </p>
              <p className="font-sans text-[10px] text-neutral-500">
                Giảng viên phụ trách đào tạo
              </p>

              {/* Huy hiệu xác thực chữ ký điện tử */}
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                <ShieldCheck className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                <span>Chữ ký số đã chứng thực</span>
              </div>
            </div>

            {/* Con dấu vàng danh giá (Gold Medallion Seal) */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-double border-[#fff5cc] bg-gradient-to-tr from-[#966b0e] via-[#d4af37] to-[#f4dc7e] text-neutral-950 shadow-lg">
                <div className="flex flex-col items-center justify-center text-center">
                  <Sparkles className="h-4 w-4 text-amber-950" />
                  <span className="text-[8px] font-black uppercase tracking-tighter text-amber-950">
                    VERIFIED
                  </span>
                  <span className="text-[7px] font-bold text-amber-900">
                    ACCREDITED
                  </span>
                </div>
              </div>
              <span className="mt-1.5 font-serif text-[10px] font-bold uppercase tracking-wider text-[#aa7c11] dark:text-[#d4af37]">
                Con dấu chứng thực
              </span>
            </div>

            {/* Mã QR & Tra cứu công khai */}
            <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
              <div className="flex items-center gap-2 rounded-lg border border-[#c5a059]/40 bg-white/60 dark:bg-black/40 p-2 shadow-sm">
                <QrCode className="h-10 w-10 text-[#aa7c11] dark:text-[#d4af37]" />
                <div className="text-left">
                  <p className="font-sans text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                    Mã tra cứu
                  </p>
                  <p className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {code}
                  </p>
                </div>
              </div>
              <p className="mt-1 font-sans text-[10px] text-neutral-500">
                Quét mã hoặc tra cứu tại:{" "}
                <strong className="text-neutral-700 dark:text-neutral-300 font-mono">
                  /verify/{code}
                </strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
