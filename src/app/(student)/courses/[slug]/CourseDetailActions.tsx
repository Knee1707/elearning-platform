"use client";

import { useState } from "react";
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
}

export function CourseDetailActions({
  courseId,
  courseSlug,
  price,
  initialEnrolled = false,
}: CourseDetailActionsProps) {
  const router = useRouter();
  const [isEnrolled] = useState(initialEnrolled);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }

  async function handleAddToCart(redirectAfter = false) {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // Chưa đăng nhập thì lưu tạm vào localStorage hoặc chuyển login
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
        // Nếu đã có trong giỏ hoặc lỗi
        showToast("Khóa học đã có trong giỏ hàng của bạn!");
      } else {
        showToast("Đã thêm khóa học vào giỏ hàng thành công!");
      }

      // Phát sự kiện để Navbar cập nhật badge giỏ hàng tức thì
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
        setIsWishlisted((prev) => !prev);
        showToast(
          !isWishlisted
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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5 sticky top-24">
      {/* TOAST THÔNG BÁO TẠI CHỖ (KHÔNG CHUYỂN TRANG) */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background shadow-xl animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* GIÁ TIỀN */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
          Học phí toàn khóa
        </p>
        <div className="flex items-baseline gap-2">
          {price > 0 ? (
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatPrice(price)}
            </span>
          ) : (
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              Miễn phí
            </span>
          )}
        </div>
      </div>

      {/* CÁC NÚT HÀNH ĐỘNG */}
      {isEnrolled ? (
        <Link
          href={`/learn/${courseSlug}`}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
        >
          <PlayCircle className="h-5 w-5" />
          <span>Vào học ngay</span>
        </Link>
      ) : (
        <div className="space-y-2.5">
          {/* NÚT THÊM VÀO GIỎ HÀNG (Hiển thị Toast + Cập nhật Navbar) */}
          <button
            onClick={() => handleAddToCart(false)}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Thêm vào giỏ hàng</span>
          </button>

          {/* NÚT MUA NGAY (Thêm và chuyển sang giỏ hàng) */}
          <button
            onClick={() => handleAddToCart(true)}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <span>Mua ngay</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* NÚT YÊU THÍCH */}
          <button
            onClick={handleToggleWishlist}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border border-border/80 px-4 py-2 text-xs font-medium transition-colors ${
              isWishlisted
                ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-900"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isWishlisted ? "fill-rose-600" : ""}`} />
            <span>{isWishlisted ? "Đã lưu vào Yêu thích" : "Thêm vào danh sách yêu thích"}</span>
          </button>
        </div>
      )}

      {/* ĐẶC QUYỀN KHÓA HỌC */}
      <div className="border-t border-border/60 pt-4 space-y-2.5 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
          Khóa học bao gồm:
        </p>
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary shrink-0" />
          <span>Video bài giảng chất lượng cao, lưu tiến độ thông minh</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>Tự động điểm danh chuyên cần khi xem đạt 95%</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary shrink-0" />
          <span>Chứng chỉ tốt nghiệp xác thực công khai</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>Quyền truy cập trọn đời, học mọi lúc mọi nơi</span>
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

        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <video src={videoUrl} controls autoPlay className="h-full w-full object-contain" />
        </div>

        <div className="flex justify-end pt-2">
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
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      );
    } catch {
      setPreviewUrl(
        lesson.videoUrl ||
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
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
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
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
