import type { CouncilSection } from '@/lib/council';

// Bộ câu hỏi định hướng mặc định — 10 tiêu chí theo Mẫu phiếu đánh giá Hội đồng.
// Dùng để khởi tạo bộ tiêu chí cho kỳ mới tại trang Quản trị Hội đồng.
export interface DefaultCouncilCriterion {
  key: string;
  section: CouncilSection;
  title: string;
  description: string;
  anchor_10: string;
  anchor_8: string;
  anchor_6: string;
  anchor_3: string;
  anchor_0: string;
}

export const DEFAULT_COUNCIL_CRITERIA: DefaultCouncilCriterion[] = [
  {
    key: 'tc1', section: 'nang_luc', title: 'Chủ động đề xuất và dẫn dắt triển khai',
    description: 'Chủ động đưa ra giải pháp mới, dẫn dắt các phòng ban, đơn vị triển khai thực hiện nhiệm vụ đầu mối.',
    anchor_10: 'Chủ động nhận diện vấn đề/cơ hội trước yêu cầu; đề xuất giải pháp có căn cứ dữ liệu; xây dựng lộ trình rõ ràng; tạo đồng thuận cao và dẫn dắt triển khai hiệu quả.',
    anchor_8: 'Chủ động đề xuất sáng kiến khi phát sinh yêu cầu; giải pháp phù hợp; triển khai đúng kế hoạch; được các bên liên quan ủng hộ.',
    anchor_6: 'Có đề xuất cải tiến nhưng chưa thường xuyên; chủ yếu triển khai theo chỉ đạo; mức độ dẫn dắt còn hạn chế.',
    anchor_3: 'Ít đề xuất; thường chờ hướng dẫn; triển khai bị động và phụ thuộc nhiều vào cấp trên.',
    anchor_0: 'Không đề xuất giải pháp; không tạo được thay đổi hoặc không tham gia dẫn dắt.',
  },
  {
    key: 'tc2', section: 'nang_luc', title: 'Khả năng điều hành và tổ chức thực hiện',
    description: 'Tổ chức công việc một cách khoa học; phân công và giao việc rõ ràng, theo dõi và đôn đốc sát sao quá trình thực hiện.',
    anchor_10: 'Lập kế hoạch chi tiết, phân công rõ trách nhiệm, kiểm soát tiến độ thường xuyên, xử lý vướng mắc kịp thời, hoàn thành vượt tiến độ.',
    anchor_8: 'Điều hành hiệu quả; phân công tương đối rõ; kiểm soát tiến độ tốt; hoàn thành đúng hạn.',
    anchor_6: 'Tổ chức triển khai đáp ứng yêu cầu cơ bản nhưng theo dõi chưa thường xuyên; cần nhắc việc.',
    anchor_3: 'Điều hành thiếu kiểm soát; phân công chưa rõ; tiến độ chậm hoặc phải điều chỉnh nhiều lần.',
    anchor_0: 'Không tổ chức được hoạt động; tiến độ kéo dài hoặc không hoàn thành.',
  },
  {
    key: 'tc3', section: 'nang_luc', title: 'Điều phối và phối hợp liên phòng',
    description: 'Khả năng kết nối, điều phối và thúc đẩy sự hợp tác tích cực giữa các phòng ban liên quan trong chi nhánh.',
    anchor_10: 'Thiết lập cơ chế phối hợp hiệu quả; duy trì trao đổi thường xuyên; xử lý xung đột nhanh; các đơn vị phối hợp tích cực.',
    anchor_8: 'Phối hợp tốt với đa số đơn vị; giải quyết được hầu hết vướng mắc phát sinh.',
    anchor_6: 'Có phối hợp nhưng chưa đồng đều; còn phụ thuộc vào hỗ trợ của lãnh đạo.',
    anchor_3: 'Phối hợp hạn chế; phản hồi chậm; còn phát sinh bất đồng kéo dài.',
    anchor_0: 'Không tạo được sự phối hợp; công việc bị đình trệ do thiếu kết nối.',
  },
  {
    key: 'tc4', section: 'nang_luc', title: 'Khả năng giải quyết vấn đề',
    description: 'Nhận diện vấn đề nhanh nhạy, đưa ra giải pháp xử lý triệt để các vướng mắc phát sinh trong thẩm quyền.',
    anchor_10: 'Nhanh chóng xác định nguyên nhân gốc; đưa ra phương án khả thi; xử lý triệt để; hạn chế tái diễn rủi ro.',
    anchor_8: 'Giải quyết tốt phần lớn vấn đề; lựa chọn giải pháp phù hợp; ít phát sinh hệ quả.',
    anchor_6: 'Giải quyết được các vấn đề thông thường nhưng còn chậm với tình huống phức tạp.',
    anchor_3: 'Xử lý bị động; giải pháp thiếu hiệu quả; vấn đề tái diễn nhiều lần.',
    anchor_0: 'Không xác định được nguyên nhân hoặc không xử lý được vấn đề.',
  },
  {
    key: 'tc5', section: 'nang_luc', title: 'Tạo động lực và phát triển đội ngũ',
    description: 'Truyền cảm hứng, tạo tinh thần đồng lòng tích cực; phát hiện và phát triển năng lực của đội ngũ kế cận.',
    anchor_10: 'Truyền cảm hứng, khuyến khích tham gia; xây dựng đội ngũ kế cận; tạo môi trường tích cực và chủ động học hỏi.',
    anchor_8: 'Tạo được sự đồng thuận; khuyến khích phối hợp; duy trì tinh thần làm việc tích cực.',
    anchor_6: 'Có tác động tích cực nhưng chưa rõ nét; mức độ tham gia của đội ngũ chưa cao.',
    anchor_3: 'Khả năng tạo động lực hạn chế; nhân sự tham gia mang tính đối phó.',
    anchor_0: 'Không tạo được sự gắn kết hoặc ảnh hưởng tích cực.',
  },
  {
    key: 'tc6', section: 'hieu_qua', title: 'Nhận diện vấn đề và cơ hội cải thiện',
    description: 'Khả năng phân tích thực trạng, sử dụng dữ liệu, xác định đúng nguyên nhân gốc và trọng tâm cần cải thiện.',
    anchor_10: 'Phân tích đầy đủ bằng số liệu; xác định đúng nguyên nhân gốc; chỉ rõ cơ hội cải thiện và ưu tiên hành động.',
    anchor_8: 'Phân tích tương đối đầy đủ; xác định được phần lớn nguyên nhân và cơ hội cải thiện.',
    anchor_6: 'Có phân tích nhưng còn thiên về hiện tượng; chưa làm rõ nguyên nhân cốt lõi.',
    anchor_3: 'Đánh giá sơ sài; thiếu dữ liệu; chưa xác định đúng trọng tâm.',
    anchor_0: 'Không phân tích hoặc nhận diện sai vấn đề.',
  },
  {
    key: 'tc7', section: 'hieu_qua', title: 'Xây dựng giải pháp và kế hoạch triển khai',
    description: 'Xây dựng giải pháp/kế hoạch hành động triển khai rõ ràng, khả thi, mục tiêu cụ thể và xác định được các chủ thể 5W2H.',
    anchor_10: 'Kế hoạch đầy đủ theo 5W2H; mục tiêu định lượng rõ; nguồn lực, tiến độ và trách nhiệm xác định cụ thể.',
    anchor_8: 'Có kế hoạch khả thi; mục tiêu rõ; phân công tương đối đầy đủ.',
    anchor_6: 'Có kế hoạch nhưng thiếu một số nội dung như thời hạn, nguồn lực hoặc chỉ tiêu.',
    anchor_3: 'Kế hoạch sơ sài; mục tiêu chưa rõ; khó triển khai thực tế.',
    anchor_0: 'Không xây dựng kế hoạch hoặc kế hoạch không sử dụng được.',
  },
  {
    key: 'tc8', section: 'hieu_qua', title: 'Theo dõi, kiểm soát và cải tiến',
    description: 'Theo dõi tiến độ thường xuyên bằng dữ liệu, áp dụng báo cáo, PDCA và điều chỉnh, cải tiến giải pháp kịp thời.',
    anchor_10: 'Theo dõi thường xuyên bằng dữ liệu; đánh giá định kỳ; áp dụng PDCA; điều chỉnh giải pháp kịp thời.',
    anchor_8: 'Theo dõi đầy đủ; có báo cáo tiến độ và điều chỉnh khi cần thiết.',
    anchor_6: 'Có theo dõi nhưng chưa liên tục; hoạt động cải tiến còn chậm.',
    anchor_3: 'Theo dõi hình thức; thiếu dữ liệu; ít hành động cải tiến.',
    anchor_0: 'Không theo dõi tiến độ hoặc không có hoạt động cải tiến.',
  },
  {
    key: 'tc9', section: 'hieu_qua', title: 'Hiệu quả mang lại',
    description: 'Đánh giá kết quả thực tế đối với chỉ tiêu kinh doanh, vận hành, khách hàng hoặc chất lượng dịch vụ.',
    anchor_10: 'Tạo chuyển biến rõ rệt; đạt hoặc vượt mục tiêu; có kết quả định lượng và được ghi nhận rộng rãi.',
    anchor_8: 'Đạt các mục tiêu chính; mang lại kết quả tích cực và ổn định.',
    anchor_6: 'Có cải thiện nhưng chưa rõ nét; tác động còn hạn chế.',
    anchor_3: 'Hiệu quả thấp; kết quả chưa đáp ứng kỳ vọng.',
    anchor_0: 'Không tạo được kết quả hoặc không chứng minh được hiệu quả.',
  },
  {
    key: 'tc10', section: 'hieu_qua', title: 'Chuẩn hóa, đổi mới và lan tỏa',
    description: 'Chuẩn hóa quy trình, ứng dụng AI/chuyển đổi số, khả năng nhân rộng và duy trì, lan tỏa kết quả tốt.',
    anchor_10: 'Chuẩn hóa thành quy trình/công cụ; ứng dụng AI hoặc chuyển đổi số; nhân rộng thành công trên phạm vi đơn vị.',
    anchor_8: 'Có chuẩn hóa và áp dụng hiệu quả; được các đơn vị khác tham khảo sử dụng.',
    anchor_6: 'Có cải tiến nhưng phạm vi áp dụng hẹp; chưa duy trì bền vững.',
    anchor_3: 'Hiệu quả ngắn hạn; chưa chuẩn hóa hoặc khó nhân rộng.',
    anchor_0: 'Không có hoạt động cải tiến hoặc đổi mới.',
  },
];
