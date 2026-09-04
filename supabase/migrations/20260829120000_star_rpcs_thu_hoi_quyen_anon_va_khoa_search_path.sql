-- Vá theo cảnh báo advisor sau đợt tạo RPC sổ sao 29/08:
--
-- 1. ALTER DEFAULT PRIVILEGES của project tự cấp EXECUTE cho anon khi tạo hàm
--    mới, nên dù migration gốc đã revoke PUBLIC + grant authenticated, anon vẫn
--    giữ quyền gọi 5 RPC. Các RPC đều chặn auth.uid() IS NULL ngay dòng đầu nên
--    chưa khai thác được, nhưng thu hồi cho đúng chuẩn dự án (cùng pattern các
--    migration thu_hoi_quyen_anon trước đây).
-- 2. touch_updated_at (trigger function) thiếu SET search_path — khóa lại, và
--    thu hồi execute trực tiếp (trigger chạy không cần grant cho caller role
--    vì function owner là postgres).

revoke execute on function public.declare_star_batch(integer,integer,text) from anon, public;
revoke execute on function public.handover_stars(uuid,integer,integer,text,text) from anon, public;
revoke execute on function public.revoke_handover(uuid) from anon, public;
revoke execute on function public.award_star(text,integer[],boolean,uuid,text,text,text,text,date,uuid,text) from anon, public;
revoke execute on function public.revoke_star_record(uuid) from anon, public;

alter function public.touch_updated_at() set search_path = public;
revoke execute on function public.touch_updated_at() from anon, public, authenticated;
