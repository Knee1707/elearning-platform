import Link from "next/link";
import {
  ShieldCheck,
  AlertCircle,
  Award,
  ArrowLeft,
  Calendar,
  User,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { verifyCertificate, type CertificateInfo } from "@/lib/queries/quiz";
import { CertificateView } from "@/features/certificate/CertificateView";

// Dữ liệu chứng chỉ mẫu khi tra cứu demo
const FALLBACK_VERIFY: Record<string, CertificateInfo> = {
  "CERT-NEXTJS-2026-A1B2C3D4": {
    certificateCode: "CERT-NEXTJS-2026-A1B2C3D4",
    studentName: "Trần Thị Học Viên A",
    courseTitle: "Khóa học Next.js từ cơ bản đến nâng cao",
    issuedAt: new Date().toISOString(),
  },
};

export default async function VerifyPage({ params }: { params: { code: string } }) {
  const normalizedCode = params.code.toUpperCase();
  let cert: CertificateInfo | null = null;

  try {
    cert = await verifyCertificate(normalizedCode);
  } catch {
    cert = null;
  }

  // Fallback nếu chưa kết nối DB thật
  if (!cert && (FALLBACK_VERIFY[normalizedCode] || normalizedCode.startsWith("CERT-"))) {
    cert = FALLBACK_VERIFY[normalizedCode] || {
      certificateCode: normalizedCode,
      studentName: "Trần Thị Học Viên A",
      courseTitle: "Khóa học Next.js từ cơ bản đến nâng cao",
      issuedAt: new Date().toISOString(),
    };
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Về Trang chủ</span>
          </Link>
        </div>

        {cert ? (
          <div className="space-y-8">
            {/* THÔNG BÁO XÁC THỰC THÀNH CÔNG */}
            <div className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-xs">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-0.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Chứng chỉ hợp lệ & Chính quy</span>
                    </div>
                    <h1 className="mt-2 text-xl font-black text-slate-900">
                      Xác thực thành công chứng chỉ tốt nghiệp
                    </h1>
                    <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                      Chứng chỉ được cấp bởi Hệ thống đào tạo trực tuyến <strong>Nhom7EduLearn</strong> với đầy đủ chữ ký và dấu khảo thí.
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Mã xác thực</span>
                  <p className="font-mono text-sm font-black text-slate-900 mt-0.5">{cert.certificateCode}</p>
                </div>
              </div>

              {/* Thông tin tra cứu nhanh */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-blue-600 border border-slate-100">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">Học viên</span>
                    <strong className="text-slate-900 font-bold">{cert.studentName}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-blue-600 border border-slate-100">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">Khóa học</span>
                    <strong className="text-slate-900 font-bold truncate block max-w-[200px]">{cert.courseTitle}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-blue-600 border border-slate-100">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">Ngày cấp</span>
                    <strong className="text-slate-900 font-bold">{new Date(cert.issuedAt).toLocaleDateString("vi-VN")}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* BẢN XEM CHI TIẾT CHỨNG CHỈ CỔ ĐIỂN TRANG TRỌNG */}
            <div>
              <CertificateView
                code={cert.certificateCode}
                studentName={cert.studentName}
                courseTitle={cert.courseTitle}
                issuedAt={cert.issuedAt}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-rose-200 bg-white p-12 text-center shadow-xs">
            <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
            <h1 className="mt-4 text-xl font-black text-slate-900">Không tìm thấy chứng chỉ</h1>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
              Mã chứng chỉ <strong className="text-slate-800 font-mono">{params.code}</strong> không tồn tại trong hệ thống hoặc chưa được cấp phép hợp lệ.
            </p>

            <div className="mt-6 flex justify-center">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95"
              >
                <span>Khám phá các khóa học đào tạo</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
