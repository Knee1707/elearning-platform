// Route: /verify/[code] · Chủ: M3 · Tra chứng chỉ CÔNG KHAI (không cần đăng nhập).
// Điền: verifyCertificate(code) (quiz.ts/M2) → hiện tên HV + khóa + ngày cấp, hoặc "không hợp lệ".
export default function VerifyPage({ params }: { params: { code: string } }) {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">Xác thực chứng chỉ</h1>
      <p className="mt-2 text-sm text-muted-foreground">Mã: {params.code}</p>
      <p className="mt-2 text-sm text-muted-foreground">TODO(M3): gọi verifyCertificate + hiển thị kết quả.</p>
    </main>
  );
}
