# ĐẶC TẢ BỘ TIÊU CHÍ ĐÁNH GIÁ
## Khu 4 — CHIÊU THỨC 3: HỘI ĐỒNG ĐÁNH GIÁ ĐẦU MỐI
**Hệ thống:** Cổng nội bộ Bắc Hưng Yên ONE · **Đơn vị:** VietinBank Chi nhánh Bắc Hưng Yên
**Phiên bản:** v1.0 — 17/08/2026 · **Đầu mối vận hành:** Phòng Tổ chức Tổng hợp (TCTH)
**Phạm vi tài liệu:** *bộ tiêu chí* (bộ câu hỏi định hướng) — không phải toàn bộ module.

> Tài liệu này đặc tả **thứ đang chạy trên hệ thống**, đối chiếu từng điểm với mã nguồn.
> Cơ chế trọng số, phân quyền xem báo cáo, embargo, email và quy trình vận hành từng kỳ
> đã có ở [`danh-gia-dau-moi-hoi-dong-2026-07.md`](./danh-gia-dau-moi-hoi-dong-2026-07.md) —
> ở đây chỉ nhắc lại phần nào ảnh hưởng trực tiếp tới tiêu chí.

---

## 0. TÓM TẮT ĐIỀU HÀNH — 6 quyết định thiết kế cốt lõi

| # | Quyết định | Lý do (trade-off đã cân nhắc) |
|---|---|---|
| 1 | **Bộ tiêu chí thuộc về KỲ, không thuộc về hệ thống** | Mỗi kỳ (`council_rounds`) có bộ tiêu chí riêng trong `council_criteria`. Sửa bộ câu hỏi Quý III không đụng tới điểm đã chấm của Quý II. Cái giá phải trả: phải sao chép hoặc khởi tạo bộ tiêu chí cho mỗi kỳ mới — đổi lại lịch sử đánh giá bất biến. |
| 2 | **Người chấm chọn HÀNH VI trước, chọn ĐIỂM sau** | Phiếu hiện 5 mô tả chuẩn hành vi; bấm vào mô tả sát thực tế nhất thì hệ thống tự điền mốc điểm, sau đó mới tinh chỉnh trên thang 10 nấc. Nếu để người chấm nhìn thẳng vào con số, điểm sẽ trôi về vùng an toàn 7–8 và mất khả năng phân biệt. |
| 3 | **Thang chấm 10 nấc (1–10), nhưng chuẩn hành vi chỉ 5 mốc (10/8/6/3/0)** | 5 mốc đủ để mô tả hành vi mà không rơi vào chẻ chữ; 10 nấc đủ để phân biệt hai cán bộ cùng mức. Nấc là **rời rạc**, không có điểm lẻ. |
| 4 | **Điểm rất cao và rất thấp phải trả giá bằng minh chứng** | Chấm 10 hoặc ≤ 3 thì bắt buộc nhập minh chứng **ngay tại tiêu chí đó** mới gửi được phiếu. Đây là cơ chế duy nhất chống cả hai chiều: nể nang cho điểm tuyệt đối và trù dập cho điểm sàn. |
| 5 | **Điểm gắn theo ID tiêu chí, không theo thứ tự hay tên** | Sửa tên, sửa mô tả, đổi thứ tự tiêu chí **không làm mất điểm đã chấm**. Chỉ xóa tiêu chí mới xóa điểm. Nhờ vậy Hội đồng dám sửa câu chữ giữa kỳ khi phát hiện diễn đạt gây hiểu nhầm. |
| 6 | **Hai phần điểm không cộng dồn theo tỷ lệ, mà bình quân ngang nhau** | Phần I (Năng lực) và Phần II (Hiệu quả) mỗi phần 5 tiêu chí, điểm phiếu là trung bình cộng cả 10 tiêu chí — tức mỗi phần chiếm đúng 50%. Không đặt trọng số giữa hai phần vì Chi nhánh chưa có căn cứ để nói năng lực quan trọng hơn hay kém hiệu quả. |

**Rủi ro lớn nhất cần phòng ngừa:** bộ tiêu chí này rất dễ trở thành *thủ tục điền phiếu*. Nếu thành viên Hội đồng chấm mà không đọc chuẩn hành vi, toàn bộ 10 tiêu chí sẽ hội tụ về cùng một con số và báo cáo mất sạch giá trị phân biệt. Ba cơ chế đối phó đã cài trong sản phẩm: (a) mô tả hành vi hiện **trước** thang điểm; (b) minh chứng bắt buộc ở hai đầu thang; (c) báo cáo vẽ **điểm trung bình từng tiêu chí** theo hai phần, nên tiêu chí nào cũng bằng nhau là nhìn thấy ngay.

---

## 1. PHẠM VI VÀ CĂN CỨ

### 1.1. Bộ tiêu chí dùng để làm gì

Bộ tiêu chí là **bộ câu hỏi định hướng** để thành viên Hội đồng chấm điểm **năng lực thực thi công tác đầu mối** của cán bộ được phân công đầu mối tại Chi nhánh — không phải đánh giá toàn diện cán bộ, không thay thế đánh giá KPI chuyên môn.

Việc chấm điểm dựa trên bốn nguồn, theo đúng câu ghi trên phiếu:
báo cáo tự đánh giá · hồ sơ minh chứng · nội dung trình bày tại phiên họp Hội đồng · kết quả thực tế.

### 1.2. Căn cứ xây dựng

| Tài liệu Chi nhánh | Nội dung lấy vào bộ tiêu chí |
|---|---|
| **Cơ chế đánh giá Hội đồng đối với công tác đầu mối** | Kết cấu 2 phần; quy tắc minh chứng bắt buộc ở điểm rất cao/rất thấp (mục I.3); bảng trọng số theo cấp (mục III) |
| **Phụ lục 1C — Bảng tổng hợp nhiệm vụ công tác đầu mối** (Thông báo 25/06/2026) | Danh sách 6 cán bộ đầu mối, nhiệm vụ trọng tâm và phương thức đo lường |
| **Mẫu phiếu đánh giá, chấm điểm thành viên Hội đồng** | 10 tiêu chí, thang 10, 5 mốc chuẩn hành vi; 3 mục nhận xét (ưu điểm/hạn chế/đề xuất) |
| **Mẫu Báo cáo kết quả đánh giá chi tiết có xử lý trọng số** (Quý 1/2026) | Cách quy thang 100 và chuẩn hóa theo tổng trọng số hiện có |

### 1.3. Ai chạm vào bộ tiêu chí

| Vai trò | Quyền với bộ tiêu chí |
|---|---|
| **Quản trị** (System admin / TCTH admin) | Toàn quyền tại `/quan-tri-hoi-dong-dau-moi` → tab **Bộ câu hỏi**: khởi tạo, thêm, sửa, đổi thứ tự, bật/tắt hiệu lực, xóa, sao chép từ kỳ khác |
| **Thành viên Hội đồng** | Chỉ **đọc** bộ tiêu chí đang hiệu lực của kỳ đang mở, khi chấm phiếu tại `/danh-gia-dau-moi` |
| **Cán bộ đầu mối** | Thấy tên tiêu chí trong báo cáo kết quả của chính mình (điểm trung bình từng tiêu chí) |
| **Phó Giám đốc** | Không quản trị tiêu chí (đã hạ khỏi quyền admin); chỉ đọc như thành viên Hội đồng |

---

## 2. KẾT CẤU BỘ TIÊU CHÍ

### 2.1. Hai phần, mười tiêu chí

```
Bộ câu hỏi của một kỳ
├── Phần I  — Năng lực triển khai công tác đầu mối   (section = 'nang_luc')
│     TC1 · TC2 · TC3 · TC4 · TC5
└── Phần II — Hiệu quả công tác đầu mối              (section = 'hieu_qua')
      TC6 · TC7 · TC8 · TC9 · TC10
```

- Nhãn phần khai tại `SECTION_LABELS` (`src/lib/council.ts`); mã phần chỉ có **hai giá trị hợp lệ**, ràng buộc bằng `CHECK` ở tầng CSDL.
- **Số lượng tiêu chí mỗi phần KHÔNG bị ràng buộc cứng.** Bộ mặc định là 5 + 5, nhưng quản trị thêm/bớt tự do. Hệ quả cần biết: điểm phiếu là trung bình **toàn bộ** tiêu chí hiệu lực, nên nếu Phần I có 7 tiêu chí và Phần II có 3, Phần I sẽ chiếm 70% trọng lượng. Muốn giữ cân bằng 50/50 thì phải giữ số tiêu chí hai phần bằng nhau.

### 2.2. Cấu trúc một tiêu chí

| Trường | Bắt buộc | Vai trò |
|---|---|---|
| `criterion_key` | ✔ | Mã ổn định trong kỳ (`tc1`…`tc10`). Duy nhất theo cặp `(round_id, criterion_key)`. Dùng để đối chiếu giữa các kỳ, **không** dùng để gắn điểm. |
| `section` | ✔ | `nang_luc` hoặc `hieu_qua` |
| `title` | ✔ | Tên tiêu chí — dòng người chấm đọc đầu tiên. Chặn lưu nếu để trống. |
| `description` | | Mô tả ngắn làm rõ phạm vi tiêu chí |
| `anchor_10` / `anchor_8` / `anchor_6` / `anchor_3` / `anchor_0` | | 5 mô tả chuẩn hành vi tham chiếu |
| `sort_order` | ✔ | Thứ tự hiển thị, ghi lại bằng chỉ số dòng mỗi lần lưu |
| `is_active` | ✔ | Cờ hiệu lực — xem §5.3 |

**Chuẩn hành vi tuy không bắt buộc ở tầng CSDL nhưng bắt buộc về nghiệp vụ.** Tiêu chí thiếu chuẩn hành vi vẫn lưu được, nhưng trên phiếu chấm sẽ không hiện mô tả nào để bấm (mã nguồn bỏ qua mốc rỗng), người chấm buộc phải chấm số trần — đúng thứ quyết định thiết kế #2 muốn tránh. **Thêm tiêu chí mới thì viết đủ 5 mốc.**

---

## 3. NỘI DUNG BỘ TIÊU CHÍ MẶC ĐỊNH

Nguồn chuẩn: `src/lib/councilDefaults.ts` (`DEFAULT_COUNCIL_CRITERIA`). Đây là bộ được nạp khi bấm **"Khởi tạo từ bộ mặc định (10 tiêu chí)"**.

### PHẦN I — NĂNG LỰC TRIỂN KHAI CÔNG TÁC ĐẦU MỐI

#### TC1 — Chủ động đề xuất và dẫn dắt triển khai
*Chủ động đưa ra giải pháp mới, dẫn dắt các phòng ban, đơn vị triển khai thực hiện nhiệm vụ đầu mối.*

| Mốc | Chuẩn hành vi |
|---|---|
| **10đ** | Chủ động nhận diện vấn đề/cơ hội trước yêu cầu; đề xuất giải pháp có căn cứ dữ liệu; xây dựng lộ trình rõ ràng; tạo đồng thuận cao và dẫn dắt triển khai hiệu quả. |
| **8đ** | Chủ động đề xuất sáng kiến khi phát sinh yêu cầu; giải pháp phù hợp; triển khai đúng kế hoạch; được các bên liên quan ủng hộ. |
| **6đ** | Có đề xuất cải tiến nhưng chưa thường xuyên; chủ yếu triển khai theo chỉ đạo; mức độ dẫn dắt còn hạn chế. |
| **3đ** | Ít đề xuất; thường chờ hướng dẫn; triển khai bị động và phụ thuộc nhiều vào cấp trên. |
| **0đ** | Không đề xuất giải pháp; không tạo được thay đổi hoặc không tham gia dẫn dắt. |

#### TC2 — Khả năng điều hành và tổ chức thực hiện
*Tổ chức công việc một cách khoa học; phân công và giao việc rõ ràng, theo dõi và đôn đốc sát sao quá trình thực hiện.*

| Mốc | Chuẩn hành vi |
|---|---|
| **10đ** | Lập kế hoạch chi tiết, phân công rõ trách nhiệm, kiểm soát tiến độ thường xuyên, xử lý vướng mắc kịp thời, hoàn thành vượt tiến độ. |
| **8đ** | Điều hành hiệu quả; phân công tương đối rõ; kiểm soát tiến độ tốt; hoàn thành đúng hạn. |
| **6đ** | Tổ chức triển khai đáp ứng yêu cầu cơ bản nhưng theo dõi chưa thường xuyên; cần nhắc việc. |
| **3đ** | Điều hành thiếu kiểm soát; phân công chưa rõ; tiến độ chậm hoặc phải điều chỉnh nhiều lần. |
| **0đ** | Không tổ chức được hoạt động; tiến độ kéo dài hoặc không hoàn thành. |

#### TC3 — Điều phối và phối hợp liên phòng
*Khả năng kết nối, điều phối và thúc đẩy sự hợp tác tích cực giữa các phòng ban liên quan trong chi nhánh.*

| Mốc | Chuẩn hành vi |
|---|---|
| **10đ** | Thiết lập cơ chế phối hợp hiệu quả; duy trì trao đổi thường xuyên; xử lý xung đột nhanh; các đơn vị phối hợp tích cực. |
| **8đ** | Phối hợp tốt với đa số đơn vị; giải quyết được hầu hết vướng mắc phát sinh. |
| **6đ** | Có phối hợp nhưng chưa đồng đều; còn phụ thuộc vào hỗ trợ của lãnh đạo. |
| **3đ** | Phối hợp hạn chế; phản hồi chậm; còn phát sinh bất đồng kéo dài. |
| **0đ** | Không tạo được sự phối hợp; công việc bị đình trệ do thiếu kết nối. |

#### TC4 — Khả năng giải quyết vấn đề
*Nhận diện vấn đề nhanh nhạy, đưa ra giải pháp xử lý triệt để các vướng mắc phát sinh trong thẩm quyền.*

| Mốc | Chuẩn hành vi |
|---|---|
| **10đ** | Nhanh chóng xác định nguyên nhân gốc; đưa ra phương án khả thi; xử lý triệt để; hạn chế tái diễn rủi ro. |
| **8đ** | Giải quyết tốt phần lớn vấn đề; lựa chọn giải pháp phù hợp; ít phát sinh hệ quả. |
| **6đ** | Giải quyết được các vấn đề thông thường nhưng còn chậm với tình huống phức tạp. |
| **3đ** | Xử lý bị động; giải pháp thiếu hiệu quả; vấn đề tái diễn nhiều lần. |
| **0đ** | Không xác định được nguyên nhân hoặc không xử lý được vấn đề. |

#### TC5 — Tạo động lực và phát triển đội ngũ
*Truyền cảm hứng, tạo tinh thần đồng lòng tích cực; phát hiện và phát triển năng lực của đội ngũ kế cận.*

| Mốc | Chuẩn hành vi |
|---|---|
| **10đ** | Truyền cảm hứng, khuyến khích tham gia; xây dựng đội ngũ kế cận; tạo môi trường tích cực và chủ động học hỏi. |
| **8đ** | Tạo được sự đồng thuận; khuyến khích phối hợp; duy trì tinh thần làm việc tích cực. |
| **6đ** | Có tác động tích cực nhưng chưa rõ nét; mức độ tham gia của đội ngũ chưa cao. |
| **3đ** | Khả năng tạo động lực hạn chế; nhân sự tham gia mang tính đối phó. |
| **0đ** | Không tạo được sự gắn kết hoặc ảnh hưởng tích cực. |

### PHẦN II — HIỆU QUẢ CÔNG TÁC ĐẦU MỐI

#### TC6 — Nhận diện vấn đề và cơ hội cải thiện
*Khả năng phân tích thực trạng, sử dụng dữ liệu, xác định đúng nguyên nhân gốc và trọng tâm cần cải thiện.*

| Mốc | Chuẩn hành vi |
|---|---|
| **10đ** | Phân tích đầy đủ bằng số liệu; xác định đúng nguyên nhân gốc; chỉ rõ cơ hội cải thiện và ưu tiên hành động. |
| **8đ** | Phân tích tương đối đầy đủ; xác định được phần lớn nguyên nhân và cơ hội cải thiện. |
| **6đ** | Có phân tích nhưng còn thiên về hiện tượng; chưa làm rõ nguyên nhân cốt lõi. |
| **3đ** | Đánh giá sơ sài; thiếu dữ liệu; chưa xác định đúng trọng tâm. |
| **0đ** | Không phân tích hoặc nhận diện sai vấn đề. |

#### TC7 — Xây dựng giải pháp và kế hoạch triển khai
*Xây dựng giải pháp/kế hoạch hành động triển khai rõ ràng, khả thi, mục tiêu cụ thể và xác định được các chủ thể 5W2H.*

| Mốc | Chuẩn hành vi |
|---|---|
| **10đ** | Kế hoạch đầy đủ theo 5W2H; mục tiêu định lượng rõ; nguồn lực, tiến độ và trách nhiệm xác định cụ thể. |
| **8đ** | Có kế hoạch khả thi; mục tiêu rõ; phân công tương đối đầy đủ. |
| **6đ** | Có kế hoạch nhưng thiếu một số nội dung như thời hạn, nguồn lực hoặc chỉ tiêu. |
| **3đ** | Kế hoạch sơ sài; mục tiêu chưa rõ; khó triển khai thực tế. |
| **0đ** | Không xây dựng kế hoạch hoặc kế hoạch không sử dụng được. |

> **Neo với Chiêu thức 2.** TC7 chấm đúng thứ Kanban Kế hoạch hành động đang bắt điền (5W2H) và TC8 chấm đúng nhịp PDCA. Cán bộ đầu mối vận hành nghiêm túc bảng Kanban của mình thì hồ sơ minh chứng cho hai tiêu chí này có sẵn, không phải dựng riêng.

#### TC8 — Theo dõi, kiểm soát và cải tiến
*Theo dõi tiến độ thường xuyên bằng dữ liệu, áp dụng báo cáo, PDCA và điều chỉnh, cải tiến giải pháp kịp thời.*

| Mốc | Chuẩn hành vi |
|---|---|
| **10đ** | Theo dõi thường xuyên bằng dữ liệu; đánh giá định kỳ; áp dụng PDCA; điều chỉnh giải pháp kịp thời. |
| **8đ** | Theo dõi đầy đủ; có báo cáo tiến độ và điều chỉnh khi cần thiết. |
| **6đ** | Có theo dõi nhưng chưa liên tục; hoạt động cải tiến còn chậm. |
| **3đ** | Theo dõi hình thức; thiếu dữ liệu; ít hành động cải tiến. |
| **0đ** | Không theo dõi tiến độ hoặc không có hoạt động cải tiến. |

#### TC9 — Hiệu quả mang lại
*Đánh giá kết quả thực tế đối với chỉ tiêu kinh doanh, vận hành, khách hàng hoặc chất lượng dịch vụ.*

| Mốc | Chuẩn hành vi |
|---|---|
| **10đ** | Tạo chuyển biến rõ rệt; đạt hoặc vượt mục tiêu; có kết quả định lượng và được ghi nhận rộng rãi. |
| **8đ** | Đạt các mục tiêu chính; mang lại kết quả tích cực và ổn định. |
| **6đ** | Có cải thiện nhưng chưa rõ nét; tác động còn hạn chế. |
| **3đ** | Hiệu quả thấp; kết quả chưa đáp ứng kỳ vọng. |
| **0đ** | Không tạo được kết quả hoặc không chứng minh được hiệu quả. |

#### TC10 — Chuẩn hóa, đổi mới và lan tỏa
*Chuẩn hóa quy trình, ứng dụng AI/chuyển đổi số, khả năng nhân rộng và duy trì, lan tỏa kết quả tốt.*

| Mốc | Chuẩn hành vi |
|---|---|
| **10đ** | Chuẩn hóa thành quy trình/công cụ; ứng dụng AI hoặc chuyển đổi số; nhân rộng thành công trên phạm vi đơn vị. |
| **8đ** | Có chuẩn hóa và áp dụng hiệu quả; được các đơn vị khác tham khảo sử dụng. |
| **6đ** | Có cải tiến nhưng phạm vi áp dụng hẹp; chưa duy trì bền vững. |
| **3đ** | Hiệu quả ngắn hạn; chưa chuẩn hóa hoặc khó nhân rộng. |
| **0đ** | Không có hoạt động cải tiến hoặc đổi mới. |

---

## 4. QUY TẮC CHẤM ĐIỂM THEO TIÊU CHÍ

### 4.1. Thang điểm

Thang chấm là **10 nấc rời rạc từ 1 đến 10** (`SCORE_SCALE`). **Không có nấc 0** trên giao diện — mốc chuẩn hành vi "0đ" được chấm bằng **nấc 1**. Không nhập điểm lẻ.

> **Lệch giữa CSDL và giao diện — có chủ ý.** Cột `council_evaluation_scores.score` khai kiểu `numeric(4,2)` với ràng buộc `0 ≤ score ≤ 10`, tức tầng CSDL *cho phép* điểm 0 và điểm lẻ. Ràng buộc "số nguyên 1–10" chỉ được cưỡng chế ở **tầng giao diện**. Hai lý do giữ CSDL nới hơn:
>
> 1. **Dữ liệu lịch sử chấm tay có điểm lẻ.** Bản chấm giấy Quý 1/2026 dùng nửa điểm (9,5 · 8,5 · 7,5…) và đang được giữ nguyên trạng trong `src/lib/council.test.ts` làm mẫu đối chiếu. Siết CSDL về số nguyên sẽ chặn việc nhập lại các kỳ chấm tay cũ.
> 2. Không phải migration nếu Chi nhánh đổi thang chấm về sau.
>
> Hệ quả cần biết: **script hoặc công cụ ghi thẳng vào bảng có thể tạo điểm ngoài thang chấm** mà không bị chặn. Mọi đường ghi điểm mới phải tự giữ lấy ràng buộc 1–10.

### 4.2. Ánh xạ chuẩn hành vi ↔ dải điểm

Đây là bảng gốc, dùng cho cả màu badge, tô sáng mô tả hành vi lẫn diễn giải trên phiếu (`CRITERION_SCORE_BANDS`):

| Dải nấc | Mốc chuẩn hành vi | Diễn giải | Màu |
|---|---|---|---|
| **9–10** | Mức 10đ | Xuất sắc | xanh ngọc |
| **7–8** | Mức 8đ | Tốt | xanh dương |
| **5–6** | Mức 6đ | Đạt | xám |
| **2–4** | Mức 3đ | Cần cải thiện | hổ phách |
| **1** | Mức 0đ | Không đạt | đỏ |

### 4.3. Luồng thao tác trên phiếu

```
1. Người chấm đọc 5 mô tả chuẩn hành vi của tiêu chí (hiện TRƯỚC thang điểm)
2. Bấm vào mô tả sát thực tế nhất
      → hệ thống tự điền nấc:  10đ→10 · 8đ→8 · 6đ→6 · 3đ→3 · 0đ→1
3. Tinh chỉnh trên thang 10 nấc nếu muốn (ví dụ: chọn mô tả 8đ rồi hạ xuống nấc 7)
      → mô tả hành vi ứng với dải đang chọn được TÔ SÁNG
4. Nếu nấc = 10 hoặc nấc ≤ 3 → ô "minh chứng" bung ra ngay dưới tiêu chí, BẮT BUỘC nhập
5. Bấm lại nấc đang chọn = bỏ chấm tiêu chí đó
```

### 4.4. Quy tắc minh chứng bắt buộc

Theo mục I.3 của Cơ chế. Hằng số tại `src/lib/council.ts`: `EXTREME_HIGH = 10`, `EXTREME_LOW = 3`.

| Nấc | Minh chứng |
|---|---|
| 10 | **Bắt buộc** |
| 4 – 9 | Không bắt buộc |
| 1 – 3 | **Bắt buộc** |

> **Lưu ý ranh giới:** nấc **4** thuộc dải diễn giải "Cần cải thiện (2–4)" nhưng **không** bị bắt minh chứng, vì ngưỡng chặn là `≤ 3` theo đúng câu chữ của Cơ chế. Đây là chủ ý, không phải lỗi lệch bảng.

Minh chứng lưu **theo từng tiêu chí** ở cột `council_evaluation_scores.evidence` (bổ sung bởi migration `20260706170000_council_evidence_per_criterion.sql`) — mỗi dòng điểm mang minh chứng của chính tiêu chí đó. RPC báo cáo gom chúng thành map `criterion_id → minh chứng` trả về dưới khóa `evidences`.

Phân biệt với cột cũ `council_evaluations.evidence` — ô minh chứng **chung cho cả phiếu** của thiết kế ban đầu. Cột này vẫn được đọc và trả về (khóa `evidence`) để dữ liệu cũ không mất, nhưng **phiếu mới không ghi vào đó nữa**.

### 4.5. Điều kiện gửi phiếu

Phiếu chỉ **gửi** được khi thỏa đủ ba điều kiện:

1. **Chấm đủ 100% tiêu chí đang hiệu lực** — thiếu tiêu chí nào hệ thống nêu đích danh tên tiêu chí đó.
2. **Đủ minh chứng cho mọi tiêu chí điểm rất cao/rất thấp** (§4.4).
3. **Đã viết Lời chúc** gửi cán bộ được đánh giá (trường EQ bắt buộc; lời chúc gom ẩn danh và chỉ hiện ở cuối email kết quả, không vào báo cáo/PDF/Excel/hồ sơ lưu).

Ba mục nhận xét theo Mẫu phiếu — **ưu điểm / hạn chế / đề xuất** — không bị chặn cứng khi gửi, nhưng là phần đưa vào PHỤ LỤC báo cáo nên Hội đồng cần điền.

**Lưu nháp** không áp ràng buộc nào (trừ việc phiếu trống hoàn toàn thì không tạo bản ghi).

---

## 5. QUẢN TRỊ BỘ TIÊU CHÍ THEO KỲ

Màn hình: `/quan-tri-hoi-dong-dau-moi` → tab **Bộ câu hỏi** → chọn kỳ.
Mã nguồn: `src/components/council/CouncilCriteriaTab.tsx`.

### 5.1. Khởi tạo bộ tiêu chí cho kỳ mới

Kỳ chưa có tiêu chí thì màn hình chỉ hiện hai lối vào:

| Cách | Hành vi |
|---|---|
| **Khởi tạo từ bộ mặc định (10 tiêu chí)** | Nạp nguyên `DEFAULT_COUNCIL_CRITERIA` (§3) vào vùng soạn thảo |
| **Sao chép từ \<tên kỳ khác\>** | Nạp toàn bộ tiêu chí của kỳ nguồn, **kể cả cờ hiệu lực và thứ tự** |

Cả hai thao tác chỉ nạp vào form — **phải bấm "Lưu bộ câu hỏi"** mới ghi xuống CSDL.

### 5.2. Sửa bộ tiêu chí

| Thao tác | Ảnh hưởng tới điểm đã chấm |
|---|---|
| Sửa `title` / `description` / chuẩn hành vi | **Không mất điểm** |
| Đổi thứ tự (mũi tên lên/xuống) | **Không mất điểm** |
| Đổi `section` của tiêu chí | **Không mất điểm**, nhưng điểm TB Phần I/II được tính lại |
| Thêm tiêu chí mới | Phiếu đã gửi trở thành **thiếu tiêu chí** — xem §5.5 |
| Tắt **Hiệu lực** | Ẩn khỏi phiếu, **điểm cũ được giữ trong CSDL** nhưng **không còn vào công thức** |
| Xóa tiêu chí | **Xóa vĩnh viễn điểm đã chấm theo tiêu chí đó** (có hộp thoại xác nhận nêu rõ) |

Lý do "sửa không mất điểm": bảng `council_evaluation_scores` tham chiếu **`criterion_id`** (khóa chính UUID), không tham chiếu tên hay `sort_order`.

Ràng buộc lưu: **mọi tiêu chí phải có tên**, để trống thì chặn lưu toàn bộ. Khi lưu, `sort_order` được ghi lại bằng chỉ số dòng hiện tại (1, 2, 3…), nên thứ tự trên màn hình luôn là thứ tự thật.

### 5.3. "Tắt hiệu lực" khác "Xóa" như thế nào

Đây là phân biệt quan trọng nhất khi vận hành:

- **Tắt hiệu lực** = *thôi hỏi câu này từ giờ*. Tiêu chí biến khỏi phiếu chấm; điểm cũ vẫn nằm trong CSDL nhưng bị loại khỏi mọi phép tính, vì cả điểm phiếu, điểm TB tiêu chí lẫn điểm TB phần đều chỉ chạy trên **danh sách tiêu chí đang hiệu lực**. Hệ quả thực tế: **tắt một tiêu chí giữa kỳ sẽ làm điểm thang 100 của mọi đầu mối thay đổi ngay lập tức.**
- **Xóa** = *câu này chưa từng tồn tại*. Điểm bị xóa cascade, không khôi phục được.

**Khuyến nghị vận hành:** trong một kỳ **đang mở**, chỉ sửa câu chữ. Muốn thêm/bớt tiêu chí thì làm ở kỳ **chưa mở** — như vậy các phiếu trong cùng một kỳ luôn chấm trên cùng một bộ câu hỏi.

### 5.4. Sinh mã tiêu chí

Mã mới = `tc<N+1>` với N là số lớn nhất trong các mã dạng `tc<số>` hiện có. Mã do hệ thống sinh, không sửa trên giao diện, và **duy nhất trong phạm vi một kỳ**.

### 5.5. Rủi ro đã biết — thêm tiêu chí sau khi đã có phiếu gửi

Hệ thống **không** tự đánh dấu lại các phiếu đã gửi khi bộ tiêu chí có thêm câu hỏi mới. Hậu quả: phiếu cũ thiếu điểm ở tiêu chí mới; điểm TB của phiếu đó vẫn tính được (chỉ trung bình trên các tiêu chí đã chấm) nhưng **không cùng mặt bằng** với phiếu chấm sau. Báo cáo không cảnh báo tình trạng này.

**Cách xử lý:** nếu buộc phải thêm tiêu chí giữa kỳ, quản trị phải chủ động rà tab *Tiến độ* và đề nghị các thành viên đã gửi mở lại phiếu chấm bổ sung (phiếu đã gửi vẫn sửa được khi kỳ còn mở).

---

## 6. TỪ ĐIỂM TIÊU CHÍ ĐẾN ĐIỂM KẾT QUẢ

Đặc tả đầy đủ về trọng số nằm ở tài liệu 07/2026; phần này chỉ nêu chuỗi phép tính để thấy tiêu chí đi vào đâu.

```
điểm từng tiêu chí (nấc 1–10)
   │
   ├─→ điểm TB thô của MỘT PHIẾU = trung bình cộng các tiêu chí HIỆU LỰC đã chấm
   │        │
   │        └─→ điểm NHÓM = trung bình các phiếu cùng nhóm trọng số
   │                 │
   │                 └─→ ĐIỂM THANG 100
   │                     = Σ(điểm nhóm × trọng số) ÷ Σ(trọng số nhóm ĐÃ bỏ phiếu) × 10
   │
   ├─→ điểm TB TỪNG TIÊU CHÍ (trung bình mọi phiếu) → 2 biểu đồ thanh ngang trên báo cáo
   │
   └─→ điểm TB TỪNG PHẦN (I / II) = trung bình các "điểm TB tiêu chí" thuộc phần đó
                                    → biên bản toàn kỳ + Excel
```

Ba lưu ý bắt nguồn từ chính bộ tiêu chí:

1. **Mọi tiêu chí có trọng lượng bằng nhau.** Không có cơ chế đặt trọng số riêng cho từng tiêu chí; muốn nhấn mạnh một khía cạnh thì cách duy nhất hiện nay là tách nó thành nhiều tiêu chí.
2. **Điểm TB phần là trung bình của trung bình**, không phải trung bình phẳng mọi ô điểm — hai cách chỉ khác nhau khi các phiếu chấm thiếu tiêu chí không đều.
3. **Nhóm chưa bỏ phiếu được chuẩn hóa lại** ở mẫu số, đúng dòng "Tổng trọng số bỏ phiếu hiện có" của mẫu báo cáo Chi nhánh.

Trọng số theo cấp (mặc định, chỉnh được theo kỳ):

| Đầu mối được đánh giá | GĐCN | PGĐ phụ trách | PGĐ còn lại | Thành viên khác |
|---|---|---|---|---|
| Cấp Phó Giám đốc | 20% | — | 15% | 65% |
| Cấp Trưởng phòng | 20% | 10% | 15% | 55% |

Ngưỡng tham khảo trên thang 100 (Chi nhánh **đã bỏ hiển thị xếp loại** từ 07/2026, giữ đây làm tham chiếu nội bộ): ≥ 80 Xuất sắc · 65–79 Tốt · 50–64 Đạt · < 50 Chưa đạt.

---

## 7. LƯỢC ĐỒ DỮ LIỆU

```sql
CREATE TABLE public.council_criteria (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    uuid NOT NULL REFERENCES public.council_rounds(id) ON DELETE CASCADE,
  criterion_key text NOT NULL,
  section     text NOT NULL DEFAULT 'nang_luc'
              CHECK (section IN ('nang_luc', 'hieu_qua')),
  title       text NOT NULL,
  description text,
  anchor_10   text,   -- chuẩn hành vi tham chiếu Mức 10đ
  anchor_8    text,
  anchor_6    text,
  anchor_3    text,
  anchor_0    text,
  sort_order  integer NOT NULL DEFAULT 1,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, criterion_key)
);
CREATE INDEX idx_council_criteria_round
  ON public.council_criteria (round_id, sort_order);
```

Điểm chấm nằm ở bảng riêng `council_evaluation_scores`, tham chiếu `criterion_id` — xóa tiêu chí thì điểm bị xóa cascade.

**Bốn bất biến phải giữ khi sửa mã nguồn về sau:**

| # | Bất biến | Vì sao |
|---|---|---|
| 1 | Điểm luôn gắn theo `criterion_id`, **không bao giờ** theo `criterion_key` hay `sort_order` | Mất bất biến này thì sửa tên/đổi thứ tự sẽ làm sai lệch điểm lịch sử |
| 2 | Mọi phép tính chỉ chạy trên tiêu chí `is_active = true` của **đúng kỳ đó** | Trộn tiêu chí giữa các kỳ làm hỏng so sánh xu hướng ở trang Phân tích |
| 3 | `section` chỉ có hai giá trị, ràng buộc ở tầng CSDL | Báo cáo và biên bản dựng cứng theo hai phần |
| 4 | Bảng dải điểm `CRITERION_SCORE_BANDS` là nguồn chuẩn duy nhất cho màu, nhãn và tô sáng hành vi | Nhân bản bảng này ra nhiều nơi là nguồn gốc của lệch màu/lệch nhãn giữa phiếu và báo cáo |

---

## 8. BẢN ĐỒ MÃ NGUỒN

| Tệp | Vai trò |
|---|---|
| `src/lib/councilDefaults.ts` | Bộ 10 tiêu chí mặc định kèm 5 mốc chuẩn hành vi (§3) |
| `src/lib/council.ts` | Nhãn phần, thang điểm, dải diễn giải, ngưỡng minh chứng, công thức TB tiêu chí/phần/phiếu, trọng số |
| `src/lib/council.test.ts` | Unit test tái lập số liệu mẫu Quý 1/2026 (nhóm 8,75 / 8,45 / 8,12 → **82,93 điểm**) |
| `src/components/council/CouncilCriteriaTab.tsx` | Màn hình quản trị bộ câu hỏi (§5) |
| `src/pages/CouncilEvaluationPage.tsx` | Phiếu chấm: hiện chuẩn hành vi, ánh xạ mốc → nấc, ô minh chứng, kiểm tra điều kiện gửi (§4) |
| `src/pages/CouncilReportPage.tsx` | Báo cáo: 2 biểu đồ thanh ngang theo tiêu chí, điểm thang 100, biên bản, Excel/PDF |
| `src/pages/CouncilAnalyticsPage.tsx` | Phân tích: radar 10 tiêu chí, so sánh qua các kỳ |
| `supabase/migrations/20260706150000_council_focal_point_evaluation.sql` | Lược đồ 6 bảng, RLS, RPC báo cáo, seed 3 kỳ + 10 tiêu chí + 6 đầu mối + 7 thành viên |

---

## 9. VIỆC CÒN MỞ

| # | Nội dung | Ghi chú |
|---|---|---|
| 1 | **Cảnh báo phiếu thiếu tiêu chí sau khi bộ câu hỏi đổi giữa kỳ** | Rủi ro §5.5 hiện phải phát hiện thủ công. Đề xuất: tab *Tiến độ* hiện cờ "phiếu chấm trên bộ câu hỏi cũ". |
| 2 | **Khóa bộ tiêu chí khi kỳ đã có phiếu gửi** | Chặn thêm/xóa tiêu chí (vẫn cho sửa câu chữ) để bảo đảm cùng kỳ cùng mặt bằng. Chờ Chi nhánh quyết có siết hay không. |
| 3 | **Trọng số riêng cho từng tiêu chí** | Hiện mọi tiêu chí bằng nhau (§6). Chỉ làm nếu Chi nhánh có căn cứ phân biệt. |
| 4 | **Cân bằng số tiêu chí hai phần** | Chưa ràng buộc; nếu Chi nhánh muốn cố định 50/50 thì cần thêm kiểm tra khi lưu (§2.1). |
| 5 | **Đính kèm hồ sơ minh chứng của đầu mối vào phiếu** | Để Hội đồng tra cứu ngay khi chấm thay vì mở tài liệu ngoài. |
