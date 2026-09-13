-- Training Center: thay lộ trình 10 ngày bằng bản Giám đốc gửi 06/09/2026,
-- xếp lại giờ vào khung buổi mới: sáng 08:00–11:30, chiều 13:30 đến tối đa 18:00.
--
-- Vì sao thay cả bảng chứ không sửa từng dòng: bản mới đổi cả số đầu việc
-- (101 → 122), đổi tên, đổi thứ tự và đổi người cùng dự của phần lớn các buổi.
-- Sửa tay 101 dòng để ra 122 dòng là cách chắc chắn nhất để sót một buổi rồi
-- không ai biết.
--
-- Vì sao rút thời lượng CHIA ĐỀU giữa các khối học viên tự làm: bỏ mốc 07:30
-- thì buổi sáng ngày 2–10 dôi 30 phút. Cắt dồn vào một chỗ là bỏ hẳn một lượt
-- đọc văn bản — mà phiếu Bloom, bộ slide và phiên trình bày chiều đều dựa vào
-- lượt đọc đó. Chia đều thì mỗi khối ngắn lại một chút, không khối nào mất hình
-- hài: mỗi sáng đọc văn bản −20 phút, phiếu Bloom −5, bộ slide −5. Các mốc có
-- Giám đốc, Phó Giám đốc hoặc cán bộ cùng dự giữ nguyên thời lượng, vì đó là
-- những mốc đã hẹn người khác; chỉ Ngày 1 phải rút 15 phút từ hai phiên của
-- Giám đốc do cả buổi sáng hôm đó đều là mốc hẹn.
--
-- Buổi chiều không phải rút phút nào: khung 13:30–18:00 rộng hơn nội dung, ngày
-- dài nhất kết thúc 17:45. Giao lưu pickleball giữ nguyên 18:00–19:30, nằm
-- ngoài khung buổi chiều đúng như tài liệu gốc.
--
-- Dữ liệu phát sinh tại thời điểm áp: 0 tiến độ, 0 điểm Bloom, 0 điểm danh,
-- 0 tự soi, 0 phiếu giao việc — nên xoá đầu việc cũ không kéo theo gì.

-- ---------------------------------------------------------------------------
-- 1) Ảnh chụp lộ trình cũ — đường lùi của migration này
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ttc_luu_lo_trinh_20261013 AS
SELECT d.*, n.so_thu_tu AS ngay_so FROM public.ttc_dau_viec d
  JOIN public.ttc_ngay n ON n.id = d.ngay_id WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%');
CREATE TABLE IF NOT EXISTS public.ttc_luu_ngay_20261013 AS
SELECT * FROM public.ttc_ngay WHERE chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%');
ALTER TABLE public.ttc_luu_lo_trinh_20261013 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttc_luu_ngay_20261013 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ttc_luu_lo_trinh_20261013, public.ttc_luu_ngay_20261013 FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Bỏ lộ trình cũ
-- ---------------------------------------------------------------------------
DELETE FROM public.ttc_dau_viec d USING public.ttc_ngay n
 WHERE n.id = d.ngay_id AND n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%');

-- ---------------------------------------------------------------------------
-- 3) Nội dung từng ngày. Giữ nguyên lat_cat và cau_hoi_tu_soi: bản mới không có
--    hai trường này, ghi đè bằng NULL là mất phần Tự suy ngẫm của cả mười ngày.
-- ---------------------------------------------------------------------------
UPDATE public.ttc_ngay n SET tieu_de = v.tieu_de, khoi = v.khoi, van_ban = v.van_ban,
       nhiem_vu_van_ban = v.nhiem_vu, chuan_bi = v.chuan_bi
  FROM (VALUES
  (1, 'Khai bút — mở lối mười ngày', 'Khai tâm', 'Không có văn bản — đây là ngày định hướng và chọn ba việc gối đầu', 'Sản phẩm của ngày: ba trang viết tay · ba việc gối đầu đã được Giám đốc duyệt · log VietinType mốc nền · phiếu tự chấm 08 tiêu chí lần đầu.', 'Mang theo bút và sổ giấy — ba câu hỏi buổi sáng viết tay để suy nghĩ chậm lại. Nghĩ trước ba đầu việc muốn theo đuổi trong mười ngày, mỗi việc gắn với một cán bộ cụ thể. Mang theo laptop cá nhân để đăng nhập Training Center; máy tính bàn cơ quan đã có sẵn tại phòng học.'),
  (2, 'Chữ nghĩa thành việc — đọc một văn bản đủ sâu', 'Quản trị bản thân', '8735/TGĐ-NHCT-KHDN3 — Quy định phân loại khách hàng doanh nghiệp', 'Nhiệm vụ với văn bản: chỉ ra nhóm khách hàng nào của Chi nhánh thay đổi cách phân loại, RM nào phải đổi cách làm, và bước nào trong quy trình phải điều chỉnh.', 'Đọc lượt 1 văn bản 8735 ngay tối nay: quét mục lục, phạm vi, đối tượng áp dụng và điều khoản hiệu lực. Chuẩn bị phiếu giao việc 5W2H cho ba việc gối đầu, sáng mai giao trực tiếp cho cán bộ. Hẹn trước ba cán bộ nhận việc, khung 08:00 sáng mai.'),
  (3, 'Từ công văn đến công việc — đưa văn bản xuống Phòng', 'Quản trị bản thân', '8449/TGĐ-NHCT-QLRR1 — Chấn chỉnh công tác phân loại nợ và trích lập dự phòng của Chi nhánh', 'Nhiệm vụ với văn bản: đây là văn bản chấn chỉnh, hệ quả trực tiếp tới chất lượng tín dụng của Chi nhánh. Xác định dấu hiệu nào Phòng phải theo dõi định kỳ, ai theo dõi, tần suất bao lâu.', 'Đọc lượt 1 văn bản 8449 tối nay. Xem lại sơ đồ dòng chảy và 3 điểm cần cải thiện đã vẽ hôm nay — chiều mai dùng để xây quy trình chuẩn. Chuẩn bị nội dung cập nhật tiến độ với ba cán bộ vào 08:00 sáng mai.'),
  (4, 'Con mắt thứ hai — soi bảng chỉ số tài chính', 'Quản trị bản thân', '105.02/SP-TGĐ-NHCT-KHDN4.2 — Sửa đổi, bổ sung lần 2 Quy định phương thức cho vay hạn thấu chi trên tài khoản thanh toán đối với KHDN', 'Nhiệm vụ với văn bản: văn bản này gắn trực tiếp với nhu cầu vốn lưu động — xác định khách hàng nào của Chi nhánh phù hợp với thấu chi, và điều kiện nào RM hay bỏ sót khi đề xuất.', 'Đọc lượt 1 văn bản 105.02 tối nay, tập trung phần điều kiện và hạn mức thấu chi. Ôn lại bốn nhóm sai sót thường gặp: nhập liệu · công thức · nguyên lý tài chính · nhận định tín dụng. Chiều mai làm bài 60 phút liên tục trên máy tính bàn cơ quan, Excel và Word, không internet.'),
  (5, 'Việc nào ra việc nấy — Chiêu thức số 2', 'Quản trị công việc', '111/SP-TGĐ-NHCT-KHDN4.2 — Ban hành Giải pháp tài chính dành cho Nhà đầu tư bất động sản công nghiệp', 'Nhiệm vụ với văn bản: văn bản này gắn thẳng với việc gối đầu số 1 về bản đồ khu công nghiệp — chỉ ra nhà đầu tư hạ tầng nào trên địa bàn thuộc đối tượng áp dụng và cách tiếp cận.', 'Đọc lượt 1 văn bản 111 tối nay. Liệt kê trước các đầu việc muốn đưa lên bảng ngoài ba việc gối đầu — chỉ lấy việc có sản phẩm và có hạn. Đăng nhập sẵn Training Center trên laptop cá nhân.'),
  (6, 'Lần theo dòng tiền — con mắt thứ hai của Trưởng phòng', 'Quản trị bản thân', '2688/KV12-TH — Triển khai chỉ đạo của UBND tỉnh về tiếp cận nguồn vốn tín dụng ưu đãi cho vay dự án nhà ở xã hội trên địa bàn tỉnh Hưng Yên', 'Nhiệm vụ với văn bản: đây là văn bản về dự án đầu tư có chỉ đạo của UBND tỉnh — xác định dự án nào trên địa bàn thuộc diện, điều kiện tiếp cận vốn ưu đãi, và Chi nhánh cần chuẩn bị gì.', 'Cuối tuần: ôn lại logic dòng tiền dự án — NPV, IRR, DSCR, lịch trả nợ và phân tích độ nhạy. Ôn một câu hỏi cụ thể: hàm NPV của Excel chiết khấu phần tử đầu tiên về mấy kỳ? Đọc lượt 1 văn bản 2688. Bài chiều thứ Hai kéo 120 phút từ 13:40 — ăn trưa đúng giờ, giữ sức.'),
  (7, 'Một cây làm chẳng nên non — nghệ thuật giao việc', 'Quản trị người khác', '8665/TGĐ-NHCT-KHDN2 — Triển khai gói giải pháp tài chính toàn diện dành cho đơn vị hành chính sự nghiệp và hệ sinh thái', 'Nhiệm vụ với văn bản: xác định đơn vị hành chính sự nghiệp nào trên địa bàn thuộc diện, hệ sinh thái đi kèm gồm những ai, và RM cần chuẩn bị gì để tiếp cận.', 'Đọc lượt 1 văn bản 8665 tối nay. Xem lại tiến độ ba việc gối đầu để xác định đoạn việc tiếp theo cần giao cho từng cán bộ. Chuẩn bị phiếu 5W2H cho đoạn việc tiếp theo. Từ hôm nay bắt đầu ứng dụng AI, sau khi đã có sản phẩm tự thực hiện.'),
  (8, 'Trăm năm trồng người — kèm cặp và lộ trình phát triển', 'Quản trị người khác', '8686/TGĐ-NHCT-KHDN2 — Đẩy mạnh hợp tác cùng các đơn vị thuộc hệ thống cơ quan Thi hành án dân sự', 'Nhiệm vụ với văn bản: xác định các đơn vị Thi hành án dân sự trên địa bàn, dòng tiền và nhu cầu dịch vụ đi kèm, ai trong Phòng sẽ phụ trách.', 'Đọc lượt 1 văn bản 8686 tối nay. Chuẩn bị cho buổi kèm cặp cán bộ của việc gối đầu số 3: bằng chứng và 8 câu hỏi mở, chưa chuẩn bị sẵn lời khuyên. Hẹn cán bộ khung 14:00, báo trước đây là buổi trao đổi phát triển 40 phút. Mang theo bộ slide đã làm ngày 2 để đối chiếu với bản do AI hỗ trợ.'),
  (9, 'Thấy rừng, không chỉ thấy cây — quản trị hệ thống', 'Quản trị hệ thống', '8108/TGĐ-NHCT-KHDN — Triển khai MVP2 thuộc sáng kiến M3S01, Số hóa hành trình soạn thảo và ký kết hợp đồng tín dụng', 'Nhiệm vụ với văn bản: đối chiếu hành trình soạn thảo và ký kết hợp đồng tín dụng hiện nay của Phòng với mô hình số hóa trong văn bản — bước nào cắt được, bước nào còn phải làm tay.', 'Đọc lượt 1 văn bản 8108 tối nay. Đăng nhập cổng Bắc Hưng Yên ONE, mở lần lượt từng chương trình và đọc tài liệu đi kèm. Nhắc ba cán bộ nộp sản phẩm việc gối đầu trước 13:30 ngày mai để kịp nghiệm thu. Ghi trước 05 rủi ro đáng lưu ý nhất với phân khúc KHDN — mai sẽ chứng minh bằng số liệu.'),
  (10, 'Đường dài mới biết ngựa hay — đo lại và cam kết', 'Kết tinh', '8820/TGĐ-NHCT-KHDN2 — Chương trình thi đua SME dòng tiền vàng 2026; và 100.01/SP-TGĐ-NHCT-KHDN — Cấp tín dụng online dành cho KHDN', 'Nhiệm vụ với văn bản: rút ra ba việc Phòng có thể làm ngay trong quý tới từ hai văn bản này, gắn với chỉ tiêu cụ thể.', 'Sắp xếp đủ 06 sản phẩm sẽ trình bày, mỗi sản phẩm kèm một trang tóm tắt. Nhắc ba cán bộ nộp sản phẩm việc gối đầu trước 13:30 để kịp nghiệm thu. Tự đánh giá theo barem trước khi xem điểm hội đồng.')
) AS v(so, tieu_de, khoi, van_ban, nhiem_vu, chuan_bi)
 WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%') AND n.so_thu_tu = v.so;

-- ---------------------------------------------------------------------------
-- 4) Đầu việc — mỗi ngày một lệnh, mỗi dòng: phần · thứ tự · giờ · tên · nội
--    dung · người cùng dự · thiết bị · nơi nộp · trọng tâm
-- ---------------------------------------------------------------------------

-- Ngày 1 · Khai bút — mở lối mười ngày
INSERT INTO public.ttc_dau_viec
  (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
SELECT n.id, v.phan, v.thu_tu, v.bd::time, v.kt::time, v.ten, v.noi_dung, v.nguoi, v.thiet_bi, v.noi_nop, v.trong_tam
  FROM public.ttc_ngay n JOIN (VALUES
  ('KHOI_DONG',1,'08:00','08:30','Khai mạc chương trình','Giám đốc chia sẻ bối cảnh: Chi nhánh đang ở đâu, Phòng KHDN đang ở đâu, và vì sao vai Trưởng phòng là vị trí tạo đòn bẩy lớn nhất','GD','KHONG','KHONG',false),
  ('KHOI_DONG',2,'08:30','09:10','Giới thiệu lộ trình 10 ngày và quán triệt phạm vi','Bốn khối năng lực, khung ngày, cách đánh giá, bốn bảng điểm tách biệt, quyền giải trình của học viên. Quán triệt lại nội dung biên bản bàn giao đã ký giữa học viên và PGĐ Hoàng: trong 10 ngày PGĐ Hoàng là đầu mối điều hành duy nhất của Phòng','GD_PGD','KHONG','KHONG',false),
  ('TU_SUY_NGAM',3,'09:10','10:10','Ba câu hỏi định hướng — viết tay','Ý nghĩa của vai Trưởng phòng KHDN với anh · thế mạnh rõ nhất và phần anh muốn phát triển thêm · điều gì sẽ khác đi sau 12 tháng nếu bắt đầu ngay từ hôm nay. Mỗi câu 15 phút, viết xong đọc to','GD','GIAY','KHONG',true),
  ('TU_SUY_NGAM',4,'10:10','10:50','Từ BIẾT đến LÀM ĐƯỢC','Mô hình 70–20–10 và lý do chương trình đặt phần tự thực hiện lên trước, mở AI ở nửa sau','GD','KHONG','KHONG',false),
  ('TU_SUY_NGAM',5,'10:50','11:30','Bảy nguyên tắc đồng hành và phạm vi tập trung','Những việc sẽ tập trung trong 10 ngày, những việc đã bàn giao, và cách xử lý khi phát sinh việc gấp thuộc thẩm quyền','GD_PGD','KHONG','KHONG',false),
  ('THUC_HANH',6,'13:30','14:20','Chọn 03 việc gối đầu và người nhận việc','Ba đầu việc đi cùng suốt mười ngày, mỗi việc gắn với một cán bộ cụ thể: báo cáo bản đồ KCN/CCN và thị phần · báo cáo nghiệp vụ RM đang mất nhiều thời gian · kèm cặp 01 cán bộ theo lộ trình phát triển. Ghi rõ theo 5W2H','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('THUC_HANH',7,'14:20','14:50','Giám đốc duyệt ba việc gối đầu','Duyệt phạm vi, tiêu chuẩn đầu ra và hạn của từng việc; xác nhận việc chọn không chạm vào hồ sơ đang xử lý','GD','KHONG','KHONG',true),
  ('THUC_HANH',8,'14:50','15:30','Cài đặt và đo VietinType lần đầu','Đây là mốc nền để so với ngày 10, không tính điểm và không so với ai','TCTH','LAPTOP','TRAINING_CENTER',false),
  ('THUC_HANH',9,'15:30','16:30','Hướng dẫn hai máy và cách nộp sản phẩm','Máy tính bàn cơ quan: vào hệ thống nội bộ, làm Word/Excel/PowerPoint, xong gửi email cho Ban Giám đốc. Laptop cá nhân: đăng nhập Training Center, tích hoàn thành, nhập kết quả và đính kèm file. Thực hành một phiếu văn bản mẫu và một lần tích hoàn thành','TCTH','MAY_CO_QUAN','EMAIL',false),
  ('TU_SUY_NGAM',10,'16:30','17:05','Tự chấm 08 tiêu chí trưởng thành — lần đầu','Mốc nền để so với ngày 10. Mỗi mức kèm một ví dụ có thật trong ba tháng gần đây','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TU_SUY_NGAM',11,'17:05','17:20','Nhận văn bản ngày 2 và chốt PDCA','Văn bản 8735/TGĐ-NHCT-KHDN3 — Quy định phân loại khách hàng doanh nghiệp. Đọc lượt 1 ngay trong tối nay','HOC_VIEN','KHONG','KHONG',false),
  ('THUC_HANH',12,'18:00','19:30','Giao lưu pickleball cùng cán bộ Chi nhánh','Sân của Chi nhánh. Hoạt động gắn kết, không trao đổi công việc và không bàn hồ sơ','CAN_BO','KHONG','KHONG',false)
) AS v(phan, thu_tu, bd, kt, ten, noi_dung, nguoi, thiet_bi, noi_nop, trong_tam) ON true
 WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%') AND n.so_thu_tu = 1;

-- Ngày 2 · Chữ nghĩa thành việc — đọc một văn bản đủ sâu
INSERT INTO public.ttc_dau_viec
  (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
SELECT n.id, v.phan, v.thu_tu, v.bd::time, v.kt::time, v.ten, v.noi_dung, v.nguoi, v.thiet_bi, v.noi_nop, v.trong_tam
  FROM public.ttc_ngay n JOIN (VALUES
  ('KHOI_DONG',1,'08:00','08:30','Giao ba việc gối đầu cho cán bộ theo 5W2H','Lần giao việc chính thức đầu tiên. Mỗi việc nêu đủ: việc gì – vì sao cần – ai làm – ở đâu – khi nào xong – làm thế nào – khối lượng bao nhiêu. Cán bộ nhắc lại bằng lời của mình trước khi kết thúc. PGĐ Hoàng chỉ quan sát 30 phút, không can thiệp','PGD','LAPTOP','TRAINING_CENTER',true),
  ('KHOI_DONG',2,'08:30','09:00','VietinType — 30 phút','Ghi tốc độ, độ chính xác và nhóm phím cần luyện thêm','HOC_VIEN','LAPTOP','TRAINING_CENTER',false),
  ('VAN_BAN',3,'09:00','10:00','Đọc văn bản 8735 theo phương pháp 3 lượt','Quét cấu trúc 15 phút → đọc sâu, đánh dấu điểm thay đổi và rủi ro 45 phút → gấp văn bản kể lại 25 phút. Sản phẩm: phiếu văn bản 1 trang','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',4,'10:00','10:40','Lập phiếu 06 thang tư duy Bloom','Mỗi thang có bằng chứng riêng, ghi số slide tương ứng','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',5,'10:40','11:30','Xây dựng bộ slide 5–7 trang','Tự thực hiện, chưa dùng AI. Tiêu đề mỗi slide là một kết luận','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('THUC_HANH',6,'13:30','14:20','Vẽ dòng chảy văn bản hiện tại của Phòng','Từ hộp thư đến hành vi của RM: ai nhận, ai đọc bản gốc, ai phổ biến, RM biết qua kênh nào, ai xác nhận đã hiểu đúng. Ban Giám đốc bận họp trong khung này, học viên tự làm','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('THUC_HANH',7,'14:20','15:10','Xác định 03 điểm cần cải thiện và phương án cho điểm ưu tiên nhất','Mỗi điểm kèm một tình huống có thật trong 6 tháng qua. Phương án nêu rõ người làm, mốc kiểm tra và cách xác nhận đã cải thiện','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('TRINH_BAY',8,'15:10','15:20','Chuẩn bị trình bày','Ban Giám đốc kết thúc họp Văn hóa doanh nghiệp lúc 15:00','HOC_VIEN','LAPTOP','KHONG',false),
  ('TRINH_BAY',9,'15:20','16:00','Trình bày và phản hồi — 40 phút','12 phút trình bày · 18 phút trao đổi · 10 phút phản hồi','GD','LAPTOP','KHONG',true),
  ('TU_SUY_NGAM',10,'16:00','16:35','Phiên tự suy ngẫm — Vốn kiến thức','Điều gì tôi tưởng mình đã biết, nhưng hôm nay đọc kỹ mới thấy khác? Kiến thức nào của tôi đang dựa vào thói quen thay vì dựa vào văn bản? Phiên này không tính điểm và không có Ban Giám đốc.','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TU_SUY_NGAM',11,'16:35','17:00','Nộp sản phẩm, chốt PDCA và nhận văn bản ngày mai','Gửi email file máy cơ quan cho Ban Giám đốc; tích hoàn thành trên Training Center. Văn bản ngày mai: 8449/TGĐ-NHCT-QLRR1','HOC_VIEN','LAPTOP','TRAINING_CENTER',false)
) AS v(phan, thu_tu, bd, kt, ten, noi_dung, nguoi, thiet_bi, noi_nop, trong_tam) ON true
 WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%') AND n.so_thu_tu = 2;

-- Ngày 3 · Từ công văn đến công việc — đưa văn bản xuống Phòng
INSERT INTO public.ttc_dau_viec
  (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
SELECT n.id, v.phan, v.thu_tu, v.bd::time, v.kt::time, v.ten, v.noi_dung, v.nguoi, v.thiet_bi, v.noi_nop, v.trong_tam
  FROM public.ttc_ngay n JOIN (VALUES
  ('KHOI_DONG',1,'08:00','08:30','Cập nhật tiến độ ba việc gối đầu với cán bộ','Trao đổi ngắn với từng cán bộ theo PDCA: từ hôm qua đã làm được gì, hôm nay làm gì, có gì vướng cần Trưởng phòng gỡ. Mỗi cán bộ 10 phút','CAN_BO','LAPTOP','TRAINING_CENTER',true),
  ('KHOI_DONG',2,'08:30','09:00','VietinType — 30 phút','Ghi tốc độ, độ chính xác và nhóm phím cần luyện thêm vào log của ngày','HOC_VIEN','LAPTOP','TRAINING_CENTER',false),
  ('VAN_BAN',3,'09:00','10:00','Đọc văn bản của ngày theo phương pháp 3 lượt','Quét cấu trúc 15 phút → đọc sâu, đánh dấu điểm thay đổi, điều kiện và rủi ro 40 phút → gấp văn bản và kể lại 25 phút. Sản phẩm: phiếu văn bản 1 trang','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',4,'10:00','10:40','Lập phiếu 06 thang tư duy Bloom','Mỗi thang có bằng chứng riêng và ghi số slide tương ứng','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',5,'10:40','11:30','Xây dựng bộ slide 5–7 trang','Tự thực hiện trên máy cơ quan, chưa dùng AI. Tiêu đề mỗi slide là một kết luận; góc slide ghi nhãn thang Bloom','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('THUC_HANH',6,'13:30','13:50','PGĐ Hoàng chia sẻ: một văn bản không tới được RM thì cái giá là gì','Một tình huống đã khép lại — văn bản đã phổ biến nhưng hồ sơ vẫn làm theo cách cũ. Điểm rơi nằm ở đâu và đã khắc phục bằng cách nào','PGD','KHONG','KHONG',false),
  ('THUC_HANH',7,'13:50','14:40','Xây quy trình chuẩn triển khai văn bản tại Phòng KHDN','Sáu bước, mỗi bước có người chịu trách nhiệm và đầu ra: ai đọc bản gốc, ai làm phiếu 1 trang, ai phổ biến, xác nhận hiểu bằng cách nào, lưu minh chứng ở đâu, bao lâu rà lại. Đây là lời giải cho thực trạng có cán bộ đọc, có cán bộ không','HOC_VIEN','MAY_CO_QUAN','EMAIL',true),
  ('THUC_HANH',8,'14:40','15:10','Soạn bộ 10 câu hỏi kiểm tra hiểu văn bản','Soạn trên máy cơ quan để rèn tư duy đặt câu hỏi. Câu hỏi đo khả năng vận dụng, không đo trí nhớ số hiệu. Bộ câu hỏi chỉ soạn và nộp, chưa chạy thử với cán bộ trong thời gian chương trình','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('TRINH_BAY',9,'15:10','15:20','Chuẩn bị trình bày','Mở slide và chuẩn bị sẵn câu trả lời cho ba câu hỏi cố định','HOC_VIEN','LAPTOP','KHONG',false),
  ('TRINH_BAY',10,'15:20','16:00','Trình bày và phản hồi — 40 phút','12 phút trình bày · 18 phút trao đổi · 10 phút phản hồi theo cấu trúc sự việc – ảnh hưởng – kỳ vọng – hỗ trợ – cam kết. Trình chiếu từ laptop cá nhân, file đã gửi email trước đó','PGD','LAPTOP','KHONG',true),
  ('TU_SUY_NGAM',11,'16:00','16:35','Phiên tự suy ngẫm — Từ kiến thức đến hành vi','Trong Phòng hiện nay, một văn bản đi từ hộp thư đến hành vi của RM qua mấy khâu? Khâu nào đang làm văn bản mất hiệu lực thực tế? Viết tay 15 phút, tự chấm mức 5 phút, ghi lại 15 phút. Phiên này không tính điểm và không có Ban Giám đốc.','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TU_SUY_NGAM',12,'16:35','17:00','Nộp sản phẩm, chốt PDCA và nhận văn bản ngày mai','Gửi email toàn bộ file làm trên máy cơ quan cho Ban Giám đốc; tích hoàn thành từng đầu việc trên Training Center. Nhận văn bản để đọc lượt 1 ngay trong tối','HOC_VIEN','LAPTOP','TRAINING_CENTER',false)
) AS v(phan, thu_tu, bd, kt, ten, noi_dung, nguoi, thiet_bi, noi_nop, trong_tam) ON true
 WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%') AND n.so_thu_tu = 3;

-- Ngày 4 · Con mắt thứ hai — soi bảng chỉ số tài chính
INSERT INTO public.ttc_dau_viec
  (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
SELECT n.id, v.phan, v.thu_tu, v.bd::time, v.kt::time, v.ten, v.noi_dung, v.nguoi, v.thiet_bi, v.noi_nop, v.trong_tam
  FROM public.ttc_ngay n JOIN (VALUES
  ('KHOI_DONG',1,'08:00','08:30','Cập nhật tiến độ ba việc gối đầu với cán bộ','Trao đổi ngắn với từng cán bộ theo PDCA: từ hôm qua đã làm được gì, hôm nay làm gì, có gì vướng cần Trưởng phòng gỡ. Mỗi cán bộ 10 phút','CAN_BO','LAPTOP','TRAINING_CENTER',true),
  ('KHOI_DONG',2,'08:30','09:00','VietinType — 30 phút','Ghi tốc độ, độ chính xác và nhóm phím cần luyện thêm vào log của ngày','HOC_VIEN','LAPTOP','TRAINING_CENTER',false),
  ('VAN_BAN',3,'09:00','10:00','Đọc văn bản của ngày theo phương pháp 3 lượt','Quét cấu trúc 15 phút → đọc sâu, đánh dấu điểm thay đổi, điều kiện và rủi ro 40 phút → gấp văn bản và kể lại 25 phút. Sản phẩm: phiếu văn bản 1 trang','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',4,'10:00','10:40','Lập phiếu 06 thang tư duy Bloom','Mỗi thang có bằng chứng riêng và ghi số slide tương ứng','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',5,'10:40','11:30','Xây dựng bộ slide 5–7 trang','Tự thực hiện trên máy cơ quan, chưa dùng AI. Tiêu đề mỗi slide là một kết luận; góc slide ghi nhãn thang Bloom','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('THUC_HANH',6,'13:30','13:40','Nhận đề — TCTH mở file bài tập 1','Nhắc lại quy tắc làm bài. Học viên đọc đề và được hỏi làm rõ về yêu cầu đầu ra','TCTH','MAY_CO_QUAN','KHONG',false),
  ('THUC_HANH',7,'13:40','14:40','Làm bài 60 phút — rà soát bảng chỉ số tài chính','Sản phẩm: nhật ký rà soát · bảng chỉ số đã hiệu chỉnh có công thức · kết luận 1 trang · 05 ô sẽ kiểm tra đầu tiên','HOC_VIEN','MAY_CO_QUAN','EMAIL',true),
  ('THUC_HANH',8,'14:40','14:50','Khóa bài','Lưu theo mã bài, gửi email nộp bài, khóa quyền sửa','TCTH','MAY_CO_QUAN','EMAIL',false),
  ('TRINH_BAY',9,'14:50','15:20','Giải trình','Trình bày 05 phát hiện quan trọng nhất và 05 ô sẽ kiểm tra đầu tiên khi nhận một file phân tích tài chính','GD_PGD','KHONG','KHONG',false),
  ('TRINH_BAY',10,'15:20','15:55','Đáp án bước 1 — bảng kết quả chuẩn','Chưa mở công thức. Học viên tự tìm chênh lệch và tự truy về nguyên nhân','HOC_VIEN','MAY_CO_QUAN','KHONG',true),
  ('TRINH_BAY',11,'15:55','16:20','Đáp án bước 2 — mở đầy đủ và giải thích nguyên lý','Ghi nhận cả phương án khác nếu có cơ sở. Đây là phiên học nguyên lý, không phải phiên soi lỗi','PGD','KHONG','KHONG',false),
  ('TRINH_BAY',12,'16:20','16:40','Giám đốc chia sẻ: uy tín chuyên môn được xây bằng gì','Vì sao vai Trưởng phòng cần con mắt thứ hai chứ không cần bàn tay nhanh nhất','GD','KHONG','KHONG',false),
  ('TU_SUY_NGAM',13,'16:40','17:15','Phiên tự suy ngẫm — Tầng 1, Quản trị bản thân','Sau bài rà soát hôm nay: điều gì tôi làm chắc, điều gì tôi muốn luyện thêm? Lập bản đồ năng lực phần 1 và nộp lên Training Center','HOC_VIEN','LAPTOP','TRAINING_CENTER',true)
) AS v(phan, thu_tu, bd, kt, ten, noi_dung, nguoi, thiet_bi, noi_nop, trong_tam) ON true
 WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%') AND n.so_thu_tu = 4;

-- Ngày 5 · Việc nào ra việc nấy — Chiêu thức số 2
INSERT INTO public.ttc_dau_viec
  (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
SELECT n.id, v.phan, v.thu_tu, v.bd::time, v.kt::time, v.ten, v.noi_dung, v.nguoi, v.thiet_bi, v.noi_nop, v.trong_tam
  FROM public.ttc_ngay n JOIN (VALUES
  ('KHOI_DONG',1,'08:00','08:30','Cập nhật tiến độ ba việc gối đầu với cán bộ','Trao đổi ngắn với từng cán bộ theo PDCA: từ hôm qua đã làm được gì, hôm nay làm gì, có gì vướng cần Trưởng phòng gỡ. Mỗi cán bộ 10 phút','CAN_BO','LAPTOP','TRAINING_CENTER',true),
  ('KHOI_DONG',2,'08:30','09:00','VietinType — 30 phút','Ghi tốc độ, độ chính xác và nhóm phím cần luyện thêm vào log của ngày','HOC_VIEN','LAPTOP','TRAINING_CENTER',false),
  ('VAN_BAN',3,'09:00','10:00','Đọc văn bản của ngày theo phương pháp 3 lượt','Quét cấu trúc 15 phút → đọc sâu, đánh dấu điểm thay đổi, điều kiện và rủi ro 40 phút → gấp văn bản và kể lại 25 phút. Sản phẩm: phiếu văn bản 1 trang','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',4,'10:00','10:40','Lập phiếu 06 thang tư duy Bloom','Mỗi thang có bằng chứng riêng và ghi số slide tương ứng','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',5,'10:40','11:30','Xây dựng bộ slide 5–7 trang','Tự thực hiện trên máy cơ quan, chưa dùng AI. Tiêu đề mỗi slide là một kết luận; góc slide ghi nhãn thang Bloom','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('THUC_HANH',6,'13:30','13:50','PGĐ Hoàng chia sẻ: một tuần ngồi ở ghế Trưởng phòng','Thời gian thực tế đi vào đâu, việc nào phải tự làm, việc nào giao được, quyết định nào khó nhất','PGD','KHONG','KHONG',false),
  ('THUC_HANH',7,'13:50','14:30','Checkpoint giữa kỳ ba việc gối đầu','Đối chiếu tiến độ với tiêu chuẩn đã đặt ngày 1; ghi nhận việc nào đang đúng nhịp, việc nào cần điều chỉnh phạm vi hoặc hạn','CAN_BO','LAPTOP','TRAINING_CENTER',true),
  ('THUC_HANH',8,'14:30','15:10','Dựng bảng việc 3 cột và ma trận 4 hộp','Chuyển các đầu việc vào 3 cột Phải làm – Đang làm – Hoàn thành, mỗi thẻ có sản phẩm, người làm, hạn. Sau đó xếp vào ma trận quan trọng – khẩn cấp, thêm hai cột kiểm chứng: việc này tôi làm tốt nhất? việc này ai khác làm được? Rút ra 4 nhóm: tự làm · giao việc · tự động hóa · tạm dừng','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TRINH_BAY',9,'15:10','15:20','Chuẩn bị trình bày','Mở slide và chuẩn bị sẵn câu trả lời cho ba câu hỏi cố định','HOC_VIEN','LAPTOP','KHONG',false),
  ('TRINH_BAY',10,'15:20','16:00','Trình bày và phản hồi — 40 phút','12 phút trình bày · 18 phút trao đổi · 10 phút phản hồi theo cấu trúc sự việc – ảnh hưởng – kỳ vọng – hỗ trợ – cam kết. Trình chiếu từ laptop cá nhân, file đã gửi email trước đó','PGD','LAPTOP','KHONG',true),
  ('TU_SUY_NGAM',11,'16:00','16:35','Phiên tự suy ngẫm — Tầng 2 — Quản trị công việc','Trong các đầu việc trên bảng, việc nào thật sự chỉ tôi làm được? Việc nào tôi đang giữ vì đã quen tay? Viết tay 15 phút, tự chấm mức 5 phút, ghi lại 15 phút. Phiên này không tính điểm và không có Ban Giám đốc.','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TU_SUY_NGAM',12,'16:35','17:00','Nộp sản phẩm, chốt PDCA và nhận văn bản ngày mai','Gửi email toàn bộ file làm trên máy cơ quan cho Ban Giám đốc; tích hoàn thành từng đầu việc trên Training Center. Nhận văn bản để đọc lượt 1 ngay trong tối','HOC_VIEN','LAPTOP','TRAINING_CENTER',false),
  ('TU_SUY_NGAM',13,'18:00','19:30','Giao lưu pickleball cùng cán bộ Chi nhánh','Sân của Chi nhánh. Hoạt động gắn kết, không trao đổi công việc và không bàn hồ sơ','CAN_BO','KHONG','KHONG',false)
) AS v(phan, thu_tu, bd, kt, ten, noi_dung, nguoi, thiet_bi, noi_nop, trong_tam) ON true
 WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%') AND n.so_thu_tu = 5;

-- Ngày 6 · Lần theo dòng tiền — con mắt thứ hai của Trưởng phòng
INSERT INTO public.ttc_dau_viec
  (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
SELECT n.id, v.phan, v.thu_tu, v.bd::time, v.kt::time, v.ten, v.noi_dung, v.nguoi, v.thiet_bi, v.noi_nop, v.trong_tam
  FROM public.ttc_ngay n JOIN (VALUES
  ('KHOI_DONG',1,'08:00','08:30','Cập nhật tiến độ ba việc gối đầu với cán bộ','Trao đổi ngắn với từng cán bộ theo PDCA: từ hôm qua đã làm được gì, hôm nay làm gì, có gì vướng cần Trưởng phòng gỡ. Mỗi cán bộ 10 phút','CAN_BO','LAPTOP','TRAINING_CENTER',true),
  ('KHOI_DONG',2,'08:30','09:00','VietinType — 30 phút','Ghi tốc độ, độ chính xác và nhóm phím cần luyện thêm vào log của ngày','HOC_VIEN','LAPTOP','TRAINING_CENTER',false),
  ('VAN_BAN',3,'09:00','10:00','Đọc văn bản của ngày theo phương pháp 3 lượt','Quét cấu trúc 15 phút → đọc sâu, đánh dấu điểm thay đổi, điều kiện và rủi ro 40 phút → gấp văn bản và kể lại 25 phút. Sản phẩm: phiếu văn bản 1 trang','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',4,'10:00','10:40','Lập phiếu 06 thang tư duy Bloom','Mỗi thang có bằng chứng riêng và ghi số slide tương ứng','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',5,'10:40','11:30','Xây dựng bộ slide 5–7 trang','Tự thực hiện trên máy cơ quan, chưa dùng AI. Tiêu đề mỗi slide là một kết luận; góc slide ghi nhãn thang Bloom','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('THUC_HANH',6,'13:30','13:40','Nhận đề — TCTH mở file bài tập 2','Lưu ý: bắt đầu từ việc rà soát file đã nhận, chưa dựng lại mô hình từ đầu','TCTH','MAY_CO_QUAN','KHONG',false),
  ('THUC_HANH',7,'13:40','15:40','Làm bài 120 phút — rà soát dòng tiền dự án','Nhà máy giấy bao bì 90.000 tấn/năm, tổng mức đầu tư 1.200 tỷ, đề nghị vay 840 tỷ. Sản phẩm: nhật ký rà soát · con số chuẩn NPV/IRR/DSCR · kết luận tín dụng · thứ tự 07 bước kiểm tra','HOC_VIEN','MAY_CO_QUAN','EMAIL',true),
  ('THUC_HANH',8,'15:40','15:50','Khóa bài','Lưu theo mã bài, gửi email nộp bài, khóa quyền sửa','TCTH','MAY_CO_QUAN','EMAIL',false),
  ('TRINH_BAY',9,'15:50','16:20','Giải trình','Trình bày 05 phát hiện trọng tâm và thứ tự 07 bước kiểm tra một mô hình dòng tiền dự án','GD_PGD','KHONG','KHONG',false),
  ('TRINH_BAY',10,'16:20','16:50','Đáp án bước 1 — 07 con số neo','NPV, IRR, hoàn vốn, DSCR tối thiểu, DSCR bình quân, kỳ cần bổ sung nguồn, vốn lưu động ban đầu. Tự truy ngược xem chênh do đâu','HOC_VIEN','MAY_CO_QUAN','KHONG',true),
  ('TRINH_BAY',11,'16:50','17:15','Đáp án bước 2 — mở file mô hình chuẩn','Hoàn thiện bản đồ năng lực theo 5 nhóm: kiến thức tài chính · thao tác Excel · khả năng phát hiện sai lệch · lập luận tín dụng · trình bày','PGD','KHONG','KHONG',false),
  ('TU_SUY_NGAM',12,'17:15','17:45','Phiên tự suy ngẫm — Vốn uy tín','Uy tín chuyên môn của tôi đang dựa trên điều gì: thâm niên, quan hệ, hay khả năng nhìn ra điều người khác chưa nhìn ra?','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TU_SUY_NGAM',13,'18:00','19:30','Giao lưu pickleball cùng cán bộ Chi nhánh','Sân của Chi nhánh. Hoạt động gắn kết, không trao đổi công việc và không bàn hồ sơ','CAN_BO','KHONG','KHONG',false)
) AS v(phan, thu_tu, bd, kt, ten, noi_dung, nguoi, thiet_bi, noi_nop, trong_tam) ON true
 WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%') AND n.so_thu_tu = 6;

-- Ngày 7 · Một cây làm chẳng nên non — nghệ thuật giao việc
INSERT INTO public.ttc_dau_viec
  (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
SELECT n.id, v.phan, v.thu_tu, v.bd::time, v.kt::time, v.ten, v.noi_dung, v.nguoi, v.thiet_bi, v.noi_nop, v.trong_tam
  FROM public.ttc_ngay n JOIN (VALUES
  ('KHOI_DONG',1,'08:00','08:30','Cập nhật tiến độ ba việc gối đầu với cán bộ','Trao đổi ngắn với từng cán bộ theo PDCA: từ hôm qua đã làm được gì, hôm nay làm gì, có gì vướng cần Trưởng phòng gỡ. Mỗi cán bộ 10 phút','CAN_BO','LAPTOP','TRAINING_CENTER',true),
  ('KHOI_DONG',2,'08:30','09:00','VietinType — 30 phút','Ghi tốc độ, độ chính xác và nhóm phím cần luyện thêm vào log của ngày','HOC_VIEN','LAPTOP','TRAINING_CENTER',false),
  ('VAN_BAN',3,'09:00','10:00','Đọc văn bản của ngày theo phương pháp 3 lượt','Quét cấu trúc 15 phút → đọc sâu, đánh dấu điểm thay đổi, điều kiện và rủi ro 40 phút → gấp văn bản và kể lại 25 phút. Sản phẩm: phiếu văn bản 1 trang','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',4,'10:00','10:40','Lập phiếu 06 thang tư duy Bloom','Mỗi thang có bằng chứng riêng và ghi số slide tương ứng','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',5,'10:40','11:30','Xây dựng bộ slide 5–7 trang','Tự thực hiện trên máy cơ quan, chưa dùng AI. Tiêu đề mỗi slide là một kết luận; góc slide ghi nhãn thang Bloom','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('THUC_HANH',6,'13:30','13:50','Giám đốc chia sẻ: từ làm việc sang làm cho người khác làm được','Bốn vai và câu hỏi đặc trưng của từng vai. Giao việc không phải là chuyển việc, mà là chuyển cả tiêu chuẩn và điểm kiểm tra','GD','KHONG','KHONG',false),
  ('THUC_HANH',7,'13:50','14:40','Giao đoạn việc tiếp theo của ba việc gối đầu theo 5W2H và PDCA','Với từng cán bộ: đối chiếu đoạn đã làm (Check), rút bài học (Act), giao đoạn tiếp theo (Plan – Do). Cán bộ nhắc lại yêu cầu bằng lời của mình, cùng chốt mốc kiểm tra. Giữ đúng mốc đã hẹn','CAN_BO','LAPTOP','TRAINING_CENTER',true),
  ('THUC_HANH',8,'14:40','15:40','AI ca 1 — Tìm kiếm thông tin có kiểm chứng','Dùng AI bổ sung cho phiếu văn bản đã tự làm buổi sáng. Ghi nhật ký kiểm chứng: mình tự làm được gì – AI đưa ra gì – khác nhau ở đâu – kiểm chứng bằng nguồn nào – quyết định dùng hay bỏ','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TRINH_BAY',9,'15:40','15:50','Chuẩn bị trình bày','Mở slide, chuẩn bị câu trả lời cho ba câu hỏi cố định','HOC_VIEN','LAPTOP','KHONG',false),
  ('TRINH_BAY',10,'15:50','16:30','Trình bày và phản hồi — 40 phút','12 phút trình bày · 18 phút trao đổi · 10 phút phản hồi','GD','LAPTOP','KHONG',true),
  ('TU_SUY_NGAM',11,'16:30','17:05','Phiên tự suy ngẫm — Tầng 3 — Giao việc','Buổi giao việc vừa rồi, điều cán bộ nhắc lại có khớp với điều tôi nghĩ mình đã nói không? Chênh lệch nằm ở đâu? Phiên này không tính điểm và không có Ban Giám đốc.','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TU_SUY_NGAM',12,'17:05','17:25','Nộp sản phẩm, chốt PDCA và nhận văn bản ngày mai','Gửi email file máy cơ quan cho Ban Giám đốc; tích hoàn thành trên Training Center','HOC_VIEN','LAPTOP','TRAINING_CENTER',false)
) AS v(phan, thu_tu, bd, kt, ten, noi_dung, nguoi, thiet_bi, noi_nop, trong_tam) ON true
 WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%') AND n.so_thu_tu = 7;

-- Ngày 8 · Trăm năm trồng người — kèm cặp và lộ trình phát triển
INSERT INTO public.ttc_dau_viec
  (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
SELECT n.id, v.phan, v.thu_tu, v.bd::time, v.kt::time, v.ten, v.noi_dung, v.nguoi, v.thiet_bi, v.noi_nop, v.trong_tam
  FROM public.ttc_ngay n JOIN (VALUES
  ('KHOI_DONG',1,'08:00','08:30','Cập nhật tiến độ ba việc gối đầu với cán bộ','Trao đổi ngắn với từng cán bộ theo PDCA: từ hôm qua đã làm được gì, hôm nay làm gì, có gì vướng cần Trưởng phòng gỡ. Mỗi cán bộ 10 phút','CAN_BO','LAPTOP','TRAINING_CENTER',true),
  ('KHOI_DONG',2,'08:30','09:00','VietinType — 30 phút','Ghi tốc độ, độ chính xác và nhóm phím cần luyện thêm vào log của ngày','HOC_VIEN','LAPTOP','TRAINING_CENTER',false),
  ('VAN_BAN',3,'09:00','10:00','Đọc văn bản của ngày theo phương pháp 3 lượt','Quét cấu trúc 15 phút → đọc sâu, đánh dấu điểm thay đổi, điều kiện và rủi ro 40 phút → gấp văn bản và kể lại 25 phút. Sản phẩm: phiếu văn bản 1 trang','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',4,'10:00','10:40','Lập phiếu 06 thang tư duy Bloom','Mỗi thang có bằng chứng riêng và ghi số slide tương ứng','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',5,'10:40','11:30','Xây dựng bộ slide 5–7 trang','Tự thực hiện trên máy cơ quan, chưa dùng AI. Tiêu đề mỗi slide là một kết luận; góc slide ghi nhãn thang Bloom','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('THUC_HANH',6,'13:30','13:50','PGĐ Hoàng chia sẻ: một lần kèm cặp và điều xảy ra sau đó','Câu chuyện về một cán bộ đã được kèm cặp — mất bao lâu để thấy chuyển biến và điều gì đã tạo ra chuyển biến đó','PGD','KHONG','KHONG',false),
  ('THUC_HANH',7,'13:50','14:30','Buổi trao đổi phát triển với cán bộ của việc gối đầu số 3','10 phút đầu dành để lắng nghe và đặt câu hỏi. Cán bộ tự nêu mục tiêu, phương án và hành động. Cán bộ điền phiếu cảm nhận riêng sau buổi','PGD','LAPTOP','TRAINING_CENTER',true),
  ('THUC_HANH',8,'14:30','15:30','AI ca 2 — Ứng dụng AI khi xây dựng slide','Đưa cùng văn bản đã tự làm slide ngày 2 cho AI, đối chiếu hai bản về cấu trúc, độ chính xác và chỗ AI cần được kiểm chứng. Ghi nhật ký kiểm chứng: mình tự làm được gì – AI đưa ra gì – khác nhau ở đâu – kiểm chứng bằng nguồn nào – quyết định dùng hay bỏ','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TRINH_BAY',9,'15:30','15:40','Chuẩn bị trình bày','Mở slide, chuẩn bị câu trả lời cho ba câu hỏi cố định','HOC_VIEN','LAPTOP','KHONG',false),
  ('TRINH_BAY',10,'15:40','16:20','Trình bày và phản hồi — 40 phút','12 phút trình bày · 18 phút trao đổi · 10 phút phản hồi','GD','LAPTOP','KHONG',true),
  ('TU_SUY_NGAM',11,'16:20','16:55','Phiên tự suy ngẫm — Tầng 3 — Phát triển người','Trong buổi trao đổi phát triển, tôi nói bao nhiêu phần thời gian? Cán bộ tự nghĩ ra phương án hay tôi đã đưa sẵn? Phiên này không tính điểm và không có Ban Giám đốc.','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TU_SUY_NGAM',12,'16:55','17:15','Nộp sản phẩm, chốt PDCA và nhận văn bản ngày mai','Gửi email file máy cơ quan cho Ban Giám đốc; tích hoàn thành trên Training Center','HOC_VIEN','LAPTOP','TRAINING_CENTER',false)
) AS v(phan, thu_tu, bd, kt, ten, noi_dung, nguoi, thiet_bi, noi_nop, trong_tam) ON true
 WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%') AND n.so_thu_tu = 8;

-- Ngày 9 · Thấy rừng, không chỉ thấy cây — quản trị hệ thống
INSERT INTO public.ttc_dau_viec
  (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
SELECT n.id, v.phan, v.thu_tu, v.bd::time, v.kt::time, v.ten, v.noi_dung, v.nguoi, v.thiet_bi, v.noi_nop, v.trong_tam
  FROM public.ttc_ngay n JOIN (VALUES
  ('KHOI_DONG',1,'08:00','08:30','Cập nhật tiến độ ba việc gối đầu với cán bộ','Ngày cuối trước nghiệm thu: xác nhận từng cán bộ sẽ nộp sản phẩm đúng hạn 13:30 ngày mai','CAN_BO','LAPTOP','TRAINING_CENTER',true),
  ('KHOI_DONG',2,'08:30','09:00','VietinType — 30 phút','Ghi tốc độ, độ chính xác và nhóm phím cần luyện thêm','HOC_VIEN','LAPTOP','TRAINING_CENTER',false),
  ('VAN_BAN',3,'09:00','10:00','Đọc văn bản 8108 và nghiên cứu các chương trình trên Bắc Hưng Yên ONE','Mỗi chương trình trả lời ba câu: giải quyết vấn đề gì của VietinBank và của Chi nhánh, ai là người dùng thật, điều gì đang cản việc dùng thường xuyên','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',4,'10:00','10:40','Đánh giá từng chương trình theo 06 thang Bloom','Người dùng đang ở thang nào và cần hỗ trợ gì để lên thang tiếp theo','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('VAN_BAN',5,'10:40','11:30','Xây bộ slide đánh giá các chương trình','Mỗi chương trình một slide kết luận. Tự thực hiện, chưa dùng AI','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('THUC_HANH',6,'13:30','14:10','Bản đồ rủi ro phân khúc KHDN','05 rủi ro đáng lưu ý nhất, mỗi rủi ro có dấu hiệu nhận biết sớm, số đo, giải pháp giảm thiểu và người theo dõi','HOC_VIEN','MAY_CO_QUAN','EMAIL',true),
  ('THUC_HANH',7,'14:10','14:40','Đề xuất rút ngắn thời gian tác nghiệp của RM','Dựa trên văn bản số hóa 8108 và hiện trạng của Phòng: chỉ ra bước có thể tinh gọn, ước tính số giờ tiết kiệm mỗi tháng','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('THUC_HANH',8,'14:40','15:40','AI ca 3 — phân tích dự án và khách hàng','Làm quen skill, AI agent, MCP và connector trên dữ liệu công khai hoặc giả lập. Nêu rõ ranh giới dữ liệu được phép đưa vào','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TRINH_BAY',9,'15:40','15:50','Chuẩn bị trình bày',NULL,'HOC_VIEN','LAPTOP','KHONG',false),
  ('TRINH_BAY',10,'15:50','16:30','Trình bày và phản hồi — 40 phút, bảo vệ đề xuất cải tiến','12 phút trình bày · 18 phút trao đổi về tính khả thi · 10 phút phản hồi','GD_PGD','LAPTOP','KHONG',true),
  ('TU_SUY_NGAM',11,'16:30','17:05','Phiên tự suy ngẫm — Tầng 4, Quản trị hệ thống','Sáu đòn bẩy — mục tiêu, cơ cấu, quy trình, cơ chế, kiểm soát, văn hoá — Phòng tôi đang yếu ở đòn bẩy nào? Tôi kết nối được với ai để thay đổi nó?','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TU_SUY_NGAM',12,'17:05','17:25','Nộp sản phẩm và chuẩn bị hồ sơ bảo vệ','Chọn 06 sản phẩm sẽ trình bày ngày mai. Văn bản ngày mai: 8820 và 100.01','HOC_VIEN','LAPTOP','TRAINING_CENTER',false)
) AS v(phan, thu_tu, bd, kt, ten, noi_dung, nguoi, thiet_bi, noi_nop, trong_tam) ON true
 WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%') AND n.so_thu_tu = 9;

-- Ngày 10 · Đường dài mới biết ngựa hay — đo lại và cam kết
INSERT INTO public.ttc_dau_viec
  (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
SELECT n.id, v.phan, v.thu_tu, v.bd::time, v.kt::time, v.ten, v.noi_dung, v.nguoi, v.thiet_bi, v.noi_nop, v.trong_tam
  FROM public.ttc_ngay n JOIN (VALUES
  ('KHOI_DONG',1,'08:00','08:30','Cập nhật lần cuối ba việc gối đầu với cán bộ','Xác nhận sản phẩm sẽ nộp đúng 13:30 chiều nay','CAN_BO','LAPTOP','TRAINING_CENTER',false),
  ('KHOI_DONG',2,'08:30','09:00','Đo lại VietinType','Bài tương đương ngày 1. So tốc độ, độ chính xác và nhóm phím với mốc nền','TCTH','LAPTOP','TRAINING_CENTER',false),
  ('KHOI_DONG',3,'09:00','09:55','Đọc hai văn bản cuối và lập phiếu văn bản','8820 chương trình thi đua SME dòng tiền vàng và 100.01 cấp tín dụng online. Rút ra ba việc Phòng làm được ngay trong quý tới, gắn với chỉ tiêu cụ thể','HOC_VIEN','MAY_CO_QUAN','EMAIL',false),
  ('KHOI_DONG',4,'09:55','10:40','Tự chấm 08 tiêu chí trưởng thành — lần hai','Đặt cạnh kết quả ngày 1 để thấy rõ mức dịch chuyển. Tự đánh giá theo barem trước khi xem điểm hội đồng','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('THUC_HANH',5,'10:40','11:30','Sắp xếp hồ sơ 06 sản phẩm bảo vệ','Mỗi sản phẩm kèm một trang tóm tắt: làm gì, kết quả ra sao, dùng được vào việc gì của Phòng','HOC_VIEN','LAPTOP','TRAINING_CENTER',false),
  ('TRINH_BAY',6,'13:30','14:10','Nghiệm thu 03 việc gối đầu','Nhận sản phẩm từ ba cán bộ, đối chiếu tiêu chuẩn đã đặt ngày 1. Ghi nhận: đúng hạn hay chậm · đạt chuẩn ngay hay phải làm lại · cán bộ có phải hỏi lại giữa chừng không. Đây chính là kết quả chỉ đạo và kết quả kèm cặp trong mười ngày','GD_PGD','LAPTOP','TRAINING_CENTER',true),
  ('TRINH_BAY',7,'14:10','15:20','Bảo vệ 06 sản phẩm trước hội đồng','Bộ phiếu văn bản và Bloom cho 10 văn bản tháng 8 · bộ slide và bản ghi trình bày · hai bài rà soát và bản đồ năng lực · Bảng việc và kết quả ba việc gối đầu · giao việc và kèm cặp · BHY ONE và đề xuất cải tiến','TO_CHAM','LAPTOP','KHONG',true),
  ('TRINH_BAY',8,'15:20','15:50','PGĐ Hoàng chia sẻ góc nhìn từ vai Trưởng phòng','Sau 10 ngày trực tiếp điều hành: bức tranh thực tế, điểm cần cải thiện của hệ thống, tối thiểu 05 đề xuất','PGD','KHONG','KHONG',false),
  ('TU_SUY_NGAM',9,'15:50','16:25','Phiên tự suy ngẫm cuối — STOP, START, CONTINUE','Tôi đang ở tầng nào so với ngày 1? Điều gì đang cản tôi lên tầng tiếp theo? Từ ngày mai tôi cần dừng gì, bắt đầu gì, tiếp tục gì?','HOC_VIEN','LAPTOP','TRAINING_CENTER',true),
  ('TU_SUY_NGAM',10,'16:25','17:00','Công bố kết quả theo từng cấu phần','Nhìn theo từng lát cắt năng lực thay vì một điểm tổng. Giám đốc kết luận điểm mạnh và hướng phát triển tiếp theo','GD_PGD','KHONG','KHONG',false),
  ('TU_SUY_NGAM',11,'17:00','17:40','Ký kế hoạch 30–60–90 ngày','Lịch review, nhiệm vụ khi trở lại vai Trưởng phòng và các thẻ việc tiếp tục chạy trên Bảng việc','GD_PGD','KHONG','KHONG',true),
  ('TRINH_BAY',12,'18:00','19:30','Giao lưu pickleball bế mạc cùng cán bộ Chi nhánh','Sân của Chi nhánh. Khép lại mười ngày bằng một buổi gắn kết','GD','KHONG','KHONG',false)
) AS v(phan, thu_tu, bd, kt, ten, noi_dung, nguoi, thiet_bi, noi_nop, trong_tam) ON true
 WHERE n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%') AND n.so_thu_tu = 10;
