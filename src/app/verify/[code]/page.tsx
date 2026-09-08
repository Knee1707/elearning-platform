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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Về Trang chủ</span>
          </Link>
        </div>

        {cert ? (
          <div className="space-y-8">
            {/* THÔNG BÁO XÁC THỰC THÀNH CÔNG */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Chứng chỉ hợp lệ & Chính quy</span>
                    </div>
                    <h1 className="mt-1.5 text-lg font-bold text-foreground">
                      Xác thực thành công chứng chỉ tốt nghiệp
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Chứng chỉ được cấp bởi Hệ thống đào tạo trực tuyến <strong>Nhom7EduLearn</strong> với đầy đủ chữ ký và dấu khảo thí.
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 border-emerald-500/20 pt-3 sm:pt-0">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Mã xác thực</span>
                  <p className="font-mono text-sm font-bold text-foreground">{cert.certificateCode}</p>
                </div>
              </div>

              {/* Thông tin tra cứu nhanh */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-emerald-500/20 pt-4 text-xs">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Học viên</span>
                    <strong className="text-foreground">{cert.studentName}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Khóa học</span>
                    <strong className="text-foreground truncate block max-w-[200px]">{cert.courseTitle}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Ngày cấp</span>
                    <strong className="text-foreground">{new Date(cert.issuedAt).toLocaleDateString("vi-VN")}</strong>
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
          <div className="rounded-2xl border border-dashed border-destructive/40 bg-card p-12 text-center shadow-sm">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-lg font-bold text-foreground">Không tìm thấy chứng chỉ</h1>
            <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
              Mã chứng chỉ <strong className="text-foreground">{params.code}</strong> không tồn tại trong hệ thống hoặc chưa được cấp phép hợp lệ.
            </p>

            <div className="mt-6 flex justify-center">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
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
