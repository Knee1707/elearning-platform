"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Award,
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export interface CertificateQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: {
    code: string;
    courseTitle: string;
    studentName?: string;
    instructorName?: string;
    issuedAt?: string;
  } | null;
}

export function CertificateQrModal({
  isOpen,
  onClose,
  certificate,
}: CertificateQrModalProps) {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !certificate) return null;

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://nhom7edu.vn";
  const verifyUrl = `${origin}/verify/${certificate.code}`;

  const formattedDate = certificate.issuedAt
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(certificate.issuedAt))
    : new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date());

  function handleCopy() {
    navigator.clipboard.writeText(verifyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-200/60 bg-white p-6 shadow-2xl transition-all sm:p-7 animate-in zoom-in-95">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ mã QR"
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tiêu đề & Huy hiệu */}
        <div className="text-center">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>Mã QR Chứng chỉ Chính quy</span>
          </div>

          <h2
            id="qr-modal-title"
            className="mt-3 text-lg font-black text-slate-900 leading-snug"
          >
            Quét mã để xác thực chứng chỉ
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Dùng camera điện thoại hoặc ứng dụng quét mã để tra cứu công khai
          </p>
        </div>

        {/* Khối hiển thị mã QR */}
        <div className="my-5 flex flex-col items-center justify-center">
          <div className="relative rounded-2xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-50/50 to-white p-4 shadow-md">
            <QRCodeSVG
              value={verifyUrl}
              size={210}
              level="H"
              includeMargin
              className="rounded-lg shadow-2xs"
            />
            <div className="mt-2.5 flex items-center justify-center gap-1 text-[11px] font-bold text-amber-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Chứng chỉ đã được xác thực</span>
            </div>
          </div>
        </div>

        {/* Chi tiết chứng nhận */}
        <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Khóa học
            </span>
            <span className="font-bold text-slate-900 line-clamp-1">
              {certificate.courseTitle}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Mã chứng chỉ
              </span>
              <span className="font-mono font-bold text-blue-700">
                {certificate.code}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Ngày cấp
              </span>
              <span className="font-medium text-slate-700">{formattedDate}</span>
            </div>
          </div>

          {certificate.instructorName && (
            <div className="pt-1 border-t border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Giảng viên xác nhận
              </span>
              <span className="font-semibold text-slate-800">
                {certificate.instructorName}
              </span>
            </div>
          )}
        </div>

        {/* Nút thao tác */}
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white py-2.5 px-4 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700">Đã sao chép liên kết</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-500" />
                <span>Sao chép link</span>
              </>
            )}
          </button>

          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 py-2.5 px-5 text-xs font-bold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Mở tra cứu</span>
          </a>
        </div>
      </div>
    </div>
  );
}
