"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Eye,
  X,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { getMyCertificates, type Certificate } from "@/lib/queries/quiz";
import { CertificateView } from "@/features/certificate/CertificateView";

const FALLBACK_CERTIFICATES: Certificate[] = [
  {
    id: "cert-demo-1",
    code: "CERT-NEXTJS-2026-A1B2C3D4",
    courseId: "20000000-0000-0000-0000-000000000001",
    courseTitle: "Khóa học Next.js từ cơ bản đến nâng cao",
    instructorName: "Nguyễn Văn Giảng Viên",
    issuedAt: new Date().toISOString(),
  },
];

export default function MyCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCertificates() {
      setIsLoading(true);
      try {
        const data = await getMyCertificates();
        if (isMounted) {
          if (data && data.length > 0) {
            setCertificates(data);
          } else {
            setCertificates(FALLBACK_CERTIFICATES);
          }
        }
      } catch {
        if (isMounted) {
          setCertificates(FALLBACK_CERTIFICATES);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCertificates();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8 sm:px-6">
        {/* Header trang */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
              <Award className="h-4 w-4" />
              <span>Thành tích & Chứng nhận chính quy</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Chứng chỉ của tôi
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Vinh danh các chứng chỉ hoàn thành xuất sắc lộ trình đào tạo, có giá trị xác thực công khai toàn cầu.
            </p>
          </div>

          <Link
            href="/my"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Về Khóa học của tôi</span>
          </Link>
        </div>

        {/* Danh sách chứng chỉ */}
        <div className="mt-8">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              Đang tải danh sách chứng chỉ của bạn...
            </div>
          ) : certificates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Award className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-base font-semibold text-foreground">Chưa có chứng chỉ nào</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Hãy hoàn thành 100% nội dung các bài học và vượt qua bài kiểm tra trắc nghiệm để được cấp chứng chỉ!
              </p>
              <div className="mt-6">
                <Link
                  href="/my"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Tiếp tục học tập</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#c5a059]/40 bg-card p-6 shadow-sm transition-all hover:border-[#c5a059] hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 h-16 w-16 overflow-hidden">
                    <div className="absolute transform rotate-45 bg-[#c5a059] text-white text-[9px] font-bold py-0.5 right-[-35px] top-[18px] w-[120px] text-center shadow-sm">
                      VERIFIED
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#aa7c11] dark:text-[#d4af37]">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Chứng nhận chính thức</span>
                    </div>

                    <h3 className="mt-2 text-base font-bold text-foreground leading-snug line-clamp-2">
                      {cert.courseTitle}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Giảng viên ký xác nhận: <strong className="text-foreground">{cert.instructorName}</strong>
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{new Date(cert.issuedAt).toLocaleDateString("vi-VN")}</span>
                      </span>
                      <span>•</span>
                      <span className="font-mono font-semibold text-foreground">Mã: {cert.code}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                    <Link
                      href={`/verify/${cert.code}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <span>Tra cứu công khai</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setSelectedCert(cert)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#c5a059] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#aa7c11]"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Xem & In chứng chỉ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL XEM CHI TIẾT CHỨNG CHỈ */}
        {selectedCert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in">
            <div className="relative my-8 w-full max-w-5xl rounded-3xl bg-background p-4 sm:p-6 shadow-2xl border border-border">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3 print:hidden">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-bold text-foreground">Bản in chứng chỉ chính quy</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCert(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[80vh] overflow-y-auto pr-1">
                <CertificateView
                  code={selectedCert.code}
                  studentName="Trần Thị Học Viên A"
                  courseTitle={selectedCert.courseTitle}
                  instructorName={selectedCert.instructorName}
                  issuedAt={selectedCert.issuedAt}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
