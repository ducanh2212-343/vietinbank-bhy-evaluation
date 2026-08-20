# Giám đốc không lưu được mốc giờ — hai lỗi chồng nhau

*GĐ báo 06/08: bấm «Lưu mốc giờ» mà không lưu được.*

## Lỗi 1 — quyền: vai `bgd` bị loại khỏi policy ghi

Policy ghi của `ct2_cau_hinh_thoi_gian` chỉ nhận `system_admin` và `tcth_admin`.
Tài khoản Giám đốc mang vai `bgd`. Trong khi đó client định nghĩa
`isAdmin = ['bgd','tcth_admin','system_admin']` nên **vẫn bày trang và nút Lưu**.

Đúng cái bẫy của nguồn việc `CHI_DAO` hôm qua: nới một bên, bên kia không biết.

## Lỗi 2 — màn hình nói dối, và cái này nguy hơn

PostgREST trả về UPDATE-0-dòng **không kèm lỗi**. Mã cũ chỉ kiểm `error`:

```ts
const { error } = await db.from(...).update(f).eq('id', true);
if (error) { toast.error(...); return; }
toast.success('Đã lưu mốc giờ...');   // ← nói dối
```

Nên GĐ bấm lưu → thấy báo **thành công** → mở lại thấy số cũ → không có manh
mối nào để đoán vì sao. Một màn hình báo lỗi còn tử tế hơn một màn hình nói dối.

Đã sửa: `.select('id')` không phải để lấy dữ liệu mà để **đếm số dòng thực sự
đổi**; 0 dòng thì báo thẳng là thiếu quyền và cần vai gì.

## Đã vá hai bảng — cố ý không vá tám bảng còn lại

Rà toàn bộ: **10 bảng** có policy ghi cho `tcth_admin` mà không có `bgd`. Vá
đúng hai bảng của trang «Cài đặt ngày giờ»:

- `ct2_cau_hinh_thoi_gian` — mốc giờ nhịp
- `lich_nghi_le` — lịch nghỉ (cùng trang, GĐ sẽ vấp tiếp)

Lý lẽ: giờ giao ban và ngày nghỉ là **quyết định điều hành của Chi nhánh** —
do Giám đốc chốt, không phải do quản trị hệ thống chốt.

Tám bảng còn lại (`site_content`, `portal_ideas`, `portal_uploads`,
`portal_images`, `star_records`, `guest_access`, `portal_credit_sessions`,
`portal_idea_proposer_alias`) **không đụng** — đó là các miền quản trị nội
dung khác; mở thêm quyền là quyết định riêng, phải hỏi chứ không kèm vào một
bản vá lỗi.

## Mốc giờ mới, theo yêu cầu của GĐ

| Khung | Kết quả |
|---|---|
| Trước **08:31** | ĐÚNG GIỜ |
| 08:31 – 08:44 | MUỘN |
| Từ **08:45** | MẤT NHỊP |

Khung «bảng sống» đóng lúc 08:45 — trùng đúng mốc hết ân hạn, nên người ghi
muộn nhất vẫn thấy bảng đang cập nhật. Không cần nới thêm.

## Kiểm chứng (giả danh, có hoàn tác)

| Thử | Kết quả |
|---|---|
| Giám đốc (`bgd`) lưu mốc giờ | 1 dòng đổi ✅ |
| Giám đốc thêm lịch nghỉ | thêm được ✅ |
| Cán bộ thường đổi mốc giờ | 0 dòng đổi ✅ |
| Cán bộ thường thêm lịch nghỉ | bị chặn ✅ |

**Một lần suýt báo sai**: phép thử «GĐ thêm lịch nghỉ» lần đầu báo *BỊ CHẶN* —
nhưng đọc kỹ thì chặn bởi tên cột sai trong chính harness của tôi
(`la_ngay_lam_bu` không tồn tại), rồi lần sau là giá trị `loai` sai. Nếu chỉ
đếm «có chặn hay không» thì đã kết luận ngược. Chạy lại đúng schema mới ra kết
quả thật.

624 test qua, tsc + lint sạch, build qua. Migration `20260904090000` đã áp production.
