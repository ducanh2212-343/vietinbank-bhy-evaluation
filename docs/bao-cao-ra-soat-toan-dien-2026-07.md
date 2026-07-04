# BÁO CÁO RÀ SOÁT TOÀN DIỆN & TƯ VẤN TRIỂN KHAI
## Hệ thống "343 Phát triển nhân sự" — VietinBank CN Bắc Hưng Yên

**Ngày rà soát:** 04/07/2026
**Phạm vi:** Toàn bộ mã nguồn (178 file TS/TSX, ~40 trang chức năng, 13 edge functions, 46 bảng CSDL), cấu hình Supabase production, kết quả build/kiểm thử.
**Góc nhìn:** Chuyên gia triển khai thực tế đổi mới phát triển nhân sự ngành ngân hàng & chuyển đổi số.

---

## 1. ĐÁNH GIÁ TỔNG THỂ

Đây là một sản phẩm chuyển đổi số nội bộ **vượt xa mặt bằng chung của các công cụ tự phát cấp chi nhánh**. Hệ thống đã số hóa trọn vẹn chu trình phát triển nhân sự theo triết lý "343": khung 38 kỹ năng × 4 cấp độ gắn với 33 vị trí, 6 nhóm thái độ, đánh giá quý 3 cấp (Cán bộ → Trưởng phòng → PGĐ/BGĐ), IDP theo mô hình 70/20/10, Kanban hành động phát triển, phân nhóm sao 4 loại, KPI thời gian nộp, xuất biểu mẫu Word/Excel, và trợ lý AI cấu hình được.

**Mức độ trưởng thành hiện tại: phù hợp giai đoạn PILOT (1 chi nhánh, ~10-50 người dùng).** Để chuyển sang vận hành chính thức toàn chi nhánh (100-300 cán bộ, nhiều người thao tác đồng thời) cần xử lý một nhóm rủi ro tập trung ở **tầng lưu dữ liệu** (mất/ghi đè dữ liệu khi lưu), **hai điểm đứt gãy của vòng phát triển khép kín** (quản lý không duyệt được Kanban; lưu phiếu reset tiến độ Kanban), và **kiểm soát truy cập theo vòng đời nhân sự** (cán bộ nghỉ việc vẫn đăng nhập được).

Kết quả kiểm tra kỹ thuật nền: **TypeScript sạch, build thành công, 17/17 unit test pass**; toàn bộ 46 bảng production **đều bật RLS**, không có cảnh báo bảo mật mức ERROR từ Supabase.

---

## 2. NHỮNG ĐIỂM LÀM TỐT (nên giữ và nhân rộng)

1. **Máy trạng thái workflow được cưỡng chế ở tầng CSDL** — trigger `check_status_transition` chặn nhảy trạng thái tùy tiện kể cả khi gọi API trực tiếp; RLS chỉ cho cán bộ sửa phiếu ở trạng thái `draft/returned`. Đây là tư duy đúng: quy tắc nghiệp vụ nằm ở server, không chỉ ở giao diện.
2. **Mốc thời gian nộp/duyệt lần đầu được trigger bảo vệ** (`first_submitted/reviewed/approved`) → KPI nộp muộn đáng tin cậy, logic KPI tách riêng `src/lib/submissionKpi.ts` **có unit test đầy đủ** — hiếm thấy ở ứng dụng nội bộ.
3. **Ba kênh tạo tài khoản hội tụ về một hàm server duy nhất** (`createOrUpdateStaffUser`) với validate 2 lớp, idempotent theo email, audit log; bàn giao mật khẩu tạm qua tin nhắn soạn sẵn Zalo/SMS + buộc đổi mật khẩu lần đầu — rất thực tế với môi trường chi nhánh.
4. **Snapshot chuẩn năng lực vào từng phiếu** (`required_level` ghi vào `skill_assessments` lúc lưu) → chỉnh khung kỹ năng sau này không làm sai lệch phiếu đã duyệt trong quá khứ.
5. **Đồng bộ hành động → thẻ Kanban bằng trigger CSDL + RPC nguyên tử** với luồng hoàn thành có kỷ luật (bắt buộc kết quả + bằng chứng, chặn tự xác nhận), nhịp cập nhật tuần tính đúng múi giờ VN.
6. **Trợ lý AI thiết kế chuẩn mực:** bắt buộc đăng nhập, giới hạn tần suất theo người dùng/giờ, prompt quản trị được qua UI, hỗ trợ BYOK (Lovable/Gemini/OpenAI/tùy chỉnh), lọc vai trò hội thoại chống chèn system prompt.
7. **Phân quyền dữ liệu 2 lớp** (client scope + RLS server theo `can_view_profile`) và trigger `profiles_self_update_guard` chặn cán bộ tự sửa trường nhân sự nhạy cảm ngay tại DB.
8. **Báo cáo phủ đủ 3 cấp** (cá nhân — radar/xu hướng; trưởng phòng — đội ngũ; BGĐ/TCTH — toàn chi nhánh), xuất Excel đa sheet có ngữ cảnh, xuất Word BM01 dạng phôi in.

---

## 3. RỦI RO & LỖI CẦN XỬ LÝ (xếp theo ưu tiên triển khai)

> Các phát hiện đánh dấu ✔ đã được kiểm chứng trực tiếp trên mã nguồn/hạ tầng trong đợt rà soát này. Các phát hiện còn lại đều kèm dẫn chứng file:dòng để đội phát triển đối chiếu.

### P0 — Phải xử lý TRƯỚC kỳ đánh giá tới (rủi ro mất dữ liệu & đứt quy trình)

| # | Vấn đề | Dẫn chứng | Kịch bản thiệt hại |
|---|--------|-----------|---------------------|
| 1 | ✔ **Mọi lần lưu phiếu đều xóa-toàn-bộ-rồi-ghi-lại các bảng con, không có transaction** | `src/lib/evaluationPersistence.ts:185-195`; pattern lặp ở `SelfAssessmentPage.tsx:396-486`, `StaffEvaluation.tsx:565-704`, `ConfigCoreSkillsPage.tsx:85` | Mất mạng/lỗi giữa chừng sau bước delete → toàn bộ đánh giá 38 kỹ năng/6 thái độ/kế hoạch của quý bị xóa vĩnh viễn. Thao tác lặp hàng trăm lần mỗi quý. |
| 2 | ✔ **Không có màn hình nào cho quản lý duyệt/trả thẻ Kanban** — nút xác nhận chỉ hiện khi `!isOwner` nhưng mọi truy vấn Kanban đều chỉ lấy thẻ của chính người đăng nhập | `CardDetailDialog.tsx:86`; `PersonalKanbanPage.tsx:47`; `kanban.ts:196`; `PersonalKanbanMini` chỉ dùng ở `Overview.tsx:71` | Cán bộ bấm "Gửi hoàn thành" → thẻ treo "Chờ QL xác nhận" **vĩnh viễn**. Vòng phát triển khép kín — giá trị cốt lõi của hệ thống — bị đứt ở khâu cuối. |
| 3 | **Lưu phiếu (kể cả lưu nháp) reset toàn bộ tiến độ Kanban**: hành động bị xóa-tạo lại với UUID mới → trigger archive thẻ cũ, sinh thẻ mới 0% | `BMFormPage.tsx:530-585`, trigger archive tại migration `20260601031240:87-105` | Trưởng phòng sửa 1 câu nhận xét giữa quý → mọi thẻ Kanban của phiếu quay về "Phải làm" 0%, mất lịch sử tiến độ, kể cả thẻ đã được xác nhận hoàn thành. |
| 4 | ✔ **Lưu Tự đánh giá lỗi FK làm mất sạch hành động AI**: `linked_attitude_priority_id` không được remap sau khi priorities bị xóa-tạo lại (trong khi `linked_skill_priority_id` ngay dòng trên có remap) | `SelfAssessmentPage.tsx:482-486` (so với cách làm đúng ở `StaffEvaluation.tsx:695`) | TP gắn hành động AI với nhóm thái độ → cán bộ bấm lưu → lỗi "Lỗi khi lưu" + mục F biến mất (đã delete nhưng insert fail). |
| 5 | ✔ **Cán bộ nghỉ việc (status=inactive) vẫn đăng nhập và truy cập bình thường** — không nơi nào kiểm tra `profiles.status` khi xác thực | `useAuth.tsx` (không có kiểm tra status), `EditStaff.tsx:189` chỉ update cột status | Vi phạm nguyên tắc thu hồi quyền truy cập khi chấm dứt lao động — yêu cầu kiểm soát nội bộ cơ bản của ngân hàng. Nếu là trưởng phòng cũ còn role manager thì vẫn xem được dữ liệu cả phòng. |
| 6 | ✔ **26 hàm SECURITY DEFINER gọi được bởi người CHƯA đăng nhập (anon)** qua REST API — gồm thao tác hàng đợi email (`enqueue_email`, `delete_email`, `read_email_batch`, `move_to_dlq`) và Kanban (`move_kanban_card`, `kanban_upsert_card`…) | Supabase Security Advisor production (61 cảnh báo WARN) | Bất kỳ ai có anon key (nằm trong bundle JS công khai) có thể bơm/xóa email trong hàng đợi, thao tác thẻ Kanban. Sửa nhanh bằng `REVOKE EXECUTE ... FROM anon;`. |
| 7 | ✔ **`form_submissions` không có UNIQUE(employee_id, cycle_id)** + mẫu select-rồi-insert phía client | So sánh: `admin_evaluations` và `staff_star_classifications` đều có UNIQUE; `evaluationPersistence.ts:40-64` | 2 thiết bị/2 người cùng lưu lần đầu → 2 phiếu song song cho cùng cán bộ cùng quý; mỗi lần load trúng phiếu khác nhau, TP duyệt phiếu này trong khi cán bộ điền phiếu kia. |

### P1 — Xử lý trong 30-60 ngày (liêm chính đánh giá & nhất quán số liệu)

| # | Vấn đề | Dẫn chứng |
|---|--------|-----------|
| 8 | ✔ **Ở chế độ Trưởng phòng vẫn sửa được cột TỰ đánh giá, minh chứng, nhận xét của cán bộ** (ô "Tự đánh giá (NV)" không có `disabled`, trong khi ô của quản lý có) — sửa không để lại dấu vết, vi phạm liêm chính đánh giá | `EvalSectionB.tsx:266-275` (đối chiếu dòng 282), tương tự `EvalSectionC` |
| 9 | **Không có khóa lạc quan**: tab cũ/2 người cùng sửa ghi đè lẫn nhau; RLS bảng con không khóa theo trạng thái phiếu → có thể ghi đè nội dung phiếu **đã duyệt** từ tab cũ, toast vẫn báo "Đã lưu" | `StaffEvaluation.tsx:558`, RLS migration `20260415143314` |
| 10 | **Hai nguồn dữ liệu xếp sao song song**: Báo cáo đọc `staff_star_classifications` (mới), còn Tổng quan/Phân nhóm/Đội ngũ/Danh sách đọc `admin_evaluations` (cũ) → số liệu 4 nhóm sao giữa các trang mâu thuẫn; StaffGrouping không lọc theo kỳ nên 1 cán bộ xuất hiện nhiều ô sau 2+ quý; tile "Chưa phân nhóm" có thể ra số âm | `StaffGrouping.tsx:30`, `Overview.tsx:155-170`, `TeamOverview.tsx:34`, `StaffList.tsx:59` vs `ReportsPage.tsx:142` |
| 11 | **Sửa email trong EditStaff không đồng bộ email đăng nhập Auth** → cán bộ bị khóa ngoài hệ thống thực tế; import Excel với email cũ còn âm thầm đảo ngược chỉnh sửa | `EditStaff.tsx:178-191` |
| 12 | **Xác nhận rà soát vẫn chuyển "reviewed" dù lưu nội dung thất bại** (handleSave nuốt lỗi) → PGĐ duyệt trên dữ liệu cũ/thiếu | `StaffEvaluation.tsx:746-760` |
| 13 | **Cán bộ không thấy lý do trả lại trên trang Tự đánh giá** (`return_reason` không nằm trong câu SELECT) → sửa mò | `evaluationPersistence.ts:29-30` |
| 14 | **Đường nộp phụ qua /danh-gia/:id bỏ qua toàn bộ validate và không gán người đánh giá**; tùy chọn "GĐCN tự duyệt" không có đường duyệt → phiếu kẹt vĩnh viễn ở "submitted" | `StaffEvaluation.tsx:1140-1151`; `SelfAssessmentPage.tsx:140-142`, `reviewerScope.ts:30` |
| 15 | **Kỳ đánh giá không được khóa theo vòng đời**: kỳ đã đóng vẫn nộp/duyệt được; kỳ tạo trước tự thành kỳ mặc định của mọi người (tạo sẵn Quý IV giữa Quý III → toàn chi nhánh điền nhầm kỳ) | `evaluationCycles.ts:25-26`, `CycleManagementPage.tsx:149` |
| 16 | **Import khóa học VTB chế độ Replace xóa dữ liệu TRƯỚC khi ghi + nuốt lỗi từng dòng**, báo "thành công N khóa" theo số dòng đầu vào | `VtbCoursesAdminPage.tsx:658-683` |
| 17 | **Chuyển phòng/nghỉ việc không xử lý dây quản lý cấp dưới** (manager_id/pgd_id vẫn trỏ người đã đi) → phiếu quý sau chảy về người ngoài phòng; không có công cụ gán lại hàng loạt | `EditStaff.tsx:164-199` |
| 18 | **Xóa vĩnh viễn cán bộ hủy toàn bộ lịch sử đánh giá, không có gói lưu trữ/soft-delete** — trái thông lệ lưu trữ hồ sơ nhân sự ngân hàng (phục vụ thanh tra, kiểm toán nội bộ) | migration `20260703150000` |

### P2 — Cải thiện chất lượng (60-90 ngày)

- **Báo cáo tính toàn bộ ở client + nuốt lỗi truy vấn**: `ReportsPage.loadCycleData` không kiểm tra `.error` nào → khi truy vấn lỗi, mọi tile hiện **0 như dữ liệu thật**; `SubmissionTimeReportPage` tải trọn `form_submissions` mọi kỳ; `.in('form_id', [200-300 UUID])` có nguy cơ vượt giới hạn URL (`ReportsPage.tsx:133-181`, `SubmissionTimeReportPage.tsx:137-139`).
- **Mô hình 70/20/10 mới chỉ là nhãn** (mặc định '70', không ràng buộc cơ cấu, hiển thị "70%" dễ nhầm tiến độ); **giới hạn 3 kỹ năng trọng tâm chỉ chặn ở client**, carry-over có thể đẩy vượt 3 — phá quy tắc "343" trên biểu mẫu in.
- **Vòng ngược Kanban → phiếu chưa khép**: kết quả xác nhận trên Kanban không ghi về bảng hành động nguồn; kỳ sau cán bộ khai lại từ đầu ở mục "Rà soát hành động kỳ trước".
- **Các trang dữ liệu chết còn sống qua route**: `/ke-hoach-phat-trien` đọc `admin_evaluations.priority_skill_ids` không còn được ghi (luôn trống/lỗi thời); `/thai-do-tu-duy`, `/skill-bo-sung` là placeholder tĩnh.
- **Không có cơ chế thông báo chủ động**: `next_update_due_at`, cờ "Cần hỗ trợ", sự kiện "chờ xác nhận" không có job/email nào tiêu thụ — mọi tín hiệu phụ thuộc người dùng tự mở app (hạ tầng email queue đã có sẵn, chưa được nối).
- **Nhận diện vai trò bằng so khớp chuỗi tiếng Việt** ("tổ chức" cho phòng TCTH, `startsWith` chức danh cho lãnh đạo) — dễ vỡ khi đổi tên; nên chuyển thành cờ cấu trúc trong bảng `positions`/`departments`.
- **Hiệu năng RLS production**: 85 policy dùng `auth.uid()` bị đánh giá lại từng dòng (sửa hàng loạt bằng `(select auth.uid())`), 91 cảnh báo nhiều permissive policy trùng role/action, 35 FK chưa có index (nặng nhất: `profiles` 5 FK). Chưa đau ở quy mô pilot, sẽ đau ở quy mô 300 người × nhiều quý.
- **Kiểm thử mỏng**: 17 test cho 2 module thuần túy; toàn bộ workflow đánh giá, persistence, Kanban chưa có test. Bundle chính 560KB (chưa tách vendor chunks).
- Upload Excel cán bộ: chưa bắt email trùng giữa các dòng trong cùng file; thiếu alias cột "Số điện thoại"; bảng nhập hàng loạt cho gán `system_admin` không có bước xác nhận.

---

## 4. GÓC NHÌN CHUYÊN GIA: ĐỐI CHIẾU THỰC TIỄN NGÀNH NGÂN HÀNG

### 4.1. Về thiết kế nghiệp vụ — hệ thống đang đi ĐÚNG hướng

So với thực tiễn triển khai khung năng lực tại các ngân hàng Việt Nam (thường dừng ở file Excel khung năng lực + đánh giá cuối năm trên giấy), hệ thống này có 3 lựa chọn thiết kế đáng khen:

- **Đánh giá theo QUÝ gắn trực tiếp với hành động phát triển** thay vì đánh giá thành tích cuối năm — đúng xu hướng "continuous performance management" mà các ngân hàng khu vực (DBS, UOB) đã chuyển sang từ 2018-2020.
- **Tách "đánh giá năng lực" khỏi "xếp loại thành tích"** (skill/attitude riêng, phân nhóm sao riêng, quy trình duyệt riêng) — tránh được lỗi phổ biến nhất khi số hóa HR là trộn hai mục đích khiến cán bộ khai man năng lực để giữ lương thưởng.
- **IDP 70/20/10 sinh ra việc theo dõi được (Kanban + nhịp tuần)** — biến kế hoạch phát triển từ "văn bản để đấy" thành việc có deadline, có bằng chứng, có người xác nhận.

### 4.2. Ba đứt gãy phải khép lại để mô hình "343" chạy thật

1. **Đứt ở khâu xác nhận:** cán bộ gửi hoàn thành nhưng quản lý không có màn hình duyệt (P0-2). Kinh nghiệm triển khai: đây là điểm chết niềm tin — sau 2-3 lần gửi mà không ai xác nhận, cán bộ ngừng cập nhật Kanban và hệ thống trở lại thành "form nộp cho có". Cần ưu tiên số 1.
2. **Đứt ở tính liên tục dữ liệu:** lưu phiếu reset tiến độ Kanban (P0-3). Cán bộ mất tiến độ 75% chỉ vì trưởng phòng sửa một câu nhận xét — một lần xảy ra là đủ lan tin xấu toàn chi nhánh.
3. **Đứt ở vòng ngược:** kết quả Kanban không tự chảy về mục "Rà soát hành động kỳ trước" của quý sau — cán bộ phải khai lại thủ công thứ hệ thống đã biết. Khép được vòng này thì chi phí nhập liệu mỗi quý giảm hẳn và số liệu "% hoàn thành kế hoạch kỳ trước" trên báo cáo mới đáng tin.

### 4.3. Vận hành theo vòng đời nhân sự — bài kiểm tra thật của mọi hệ thống HR chi nhánh

Nhân sự chi nhánh ngân hàng biến động liên tục (điều chuyển giữa phòng/PGD, bổ nhiệm, nghỉ việc, luân chuyển cán bộ theo quy định). Hệ thống hiện xử lý tốt lúc **tạo** người nhưng yếu lúc **người thay đổi**:

- Nghỉ việc → vẫn đăng nhập được (P0-5); chỉ có lựa chọn xóa vĩnh viễn (mất lịch sử — P1-18).
- Chuyển phòng → dây quản lý của cấp dưới đứt âm thầm (P1-17).
- Đổi email → khóa tài khoản ngoài ý muốn (P1-11).

**Khuyến nghị:** xây gói "Bàn giao nhân sự" như một quy trình chuẩn: khi đổi status/phòng/quản lý, hệ thống hiển thị danh sách người & phiếu bị ảnh hưởng, cho gán lại hàng loạt, tự ban tài khoản Auth khi inactive, và xuất gói lưu trữ trước mọi thao tác xóa.

### 4.4. Tuân thủ & quản trị dữ liệu — việc cần làm TRƯỚC khi nhân rộng

Ở quy mô pilot sáng kiến chi nhánh, mức hiện tại chấp nhận được. Trước khi mở rộng chính thức, cần rà soát 4 điểm theo khung tuân thủ ngân hàng:

1. **Dữ liệu cá nhân cán bộ đang lưu ở hạ tầng cloud nước ngoài** (Supabase region ap-south-1 — Mumbai; deploy Vercel). Theo Nghị định 13/2023/NĐ-CP, việc chuyển/lưu dữ liệu cá nhân ra nước ngoài cần hồ sơ đánh giá tác động (TIA) gửi A05; với tổ chức tín dụng còn chịu quy định an toàn hệ thống thông tin của NHNN (Thông tư 09/2020/TT-NHNN) khi hệ thống được xếp loại. Đánh giá nội dung: dữ liệu gồm họ tên, email, SĐT, ngày sinh, vị trí, toàn bộ nhận xét đánh giá năng lực — là dữ liệu cá nhân cần bảo vệ.
2. **Nội dung đánh giá được gửi sang dịch vụ AI bên thứ ba** (Lovable gateway/Gemini/OpenAI tùy cấu hình) ở các tính năng coach/tóm tắt/chân dung năng lực — gồm minh chứng, nhận xét của nhân viên và quản lý. Cần: (a) văn bản hóa việc này trong thông báo xử lý dữ liệu nội bộ, (b) quy ước không đưa dữ liệu khách hàng vào ô minh chứng/nhận xét, (c) cân nhắc ẩn danh hóa (bỏ họ tên, mã CB) trước khi gửi AI.
3. **Audit trail chưa đủ cho chuẩn ngân hàng**: bảng `audit_logs` mới ghi thao tác tạo/xóa tài khoản; các thay đổi nội dung phiếu sau khi nộp (kể cả việc TP sửa được cột tự đánh giá — P1-8) không để lại dấu vết. Chuẩn tối thiểu: log mọi thay đổi phiếu từ trạng thái `submitted` trở đi (ai, lúc nào, trường nào, giá trị cũ/mới).
4. **Vệ sinh bảo mật nhanh, chi phí thấp**: `REVOKE EXECUTE FROM anon` cho 26 hàm SECURITY DEFINER; bật Leaked Password Protection trong Supabase Auth; siết policy SELECT trên 2 bucket public (`avatars`, `skill-images`); cân nhắc bật MFA cho tài khoản system_admin/BGĐ.

### 4.5. Chiến lược nhân rộng (nếu pilot thành công)

- **Giai đoạn 1 (hiện tại):** hoàn thiện P0/P1, chạy trọn 1-2 kỳ quý tại CN Bắc Hưng Yên, đo bằng chính KPI của hệ thống (% nộp đúng hạn, % hành động hoàn thành có xác nhận, tần suất cập nhật Kanban).
- **Giai đoạn 2:** chuẩn hóa thành "sản phẩm" — tách cấu hình chi nhánh (phòng ban, vị trí, khung skill) khỏi mã nguồn; hiện `departments/positions` đã là dữ liệu nên nền tảng đa chi nhánh khá gần, nhưng cần thêm chiều `branch_id` xuyên suốt schema và RLS trước khi có chi nhánh thứ hai.
- **Giai đoạn 3:** nếu nhân rộng cấp khu vực/hệ thống — đặt vấn đề với Khối CNTT & Trường ĐT VietinBank về: SSO/AD tập trung thay tài khoản email tự quản, chuyển hạ tầng về môi trường được ngân hàng phê duyệt, tích hợp danh mục khóa học chính thức (hiện đã có sẵn module quản trị khóa học VTB + mapping vị trí/kỹ năng — đây là điểm cộng lớn khi trình bày với Trường ĐT).

---

## 5. LỘ TRÌNH HÀNH ĐỘNG KHUYẾN NGHỊ

### Tuần 1-2 (việc nhỏ, chặn rủi ro lớn)
1. `REVOKE EXECUTE FROM anon` cho 26 hàm SECURITY DEFINER; bật Leaked Password Protection. *(nửa ngày)*
2. Thêm UNIQUE(employee_id, cycle_id) cho `form_submissions` (kèm dọn trùng nếu có). *(nửa ngày)*
3. Sửa remap `linked_attitude_priority_id` ở SelfAssessmentPage (copy cách làm của StaffEvaluation). *(1 giờ)*
4. Chặn đăng nhập khi `profiles.status != 'active'` (kiểm tra trong useAuth + ban Auth khi đổi status). *(1 ngày)*
5. Đưa `return_reason` vào SELECT và hiển thị cho cán bộ khi phiếu bị trả. *(nửa ngày)*
6. Disable các ô thuộc về cán bộ khi ở chế độ Trưởng phòng (EvalSectionB/C). *(nửa ngày)*

### Tuần 3-6 (gia cố nền)
7. Chuyển toàn bộ persistAllData sang **một RPC Postgres chạy trong transaction**, upsert theo khóa tự nhiên thay vì delete-all + reinsert — đồng thời giải quyết luôn việc Kanban bị reset (giữ nguyên UUID hành động). Đây là hạng mục kỹ thuật quan trọng nhất của cả đợt.
8. Xây **màn hình duyệt Kanban cho quản lý** (tab "Hành động của phòng" + hàng đợi "Chờ xác nhận"; RLS và RPC backend đã sẵn sàng).
9. Khóa lạc quan (`.eq('updated_at', loadedAt)`) + RLS bảng con theo trạng thái phiếu.
10. Hợp nhất nguồn xếp sao về `staff_star_classifications` cho mọi trang; thêm bộ lọc kỳ cho Phân nhóm cán bộ.
11. Khóa vòng đời kỳ: chặn nộp/duyệt kỳ đóng; kỳ mặc định = kỳ `in_progress` chứa ngày hiện tại; trạng thái "Chuẩn bị" khi tạo trước.

### Tuần 7-12 (khép vòng & chuyên nghiệp hóa)
12. Vòng ngược Kanban → phiếu: xác nhận hoàn thành ghi về bảng hành động nguồn; prefill "Rà soát hành động kỳ trước" từ kanban_cards.
13. Nối hạ tầng email sẵn có vào sự kiện: phiếu bị trả, chờ duyệt quá N ngày, thẻ chờ xác nhận, cờ "cần hỗ trợ".
14. Gói "Bàn giao nhân sự" (mục 4.3) + xuất gói lưu trữ trước khi xóa.
15. Audit log thay đổi phiếu sau nộp; báo cáo bổ sung: xu hướng chi nhánh qua các quý, thời gian xử lý từng chặng, dịch chuyển nhóm sao giữa 2 kỳ, GAP kỹ năng theo cán bộ phục vụ kế hoạch đào tạo.
16. Tối ưu RLS theo khuyến cáo advisor (bọc `(select auth.uid())`, gộp policy, index FK) + chuyển tổng hợp báo cáo nặng về view/RPC phía server.

---

## 6. PHỤ LỤC KỸ THUẬT

- **Build:** `vite build` thành công; cảnh báo chunk > 500KB (index 560KB) — nên tách manualChunks khi tối ưu.
- **Typecheck:** `tsc --noEmit` sạch. **Test:** 17/17 pass (submissionKpi 14, exportBM01 2, example 1).
- **Supabase production** (project `chieuthuc3-bachungyen`, ap-south-1): 46/46 bảng bật RLS; Security Advisor 61 WARN (0 ERROR): 26 hàm anon-callable, 28 hàm authenticated-callable SECURITY DEFINER, 4 hàm mutable search_path, 2 bucket public cho phép liệt kê, chưa bật leaked-password protection. Performance Advisor 224 cảnh báo: 85 auth_rls_initplan, 91 multiple_permissive_policies, 35 FK thiếu index, 13 index chưa dùng.
- **Lưu ý cấu hình:** `supabase/config.toml` trỏ `project_id = ycldnyjohittetvpoezj` khác với project production đang chạy (`whlysprzsguehxmrjwha`) — cần xác nhận môi trường nào là chuẩn để migration/edge function không lệch nhau.
