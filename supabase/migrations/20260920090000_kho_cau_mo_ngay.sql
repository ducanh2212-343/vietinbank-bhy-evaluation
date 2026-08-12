-- NẠP KHO 67 CÂU MỞ NGÀY — bản 2 (đã chỉnh vần–nhịp) của tài liệu thiết kế 12/08/2026.
--
-- thu_tu = hạng-trong-nhóm × 100 + số-nhóm (A=1 … K=10) → sắp theo thu_tu là được vòng
-- xen kẽ A→B→C→…→K→A, hai sáng liền nhau không gõ cùng một cần gạt tâm lý.
-- thu: 2..6 = chỉ phát đúng thứ Hai..thứ Sáu đó (nhóm G); NULL = mọi ngày.
-- an_toan = true: dùng được cả ngày nhạy cảm (chế độ an_toan) — 34/67 câu.
--
-- Trần 48 ký tự và lệnh cấm ký tự «·» «↳» do CHECK của bảng ép — dòng nào sai là toàn
-- migration đổ, không có chuyện lọt.
--
-- LƯU Ý nhóm F: câu «Còn 61 phút…» và «07:30 rồi…» gắn cứng khoảng cách 07:30 → 08:31.
-- Nếu TCTH dời giờ đúng-giờ trong Cài đặt ngày giờ thì phải rà lại nhóm F (tắt hoặc sửa).

INSERT INTO public.ct2_cau_mo_ngay (noi_dung, nhom, thu, an_toan, thu_tu) VALUES
-- A. Mở ngày nhẹ (7)
('Cà phê chưa kịp nguội, nhịp đã kịp ghi.',           'A', NULL, false, 101),
('Ghi nhịp xong xuôi, cà phê ngọt gấp đôi.',           'A', NULL, false, 201),
('Nhâm nhi cứ nhâm nhi, ghi thì vẫn cứ ghi.',          'A', NULL, false, 301),
('Chi nhánh mở cửa, bạn mở việc.',                     'A', NULL, true,  401),
('Mở màn ngày mới, gọn trong một dòng.',               'A', NULL, true,  501),
('Chào buổi sáng. Việc của bạn cũng vừa dậy.',         'A', NULL, true,  601),
('Trời sáng rồi, màn hình sáng rồi, ghi thôi.',        'A', NULL, false, 701),
-- B. Chuỗi liên tục (6)
('Chuỗi đang dài từng ngày, đừng đứt ở hôm nay.',      'B', NULL, true,  102),
('Giữ được hôm qua, đừng buông hôm nay.',              'B', NULL, true,  202),
('Chuỗi mười ngày công, lỡ một hôm về không.',         'B', NULL, false, 302),
('Ghi hay không bằng ghi đều.',                        'B', NULL, true,  402),
('Ba ngày thành quen, ba mươi ngày thành nếp.',        'B', NULL, true,  502),
('Chuỗi dài bắt đầu từ một dòng ngắn.',                'B', NULL, true,  602),
-- C. Gương soi bản thân (5)
('Nhịp là gương để soi, không phải bài để chấm.',      'C', NULL, true,  103),
('Ghi cho mình đọc lại, không phải cho ai chấm.',      'C', NULL, true,  203),
('Cuối năm đọc lại mới thấy quý dòng hôm nay.',        'C', NULL, true,  303),
('Não mau quên, sổ nhớ lâu.',                          'C', NULL, true,  403),
('Nhịp của mình, mình giữ. Không ai giữ thay.',        'C', NULL, true,  503),
-- D. Gốc rễ 20 năm (6)
('Rễ sâu nhờ từng ngày, chẳng nhờ một đêm.',           'D', NULL, true,  104),
('Mỗi dòng ghi hôm nay là một lần tưới gốc.',          'D', NULL, true,  204),
('Cây 20 năm cũng lớn từ ngày tưới đầu tiên.',         'D', NULL, true,  304),
('Vun gốc mỗi sáng, không đợi cuối năm.',              'D', NULL, true,  404),
('Gốc có vững, cành mới vươn xa.',                     'D', NULL, true,  504),
('Cây lớn từng ngày, nhịp bền từng sáng.',             'D', NULL, true,  604),
-- E. Nghề ngân hàng (8)
('Cuối ngày chốt số dư, đầu ngày chốt một dòng.',      'E', NULL, false, 105),
('Làm hồ sơ mất cả buổi, ghi nhịp mất một phút.',      'E', NULL, false, 205),
('Thẩm định khách xong, thẩm định mình một dòng.',     'E', NULL, false, 305),
('Khách hàng đợi được. Đồng hồ thì không.',            'E', NULL, false, 405),
('Chốt sổ có giờ. Ghi nhịp cũng có giờ.',              'E', NULL, true,  505),
('Việc chưa ghi như nợ chưa thu, để lâu càng nặng.',   'E', NULL, false, 605),
('Huy động vốn mới khó, ghi một dòng dễ ợt.',          'E', NULL, false, 705),
('Bảo lãnh cần con dấu, giữ nhịp cần một dòng.',       'E', NULL, false, 805),
-- F. Đồng hồ và 08:31 (6)
('Lãi tính từng ngày, nhịp tính từng phút.',           'F', NULL, false, 106),
('Đồng hồ không biết nói, nhưng nhớ rất dai.',         'F', NULL, false, 206),
('Còn 61 phút cho một việc 60 giây.',                  'F', NULL, false, 306),
('Gõ thì 3 phút, canh cánh thì 3 tiếng.',              'F', NULL, false, 406),
('07:30 rồi. Còn nguyên một giờ, chưa vội đâu.',       'F', NULL, true,  506),
('Cùng là 5 phút, sớm thì nhàn, muộn thì tiếc.',       'F', NULL, false, 606),
-- G. Theo thứ trong tuần (10)
('Thứ Hai không đáng sợ. Thứ Hai chưa ghi mới sợ.',    'G', 2,    false, 107),
('Tuần mới mở bằng một dòng, nhẹ hơn mở bằng họp.',    'G', 2,    false, 207),
('Thứ Hai giữ được nhịp, cả tuần vào nếp.',            'G', 2,    true,  307),
('Thứ Ba ít họp hành, ghi sớm cho an lành.',           'G', 3,    false, 407),
('Giữa tuần như giữa dốc, ghi một dòng lấy đà.',       'G', 4,    true,  507),
('Nửa tuần rồi, bỏ thì thương, vương thì ghi.',        'G', 4,    true,  607),
('Thứ Năm là thứ Sáu của người làm nhanh.',            'G', 5,    false, 707),
('Thứ Sáu ghi cho gọn, cuối tuần ngủ cho ngon.',       'G', 6,    false, 807),
('Khép tuần một dòng, thảnh thơi hai ngày ròng.',      'G', 6,    true,  907),
('Tuần này đóng gọn, tuần sau mở nhẹ.',                'G', 6,    true,  1007),
-- H. Hệ thống tự trêu (6)
('Hệ thống dậy từ 06:45, chỉ để đợi bạn.',             'H', NULL, false, 108),
('Hệ thống chỉ biết nhắc, không biết ghi giùm.',       'H', NULL, false, 208),
('Tin này không tự tắt. Ghi xong thì nó im.',          'H', NULL, false, 308),
('Hệ thống không biết giận, chỉ biết nhớ rất kỹ.',     'H', NULL, false, 408),
('Mai ghi trước 07:30, tin này xin nghỉ một hôm.',     'H', NULL, false, 508),
('Ghi xong thì hệ thống im lặng cả ngày.',             'H', NULL, false, 608),
-- I. Trì hoãn (5)
('Đừng hẹn lát nữa, lát nữa hay quên.',                'I', NULL, false, 109),
('Sáng còn ngái ngủ, gõ một dòng là tỉnh.',            'I', NULL, false, 209),
('Việc không biết tự ghi, đành chờ tay bạn.',          'I', NULL, false, 309),
('Để sang chiều, chiều lại bận việc khác.',            'I', NULL, false, 409),
('Trong đầu là nháp, gõ ra mới là ghi.',               'I', NULL, false, 509),
-- K. Ấm áp thuần (8)
('Một dòng thôi. Sau đó cả ngày là của bạn.',          'K', NULL, true,  110),
('Xong một dòng, nhẹ cả lòng.',                        'K', NULL, true,  210),
('Không cần viết hay. Chỉ cần viết thật.',             'K', NULL, true,  310),
('Bận thì ghi ngắn, ngắn vẫn tính giữ nhịp.',          'K', NULL, true,  410),
('Hôm nay chỉ cần hơn hôm qua một dòng.',              'K', NULL, true,  510),
('Chậm cũng được, miễn đừng dừng.',                    'K', NULL, true,  610),
('Bận mấy cũng còn 60 giây cho chính mình.',           'K', NULL, true,  710),
('Bước khó nhất là mở app. Phần sau nhẹ tênh.',        'K', NULL, true,  810);
