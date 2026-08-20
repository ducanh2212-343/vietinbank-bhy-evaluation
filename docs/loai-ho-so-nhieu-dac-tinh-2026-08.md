# Loại hồ sơ: một lựa chọn → nhiều đặc tính · bỏ «Hồ sơ giải ngân»

Giám đốc chốt 07/08/2026: *«bỏ giải ngân, và các loại hồ sơ kia thì thành tích
chọn do có thể 1 hồ sơ gồm nhiều đặc tính»*.

## Vì sao đúng

Một hồ sơ ngoài đời có thể vừa **tái cấp** vừa **điều chỉnh giới hạn**, hoặc
**cấp mới** cho một **dự án** trung dài hạn. Ép chọn một là ép cán bộ bỏ mất
nửa sự thật — và nửa bị bỏ chính là cái quyết định hồ sơ có bị cảnh báo hạn
mức hay không.

«Hồ sơ giải ngân» thì không phải đặc tính của giới hạn tín dụng mà là một
**bước** — bảng đã có cột «Hoàn thiện HS giải ngân». Để nó trong danh sách
loại là mời chọn nhầm. Không hồ sơ nào đang mang giá trị này (0/48).

## Mô hình dữ liệu — thêm cột mảng, KHÔNG đổi kiểu cột cũ

| | |
| --- | --- |
| `cac_loai text[]` | Toàn bộ đặc tính đã tích, tối thiểu một |
| `loai_ho_so` | Ở lại làm **đặc tính chính** = `cac_loai[1]`, đồng bộ tự động |

Giữ cột cũ để bản dựng đang chạy trên máy cán bộ (chỉ biết gửi `loai_ho_so`)
vẫn ghi được suốt cửa sổ deploy, và mọi đoạn mã/báo cáo còn đọc cột cũ không
gãy. Trigger `f_ct2_hs_dong_bo_loai` đồng bộ **hai chiều**.

**Cái bẫy đã lộ ra khi thử** — đáng ghi lại: bản đầu của trigger chỉ có hai
nhánh (mảng rỗng → dựng từ cột cũ; ngược lại → lấy `cac_loai[1]`). Kết quả là
bản dựng cũ đổi loại hồ sơ thì bị **ghi đè ngược về giá trị cũ** — người dùng
bấm lưu, màn hình báo thành công, dữ liệu không đổi. Phép thử đóng vai TP KHDN
bắt được ngay. Nhánh thứ ba xử đúng: nếu chỉ `loai_ho_so` đổi thì thay đặc
tính chính, **giữ các đặc tính phụ** đã tích.

## Hai RPC phải xét theo giao mảng

`ct2_pdtd_sap_den_han` và `ct2_pdtd_thieu_du_lieu` đang lọc
`loai_ho_so IN ('TAI_CAP','DIEU_CHINH')` → chuyển sang `cac_loai && ARRAY[...]`.
Không đổi thì hồ sơ tích **[Cấp mới, Điều chỉnh]** tuột khỏi lưới cảnh báo hạn
mức chỉ vì đặc tính chính là «Cấp mới». Client có `hsCanNgayDenHan()` cùng luật.

## Màn hình

- Ô vuông tích thay danh sách xổ, ở cả cửa **mở hồ sơ mới** lẫn cửa **sửa**
  (dùng chung `OTichLoaiHoSo`). Bày hết năm mục thành hàng — chỉ có năm, và
  người dùng cần THẤY mình đang tích mấy cái.
- Thẻ trên bàn Kanban, dòng Toàn cảnh, tiêu đề hộp thoại: bày **đủ** đặc tính
  (`Tái cấp GHTD + Điều chỉnh giới hạn`), không chỉ cái chính.
- `hsCacLoai()` an toàn với bản ghi cũ / bộ nhớ đệm trình duyệt chưa có cột
  mới: lấy tạm `loai_ho_so` làm bộ một phần tử thay vì trả mảng rỗng rồi để
  mọi cảnh báo tắt câm.

## Kiểm chứng trên production (transaction rollback)

| Phép thử | Kết quả |
| --- | --- |
| Backfill 48 hồ sơ | 48/48 khớp, đặc tính chính giữ nguyên |
| Bản dựng **cũ** đổi loại | Ghi đúng, không bị ghi đè ngược |
| Bản **mới** tích `[Cấp mới, Điều chỉnh, Cấp mới]` | Khử trùng → `{CAP_MOI, DIEU_CHINH}`, chính = Cấp mới |
| Vết trong nhật ký | `CAP_MOI → CAP_MOI + DIEU_CHINH` |
| Cảnh báo hạn mức bắt **đặc tính phụ** | Có |
| Tích `GIAI_NGAN` | Bị chặn |
| Tích rỗng | Rơi về đặc tính chính, không bao giờ để trống |

631/631 test (thêm 4) · typecheck (`tsconfig.app.json`) · build · lint sạch.
