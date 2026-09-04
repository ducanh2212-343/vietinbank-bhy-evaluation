# Credit 360 — đối chiếu mô hình vận hành trên cổng với văn bản gốc (09/2026)

Trang `/one/credit-360` có khối «Cách thức vận hành» dựng từ
`src/data/one/vanHanhChuongTrinh.ts`. Tài liệu này ghi lại **mô hình trên cổng
lấy chữ từ đâu**, và những chỗ văn bản gốc **không thống nhất** để Chi nhánh xử
lý — không phải để mã tự quyết.

## Nguồn

| Nguồn | Là gì |
| --- | --- |
| Thông báo số …/TB-CNBHY-TCTH ngày 16/06/2026 (hiệu lực 22/06/2026) | Văn bản triển khai — lưu tại Phòng TCTH, KHÔNG đăng trên cổng theo yêu cầu Giám đốc 04/09/2026 |
| `mau-bieu-01-bien-ban-phien-bhyc360.doc` | Mẫu biểu 01 — Biên bản thảo luận phiên |
| `mau-bieu-02-bien-ban-ghi-nhan-y-kien-bhyc360.docx` | Mẫu biểu 02 — Biên bản ghi nhận ý kiến |

Mọi câu trong dữ liệu đều trích từ ba nguồn này; mỗi khối ghi rõ mục. Số hiệu
bước («Bước 3 · (iii)») giữ nguyên của văn bản, không đánh số lại.

## Chỗ văn bản không thống nhất — Giám đốc đã chốt ngày 04/09/2026

| # | Vấn đề | Văn bản | Quyết định | Cổng đang thể hiện |
| --- | --- | --- | --- | --- |
| 1 | Mốc gửi tài liệu trước phiên | Mục 4: «01 ngày»; mục 5: «03 ngày» | **03 ngày** | Bước 1, Bước 2 và phần giới thiệu đều ghi 03 ngày |
| 2 | Phòng đầu mối theo phân khúc | «(nếu có)», sau TCTH | **Có**, phát biểu sau Phòng TCTH | Ghế số 6, ghế chính thức |
| 3 | Tên vị trí thứ 8 | «PGĐ 2 Phụ trách Phòng» | Dùng **«Phó Giám đốc 2 phụ trách Phòng»** | Ghế số 8 |
| 4 | Thư ký | Mẫu biểu 01 có dòng ký «THƯ KÝ», văn bản không nêu | **Thư ký là Phòng phụ trách khoản vay**, là người lập biểu mẫu | Vai trò Phòng quản lý Khách hàng, Bước 4, mô tả Mẫu biểu 01 |

Ghi chú kỹ thuật cho điểm 1: dòng «01 ngày» còn nằm ở phần giới thiệu cũ của
trang (`EditableText` khoá `programs.credit360.schedule_content`). Giá trị mặc
định trong mã đã đổi thành 03 ngày; nếu quản trị viên từng lưu đè nội dung này
vào bảng `site_content` thì bản lưu đè thắng — phải sửa lại bằng chế độ chỉnh
sửa của quản trị viên ngay trên trang.

## Những chỗ bản đầu trên cổng đã đoán sai và đã sửa theo văn bản

- Timemark và đánh giá 360° từ CRM **không phải điều kiện vào phiên** — chúng là
  nội dung bắt buộc của bộ tài liệu ở Bước 2. Điều kiện vào phiên chỉ có ngưỡng
  GHTD theo phân khúc **hoặc** đề nghị của Giám đốc / PGĐ phụ trách Phòng.
- Không có thời lượng cho từng lượt phát biểu; văn bản chỉ khuyến nghị 10–15
  phút cho phần trình bày và 30–45 phút cho phần trao đổi.
- Mẫu biểu 02 dùng ở **hai lúc**: thành viên gửi ý kiến trước phiên, và người
  trình bày / LĐP lập bảng ghi nhận nhanh trong phiên.

## Đã gỡ khỏi trang theo yêu cầu Giám đốc (04/09/2026)

- **Nút tải toàn văn Thông báo** — văn bản lưu tại TCTH, không đăng trên cổng.
- **Sổ nhật ký phiên** (form đăng ký + bảng tra cứu, bảng `portal_credit_sessions`)
  — không ai dùng: phiên đăng ký với Người điều phối / phòng TCTH và ghi biên bản
  giấy theo Mẫu biểu 01. Mã giao diện và hook đã xoá; **bảng dữ liệu vẫn còn**
  trên máy chủ, gỡ là việc của một migration riêng khi Chi nhánh xác nhận không
  cần giữ dữ liệu cũ.
