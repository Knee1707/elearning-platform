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
  Clock,
  VideoOff,
} from "lucide-react";
import { updateWatch, savePosition, getLastPosition, markComplete } from "@/lib/queries/progress";
import { getYouTubeVideoId } from "@/lib/video";

// ── YouTube IFrame Player API (chỉ khai báo phần dùng tới) ───────────────
interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(rate: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
}
interface YouTubeNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (e: { target: YouTubePlayer }) => void;
        onStateChange?: (e: { data: number; target: YouTubePlayer }) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
}
declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youTubeApiPromise: Promise<YouTubeNamespace> | null = null;
function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youTubeApiPromise) {
    youTubeApiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT) resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    });
  }
  return youTubeApiPromise;
}

// Fallback video stream chuẩn phục vụ thử nghiệm mượt mà khi URL là placeholder
const FALLBACK_STREAM_URL = "https://media.w3.org/2010/05/sintel/trailer.mp4";

type PlayerState =
  | "idle"
  | "loading"
  | "ready"
  | "locked"
  | "sequence_locked"
  | "pending_review"
  | "no_video";

export interface VideoPlayerProps {
  lessonId: string;
  isFree?: boolean;
  isLocked?: boolean;
  lockReason?: string;
  onGoToPreviousLesson?: () => void;
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
  isLocked,
  lockReason,
  onGoToPreviousLesson,
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
  // YouTube: player tạo bằng IFrame API, gắn vào ytHostRef (React không quản lý con bên trong).
  const ytHostRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  const youTubeId = videoUrl ? getYouTubeVideoId(videoUrl) : null;

  // 1. Tải URL video bài giảng với kiểm tra quyền gác
  useEffect(() => {
    let isMounted = true;
    if (isLocked) {
      setState("locked");
      return;
    }

    setState("loading");
    setResumeNotice(null);
    hasLoadedPositionRef.current = false;

    async function loadVideo() {
      // Kiểm tra xem có phiên demo login không
      const isDemo =
        typeof window !== "undefined" && localStorage.getItem("demo_logged_in") === "true";

      try {
        const res = await fetch(`/api/lesson-video/${lessonId}`);
        const data = (await res.json()) as { url: string | null; reason?: string };

        if (!isMounted) return;

        if (data.url) {
          // Nếu URL là placeholder example.com không decode được trong thẻ video
          if (data.url.includes("example.com")) {
            setVideoUrl(FALLBACK_STREAM_URL);
          } else {
            setVideoUrl(data.url);
          }
          setState("ready");
        } else if (data.reason === "pending_review" || data.reason === "rejected") {
          setState("pending_review");
        } else if (data.reason === "lesson_locked") {
          // Đã ghi danh nhưng bài chưa mở khóa tuần tự — không bắt mua lại.
          setState("sequence_locked");
        } else if (data.reason === "no_video") {
          setState("no_video");
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
  }, [lessonId, isFree, isLocked]);

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
    if (seekToTime != null && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(seekToTime, true);
      ytPlayerRef.current.playVideo();
      setCurrentTime(seekToTime);
      onSeekComplete?.();
      return;
    }
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
    reportProgress(videoRef.current.currentTime, videoRef.current.duration || 1);
  }

  // Ghi tiến độ dùng chung cho video MP4 (onTimeUpdate) và YouTube (đọc mỗi giây).
  function reportProgress(current: number, dur: number) {
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

  // Effect YouTube chỉ chạy lại khi đổi bài → dùng ref để luôn gọi bản handler mới nhất.
  const reportProgressRef = useRef(reportProgress);
  reportProgressRef.current = reportProgress;
  const handleVideoEndedRef = useRef(handleVideoEnded);
  handleVideoEndedRef.current = handleVideoEnded;

  // 6. Video YouTube: dựng player qua IFrame API, đọc tiến độ mỗi giây để ghi % xem / điểm danh / mở khóa bài sau.
  useEffect(() => {
    const host = ytHostRef.current;
    if (state !== "ready" || !youTubeId || !host) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = undefined;
    };

    (async () => {
      const YT = await loadYouTubeApi();
      let start = 0;
      try {
        const lastPos = await getLastPosition(lessonId);
        if (lastPos > 5) start = Math.floor(lastPos);
      } catch {
        // Bỏ qua lỗi nếu chưa có bản ghi tiến độ
      }
      if (cancelled) return;

      const mount = document.createElement("div");
      host.replaceChildren(mount);
      ytPlayerRef.current = new YT.Player(mount, {
        videoId: youTubeId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start },
        events: {
          onReady: (e) => {
            const dur = e.target.getDuration();
            setDuration(dur);
            if (start > 0 && start < dur - 5) {
              setCurrentTime(start);
              setResumeNotice(`Đã tiếp tục phát từ phút ${formatTime(start)}`);
              setTimeout(() => setResumeNotice(null), 4000);
            }
          },
          onStateChange: (e) => {
            const player = e.target;
            if (e.data === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              stopPolling();
              pollTimer = setInterval(() => {
                reportProgressRef.current(player.getCurrentTime(), player.getDuration() || 1);
              }, 1000);
              return;
            }
            setIsPlaying(false);
            stopPolling();
            if (e.data === YT.PlayerState.PAUSED) {
              savePosition(lessonId, player.getCurrentTime()).catch(() => {});
            }
            if (e.data === YT.PlayerState.ENDED) {
              handleVideoEndedRef.current();
            }
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      stopPolling();
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = null;
      host.replaceChildren();
    };
  }, [state, youTubeId, lessonId]);

  // Điều khiển tua 10 giây
  function handleSkip(seconds: number) {
    if (ytPlayerRef.current) {
      const target = Math.max(
        0,
        Math.min(duration, ytPlayerRef.current.getCurrentTime() + seconds),
      );
      ytPlayerRef.current.seekTo(target, true);
      setCurrentTime(target);
      return;
    }
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }

  // Thay đổi tốc độ phát
  function handlePlaybackRateChange(rate: number) {
    setPlaybackRate(rate);
    ytPlayerRef.current?.setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }

  // Bật/tắt phát
  function togglePlay() {
    if (ytPlayerRef.current) {
      if (isPlaying) ytPlayerRef.current.pauseVideo();
      else ytPlayerRef.current.playVideo();
      return;
    }
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
    if (ytPlayerRef.current) {
      if (isMuted) ytPlayerRef.current.unMute();
      else ytPlayerRef.current.mute();
      setIsMuted(!isMuted);
      return;
    }
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

  // Giao diện khi bài học bị khóa theo tiến độ tuần tự (Sequential Lock)
  if (isLocked || state === "sequence_locked") {
    return (
      <div className="shadow-xs flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-gradient-to-b from-amber-50/70 to-white p-10 text-center">
        <div className="shadow-xs flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-amber-100 text-amber-600">
          <Lock className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-black text-slate-900">Bài học này chưa được mở khóa</h3>
        <p className="mt-2 max-w-md text-xs font-medium leading-relaxed text-slate-600">
          {lockReason ||
            "Theo lộ trình học tập tuần tự, bạn cần xem hết video (tối thiểu 95%) và vượt qua bài quiz của bài trước để mở khóa bài học này."}
        </p>
        {onGoToPreviousLesson && (
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onGoToPreviousLesson}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Quay lại bài học trước</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Giao diện khi video đang chờ kiểm duyệt (giảng viên vừa cập nhật video mới cho khóa đã xuất bản)
  if (state === "pending_review") {
    return (
      <div className="shadow-xs flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-gradient-to-b from-amber-50/70 to-white p-12 text-center">
        <div className="shadow-xs flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-amber-100 text-amber-700">
          <Clock className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-black text-slate-900">
          Video bài giảng đang chờ kiểm duyệt
        </h3>
        <p className="mt-2 max-w-md text-xs font-medium leading-relaxed text-slate-600">
          Giảng viên vừa tải lên hoặc thay đổi video cho bài học này. Video đang được ban quản trị
          kiểm duyệt nội dung và sẽ tự động hiển thị ngay khi được duyệt.
        </p>
      </div>
    );
  }

  // Giao diện khi bài học chưa có video
  if (state === "no_video") {
    return (
      <div className="shadow-xs flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500">
          <VideoOff className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-black text-slate-900">Bài học chưa có video</h3>
        <p className="mt-2 max-w-md text-xs font-medium leading-relaxed text-slate-500">
          Nội dung video đang được giảng viên chuẩn bị và sẽ sớm được cập nhật.
        </p>
      </div>
    );
  }

  // Giao diện khi bài học bị khóa (chưa ghi danh)
  if (state === "locked") {
    return (
      <div className="shadow-xs flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/50 bg-amber-50 text-amber-600">
          <Lock className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-black text-slate-900">
          Bài học này thuộc nội dung trả phí
        </h3>
        <p className="mt-1.5 max-w-md text-xs font-medium leading-relaxed text-slate-500">
          Bạn cần ghi danh khóa học để mở khóa toàn bộ bài giảng chất lượng cao, tài liệu đính kèm
          và làm bài thi nhận chứng chỉ.
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
        <span className="mt-3 text-xs font-semibold text-slate-500">
          Đang tải bài giảng video...
        </span>
      </div>
    );
  }

  // Giao diện phát video hoàn chỉnh
  return (
    <div
      ref={containerRef}
      className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-xl"
    >
      {/* Thông báo tiếp tục xem */}
      {resumeNotice && (
        <div className="animate-in fade-in absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>{resumeNotice}</span>
        </div>
      )}

      {youTubeId ? (
        /* Video YouTube — IFrame API gắn iframe vào đây */
        <div
          ref={ytHostRef}
          className="aspect-video w-full bg-black [&>iframe]:h-full [&>iframe]:w-full"
        />
      ) : (
        /* Thẻ Video HTML5 (MP4/WebM...) */
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
      )}

      {/* Thanh điều khiển nhanh bên dưới video */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-950/95 px-4 py-2.5 text-xs text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-500/25 transition-all hover:bg-blue-500 active:scale-95"
            aria-label={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSkip(-10)}
            className="flex h-8 items-center gap-1 rounded-full px-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            title="Tua lùi 10 giây"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="font-mono text-[11px]">-10s</span>
          </button>

          <button
            type="button"
            onClick={() => handleSkip(10)}
            className="flex h-8 items-center gap-1 rounded-full px-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            title="Tua tới 10 giây"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span className="font-mono text-[11px]">+10s</span>
          </button>

          <div className="ml-2 font-mono text-[11px] text-white/70">
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
                    playbackRate === rate
                      ? "bg-blue-600 text-white"
                      : "text-white/80 hover:text-white"
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
