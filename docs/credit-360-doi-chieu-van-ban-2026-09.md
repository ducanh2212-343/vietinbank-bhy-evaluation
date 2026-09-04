# Credit 360 — đối chiếu mô hình vận hành trên cổng với văn bản gốc (09/2026)

Trang `/one/credit-360` có khối «Cách thức vận hành» dựng từ
`src/data/one/vanHanhChuongTrinh.ts`. Tài liệu này ghi lại **mô hình trên cổng
lấy chữ từ đâu**, và những chỗ văn bản gốc **không thống nhất** để Chi nhánh xử
lý — không phải để mã tự quyết.

## Nguồn

| Tệp trên cổng (`public/bieu-mau/credit-360/`) | Là gì |
| --- | --- |
| `thong-bao-trien-khai-bhy-credit-360.pdf` | Thông báo số …/TB-CNBHY-TCTH ngày 16/06/2026, hiệu lực 22/06/2026 |
| `mau-bieu-01-bien-ban-phien-bhyc360.doc` | Mẫu biểu 01 — Biên bản thảo luận phiên |
| `mau-bieu-02-bien-ban-ghi-nhan-y-kien-bhyc360.docx` | Mẫu biểu 02 — Biên bản ghi nhận ý kiến |

Mọi câu trong dữ liệu đều trích từ ba tệp này; mỗi khối ghi rõ mục. Số hiệu
bước («Bước 3 · (iii)») giữ nguyên của văn bản, không đánh số lại.

## Chỗ văn bản không thống nhất — cần Giám đốc chốt

1. **Mốc gửi tài liệu trước phiên**: mục 4 (Người trình bày) ghi «trước tối
   thiểu 01 ngày»; mục 5 Bước 1 và Bước 2 ghi «tối thiểu 03 ngày». Cổng đang
   dùng **03 ngày** (phần quy trình cụ thể hơn) và ghi chú lệch ở dòng Nguồn.
   Phần giới thiệu cũ của trang (EditableText `programs.credit360.schedule_content`)
   vẫn ghi 01 ngày — sửa nội dung đó qua chế độ chỉnh sửa của quản trị.
2. **Tên vị trí thứ 8 trong trình tự phát biểu**: văn bản ghi «PGĐ 2 Phụ trách
   Phòng»; Giám đốc diễn giải ngày 04/09/2026 là «Phó Giám đốc hỗ trợ PGĐ phụ
   trách Phòng». Cổng ghi cả hai.
3. **«Phòng đầu mối theo phân khúc (nếu có)»** có trong trình tự phát biểu của
   văn bản (giữa TCTH và PGĐ phụ trách) nhưng không có trong thứ tự Giám đốc nêu
   ngày 04/09. Cổng giữ theo văn bản, vẽ ghế nét đứt và ghi «nếu có».
4. **Thư ký**: Mẫu biểu 01 có dòng ký «THƯ KÝ», nhưng văn bản mục 5 Bước 4 giao
   Người trình bày / lãnh đạo phòng kiểm soát hồ sơ lập biên bản, không có vai
   trò thư ký riêng. Cổng theo văn bản: không có làn «Thư ký», biên bản thuộc
   làn Phòng quản lý Khách hàng.

## Những chỗ bản đầu trên cổng đã đoán sai và đã sửa theo văn bản

- Timemark và đánh giá 360° từ CRM **không phải điều kiện vào phiên** — chúng là
  nội dung bắt buộc của bộ tài liệu ở Bước 2. Điều kiện vào phiên chỉ có ngưỡng
  GHTD theo phân khúc **hoặc** đề nghị của Giám đốc / PGĐ phụ trách Phòng.
- Không có thời lượng cho từng lượt phát biểu; văn bản chỉ khuyến nghị 10–15
  phút cho phần trình bày và 30–45 phút cho phần trao đổi.
- Mẫu biểu 02 dùng ở **hai lúc**: thành viên gửi ý kiến trước phiên, và người
  trình bày / LĐP lập bảng ghi nhận nhanh trong phiên.
