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
  QrCode,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { getMyCertificates, type Certificate } from "@/lib/queries/quiz";
import { CertificateView } from "@/features/certificate/CertificateView";
import { CertificateQrModal } from "@/features/certificate/CertificateQrModal";
import { createClient } from "@/lib/supabase/client";
import { checkAndAutoIssueCertificate } from "@/features/certificate/autoCertificate";

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
  const [selectedQrCert, setSelectedQrCert] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCertificates() {
      setIsLoading(true);
      try {
        const data = await getMyCertificates();
        let list: Certificate[] = data ?? [];

        // Hợp nhất với chứng chỉ được cấp tự động lưu ở local storage (hỗ trợ offline/mock)
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("lms_approved_certificates");
            if (raw) {
              const localList: Certificate[] = JSON.parse(raw);
              const existingIds = new Set(list.map((c) => c.id));
              const existingCourseIds = new Set(list.map((c) => c.courseId));
              for (const loc of localList) {
                if (!existingIds.has(loc.id) && !existingCourseIds.has(loc.courseId)) {
                  list = [loc, ...list];
                  existingIds.add(loc.id);
                  existingCourseIds.add(loc.courseId);
                }
              }
            }
          } catch {}
        }

        // Tự động kiểm tra và cấp chứng chỉ cho các khóa học đã hoàn thành 100%
        try {
          const supabase = createClient();
          const { data: myCourses } = await supabase
            .from("view_course_progress")
            .select("course_id, course_title, progress_percent, total_lessons, completed_lessons");

          if (myCourses && myCourses.length > 0) {
            const existingCourseIds = new Set(list.map((c) => c.courseId));
            for (const c of myCourses) {
              const percent = Number(c.progress_percent || 0);
              const total = Number(c.total_lessons || 0);
              const completed = Number(c.completed_lessons || 0);
              const isFinished = (total > 0 && completed >= total) || percent >= 100;

              if (isFinished && !existingCourseIds.has(c.course_id)) {
                const autoRes = await checkAndAutoIssueCertificate(c.course_id, c.course_title);
                if (autoRes.certificate) {
                  list = [autoRes.certificate, ...list];
                  existingCourseIds.add(c.course_id);
                }
              }
            }
          }
        } catch {}

        if (isMounted) {
          setCertificates(list);
        }
      } catch {
        if (isMounted) {
          setCertificates([]);
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8 sm:px-6">
        {/* Header trang */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/60 px-3 py-1 text-xs font-bold text-amber-700 uppercase tracking-wider">
              <Award className="h-4 w-4" />
              <span>Thành tích & Chứng nhận chính quy</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Chứng chỉ của tôi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
              Vinh danh các chứng chỉ hoàn thành xuất sắc lộ trình đào tạo, có giá trị xác thực công khai toàn cầu.
            </p>
          </div>

          <Link
            href="/my"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Về Khóa học của tôi</span>
          </Link>
        </div>

        {/* Danh sách chứng chỉ đã nhận */}
        <div className="mt-8">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-400 font-medium">
              Đang tải danh sách chứng chỉ của bạn...
            </div>
          ) : certificates.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
              <Award className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-base font-bold text-slate-900">Chưa có chứng chỉ nào</h3>
              <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Hãy hoàn thành 100% nội dung các bài học và vượt qua bài kiểm tra trắc nghiệm để được cấp chứng chỉ!
              </p>
              <div className="mt-6">
                <Link
                  href="/my"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95"
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
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#c5a059]/40 bg-white p-6 shadow-xs transition-all hover:border-[#c5a059] hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 h-16 w-16 overflow-hidden">
                    <div className="absolute transform rotate-45 bg-[#c5a059] text-white text-[9px] font-bold py-0.5 right-[-35px] top-[18px] w-[120px] text-center shadow-sm">
                      VERIFIED
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#aa7c11]">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Chứng nhận chính thức</span>
                    </div>

                    <h3 className="mt-2 text-base font-black text-slate-900 leading-snug line-clamp-2">
                      {cert.courseTitle}
                      {cert.revokedAt && (
                        <span className="ml-2 inline-block rounded-full bg-rose-50 px-2 py-0.5 align-middle text-[10px] font-bold text-rose-600">
                          Đã bị thu hồi
                        </span>
                      )}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 font-medium">
                      Giảng viên ký xác nhận: <strong className="text-slate-800">{cert.instructorName}</strong>
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-blue-600" />
                        <span>{new Date(cert.issuedAt).toLocaleDateString("vi-VN")}</span>
                      </span>
                      <span>•</span>
                      <span className="font-mono font-bold text-slate-700">Mã: {cert.code}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <Link
                      href={`/verify/${cert.code}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      <span>Tra cứu công khai</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedQrCert(cert)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-800 shadow-2xs transition-all active:scale-95 cursor-pointer"
                      >
                        <QrCode className="h-3.5 w-3.5 text-amber-600" />
                        <span>Mã QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCert(cert)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#c5a059] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#c5a059]/25 transition-all hover:bg-[#aa7c11] active:scale-95"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Xem & In chứng chỉ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL HIỂN THỊ MÃ QR */}
        <CertificateQrModal
          isOpen={Boolean(selectedQrCert)}
          onClose={() => setSelectedQrCert(null)}
          certificate={selectedQrCert}
        />

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
