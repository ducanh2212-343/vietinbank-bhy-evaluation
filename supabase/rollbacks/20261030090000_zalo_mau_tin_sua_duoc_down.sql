-- Gỡ 20261030090000: bỏ hai khóa mẫu tin; hàm gửi quay về mẫu mặc định trong mã.
DELETE FROM public.zalo_cau_hinh WHERE khoa IN ('mau_tin_ca_nhan', 'mau_tin_tap_the');
