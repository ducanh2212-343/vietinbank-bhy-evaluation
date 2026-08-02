# Trao đổi trên mọi bàn Kanban + thông báo đẩy

Rà soát và triển khai, 08/2026. Trả lời yêu cầu: *"kiểm tra tính năng trao đổi
trong tất cả các nhóm kanban, tính năng push notifications cho các cá nhân liên
quan khi có cập nhật"*.

---

## 1. Kết quả rà soát — ba khoảng trống

Chi nhánh đang có **ba bàn Kanban** khác nhau. Trước đợt này chúng không giống
nhau về khả năng trao đổi:

| Bàn | Bảng dữ liệu | Trao đổi trước đây | Thông báo trước đây |
|---|---|---|---|
| Chiêu thức 2 — kế hoạch hành động | `ct2_dau_viec` | Có ô bình luận + cảm xúc | **Không có gì** |
| Phê duyệt tín dụng | `ct2_ho_so_tin_dung` | **Không có** — chỉ nhật ký một chiều | Không có |
| Kanban 38 skill + Dấu ấn | `kanban_cards` | **Không có** — chỉ timeline log | Có: push 2 cấp trên mỗi lần cập nhật |

Cụ thể ba lỗ hổng:

1. **Bàn PDTD không trao đổi được.** Cán bộ muốn hỏi *"hồ sơ này vướng gì"*
   phải gọi điện — nội dung trao đổi biến mất khỏi hệ thống, người tiếp nhận sau
   phải hỏi lại từ đầu.
2. **Thẻ 38 skill và thẻ Dấu ấn không ai trả lời được.** Cán bộ ghi tiến độ,
   quản lý nhận push, nhưng góp ý quay về Zalo và không nằm trong hồ sơ phát
   triển của chính người đó.
3. **`ct2_thong_bao` dựng ra rồi chưa ai ghi vào.** Toàn bộ 17 sự kiện N1–N17
   trong đặc tả mới chỉ nằm trên giấy. Ngoài ra `@nhắc tên` ở Chiêu thức 2 luôn
   gửi mảng rỗng — giao diện chưa nối.

## 2. Cách làm: MỘT bảng trao đổi cho cả ba bàn

Không dựng ba bảng bình luận. Mở rộng `pham_vi` của `ct2_binh_luan` thêm hai giá
trị `HO_SO_TIN_DUNG` và `THE_KANBAN`.

Lý do: `@nhắc tên`, «Cần trả lời», cảm xúc, thu hồi — mỗi thứ chỉ phải viết một
lần và chạy ở khắp nơi. Quan trọng hơn, **cán bộ chỉ phải học một cách trao
đổi**. Ba bàn ba kiểu nhập là cách chắc chắn nhất để phần lớn quay về gọi điện.

Quyền xem/viết đi qua một hàm duy nhất `ct2_xem_duoc_doi_tuong(pham_vi, id)`:

| Phạm vi | Ai đọc/viết được |
|---|---|
| `DAU_VIEC`, `PHONG`, `CHIEN_DICH` | theo `ct2_xem_duoc_dau_viec` sẵn có |
| `HO_SO_TIN_DUNG` | **hẹp đúng phòng** — không mở cho phòng khác, vì có tên khách và số tiền |
| `THE_KANBAN` | chủ thẻ + `can_view_profile` của hệ 38 skill |

Nhờ hàm này, thêm bàn mới sau này chỉ cần thêm một nhánh, không phải sửa policy.

## 3. `@nhắc tên` — không bắt gõ ký tự @

Cán bộ dùng điện thoại. Gõ `@` giữa dòng rồi dò tên trong danh sách 150 người,
xen với bộ gõ tiếng Việt, là thao tác dễ sai và dễ bỏ cuộc.

Thay vào đó: **hàng nút tên người liên quan ngay dưới ô nhập, bấm một cái là
xong**. Danh sách cố ý hẹp — chỉ người gắn với đúng thẻ đó, cộng ai đã nói trong
luồng:

| Bàn | Người hiện sẵn để nhắc |
|---|---|
| Chiêu thức 2 | người chịu trách nhiệm · lãnh đạo theo dõi · người đang giữ việc · người phối hợp |
| Phê duyệt tín dụng | cán bộ phụ trách · lãnh đạo theo dõi · người đang giữ hồ sơ |
| Kanban 38 skill | chủ thẻ · quản lý trực tiếp · lãnh đạo phụ trách |

Không mở ra toàn Chi nhánh: nhắc được cả 150 người là công thức gây nhiễu.

## 4. Thông báo — nguyên tắc «im lặng là mọi thứ đang đúng nhịp»

Đây là phần dễ làm hỏng nhất. Đặc tả §0 quyết định 5 và §6.2 đã cảnh báo về bội
thực thông báo, nên toàn bộ luật đặt ở **một chỗ duy nhất** trong database —
hàm `ct2_dat_thong_bao`. Giao diện hay trigger mới sau này đều không lách được.

**Chỉ báo khi LỆCH CHUẨN hoặc khi việc ĐỔI TAY.** Tuyệt đối không báo mỗi lần
ghi nhịp bình thường — sau ba tuần mọi người sẽ tắt thông báo và mất luôn kênh.

| Mã | Khi nào | Ai nhận | Mức |
|---|---|---|---|
| `N12` | Có người trao đổi / nhắc tên trên thẻ | người liên quan + người được nhắc | 🟡 |
| `N13` | Được giao đầu việc mới | người chịu trách nhiệm | 🟡 |
| `N14` | BGĐ đặt việc là **trọng điểm** | người làm + lãnh đạo theo dõi | 🔴 |
| `N7` | Việc chuyển sang **chờ ý kiến của mình** | người đang giữ việc | 🟡 |
| `N15` | Thẻ báo hoàn thành, chờ lãnh đạo chốt | lãnh đạo theo dõi | 🟡 |
| `HS_GIAO` | Được giao một hồ sơ tín dụng | cán bộ phụ trách | 🟡 |
| `HS_TRINH` | Hồ sơ được **trình lên cấp mình** | người đang giữ hồ sơ | 🔴 |
| `HS_TRA` | Cấp trên có ý kiến, hồ sơ quay về | cán bộ phụ trách | 🟡 |
| `HS_TU_CHOI` | Hồ sơ bị dừng | cán bộ phụ trách | 🔴 |

`HS_TRINH` để mức đỏ có chủ ý: hồ sơ nằm ở cột trình mà người duyệt không biết
là mất ngày công, có khi mất cả cơ hội của khách. Đặc tả gọi cột chờ duyệt là
**"cột nguy hiểm nhất"** — đây là chỗ push có giá trị nhất trong cả hệ thống.

Ba lớp hãm, áp ngay tại `ct2_dat_thong_bao`:

1. **Không tự nhắc mình** về việc chính mình vừa làm.
2. **Im lặng trước 7h00, sau 18h00 và ngày nghỉ** — trừ mức ⛔.
3. **Trần 3 tin nhắc nhẹ/người/ngày.** `@nhắc tên` (N12) và mức 🔴/⛔ không tính
   vào trần — đó là thứ người ta cần biết ngay.

**Bàn Kanban 38 skill giữ luật riêng của nó** (push 2 cấp trên mỗi lần cập nhật,
theo yêu cầu trực tiếp của Giám đốc 26/07). Hai bàn hai luật, không trộn.

## 5. Kiến trúc phát tin: hàng đợi trước, push sau

```
trigger nghiệp vụ → ct2_dat_thong_bao (áp trần + im lặng) → bảng ct2_thong_bao
                                                                   │
                    ┌──────────────────────────────────────────────┴────────┐
                    ▼                                                       ▼
     chuông trong ứng dụng (đọc thẳng bảng)          pg_net → notify-ct2 → Web Push
```

**Bảng hàng đợi là nguồn sự thật, push chỉ là một kênh phát.** Điều này quan
trọng vì: iPhone chưa cài ứng dụng ra màn hình chính thì **không** nhận được Web
Push, và nhiều cán bộ sẽ bấm «Không cho phép» ngay lần hỏi đầu tiên. Ai tắt push
vẫn thấy đủ ở chuông.

Push hỏng cũng không được làm hỏng giao dịch nghiệp vụ: `ct2_kich_hoat_phat_push`
nuốt mọi lỗi, thông báo vẫn nằm nguyên trong hàng đợi.

Edge function `notify-ct2` **không tự quyết ai được nhận** — nó chỉ đọc dòng
chưa gửi, đẩy đi, rồi đóng dấu `gui_luc`. Tin để quá 6 tiếng thì đóng dấu mà
không đẩy: một lời nhắc của hôm qua bật lên sáng nay chỉ gây nhiễu.

## 6. Bấm vào thông báo phải mở đúng thẻ

Một thông báo dẫn về trang chung là thông báo hỏng — cán bộ vẫn phải tự đi tìm
thẻ giữa bảy cột, và lần sau họ sẽ bỏ qua chuông.

Trang `/one/chieu-thuc-2` nay nhận `?the=<id>` (mở thẳng thẻ, kể cả thẻ liên
phòng ngoài bảng đang xem) và `?tab=tin-dung`. Tham số bị xoá khỏi URL sau khi
dùng, để đóng thẻ rồi tải lại trang không bật lên nữa. Quy tắc sinh đường dẫn
nằm ở `duongDanThongBao()` trong `src/lib/ct2.ts`, dùng chung cho cả chuông và
edge function nên hai nơi không lệch nhau.

## 7. Đã triển khai

| Lớp | Nội dung |
|---|---|
| Database | Migration `20260811090000_ct2_trao_doi_va_thong_bao.sql` — mở rộng `pham_vi`, hàm quyền `ct2_xem_duoc_doi_tuong`, hàm hàng đợi `ct2_dat_thong_bao`, 3 trigger thông báo, RPC `ct2_danh_dau_da_doc`, 2 chỉ mục riêng cho «chưa đọc»/«chưa gửi» |
| Edge function | `notify-ct2` — đọc hàng đợi, phát Web Push nhiều thiết bị/người, tự tắt đăng ký chết (404/410) |
| Giao diện dùng chung | `Ct2TrangTraoDoi.tsx` — một khung trao đổi cho cả ba bàn, kèm bộ chọn `@nhắc tên` một chạm |
| Chuông | `Ct2ChuongThongBao.tsx` trên thanh ngang, làm tươi 2 phút/lần (không dùng websocket) |
| Nối vào | Thẻ Chiêu thức 2 · hồ sơ PDTD · thẻ Kanban 38 skill/Dấu ấn |
| Deep-link | `/one/chieu-thuc-2?the=…` và `?tab=tin-dung` |

Migration **đã áp** vào project `whlysprzsguehxmrjwha`; edge function **đã
deploy**. Đã kiểm chứng trên database thật (trong giao dịch có rollback): trigger
bình luận chạy đúng, mức ⛔ vượt được im lặng ngày nghỉ, mức 🟡 bị chặn đúng
theo luật.

## 8. Chưa làm (đề xuất đợt sau)

- **Trả lời theo luồng (`cha_id`)**: dữ liệu đã có cột, giao diện chưa mở nút
  «Trả lời». Với luồng ngắn 3–5 dòng thì luồng phẳng dễ đọc hơn trên điện thoại;
  chỉ nên mở khi thực tế xuất hiện luồng dài.
- **Nhắc lại «Cần trả lời» quá 24h**: cần một tác vụ định giờ quét
  `ct2_binh_luan` chưa có `da_tra_loi_luc` — đi cùng đợt làm cron.
- **Ghim bình luận**: cột `ghim` đã hiển thị đúng nhưng chưa có nút bật/tắt.
- **Gộp tin cùng thẻ**: nếu một thẻ có 5 trao đổi trong 10 phút, hiện vẫn là 5
  thông báo. Nên gộp thành một khi có số liệu thực tế cho thấy điều đó xảy ra.
