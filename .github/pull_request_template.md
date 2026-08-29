<!-- 1 PR = 1 issue (1 lá cây MECE). Nhỏ, dễ review. -->

## Issue liên quan
Closes #

## Làm gì
-

## Thuộc phần của ai
- [ ] L (khung/hạ tầng)
- [ ] M1 (data nội dung)
- [ ] M2 (data học tập)
- [ ] M3 (app học viên)
- [ ] M4 (app giảng viên/admin)

## Checklist trước khi xin review
- [ ] Chỉ sửa file trong phần của mình (đúng ranh giới `CONVENTIONS.md`)
- [ ] `pnpm lint` xanh
- [ ] `pnpm typecheck` xanh
- [ ] `pnpm build` xanh
- [ ] (Nếu đụng DB) migration mới, KHÔNG sửa migration đã merge
- [ ] Đã test bấm thật ra đúng kết quả (nếu là UI)
