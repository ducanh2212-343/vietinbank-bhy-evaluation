# Kiểm tra bảo mật toàn diện — Bắc Hưng Yên ONE (23/08/2026)

> Tài liệu này viết cho người **không chuyên kỹ thuật**. Mỗi lỗ hổng đều có: (1) giải
> thích thật dễ hiểu, (2) vì sao nguy hiểm, (3) cách sửa **từng bước một**, (4) khẳng
> định rõ việc sửa **có làm gián đoạn cán bộ đang dùng hay không**.
>
> Ai muốn đi thẳng vào việc: đọc **Mục 0 (tóm tắt)** rồi làm theo **Mục A** trước.
> Câu hỏi về CAPTCHA chống AI nằm ở **Mục D**.

---

## 0. Tóm tắt cho người bận

Tôi đã soi toàn bộ website: **114 bảng dữ liệu**, **25 hàm máy chủ (edge function)**,
**200 file thay đổi cơ sở dữ liệu**, toàn bộ mã giao diện, cấu hình đăng nhập, kho ảnh,
và các thư viện đang dùng. Tôi kiểm tra **trực tiếp trên cơ sở dữ liệu thật** chứ không
chỉ đọc mã, nên các kết luận dưới đây là tình trạng **đang chạy hôm nay**.

**Tin tốt trước:** phần lõi của hệ thống **rất chắc**. Hàng rào bảo mật thật sự của
Supabase (gọi là **RLS** — sẽ giải thích ở dưới) đang bật ở **cả 114/114 bảng**. Tôi thử
đóng vai một kẻ lạ chưa đăng nhập và **không đọc được một dòng dữ liệu nào** của cán bộ.
Không có mật khẩu hay khóa bí mật nào bị để lộ trong mã nguồn. Cách chặn "chuyển hướng
lừa đảo" sau đăng nhập được viết đúng chuẩn sách giáo khoa. Đây là công sức tốt.

**Nhưng có 1 lỗ hổng NGHIÊM TRỌNG cần vá ngay hôm nay**, cộng vài việc nên làm sớm:

| Mức | Việc | Ở đâu |
| --- | --- | --- |
| 🔴 **NGHIÊM TRỌNG** | Một "cửa phụ" (hàm `ct2_khen_chuoi_moc`) đang mở cho người lạ chưa đăng nhập: lấy được **họ tên + mã** của toàn bộ cán bộ, và **bắn thông báo/push** giả tới điện thoại cán bộ. | Cơ sở dữ liệu |
| 🟠 **CAO** | **Khóa API trả tiền của dịch vụ AI** bị gửi nguyên về trình duyệt của quản trị viên. | `src/pages/AIPromptsAdmin.tsx` |
| 🟠 **CAO** | Cờ "bắt buộc đổi mật khẩu" người dùng **tự tắt được** → mật khẩu tạm dùng mãi mãi. | `useAuth` + `App.tsx` |
| 🟡 **VỪA** | Quyền của ~11 hàm máy chủ dựa trên một "vé" chưa kiểm dấu; 9 hàm chưa khai trong file cấu hình. | `supabase/functions/*` |
| 🟡 **VỪA** | Hàm gửi email có thể gửi tới **địa chỉ bất kỳ** từ tên miền ngân hàng → mồi lừa đảo. | `send-transactional-email` |
| 🟡 **VỪA** | Hai kho ảnh (`avatars`, `skill-images`) để **công khai**, không giới hạn loại/kích thước file. | Kho lưu trữ |
| 🟡 **VỪA** | Trang đăng nhập **chưa có CAPTCHA và chưa chặn dò mật khẩu** (xem Mục D). | `src/pages/Login.tsx` |
| 🟢 **THẤP** | Dữ liệu cá nhân còn sót trong trình duyệt sau khi đăng xuất; vài việc dọn dẹp thư viện. | Nhiều nơi |

**Về câu hỏi CAPTCHA chống AI (Mục D):** **Không cần** một loại CAPTCHA "đặc biệt, kỳ lạ"
để chống AI. Loại CAPTCHA ô ảnh kiểu cũ giờ **AI giải được 90–100%**, vừa vô dụng vừa làm
phiền 150 cán bộ. Thứ đúng và đủ là bật **Cloudflare Turnstile** — Supabase hỗ trợ sẵn,
**vô hình** (cán bộ hầu như không phải bấm gì), miễn phí — cộng với giới hạn số lần thử và
**xác thực 2 lớp cho tài khoản quản trị**. Chi tiết và lý do ở Mục D.

**Điểm tổng thể: 7.5/10** — nền tảng tốt, nhưng 1 lỗ nghiêm trọng kéo điểm xuống. Sau khi
làm xong Mục A và Mục B, hệ thống sẽ ở mức **9/10**.

---

## 1. Cách đọc báo cáo này (giải thích 3 từ khóa)

Chỉ cần hiểu 3 từ này là đọc được cả báo cáo:

- **RLS (Row Level Security — "khóa từng dòng")**: hãy tưởng tượng cơ sở dữ liệu là một tủ
  hồ sơ khổng lồ. RLS là quy tắc "ai được mở ngăn nào". Ví dụ: cán bộ A chỉ mở được hồ sơ
  của phòng mình. **RLS là hàng rào THẬT.** Việc ẩn nút bấm trên màn hình **không phải** là
  bảo mật — vì kẻ gian không bấm nút, họ gọi thẳng vào tủ hồ sơ.
- **anon ("người lạ")**: bất kỳ ai vào website mà **chưa đăng nhập**. Kể cả kẻ xấu trên
  Internet. Mục tiêu: người lạ **không được thấy gì** ngoài trang đăng nhập.
- **edge function ("hàm máy chủ")**: những đoạn xử lý chạy trên máy chủ (tạo tài khoản, gửi
  email, gửi thông báo…). Vì chạy trên máy chủ nên chúng có "chìa khóa vạn năng"
  (service_role) — mở được mọi ngăn tủ. Do đó ai gọi được chúng là chuyện sống còn.

**Mức độ ưu tiên** trong báo cáo:
- 🔴 **NGHIÊM TRỌNG** = kẻ lạ khai thác được ngay, làm hôm nay.
- 🟠 **CAO** = rủi ro thật, làm trong tuần này.
- 🟡 **VỪA** = nên làm trong tháng, giảm rủi ro rõ rệt.
- 🟢 **THẤP** = dọn dẹp cho sạch, làm khi có thời gian.

---

## MỤC A — VIỆC PHẢI LÀM NGAY (🔴 và 🟠)

### A1. 🔴 Bịt "cửa phụ" `ct2_khen_chuoi_moc` — người lạ đang lấy được danh sách cán bộ và bắn push giả

**Lỗ hổng là gì (giải thích dễ hiểu):**
Trong hệ thống có một "người giúp việc đặc biệt" tên là `ct2_khen_chuoi_moc`. Nhiệm vụ của
nó là mỗi sáng khen những cán bộ đi làm đúng giờ nhiều ngày liền. Vì phải đọc được của mọi
người nên nó được trao **chìa khóa vạn năng** (chạy kiểu SECURITY DEFINER — bỏ qua hàng rào
RLS).

Người giúp việc này lẽ ra chỉ nghe lệnh của quản trị viên. Nhưng câu lệnh kiểm tra bị viết
**ngược**, đại ý:

> "NẾU có người đăng nhập **VÀ** người đó **không phải** quản trị → đuổi."

Vấn đề: kẻ lạ thì **chưa đăng nhập**, nên vế "có người đăng nhập" đã **sai**, cả câu thành
sai → **không đuổi ai cả**. Kết quả: **bất kỳ ai trên Internet**, chỉ cần địa chỉ web (khóa
công khai vốn nằm sẵn trong trang), là ra lệnh được cho người giúp việc cầm chìa khóa vạn
năng này.

**Vì sao nguy hiểm (đã kiểm chứng trên hệ thống thật):**
- Kẻ lạ gọi hàm này sẽ nhận về **họ tên đầy đủ + mã định danh** của **mọi cán bộ đang làm
  việc** có chuỗi đúng giờ. Đổi tham số ngày, họ **quét ngược cả lịch sử** để gom gần như
  toàn bộ danh sách nhân sự.
- Nếu thêm một tham số nhỏ (`_that = true`), hàm sẽ **ghi thông báo vào hệ thống và bắn
  Web Push tới điện thoại cán bộ** — tức là kẻ lạ **giả danh hệ thống gửi tin tới cán bộ**.

Tôi đã xác nhận trực tiếp: quyền chạy của hàm này ghi rõ `anon=X` (người lạ **được** chạy),
và câu lệnh kiểm tra đúng là bị viết ngược như trên. Đây **không phải suy đoán**.

> **Vì sao chỉ mình hàm này dính?** Đây là một sơ suất lẻ, không phải lỗi hệ thống. Tất cả
> "anh em" cùng họ của nó (`ct2_nhac_nhip_sang`, `ct2_chuoi_dung_gio`, `ct2_chon_cau_mo_ngay`,
> `gop_y_ban_tin_sang`…) **đều đã được khóa đúng**. Chỉ hàm này bị bỏ sót.

**Cách sửa — từng bước:**

1. Đăng nhập trang quản trị Supabase → chọn project `whlysprzsguehxmrjwha`.
2. Bấm mục **SQL Editor** (biểu tượng khung soạn lệnh) → **New query**.
3. Dán **đúng** đoạn sau vào rồi bấm **Run**:

```sql
-- (1) KHÓA CỬA: không cho người lạ / người dùng thường gọi hàm này nữa.
REVOKE ALL ON FUNCTION public.ct2_khen_chuoi_moc(boolean, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.ct2_khen_chuoi_moc(boolean, timestamptz) TO service_role;

-- (2) SỬA CÂU KIỂM TRA CHO ĐÚNG CHIỀU: bắt buộc phải là quản trị mới được chạy.
--     (Chạy tự động ban đêm vẫn dùng chìa khóa service_role nên không bị chặn.)
CREATE OR REPLACE FUNCTION public.ct2_khen_chuoi_moc(_that boolean DEFAULT false, _moc timestamptz DEFAULT now())
RETURNS TABLE(nguoi uuid, ho_ten text, chuoi integer, tieu_de text, noi_dung text, da_gui boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  cac_moc CONSTANT int[] := ARRAY[5, 10, 20, 50, 100];
  ngay_vn date := (_moc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  r record; v_chuoi int; v_moc_sau int; v_tieu_de text; v_noi_dung text;
  v_gui boolean; co_gui boolean := false;
BEGIN
  -- SỬA: chặn mọi lời gọi KHÔNG phải service_role và KHÔNG phải quản trị.
  -- Người lạ (auth.uid() = NULL) và cán bộ thường đều bị đuổi ở đây.
  IF auth.uid() IS NOT NULL THEN
    IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role)
            OR public.has_role(auth.uid(), 'tcth_admin'::app_role)) THEN
      RAISE EXCEPTION 'Chỉ TCTH/quản trị hệ thống được chạy khen mốc chuỗi';
    END IF;
  ELSIF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
        AND current_user <> 'service_role' THEN
    -- Không có phiên đăng nhập và cũng không phải cron service_role → từ chối.
    RAISE EXCEPTION 'Không có quyền chạy khen mốc chuỗi';
  END IF;

  IF NOT public.ct2_la_ngay_lam_viec(_moc) THEN RETURN; END IF;

  FOR r IN
    SELECT a.nguoi AS ai, p.full_name AS ten
      FROM public.ct2_anh_chup_nhip a
      JOIN public.profiles p ON p.id = a.nguoi AND p.status = 'active'
     WHERE a.ngay = ngay_vn AND a.ket_qua = 'DUNG_GIO'
       AND NOT EXISTS (SELECT 1 FROM public.ct2_thong_bao t
              WHERE t.ma_su_kien = 'CHUOI_MOC' AND t.nguoi_nhan = a.nguoi
                AND (t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ngay_vn)
     ORDER BY p.full_name
  LOOP
    v_chuoi := public.ct2_chuoi_dung_gio(r.ai);
    IF NOT (v_chuoi = ANY (cac_moc)) THEN CONTINUE; END IF;
    SELECT min(m) INTO v_moc_sau FROM unnest(cac_moc) m WHERE m > v_chuoi;
    v_tieu_de := 'Chuỗi đúng giờ: ' || v_chuoi || ' ngày liền';
    v_noi_dung :=
      CASE v_chuoi
        WHEN 5  THEN 'Tròn một tuần làm việc không sót nhịp nào.'
        WHEN 10 THEN 'Hai tuần liền mạch — nhịp đã thành thói quen.'
        WHEN 20 THEN 'Tròn một tháng làm việc, không sót một ngày.'
        WHEN 50 THEN 'Mười tuần liền mạch — kỷ luật thành bản năng.'
        ELSE         'Một trăm ngày làm việc không sót nhịp nào.'
      END || E'\n' ||
      CASE WHEN v_moc_sau IS NULL THEN 'Từ đây, mỗi ngày là một kỷ lục mới.'
           ELSE 'Mốc kế tiếp: ' || v_moc_sau || ' ngày.' END;
    IF _that THEN
      v_gui := public.ct2_dat_thong_bao('CHUOI_MOC', r.ai, v_tieu_de, v_noi_dung, 'KHEN', NULL, NULL);
      IF v_gui THEN co_gui := true; END IF;
    ELSE v_gui := false; END IF;
    nguoi := r.ai; ho_ten := r.ten; chuoi := v_chuoi;
    tieu_de := v_tieu_de; noi_dung := v_noi_dung; da_gui := v_gui;
    RETURN NEXT;
  END LOOP;
  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
END
$function$;
```

4. **Kiểm tra đã bịt xong:** mở **New query** khác, dán và **Run**:

```sql
-- Phải thấy dòng anon KHÔNG còn chữ X (không còn quyền chạy).
select proname,
       coalesce(array_to_string(proacl::text[], ' | '), '(mac dinh PUBLIC)') as quyen
from pg_proc where proname = 'ct2_khen_chuoi_moc';
```

Nếu trong cột `quyen` không còn thấy `anon=X` là **đã khóa thành công**.

5. **Ghi lại** vào README trạng thái: "đã áp migration khóa `ct2_khen_chuoi_moc`
   ngày …". (Theo quy ước repo, mỗi thay đổi CSDL cần một file trong
   `supabase/migrations/` + file gỡ trong `supabase/rollbacks/`. Bạn có thể lưu đoạn
   trên thành `supabase/migrations/20260824090000_khoa_ct2_khen_chuoi_moc.sql`.)

**Có làm sập web không?** **Không.** Việc khen chuỗi vẫn chạy bình thường vì **cron ban đêm
dùng chìa khóa `service_role`** — vẫn được phép. Chỉ có "người lạ" và "cán bộ thường" là
không gọi thẳng được nữa (mà họ vốn **không cần** gọi). Cán bộ vẫn nhận tin khen như cũ.

**File gỡ (nếu cần lùi lại):** lưu `supabase/rollbacks/20260824090000_khoa_ct2_khen_chuoi_moc_down.sql`
với nội dung `GRANT EXECUTE ON FUNCTION public.ct2_khen_chuoi_moc(boolean, timestamptz) TO anon, authenticated;`
(chỉ dùng khi buộc phải khôi phục trạng thái cũ — **không khuyến khích**).

---

### A2. 🟠 Đừng gửi "khóa API trả tiền" của AI về trình duyệt

**Lỗ hổng là gì:**
Trang quản trị prompt AI (`src/pages/AIPromptsAdmin.tsx`) khi mở lên sẽ **tải nguyên khóa
API của nhà cung cấp AI** (DeepSeek/Lovable…) từ bảng `ai_settings` về máy của quản trị
viên, rồi mới che bớt chỉ hiện 4 số cuối. Nhưng **khóa đầy đủ đã nằm trong trình duyệt** —
ai mở tab Network (F12) hoặc chiếm được phiên của quản trị là lấy được nguyên khóa. Khóa
này còn được **lưu dạng chữ thường (không mã hóa)** trong cơ sở dữ liệu.

**Vì sao nguy hiểm:** khác với "khóa công khai anon" (vốn thiết kế để lộ), đây là **khóa
tính tiền thật**. Lộ ra là người khác tiêu tiền AI của chi nhánh, hoặc dùng khóa cho việc
xấu.

**Cách sửa — từng bước (nguyên tắc: khóa bí mật chỉ được nằm ở máy chủ):**

1. Đưa khóa vào **Supabase Vault** (két sắt) hoặc **Secrets của Edge Function**, thay vì cột
   `api_key` trong bảng. Trên Dashboard: **Project Settings → Edge Functions → Secrets** →
   thêm `AI_PROVIDER_API_KEY = <khóa thật>`.
2. Sửa hàm `ai-advisor` (máy chủ) để **đọc khóa từ Secret** đó (`Deno.env.get('AI_PROVIDER_API_KEY')`),
   đúng như cách nó đã đọc `SUPABASE_SERVICE_ROLE_KEY`. Máy chủ giữ khóa, trình duyệt không
   bao giờ thấy.
3. Trong trang `AIPromptsAdmin.tsx`, **ngừng `select` cột `api_key`**. Thay vào đó chỉ hỏi
   máy chủ một câu "đã cài khóa chưa?" (true/false). Ví dụ đổi truy vấn thành:
   `select('provider, api_base_url')` và bỏ mọi chỗ đọc `settingsRow.api_key`.
4. Sau khi chuyển xong, chạy SQL xóa cột khóa cũ để không còn bản chữ thường:
   ```sql
   -- Chỉ chạy SAU KHI ai-advisor đã đọc khóa từ Secret và hoạt động ổn.
   UPDATE public.ai_settings SET api_key = NULL;
   ```

**Có làm sập web không?** Không, **miễn là làm đúng thứ tự**: cài Secret và sửa `ai-advisor`
đọc Secret **trước**, xác nhận tính năng AI vẫn trả lời được, **rồi mới** xóa cột khóa cũ.
Cán bộ dùng tính năng AI không thấy khác biệt gì.

---

### A3. 🟠 Vá cờ "bắt buộc đổi mật khẩu" mà người dùng tự tắt được

**Lỗ hổng là gì:**
Khi quản trị cấp mật khẩu tạm, hệ thống gắn một cái cờ `must_change_password` để **ép** người
đó đổi mật khẩu trước khi dùng. Nhưng cờ này được lưu ở `user_metadata` — mà **chính người
dùng có quyền tự sửa** `user_metadata` (đó là cách hợp lệ mà app dùng để xóa cờ sau khi đổi
mật khẩu). Hậu quả: người cầm mật khẩu tạm chỉ cần gõ một câu lệnh trong console trình duyệt
là **tự tắt cờ**, rồi **dùng mãi mật khẩu tạm** mà không đổi.

**Vì sao nguy hiểm:** mật khẩu tạm thường đơn giản, do quản trị đặt, và có thể đã bị nhìn
thấy trong lúc bàn giao. Ép đổi là để không dùng lâu dài — lỗ hổng này vô hiệu hóa đúng biện
pháp đó.

**Cách sửa — chọn 1 trong 2 (khuyến nghị cách A):**

- **Cách A (chắc nhất): chuyển cờ sang nơi người dùng KHÔNG sửa được.**
  1. Dùng một cột trong bảng `profiles` do RLS bảo vệ, ví dụ `phai_doi_mat_khau boolean`,
     chỉ máy chủ (service_role) mới ghi được.
  2. Hàm tạo tài khoản / cấp lại mật khẩu (`create-staff-user`, `reset-staff-password`) đặt
     cột này = true.
  3. Khi cán bộ đổi mật khẩu xong, một hàm máy chủ đặt lại = false.
  4. `useAuth` đọc cột này thay vì đọc `user_metadata`.
- **Cách B (nhanh hơn): dùng `app_metadata`.** `app_metadata` **chỉ máy chủ ghi được**,
  người dùng không sửa được. Chuyển cờ từ `user_metadata` sang `app_metadata` trong các hàm
  máy chủ, và `useAuth` đọc từ `app_metadata`.
- **Kèm theo (cả hai cách):** bật thiết lập **"Secure password change"** trong Supabase Auth
  để đổi mật khẩu **bắt buộc nhập lại mật khẩu hiện tại** (chặn kẻ chiếm phiên đổi trộm).

**Có làm sập web không?** Không, nếu cập nhật đồng bộ 3 chỗ (hàm cấp mật khẩu, hàm xóa cờ,
và `useAuth`). Trải nghiệm cán bộ giữ nguyên: cấp mật khẩu tạm → bị ép đổi → đổi xong dùng
bình thường.

---

## MỤC B — NÊN LÀM SỚM (🟡 VỪA)

### B1. 🟡 Siết cửa các hàm máy chủ: "kiểm dấu vé" và khai đủ trong file cấu hình

**Lỗ hổng là gì:**
Khoảng **11 hàm máy chủ** quyết định "ai được gọi" bằng cách **đọc nội dung tấm vé (JWT)
nhưng KHÔNG kiểm con dấu** của nó — kiểu như bảo vệ đọc chữ trên vé mà không soi vé thật hay
giả. Hôm nay **chưa khai thác được**, vì cổng nền tảng Supabase đã soi dấu giúp trước khi
vào hàm. Nhưng cái "cổng soi giúp" đó bật/tắt bằng **một dòng cấu hình** (`verify_jwt`) —
và **9 hàm chưa được khai trong `supabase/config.toml`**, nghĩa là trạng thái của chúng
không nằm trong mã nguồn, dễ bị đổi âm thầm. Chỉ cần một hàm bị tắt nhầm là cửa mở toang.

Các hàm đọc-vé-không-soi-dấu gồm: `send-transactional-email`, `process-email-queue`,
`notify-kanban-update`, `notify-ct2`, `nhac-lich-nghi`, `quiz-reminders`,
`weekly-kanban-digest`, `ct2-nhip-bao-cao`, `send-reminders`, `send-feature-tip-push`,
`notify-idea-council`.

**Cách sửa — từng bước:**

1. **Khai đủ 9 hàm còn thiếu** vào `supabase/config.toml`, mỗi hàm ghi rõ `verify_jwt`.
   Ví dụ thêm các khối:
   ```toml
   [functions.approve-registration]
     verify_jwt = true
   [functions.create-guest-user]
     verify_jwt = true
   [functions.ct2-nhip-bao-cao]
     verify_jwt = true
   [functions.nhac-lich-nghi]
     verify_jwt = true
   [functions.notify-ct2]
     verify_jwt = true
   [functions.notify-idea-council]
     verify_jwt = true
   [functions.notify-kanban-update]
     verify_jwt = true
   [functions.quiz-reminders]
     verify_jwt = true
   [functions.weekly-kanban-digest]
     verify_jwt = true
   ```
   (Đây chỉ là "ghi lại cho rõ" đúng trạng thái mặc định — không đổi hành vi, nên **không
   gây gián đoạn**.)
2. **Về lâu dài**, đổi cách kiểm quyền trong các hàm đó từ "đọc vé" sang **soi dấu thật**:
   dùng `admin.auth.getUser(token)` (như `notify-idea-council` và `send-hr-notification`
   đã làm đúng) hoặc so sánh với một **bí mật cron** riêng bằng cách so **an toàn theo thời
   gian không đổi** (constant-time). Làm dần từng hàm, mỗi hàm kiểm thử xong mới sang hàm kế.

**Có làm sập web không?** Bước 1 hoàn toàn an toàn. Bước 2 làm từng hàm và thử kỹ nên không
ảnh hưởng cán bộ.

---

### B2. 🟡 Hàm gửi email: chỉ cho gửi tới người trong hệ thống

**Lỗ hổng là gì:** `send-transactional-email` nhận **địa chỉ người nhận từ phía gọi** và gửi
thư đi **từ tên miền đã xác thực của ngân hàng**. Nếu ai đó vượt được lớp kiểm quyền yếu ở
B1, họ có thể gửi thư "Tài khoản của bạn đã được duyệt" nhìn **y như thật** tới bất kỳ ai —
đây là mồi lừa đảo rất lợi hại vì đến từ tên miền thật.

**Cách sửa:** đổi hàm để **không nhận địa chỉ tùy ý**. Người nhận phải được **tra ra từ cơ
sở dữ liệu** theo mã hồ sơ (giống `send-hr-notification` đang làm đúng: nhận
`recipient_profile_id` rồi tự tra email trong bảng `profiles`). Đồng thời kẹp lớp kiểm quyền
"soi dấu thật" như B1.

**Có làm sập web không?** Không, vì luồng thật (duyệt đăng ký → gửi thư cho đúng người vừa
được tạo) vẫn tra được email từ hồ sơ. Chỉ chặn khả năng gửi tới địa chỉ "vẽ ra".

---

### B3. 🟡 Đóng bớt hai kho ảnh công khai và đặt giới hạn file

**Lỗ hổng là gì:** có 5 kho ảnh. Ba kho nhạy cảm (`bhy-one`, `ky-yeu`, `bhy-gop-y`) đã để
**riêng tư + link có hạn giờ** — rất tốt. Nhưng hai kho `avatars` (ảnh đại diện cán bộ) và
`skill-images` để **công khai**: ai có đường dẫn là xem được **không cần đăng nhập**. Thêm
nữa, `avatars`, `skill-images`, `ky-yeu` **không giới hạn loại file và dung lượng** → một
cán bộ có thể tải lên file `.html`/`.svg` bất kỳ và có được một đường dẫn công khai **trên
hạ tầng gắn với ngân hàng** (mồi lừa đảo).

**Cách sửa — từng bước:**

1. Nếu ảnh đại diện **không cần** cho người ngoài xem, chuyển hai kho về riêng tư:
   ```sql
   UPDATE storage.buckets SET public = false WHERE id IN ('avatars','skill-images');
   ```
   rồi cho app đọc ảnh bằng **link ký tên có hạn giờ** (`createSignedUrl`) như các kho kia.
2. Đặt **giới hạn loại và dung lượng** cho các kho còn thiếu:
   ```sql
   UPDATE storage.buckets
      SET file_size_limit = 5242880,  -- 5 MB
          allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
    WHERE id IN ('avatars','skill-images');
   ```
3. Ở phía tải lên (`EditMyProfile.tsx`, `SkillMediaPage.tsx`): **kiểm loại file** trước khi
   tải, và **suy đuôi file từ loại ảnh thật** thay vì tin tên file người dùng gõ; truyền
   `contentType` cố định khi `upload`.

**Có làm sập web không?** Nếu chọn giữ `avatars` công khai (chấp nhận được vì chỉ là ảnh đại
diện), thì **chỉ cần làm bước 2 và 3** — hoàn toàn không ảnh hưởng. Nếu chuyển sang riêng tư
(bước 1) thì phải sửa chỗ hiển thị ảnh sang link ký tên; nên làm và thử trên một trang trước.

> Ghi chú: hai kho công khai này là **đánh đổi thường gặp** (đỡ phải ký link mỗi lần hiện
> ảnh). Với công cụ nội bộ ngân hàng, chuyển riêng tư là an toàn hơn, nhưng nếu bận thì
> **ưu tiên bước 2+3 trước** (chặn tải file lạ) vì đó mới là phần rủi ro hơn.

---

### B4. 🟡 Chống "chèn công thức" khi xuất file Excel/CSV

**Lỗ hổng là gì:** có 3 chỗ xuất CSV (`KanbanAdminPage`, `TrainingNeedsPage`,
`Credit360Pillar` — chỗ cuối chứa **tên khách hàng**). Nếu một ô dữ liệu bắt đầu bằng
`=`, `+`, `-` hoặc `@`, khi mở bằng Excel nó bị hiểu là **công thức** và có thể chạy lệnh
độc hại trên máy người mở file.

**Cách sửa:** trước khi ghi mỗi ô, nếu ký tự đầu là `= + - @` (hoặc tab/enter) thì thêm một
dấu nháy đơn `'` vào đầu để Excel hiểu là chữ, không phải công thức. Viết một hàm nhỏ dùng
chung cho cả 3 chỗ:

```ts
function oCsvAnToan(v: unknown): string {
  const s = String(v ?? '');
  const canChan = /^[=+\-@\t\r]/.test(s);
  const day = (canChan ? "'" + s : s).replace(/"/g, '""');
  return `"${day}"`;
}
```

**Có làm sập web không?** Không. File xuất ra vẫn mở bình thường, chỉ khác là các ô "nguy
hiểm" được hiển thị dưới dạng chữ.

---

### B5. 🟡 Xóa dữ liệu cá nhân còn sót khi đăng xuất

**Lỗ hổng là gì:** khi đăng xuất, hệ thống mới chỉ xóa **một** khóa. Còn lại vẫn nằm trong
trình duyệt: **bản nháp ghi chú hành vi về đồng nghiệp** (`343skill:nep-tot-...`), **bản
phác chân dung năng lực do AI viết** (`ai-portrait-*`), và **bản PDF kỷ yếu** (trong
IndexedDB). Trên **máy dùng chung ở chi nhánh**, người sau có thể đọc được của người trước.

**Cách sửa:** trong hàm `signOut` (`src/hooks/useAuth.tsx`), gọi dọn các mục này. Hàm dọn
nháp `clearQuickNoteDraft()` đã có sẵn (`src/lib/hanhVi.ts`) nhưng chưa được gọi. Ví dụ:

```ts
// trong signOut, trước khi supabase.auth.signOut()
try {
  clearQuickNoteDraft();
  Object.keys(localStorage)
    .filter((k) => k.startsWith('ai-portrait-'))
    .forEach((k) => localStorage.removeItem(k));
  indexedDB.deleteDatabase('bhyone-ky-yeu'); // xóa cache kỷ yếu
} catch { /* trình duyệt chặn — bỏ qua */ }
```

**Có làm sập web không?** Không. Lần dùng sau chỉ mất vài giây tải lại PDF kỷ yếu; đổi lại
máy dùng chung sạch dữ liệu người trước.

---

## MỤC C — LÀM KHI RẢNH (🟢 THẤP / dọn dẹp)

Các việc này rủi ro thấp nhưng nên dọn cho gọn:

1. **Hai "khung nhìn" (view) hở cho người lạ.** `ct2_suc_khoe_kho_cau` và
   `ct2_hieu_qua_theo_nhom` chạy kiểu bỏ qua RLS và **người lạ đọc được** (tôi đã thử: ra
   11 và 7 dòng). Hiện chỉ là **số liệu tổng hợp** (không lộ từng người), nhưng nên bịt:
   ```sql
   ALTER VIEW public.ct2_suc_khoe_kho_cau  SET (security_invoker = true);
   ALTER VIEW public.ct2_hieu_qua_theo_nhom SET (security_invoker = true);
   REVOKE ALL ON public.ct2_suc_khoe_kho_cau,  public.ct2_hieu_qua_theo_nhom FROM anon;
   ```
   *Lưu ý:* sau khi bật `security_invoker`, hãy mở màn hình dùng hai view này (trang nhịp
   sáng CT2) bằng tài khoản cán bộ thường để chắc rằng vẫn hiện đúng; nếu không hiện, thêm
   policy SELECT phù hợp cho `authenticated` trên các bảng gốc.

2. **Ba bảng "câu mở ngày" cho phép mọi tài khoản đăng nhập đọc** (kể cả khách đối tác) —
   nội dung chỉ là câu châm ngôn tạo động lực, rủi ro thấp; nếu muốn chuẩn hóa thì đổi policy
   sang `USING (public.is_staff(auth.uid()))` như quy ước chung.

3. **Cập nhật thư viện có lỗ hổng (`npm audit` báo 9 điểm).** Chạy:
   ```sh
   npm audit fix        # vá phần an toàn, không đổi phiên bản lớn
   npm run test && npx tsc --noEmit -p tsconfig.app.json   # kiểm lại xanh
   ```
   Các điểm cần lưu ý: `react-router` (lỗi chuyển hướng — nên cập nhật), `nanoid`,
   `js-yaml`, `dompurify`. Riêng `esbuild/vite` chỉ ảnh hưởng **máy phát triển**, không ảnh
   hưởng bản chạy thật. **Đừng** chạy `npm audit fix --force` (sẽ nâng phiên bản lớn, dễ vỡ)
   — nếu cần thì làm riêng, thử kỹ.

4. **Gỡ "cầu đăng nhập Lovable" chết.** File `src/integrations/lovable/index.ts` nhận token
   từ một bên thứ ba rồi cài làm phiên đăng nhập — hiện **không nơi nào dùng** nên đã bị loại
   khỏi bản build, nhưng file ghi "tự sinh, đừng sửa" nên có thể sống lại khi Lovable tái
   tạo. Với cổng nội bộ ngân hàng, quan hệ tin cậy này nên **xóa hẳn** cho chắc.

5. **Một bí mật dùng cho 3 việc.** `LOVABLE_API_KEY` vừa là khóa xác thực webhook, vừa là
   "vé" cho hàm xem trước email, vừa là khóa gửi thư. Lộ một chỗ là hỏng cả ba. Nên tách
   thành 3 bí mật riêng.

6. **Token hủy nhận thư (unsubscribe) không hết hạn + không giới hạn số lần thử.** Nên thêm
   `expires_at` cho token và giới hạn tần suất, tránh bị lạm dụng chặn thư của cán bộ.

7. **Thêm "cổng kiểm" cho thư viện trong CI.** File `.github/workflows/kiem-tra.yml` hiện
   chạy `tsc` và test, nhưng **chưa có `npm audit` / Dependabot / CodeQL**. Thêm một bước
   `npm audit --audit-level=high` (không chặn build, chỉ cảnh báo) để lần sau tự phát hiện.
   Đồng thời: **tuyệt đối không dùng `build:dev` để triển khai** (bản đó kèm công cụ gắn thẻ
   Lovable, lộ đường dẫn mã).

8. **Vài lớp phòng thủ chiều sâu nhỏ:**
   - `service worker` (`public/sw.js`) mở URL từ push mà chưa kiểm cùng miền — thêm kiểm
     `new URL(url, self.location.origin).origin === self.location.origin`.
   - Hàm dọn URL `safeHref` bị vô hiệu bởi chính đoạn `?? giá_trị_gốc` (khôi phục lại giá
     trị xấu đúng lúc cần chặn) ở `CardDetailDialog.tsx`; và một chỗ ở `LeadershipMarksPage`
     chưa lọc. Nên bỏ đoạn `?? raw` và lọc scheme `http/https` trước khi hiển thị link do
     cán bộ nhập.
   - Kiểm URL trong hàm `reset-staff-password` (`safeResetRedirect`) mới xét giao thức và
     đường dẫn mà **chưa xét tên miền** — thêm kiểm host nằm trong danh sách cho phép.
   - CSP còn `script-src 'unsafe-inline'` (đã ghi chú sẵn cách gỡ bằng hash SHA-256) — gỡ
     được thì lớp chống XSS mạnh hơn nữa.

---

## MỤC D — NGHIÊN CỨU: CÓ CẦN CAPTCHA "ĐẶC BIỆT" ĐỂ CHỐNG AI KHÔNG?

Đây là câu hỏi trọng tâm, nên tôi trả lời kỹ.

### D1. Trả lời ngắn

**KHÔNG cần một loại CAPTCHA "đặc biệt, kỳ lạ" để chống AI.** Điều nên làm là bật
**Cloudflare Turnstile** (Supabase hỗ trợ sẵn) cho 3 cửa: **đăng nhập, quên mật khẩu, và
đăng ký** — kèm **giới hạn số lần thử** và **xác thực 2 lớp (MFA) cho tài khoản quản trị**.
Đây là phương án **vô hình với cán bộ, miễn phí, và chống bot/AI hiệu quả**.

### D2. Vì sao KHÔNG dùng CAPTCHA ô ảnh kiểu cũ

Nghiên cứu 2024–2026 cho thấy CAPTCHA ô ảnh (kiểu reCAPTCHA v2 "chọn ô có đèn giao thông")
**đã bị AI đánh bại**:

- Một nghiên cứu của **ETH Zürich (2024)** dùng AI nhận diện vật thể (YOLO) giải
  reCAPTCHA v2 **gần như 100%**.
- Thống kê 2025 cho thấy bot giải các CAPTCHA phổ biến với độ chính xác **~90–100%**, trong
  **dưới 1 giây**, trong khi con người chỉ đúng 50–84% và mất 9–15 giây.

Nói cách khác: CAPTCHA ô ảnh vừa **không cản được AI**, vừa **làm phiền 150 cán bộ thật** mỗi
ngày. Đây là lựa chọn **tệ nhất**.

### D3. Vì sao Cloudflare Turnstile là lựa chọn đúng cho hệ thống này

Turnstile **không bắt bấm chọn ảnh**. Nó chạy ngầm, phân tích **tín hiệu trình duyệt** và
đặt một "bài toán nhỏ" cho máy tính (proof-of-work) để phân biệt người thật với bot. Với cán
bộ, phần lớn trường hợp **không phải làm gì cả** (một dấu tick tự động). Ưu điểm cho đúng
tình huống của Bắc Hưng Yên ONE:

- **Vô hình → không cản trở 150 cán bộ** đăng nhập mỗi ngày (yêu cầu "vận hành trơn tru").
- **Miễn phí**, và **Supabase tích hợp sẵn** — không phải tự dựng.
- **Chống được bot tự động/AI dò mật khẩu** ở mức phù hợp: kẻ tấn công phải chạy trình duyệt
  thật cho từng lần thử, đắt hơn nhiều so với gọi API hàng loạt.

> Có cần thứ mạnh hơn Turnstile (ví dụ "proof-of-work" như Friendly Captcha/ALTCHA, hay
> phân tích hành vi)? **Không, với hệ thống này.** Những thứ đó dành cho website công cộng
> hứng hàng triệu bot. Đây là **công cụ nội bộ, ~150 người, tài khoản do quản trị cấp,
> không cho tự đăng ký, người lạ không ghi được gì** (tôi đã kiểm chứng). "Mối đe dọa" thực
> tế không phải làn sóng bot AI, mà là **dò mật khẩu/nhồi mật khẩu** vào 3 cửa đăng nhập —
> và Turnstile + giới hạn lần thử + MFA là đủ và đúng liều.

### D4. Vì sao MFA (2 lớp) cho quản trị còn quan trọng hơn CAPTCHA

CAPTCHA chặn **bot**. Nhưng nếu một mật khẩu quản trị bị lộ (qua lừa đảo, dùng lại mật khẩu…),
CAPTCHA **không cứu được** — vì kẻ gian đăng nhập bằng mật khẩu đúng. Khi đó **xác thực 2
lớp (MFA/TOTP)** mới là chốt chặn: phải có thêm mã 6 số từ app trên điện thoại. Vì tài khoản
`system_admin`/`tcth_admin`/`bgd` có quyền rất lớn (tạo/xóa cán bộ, đổi mật khẩu người khác),
**bật MFA cho nhóm này là biện pháp lợi ích cao nhất** trong toàn bộ mục đăng nhập.

### D5. Các bước bật — từng bước

**Bước 1 — Bật Turnstile trong Supabase (không cần sửa nhiều mã):**

1. Tạo site key + secret key miễn phí tại **Cloudflare Turnstile** (dashboard Cloudflare →
   Turnstile → Add site). Chọn loại **"Managed"** (tự đổi giữa vô hình và có thử thách).
2. Vào Supabase: **Authentication → Settings → Bot and Abuse Protection** → chọn nhà cung
   cấp **Turnstile** → dán **Secret key** → **Save**.
3. Trong mã, thêm widget Turnstile vào 3 trang (`Login.tsx`, `ForgotPassword.tsx`, và luồng
   tạo tài khoản), lấy `captchaToken` từ widget rồi truyền vào lời gọi Supabase. Ví dụ ở
   `Login.tsx`:
   ```ts
   const { error } = await supabase.auth.signInWithPassword({
     email: taiKhoan,
     password,
     options: { captchaToken },   // token lấy từ widget Turnstile
   });
   ```
   Tương tự cho `resetPasswordForEmail(email, { captchaToken, redirectTo })`.
4. Nạp script Turnstile: vì trang đang đặt **CSP** chặt (`script-src 'self'`), cần **thêm
   `https://challenges.cloudflare.com`** vào `script-src` và `frame-src` trong **cả**
   `vercel.json` và `public/_headers`. (Đây là ngoại lệ có kiểm soát, chỉ cho Cloudflare.)

**Bước 2 — Bật MFA cho quản trị:**

1. **Authentication → Settings** → bật **Multi-Factor Authentication (TOTP)**.
2. Thêm màn hình đăng ký MFA cho cán bộ (Supabase có sẵn API `supabase.auth.mfa.enroll`).
3. Trước mắt **bắt buộc** nhóm `system_admin`, `tcth_admin`, `bgd` bật MFA; nhóm còn lại
   khuyến khích.

**Bước 3 — Kiểm tra các giới hạn có sẵn của Supabase (không cần code):**

1. **Authentication → Rate Limits**: xác nhận giới hạn số lần đăng nhập/gửi mã theo IP đang
   bật ở mức hợp lý (Supabase mặc định có; chỉ cần rà cho chắc).
2. **Authentication → Settings → "Leaked password protection"**: **bật** — Supabase sẽ chặn
   mật khẩu đã từng lộ trên Internet (đối chiếu HaveIBeenPwned).
3. Nâng yêu cầu **độ dài/độ mạnh mật khẩu** (hiện app chỉ kiểm tối thiểu 8 ký tự phía giao
   diện — nên đặt quy tắc mạnh hơn ở tầng Supabase để không vượt được bằng cách gọi API).

**Bước 4 — Xác nhận đã tắt tự đăng ký ở tầng Supabase (quan trọng, thường bị quên):**

- App đã chặn trang tự đăng ký (`/dang-ky-tai-khoan` chuyển về đăng nhập) và **người lạ
  không ghi được** vào cơ sở dữ liệu (tôi đã kiểm). Nhưng cần chắc **cả tầng Supabase Auth**
  cũng tắt tự đăng ký: **Authentication → Settings → "Allow new users to sign up" = TẮT**.
  Nếu để bật, kẻ gian có thể gọi thẳng `/auth/v1/signup` tạo tài khoản rác (dù tài khoản đó
  không có quyền gì vì RLS chặn, vẫn là rác + là chỗ CAPTCHA phát huy tác dụng).

**Có làm sập web không?** Không, nếu làm đúng: Turnstile vô hình nên cán bộ gần như không
thấy khác biệt; MFA chỉ thêm 1 bước cho nhóm quản trị; các thiết lập rate-limit/leaked-
password là bật sẵn phía máy chủ. **Lưu ý duy nhất:** nhớ thêm miền Cloudflare vào CSP
(Bước 1.4), nếu không widget sẽ không tải và **sẽ chặn đăng nhập** — hãy thử trên bản xem
trước (preview) trước khi lên thật.

### D6. Kết luận Mục D

| Phương án | Chống AI? | Làm phiền cán bộ? | Khuyến nghị |
| --- | --- | --- | --- |
| CAPTCHA ô ảnh (reCAPTCHA v2) | ❌ AI giải 90–100% | 😖 Nhiều | **Không dùng** |
| **Cloudflare Turnstile** (Supabase hỗ trợ) | ✅ Tốt, tương xứng | 😀 Gần như vô hình | **Nên dùng** |
| Proof-of-work/hành vi (Friendly Captcha…) | ✅ Rất mạnh | 😐 Trung bình | Thừa cho nội bộ |
| **MFA 2 lớp cho quản trị** | ✅ Chặn cả khi lộ mật khẩu | 😐 Thêm 1 bước | **Rất nên (ưu tiên)** |

**Tóm lại:** không cần CAPTCHA "đặc biệt chống AI". Bật **Turnstile + giới hạn lần thử +
leaked-password + MFA cho quản trị** là phương án đúng, đủ, và không làm gián đoạn 150 cán
bộ.

---

## MỤC E — NHỮNG THỨ HỆ THỐNG ĐÃ LÀM TỐT (để yên tâm)

Đây không phải lời khen xã giao — mỗi điểm là một biện pháp cụ thể mà nhiều hệ thống khác
thiếu:

1. **Hàng rào RLS phủ 100%.** Cả **114/114 bảng** đều bật RLS. Tôi đóng vai người lạ và
   đếm được **0 dòng** ở mọi bảng nhạy cảm (`profiles`, `user_roles`, `ai_settings`,
   `audit_logs`, token hủy thư). Quyền `SELECT` mà "người lạ" có trên bảng chỉ là **mặc
   định của Supabase**, và **bị RLS chặn lại hoàn toàn**.
2. **Không cho tự đăng ký, không lộ email.** Trang tự đăng ký bị đóng; trang "quên mật khẩu"
   luôn trả cùng một câu nên **không dò được email nào có trong hệ thống**.
3. **Chặn "chuyển hướng lừa đảo" đúng chuẩn.** Đoạn xử lý `?tiep=` sau đăng nhập bắt đủ cả
   3 mánh vượt rào kinh điển (`//`, `/\`, ký tự điều khiển) và **có bài kiểm thử riêng**.
4. **Không có bí mật nào bị commit** vào mã (đã quét toàn repo). Chỉ có "khóa công khai anon"
   (vốn thiết kế để lộ) và "khóa VAPID công khai". `.env` đã bị chặn khỏi git.
5. **Các bí mật cron lấy từ két Vault**, không nhét cứng trong mã SQL.
6. **Vai trò lấy từ bảng `user_roles`**, không lấy từ dữ liệu người dùng tự sửa được — nên
   **không giả mạo vai trò được**.
7. **178/182 hàm máy chủ đặt `search_path` cố định** (chống một loại tấn công tiêm); 4 hàm
   còn lại chỉ `service_role` gọi được.
8. **Header bảo mật mạnh** trên cả Vercel lẫn Cloudflare: CSP chặt, HSTS, chống nhúng khung
   (`X-Frame-Options: DENY`), chặn dò kiểu file, ẩn khỏi công cụ tìm kiếm.
9. **Service worker không cache gì** — đóng sẵn con đường rò rỉ dữ liệu phổ biến nhất của
   ứng dụng PWA.
10. **Hai luồng tải ảnh mẫu mực** (`oneStorage.ts`, `anhGopY.ts`): giới hạn loại/kích thước,
    tên file ngẫu nhiên, kho riêng tư, link có hạn giờ, còn **vẽ lại ảnh** để phá payload ẩn.
11. **Quản lý phiên cẩn thận**: tự đăng xuất sau 60 phút không dùng, đồng bộ nhiều tab, kiểm
    "để lâu" trước khi tính lại giờ. Khóa tài khoản nghỉ việc / hết hạn khách ngay khi vào.
12. **Kỷ luật ghi log tốt**: không in mật khẩu/token; toàn bộ 15 chỗ log đều là `console.error`.
13. **Chống giả mạo trang ngân hàng có chủ ý**: trang đăng nhập cố tình không để logo/tên
    ngân hàng, và ghi rõ "đây là công cụ nội bộ, không hỏi thẻ/OTP".
14. **Khách đối tác bị chặn theo kiểu fail-closed**: khớp đường dẫn **chính xác**, màn hình
    mới mặc định **đóng** với khách.

---

## MỤC F — BẢNG KIỂM TỰ ĐÁNH GIÁ (in ra, tick dần)

**Làm ngay (🔴/🟠):**
- [ ] A1 — Khóa `ct2_khen_chuoi_moc` (REVOKE + sửa câu kiểm tra) và xác nhận `anon` hết quyền.
- [ ] A2 — Chuyển khóa API AI vào Secret/Vault; trang admin ngừng tải khóa; xóa cột khóa cũ.
- [ ] A3 — Chuyển cờ "bắt buộc đổi mật khẩu" sang nơi người dùng không sửa được; bật "Secure password change".

**Làm sớm (🟡):**
- [ ] B1 — Khai đủ 9 hàm trong `config.toml`; chuyển dần sang "soi dấu thật".
- [ ] B2 — `send-transactional-email` chỉ gửi tới người nhận tra từ CSDL.
- [ ] B3 — Đặt giới hạn loại/kích thước cho `avatars`/`skill-images`/`ky-yeu`; cân nhắc chuyển riêng tư.
- [ ] B4 — Chặn chèn công thức ở 3 chỗ xuất CSV.
- [ ] B5 — Dọn dữ liệu cá nhân trong trình duyệt khi đăng xuất.
- [ ] **D — Bật Turnstile + MFA quản trị + leaked-password + rà rate-limit + tắt tự đăng ký ở Supabase.**

**Dọn dẹp (🟢):**
- [ ] C1 — `security_invoker` + REVOKE anon cho 2 view.
- [ ] C3 — `npm audit fix` (không `--force`) + kiểm test/tsc xanh.
- [ ] C4 — Xóa cầu đăng nhập Lovable chết.
- [ ] C5 — Tách `LOVABLE_API_KEY` thành 3 bí mật.
- [ ] C6 — Token unsubscribe: thêm hạn + giới hạn tần suất.
- [ ] C7 — Thêm `npm audit` vào CI; không dùng `build:dev` để triển khai.
- [ ] C8 — Vá các lớp phòng thủ chiều sâu nhỏ (SW openWindow, safeHref, safeReset host, CSP unsafe-inline).

---

## Phụ lục — Cách tôi đã kiểm tra

- **Đọc mã**: toàn bộ `src/`, 25 edge function, `supabase/config.toml`, 200 migration, cấu
  hình Vercel/Cloudflare, `index.html`, service worker.
- **Kiểm tra trực tiếp trên cơ sở dữ liệu thật** (không chỉ đọc mã): đếm bảng có RLS
  (114/114), thử đọc dữ liệu **trong vai người lạ (anon)** trên các bảng nhạy cảm (ra 0
  dòng), rà quyền `EXECUTE` của hàm, đọc định nghĩa hàm nghi vấn, liệt kê kho ảnh + policy,
  rà job cron xem có nhét bí mật không.
- **Đối chiếu chéo**: các phát hiện từ đọc migration đều được **kiểm lại trên hệ thống đang
  chạy**. Nhờ đó loại được một cảnh báo sai (bảng `registration_requests` **không** còn cho
  ghi tự do — policy đã bị gỡ), và **xác nhận chắc** lỗ hổng A1 là thật.
- **Quét bí mật**: tìm khóa service_role / private key / JWT trong toàn repo — sạch.
- **Quét thư viện**: `npm audit`.
- **Cố vấn bảo mật Supabase** (get_advisors): 2 cảnh báo ERROR (2 view), 1 INFO, và nhóm
  cảnh báo hàm — đã phản ánh trong báo cáo.
- **Nghiên cứu CAPTCHA/AI**: tổng hợp tài liệu Supabase Auth CAPTCHA và các nghiên cứu
  2024–2026 về khả năng AI giải CAPTCHA (ETH Zürich, thống kê 2025).

> Báo cáo mô tả tình trạng ngày **23/08/2026**. Sau khi sửa, nên chạy lại `get_advisors` và
> mục "Cách tôi đã kiểm tra" ở trên để xác nhận từng lỗ hổng đã đóng.
