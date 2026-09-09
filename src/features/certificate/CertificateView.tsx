"use client";

import { useState } from "react";
import {
  Award,
  Download,
  Share2,
  Check,
  QrCode,
  ShieldCheck,
  Printer,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export interface CertificateViewProps {
  code: string;
  studentName?: string;
  courseTitle?: string;
  instructorName?: string;
  issuedAt?: string;
}

export function CertificateView({
  code,
  studentName = "Trần Thị Học Viên A",
  courseTitle = "Khóa học Next.js từ cơ bản đến nâng cao",
  instructorName = "Nguyễn Văn Giảng Viên",
  issuedAt = new Date().toISOString(),
}: CertificateViewProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const formattedDate = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(issuedAt));

  const verifyUrl = typeof window !== "undefined" ? `${window.location.origin}/verify/${code}` : `/verify/${code}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(verifyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* THANH CÔNG CỤ XUẤT VÀ CHIA SẺ (ẨN KHI IN) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Mã chứng chỉ chính thức: <strong className="text-slate-900 font-mono">{code}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 active:scale-95"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
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
            <span className="mt-3 font-serif text-xs font-bold tracking-[0.25em] text-[#aa7c11] dark:text-[#d4af37] uppercase">
              Nhom7EduLearn Academy of Technology
            </span>
            <p className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Học viện Đào tạo & Khảo thí Trực tuyến
            </p>
          </div>

          {/* Tiêu đề chứng nhận */}
          <div className="my-6">
            <h1 className="font-serif text-2xl font-extrabold tracking-wider text-neutral-900 sm:text-3xl lg:text-4xl dark:text-neutral-50">
              CHỨNG NHẬN TỐT NGHIỆP
            </h1>
            <p className="font-serif italic text-xs tracking-widest text-[#aa7c11] dark:text-[#d4af37] uppercase mt-1">
              Certificate of Excellence & Completion
            </p>
          </div>

          {/* Lời chứng nhận */}
          <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            Chứng nhận vinh danh học viên:
          </p>

          {/* Tên học viên */}
          <div className="my-4">
            <h2 className="font-serif text-3xl font-extrabold tracking-wide text-[#845b12] sm:text-4xl lg:text-5xl dark:text-[#e5c365]">
              {studentName}
            </h2>
            <div className="mx-auto mt-2 h-0.5 w-48 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent" />
          </div>

          {/* Tên khóa học */}
          <p className="mx-auto max-w-lg text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
            Đã hoàn thành xuất sắc toàn bộ lộ trình bài giảng thực chiến, các bài kiểm tra trắc nghiệm và bảo vệ đồ án chuyên sâu trong khóa học:
          </p>

          <h3 className="my-4 font-serif text-xl font-bold tracking-wide text-neutral-900 sm:text-2xl dark:text-neutral-100">
            &ldquo;{courseTitle}&rdquo;
          </h3>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Cấp ngày <strong className="text-neutral-800 dark:text-neutral-200">{formattedDate}</strong> tại TP. Hồ Chí Minh
          </p>

          {/* Chữ ký, Con dấu vàng & Mã xác thực */}
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-end border-t border-[#c5a059]/30 pt-8">
            {/* Chữ ký Giảng viên */}
            <div className="text-center sm:text-left">
              <div className="font-serif italic text-base text-[#aa7c11] dark:text-[#d4af37]">
                {instructorName}
              </div>
              <div className="mt-1 h-px w-36 bg-neutral-400/40 dark:bg-neutral-600/40 sm:mx-0 mx-auto" />
              <p className="mt-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                {instructorName}
              </p>
              <p className="text-[10px] text-neutral-500">Giảng viên phụ trách</p>
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
              <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[#aa7c11] dark:text-[#d4af37]">
                Con dấu chứng thực
              </span>
            </div>

            {/* Mã QR & Tra cứu công khai */}
            <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
              <div className="flex items-center gap-2 rounded-lg border border-[#c5a059]/40 bg-white/60 dark:bg-black/40 p-2 shadow-sm">
                <QrCode className="h-10 w-10 text-[#aa7c11] dark:text-[#d4af37]" />
                <div className="text-left">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">Mã tra cứu</p>
                  <p className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">{code}</p>
                </div>
              </div>
              <p className="mt-1 text-[10px] text-neutral-500">
                Quét mã hoặc tra cứu tại: <strong className="text-neutral-700 dark:text-neutral-300">/verify/{code}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
