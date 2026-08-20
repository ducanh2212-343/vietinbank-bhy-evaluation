# «Lãnh đạo theo dõi» khác «Phó phòng / Trưởng phòng phụ trách» thế nào

08/2026 — Giám đốc hỏi sau khi thấy một thẻ hiện «Theo dõi **Đỗ Việt Anh**» ngay
cạnh «TP **Đỗ Việt Anh**». Câu hỏi đúng: nếu trùng nhau thì ô kia để làm gì?

---

## 1. Hiện trạng — nói thẳng: hai khái niệm đang gần như trùng nhau

**Ba cấp phụ trách** (`pho_phong`, `truong_phong`, `pgd_phu_trach`) là **sơ đồ
tuyến trách nhiệm**: việc này thuộc tuyến quản lý nào. Tương đối tĩnh, suy được
từ danh mục phòng, đổi khi bổ nhiệm chứ không đổi theo từng việc.

**Lãnh đạo theo dõi** (`lanh_dao_theo_doi`) đáng lẽ là **người bám sát việc
này** — một người cụ thể cán bộ hỏi khi vướng, và là người phải trả lời.

Nhưng trong hệ thống hôm nay, khác biệt gần như chỉ nằm trên giấy:

| Nơi dùng | Ba cấp phụ trách | Lãnh đạo theo dõi |
| --- | --- | --- |
| `ct2_ds_nhan_dau_viec()` — người nhận nhịp & trao đổi | có | có, **gộp chung một rổ DISTINCT** |
| «Ban Giám đốc đặt việc này là TRỌNG ĐIỂM» | không | **có** |
| «Có việc chờ anh/chị chốt» (khi báo hoàn thành) | không | **có** |
| Cảnh báo thẻ thiếu thông tin | không | **có** (trống thì kêu) |

Nghĩa là: mọi nhịp và trao đổi, **năm người nhận y hệt nhau**. Chỉ hai loại tin
hiếm mới đi riêng cho lãnh đạo theo dõi. Cảm giác trùng lặp của Giám đốc là
đúng với thực tế mã đang chạy.

Còn ở bảng **PDTD** thì khoảng cách còn xa hơn: `f_ct2_thong_bao_ho_so` chỉ báo
cho **cán bộ** và **người đang giữ hồ sơ**. Ba cấp phụ trách vừa thêm cho hồ sơ
tín dụng hiện **không được dùng để báo cho ai cả** — gán xong vẫn im lặng.

## 2. Định nghĩa đề nghị chốt

> **Ba cấp phụ trách = ai chịu trách nhiệm theo tuyến.**
> **Lãnh đạo theo dõi = ai trong ba cấp đó đang trực tiếp bám việc này.**

Kéo theo một ràng buộc làm khái niệm sạch hẳn: **lãnh đạo theo dõi phải là một
trong ba cấp phụ trách của chính thẻ đó**. Không còn là ô tự do chọn bất kỳ ai
trong phòng — chính chỗ tự do đó đã đẻ ra thẻ KHDN-2608-023 lấy một chuyên viên
làm «lãnh đạo theo dõi».

Trùng tên khi đó không phải lỗi mà là thông tin: Trưởng phòng đang tự bám việc
này, không giao xuống Phó phòng.

## 3. Thang thông báo đề nghị — để khác nhau thật, không chỉ khác tên

Nguyên tắc đã dùng từ đợt trước: *một trưởng phòng 9 cán bộ mà sáng nào cũng
nhận đủ 9 nhịp thì sang tuần sẽ tắt thông báo, và lúc đó tin cờ đỏ chết theo.*

| Ai | Nhận gì | Mức |
| --- | --- | --- |
| Cán bộ phụ trách | mọi thứ của việc mình | NHẸ |
| **Lãnh đạo theo dõi** | **mọi nhịp + mọi trao đổi** | NHẸ, cờ đỏ → DO |
| Hai cấp còn lại (trong PP/TP/PGĐ) | **chỉ việc đáng để cấp trên biết**: cờ đỏ · quá hạn · Dừng/Hủy · lùi hạn · báo hoàn thành | DO |
| PGĐ phụ trách (khi không phải người bám sát) | chỉ cờ đỏ · quá hạn · Dừng/Hủy | DO |
| Người bấm «👁 Theo dõi» | mọi thứ — họ tự chọn nhận | NHẸ |

Khác biệt cốt lõi: **người bám sát nghe nhịp thở hằng ngày; các cấp trên chỉ
nghe khi có chuyện.** Hôm nay cả năm người cùng nghe mọi thứ — đó là công thức
để tất cả cùng tắt thông báo.

Với **PDTD**, thang tương ứng: cán bộ và người đang giữ hồ sơ như hiện tại; thêm
lãnh đạo theo dõi nhận mọi nhịp hồ sơ; ba cấp nhận hồ sơ quá hạn xử lý, hồ sơ bị
từ chối, và hạn mức sắp đến hạn.

## 4. Việc phải làm nếu chốt phương án này

1. Ràng buộc `lanh_dao_theo_doi ∈ {pho_phong, truong_phong, pgd_phu_trach}` —
   trigger ở DB, và ở giao diện đổi ô «Lãnh đạo theo dõi» thành chọn **một
   trong ba dòng** đã gán thay vì danh sách cả phòng.
2. Tách `ct2_ds_nhan_dau_viec()` thành hai: `ds_nhan_hang_ngay` (cán bộ · người
   bám sát · người phối hợp · người bấm theo dõi) và `ds_nhan_khi_co_chuyen`
   (thêm hai cấp còn lại). Mỗi trigger gọi đúng cái nó cần.
3. Nối ba cấp phụ trách của **PDTD** vào `f_ct2_thong_bao_ho_so` — hiện đang
   gán mà không báo cho ai.

Chưa làm gì trong số này; chờ Giám đốc chốt định nghĩa ở mục 2 trước, vì mục 3
chỉ đúng khi mục 2 đúng.
