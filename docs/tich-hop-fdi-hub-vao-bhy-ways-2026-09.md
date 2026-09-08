# Tích hợp FDI Hub vào Bắc Hưng Yên Ways

**Ngày:** 08/09/2026 · **Căn cứ:** tệp «FDI 343 HUB» (`rm_fdi_hub.html`, bản cập nhật
07/2026) của Phòng KHDN – Tổ FDI; yêu cầu của Giám đốc: đưa cấu phần này vào BHY ONE,
dự kiến trong Bắc Hưng Yên Ways, phân quyền cho toàn bộ cán bộ.

---

## 1. Kết luận

FDI Hub được đưa lên cổng thành **thương hiệu thứ tám của Bắc Hưng Yên Ways**, tên
đầy đủ **Bắc Hưng Yên FDI Hub**, đường dẫn `/one/fdi-hub`, **một trang chín tab**
(`?tab=`), **mở cho mọi cán bộ** và **đóng với khách đối tác**. Toàn bộ nội dung của
bản HTML gốc được chuyển sang React theo khuôn của cổng — không nhúng tệp HTML
bằng iframe.

| Câu hỏi | Trả lời | Vì sao |
| --- | --- | --- |
| Nằm ở đâu trên cổng | Mục lẻ trong nhóm menu Bắc Hưng Yên Ways, ngay sau Connect; thêm một thẻ trên dải Ways ở Trang chủ | Ways là «hệ sinh thái các phương thức, công cụ và cơ chế quản trị» — FDI Hub đúng là một phương thức tiếp cận khách hàng. Đặt cạnh Connect vì cả hai đều hướng ra khách hàng doanh nghiệp |
| Một trang hay thư mục nhiều màn | Một trang, tab ghi trên `?tab=` | Chín tab là chín chương của một cẩm nang, không tab nào có dữ liệu nghiệp vụ riêng (khác Ideas, Sao Xứng Đáng). Tách route thì menu Ways phình thành thư mục chín mục rỗng ruột |
| Ai được xem | Mọi cán bộ đã đăng nhập (không `minRole`, không `special`) | Đúng yêu cầu; và không chỉ Tổ FDI cần — RM bán lẻ, giao dịch viên, lãnh đạo phòng gặp khách FDI đều cần văn hóa tiếp khách và quà tặng |
| Khách đối tác | Không (không có `guestScreen`) | Có giá quà, số điện thoại nhà cung cấp, quy trình đón tiếp nội bộ, prompt nội bộ. Fail-closed của `manHinhKhach.ts` tự đóng |
| Chuyển sang React hay nhúng iframe | Chuyển hẳn | Nhúng iframe thì không có ⌘K, breadcrumb, thanh tab điện thoại, chế độ tối, và không sửa nội dung được từng mảnh. Chuyển hẳn thì nội dung là dữ liệu thuần, kiểm thử soát được liên kết chéo |
| Tiến độ checklist lưu ở đâu | Trình duyệt (`localStorage`, tiền tố `fdihub:`) — như bản gốc | Đây là công cụ tự luyện của từng RM cho một lượt tiếp cận, không phải hồ sơ khách hàng; không cần bảng, không cần RLS. Màn hình ghi rõ «không đồng bộ sang máy khác» |
| Database | **Không có migration** | Không có gì cần lưu chung. Bước sau (mục 5) mới cần bảng |

---

## 2. Bản gốc có gì

Tệp HTML 1,1 MB, trong đó ~1 MB là 15 ảnh base64 (5 slide infographic quà tặng,
10 mã QR video eFAST). Phần còn lại là một script dựng chín tab:

| Tab gốc | Nội dung | Có tương tác |
| --- | --- | --- |
| Tổng quan | Sơ đồ luồng 6 bước, hai điểm quyết định, 4 nguyên tắc | — |
| B1–B6 chi tiết | Dải mốc, chi tiết từng bước (mục tiêu, việc, đầu ra, công cụ, lỗi hay gặp), liên kết chéo sang tab khác | Tích việc, đánh dấu bước xong (localStorage) |
| Checklist | 5 nhóm theo giai đoạn B2→B6 | Tích (localStorage) |
| RM Hoa ngữ & Văn hóa | Chuẩn RM, WeChat, đón khách tại Chi nhánh (trích quy trình lễ tân), đến thăm khách, văn hóa chung | — |
| Quà tặng | 5 infographic, 11 điểm chạm, catalogue 4 nhóm (giá, nhà cung cấp), ngũ hành, phân tầng Silver/Gold/Platinum, 5Đ, nhà cung cấp | Phóng ảnh, mở chi tiết điểm chạm |
| Kho công cụ | 15 công cụ, 14 đã có / 1 cần bổ sung (onepage thị trường) | — |
| Báo cáo nhanh | Prompt chuẩn «FDI RM Skill» ghép tên DN → sao chép sang ChatGPT/Gemini | Form + sao chép (nháp lưu localStorage) |
| Kịch bản mẫu | Gọi điện lần đầu (Việt + Trung), thư cảm ơn song ngữ | — |
| Trợ lý AI | 6 prompt nhanh, trợ lý quà tặng AI, salekit, 10 video eFAST + QR, chatbot Xiaoxin | Sao chép prompt |

Điểm đáng chú ý khi rà: tab «Báo cáo nhanh» **không phải biểu mẫu nhập liệu** mà là
máy sinh prompt — cán bộ vẫn phải mang kết quả sang ChatGPT/Gemini. Mục 5 nói cách
đi tiếp.

---

## 3. Cách chuyển

| Phần | Bản gốc | Trên cổng |
| --- | --- | --- |
| Nội dung | Chuỗi HTML trong script | `src/data/one/fdiHub.ts` — dữ liệu thuần, có kiểu; Tổ FDI sửa lời văn/giá/link tại một chỗ |
| Chín tab | `innerHTML` từng panel | `src/components/one/fdi-hub/Tab*.tsx`, tải lười từng tab (tab Quà tặng có ảnh, tab Trợ lý AI kéo thư viện QR) |
| Mảnh giao diện chung | CSS riêng (thẻ, dải màu, chip, ô lưu ý) | `dungChung.tsx` bằng Tailwind theo thang chữ của cổng; GIỮ bảng màu riêng từng bước (tím B1, xanh B2…) vì bản in và slide cùng màu |
| 5 slide infographic | base64 ~800 KB | `public/fdi-hub/qua-tang-slide-1…5.jpg` (JPEG gốc 1100×777, 125–177 KB/ảnh), tải lười |
| 10 mã QR | 10 ảnh PNG base64 | Sinh lúc chạy bằng thư viện `qrcode` đã có trong repo từ chính link video — đổi link là QR tự đúng |
| Liên kết chéo (bước → tab → neo) | `goToAnchor(tab, id)` | `diDenTab(tab, neo)` qua context; `?tab=&neo=` trên đường dẫn nên chia sẻ được link tới đúng chỗ |
| Trợ lý quà tặng AI | Bắt RM tự dán file «Danh sách quà tặng DN.xlsx» | Catalogue trong cổng được ghép sẵn vào cuối prompt (`danhSachQuaDangChu`) — bớt một bước, AI luôn thấy bản đang dùng |
| Tên gọi | «FDI 343 HUB» | «Bắc Hưng Yên FDI Hub» theo đúng cách đặt tên các thương hiệu Ways |

Không có gì của bản gốc bị bỏ. Hai thứ được thêm nhỏ: nút «Làm lại từ đầu» cho tiến
độ hành trình (bản gốc muốn làm lại phải xóa localStorage), nút sao chép kịch bản
và thư cảm ơn.

---

## 4. Nơi đã chạm

| File | Việc |
| --- | --- |
| `src/lib/navigation.ts` | Mục lẻ «Bắc Hưng Yên FDI Hub» trong nhóm Ways, sau Connect; từ khóa ⌘K |
| `src/data/one/bhyWays.ts` | Thẻ thứ tám trên dải Ways của Trang chủ |
| `src/App.tsx` | Route `/one/fdi-hub` |
| `src/data/one/fdiHub.ts` | Toàn bộ nội dung + hàm ghép prompt |
| `src/components/one/fdi-hub/` | 9 tab + mảnh dùng chung |
| `src/pages/one/OneFdiHubPage.tsx` | Trang: đầu trang chuẩn cổng, thanh tab, tab tải lười |
| `public/fdi-hub/` | 5 slide quà tặng |
| `src/lib/__tests__/navigation.test.ts` | Cập nhật danh sách mục Ways |
| `src/data/one/__tests__/fdiHub.test.ts` | Soát liên kết chéo, neo, prompt, nối vào cổng |
| `src/data/changelog/2026-09-08-fdi-hub-len-cong-one.ts` | Mục lịch sử phiên bản (`lon`, `bhy-ways`) |

---

## 5. Bước tiếp theo nên cân (chưa làm trong đợt này)

1. **Báo cáo nhanh chạy ngay trong cổng.** Cổng đã có hạ tầng AI (khu «Quản trị AI &
   Prompt», edge function). Thay vì sao chép prompt sang ChatGPT, có thể gọi thẳng và
   lưu kết quả thành «Hồ sơ tiếp cận» gắn với doanh nghiệp — khi đó mới cần bảng,
   RLS theo phòng, và là lúc tiến độ hành trình nên đi theo từng khách hàng thay vì
   theo trình duyệt. Đây là quyết định nghiệp vụ (chi phí gọi AI, dữ liệu khách hàng
   đưa vào mô hình nào) — cần Giám đốc chốt trước.
2. **Onepage thị trường định kỳ** — công cụ duy nhất còn thiếu trong kho. Có thể là
   một chuyên mục trong Bắc Hưng Yên Sharing để Tổ FDI đăng mỗi tuần, cán bộ lấy link
   gửi khách.
3. **Nội dung sửa được trên giao diện** cho Tổ FDI (giá quà, số điện thoại nhà cung
   cấp thay đổi thường xuyên) — theo cơ chế `EditableText` sẵn có của cổng, hoặc chuyển
   catalogue quà vào bảng khi làm mục 1.
4. **Đo dùng**: FDI Hub là cẩm nang, không sinh dữ liệu nên không tự biết ai đọc. Nếu
   cần biết, gắn vào Quizzi (câu hỏi theo cẩm nang) hoặc Training Center (chương trình
   hội nhập RM FDI) thay vì thêm đếm lượt xem.
