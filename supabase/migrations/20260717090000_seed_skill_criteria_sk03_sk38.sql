-- Bộ tiêu chí xác định level cho SK03–SK38, soạn từ Khung 38 skill bản 3.5.1
-- (mô tả skill + mô tả 4 level trong skill_catalog). Văn phong theo chuẩn
-- SK01/SK02 đã duyệt: 3-4 tiêu chí hành vi/level, 1 tiêu chí gate bắt buộc
-- minh chứng, thang tích luỹ Guttman.
-- Đây là BẢN NHÁP để admin biên tập trực tiếp trên trang "Tiêu chí xác định
-- level" (sửa câu chữ, bật/tắt, đổi gate) — không cần bấm sinh AI từng skill.
-- Idempotent theo skill: chỉ chèn khi skill CHƯA có tiêu chí active nào,
-- nên không đụng vào SK01/SK02 và chạy lại không tạo trùng.

-- ============ SK03. Chiêu thức số 3 - Phát triển nhân sự ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Hoàn thành đầy đủ biểu mẫu đánh giá kỳ hiện tại: tự chấm đủ các skill và nhóm thái độ, nộp đúng hạn.'::text, true, true, 1),
  (1, 'Tự nêu được ít nhất 2 điểm mạnh, 2 điểm yếu của bản thân kèm ví dụ từ công việc thực tế.'::text, false, false, 2),
  (1, 'Xác định được ít nhất 1 skill cần cải thiện trước mắt và giải thích được lý do chọn.'::text, false, false, 3),
  (1, 'Nếu phụ trách đội ngũ: đã rà soát biểu mẫu đánh giá của cán bộ và trao đổi 1-1 làm rõ thực tế, kể cả thái độ.'::text, false, false, 4),
  (2, 'Xây dựng được IDP cá nhân có mục tiêu, hành động, thời hạn và cách đo kết quả cho kỳ hiện tại.'::text, true, true, 1),
  (2, 'Theo dõi tiến độ IDP trong kỳ, cập nhật trạng thái từng hành động ít nhất hằng tháng.'::text, false, false, 2),
  (2, 'Nếu phụ trách đội ngũ: xác định được cán bộ đang có skill nào, ở level nào, còn thiếu gì.'::text, false, false, 3),
  (2, 'Nhận diện được ít nhất 1 vấn đề thái độ (chủ động, phối hợp, cầu thị...) và định hướng được cách cải thiện.'::text, false, false, 4),
  (3, 'Rà soát tiến độ phát triển theo quý và điều chỉnh IDP theo PDCA khi chưa đạt, có nội dung điều chỉnh cụ thể.'::text, true, true, 1),
  (3, 'Đánh giá cán bộ có căn cứ: điểm mạnh, điểm yếu, level hiện tại, skill ưu tiên và level mục tiêu.'::text, false, false, 2),
  (3, 'Cùng ít nhất 1 cán bộ xây lộ trình upskill và lộ trình cải thiện thái độ phù hợp.'::text, false, true, 3),
  (3, 'Chỉ ra được hạn chế thái độ đang ảnh hưởng hiệu quả công việc và hành động khắc phục kèm theo.'::text, false, false, 4),
  (4, 'Phát triển được ít nhất 1 cán bộ lên level cao hơn hoặc cải thiện rõ rệt thái độ trong 2 kỳ gần nhất.'::text, true, true, 1),
  (4, 'Xây dựng được đội ngũ kế cận sẵn sàng thay thế ở ít nhất 1 vị trí trọng yếu.'::text, false, true, 2),
  (4, 'Lan tỏa cách làm phát triển nhân sự hiệu quả (chia sẻ, coaching, công cụ số) ra ngoài phạm vi phòng mình.'::text, false, false, 3),
  (4, 'Sử dụng dữ liệu đánh giá, phản hồi và coaching định kỳ để nâng chất lượng đội ngũ.'::text, false, false, 4)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK03' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK04. Tổng hợp & Phân tích dữ liệu ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Trích xuất, tổng hợp và trình bày được số liệu theo mẫu, đúng hạn cho các báo cáo được giao trong kỳ.'::text, true, true, 1),
  (1, 'Phát hiện và xử lý được sai lệch số học hoặc lỗi logic rõ ràng trước khi gửi báo cáo.'::text, false, false, 2),
  (1, 'Trình bày bảng số liệu gọn gàng, đúng định dạng, người nhận không phải hỏi lại về cách đọc.'::text, false, false, 3),
  (2, 'Tự làm sạch dữ liệu, so sánh số liệu giữa các kỳ và chỉ ra biến động đáng chú ý trong báo cáo mình phụ trách.'::text, true, true, 1),
  (2, 'Giải thích được nguyên nhân ban đầu của ít nhất 1 biến động khi lãnh đạo hỏi.'::text, false, false, 2),
  (2, 'Chủ động rà soát chất lượng dữ liệu đầu vào trước khi tổng hợp, không chờ nhắc.'::text, false, false, 3),
  (3, 'Phân tích dữ liệu theo ít nhất 3 chiều (sản phẩm, khách hàng, cán bộ, thời gian, địa bàn) và chỉ ra nguyên nhân gốc rễ.'::text, true, true, 1),
  (3, 'Đề xuất được hành động xử lý cụ thể từ kết quả phân tích và có ít nhất 1 đề xuất được áp dụng.'::text, false, true, 2),
  (3, 'Bảo vệ được kết quả phân tích khi bị phản biện về số liệu hoặc phương pháp.'::text, false, false, 3),
  (4, 'Xây dựng được báo cáo/logic điều hành kết nối số liệu kinh doanh, vận hành, rủi ro đang được lãnh đạo sử dụng.'::text, true, true, 1),
  (4, 'Có ít nhất 1 tham mưu từ dữ liệu được đưa vào quyết định điều hành của đơn vị.'::text, false, true, 2),
  (4, 'Hướng dẫn được cán bộ khác về cách tổng hợp, phân tích và trình bày dữ liệu.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK04' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK05. Excel, VBA & Tự động hóa báo cáo ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Dùng được các hàm SUM, AVERAGE, MIN, MAX, COUNT/COUNTA và Filter/Sort để xử lý bảng dữ liệu công việc thực tế.'::text, true, true, 1),
  (1, 'Nhập liệu, định dạng và trình bày bảng dữ liệu gọn gàng, dễ đọc theo yêu cầu.'::text, false, false, 2),
  (1, 'Tự kiểm tra kết quả tính toán trước khi gửi, không để lỗi số học lặp lại.'::text, false, false, 3),
  (2, 'Dùng được hàm tra cứu (VLOOKUP/XLOOKUP/INDEX+MATCH) và IF, SUMIFS, COUNTIFS trong báo cáo định kỳ mình phụ trách.'::text, true, true, 1),
  (2, 'Lập được Pivot Table và biểu đồ cơ bản phục vụ theo dõi chỉ tiêu, đối chiếu số liệu.'::text, false, false, 2),
  (2, 'Làm sạch được dữ liệu (trùng, thiếu, sai định dạng) trước khi tổng hợp.'::text, false, false, 3),
  (3, 'Thiết kế được file quản trị nhiều sheet liên kết, công thức ổn định, đang được phòng sử dụng.'::text, true, true, 1),
  (3, 'Dùng được macro hoặc Power Query để giảm thao tác thủ công cho ít nhất 1 báo cáo lặp lại.'::text, false, true, 2),
  (3, 'Chuẩn hóa luồng xử lý dữ liệu giúp rút ngắn thời gian hoặc giảm lỗi rõ rệt.'::text, false, false, 3),
  (4, 'Viết hoặc chỉnh sửa được VBA/macro/giải pháp tự động hóa báo cáo cấp phòng/đơn vị đang chạy thực tế.'::text, true, true, 1),
  (4, 'Hướng dẫn được ít nhất 1 người sử dụng và bảo trì công cụ tự động hóa.'::text, false, true, 2),
  (4, 'Nhân rộng được cách làm tự động hóa sang báo cáo hoặc bộ phận khác.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK05' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK06. PowerPoint & Tài liệu trình bày quản trị ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Soạn được slide đúng bố cục, đúng mẫu nhận diện, đủ ý chính cho báo cáo công việc cơ bản.'::text, true, true, 1),
  (1, 'Nội dung slide không lỗi chính tả, số liệu khớp với tài liệu nguồn.'::text, false, false, 2),
  (1, 'Hoàn thành slide đúng thời hạn được giao.'::text, false, false, 3),
  (2, 'Xây được bộ slide có logic câu chuyện rõ (vấn đề - phân tích - đề xuất) cho cuộc họp thực tế.'::text, true, true, 1),
  (2, 'Chọn và trình bày biểu đồ phù hợp giúp người xem nắm nhanh vấn đề.'::text, false, false, 2),
  (2, 'Rút gọn được nội dung: mỗi slide 1 thông điệp chính, không nhồi chữ.'::text, false, false, 3),
  (3, 'Thiết kế tài liệu cho họp quản trị/bảo vệ phương án được lãnh đạo dùng trực tiếp, không phải làm lại.'::text, true, true, 1),
  (3, 'Trực quan hóa dữ liệu phức tạp thành hình ảnh, biểu đồ dễ hiểu, tăng sức thuyết phục.'::text, false, false, 2),
  (3, 'Điều chỉnh tài liệu nhanh theo góp ý mà vẫn giữ được logic tổng thể.'::text, false, false, 3),
  (4, 'Xây dựng được mẫu/chuẩn trình bày đang được đơn vị áp dụng.'::text, true, true, 1),
  (4, 'Hướng dẫn đồng nghiệp nâng chất lượng slide qua ít nhất 1 buổi chia sẻ hoặc kèm cặp.'::text, false, true, 2),
  (4, 'Nâng rõ chất lượng tài liệu báo cáo của phòng, được lãnh đạo ghi nhận.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK06' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK07. Ứng dụng AI & thói quen làm việc số ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Đã dùng AI (ChatGPT, Gemini, MyGenie...) cho các việc cơ bản: tóm tắt, lập dàn ý, soạn nháp, tra cứu.'::text, true, true, 1),
  (1, 'Kể được các tính năng chính của ít nhất 2 công cụ AI được phép sử dụng.'::text, false, false, 2),
  (1, 'Tuân thủ nguyên tắc bảo mật khi dùng AI: không đưa dữ liệu mật, dữ liệu khách hàng lên công cụ bên ngoài.'::text, false, false, 3),
  (2, 'Sử dụng AI gần như hằng ngày trong công việc và luôn kiểm tra lại đầu ra trước khi áp dụng.'::text, true, true, 1),
  (2, 'Dùng MyGenie để tra cứu quy định, thông tin nội bộ hoặc soạn bản chào, trả lời email khó.'::text, false, false, 2),
  (2, 'Dùng Gemini/NotebookLM/ChatGPT để đọc nhanh tài liệu, tổng hợp nội dung, theo dõi chủ điểm quan tâm.'::text, false, false, 3),
  (3, 'Dùng AI tạo ra ít nhất 1 giải pháp, sáng kiến hoặc phương án được áp dụng vào công việc thực tế.'::text, true, true, 1),
  (3, 'Dùng AI để upskill bản thân (học tài liệu, luyện tình huống, ôn tập) có kết quả cụ thể.'::text, false, false, 2),
  (3, 'Chia sẻ prompt, cách dùng AI giúp ít nhất 1 đồng nghiệp cải thiện công việc.'::text, false, true, 3),
  (4, 'Chuẩn hóa, lan tỏa cách dùng AI trong phòng/đơn vị: thư viện ví dụ, hướng dẫn hoặc buổi đào tạo.'::text, true, true, 1),
  (4, 'Tạo được thay đổi đo được về năng suất, chất lượng hoặc tốc độ nhờ AI ở phạm vi đơn vị.'::text, false, true, 2),
  (4, 'Hướng dẫn được người khác dùng AI hiệu quả và đúng nguyên tắc.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK07' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK08. Thấu hiểu KH/đối tác quan trọng ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Ghi nhận đầy đủ nhu cầu cơ bản, thói quen giao dịch, sở thích phục vụ và lưu ý cần tránh của KH/đối tác quan trọng mình phục vụ.'::text, true, true, 1),
  (1, 'Tuân thủ đúng chuẩn giao tiếp, bảo mật và phục vụ khi tiếp xúc khách hàng quan trọng.'::text, false, false, 2),
  (1, 'Cập nhật thông tin khách hàng sau mỗi lần tiếp xúc quan trọng.'::text, false, false, 3),
  (2, 'Điều chỉnh được cách tiếp cận, nhịp trao đổi và cách phục vụ theo phong cách, ưu tiên của từng KH/đối tác cụ thể.'::text, true, true, 1),
  (2, 'Nhận diện được phong cách giao tiếp, mức độ cởi mở và cách ra quyết định của khách hàng mình phụ trách.'::text, false, false, 2),
  (2, 'Nhận được phản hồi tích cực của KH/đối tác về cách phục vụ ít nhất 1 lần trong kỳ.'::text, false, false, 3),
  (3, 'Khơi gợi được nhu cầu ẩn hoặc kỳ vọng dài hạn và cá nhân hóa giải pháp cho ít nhất 1 khách hàng quan trọng.'::text, true, true, 1),
  (3, 'Xây dựng được quan hệ tin cậy: khách hàng chủ động liên hệ, chia sẻ thông tin sâu hơn giao dịch bề mặt.'::text, false, false, 2),
  (3, 'Vận dụng nguyên tắc BBB (Bạn - Bàn - Bán), không tiếp cận cơ học hoặc chỉ bán sản phẩm đơn lẻ.'::text, false, false, 3),
  (4, 'Xây dựng được chuẩn trải nghiệm và cách tiếp cận KH/đối tác quan trọng cho phòng/đơn vị.'::text, true, true, 1),
  (4, 'Hướng dẫn đội ngũ cách quan sát, ghi nhận, chăm sóc và xử lý tình huống nhạy cảm.'::text, false, true, 2),
  (4, 'Nâng chuẩn phục vụ của chi nhánh, được ghi nhận qua phản hồi khách hàng hoặc kết quả quan hệ.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK08' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK09. Thẩm định cho vay Dự án KHDN ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Thu thập đầy đủ hồ sơ pháp lý, tài chính, dự án và hoàn thiện tờ trình, bảng chạy đúng mẫu cho hồ sơ thực tế.'::text, true, true, 1),
  (1, 'Trình bày được bức tranh tổng quan về doanh nghiệp, dự án và ngành nghề đang thẩm định.'::text, false, false, 2),
  (1, 'Không thiếu hồ sơ trọng yếu khi trình cấp phê duyệt.'::text, false, false, 3),
  (2, 'Độc lập phân tích tài chính, phương án kinh doanh, dòng tiền và khả năng trả nợ cho hồ sơ dự án thực tế.'::text, true, true, 1),
  (2, 'Đọc hiểu logic bảng tính và các tham số quan trọng của ngành đang thẩm định.'::text, false, false, 2),
  (2, 'Nhận diện được các hồ sơ, điều kiện, thủ tục pháp lý cần kiểm tra khi triển khai dự án.'::text, false, false, 3),
  (3, 'Phát hiện được giả định chưa hợp lý, dòng tiền thiếu chắc chắn hoặc rủi ro tiềm ẩn trong ít nhất 1 hồ sơ.'::text, true, true, 1),
  (3, 'Đề xuất được cấu trúc cấp tín dụng, cơ chế giải ngân, điều kiện kiểm soát được cấp phê duyệt chấp nhận.'::text, false, true, 2),
  (3, 'Đánh giá sâu được pháp lý và vị thế doanh nghiệp trong ngành với nhóm ngành phức tạp (BĐS, dự án sản xuất...).'::text, false, false, 3),
  (4, 'Dẫn dắt thẩm định thành công ít nhất 1 hồ sơ dự án KHDN lớn hoặc phức tạp.'::text, true, true, 1),
  (4, 'Đào tạo được cán bộ về đặc thù thẩm định theo từng ngành nghề, lĩnh vực.'::text, false, true, 2),
  (4, 'Đề xuất biện pháp quản lý rủi ro/cách thẩm định hiệu quả được nhân rộng trong Chi nhánh.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK09' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK10. Thẩm định GHTD ngắn hạn KHDN ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Thu thập đầy đủ hồ sơ, BCTC, pháp lý và hoàn thiện tờ trình, bảng tính GHTD ngắn hạn đúng mẫu.'::text, true, true, 1),
  (1, 'Giải thích được doanh thu, giá vốn, tồn kho, phải thu, phải trả và nhu cầu vốn lưu động của khách hàng.'::text, false, false, 2),
  (1, 'Số liệu trên tờ trình khớp hồ sơ gốc, không sai sót số học.'::text, false, false, 3),
  (2, 'Độc lập phân tích chu kỳ vốn lưu động, các vòng quay và đề xuất GHTD phù hợp quy mô, dòng tiền, TSBĐ của khách hàng.'::text, true, true, 1),
  (2, 'Chỉ ra được dấu hiệu chưa hợp lý trong nhu cầu vốn hoặc phương án sử dụng vốn.'::text, false, false, 2),
  (2, 'Bảo vệ được mức GHTD đề xuất khi cấp phê duyệt chất vấn.'::text, false, false, 3),
  (3, 'Phân biệt được nhu cầu vốn thật và nhu cầu chưa hợp lý, thiếu căn cứ hoặc tiềm ẩn rủi ro trong hồ sơ thực tế.'::text, true, true, 1),
  (3, 'Nhận diện được dấu hiệu: tồn kho tăng bất thường, phải thu kéo dài, doanh thu cao nhưng dòng tiền yếu, phụ thuộc ít KH/NCC.'::text, false, false, 2),
  (3, 'Đề xuất cơ chế giải ngân, thu nợ, kiểm soát dòng tiền, chứng từ phù hợp được áp dụng.'::text, false, true, 3),
  (4, 'Đưa ra được cách thẩm định và cảnh báo rủi ro trọng yếu theo ngành/nhóm khách hàng, được áp dụng trong Chi nhánh.'::text, true, true, 1),
  (4, 'Đào tạo cán bộ về logic cấp GHTD ngắn hạn và cách rà soát nhu cầu vốn.'::text, false, true, 2),
  (4, 'Hỗ trợ xử lý hồ sơ GHTD khó của cán bộ khác đạt kết quả.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK10' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK11. Thẩm định khách hàng bán lẻ ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Tra cứu thông tin tín dụng, kiểm tra nhân thân, thu nhập, TSBĐ và lập tờ trình đầy đủ, đúng mẫu.'::text, true, true, 1),
  (1, 'Tính đúng các tỷ lệ an toàn cơ bản của khoản vay.'::text, false, false, 2),
  (1, 'Rà soát tính đầy đủ của hồ sơ trước khi trình.'::text, false, false, 3),
  (2, 'Đánh giá độc lập nhân thân, lịch sử tín dụng, nguồn thu, khả năng trả nợ và đề xuất biện pháp cấp tín dụng phù hợp.'::text, true, true, 1),
  (2, 'Sử dụng nhiều kênh để xác minh nhân thân và hoạt động sản xuất kinh doanh của khách hàng.'::text, false, false, 2),
  (2, 'Gắn được cấp tín dụng với giải ngân theo chứng từ, hóa đơn để kiểm soát rủi ro.'::text, false, false, 3),
  (3, 'Thẩm định được hồ sơ phức tạp: khách hàng nhiều nguồn thu, hộ kinh doanh, dòng tiền chưa thể hiện đủ trên hồ sơ.'::text, true, true, 1),
  (3, 'Đánh giá đúng chất lượng TSBĐ, độ ổn định nguồn trả nợ và rủi ro thực của khách hàng.'::text, false, false, 2),
  (3, 'Điều chỉnh cách giải ngân, quản lý sau giải ngân phù hợp ngành nghề, mô hình kinh doanh của khách hàng.'::text, false, false, 3),
  (4, 'Phân tích được bức tranh rủi ro danh mục bán lẻ theo ngành nghề/nhóm KH/TSBĐ/khu vực và tham mưu định hướng.'::text, true, true, 1),
  (4, 'Đào tạo được cán bộ về thẩm định cho vay bán lẻ trong Chi nhánh hoặc hệ thống.'::text, false, true, 2),
  (4, 'Đề xuất định hướng lựa chọn khách hàng được áp dụng thực tế.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK11' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK12. Đọc hiểu phê duyệt & triển khai sau phê duyệt ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Đối chiếu đúng các điều kiện phê duyệt với hồ sơ thực tế; liệt kê đủ việc phải làm trước và sau giải ngân.'::text, true, true, 1),
  (1, 'Áp dụng đúng lãi suất theo quy định trong quá trình triển khai cấp tín dụng.'::text, false, false, 2),
  (1, 'Đọc hiểu văn bản phê duyệt và xác định đúng nội dung mình phải thực hiện.'::text, false, false, 3),
  (2, 'Rà soát chính xác các điều kiện phê duyệt và phát hiện được sai khác giữa phê duyệt với hồ sơ thực tế.'::text, true, true, 1),
  (2, 'Nắm được đặc thù giải ngân của các khách hàng trong phạm vi mình phụ trách.'::text, false, false, 2),
  (2, 'Chia sẻ được trong nội bộ về cách đọc hiểu, rà soát điều kiện phê duyệt thông thường.'::text, false, false, 3),
  (3, 'Rà soát được văn bản phê duyệt của hồ sơ khó/dự án phức tạp và đưa ra nhận định, giải pháp rõ ràng.'::text, true, true, 1),
  (3, 'Tham mưu cấp trên các lưu ý xử lý trong quá trình cấp tín dụng, giúp giảm rủi ro và sai sót.'::text, false, true, 2),
  (3, 'Đánh giá dựa trên số liệu, tài liệu và tình hình thực tế, không suy đoán.'::text, false, false, 3),
  (4, 'Dẫn dắt triển khai sau phê duyệt ít nhất 1 hồ sơ tín dụng phức tạp.'::text, true, true, 1),
  (4, 'Chuẩn hóa cách đọc, rà soát và thực hiện điều kiện phê duyệt cho đội ngũ.'::text, false, true, 2),
  (4, 'Đào tạo cán bộ áp dụng hiệu quả, giảm sai sót triển khai thực tế.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK12' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK13. Pháp lý TSBĐ & Đăng ký GDBĐ ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Chuẩn bị đúng checklist hồ sơ công chứng, đăng ký giao dịch bảo đảm và lưu hồ sơ theo quy định cho hồ sơ thực tế.'::text, true, true, 1),
  (1, 'Tra cứu, đối chiếu được hồ sơ pháp lý cơ bản của tài sản bảo đảm.'::text, false, false, 2),
  (1, 'Không thiếu thành phần hồ sơ khi thực hiện công chứng, đăng ký.'::text, false, false, 3),
  (2, 'Rà soát độc lập hồ sơ TSBĐ và phát hiện được sai khác chủ thể, đồng sở hữu, hạn chế giao dịch hoặc thiếu điều kiện.'::text, true, true, 1),
  (2, 'Áp dụng đúng quy định bảo đảm tiền vay của NHCT và pháp luật về công chứng, đăng ký.'::text, false, false, 2),
  (2, 'Xử lý đúng trình tự khi hồ sơ thiếu điều kiện, không bỏ qua bước kiểm soát.'::text, false, false, 3),
  (3, 'Xử lý được tình huống pháp lý phức tạp: thay đổi chủ thể/tài sản, sửa đổi bổ sung GDBĐ, giải chấp, tài sản đặc thù.'::text, true, true, 1),
  (3, 'Đưa ra nhận định và giải pháp pháp lý phù hợp, được chấp nhận áp dụng.'::text, false, true, 2),
  (3, 'Tư vấn được cho cán bộ tín dụng về điều kiện nhận TSBĐ với các ca không chuẩn.'::text, false, false, 3),
  (4, 'Thiết kế được cấu trúc biện pháp bảo đảm cho hồ sơ lớn, nhiều tài sản, nhiều chủ thể hoặc yêu cầu kiểm soát cao.'::text, true, true, 1),
  (4, 'Chuẩn hóa cách rà soát pháp lý, công chứng, đăng ký GDBĐ cho đơn vị.'::text, false, true, 2),
  (4, 'Hướng dẫn đội ngũ xử lý ca pháp lý khó, giảm rủi ro hiệu lực biện pháp bảo đảm.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK13' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK14. Tư vấn TTTM, bảo lãnh & ngoại tệ ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Nhận diện đúng nhu cầu ban đầu (LC, bảo lãnh, ngoại tệ, chuyển tiền quốc tế) và chuẩn bị hồ sơ đầu vào đủ yêu cầu cơ bản.'::text, true, true, 1),
  (1, 'Trình bày được đặc điểm các sản phẩm cơ bản: thư tín dụng, bảo lãnh, giao dịch ngoại tệ, chuyển tiền quốc tế.'::text, false, false, 2),
  (1, 'Chuyển đúng đầu mối xử lý tập trung theo cơ chế của VietinBank.'::text, false, false, 3),
  (2, 'Tư vấn độc lập được các nhu cầu thông thường về LC, bảo lãnh, ngoại tệ; giảm được lỗi hồ sơ đầu vào.'::text, true, true, 1),
  (2, 'Trình bày được sản phẩm ngoại tệ tiên tiến (mua bán kỳ hạn, hoán đổi, CCS) và khi nào khách hàng cần.'::text, false, false, 2),
  (2, 'Phối hợp tốt với đầu mối xử lý tập trung để triển khai giao dịch phù hợp.'::text, false, false, 3),
  (3, 'Tư vấn được giải pháp kết hợp bảo lãnh - ngoại tệ - thanh toán quốc tế - dòng tiền cho khách hàng nhu cầu phức hợp.'::text, true, true, 1),
  (3, 'Triển khai được sản phẩm phức tạp: bảo lãnh vay vốn nước ngoài, tín dụng xuất khẩu ECA.'::text, false, true, 2),
  (3, 'Hiểu mục tiêu giao dịch và rủi ro của khách hàng để đưa phương án nhanh hơn, hiệu quả hơn.'::text, false, false, 3),
  (4, 'Là đầu mối tư vấn TTTM/bảo lãnh/ngoại tệ của đơn vị; xử lý được hồ sơ lớn, phức tạp, khách hàng yêu cầu cao.'::text, true, true, 1),
  (4, 'Đào tạo cán bộ để nâng chất lượng tư vấn và chất lượng hồ sơ đầu vào toàn Chi nhánh.'::text, false, true, 2),
  (4, 'Làm chủ các cấu trúc sản phẩm nâng cao phù hợp nhu cầu từng khách hàng.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK14' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK15. Total Wealth Solutions ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Tư vấn được nhu cầu cơ bản của khách hàng, không nhầm vai trò các công cụ: tiền gửi, trái phiếu, chứng khoán, BĐS, vàng, bạc.'::text, true, true, 1),
  (1, 'Nắm được danh mục sản phẩm, dịch vụ cơ bản của VietinBank dành cho khách hàng Priority/VIP.'::text, false, false, 2),
  (1, 'Nhận biết được các loại tài sản và công cụ đầu tư phổ biến mà khách hàng thường nắm giữ.'::text, false, false, 3),
  (2, 'Phân tích được bức tranh tài sản, dòng tiền cơ bản và tư vấn phương án phân bổ vốn cho khách hàng thực tế.'::text, true, true, 1),
  (2, 'Trình bày được thanh khoản, mức sinh lời kỳ vọng và rủi ro cơ bản của từng nhóm công cụ đầu tư.'::text, false, false, 2),
  (2, 'Kết hợp được sản phẩm VietinBank với nhu cầu đầu tư, bảo toàn tài sản, bảo hiểm và dòng tiền của khách hàng.'::text, false, false, 3),
  (3, 'Thiết kế được kế hoạch tài chính đa mục tiêu trên cấu trúc tài sản tổng thể cho ít nhất 1 khách hàng.'::text, true, true, 1),
  (3, 'Chỉ ra được điểm mất cân đối, rủi ro tập trung hoặc thiếu thanh khoản trong danh mục và đề xuất cơ cấu lại.'::text, false, true, 2),
  (3, 'Theo dõi và điều chỉnh phương án đã tư vấn theo tinh thần PDCA.'::text, false, false, 3),
  (4, 'Thiết kế được cấu trúc tài sản may đo tích hợp hệ sinh thái VietinBank cho khách hàng tài sản lớn/gia đình kinh doanh.'::text, true, true, 1),
  (4, 'Huấn luyện được RM khác về mô hình tư vấn cấu trúc tài sản toàn diện.'::text, false, true, 2),
  (4, 'Chuẩn hóa mô hình tư vấn, nâng chuẩn phục vụ khách hàng Priority/VIP của toàn đơn vị.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK15' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK16. Phát triển khách hàng FDI ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Tác nghiệp được các sản phẩm đáp ứng nhu cầu thường gặp của KH FDI: tài khoản, thanh toán, ngoại tệ, tín dụng, bảo lãnh.'::text, true, true, 1),
  (1, 'Trình bày được đặc điểm cơ bản của khách hàng FDI.'::text, false, false, 2),
  (1, 'Chuẩn bị được hồ sơ pháp lý cơ bản cho khách hàng FDI.'::text, false, false, 3),
  (2, 'Làm việc độc lập với KH FDI trong các nhu cầu phổ biến, đúng cách làm việc, yêu cầu hồ sơ và tiến độ của họ.'::text, true, true, 1),
  (2, 'Nắm được đặc tính khách hàng FDI theo quốc gia hoặc nhóm quốc gia mình phục vụ.'::text, false, false, 2),
  (2, 'Nhận diện được các đầu mối tiếp cận: kế toán doanh nghiệp, BQL khu công nghiệp, đơn vị tư vấn, hạ tầng KCN.'::text, false, false, 3),
  (3, 'Chủ động xây dựng, khai thác quan hệ để phát triển được ít nhất 1 KH FDI mới hoặc mở rộng đáng kể quan hệ hiện có.'::text, true, true, 1),
  (3, 'Triển khai được nhu cầu quản lý dòng tiền phức tạp hơn của khách hàng FDI.'::text, false, true, 2),
  (3, 'Hiểu mô hình hoạt động, dòng tiền, giao dịch xuyên biên giới và kỳ vọng quản trị của khách hàng.'::text, false, false, 3),
  (4, 'Phát triển hoặc phục vụ được KH FDI quy mô lớn/yêu cầu cao; chủ động mạng lưới tìm kiếm, tiếp cận, mở rộng.'::text, true, true, 1),
  (4, 'Tham mưu định hướng tiếp cận, cách phục vụ và phối hợp nguồn lực trong Chi nhánh.'::text, false, true, 2),
  (4, 'Đào tạo, chia sẻ kinh nghiệm nâng chất lượng phát triển khách hàng FDI toàn đơn vị.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK16' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK17. Nghiệp vụ giao dịch quầy & DVKH ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Thực hiện đúng các giao dịch cơ bản: kiểm tra chứng từ, nhận diện khách hàng, hạch toán đúng trên hệ thống.'::text, true, true, 1),
  (1, 'Tuân thủ chuẩn dịch vụ khách hàng tại quầy.'::text, false, false, 2),
  (1, 'Hỏi hoặc xác nhận kịp thời khi gặp giao dịch chưa rõ, không tự làm sai.'::text, false, false, 3),
  (2, 'Xử lý độc lập được các giao dịch phổ biến và tra soát cơ bản trong ca làm việc.'::text, true, true, 1),
  (2, 'Nhận diện đúng giao dịch cần escalate hoặc kiểm soát tăng cường.'::text, false, false, 2),
  (2, 'Duy trì chất lượng dịch vụ ổn định, không phát sinh khiếu nại do thao tác cá nhân.'::text, false, false, 3),
  (3, 'Xử lý được các giao dịch phức tạp và phối hợp xử lý lỗi, vướng mắc phát sinh đến khi hoàn tất.'::text, true, true, 1),
  (3, 'Hỗ trợ đồng nghiệp xử lý ca khó tại quầy.'::text, false, false, 2),
  (3, 'Duy trì chất lượng dịch vụ ổn định kể cả giờ cao điểm.'::text, false, false, 3),
  (4, 'Hướng dẫn được người mới về nghiệp vụ quầy, kèm cặp có kết quả cụ thể.'::text, true, true, 1),
  (4, 'Tham gia cải tiến quy trình giao dịch, có đề xuất được áp dụng.'::text, false, true, 2),
  (4, 'Là đầu mối nghiệp vụ quầy được đồng nghiệp tìm đến khi có vướng mắc.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK17' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK18. Kiểm soát giao dịch quầy & Điều phối vận hành ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Kiểm soát, phê duyệt giao dịch đúng phạm vi phân quyền; kiểm tra hồ sơ, chứng từ và tách bạch chức năng đúng quy định.'::text, true, true, 1),
  (1, 'Không phê duyệt giao dịch thiếu chứng từ hoặc vượt thẩm quyền.'::text, false, false, 2),
  (1, 'Ghi nhận, báo cáo đúng các trường hợp bất thường trong ca.'::text, false, false, 3),
  (2, 'Phát hiện được sai sót, rủi ro, giao dịch nghi ngờ và hướng dẫn giao dịch viên khắc phục kịp thời.'::text, true, true, 1),
  (2, 'Giữ được dòng vận hành quầy thông suốt khi có phát sinh.'::text, false, false, 2),
  (2, 'Tổng hợp lỗi thường gặp và nhắc nhở phòng ngừa cho giao dịch viên.'::text, false, false, 3),
  (3, 'Điều phối được luồng khách và xử lý được tình huống khó tại quầy, cân bằng yêu cầu dịch vụ với kiểm soát.'::text, true, true, 1),
  (3, 'Ra quyết định đúng trong tình huống xung đột giữa yêu cầu khách hàng và quy định.'::text, false, false, 2),
  (3, 'Phối hợp đa bộ phận xử lý sự cố vận hành đến khi kết thúc.'::text, false, false, 3),
  (4, 'Xây dựng được chuẩn kiểm soát giao dịch quầy cho đơn vị và được áp dụng.'::text, true, true, 1),
  (4, 'Huấn luyện được đội ngũ kiểm soát/giao dịch viên về chuẩn rủi ro và dịch vụ.'::text, false, true, 2),
  (4, 'Giảm được lỗi kiểm soát theo thời gian, bảo vệ uy tín vận hành tại điểm giao dịch.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK18' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK19. Quản trị kho quỹ & Điều phối tiền mặt ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Thực hiện đúng quy trình mở kho, đóng kho, kiểm soát tồn quỹ và các nguyên tắc an toàn ở vị trí mình tham gia.'::text, true, true, 1),
  (1, 'Ghi chép, lưu hồ sơ kho quỹ đầy đủ, đúng quy định.'::text, false, false, 2),
  (1, 'Báo cáo kịp thời khi phát hiện bất thường về tồn quỹ hoặc an ninh kho.'::text, false, false, 3),
  (2, 'Thực hiện hoặc phối hợp đúng các khâu điều chuyển, tiếp quỹ, thu hồi quỹ.'::text, true, true, 1),
  (2, 'Nhận diện được các điểm dễ phát sinh rủi ro về tồn quỹ và an ninh kho.'::text, false, false, 2),
  (2, 'Đề xuất khắc phục kịp thời khi phát hiện điểm rủi ro.'::text, false, false, 3),
  (3, 'Dự báo được nhu cầu tiền mặt, lập kế hoạch điều chuyển và tối ưu tồn quỹ có số liệu chứng minh.'::text, true, true, 1),
  (3, 'Kiểm soát được các điểm yếu trong vận hành kho quỹ.'::text, false, false, 2),
  (3, 'Giảm được tình trạng tồn quỹ vượt định mức hoặc thiếu quỹ cục bộ so với kỳ trước.'::text, false, false, 3),
  (4, 'Thiết lập được chuẩn an ninh kho quỹ và cơ chế điều phối tiền mặt an toàn, hiệu quả ở cấp đơn vị.'::text, true, true, 1),
  (4, 'Xử lý được tình huống đặc biệt về kho quỹ theo đúng phương án.'::text, false, true, 2),
  (4, 'Huấn luyện được đội ngũ về an toàn kho quỹ.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK19' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK20. Tác nghiệp kho quỹ, kiểm đếm & bảo quản ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Kiểm đếm, phân loại, đóng gói, nhập xuất quỹ đúng quy trình và đúng hồ sơ.'::text, true, true, 1),
  (1, 'Không sai lệch quỹ do thao tác cá nhân.'::text, false, false, 2),
  (1, 'Bảo quản tài sản, chứng từ đúng quy định.'::text, false, false, 3),
  (2, 'Thực hiện độc lập các nghiệp vụ kho quỹ thường xuyên, đúng số lượng, chất lượng và dấu vết chứng từ.'::text, true, true, 1),
  (2, 'Tự phát hiện và xử lý chênh lệch nhỏ đúng quy trình.'::text, false, false, 2),
  (2, 'Phối hợp nhịp nhàng với giao dịch viên, kiểm soát trong tiếp và nhận quỹ.'::text, false, false, 3),
  (3, 'Xử lý tốt tình huống phát sinh trong tác nghiệp (tiền nghi giả, chênh lệch, sự cố thiết bị...) đúng quy trình.'::text, true, true, 1),
  (3, 'Lập được các báo cáo kho quỹ liên quan đúng hạn, đúng số liệu.'::text, false, false, 2),
  (3, 'Phối hợp nhịp nhàng với các bộ phận liên quan.'::text, false, false, 3),
  (4, 'Chuẩn hóa được thao tác và hướng dẫn được người mới về tác nghiệp kho quỹ.'::text, true, true, 1),
  (4, 'Góp phần nâng độ an toàn, chính xác, kỷ luật tác nghiệp với kết quả cụ thể.'::text, false, true, 2),
  (4, 'Đề xuất cải tiến giảm lỗi hoặc tăng tốc độ tác nghiệp được áp dụng.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK20' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK21. Xử lý nợ xấu & pháp lý thu hồi nợ ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Chuẩn bị được hồ sơ đôn đốc nợ, bộ hồ sơ pháp lý cơ bản và tống đạt văn bản đúng quy định.'::text, true, true, 1),
  (1, 'Cập nhật đúng, đủ diễn biến làm việc với khách hàng vào hồ sơ.'::text, false, false, 2),
  (1, 'Nắm được tình trạng pháp lý của từng khoản nợ mình phụ trách.'::text, false, false, 3),
  (2, 'Làm việc độc lập được với khách hàng nợ quá hạn và hoàn thiện hồ sơ khởi kiện ở mức thông thường.'::text, true, true, 1),
  (2, 'Phân tích được nguyên nhân phát sinh nợ xấu của từng khoản nợ.'::text, false, false, 2),
  (2, 'Đề xuất được bước xử lý tiếp theo phù hợp cho từng hồ sơ.'::text, false, false, 3),
  (3, 'Lựa chọn được biện pháp xử lý phù hợp theo nhóm hồ sơ; làm việc được với tòa án, thi hành án và cơ quan liên quan.'::text, true, true, 1),
  (3, 'Vận dụng quan hệ công tác nâng hiệu quả thu hồi với kết quả cụ thể.'::text, false, true, 2),
  (3, 'Xử lý được các vướng mắc pháp lý phát sinh trong quá trình thu hồi.'::text, false, false, 3),
  (4, 'Dẫn dắt xử lý hồ sơ nợ xấu khó, phức tạp hoặc nhóm hồ sơ trọng điểm có kết quả.'::text, true, true, 1),
  (4, 'Tham mưu được biện pháp phòng ngừa nợ xấu theo danh mục.'::text, false, true, 2),
  (4, 'Hướng dẫn cán bộ về nghiệp vụ và cách xử lý nợ hiệu quả.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK21' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK22. Hoạch định tài chính & thanh toán chi phí ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Lập, hoàn thiện hồ sơ thanh toán các khoản chi thường xuyên; đối chiếu hóa đơn, chứng từ với tờ trình.'::text, true, true, 1),
  (1, 'Nộp hồ sơ thanh toán đúng hạn, đúng luồng phê duyệt.'::text, false, false, 2),
  (1, 'Phát hiện thiếu chứng từ trước khi trình.'::text, false, false, 3),
  (2, 'Rà soát độc lập hồ sơ thanh toán và phát hiện được sai sót về hóa đơn, định mức, thẩm quyền hoặc thời hạn.'::text, true, true, 1),
  (2, 'Giải thích được căn cứ định mức, thẩm quyền cho từng khoản chi.'::text, false, false, 2),
  (2, 'Theo dõi tiến độ xử lý, không để hồ sơ quá hạn.'::text, false, false, 3),
  (3, 'Tham gia hoặc chủ trì xây được kế hoạch chi phí hoạt động theo giai đoạn và đối chiếu kế hoạch với thực tế.'::text, true, true, 1),
  (3, 'Tham mưu kiểm soát chi phí có số liệu và đề xuất cụ thể.'::text, false, true, 2),
  (3, 'Cảnh báo sớm các khoản mục vượt hoặc sát định mức.'::text, false, false, 3),
  (4, 'Thiết lập được cách quản trị chi phí có kế hoạch, có so sánh, có cảnh báo cho đơn vị.'::text, true, true, 1),
  (4, 'Hồ sơ chi phí vượt qua kiểm tra, kiểm toán an toàn, không sai phạm trọng yếu.'::text, false, true, 2),
  (4, 'Hướng dẫn các phòng thực hiện đúng quy định chi tiêu.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK22' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK23. Quản lý hồ sơ mua sắm & XDCB ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Kiểm tra được cấu phần hồ sơ cơ bản của mua sắm tài sản, CCDC hoặc sửa chữa đơn giản; sắp xếp đúng trình tự.'::text, true, true, 1),
  (1, 'Lập danh mục hồ sơ và theo dõi được trạng thái từng bộ.'::text, false, false, 2),
  (1, 'Phát hiện thiếu thành phần hồ sơ trước khi trình.'::text, false, false, 3),
  (2, 'Rà soát độc lập hồ sơ mua sắm, CCDC, XDCB: thẩm quyền, hợp đồng, hóa đơn, nghiệm thu và phê duyệt liên quan.'::text, true, true, 1),
  (2, 'Đối chiếu được quy trình mua sắm với thực tế thực hiện.'::text, false, false, 2),
  (2, 'Theo dõi tiến độ và nhắc các mốc quan trọng của hồ sơ.'::text, false, false, 3),
  (3, 'Phân tích được điểm thiếu chặt chẽ trong dự toán, hợp đồng, nghiệm thu, quyết toán và tham mưu hướng xử lý.'::text, true, true, 1),
  (3, 'Hồ sơ mình rà soát đứng vững khi kiểm toán, thanh tra.'::text, false, true, 2),
  (3, 'Tư vấn được cho các phòng chuẩn bị hồ sơ đúng ngay từ đầu.'::text, false, false, 3),
  (4, 'Chuẩn hóa được luồng hồ sơ, đầu mục kiểm tra và cảnh báo rủi ro mua sắm, XDCB cho đơn vị.'::text, true, true, 1),
  (4, 'Kiểm soát được hoạt động mua sắm, đầu tư, thanh toán theo hướng minh bạch, hiệu quả.'::text, false, true, 2),
  (4, 'Đào tạo cán bộ liên quan về quy trình và các điểm rủi ro trọng yếu.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK23' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK24. Hậu kiểm & Kiểm soát sau tác nghiệp ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Rà soát hồ sơ, giao dịch theo danh mục kiểm tra; phát hiện lỗi rõ ràng và báo cáo đúng đầu mối.'::text, true, true, 1),
  (1, 'Ghi nhận kết quả kiểm tra đầy đủ, có dấu vết.'::text, false, false, 2),
  (1, 'Hoàn thành khối lượng hậu kiểm được giao đúng hạn.'::text, false, false, 3),
  (2, 'Xác định độc lập lỗi, thiếu sót, vi phạm quy trình và theo dõi việc khắc phục có lưu vết.'::text, true, true, 1),
  (2, 'Phân loại lỗi theo mức độ, tần suất để báo cáo.'::text, false, false, 2),
  (2, 'Trao đổi với bộ phận nghiệp vụ làm rõ trước khi kết luận lỗi.'::text, false, false, 3),
  (3, 'Phân tích nguyên nhân gốc rễ của lỗi lặp lại, chỉ ra điểm yếu quy trình và đề xuất giải pháp hệ thống.'::text, true, true, 1),
  (3, 'Giải pháp đề xuất được áp dụng và giảm lỗi thực tế.'::text, false, true, 2),
  (3, 'Nhận diện được lỗ hổng kiểm soát trước khi phát sinh sự cố.'::text, false, false, 3),
  (4, 'Thiết lập được cơ chế hậu kiểm và cảnh báo đang vận hành cho đơn vị.'::text, true, true, 1),
  (4, 'Giảm được lỗi tái diễn toàn đơn vị có số liệu chứng minh.'::text, false, true, 2),
  (4, 'Huấn luyện cán bộ hậu kiểm, nâng kỷ luật vận hành chung.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK24' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK25. Quản trị trải nghiệm KH & Xử lý khiếu nại ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Tiếp nhận đúng chuẩn, ghi nhận đủ thông tin và chuyển đúng đầu mối xử lý khiếu nại, phản ánh.'::text, true, true, 1),
  (1, 'Giữ thái độ chuẩn mực với khách hàng đang bức xúc.'::text, false, false, 2),
  (1, 'Theo dõi trạng thái phản ánh đã chuyển, không bỏ sót.'::text, false, false, 3),
  (2, 'Xử lý độc lập khiếu nại thông thường: giải thích rõ, trấn an khách hàng, theo dõi đến khi có kết quả phản hồi.'::text, true, true, 1),
  (2, 'Phản hồi khách hàng đúng thời hạn đã cam kết.'::text, false, false, 2),
  (2, 'Ghi nhận bài học từ từng ca để tránh lặp lại.'::text, false, false, 3),
  (3, 'Giải quyết được tình huống nhạy cảm, phức tạp; phối hợp đa đầu mối đến khi kết thúc.'::text, true, true, 1),
  (3, 'Rút ra bài học và đề xuất biện pháp ngăn tái diễn được áp dụng.'::text, false, true, 2),
  (3, 'Giữ được quan hệ khách hàng sau khiếu nại: khách hàng tiếp tục giao dịch.'::text, false, false, 3),
  (4, 'Xây dựng được chuẩn xử lý khiếu nại và cải thiện trải nghiệm khách hàng cho đơn vị.'::text, true, true, 1),
  (4, 'Biến phản ánh thành đầu vào cải tiến: ít nhất 1 cải tiến quy trình/dịch vụ được áp dụng.'::text, false, true, 2),
  (4, 'Huấn luyện đội ngũ về xử lý khiếu nại và trải nghiệm khách hàng.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK25' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK26. Tổ chức sự kiện & Thiết kế trải nghiệm CX-EX-DX ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Thực hiện đúng checklist hậu cần và các đầu việc cơ bản của chương trình, hội nghị được giao.'::text, true, true, 1),
  (1, 'Chuẩn bị vật dụng, tài liệu, không gian đúng yêu cầu, đúng hạn.'::text, false, false, 2),
  (1, 'Phối hợp đúng vai trong ngày diễn ra sự kiện.'::text, false, false, 3),
  (2, 'Lập được kế hoạch, timeline, run sheet chi tiết và điều phối các đầu mối liên quan cho 1 chương trình.'::text, true, true, 1),
  (2, 'Dùng được công cụ số cho mời họp, xác nhận và điều hành chương trình.'::text, false, false, 2),
  (2, 'Xử lý được phát sinh nhỏ trong sự kiện, không ảnh hưởng tổng thể.'::text, false, false, 3),
  (3, 'Thiết kế và vận hành trọn gói được chương trình quy mô chi nhánh hoặc khách hàng trọng điểm.'::text, true, true, 1),
  (3, 'Tối ưu trải nghiệm khách mời và cán bộ, có phản hồi tích cực.'::text, false, true, 2),
  (3, 'Xử lý tốt tình huống phát sinh, có phương án dự phòng.'::text, false, false, 3),
  (4, 'Xây dựng được chuẩn tổ chức sự kiện CX-EX-DX cho đơn vị: mẫu kế hoạch, run sheet, dự phòng, phối hợp liên phòng.'::text, true, true, 1),
  (4, 'Huấn luyện được đội ngũ tổ chức sự kiện theo chuẩn.'::text, false, true, 2),
  (4, 'Nâng chất lượng sự kiện của đơn vị được ghi nhận qua các kỳ.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK26' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK27. Xử lý từ chối & Bán hàng ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Trình bày được kịch bản tư vấn cơ bản và trả lời được phản đối phổ biến về giá, lãi suất, phí, điều kiện sản phẩm.'::text, true, true, 1),
  (1, 'Nắm được đặc điểm, lợi ích chính của các sản phẩm mình bán.'::text, false, false, 2),
  (1, 'Ghi nhận lý do từ chối của khách hàng để cải thiện lần sau.'::text, false, false, 3),
  (2, 'Xử lý được các lời từ chối thường gặp và chốt được giao dịch hoặc chuyển hướng phù hợp.'::text, true, true, 1),
  (2, 'Khai thác thêm được nhu cầu của khách hàng trong quá trình tư vấn.'::text, false, false, 2),
  (2, 'Duy trì tỷ lệ chuyển đổi ổn định với nhóm khách hàng được giao.'::text, false, false, 3),
  (3, 'Chuyển hóa được phản đối thành cơ hội bán chéo hoặc làm sâu quan hệ với khách hàng có nhu cầu phức tạp.'::text, true, true, 1),
  (3, 'Kết quả bán hàng, bán chéo cải thiện rõ so với kỳ trước.'::text, false, true, 2),
  (3, 'Thiết kế được cách tiếp cận riêng cho từng nhóm khách hàng khó.'::text, false, false, 3),
  (4, 'Thiết kế được kịch bản xử lý từ chối nâng cao và huấn luyện đội ngũ.'::text, true, true, 1),
  (4, 'Cải thiện được tỷ lệ chuyển đổi của đơn vị có số liệu.'::text, false, true, 2),
  (4, 'Là người được đội ngũ tham vấn các ca bán hàng khó.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK27' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK28. Tiếng Anh trong công việc ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Đọc hiểu email, biểu mẫu, tài liệu đơn giản liên quan công việc; giao tiếp cơ bản trong tình huống thông thường.'::text, true, true, 1),
  (1, 'Viết được email ngắn, đơn giản, đúng ý.'::text, false, false, 2),
  (1, 'Dùng đúng cách công cụ hỗ trợ dịch khi cần.'::text, false, false, 3),
  (2, 'Trao đổi được bằng tiếng Anh trong tình huống phổ biến: email, điện thoại, tiếp khách, hướng dẫn quy trình, làm rõ hồ sơ.'::text, true, true, 1),
  (2, 'Trả lời được câu hỏi thông thường của khách hàng nước ngoài mà không cần hỗ trợ.'::text, false, false, 2),
  (2, 'Soạn được email nghiệp vụ chuẩn mực, ít lỗi.'::text, false, false, 3),
  (3, 'Xử lý được công việc thực tế với khách hàng, đối tác hoặc hồ sơ phức tạp hơn bằng tiếng Anh.'::text, true, true, 1),
  (3, 'Diễn đạt phù hợp bối cảnh, dùng được thuật ngữ ngân hàng hoặc ngành nghề của khách hàng khi cần.'::text, false, false, 2),
  (3, 'Hỗ trợ đồng nghiệp xử lý nội dung tiếng Anh khi cần.'::text, false, false, 3),
  (4, 'Sử dụng tiếng Anh trong đàm phán, bảo vệ phương án, trao đổi sâu với khách hàng, đối tác yêu cầu cao.'::text, true, true, 1),
  (4, 'Hướng dẫn được người khác nâng năng lực tiếng Anh trong công việc.'::text, false, true, 2),
  (4, 'Đại diện đơn vị làm việc trực tiếp bằng tiếng Anh khi cần.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK28' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK29. Tiếng Trung trong công việc ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Đọc hiểu email, biểu mẫu, tài liệu đơn giản liên quan công việc; giao tiếp cơ bản trong tình huống thông thường.'::text, true, true, 1),
  (1, 'Viết được nội dung trao đổi ngắn, đơn giản, đúng ý.'::text, false, false, 2),
  (1, 'Dùng đúng cách công cụ hỗ trợ dịch khi cần.'::text, false, false, 3),
  (2, 'Trao đổi được bằng tiếng Trung trong tình huống phổ biến: email, điện thoại, tiếp khách, hướng dẫn quy trình, làm rõ hồ sơ.'::text, true, true, 1),
  (2, 'Trả lời được câu hỏi thông thường của khách hàng mà không cần hỗ trợ.'::text, false, false, 2),
  (2, 'Soạn được nội dung trao đổi nghiệp vụ chuẩn mực, ít lỗi.'::text, false, false, 3),
  (3, 'Xử lý được công việc thực tế với khách hàng, đối tác hoặc hồ sơ phức tạp hơn bằng tiếng Trung.'::text, true, true, 1),
  (3, 'Diễn đạt phù hợp bối cảnh, dùng được thuật ngữ ngân hàng hoặc ngành nghề của khách hàng khi cần.'::text, false, false, 2),
  (3, 'Hỗ trợ đồng nghiệp xử lý nội dung tiếng Trung khi cần.'::text, false, false, 3),
  (4, 'Sử dụng tiếng Trung trong đàm phán, bảo vệ phương án, trao đổi sâu với khách hàng, đối tác yêu cầu cao.'::text, true, true, 1),
  (4, 'Hướng dẫn được người khác nâng năng lực tiếng Trung trong công việc.'::text, false, true, 2),
  (4, 'Đại diện đơn vị làm việc trực tiếp bằng tiếng Trung khi cần.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK29' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK30. Thuyết trình & Bảo vệ phương án ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Trình bày được nội dung công việc, báo cáo theo dàn ý rõ ràng, đúng trọng tâm, đúng thời lượng.'::text, true, true, 1),
  (1, 'Chuẩn bị tài liệu trước khi trình bày, không đọc nguyên văn slide.'::text, false, false, 2),
  (1, 'Trả lời được các câu hỏi làm rõ đơn giản.'::text, false, false, 3),
  (2, 'Bảo vệ được phương án ở cấp cá nhân hoặc đầu việc phụ trách; trả lời được các phản biện phổ biến.'::text, true, true, 1),
  (2, 'Điều chỉnh được cách diễn đạt phù hợp với người nghe.'::text, false, false, 2),
  (2, 'Giữ bình tĩnh và mạch trình bày khi bị ngắt lời hoặc chất vấn.'::text, false, false, 3),
  (3, 'Thuyết trình được phương án phức tạp, xử lý tốt phản biện bằng dữ liệu, luận điểm và tài liệu hỗ trợ.'::text, true, true, 1),
  (3, 'Thuyết phục được người nghe thay đổi quan điểm hoặc ra quyết định ít nhất 1 lần.'::text, false, true, 2),
  (3, 'Cấu trúc bài trình bày theo người ra quyết định, không theo trình tự mình làm việc.'::text, false, false, 3),
  (4, 'Đại diện đơn vị bảo vệ phương án ở diễn đàn quan trọng và tạo được đồng thuận cho quyết định cần thông qua.'::text, true, true, 1),
  (4, 'Huấn luyện được cán bộ về kỹ năng thuyết trình, bảo vệ phương án.'::text, false, true, 2),
  (4, 'Định hướng được không khí trao đổi trong các cuộc họp quan trọng.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK30' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK31. Nghi thức đối ngoại & KH giá trị cao ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Tuân thủ đúng chuẩn trang phục, nghi thức giao tiếp, quy tắc ứng xử, tác phong khi tiếp xúc trang trọng.'::text, true, true, 1),
  (1, 'Chuẩn bị được lịch làm việc, tiếp đón theo đúng chuẩn.'::text, false, false, 2),
  (1, 'Bảo mật thông tin khách hàng, đối tác theo quy định.'::text, false, false, 3),
  (2, 'Duy trì được hội thoại phù hợp với khách hàng giá trị cao: chọn chủ đề, dẫn dắt và phong cách phù hợp từng đối tượng.'::text, true, true, 1),
  (2, 'Vận dụng hiểu biết về kinh doanh, phong cách sống, sở thích của khách hàng để gắn kết tự nhiên.'::text, false, false, 2),
  (2, 'Mở rộng được quan hệ từ các cuộc tiếp xúc.'::text, false, false, 3),
  (3, 'Tổ chức hoặc phối hợp tổ chức được hoạt động kết nối khách hàng: gặp riêng, sự kiện nhỏ, chương trình theo chủ đề.'::text, true, true, 1),
  (3, 'Kết nối được các khách hàng với nhau theo hướng hỗ trợ giao thương, gia tăng hệ sinh thái của chi nhánh.'::text, false, true, 2),
  (3, 'Tạo không khí, phá băng tốt trong các buổi gặp gỡ.'::text, false, false, 3),
  (4, 'Định hình được chuẩn mực đối ngoại và kết nối khách hàng giá trị cao cho đơn vị.'::text, true, true, 1),
  (4, 'Đóng gói được nghệ thuật đối ngoại thành bài học thực chiến cho cán bộ nguồn.'::text, false, true, 2),
  (4, 'Xử lý tốt các tình huống nhạy cảm trong giao tiếp, tiếp đón, phối hợp công tác.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK31' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK32. Quan hệ đối ngoại CQNN & lãnh đạo địa phương ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Chuẩn bị được hồ sơ, tài liệu và tham gia đúng vai khi làm việc với cơ quan quản lý hoặc đầu mối địa phương.'::text, true, true, 1),
  (1, 'Nắm được các đầu mối liên hệ chính liên quan công việc của mình.'::text, false, false, 2),
  (1, 'Ứng xử đúng chuẩn mực công tác trong các buổi làm việc.'::text, false, false, 3),
  (2, 'Phối hợp độc lập được với các đầu mối chuyên môn trong nội dung thường xuyên; trao đổi đúng trọng tâm.'::text, true, true, 1),
  (2, 'Soạn được văn bản, công văn trao đổi đúng thể thức, đúng nội dung.'::text, false, false, 2),
  (2, 'Theo dõi và hoàn tất các đầu việc đã thống nhất với các cơ quan.'::text, false, false, 3),
  (3, 'Duy trì được quan hệ công tác ổn định và kết nối được cuộc làm việc, giải trình tháo gỡ vướng mắc cụ thể.'::text, true, true, 1),
  (3, 'Chuẩn bị phương án làm việc, giải trình đạt kết quả mong muốn.'::text, false, true, 2),
  (3, 'Xử lý khéo các đề nghị nhạy cảm, giữ đúng nguyên tắc.'::text, false, false, 3),
  (4, 'Xây dựng được cách tiếp cận đối ngoại bài bản, duy trì quan hệ hiệu quả với các đầu mối quan trọng.'::text, true, true, 1),
  (4, 'Tạo điều kiện thuận lợi đo được cho hoạt động và chiến lược phát triển của chi nhánh.'::text, false, true, 2),
  (4, 'Hướng dẫn cán bộ về chuẩn mực và cách làm việc với cơ quan quản lý.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK32' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK33. Phân tích danh mục & Quản trị RRTD ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Theo dõi được dư nợ, nợ quá hạn, nhóm nợ, tiến độ hoàn thiện điều kiện tín dụng; báo cáo được dấu hiệu bất thường rõ ràng.'::text, true, true, 1),
  (1, 'Đọc đúng các báo cáo tín dụng định kỳ liên quan.'::text, false, false, 2),
  (1, 'Cập nhật số liệu danh mục đúng hạn, đúng thực tế.'::text, false, false, 3),
  (2, 'Phát hiện được tín hiệu cảnh báo sớm: quá hạn dưới 10 ngày tăng, nợ nhóm 2 tăng, chậm trả, dòng tiền yếu, dư nợ tập trung.'::text, true, true, 1),
  (2, 'So sánh được giữa tăng trưởng và chất lượng tín dụng.'::text, false, false, 2),
  (2, 'Đề xuất được biện pháp kiểm soát phù hợp với tín hiệu đã phát hiện.'::text, false, true, 3),
  (3, 'Phân tích danh mục theo ngành, phân khúc, khách hàng, địa bàn hoặc cán bộ và xác định được nguyên nhân gốc rễ.'::text, true, true, 1),
  (3, 'Tham mưu giải pháp quản trị danh mục được áp dụng.'::text, false, true, 2),
  (3, 'Dự báo được xu hướng chất lượng danh mục kỳ tới có căn cứ.'::text, false, false, 3),
  (4, 'Thiết lập được cơ chế theo dõi, cảnh báo sớm và báo cáo quản trị giúp nhìn thấy xu hướng rủi ro trước khi bộc lộ.'::text, true, true, 1),
  (4, 'Cảnh báo sớm ít nhất 1 trường hợp giúp đơn vị xử lý kịp thời.'::text, false, true, 2),
  (4, 'Đào tạo cán bộ về phân tích danh mục và nhận diện rủi ro tín dụng.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK33' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK34. Quản trị rủi ro hoạt động ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Nhận diện được lỗi, rủi ro hoạt động cơ bản tại vị trí công tác và thực hiện đúng checklist, đúng quy trình.'::text, true, true, 1),
  (1, 'Báo cáo kịp thời khi phát hiện sai sót hoặc tình huống gần sai sót.'::text, false, false, 2),
  (1, 'Không lặp lại lỗi đã được nhắc nhở.'::text, false, false, 3),
  (2, 'Theo dõi được lỗi lặp lại, tình huống gần sai sót và đề xuất biện pháp kiểm soát: kiểm tra chéo, chuẩn hóa, siết kỷ luật.'::text, true, true, 1),
  (2, 'Tổng hợp được danh mục lỗi thường gặp trong phạm vi phụ trách.'::text, false, false, 2),
  (2, 'Có ít nhất 1 biện pháp đề xuất được áp dụng.'::text, false, true, 3),
  (3, 'Phân tích được nguyên nhân gốc rễ rủi ro hoạt động ở cấp tổ/phòng/quy trình và xây dựng được KRI cơ bản.'::text, true, true, 1),
  (3, 'Theo dõi KRI và cảnh báo sớm khi vượt ngưỡng.'::text, false, false, 2),
  (3, 'Đề xuất cải tiến quy trình giảm rủi ro được áp dụng.'::text, false, true, 3),
  (4, 'Thiết lập được bộ KRI và cơ chế theo dõi, cảnh báo sớm, rút kinh nghiệm sau sự cố cho đơn vị.'::text, true, true, 1),
  (4, 'Giảm rủi ro tái diễn có số liệu chứng minh.'::text, false, true, 2),
  (4, 'Huấn luyện đội ngũ về nhận diện và phòng ngừa rủi ro hoạt động.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK34' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK35. Tổng hợp, phân tích & Tham mưu điều hành ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Tổng hợp được thông tin, số liệu, đầu việc trọng tâm theo yêu cầu; lập báo cáo đúng mẫu, đúng thời hạn.'::text, true, true, 1),
  (1, 'Số liệu, thông tin trong báo cáo chính xác, có nguồn.'::text, false, false, 2),
  (1, 'Trình bày báo cáo rõ ràng, dễ theo dõi.'::text, false, false, 3),
  (2, 'Chỉ ra được điểm nóng, nguyên nhân chính và đề xuất được hướng xử lý hoặc đầu việc cần quyết định.'::text, true, true, 1),
  (2, 'Phân tích thông tin ở mức cơ bản, có so sánh, có bối cảnh.'::text, false, false, 2),
  (2, 'Chủ động cập nhật thông tin mới ảnh hưởng đến nội dung tham mưu.'::text, false, false, 3),
  (3, 'Xây dựng được báo cáo quản trị có chiều sâu: kết nối số liệu, hiện trạng và phương án xử lý.'::text, true, true, 1),
  (3, 'Tham mưu được nội dung điều hành thường xuyên hoặc phát sinh, được lãnh đạo sử dụng.'::text, false, true, 2),
  (3, 'Phản biện, kiểm chứng thông tin trước khi đưa vào báo cáo.'::text, false, false, 3),
  (4, 'Là đầu mối tham mưu tin cậy: chuẩn bị được tài liệu ra quyết định chất lượng cao cho lãnh đạo.'::text, true, true, 1),
  (4, 'Nhìn được bức tranh tổng thể đơn vị, kết nối các mảng trong nội dung tham mưu.'::text, false, false, 2),
  (4, 'Hướng dẫn cán bộ khác nâng chất lượng báo cáo, tham mưu.'::text, false, true, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK35' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK36. Tổ chức cán bộ & Quản trị nhân sự ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Thực hiện đúng các đầu việc hành chính - nhân sự được phân công; chuẩn bị hồ sơ, biểu mẫu cơ bản đúng chuẩn.'::text, true, true, 1),
  (1, 'Quản lý hồ sơ nhân sự ngăn nắp, tra cứu được nhanh.'::text, false, false, 2),
  (1, 'Bảo mật thông tin nhân sự theo quy định.'::text, false, false, 3),
  (2, 'Xử lý độc lập các thủ tục nhân sự thường xuyên: hồ sơ, dữ liệu, tờ trình, văn bản trong phạm vi được giao.'::text, true, true, 1),
  (2, 'Theo dõi dữ liệu nhân sự chính xác, cập nhật kịp thời.'::text, false, false, 2),
  (2, 'Trả lời được cán bộ về chế độ, thủ tục thông thường.'::text, false, false, 3),
  (3, 'Áp dụng được quy định sâu về điều động, luân chuyển, bổ nhiệm, chế độ chính sách và tham mưu hướng xử lý.'::text, true, true, 1),
  (3, 'Chuẩn bị phương án nhân sự có phân tích, có căn cứ quy định.'::text, false, true, 2),
  (3, 'Xử lý được tình huống nhân sự nhạy cảm đúng quy trình.'::text, false, false, 3),
  (4, 'Dẫn dắt hoặc tham mưu hiệu quả công tác tổ chức cán bộ và quản trị nhân sự cho đơn vị.'::text, true, true, 1),
  (4, 'Gắn được quy định với nhu cầu vận hành, phát triển đội ngũ trong các đề xuất nhân sự.'::text, false, true, 2),
  (4, 'Hướng dẫn cán bộ làm công tác nhân sự tại các phòng.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK36' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK37. Tra cứu, đọc hiểu & áp dụng văn bản ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Tìm được văn bản trên HQedoc, Intranet, email, MyGenie; bóc tách được điểm chính, thời hạn, đầu việc cần thực hiện.'::text, true, true, 1),
  (1, 'Lưu và tra cứu lại được văn bản khi cần.'::text, false, false, 2),
  (1, 'Trình bày lại được nội dung văn bản bằng ngôn ngữ của mình.'::text, false, false, 3),
  (2, 'Bóc tách được phạm vi, đối tượng áp dụng, trách nhiệm thực hiện, hồ sơ biểu mẫu, thời hạn, điểm mới và rủi ro của văn bản.'::text, true, true, 1),
  (2, 'Đối chiếu văn bản từ các nguồn chính thức trước khi áp dụng.'::text, false, false, 2),
  (2, 'Phát hiện được điểm mới so với quy định cũ khi có thay đổi.'::text, false, false, 3),
  (3, 'Tóm tắt được văn bản dạng "điểm chính - việc phải làm - ai thực hiện - mốc thời gian - rủi ro" và chỉ ra điểm dễ hiểu sai.'::text, true, true, 1),
  (3, 'Giải đáp được vướng mắc áp dụng văn bản cho đồng nghiệp.'::text, false, false, 2),
  (3, 'Nhận diện được vướng mắc triển khai thực tế trước khi phát sinh.'::text, false, false, 3),
  (4, 'Xác định đúng trách nhiệm thực hiện, phối hợp hoặc chỉ đạo triển khai văn bản đúng việc, đúng phòng.'::text, true, true, 1),
  (4, 'Tổng hợp được bất cập và đề xuất sửa đổi, bổ sung phù hợp thực tiễn nhưng vẫn bảo đảm kiểm soát.'::text, false, true, 2),
  (4, 'Xây dựng được thói quen đọc và làm việc dựa trên văn bản trong đội ngũ.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK37' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

-- ============ SK38. Quan hệ công tác & phối hợp với TSC ============
INSERT INTO public.skill_level_criteria (skill_id, level_no, statement, is_gate, requires_evidence, sort_order)
SELECT s.id, v.level_no, v.statement, v.is_gate, v.requires_evidence, v.sort_order
FROM public.skill_catalog s
CROSS JOIN (VALUES
  (1, 'Tra cứu đúng đầu mối TSC bằng Gapowork và kênh chính thức; gửi đúng đầu mối, đúng biểu mẫu, đúng luồng với việc thông thường.'::text, true, true, 1),
  (1, 'Xác định được công việc của mình thường liên quan đến Ban/Trung tâm nào.'::text, false, false, 2),
  (1, 'Không làm việc lệch vai, không vượt cấp tùy tiện; báo cáo quản lý trực tiếp khi cần phối hợp với TSC.'::text, false, false, 3),
  (2, 'Chủ động liên hệ đúng người, đúng việc, đúng cấp; trình bày vấn đề ngắn gọn, đủ dữ liệu, đủ căn cứ để TSC dễ xử lý.'::text, true, true, 1),
  (2, 'Theo đuổi đến cùng các đầu việc liên quan giữa chi nhánh và TSC.'::text, false, false, 2),
  (2, 'Nhận diện bước đầu phong cách làm việc của từng đầu mối để điều chỉnh cách trao đổi phù hợp.'::text, false, false, 3),
  (3, 'Phối hợp hiệu quả với nhiều đầu mối TSC trong nội dung phức tạp; phản ánh, đề xuất có căn cứ và góc nhìn hệ thống.'::text, true, true, 1),
  (3, 'Vận dụng nguyên tắc phân cấp quan hệ theo vai trò, tránh dồn toàn bộ việc vào một người.'::text, false, false, 2),
  (3, 'Chọn đúng cách báo cáo, escalate và theo đuổi công việc với từng đầu mối quan trọng, đúng mực, đúng vai.'::text, false, false, 3),
  (4, 'Xây dựng được mạng lưới quan hệ tin cậy với các đầu mối quan trọng và cơ chế để nhiều cấp cùng làm việc với TSC.'::text, true, true, 1),
  (4, 'Huấn luyện được đội ngũ cách tra cứu đầu mối, kết nối đúng kênh, đúng vai với TSC.'::text, false, true, 2),
  (4, 'Tổng hợp được phản ánh, bất cập, đề xuất để cùng TSC hoàn thiện quy trình, chính sách, cách phối hợp.'::text, false, false, 3)
) AS v(level_no, statement, is_gate, requires_evidence, sort_order)
WHERE s.code = 'SK38' AND s.is_active
  AND NOT EXISTS (SELECT 1 FROM public.skill_level_criteria c WHERE c.skill_id = s.id AND c.is_active);

