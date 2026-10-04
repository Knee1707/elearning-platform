/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cổng admin build ra thư mục riêng: NEXT_PUBLIC_APP_MODE bị nhúng lúc biên dịch,
  // dùng chung .next với cổng user sẽ lẫn bundle giữa 2 cổng.
  distDir: process.env.NEXT_PUBLIC_APP_MODE === "admin" ? ".next-admin" : ".next",
  images: {
    // Cho phép ảnh thumbnail/avatar từ Supabase Storage.
    // Đổi hostname theo project của bạn khi deploy.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
