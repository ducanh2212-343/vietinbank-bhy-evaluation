-- NHÓM J — MƯỢN LỜI BÀI HÁT (13/08/2026): 11 câu mở ngày bẻ lái từ 4 bài GĐ hay hát.
--
-- Nguyên tắc: KHÔNG chép nguyên văn lời nhạc. Chỉ mượn cái MÓC ai cũng nhận ra rồi bẻ
-- cái kết về ghi nhịp — đúng kỹ thuật số 4 trong luật viết câu («mượn tục ngữ bẻ lái»,
-- ở đây là mượn nhạc). Hai lẽ: lời gốc phần lớn là tình buồn (cô đơn, người lạ, đi lấy
-- chồng) — đứng trơ trên tin nhắc việc thì lạc điệu; và chép nguyên câu nhạc của người
-- khác vào sản phẩm chạy hằng ngày là điều nên tránh, còn nhại vài chữ kiểu nhạc chế là
-- văn hóa văn phòng lành mạnh.
--
-- Nhóm J tách riêng (không rải vào A–K) để view ct2_hieu_qua_theo_nhom đo được cả cụm,
-- và nếu kiểu đùa này không hợp thì tắt cả nhóm bằng một lệnh:
--   UPDATE ct2_cau_mo_ngay SET dang_dung = false WHERE nhom = 'J';
--
-- thu_tu = hạng × 100 + 11: nhóm J đứng cuối mỗi vòng xen kẽ A→K→J, câu đầu của nhóm
-- vào sóng khoảng ngày làm việc thứ 11.
--
-- Nguồn từng câu (để người duyệt đối chiếu):
--   «Ai Chung Tình Được Mãi»: câu 1 (bình minh ơi... cà phê sáng với tôi), câu 2 (say
--     thì cứ say, yêu thì bỏ đi), câu 3 (đâu ai chung tình được mãi), câu 8 (sợ cô đơn)
--   «Diêu Bông»: câu 4 (bình minh chưa hé tôi phải tìm xong), câu 5 (ai đặt tên chúng
--     ta là người lạ)
--   «Trọn Đời Có Nhau»: câu 6 (nguyện cầu đến năm mươi năm về sau), câu 7 (trọn đời
--     có nhau)
--   «Phép Màu»: câu 9 (chẳng phải phép màu vậy sao), câu 10 (vẫn căng buồm ra khơi
--     theo làn gió mới), câu 11 (gọi tôi thức giấc cơn ngủ mê)

INSERT INTO public.ct2_cau_mo_ngay (noi_dung, nhom, thu, an_toan, thu_tu) VALUES
('Bình minh ơi dậy chưa, ghi nhịp sáng với tôi.',    'J', NULL, false, 111),
('Cà phê thì cứ say, việc thì đừng bỏ đi.',          'J', NULL, false, 211),
('Ai chung tình được mãi? Nhịp thì được.',           'J', NULL, false, 311),
('Bình minh chưa hé, nhịp phải ghi xong.',           'J', NULL, false, 411),
('Lâu không ghi, việc thành người lạ.',              'J', NULL, false, 511),
('Chuyện năm mươi năm sau bắt đầu từ dòng hôm nay.', 'J', NULL, true,  611),
('Việc với bạn, sáng nào cũng có nhau.',             'J', NULL, true,  711),
('Việc của bạn sợ cô đơn, ghé ghi một dòng.',        'J', NULL, false, 811),
('Không cần phép màu, chỉ cần một dòng mỗi sáng.',   'J', NULL, true,  911),
('Căng buồm ra khơi, mở ngày bằng một dòng mới.',    'J', NULL, true,  1011),
('Tin này chỉ để gọi bạn thức giấc cơn ngủ mê.',     'J', NULL, false, 1111);
