# Nghiên cứu triển khai «BHY ONE MCP» — mở cổng cho AI cá nhân của lãnh đạo đọc Kanban và hành vi cán bộ

**Ngày:** 17/09/2026 · **Trạng thái:** nghiên cứu, chưa có dòng mã nào đưa lên hệ thống
· **Người quyết:** Giám đốc Chi nhánh (3 quyết định ở mục 9).

**Bối cảnh:** lãnh đạo Phòng và một số cán bộ được cấp quyền muốn dùng chính AI cá nhân
của mình (ChatGPT, Claude…) để hỏi kiểu «Kanban phòng tôi tuần này ai đang đỏ», «cán bộ
X ba tháng qua có gì đáng ghi nhận», «nhịp sáng của phòng đang tụt ở đâu» — thay vì mở
từng màn hình trên cổng rồi tự đọc. Cách làm chuẩn hiện nay để một AI bên ngoài đọc được
dữ liệu của một hệ thống nội bộ là **MCP (Model Context Protocol)**: hệ thống dựng một
«máy chủ MCP» phơi ra vài **công cụ đọc** có kiểm soát, AI của người dùng gọi công cụ đó
bằng **đúng tài khoản của người dùng** sau khi họ đăng nhập cổng và bấm «cho phép».

Tài liệu này trả lời bốn câu: (1) làm được không và bằng cách nào trên nền đang có;
(2) rủi ro thật là gì trong bối cảnh ngân hàng; (3) thiết kế cụ thể để rủi ro nằm trong
tầm; (4) lộ trình và việc Giám đốc phải chốt.

---

## 0. Tóm tắt cho người bận

1. **Làm được, và làm được với chi phí thấp.** Supabase (nền backend của cổng) nay có sẵn
   *OAuth 2.1 Server* — tức cổng BHY ONE có thể tự đóng vai «nơi cấp vé» cho ChatGPT/Claude
   mà không phải mua thêm dịch vụ định danh. Máy chủ MCP là **một edge function mới**
   (`bhy-one-mcp`), chạy cùng chỗ với 30 hàm máy chủ hiện có. Toàn bộ hàng rào phân
   quyền hiện tại (RLS, các hàm `ct2_xem_duoc_*`, `can_observe_profile`…) **áp dụng nguyên
   vẹn** vì AI gọi bằng vé mang danh người dùng, không phải vé quản trị.
2. **Rủi ro lớn nhất không phải kỹ thuật mà là dữ liệu chảy ra ngoài.** Mọi thứ AI đọc
   được sẽ nằm trong lịch sử trò chuyện trên máy chủ của OpenAI/Anthropic, dưới tài khoản
   *cá nhân* của cán bộ, ngoài tầm quản trị của Chi nhánh. Vì vậy tài liệu đề xuất **ba mức
   dữ liệu** cấp theo từng người, và **mặc định không mở** tên khách hàng trong hồ sơ tín
   dụng lẫn nội dung thô của nhật ký hành vi.
3. **Đợt 1 chỉ đọc, không ghi.** Không cho AI tạo thẻ, ghi nhịp, hay viết bình luận. Ghi
   qua AI là câu chuyện khác (xác nhận hai bước, vết, trách nhiệm) — để đợt sau nếu có
   nhu cầu thật.
4. **Ai được nối là quyết định nghiệp vụ, không phải tự đăng ký.** Có bảng cấp quyền
   riêng (giống `guest_access`): Phòng TCTH cấp, có hạn, thu hồi được tức thì, mỗi lần AI
   gọi đều ghi vết.
5. **Việc phải chốt trước khi viết mã** (mục 9): phạm vi dữ liệu đợt 1; có mở hồ sơ tín
   dụng hay không; ai được cấp và ai cấp.

---

## 1. MCP là gì — nói cho người điều hành

Hình dung một **ổ cắm chuẩn**. ChatGPT, Claude, Copilot… đều có «phích» theo chuẩn này.
Cổng BHY ONE dựng một «ổ cắm» (máy chủ MCP) phơi ra một danh sách **công cụ** có tên, có
mô tả, có tham số — ví dụ «xem Kanban phòng», «xem nhịp sáng hôm nay». Khi cán bộ hỏi AI
của họ, AI tự chọn công cụ phù hợp, gọi sang cổng, nhận dữ liệu rồi phân tích.

Ba điểm quan trọng với ngân hàng:

- **AI không đăng nhập bằng mật khẩu của ai cả.** Lần đầu nối, trình duyệt mở màn đăng
  nhập của chính cổng BHY ONE; cán bộ đăng nhập, thấy màn «ChatGPT xin phép đọc Kanban của
  bạn — Cho phép / Từ chối». Sau đó AI giữ một *vé* (token) mang danh cán bộ đó, có hạn,
  thu hồi được.
- **AI chỉ thấy đúng những gì cán bộ đó thấy trên cổng.** Vé mang danh người dùng nên mọi
  luật RLS đang có tự áp dụng: Trưởng phòng KHDN nối ChatGPT thì ChatGPT chỉ đọc được
  Kanban KHDN, không đọc được bảng hạn chế của TCTH.
- **Máy chủ MCP quyết định phơi ra cái gì.** Không phải «mở cả database». Chỉ những công
  cụ được viết ra mới gọi được; mỗi công cụ trả về đúng bộ cột được chọn, không hơn.

Chuẩn MCP bản 28/07/2026 quy định rõ: máy chủ MCP là một *resource server* OAuth 2.1, phải
công bố tệp mô tả `/.well-known/oauth-protected-resource` để AI tự tìm ra nơi cấp vé; cách
đăng ký ứng dụng ưu tiên là *Client ID Metadata Documents* (CIMD), cách cũ *Dynamic Client
Registration* (DCR) vẫn được hỗ trợ nhưng đã bị đánh dấu lỗi thời. Cả ChatGPT lẫn Claude
đều bám chuẩn này.

---

## 2. Nền đang có — cái gì dùng lại được ngay

### 2.1 Dữ liệu nghiệp vụ và hàng rào quyền hiện hữu

| Phân hệ | Bảng / hàm chính | Ai xem được hôm nay (RLS) | Dùng lại cho MCP |
| --- | --- | --- | --- |
| **Kanban Phòng (Chiêu thức 2)** | `ct2_dau_viec`, `ct2_bang`, `ct2_bang_thanh_vien`, `ct2_nhip_pdca`, `ct2_anh_chup_nhip`; RPC `ct2_viec_cua_toi`, `ct2_nhip_phong_hom_nay`, `ct2_bang_nhip_ky`, `ct2_viec_can_lam_hom_nay`, `ct2_chuoi_dung_gio` | Theo `ct2_xem_duoc_dau_viec` (toàn CN · phòng mình · phòng PGĐ phụ trách · phòng tham gia liên phòng) và `ct2_xem_duoc_bang` (bảng hạn chế = danh sách thành viên là hàng rào) | **Nguyên vẹn.** Các RPC này vốn lọc theo tầm nhìn người gọi — đúng thứ MCP cần |
| **Kanban Phê duyệt tín dụng (PDTD)** | `ct2_ho_so_tin_dung`; RPC `ct2_pdtd_tong_hop`, `ct2_pdtd_sap_den_han` | Cùng luật CT2 theo phòng | Dùng lại được, **nhưng** cột `khach_hang` + `so_tien` là dữ liệu khách hàng — xem mục 4 |
| **Kanban cá nhân (Chiêu thức 3 — Hành động phát triển)** | `kanban_cards`, `development_actions`; RPC `can_view_profile` | Tự xem · quản lý cùng phòng · PGĐ theo khối · BGĐ/TCTH | Nguyên vẹn |
| **Năng lực (Chiêu thức 3 — tự đánh giá 38 skill)** | `form_submissions`, `skill_assessments` (self/manager level, gap, IDP) | Theo `can_view_profile` | Nguyên vẹn, chỉ nên trả bản tổng hợp |
| **Nhật ký hành vi (Nếp Tốt)** | `behavior_notes`, `management_scopes`; RPC `can_observe_profile` | **Chặt nhất hệ thống**: chỉ người ghi + chuỗi quản lý trực tiếp; TCTH/system_admin *không* có quyền đọc | Nguyên vẹn về quyền, **nhưng** nội dung thô là dữ liệu nhạy cảm nhất — xem mục 4 |

Nhận xét quan trọng: hệ thống đã có **một hàm quyết định quyền cho mỗi câu hỏi** (xem
được thẻ nào, quan sát được ai) và RLS gọi đúng hàm đó. Máy chủ MCP không phải viết lại
luật quyền nào — chỉ cần gọi bằng vé người dùng. Đây là lý do phương án edge function
trên Supabase thắng tuyệt đối các phương án khác ở mục 5.

### 2.2 Hạ tầng xác thực

- Supabase Auth đang là nơi đăng nhập duy nhất của cổng. Tính năng **OAuth 2.1 Server**
  của Supabase (bật ở *Authentication → OAuth Server*, hoặc `[auth.oauth_server]` trong
  `supabase/config.toml`) biến chính project `whlysprzsguehxmrjwha` thành nơi cấp vé chuẩn
  OAuth 2.1 + PKCE, có tệp khám phá `/.well-known/oauth-authorization-server/auth/v1`, hỗ
  trợ đăng ký ứng dụng động, **không thu thêm phí** (AI đăng nhập như một người dùng đang
  có, chỉ tính vào MAU).
- Cổng đã có sẵn màn đăng nhập, Turnstile, cờ bắt buộc đổi mật khẩu. Màn «cho phép ứng
  dụng» (consent) là **một trang React mới** trên cổng — gọi
  `supabase.auth.oauth.getAuthorizationDetails()` rồi `approveAuthorization()` /
  `denyAuthorization()`.
- Edge function đã có khuôn: `ai-advisor` xác thực bằng `auth.getUser()` với header
  Authorization của người gọi; `ct2-nhip-bao-cao` có sẵn hàm đọc claim JWT. Cấu hình
  `verify_jwt` từng hàm được khai đủ trong `config.toml` với lý do rõ ràng — hàm MCP mới
  phải khai theo (mục 6.4).

### 2.3 Cái chưa có

- Chưa có bảng «ai được nối AI bên ngoài». Vai trò đăng nhập (`manager`, `pgd`…) chưa đủ
  làm điều kiện: yêu cầu là *lãnh đạo Phòng và một số cán bộ được cấp quyền*, tức một
  danh sách đích danh có hạn.
- Chưa có vết riêng cho truy cập từ AI. `audit_logs` hiện ghi hành động trong cổng;
  cần biết thêm *ứng dụng nào* (ChatGPT hay Claude, `client_id`), *công cụ nào*, *trả bao
  nhiêu dòng*.
- Chưa có tầng «rút gọn dữ liệu» cho AI: các RPC hiện trả đủ cột cho màn hình; AI bên
  ngoài chỉ nên nhận bộ cột tối thiểu.

---

## 3. Điều kiện phía AI cá nhân của cán bộ (kiểm tra 09/2026)

| | ChatGPT | Claude |
| --- | --- | --- |
| Gói cá nhân nối được máy chủ MCP tuỳ chỉnh | Plus / Pro, phải bật *Developer mode* (Settings → Apps & Connectors); bản Free **không** nối được | Pro / Max (Settings → Connectors → Add custom connector) |
| Gói tổ chức | Business / Enterprise / Edu: **quản trị viên** tạo và công bố connector cho cả workspace; Enterprise có thêm kiểm soát từng hành động | Team / Enterprise: Owner cấu hình ở Organization Settings, người dùng bật theo từng hội thoại |
| Cá nhân có gọi được công cụ *ghi* không | Plus/Pro: chỉ đọc; ghi cần workspace Business/Enterprise | Có, nhưng đợt 1 ta không phơi công cụ ghi |
| Giao thức | Streamable HTTP, HTTPS công khai | Streamable HTTP, HTTPS công khai |
| Xác thực chấp nhận | OAuth (ưu tiên CIMD, còn hỗ trợ DCR), hoặc không xác thực; **không** hỗ trợ khóa API tự đặt, client credentials, mTLS | OAuth DCR, OAuth CIMD, header tĩnh, hoặc không xác thực |

Hệ quả thiết kế: **bắt buộc đi đường OAuth**; không có đường «phát cho mỗi người một mã
API» như một số hệ thống nội bộ hay làm — ChatGPT không nhận. Điều này hoá ra có lợi: mã
API dán vào ChatGPT là thứ dễ bị chép đi nhất; vé OAuth gắn với phiên đăng nhập, có hạn
và thu hồi được.

Điểm cần ghi nhớ: cán bộ dùng **tài khoản ChatGPT cá nhân** (không phải workspace của Chi
nhánh) thì lịch sử trò chuyện, gồm dữ liệu cổng đã trả về, nằm trong tài khoản đó. Chi
nhánh không xoá được, không xem được, không ngăn được việc OpenAI dùng để huấn luyện nếu
người dùng chưa tắt tuỳ chọn ấy. Đây là điều kiện tiên quyết của mục 4.

---

## 4. Rủi ro thật trong bối cảnh ngân hàng — và cách khoanh

| # | Rủi ro | Mức | Cách khoanh trong thiết kế |
| --- | --- | --- | --- |
| R1 | **Dữ liệu khách hàng ra ngoài.** `ct2_ho_so_tin_dung.khach_hang` là tên doanh nghiệp/cá nhân đang xin cấp tín dụng, kèm số tiền, loại hồ sơ. Vào ChatGPT cá nhân là vào máy chủ nước ngoài, ngoài phạm vi kiểm soát của VietinBank. | 🔴 | Đợt 1 **không mở PDTD**, hoặc chỉ mở bản **đã che tên** (mã hồ sơ + loại + khoảng số tiền + trạng thái + hạn). Che ở máy chủ MCP, không tin vào lời hứa của AI. Quyết định của Giám đốc — mục 9. |
| R2 | **Nội dung nhật ký hành vi.** Đây là bảng mà chính hệ thống đã quyết định *TCTH và system_admin không được đọc*. Cho AI bên ngoài đọc bản thô là phá vỡ cam kết đó. | 🔴 | Mức dữ liệu 3 (mục 6.2) chỉ trả **bản cấu trúc đã xác nhận** (loại tích cực/cần cải thiện, skill liên quan, mức tác động, ngày) — **không** trả `raw_text`, không trả bản nháp. Chỉ người ghi (`observer_id`) mới đọc được ghi nhận của mình qua MCP; không mở cho cấp trên gián tiếp dù RLS cho phép. |
| R3 | **Cán bộ được cấp quyền nối nhầm AI lạ.** Bật đăng ký ứng dụng động nghĩa là *bất kỳ* ứng dụng MCP nào cũng xin vé được; một trang web giả mạo có thể lừa cán bộ bấm «Cho phép». | 🟠 | (a) Màn consent hiện rõ tên ứng dụng, redirect URI, và cảnh báo nếu không thuộc danh sách tin cậy (OpenAI, Anthropic); (b) bảng `mcp_quyen` ghi rõ `ung_dung_cho_phep` — máy chủ từ chối `client_id` ngoài danh sách; (c) TCTH xem được danh sách ứng dụng đã được cấp vé của từng người và thu hồi. |
| R4 | **Vé rò rỉ.** Vé OAuth nằm trong tài khoản ChatGPT; tài khoản đó bị chiếm là vé bị chiếm. | 🟠 | Hạn vé ngắn (access 1 giờ, refresh theo hạn cấp trong `mcp_quyen`); thu hồi tức thì bằng cách tắt dòng `mcp_quyen` — máy chủ kiểm dòng này **mỗi lần gọi**, không tin vào vé còn hạn. |
| R5 | **AI «hỏi rộng» kéo cả bảng.** Một câu hỏi vu vơ có thể khiến AI gọi công cụ với tham số rộng nhất. | 🟡 | Mọi công cụ có trần dòng (mặc định 50, tối đa 200), khung thời gian mặc định 30 ngày, tối đa 90; tham số «phòng» là **tuỳ chọn** và bị ép về phòng của người gọi nếu người gọi không có quyền toàn CN. |
| R6 | **Phân tích sai vì AI hiểu sai luật nhịp/cột.** AI không biết «MẤT NHỊP» tính từ 8h30, không biết cột «Chờ duyệt» chuyển đồng hồ sang người giữ. | 🟡 | MCP có thêm **prompt và tài nguyên hướng dẫn** (mục 6.3): máy chủ trả kèm bảng giải nghĩa trạng thái, cờ, luật nhịp — cùng nguồn với `docs/dac-ta-chieu-thuc-2-kanban-5w2h-pdca.md`. |
| R7 | **Tăng tải giờ cao điểm 7h50–8h30.** | 🟢 | Đợt 1 số người được cấp ≤ 15; các công cụ chỉ gọi RPC đã có index; cache 60 giây cho câu hỏi tổng hợp phòng. |
| R8 | **Sự cố khoá ký JWT (biên bản 27/08).** Hàm MCP tự xác minh vé (vì `verify_jwt = false` để cho phép yêu cầu khám phá không có vé) nên phụ thuộc JWKS. | 🟡 | Dùng `withSupabase({ auth: 'user' })` của `@supabase/server` — xác minh qua JWKS, tự theo khoá mới khi rotate; thêm hàm MCP vào danh sách kiểm khi rotate khoá (mục CÒN LẠI số 2 của báo cáo bảo mật). |

Nguyên tắc chung rút ra: **RLS là hàng rào về *ai được xem*; máy chủ MCP là hàng rào về
*xem được bao nhiêu và ở dạng nào*.** Hai hàng rào độc lập, hỏng một vẫn còn một.

---

## 5. So sánh phương án

| Tiêu chí | **A. Edge function `bhy-one-mcp` + Supabase OAuth 2.1 Server** (đề xuất) | B. Cloudflare Worker + `workers-oauth-provider` | C. Không làm MCP — dùng báo cáo email/push có sẵn và `ai-advisor` nội bộ |
| --- | --- | --- | --- |
| Tái dùng RLS và các hàm quyền | **Hoàn toàn** — vé là JWT Supabase mang `sub` = người dùng | Phải tự đổi vé Cloudflare ↔ vé Supabase, hoặc dùng service_role và **tự viết lại luật quyền** (nguy hiểm, `ct2-nhip-bao-cao` đã ghi bài học service_role gọi RPC lọc theo người ra rỗng) | Không phát sinh |
| Thành phần mới | 1 edge function, 1 trang consent, 2 bảng, vài migration | Worker có backend thật (hiện worker `343-noi-bo` chỉ phục vụ tĩnh), Durable Objects, KV cho token, mã OAuth riêng | 0 |
| Nơi giữ bí mật | Supabase Vault (đã có thông lệ) | Cloudflare secrets + KV | — |
| Chi phí | 0 đồng thêm; tính vào MAU và số lần gọi edge function hiện đang dưới hạn | Có thể 0 ở mức nhỏ; thêm một nền phải vận hành | 0 |
| Kỹ năng đội hiện có | Đúng khuôn đang làm hằng tuần | Mới hoàn toàn | — |
| Đáp ứng nhu cầu «AI cá nhân tự phân tích» | **Có** | Có | **Không** — cán bộ vẫn phải chép tay dữ liệu vào AI, tức là dữ liệu vẫn ra ngoài nhưng không kiểm soát, không vết |

Phương án C đáng ghi ra vì nó là **hiện trạng thực tế**: nhiều lãnh đạo hôm nay đã chụp
màn hình Kanban dán vào ChatGPT. MCP có kiểm soát là *giảm* rủi ro so với hiện trạng, không
phải *thêm* — miễn là làm đúng mục 4.

**Chọn A.**

---

## 6. Thiết kế đề xuất (phương án A)

### 6.1 Sơ đồ luồng

```
ChatGPT / Claude của cán bộ
   │  (1) gọi https://<project>.supabase.co/functions/v1/bhy-one-mcp
   │      chưa có vé → nhận 401 + WWW-Authenticate trỏ tới tệp khám phá
   │  (2) đọc /.well-known/oauth-protected-resource → biết nơi cấp vé là Supabase Auth
   │  (3) mở trình duyệt: cán bộ đăng nhập cổng → trang /cho-phep-ung-dung (consent)
   │      → Cho phép → Supabase Auth cấp vé (JWT mang sub, role, client_id)
   ▼
Edge function bhy-one-mcp
   ├─ withOAuthProtectedResource()   công bố tệp khám phá
   ├─ withSupabase({auth:'user'})    xác minh vé qua JWKS, tạo client mang danh người dùng
   ├─ kiểm mcp_quyen                 người này còn được nối? ứng dụng này được phép? mức dữ liệu?
   ├─ gọi RPC / bảng bằng client người dùng  → RLS lọc như trên cổng
   ├─ rút gọn + che dữ liệu theo mức
   └─ ghi mcp_nhat_ky                ai · ứng dụng · công cụ · tham số · số dòng · mili giây
```

Gói dùng: `npm:@modelcontextprotocol/server` (Streamable HTTP, một server mới mỗi yêu cầu
— hợp với edge function không giữ trạng thái), `npm:@supabase/server` và
`npm:@supabase/middleware` cho phần OAuth. Đây đúng là khuôn trong hướng dẫn chính thức
của Supabase về xác thực MCP.

### 6.2 Bảng cấp quyền và vết — hai bảng mới

**`mcp_quyen`** — ai được nối AI bên ngoài (một dòng một người, khuôn theo `guest_access`):

| Cột | Ý nghĩa |
| --- | --- |
| `profile_id` | cán bộ được cấp |
| `muc_du_lieu` | `1` tổng hợp · `2` chi tiết thẻ · `3` thêm hành vi (chỉ ghi nhận do chính mình ghi, bản cấu trúc) |
| `mo_pdtd` | bool, mặc định `false`; nếu `true` cũng chỉ là bản che tên (mục 4 R1) |
| `ung_dung_cho_phep` | `text[]`, mặc định `{openai, anthropic}` — đối chiếu `client_id`/tên ứng dụng khi cấp vé |
| `het_han` | ngày; quá hạn = máy chủ từ chối dù vé còn sống |
| `dang_hoat_dong`, `nguoi_cap`, `ly_do`, `created_at` | như `guest_access` |

RLS: cán bộ đọc được **dòng của mình** (để cổng hiện «bạn đang được nối ChatGPT tới
ngày…»); `tcth_admin`/`system_admin`/`bgd` quản trị; `anon` bị `REVOKE ALL`.

**`mcp_nhat_ky`** — mỗi lần AI gọi công cụ một dòng: `profile_id`, `client_id`,
`cong_cu`, `tham_so` (jsonb, đã bỏ giá trị dài), `so_dong_tra`, `ms`, `loi`, `luc`.
Chỉ máy chủ ghi (service_role); TCTH/BGĐ đọc; cán bộ đọc dòng của mình. Bảng này là thứ
trả lời câu «tuần qua AI của ai đã đọc gì» — bắt buộc phải có trước khi cấp cho người
đầu tiên.

### 6.3 Bộ công cụ đợt 1 — chỉ đọc

Đặt tên tiếng Việt không dấu, tiền tố `bhy_`, đánh dấu `readOnlyHint: true`. Mô tả công
cụ viết cho AI hiểu *khi nào* nên gọi (đây là thứ quyết định AI chọn đúng công cụ).

| Công cụ | Trả về | Nguồn | Mức |
| --- | --- | --- | --- |
| `bhy_toi_la_ai` | tên, phòng, vai, phạm vi được xem (danh sách phòng), mức dữ liệu được cấp, hạn | `profiles`, `user_roles`, `mcp_quyen` | 1 |
| `bhy_kanban_phong` | thẻ đang chạy của một bảng/phòng: mã, tiêu đề, cột, %, cờ, hạn, người phụ trách (tên), ngày ghi nhịp gần nhất; kèm bảng giải nghĩa cột và cờ | `ct2_dau_viec` (+ `ct2_bang`), lọc RLS | 2 |
| `bhy_nhip_phong_hom_nay` | với từng người trong phòng: số việc phải ghi, đã ghi, thẻ đỏ, quá hạn, kết quả nhịp | RPC `ct2_nhip_phong_hom_nay` | 1 |
| `bhy_bang_nhip_ky` | tỉ lệ đúng giờ/muộn/mất nhịp theo người trong khoảng ngày (≤ 90 ngày) | RPC `ct2_bang_nhip_ky` | 1 |
| `bhy_the_cua_can_bo` | thẻ CT2 + thẻ Kanban cá nhân CT3 của một cán bộ trong phạm vi quan sát, kèm 5 nhịp PDCA gần nhất (nội dung, vướng mắc, hành động) | `ct2_dau_viec`, `ct2_nhip_pdca`, `kanban_cards` | 2 |
| `bhy_nang_luc_can_bo` | bản tổng hợp kỳ gần nhất: số skill lõi đạt/chưa đạt, 5 gap lớn nhất, mục IDP đã chọn — **không** trả bình luận tự do | `form_submissions`, `skill_assessments` | 2 |
| `bhy_hanh_vi_toi_da_ghi` | ghi nhận **do chính người gọi ghi**, trạng thái đã xác nhận: ngày, loại, skill/thái độ liên quan, mức tác động, có chia sẻ với cán bộ chưa — **không** `raw_text`, không bản nháp | `behavior_notes` với `observer_id = tôi` | 3 |
| `bhy_pdtd_tong_hop` | số hồ sơ theo trạng thái, tổng tiền, quá hạn theo phòng; danh sách hồ sơ **che tên khách hàng** | RPC `ct2_pdtd_tong_hop`, `ct2_ho_so_tin_dung` | chỉ khi `mo_pdtd` |

Ngoài công cụ, MCP cho phép phơi **prompt** và **tài nguyên**. Hai thứ nên có ngay:

- Prompt `phan_tich_kanban_phong`: khung rà soát «thẻ lệch chuẩn» (không người phụ
  trách, quá hạn không lùi hạn, đỏ hai nhịp liên tiếp không có hành động, chờ duyệt quá 2
  ngày làm việc…). Nội dung lấy từ skill `phan-tich-kanban` đang dùng với Miro và từ đặc
  tả Chiêu thức 2 — để mọi AI phân tích theo **cùng một khung**, không mỗi người một kiểu.
- Tài nguyên `giai-nghia-trang-thai`: bảng giải nghĩa 7 cột, 3 cờ, 4 kết quả nhịp, các
  mốc giờ đang cấu hình (`ct2_cau_hinh_thoi_gian`) và lịch nghỉ lễ — để AI không tự bịa
  luật.

### 6.4 Những chỗ phải giữ đúng khi viết mã

1. **Tham số «phòng» không bao giờ là nguồn quyền.** Máy chủ lấy phạm vi từ vé + RLS; tham
   số chỉ để *thu hẹp*. Người không có quyền toàn CN mà truyền phòng khác → trả về rỗng
   kèm lời giải thích, không lỗi.
2. **Không dùng service_role cho bất kỳ công cụ nào**, kể cả «cho tiện». Bài học đã ghi ở
   đầu `ct2-nhip-bao-cao`: RPC lọc theo người gọi, service_role gọi ra rỗng im lặng; và
   ngược lại, bảng không lọc thì service_role trả *tất cả*.
3. **Kiểm `mcp_quyen` ở mọi yêu cầu**, không chỉ lúc cấp vé — thu hồi phải có hiệu lực
   tức thì.
4. **Khai `[functions.bhy-one-mcp] verify_jwt = false` trong `config.toml` kèm lý do**:
   tệp khám phá phải đọc được khi chưa có vé (chuẩn MCP); hàm tự xác minh vé bằng JWKS ở
   tầng mã. Đây là ngoại lệ có chủ ý thứ hai sau `danh-thiep-vcard`, phải ghi rõ để người
   rà soát bảo mật sau này không tưởng là sót.
5. **Không trả cột nào ngoài danh sách của từng công cụ.** Viết hàm `rutGon*` cho từng
   công cụ, có test đơn vị khẳng định *không có* `khach_hang`, `raw_text`, `phone`,
   `date_of_birth` trong kết quả.
6. **Trần kích thước**: ≤ 200 dòng, ≤ 30 KB mỗi lần trả; vượt thì cắt và báo «còn N dòng,
   thu hẹp khoảng ngày».
7. **Trang consent** (`/cho-phep-ung-dung`) nằm trong cổng, đi qua `AdminRoute` như mọi
   trang, chặn khách đối tác (`guest`) tuyệt đối — khách không bao giờ được nối AI.
8. **Đăng ký ứng dụng động**: bật, nhưng máy chủ MCP chỉ chấp nhận `client_id` mà
   `mcp_quyen.ung_dung_cho_phep` của người gọi cho phép. Nếu Supabase hỗ trợ CIMD tại
   thời điểm làm, ưu tiên CIMD (ChatGPT và chuẩn 07/2026 đều ưu tiên) và giữ DCR làm
   đường dự phòng cho Claude.

---

## 7. Lộ trình — bốn đợt theo PDCA

| Đợt | Việc | Đầu ra kiểm được | Ước lượng |
| --- | --- | --- | --- |
| **0. Chốt phạm vi** | Giám đốc quyết 3 câu ở mục 9; TCTH lập danh sách 5–10 người thử nghiệm (ưu tiên Trưởng phòng đã bật push và quen Kanban) | Biên bản chốt; danh sách | 1 tuần |
| **1. Nền xác thực** | Bật OAuth 2.1 Server; trang consent; migration `mcp_quyen` + `mcp_nhat_ky` (+ rollback); màn quản trị `/quan-tri-mcp` trong nhóm Quản trị chung (khuôn `/quan-tri-khach`); khai `config.toml` | Một người thử nối Claude/ChatGPT và thấy màn «Cho phép»; thu hồi có hiệu lực tức thì | 1–1,5 tuần |
| **2. Công cụ đọc mức 1–2** | `bhy_toi_la_ai`, `bhy_kanban_phong`, `bhy_nhip_phong_hom_nay`, `bhy_bang_nhip_ky`, `bhy_the_cua_can_bo`, prompt + tài nguyên giải nghĩa; test rút gọn | 5 câu hỏi mẫu trả đúng như màn hình; test khẳng định không lộ cột cấm | 1,5 tuần |
| **3. Thử nghiệm có kiểm soát** | 5–10 người dùng 3 tuần; TCTH đọc `mcp_nhat_ky` hằng tuần; thu phản hồi bằng chính hộp Góp ý trên cổng | Báo cáo: số lần gọi/người/tuần, công cụ nào dùng, câu hỏi nào AI trả sai, có sự cố dữ liệu không | 3 tuần |
| **4. Quyết mở rộng** | Dựa trên đợt 3: mở mức 3 (hành vi), PDTD che tên, cấp thêm người; cân nhắc công cụ ghi (chỉ nếu có yêu cầu thật, và chỉ trên workspace tổ chức) | Quyết định mới của Giám đốc | — |

Mỗi đợt lên hệ thống đi kèm một mục lịch sử phiên bản (`npm run phien-ban`), migration áp
thủ công và ghi trạng thái đã áp/chưa áp vào README như mọi đợt khác.

---

## 8. Hướng dẫn cán bộ nối AI (bản nháp để đưa vào «Mẹo hay» khi triển khai)

**ChatGPT (gói Plus/Pro cá nhân):**
1. Vào *Settings* (Cài đặt) → *Apps & Connectors* → mục *Advanced* → bật *Developer mode*
   (chế độ nhà phát triển).
2. Bấm *Create* (Tạo) → *Name*: «BHY ONE» → *MCP server URL*: địa chỉ do TCTH cung cấp →
   *Authentication*: **OAuth** → *Create*.
3. Trình duyệt mở cổng Bắc Hưng Yên ONE: đăng nhập như bình thường → màn «ChatGPT xin
   phép đọc…» → *Cho phép*.
4. Trong hội thoại, bấm dấu «+» → chọn «BHY ONE» rồi hỏi bằng tiếng Việt, ví dụ
   «Kanban phòng tôi sáng nay ai chưa ghi nhịp?».

**Claude (gói Pro/Max cá nhân):** *Settings* → *Connectors* → *Add custom connector* →
dán địa chỉ → *Add* → *Connect* → đăng nhập cổng → *Cho phép*.

**Trước khi nối, cán bộ phải làm hai việc** (ghi trong màn consent): tắt tuỳ chọn cho
OpenAI/Anthropic dùng hội thoại để huấn luyện (*Data controls → Improve the model for
everyone: Off*), và không dán thêm dữ liệu khách hàng vào hội thoại ngoài những gì công cụ
trả về.

---

## 9. Ba việc Giám đốc cần chốt trước khi viết mã

1. **Phạm vi dữ liệu đợt 1.** Đề xuất: mức 1 + 2 (Kanban, nhịp, thẻ cán bộ, tổng hợp năng
   lực) cho Trưởng/Phó phòng được chọn; mức 3 (hành vi, bản cấu trúc do chính mình ghi)
   để đợt 4. **Không** mở bình luận và trao đổi trên thẻ (`ct2_binh_luan`) — đó là kênh
   nói chuyện nội bộ, không phải dữ liệu điều hành.
2. **Hồ sơ tín dụng (PDTD).** Đề xuất: **không mở trong đợt 1**. Nếu nhu cầu thật xuất
   hiện, chỉ mở bản che tên khách hàng và chỉ cho người có workspace ChatGPT Business/
   Enterprise của tổ chức (dữ liệu không dùng huấn luyện, quản trị viên xoá được).
3. **Ai cấp, ai được cấp.** Đề xuất: Phòng TCTH cấp theo đề nghị của Trưởng phòng, hạn 6
   tháng, gia hạn như khách đối tác; BGĐ thấy toàn bộ danh sách và vết. Cán bộ thường
   được cấp phải có lý do ghi rõ trong `mcp_quyen.ly_do`.

Ngoài ba việc trên, có một việc nên làm **trước** đợt 1 dù không làm MCP: bật MFA cho
nhóm quản trị (mục CÒN LẠI số 3 của báo cáo bảo mật 23/08). Nối AI bên ngoài làm tài
khoản lãnh đạo thành mục tiêu đáng giá hơn.

---

## 10. Đo lường sau triển khai

| Chỉ số | Nguồn | Ngưỡng cần xem lại |
| --- | --- | --- |
| Số lần gọi công cụ / người / tuần | `mcp_nhat_ky` | < 3: người đó không dùng, thu hồi khi hết hạn |
| Tỉ lệ gọi bị từ chối (hết hạn, ngoài phạm vi, ứng dụng lạ) | `mcp_nhat_ky.loi` | > 10% một tuần: xem có ai đang dò |
| Câu hỏi AI trả sai so với màn hình (cán bộ báo qua Góp ý) | `portal_gop_y` | mỗi ca một lần sửa mô tả công cụ/tài nguyên giải nghĩa |
| Số dòng trả trung bình mỗi lần | `mcp_nhat_ky.so_dong_tra` | tăng đột biến → rà tham số |
| Nhịp sáng của phòng có người nối AI so với phòng chưa nối | `ct2_bang_nhip_ky` | đây là câu hỏi giá trị thật: AI có giúp lãnh đạo nhắc đúng người sớm hơn không |

---

## 11. Tài liệu tham chiếu

Trong repo: `docs/dac-ta-chieu-thuc-2-kanban-5w2h-pdca.md` (luật cột, cờ, nhịp) ·
`docs/kanban-cua-phong-nhieu-bang-2026-08.md` (bảng hạn chế) ·
`docs/kiem-tra-bao-mat-toan-dien-2026-08.md` (những việc bảo mật còn tồn) ·
`docs/man-hinh-mo-cho-khach-doi-tac-2026-08.md` (khuôn cấp quyền có hạn) ·
`supabase/functions/ct2-nhip-bao-cao/index.ts` (bài học service_role) ·
`supabase/migrations/20260727090000_nep_tot_step1_behavior_notes.sql` (vì sao hành vi
là dữ liệu chặt nhất).

Bên ngoài (đọc 17/09/2026):
- Supabase — OAuth 2.1 Server: https://supabase.com/docs/guides/auth/oauth-server ·
  Getting started: https://supabase.com/docs/guides/auth/oauth-server/getting-started ·
  Xác thực MCP: https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication ·
  Dựng máy chủ MCP trên Edge Functions: https://supabase.com/docs/guides/ai-tools/byo-mcp
- OpenAI — Xây connector MCP cho ChatGPT: https://developers.openai.com/api/docs/mcp ·
  Developer mode: https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt
- Anthropic — Custom connectors qua remote MCP: https://claude.com/docs/connectors/custom/remote-mcp ·
  https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- Chuẩn MCP — Authorization: https://modelcontextprotocol.io/specification/draft/basic/authorization ·
  Tóm tắt thay đổi 28/07/2026: https://workos.com/blog/mcp-2026-spec-agent-authentication
- Cloudflare — Remote MCP server (phương án B): https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/
