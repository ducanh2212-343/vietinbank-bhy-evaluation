-- ============================================================================
-- DANH THIẾP SỐ — DỮ LIỆU MỒI (Mục 11 đặc tả). TOÀN BỘ ở trạng thái 'draft'.
--
-- KHÔNG có dòng nào 'approved' trong file này, và không được sửa thành approved:
-- bản dịch phải qua người bản ngữ rà soát rồi Giám đốc duyệt ở màn quản trị.
-- Phồn thể (zh_hant) sinh máy bằng OpenCC (s2twp) từ giản thể — cũng là bản nháp.
--
-- Ghi chú cho người rà soát (từ đặc tả): mẫu name card đang lưu hành dùng
-- 交易所 (= sàn giao dịch chứng khoán) cho «phòng giao dịch» — ở đây dùng 营业部;
-- tên tiếng Anh của Ngân hàng phải có đủ cụm «for Industry and Trade».
--
-- Chạy lại an toàn: ON CONFLICT (code) DO NOTHING — không ghi đè dòng TCTH đã sửa.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 11.1 Đơn vị (ba dòng theo đặc tả + các phòng / PGD hiện có của Chi nhánh)
-- ---------------------------------------------------------------------------
INSERT INTO public.nc_org_unit
  (code, parent_code, sort_order, name_vi, name_en, name_zh_hans, name_zh_hant, name_ko, name_ja,
   addr_vi, addr_en, addr_zh_hans, addr_zh_hant, addr_ko, addr_ja)
VALUES
  ('NH', NULL, 0,
   'Ngân hàng TMCP Công Thương Việt Nam',
   'Vietnam Joint Stock Commercial Bank for Industry and Trade',
   '越南工商股份商业银行', '越南工商股份商業銀行', '베트남 공상주식상업은행', 'ベトナム工商株式商業銀行',
   NULL, NULL, NULL, NULL, NULL, NULL),
  ('CN_BHY', 'NH', 10,
   'Chi nhánh Bắc Hưng Yên', 'Bac Hung Yen Branch',
   '北兴安分行', '北興安分行', '박흥옌 지점', 'バクフンイエン支店',
   'Phường Mỹ Hào, tỉnh Hưng Yên', 'My Hao Ward, Hung Yen Province',
   '兴安省美豪坊', '興安省美豪坊', '흥옌성 미하오구', 'フンイエン省ミーハオ坊'),
  ('PGD_VG', 'CN_BHY', 100,
   'Phòng giao dịch Văn Giang', 'Van Giang Transaction Office',
   '文江营业部', '文江營業部', '반장 출장소', 'ヴァンザン出張所',
   'GMA-01, Khu Thủy Nguyên, Khu đô thị Ecopark, xã Phụng Công, tỉnh Hưng Yên',
   'GMA-01, Thuy Nguyen Area, Ecopark Urban Area, Phung Cong Commune, Hung Yen Province',
   '兴安省奉公社生态公园城市区水源街区GMA-01号公寓',
   '興安省奉公社生態公園城市區水源街區GMA-01號公寓',
   '흥옌성 풍꽁사 에코파크 도시구역 투이응우옌 지구 GMA-01',
   'フンイエン省フンコン社エコパーク都市区トゥイグエン地区 GMA-01')
ON CONFLICT (code) DO NOTHING;

-- Các phòng nghiệp vụ và PGD còn lại: thêm sẵn khung (vi/en + CJK dạng nháp)
-- để Phòng TCTH không phải tạo tay; địa chỉ để trống chờ nhập.
INSERT INTO public.nc_org_unit
  (code, parent_code, sort_order, name_vi, name_en, name_zh_hans, name_zh_hant, name_ko, name_ja)
VALUES
  ('P_KHDN', 'CN_BHY', 20, 'Phòng Khách hàng Doanh nghiệp', 'Corporate Banking Department',
   '企业客户部', '企業客戶部', '기업금융부', '法人営業部'),
  ('P_BL', 'CN_BHY', 21, 'Phòng Bán lẻ', 'Retail Banking Department',
   '零售业务部', '零售業務部', '리테일뱅킹부', 'リテール営業部'),
  ('P_DVKH', 'CN_BHY', 22, 'Phòng Dịch vụ khách hàng', 'Customer Service Department',
   '客户服务部', '客戶服務部', '고객서비스부', 'カスタマーサービス部'),
  ('P_HTTD', 'CN_BHY', 23, 'Phòng Hỗ trợ tín dụng', 'Credit Support Department',
   '信贷支持部', '信貸支持部', '여신지원부', '与信サポート部'),
  ('P_TCTH', 'CN_BHY', 24, 'Phòng Tổ chức Tổng hợp', 'Administration and Human Resources Department',
   '综合管理部', '綜合管理部', '총무인사부', '総務部'),
  ('PGD_AT', 'CN_BHY', 101, 'Phòng giao dịch Ân Thi', 'An Thi Transaction Office',
   '恩施营业部', '恩施營業部', '언티 출장소', 'アンティ出張所'),
  ('PGD_KC', 'CN_BHY', 102, 'Phòng giao dịch Khoái Châu', 'Khoai Chau Transaction Office',
   '快州营业部', '快州營業部', '코아이쩌우 출장소', 'コアイチャウ出張所'),
  ('PGD_OC', 'CN_BHY', 103, 'Phòng giao dịch Ocean City', 'Ocean City Transaction Office',
   'Ocean City营业部', 'Ocean City營業部', '오션시티 출장소', 'オーシャンシティ出張所'),
  ('PGD_VL', 'CN_BHY', 104, 'Phòng giao dịch Văn Lâm', 'Van Lam Transaction Office',
   '文林营业部', '文林營業部', '반럼 출장소', 'ヴァンラム出張所')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11.2 Chức danh đối ngoại chuẩn theo tổ chức (scope external)
-- ---------------------------------------------------------------------------
INSERT INTO public.nc_title
  (code, scope, name_vi, name_en, name_zh_hans, name_zh_hant, name_ko, name_ja)
VALUES
  ('GD_CN',   'external', 'Giám đốc Chi nhánh',            'Branch Director',               '分行行长',     '分行行長',     '지점장',        '支店長'),
  ('PGD_CN',  'external', 'Phó Giám đốc Chi nhánh',        'Deputy Branch Director',        '分行副行长',   '分行副行長',   '부지점장',      '副支店長'),
  ('TP',      'external', 'Trưởng phòng',                  'Head of Department',            '部门经理',     '部門經理',     '부장',          '部長'),
  ('PP',      'external', 'Phó phòng',                     'Deputy Head of Department',     '部门副经理',   '部門副經理',   '차장',          '次長'),
  ('GD_PGD',  'external', 'Giám đốc Phòng giao dịch',      'Manager, Transaction Office',   '营业部经理',   '營業部經理',   '출장소장',      '出張所長'),
  ('RM_FDI',  'external', 'Chuyên viên QHKH FDI',          'FDI Relationship Manager',      '外资企业客户经理', '外資企業客戶經理', 'FDI 고객담당', 'FDI法人担当'),
  ('RM_KHDN', 'external', 'Chuyên viên QHKH Doanh nghiệp', 'Corporate Relationship Manager','企业客户经理', '企業客戶經理', '기업고객 담당', '法人営業担当'),
  ('RM_BL',   'external', 'Chuyên viên QHKH Bán lẻ',       'Retail Relationship Manager',   '零售客户经理', '零售客戶經理', '개인고객 담당', '個人営業担当'),
  ('GDV',     'external', 'Giao dịch viên',                'Teller',                        '柜员',         '櫃員',         '텔러',          'テラー'),
  ('KSV',     'external', 'Kiểm soát viên',                'Controller',                    '复核员',       '複核員',       '검사역',        '検査役')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11.3 Vai trò thị trường — Giám đốc duyệt
-- ---------------------------------------------------------------------------
INSERT INTO public.nc_title
  (code, scope, requires_director_approval, name_vi, name_en, name_zh_hans, name_zh_hant, name_ko, name_ja)
VALUES
  ('EXT_HEAD_FDI', 'external', true, 'Trưởng bộ phận Khách hàng FDI', 'Head of FDI Banking',
   '外资企业业务负责人', '外資企業業務負責人', 'FDI 사업 총괄', 'FDI事業責任者'),
  ('EXT_KR_DESK',  'external', true, 'Phụ trách Korea Desk', 'Korea Desk Manager',
   '韩国企业部经理', '韓國企業部經理', '코리아데스크 담당', 'コリアデスク責任者'),
  ('EXT_JP_DESK',  'external', true, 'Phụ trách Japan Desk', 'Japan Desk Manager',
   '日本企业部经理', '日本企業部經理', '재팬데스크 담당', 'ジャパンデスク責任者')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11.4 Chức danh thuê ngoài — bộ riêng, trung tính, KHÔNG mang chức danh ngân hàng
-- ---------------------------------------------------------------------------
INSERT INTO public.nc_title
  (code, scope, allowed_employment, name_vi, name_en, name_zh_hans, name_zh_hant, name_ko, name_ja)
VALUES
  ('EXT_SEC', 'external', '{thue_ngoai}', 'Nhân viên bảo vệ',   'Security staff', '保安员',   '保安員',   '경비원',      '警備員'),
  ('EXT_DRV', 'external', '{thue_ngoai}', 'Lái xe',             'Driver',         '司机',     '司機',     '운전기사',    '運転手'),
  ('EXT_SVC', 'external', '{thue_ngoai}', 'Nhân viên dịch vụ',  'Service staff',  '服务人员', '服務人員', '서비스 직원', 'サービススタッフ')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Chức danh NỘI BỘ (theo QĐ bổ nhiệm) — chỉ tiếng Việt, không bao giờ lên thẻ.
-- Bám danh mục chức danh đang có của phân hệ nhân sự 343.
-- ---------------------------------------------------------------------------
INSERT INTO public.nc_title (code, scope, name_vi, allowed_employment)
VALUES
  ('NB_GD',      'internal', 'Giám đốc',                         '{bien_che,hop_dong}'),
  ('NB_PGD',     'internal', 'Phó Giám đốc',                     '{bien_che,hop_dong}'),
  ('NB_TP',      'internal', 'Trưởng phòng',                     '{bien_che,hop_dong}'),
  ('NB_PP',      'internal', 'Phó phòng',                        '{bien_che,hop_dong}'),
  ('NB_TPGD',    'internal', 'Trưởng phòng giao dịch',           '{bien_che,hop_dong}'),
  ('NB_PPGD',    'internal', 'Phó phòng giao dịch',              '{bien_che,hop_dong}'),
  ('NB_KSV',     'internal', 'Kiểm soát viên',                   '{bien_che,hop_dong}'),
  ('NB_GDV',     'internal', 'Giao dịch viên',                   '{bien_che,hop_dong}'),
  ('NB_CB_QHKH', 'internal', 'Cán bộ quan hệ khách hàng',        '{bien_che,hop_dong}'),
  ('NB_CB_HTTD', 'internal', 'Cán bộ hỗ trợ tín dụng',           '{bien_che,hop_dong}'),
  ('NB_CB_TH',   'internal', 'Cán bộ tổng hợp',                  '{bien_che,hop_dong}'),
  ('NB_THU_QUY', 'internal', 'Thủ quỹ / Thủ kho tiền',           '{bien_che,hop_dong}'),
  ('NB_CTV',     'internal', 'Cộng tác viên',                    '{ctv}'),
  ('NB_TTS',     'internal', 'Thực tập sinh',                    '{thuc_tap}'),
  ('NB_THUE',    'internal', 'Nhân sự thuê ngoài',               '{thue_ngoai}')
ON CONFLICT (code) DO NOTHING;
