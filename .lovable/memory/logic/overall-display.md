---
name: Overall & Profile display
description: Tổng quan và Hồ sơ cá nhân hiển thị phiếu kỳ gần nhất bất kể trạng thái
type: feature
---
Overview (`/tong-quan`) và PersonalProfile (`/ho-so-ca-nhan`) lấy phiếu kỳ gần nhất qua `fetchLatestForm` / `fetchAllForms` — KHÔNG lọc theo status. Trạng thái thể hiện qua `StatusBadge` + `StatusNoteBanner` (`src/components/profile/StatusBadge.tsx`) với note rõ ràng cho mỗi state (draft/submitted/returned/reviewed/approved/closed).

ProgressTrendChart vẫn chỉ tính các kỳ `reviewed/approved/closed` để tránh nháp làm méo xu hướng.

Phân nhóm sao giữ rule nhạy cảm cũ: cán bộ chỉ thấy khi `visible_to_employee=true AND approval_status='approved'`.
