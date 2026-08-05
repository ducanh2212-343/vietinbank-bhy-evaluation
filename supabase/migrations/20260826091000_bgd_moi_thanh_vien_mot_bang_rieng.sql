-- Ban Giám đốc: mỗi thành viên một bảng riêng, không dùng khái niệm chung
--
-- GĐ chốt: «bảng Ban giám đốc cần của từng người, từng người quản lý riêng của
-- người đó». Tạo cho mỗi thành viên BGĐ một bảng mảng chế độ HẠN CHẾ, thành
-- viên duy nhất là chính người đó:
--   · người đó (vai pgd) thấy và làm việc trên bảng của mình qua thành viên
--   · Giám đốc (vai bgd) thấy MỌI bảng hạn chế — luật ct2_xem_duoc_bang có sẵn
--   · các PGĐ KHÔNG thấy bảng của nhau — đúng nghĩa «quản lý riêng»
-- Kanban chung của phòng BGĐ vẫn còn cho việc chung.
--
-- Không bịa người: danh sách lấy từ chính profiles của phòng BGD đang active.
INSERT INTO public.ct2_bang (phong, ten, mo_ta, loai, che_do_xem, nguoi_tao)
SELECT p.department_id,
       'Việc của ' || p.full_name,
       'Bảng riêng của ' || COALESCE(p.position, 'thành viên BGĐ')
         || ' — chỉ người phụ trách và Giám đốc nhìn thấy.',
       'MANG', 'HAN_CHE', p.id
  FROM public.profiles p
  JOIN public.departments d ON d.id = p.department_id
 WHERE d.code = 'BGD' AND p.status = 'active'
   AND NOT EXISTS (
     SELECT 1 FROM public.ct2_bang b
      WHERE b.phong = p.department_id AND b.ten = 'Việc của ' || p.full_name
   );

INSERT INTO public.ct2_bang_thanh_vien (bang_id, profile_id)
SELECT b.id, p.id
  FROM public.ct2_bang b
  JOIN public.profiles p ON b.ten = 'Việc của ' || p.full_name
  JOIN public.departments d ON d.id = b.phong AND d.code = 'BGD'
 WHERE NOT EXISTS (
   SELECT 1 FROM public.ct2_bang_thanh_vien tv
    WHERE tv.bang_id = b.id AND tv.profile_id = p.id
 );

-- Thẻ BGD-2608-001 là việc của Giám đốc — đưa về bảng riêng của anh, khỏi nằm
-- trong Kanban chung như một việc «của cả Ban».
UPDATE public.ct2_dau_viec dv
   SET bang_id = b.id
  FROM public.profiles p
  JOIN public.ct2_bang b ON b.ten = 'Việc của ' || p.full_name
 WHERE dv.ma_hien_thi = 'BGD-2608-001'
   AND dv.bang_id IS NULL
   AND dv.nguoi_chiu_trach_nhiem = p.id;
