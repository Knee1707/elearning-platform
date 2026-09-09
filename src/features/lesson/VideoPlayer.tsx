"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Lock,
  Loader2,
  Gauge,
  Sparkles,
  Maximize,
  Volume2,
  VolumeX,
} from "lucide-react";
import { updateWatch, savePosition, getLastPosition, markComplete } from "@/lib/queries/progress";

// Fallback video stream chuẩn phục vụ thử nghiệm mượt mà khi URL là placeholder
const FALLBACK_STREAM_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

type PlayerState = "idle" | "loading" | "ready" | "locked";

export interface VideoPlayerProps {
  lessonId: string;
  isFree?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onProgress?: (percent: number) => void;
  seekToTime?: number | null;
  onSeekComplete?: () => void;
}

function formatTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function VideoPlayer({
  lessonId,
  isFree,
  onTimeUpdate,
  onEnded,
  onProgress,
  seekToTime,
  onSeekComplete,
}: VideoPlayerProps) {
  const [state, setState] = useState<PlayerState>("loading");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef<number>(0);
  const lastPercentRef = useRef<number>(0);
  const hasLoadedPositionRef = useRef<boolean>(false);

  // 1. Tải URL video bài giảng với kiểm tra quyền gác
  useEffect(() => {
    let isMounted = true;
    setState("loading");
    setResumeNotice(null);
    hasLoadedPositionRef.current = false;

    async function loadVideo() {
      // Kiểm tra xem có phiên demo login không
      const isDemo = typeof window !== "undefined" && localStorage.getItem("demo_logged_in") === "true";

      try {
        const res = await fetch(`/api/lesson-video/${lessonId}`);
        const data = (await res.json()) as { url: string | null };

        if (!isMounted) return;

        if (data.url) {
          // Nếu URL là placeholder example.com không decode được trong thẻ video
          if (data.url.includes("example.com")) {
            setVideoUrl(FALLBACK_STREAM_URL);
          } else {
            setVideoUrl(data.url);
          }
          setState("ready");
        } else if (isDemo || isFree) {
          // Cho phép học viên demo hoặc bài học thử xem video mẫu
          setVideoUrl(FALLBACK_STREAM_URL);
          setState("ready");
        } else {
          setState("locked");
        }
      } catch {
        if (!isMounted) return;
        if (isDemo || isFree) {
          setVideoUrl(FALLBACK_STREAM_URL);
          setState("ready");
        } else {
          setState("locked");
        }
      }
    }

    loadVideo();

    return () => {
      isMounted = false;
    };
  }, [lessonId, isFree]);

  // 2. Lấy vị trí đã xem lần trước (getLastPosition) để tự động phát tiếp
  async function handleLoadedMetadata() {
    if (!videoRef.current || hasLoadedPositionRef.current) return;
    hasLoadedPositionRef.current = true;

    const dur = videoRef.current.duration;
    setDuration(dur);

    try {
      const lastPos = await getLastPosition(lessonId);
      if (lastPos > 5 && dur > 0 && lastPos < dur - 5 && videoRef.current) {
        videoRef.current.currentTime = lastPos;
        setCurrentTime(lastPos);
        setResumeNotice(`Đã tiếp tục phát từ phút ${formatTime(lastPos)}`);
        setTimeout(() => setResumeNotice(null), 4000);
      }
    } catch {
      // Bỏ qua lỗi nếu chưa có bản ghi tiến độ
    }
  }

  // 3. Tua video khi prop seekToTime thay đổi (từ tab Ghi chú)
  useEffect(() => {
    if (seekToTime != null && videoRef.current) {
      videoRef.current.currentTime = seekToTime;
      setCurrentTime(seekToTime);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      onSeekComplete?.();
    }
  }, [seekToTime, onSeekComplete]);

  // 4. Lắng nghe tiến trình xem và cập nhật thời lượng / tiến độ
  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(current);
    onTimeUpdate?.(current, dur);

    const percent = Math.min(100, Math.round((current / dur) * 100));
    onProgress?.(percent);

    // Gửi tiến độ định kỳ mỗi 5 giây
    const now = Date.now();
    if (now - lastSavedRef.current > 5000) {
      lastSavedRef.current = now;
      savePosition(lessonId, current).catch(() => {});

      if (percent > lastPercentRef.current) {
        lastPercentRef.current = percent;
        updateWatch(lessonId, percent).catch(() => {});
      }

      // Khi đạt >= 95%, tự động hoàn thành bài học và điểm danh
      if (percent >= 95) {
        markComplete(lessonId).catch(() => {});
      }
    }
  }

  // 5. Khi xem xong video
  function handleVideoEnded() {
    setIsPlaying(false);
    markComplete(lessonId).catch(() => {});
    onEnded?.();
  }

  // Điều khiển tua 10 giây
  function handleSkip(seconds: number) {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }

  // Thay đổi tốc độ phát
  function handlePlaybackRateChange(rate: number) {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }

  // Bật/tắt phát
  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      savePosition(lessonId, videoRef.current.currentTime).catch(() => {});
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }

  // Bật/tắt âm thanh
  function toggleMute() {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }

  // Toàn màn hình
  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }

  // Giao diện khi bài học bị khóa (chưa ghi danh)
  if (state === "locked") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200/50">
          <Lock className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-black text-slate-900">Bài học này thuộc nội dung trả phí</h3>
        <p className="mt-1.5 max-w-md text-xs text-slate-500 leading-relaxed font-medium">
          Bạn cần ghi danh khóa học để mở khóa toàn bộ bài giảng chất lượng cao, tài liệu đính kèm và làm bài thi nhận chứng chỉ.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            <span>Mua khóa học ngay</span>
          </Link>
        </div>
      </div>
    );
  }

  // Giao diện khi đang tải
  if (state === "loading") {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="mt-3 text-xs font-semibold text-slate-500">Đang tải bài giảng video...</span>
      </div>
    );
  }

  // Giao diện phát video hoàn chỉnh
  return (
    <div ref={containerRef} className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-xl">
      {/* Thông báo tiếp tục xem */}
      {resumeNotice && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full bg-slate-900/90 border border-white/10 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md animate-in fade-in">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>{resumeNotice}</span>
        </div>
      )}

      {/* Thẻ Video HTML5 */}
      <video
        ref={videoRef}
        src={videoUrl ?? undefined}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          // Tự động chuyển fallback nếu nguồn bị lỗi
          if (videoUrl !== FALLBACK_STREAM_URL) {
            setVideoUrl(FALLBACK_STREAM_URL);
          }
        }}
        controls
        playsInline
        className="aspect-video w-full bg-black object-contain"
      />

      {/* Thanh điều khiển nhanh bên dưới video */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-950/95 px-4 py-2.5 text-xs text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-500 shadow-sm shadow-blue-500/25 active:scale-95"
            aria-label={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => handleSkip(-10)}
            className="flex h-8 items-center gap-1 rounded-full px-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            title="Tua lùi 10 giây"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="text-[11px] font-mono">-10s</span>
          </button>

          <button
            type="button"
            onClick={() => handleSkip(10)}
            className="flex h-8 items-center gap-1 rounded-full px-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            title="Tua tới 10 giây"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span className="text-[11px] font-mono">+10s</span>
          </button>

          <div className="ml-2 text-[11px] font-mono text-white/70">
            <span>{formatTime(currentTime)}</span>
            <span className="mx-1 text-white/40">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tốc độ phát */}
          <div className="flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5 text-white/60" />
            <div className="flex items-center gap-1 rounded-full bg-white/10 p-0.5 text-[11px]">
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handlePlaybackRateChange(rate)}
                  className={`rounded-full px-2 py-0.5 font-bold transition-colors ${
                    playbackRate === rate ? "bg-blue-600 text-white" : "text-white/80 hover:text-white"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Mute */}
          <button
            type="button"
            onClick={toggleMute}
            className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Toàn màn hình"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
