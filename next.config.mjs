/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Cho phép ảnh thumbnail/avatar từ Supabase Storage.
    // Đổi hostname theo project của bạn khi deploy.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
