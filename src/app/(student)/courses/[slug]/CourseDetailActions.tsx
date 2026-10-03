"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Heart,
  PlayCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Award,
  Video,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

interface CourseDetailActionsProps {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  price: number;
  initialEnrolled?: boolean;
  // Trạng thái ghi danh của học viên với khóa này: chưa / chờ duyệt / đã vào lớp.
  enrollStatus?: "none" | "pending" | "active";
}

export function CourseDetailActions({
  courseId,
  courseSlug,
  price,
  initialEnrolled = false,
  enrollStatus = "none",
}: CourseDetailActionsProps) {
  const router = useRouter();
  const free = price === 0;
  const [isEnrolled] = useState(initialEnrolled || enrollStatus === "active");
  const [requestState, setRequestState] = useState<"none" | "pending">(
    enrollStatus === "pending" ? "pending" : "none",
  );

  // Khóa miễn phí: học viên xin vào lớp, chờ giảng viên duyệt.
  async function handleRequestEnroll() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("fn_request_enroll", { p_course: courseId });
      if (error) {
        showToast(error.message || "Không gửi được yêu cầu. Vui lòng thử lại.");
      } else {
        setRequestState("pending");
        showToast("Đã gửi yêu cầu vào lớp! Chờ giảng viên duyệt.");
      }
    } catch {
      showToast("Không gửi được yêu cầu. Vui lòng đăng nhập và thử lại.");
    } finally {
      setIsLoading(false);
    }
  }
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tải trạng thái yêu thích từ Database khi mở trang
  useEffect(() => {
    let isMounted = true;
    async function checkWishlist() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          try {
            const list: string[] = JSON.parse(localStorage.getItem("demo_wishlist") || "[]");
            if (list.includes(courseId) && isMounted) {
              setIsWishlisted(true);
            }
          } catch {}
          return;
        }

        const { data, error } = await supabase
          .from("wishlist")
          .select("course_id")
          .eq("user_id", session.user.id)
          .eq("course_id", courseId)
          .maybeSingle();

        if (!error && data && isMounted) {
          setIsWishlisted(true);
        }
      } catch {
        // Dự phòng
      }
    }

    checkWishlist();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }

  async function handleAddToCart(redirectAfter = false) {
    setIsLoading(true);
    try {
      // Lưu vào localStorage demo_cart_items để Navbar và Cart cập nhật số lượng
      try {
        const items: string[] = JSON.parse(localStorage.getItem("demo_cart_items") || "[]");
        if (!items.includes(courseId)) {
          items.push(courseId);
          localStorage.setItem("demo_cart_items", JSON.stringify(items));
        }
      } catch {
        // Bỏ qua lỗi parse
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        showToast("Đã thêm khóa học vào giỏ hàng!");
        window.dispatchEvent(new Event("cart-updated"));
        if (redirectAfter) {
          router.push("/cart");
        }
        setIsLoading(false);
        return;
      }

      // Gọi RPC fn_add_to_cart trong DB
      const { error } = await supabase.rpc("fn_add_to_cart", { p_course: courseId });
      if (error) {
        showToast("Khóa học đã có trong giỏ hàng của bạn!");
      } else {
        showToast("Đã thêm khóa học vào giỏ hàng thành công!");
      }

      window.dispatchEvent(new Event("cart-updated"));

      if (redirectAfter) {
        router.push("/cart");
      }
    } catch {
      showToast("Đã thêm khóa học vào giỏ hàng!");
      window.dispatchEvent(new Event("cart-updated"));
      if (redirectAfter) {
        router.push("/cart");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleWishlist() {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const next = !isWishlisted;
        setIsWishlisted(next);
        try {
          const list: string[] = JSON.parse(localStorage.getItem("demo_wishlist") || "[]");
          const updated = next ? Array.from(new Set([...list, courseId])) : list.filter((id) => id !== courseId);
          localStorage.setItem("demo_wishlist", JSON.stringify(updated));
        } catch {}
        showToast(
          next
            ? "Đã lưu khóa học vào danh sách yêu thích!"
            : "Đã xóa khỏi danh sách yêu thích",
        );
        return;
      }

      const { data, error } = await supabase.rpc("fn_toggle_wishlist", { p_course: courseId });
      if (error) throw error;

      const active = Boolean(data);
      setIsWishlisted(active);
      showToast(
        active
          ? "Đã lưu khóa học vào danh sách yêu thích!"
          : "Đã xóa khỏi danh sách yêu thích",
      );
    } catch {
      setIsWishlisted((prev) => !prev);
      showToast(
        !isWishlisted
          ? "Đã lưu khóa học vào danh sách yêu thích!"
          : "Đã xóa khỏi danh sách yêu thích",
      );
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5 sticky top-24">
      {/* TOAST THÔNG BÁO TẠI CHỖ (KHÔNG CHUYỂN TRANG) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 px-5 py-3.5 text-xs font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* GIÁ TIỀN (PrepEdu Style) */}
      <div className="space-y-1.5 pb-2 border-b border-slate-100">
        <p className="text-[11px] text-slate-400 uppercase font-black tracking-wider">
          Học phí toàn khóa
        </p>
        <div className="flex items-baseline gap-3">
          {price > 0 ? (
            <>
              <span className="text-3xl font-black text-blue-600 font-mono tracking-tight">
                {formatPrice(price)}
              </span>
              <span className="text-sm font-medium text-slate-400 line-through font-mono">
                {formatPrice(Math.round(price * 1.5))}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Giảm 33%
              </span>
            </>
          ) : (
            <span className="text-3xl font-black text-emerald-600 font-mono">
              Miễn phí
            </span>
          )}
        </div>
      </div>

      {/* CÁC NÚT HÀNH ĐỘNG (Pill shapes) */}
      {isEnrolled ? (
        <Link
          href={`/learn/${courseSlug}`}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-95"
        >
          <PlayCircle className="h-5 w-5" />
          <span>Vào không gian học ngay</span>
        </Link>
      ) : free ? (
        <div className="space-y-2.5">
          {/* KHÓA MIỄN PHÍ: XIN VÀO LỚP → CHỜ GIẢNG VIÊN DUYỆT */}
          {requestState === "pending" ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm font-bold text-amber-700">
              <Lock className="h-4 w-4" />
              <span>Đang chờ giảng viên duyệt vào lớp</span>
            </div>
          ) : (
            <button
              onClick={handleRequestEnroll}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Xin vào lớp (miễn phí)</span>
            </button>
          )}
          <p className="text-center text-[11px] text-slate-400">
            Khóa miễn phí cần giảng viên duyệt trước khi vào học.
          </p>

          {/* NÚT YÊU THÍCH */}
          <button
            onClick={handleToggleWishlist}
            className={`flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition-all ${
              isWishlisted
                ? "bg-rose-50 border-rose-200 text-rose-600"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isWishlisted ? "fill-rose-600" : ""}`} />
            <span>{isWishlisted ? "Đã lưu vào Yêu thích" : "Lưu vào danh sách yêu thích"}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* KHÓA TRẢ PHÍ: GIỎ HÀNG / MUA NGAY */}
          <button
            onClick={() => handleAddToCart(false)}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-lg active:scale-95 disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Thêm vào giỏ hàng</span>
          </button>

          <button
            onClick={() => handleAddToCart(true)}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-800 transition-all hover:bg-slate-100 hover:border-slate-300 active:scale-95"
          >
            <span>Mua ngay</span>
            <ArrowRight className="h-4 w-4 text-blue-600" />
          </button>

          <button
            onClick={handleToggleWishlist}
            className={`flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition-all ${
              isWishlisted
                ? "bg-rose-50 border-rose-200 text-rose-600"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isWishlisted ? "fill-rose-600" : ""}`} />
            <span>{isWishlisted ? "Đã lưu vào Yêu thích" : "Lưu vào danh sách yêu thích"}</span>
          </button>
        </div>
      )}

      {/* ĐẶC QUYỀN KHÓA HỌC */}
      <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4 space-y-2.5 text-xs text-slate-600">
        <p className="font-bold text-slate-900 text-xs uppercase tracking-wider">
          Khóa học bao gồm:
        </p>
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-blue-600 shrink-0" />
          <span>Bài giảng thực chiến, tự lưu vị trí xem</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
          <span>Tự động điểm danh chuyên cần khi xem đạt 95%</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500 shrink-0" />
          <span>Chứng chỉ tốt nghiệp xác thực mã QR</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Quyền truy cập vĩnh viễn không giới hạn</span>
        </div>
      </div>
    </div>
  );
}

// Component Modal Học thử video bài giảng miễn phí
export function FreeLessonPreviewModal({
  lessonTitle,
  videoUrl,
  onClose,
}: {
  lessonTitle: string;
  videoUrl: string;
  onClose: () => void;
}) {
  const [currentSrc, setCurrentSrc] = useState(() => {
    // Nếu URL là link placeholder từ seed (example.com), dùng ngay video mẫu chuẩn của MDN
    if (!videoUrl || videoUrl.includes("example.com")) {
      return "https://media.w3.org/2010/05/sintel/trailer.mp4";
    }
    return videoUrl;
  });
  const [hasError, setHasError] = useState(false);

  // Cập nhật lại nguồn video khi URL thật đã tải xong từ API
  // (tránh kẹt ở video mẫu do useState khởi tạo lúc videoUrl còn rỗng/đang loading).
  useEffect(() => {
    if (!videoUrl) return;
    setHasError(false);
    setCurrentSrc(
      videoUrl.includes("example.com")
        ? "https://media.w3.org/2010/05/sintel/trailer.mp4"
        : videoUrl,
    );
  }, [videoUrl]);

  function handleVideoError() {
    setHasError(true);
    // Khi URL bị lỗi định dạng hoặc chặn mạng, chuyển sang video mẫu chuẩn
    setCurrentSrc("https://media.w3.org/2010/05/sintel/trailer.mp4");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 text-xs font-semibold">
              Học thử miễn phí
            </span>
            <h3 className="font-semibold text-base text-foreground truncate max-w-md">
              {lessonTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* THÔNG BÁO NẾU DÙNG VIDEO THỬ NGHIỆM */}
        {(hasError || videoUrl.includes("example.com")) && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              <strong>Lưu ý:</strong> Dữ liệu seed hiện tại dùng link giả lập (<code>example.com</code>). Hệ thống đang phát video thử nghiệm để bạn kiểm tra giao diện.
            </span>
          </div>
        )}

        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black relative flex items-center justify-center">
          <video
            key={currentSrc}
            src={currentSrc}
            controls
            playsInline
            onError={handleVideoError}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground">
            Bấm nút phát trên thanh điều khiển để bắt đầu xem bài học thử.
          </p>
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
          >
            Đóng xem thử
          </button>
        </div>
      </div>
    </div>
  );
}

// Component Mục lục khóa học (Syllabus Accordion + Xem thử)
interface LessonItem {
  id: string;
  title: string;
  durationSeconds: number;
  isFree: boolean;
  videoUrl?: string | null;
}

interface ChapterItem {
  id: string;
  title: string;
  lessons: LessonItem[];
}

export function CourseSyllabus({ chapters }: { chapters: ChapterItem[] }) {
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    chapters.forEach((c, idx) => {
      init[c.id] = idx === 0; // Mặc định mở chương đầu tiên
    });
    return init;
  });

  const [previewLesson, setPreviewLesson] = useState<LessonItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  function toggleChapter(id: string) {
    setOpenChapters((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleOpenPreview(lesson: LessonItem) {
    setPreviewLesson(lesson);
    setLoadingPreview(true);
    try {
      // Gọi API gác quyền /api/lesson-video/[lessonId]
      const res = await fetch(`/api/lesson-video/${lesson.id}`);
      const data = (await res.json()) as { url: string | null };
      setPreviewUrl(
        data.url ||
          lesson.videoUrl ||
          "https://media.w3.org/2010/05/sintel/trailer.mp4",
      );
    } catch {
      setPreviewUrl(
        lesson.videoUrl ||
          "https://media.w3.org/2010/05/sintel/trailer.mp4",
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  return (
    <div className="space-y-3">
      {previewLesson && (
        <FreeLessonPreviewModal
          lessonTitle={previewLesson.title}
          videoUrl={
            loadingPreview
              ? ""
              : previewUrl ||
                "https://media.w3.org/2010/05/sintel/trailer.mp4"
          }
          onClose={() => {
            setPreviewLesson(null);
            setPreviewUrl(null);
          }}
        />
      )}

      {chapters.map((chapter, index) => {
        const isOpen = openChapters[chapter.id];
        const totalDuration = chapter.lessons.reduce((acc, l) => acc + l.durationSeconds, 0);
        const durationMin = Math.ceil(totalDuration / 60);

        return (
          <div key={chapter.id} className="rounded-lg border border-border bg-card overflow-hidden">
            {/* CHAPTER HEADER */}
            <button
              onClick={() => toggleChapter(chapter.id)}
              className="flex w-full items-center justify-between p-4 text-left font-medium hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-foreground">{chapter.title}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{chapter.lessons.length} bài học</span>
                {durationMin > 0 && <span>• {durationMin} phút</span>}
                <span className="text-muted-foreground/60">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {/* LESSONS LIST */}
            {isOpen && (
              <div className="border-t border-border/50 divide-y divide-border/40 bg-muted/10">
                {chapter.lessons.map((lesson) => {
                  const lessonMin = Math.ceil(lesson.durationSeconds / 60);

                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between px-4 py-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 max-w-[70%]">
                        {lesson.isFree ? (
                          <PlayCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                        )}
                        <span className="text-foreground font-medium truncate">
                          {lesson.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {lesson.isFree ? (
                          <button
                            onClick={() => handleOpenPreview(lesson)}
                            className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
                          >
                            <PlayCircle className="h-3 w-3" />
                            <span>Xem thử</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Trả phí</span>
                        )}

                        <span className="text-muted-foreground text-[11px] min-w-10 text-right">
                          {lessonMin > 0 ? `${lessonMin}m` : "10m"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
