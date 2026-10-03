# Git Branching Rule

- Bắt buộc từ nay về sau: Mỗi lần thực hiện hoặc chỉnh sửa một tính năng (feature) mới, luôn luôn tạo một nhánh Git mới (ví dụ: `feat/<feature-name>`) từ nhánh `main` trước khi thay đổi mã nguồn.
- Tuyệt đối không commit hoặc code trực tiếp trên nhánh `main`.
- Sau khi hoàn thành và kiểm tra tính năng, push nhánh lên remote origin để người dùng tự tạo Pull Request (PR).
