const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

// Trả về URL embed an toàn cho các dạng link YouTube phổ biến.
export function getYouTubeEmbedUrl(source: string): string | null {
  try {
    const url = new URL(source);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!YOUTUBE_HOSTS.has(hostname)) return null;

    let videoId = "";
    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v") ?? "";
    } else {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") videoId = parts[1] ?? "";
    }

    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  } catch {
    return null;
  }
}
