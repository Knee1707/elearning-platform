import { notFound } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { getCourseDetail, type CourseDetail } from "@/lib/queries/courses";
import { LearningWorkspace } from "@/features/lesson/LearningWorkspace";

// Dữ liệu dự phòng phong phú khi DB chưa có kết nối hoặc đang chạy demo
const FALLBACK_LEARN_COURSES: Record<string, CourseDetail> = {
  "lap-trinh-web-nextjs": {
    id: "demo-course-1",
    instructorId: "demo-inst-1",
    categoryId: "cat-it",
    title: "Lập trình Web hiện đại với Next.js 14, React & TypeScript",
    slug: "lap-trinh-web-nextjs",
    description:
      "Khóa học thực chiến toàn diện giúp bạn làm chủ Next.js 14 App Router, Server Components, TypeScript, Tailwind CSS, tối ưu SEO và kết nối cơ sở dữ liệu Supabase Postgres bảo mật cao.",
    level: "intermediate",
    price: 499000,
    status: "published",
    thumbnailUrl: null,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "ThS. Nguyễn Văn A",
    avgRating: 4.9,
    ratingCount: 142,
    chapters: [
      {
        id: "chap-1",
        courseId: "demo-course-1",
        title: "Khởi động & Kiến trúc Next.js App Router",
        position: 1,
        lessons: [
          {
            id: "les-1",
            chapterId: "chap-1",
            title: "01. Giới thiệu tổng quan & Định hướng lộ trình học",
            videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
            videoStatus: "ready",
            durationSeconds: 480,
            isFree: true,
            position: 1,
          },
          {
            id: "les-2",
            chapterId: "chap-1",
            title: "02. Cài đặt môi trường Node.js, pnpm và khởi tạo dự án",
            videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
            videoStatus: "ready",
            durationSeconds: 720,
            isFree: true,
            position: 2,
          },
          {
            id: "les-3",
            chapterId: "chap-1",
            title: "03. Cơ chế Server Components vs Client Components",
            videoUrl: null,
            videoStatus: "ready",
            durationSeconds: 900,
            isFree: false,
            position: 3,
          },
        ],
      },
      {
        id: "chap-2",
        courseId: "demo-course-1",
        title: "Xây dựng Giao diện & Design Tokens với Tailwind CSS",
        position: 2,
        lessons: [
          {
            id: "les-4",
            chapterId: "chap-2",
            title: "04. Cấu hình Semantic Design Tokens và shadcn/ui",
            videoUrl: null,
            videoStatus: "ready",
            durationSeconds: 850,
            isFree: false,
            position: 1,
          },
          {
            id: "les-5",
            chapterId: "chap-2",
            title: "05. Thiết kế Header, Navbar và Navigation đa cấp",
            videoUrl: null,
            videoStatus: "ready",
            durationSeconds: 980,
            isFree: false,
            position: 2,
          },
          {
            id: "les-6",
            chapterId: "chap-2",
            title: "06. [Quiz] Kiểm tra kiến thức App Router cơ bản",
            videoUrl: null,
            videoStatus: "ready",
            durationSeconds: 600,
            isFree: false,
            position: 3,
          },
        ],
      },
    ],
  },
  "nextjs-co-ban-nang-cao": {
    id: "20000000-0000-0000-0000-000000000001",
    instructorId: "00000000-0000-0000-0000-000000000001",
    categoryId: "10000000-0000-0000-0000-000000000001",
    title: "Khóa học Next.js từ cơ bản đến nâng cao",
    slug: "nextjs-co-ban-nang-cao",
    description: "Học Next.js App Router, Supabase, TypeScript toàn diện.",
    level: "beginner",
    price: 990000,
    status: "published",
    thumbnailUrl: null,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "Nguyễn Văn Giảng Viên",
    avgRating: 5.0,
    ratingCount: 88,
    chapters: [
      {
        id: "30000000-0000-0000-0000-000000000001",
        courseId: "20000000-0000-0000-0000-000000000001",
        title: "Chương 1: Giới thiệu Next.js",
        position: 1,
        lessons: [
          {
            id: "40000000-0000-0000-0000-000000000001",
            chapterId: "30000000-0000-0000-0000-000000000001",
            title: "Bài 1: Cài đặt và Hello World",
            videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
            videoStatus: "ready",
            durationSeconds: 600,
            isFree: true,
            position: 1,
          },
          {
            id: "40000000-0000-0000-0000-000000000002",
            chapterId: "30000000-0000-0000-0000-000000000001",
            title: "Bài 2: Cấu trúc thư mục App Router",
            videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
            videoStatus: "ready",
            durationSeconds: 900,
            isFree: false,
            position: 2,
          },
        ],
      },
      {
        id: "30000000-0000-0000-0000-000000000002",
        courseId: "20000000-0000-0000-0000-000000000001",
        title: "Chương 2: App Router nâng cao",
        position: 2,
        lessons: [
          {
            id: "40000000-0000-0000-0000-000000000003",
            chapterId: "30000000-0000-0000-0000-000000000002",
            title: "Bài 3: Server Components",
            videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
            videoStatus: "ready",
            durationSeconds: 720,
            isFree: false,
            position: 1,
          },
          {
            id: "40000000-0000-0000-0000-000000000004",
            chapterId: "30000000-0000-0000-0000-000000000002",
            title: "Bài 4: Data Fetching & Caching",
            videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
            videoStatus: "ready",
            durationSeconds: 840,
            isFree: false,
            position: 2,
          },
        ],
      },
    ],
  },
};

export default async function LearnPage({ params }: { params: { courseId: string } }) {
  let course: CourseDetail | null = null;

  try {
    course = await getCourseDetail(params.courseId);
  } catch {
    course = null;
  }

  // Nếu không tìm thấy bằng slug trong DB, tìm trong bảng dự phòng
  if (!course) {
    if (FALLBACK_LEARN_COURSES[params.courseId]) {
      course = FALLBACK_LEARN_COURSES[params.courseId];
    } else if (params.courseId === "20000000-0000-0000-0000-000000000001") {
      course = FALLBACK_LEARN_COURSES["nextjs-co-ban-nang-cao"];
    } else if (params.courseId === "demo-course-1") {
      course = FALLBACK_LEARN_COURSES["lap-trinh-web-nextjs"];
    } else {
      // Dùng khóa đầu tiên làm fallback an toàn
      course = FALLBACK_LEARN_COURSES["lap-trinh-web-nextjs"];
    }
  }

  if (!course) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <LearningWorkspace course={course} />
    </div>
  );
}
