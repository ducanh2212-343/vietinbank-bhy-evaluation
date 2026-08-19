-- Gỡ tính năng Lịch sử phiên bản / «Có gì mới».
-- Các tin đã phát vào ct2_thong_bao (ma_su_kien = 'PHIEN_BAN') giữ nguyên —
-- chúng là vết đã gửi tới cán bộ, xoá đi là xoá lịch sử thật.
DROP FUNCTION IF EXISTS public.phien_ban_cong_bo_dot(jsonb, text, text, boolean, text[], boolean);
DROP FUNCTION IF EXISTS public.phien_ban_danh_dau_da_xem(text);
DROP TABLE IF EXISTS public.phien_ban_cong_bo;
DROP TABLE IF EXISTS public.phien_ban_da_xem;
