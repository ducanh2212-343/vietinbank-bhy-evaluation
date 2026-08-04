-- Dựng lại lớp khoá GRANT: người chưa đăng nhập không ghi được gì
--
-- Postgres kiểm hai lớp độc lập trước khi cho ghi:
--   1) GRANT   — vai này có được phép làm loại thao tác đó nói chung không?
--   2) RLS     — được đụng vào những DÒNG nào?
--
-- Hôm nay chỉ lớp 2 đang giữ. Lớp 1 mở toang: schema `public` của Supabase có
-- quyền mặc định `anon=arwdDxtm` (đọc/thêm/sửa/xoá/truncate), và vì đó là
-- DEFAULT PRIVILEGE nên mọi bảng tạo về sau cũng tự thừa hưởng.
--
-- Vì sao vẫn an toàn cho tới lúc này (đã kiểm, không suy đoán): không policy
-- nào trong toàn database có điều kiện `true`, và không có đường ghi ẩn danh
-- nào — kể cả bảng đăng ký tài khoản, nó đi qua edge function bằng service role.
--
-- Vì sao vẫn phải vá: rất nhiều policy ở đây khai `TO public`, mà trong Postgres
-- `public` gồm CẢ `anon`. Chúng an toàn chỉ nhờ điều kiện bên trong đều so với
-- auth.uid()/get_my_profile_id() — với người chưa đăng nhập thì các hàm đó trả
-- NULL nên không bao giờ đúng. Tức là hàng rào đang đứng nhờ THÓI QUEN viết
-- policy tốt, không nhờ một quyết định. Một policy `TO public` viết lỏng tay là
-- không còn lớp nào phía sau đỡ.
--
-- Giữ nguyên SELECT của anon: RLS vốn đã chặn hết, mà thu hồi thì rủi ro chạm
-- vào trang công khai nào đó chưa lường được. Chỉ đóng đường GHI.

-- ---------------------------------------------------------------------------
-- 1) Thu hồi quyền GHI của anon trên các bảng đang có
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

-- ---------------------------------------------------------------------------
-- 2) Bảng tạo về sau không thừa hưởng lại
-- ---------------------------------------------------------------------------
-- Không có bước này thì lần tới ai tạo bảng là mở lại y như cũ. Quyền mặc định
-- gắn với NGƯỜI CẤP, ở đây có hai: postgres (migration chạy dưới vai này) và
-- supabase_admin (nền tảng dựng sẵn, có thể ngoài tầm với — nên bọc DO/EXCEPTION
-- để không chặn cả migration vì một việc dọn dẹp).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon;

DO $$
BEGIN
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public '
       || 'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon';
EXCEPTION WHEN insufficient_privilege OR undefined_object THEN
  RAISE NOTICE 'Không đổi được quyền mặc định của supabase_admin — bỏ qua, phần của postgres đã đủ cho bảng do migration tạo';
END $$;
-- Mục supabase_admin nằm ngoài tầm với (nền tảng sở hữu) nên nhánh EXCEPTION
-- có chạy. Đã kiểm bằng cách tạo thật một bảng rồi rollback: bảng mới nhận
-- `anon=rxtm` — mất a/w/d/D, tức là quyền của postgres mới là quyền có hiệu
-- lực. Bảng tạo về sau được che đúng như mong muốn.

-- ---------------------------------------------------------------------------
-- 3) DELETE của cán bộ đăng nhập: chỉ để ở nơi ứng dụng thật sự cần
-- ---------------------------------------------------------------------------
-- Rà toàn bộ mã nguồn, ứng dụng chỉ gọi .delete() trên ba bảng ct2_*:
--   · ct2_theo_doi        — bỏ theo dõi phòng/thẻ
--   · ct2_bang_thanh_vien — gỡ thành viên khỏi bảng Kanban
--   · ct2_cam_xuc         — bỏ thả cảm xúc
-- Những bảng còn lại KHÔNG có đường xoá nào trong sản phẩm; để nguyên GRANT chỉ
-- là để sẵn một khẩu súng đã lên đạn. Đặc biệt ct2_dau_viec và
-- ct2_ho_so_tin_dung: nhịp PDCA nối CASCADE nên xoá một thẻ là xoá sạch nhật ký
-- của nó — mất vết vĩnh viễn, không hoàn tác được.
REVOKE DELETE ON
  public.ct2_dau_viec, public.ct2_ho_so_tin_dung, public.ct2_nhip_pdca,
  public.ct2_nhip_ho_so, public.ct2_binh_luan, public.ct2_de_xuat,
  public.ct2_chien_dich, public.ct2_bang, public.ct2_thong_bao,
  public.ct2_anh_chup_nhip, public.ct2_bang_chung_dau_an,
  public.ct2_cau_hinh_thoi_gian, public.ct2_phong_pdtd,
  public.ct2_nhat_ky_thay_doi
FROM authenticated;

-- service_role (edge function, cron, nhập liệu lịch sử) giữ nguyên toàn quyền —
-- xoá cứng vẫn làm được, nhưng phải qua can thiệp có chủ ý của quản trị chứ
-- không qua giao diện.
