-- Gỡ 20261025090000: bỏ các khóa gói cước bổ sung theo bảng giá 01/06/2026.
DELETE FROM public.zalo_cau_hinh
 WHERE khoa IN ('goi_cuoc_ky_han', 'goi_cuoc_tin_nhom_mien_phi_den', 'goi_cuoc_nhom_gmf_kem_goi',
                'goi_cuoc_app_uy_quyen', 'goi_cuoc_nhan_su', 'goi_cuoc_bang_gia_ap_dung');
