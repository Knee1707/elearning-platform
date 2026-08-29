// Route: /courses/[slug] · Chủ: M3 · Chi tiết 1 khóa.
// Điền: gọi getCourseDetail(slug) (courses.ts/M1) → mô tả + mục lục + review + nút mua/wishlist.
export default function CourseDetailPage({ params }: { params: { slug: string } }) {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Chi tiết khóa: {params.slug}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        TODO(M3): getCourseDetail + mục lục + học thử (bài is_free) + nút thêm giỏ / wishlist.
      </p>
    </main>
  );
}
