"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  ShoppingBag,
  MessageSquare,
  Award,
  Clock,
  Sparkles,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { getMyNotifications, markRead, type Notification } from "@/lib/queries/qa";

const FALLBACK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    type: "system",
    title: "Chúc mừng! Bạn đã được cấp chứng chỉ tốt nghiệp",
    body: "Bạn đã xuất sắc hoàn thành khóa học Next.js từ cơ bản đến nâng cao. Mã chứng chỉ: CERT-NEXTJS-2026-A1B2C3D4.",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "notif-2",
    type: "reply",
    title: "Giảng viên đã giải đáp câu hỏi của bạn",
    body: "Nguyễn Văn Giảng Viên: 'Vì useState là client-side state, cần \"use client\" directive. Server Components không có lifecycle phía browser...'",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: "notif-3",
    type: "purchase",
    title: "Kích hoạt khóa học thành công",
    body: "Đơn hàng đã được thanh toán. Bạn đã chính thức sở hữu toàn quyền truy cập trọn đời vào khóa học Lập trình Web hiện đại.",
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifs() {
      setIsLoading(true);
      try {
        const data = await getMyNotifications();
        if (isMounted) {
          if (data && data.length > 0) {
            setNotifications(data);
          } else {
            setNotifications(FALLBACK_NOTIFICATIONS);
          }
        }
      } catch {
        if (isMounted) {
          setNotifications(FALLBACK_NOTIFICATIONS);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadNotifs();

    return () => {
      isMounted = false;
    };
  }, []);

  // Đánh dấu 1 thông báo đã đọc
  async function handleMarkRead(id: string) {
    try {
      await markRead(id);
    } catch {
      // Tiếp tục cập nhật UI khi offline
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }

  // Đánh dấu tất cả đã đọc
  async function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.isRead);
    for (const n of unread) {
      try {
        await markRead(n.id);
      } catch {
        // Bỏ qua lỗi
      }
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function renderIcon(type: Notification["type"]) {
    switch (type) {
      case "purchase":
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <ShoppingBag className="h-5 w-5" />
          </div>
        );
      case "reply":
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <MessageSquare className="h-5 w-5" />
          </div>
        );
      case "system":
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Award className="h-5 w-5" />
          </div>
        );
      case "reminder":
      default:
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
        );
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-8 sm:px-6">
        {/* Header trang */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Bell className="h-4 w-4" />
              <span>Trung tâm cập nhật</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Thông báo
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Thông tin đơn hàng, phản hồi thảo luận từ giảng viên và cập nhật tiến độ học tập.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
              >
                <CheckCheck className="h-4 w-4 text-primary" />
                <span>Đánh dấu tất cả đã đọc</span>
              </button>
            )}
            <Link
              href="/my"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Về Khóa học của tôi</span>
            </Link>
          </div>
        </div>

        {/* Thanh công cụ lọc */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-xl bg-muted p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                filter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                filter === "unread" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          <span className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `Có ${unreadCount} thông báo mới` : "Đã xem hết thông báo"}
          </span>
        </div>

        {/* Danh sách thông báo */}
        <div className="mt-6 space-y-3">
          {isLoading ? (
            <div className="flex min-h-[250px] items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-xs text-muted-foreground">Đang tải danh sách thông báo...</span>
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-base font-semibold text-foreground">Không có thông báo nào</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {filter === "unread"
                  ? "Bạn đã đọc hết tất cả thông báo rồi!"
                  : "Mọi hoạt động và cập nhật khóa học mới nhất sẽ xuất hiện tại đây."}
              </p>
            </div>
          ) : (
            filteredNotifs.map((item) => (
              <div
                key={item.id}
                onClick={() => !item.isRead && handleMarkRead(item.id)}
                className={`group flex items-start gap-4 rounded-2xl border p-4 transition-all cursor-pointer ${
                  item.isRead
                    ? "border-border/60 bg-card/60 opacity-80 hover:opacity-100 hover:border-border"
                    : "border-primary/40 bg-primary/5 shadow-sm hover:border-primary/60"
                }`}
              >
                {renderIcon(item.type)}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground line-clamp-1">{item.title}</h3>
                    {!item.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary ring-4 ring-primary/20" />
                    )}
                  </div>

                  {item.body && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {item.body}
                    </p>
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} •{" "}
                      {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                    </span>

                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(item.id);
                        }}
                        className="font-medium text-primary hover:underline"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
