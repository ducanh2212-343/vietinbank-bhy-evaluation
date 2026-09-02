-- Gỡ dữ liệu mồi danh thiếp số. Chỉ xoá đúng các mã do file mồi nạp; dòng TCTH
-- tự tạo giữ nguyên. Cán bộ đang gán chức danh/đơn vị mồi sẽ chặn xoá (FK) —
-- gỡ gán trước nếu thật sự cần.
DELETE FROM public.nc_title WHERE code IN (
  'GD_CN','PGD_CN','TP','PP','GD_PGD','RM_FDI','RM_KHDN','RM_BL','GDV','KSV',
  'EXT_HEAD_FDI','EXT_KR_DESK','EXT_JP_DESK','EXT_SEC','EXT_DRV','EXT_SVC',
  'NB_GD','NB_PGD','NB_TP','NB_PP','NB_TPGD','NB_PPGD','NB_KSV','NB_GDV','NB_CB_QHKH',
  'NB_CB_HTTD','NB_CB_TH','NB_THU_QUY','NB_CTV','NB_TTS','NB_THUE'
);
DELETE FROM public.nc_org_unit WHERE code IN (
  'PGD_VG','PGD_AT','PGD_KC','PGD_OC','PGD_VL','P_KHDN','P_BL','P_DVKH','P_HTTD','P_TCTH'
);
DELETE FROM public.nc_org_unit WHERE code = 'CN_BHY';
DELETE FROM public.nc_org_unit WHERE code = 'NH';
