-- Gỡ 20261027090000: bỏ hai khóa app_id / callback_url khỏi cấu hình Zalo.
DELETE FROM public.zalo_cau_hinh WHERE khoa IN ('app_id', 'callback_url');
