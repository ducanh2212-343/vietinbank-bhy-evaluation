// Hardcoded reference behavior standards for the 6 attitude groups.
// Used by AttitudeBehaviorStandards.tsx — read-only reference, not stored.

export const LEVEL_DESCRIPTIONS = {
  failing:
    'Còn khoảng cách so với chuẩn hành vi mong đợi; hành vi chưa ổn định, chưa thường xuyên hoặc còn ảnh hưởng đến chất lượng công việc, phối hợp, kỷ luật thực thi hoặc kết quả chung. Người được đánh giá cần nhận diện rõ điểm cần điều chỉnh và có hành động cải thiện cụ thể trong kỳ tới.',
  meeting:
    'Thực hiện ổn định theo chuẩn hành vi mong đợi; có nhận thức đúng, hành động phù hợp, đáp ứng yêu cầu của vị trí và góp phần tích cực vào công việc chung. Người được đánh giá cần tiếp tục duy trì sự ổn định và nâng dần chất lượng thực hiện.',
  outstanding:
    'Thể hiện hành vi vượt chuẩn mong đợi, có tính nêu gương, tạo tác động tích cực hoặc lan tỏa cách làm tốt đến đồng nghiệp, nhóm, phòng hoặc đơn vị. Mức Nổi bật cần có minh chứng cụ thể, không chỉ là tự nhận xét chung chung.',
} as const;

export type BehaviorStandard = {
  failing: string[];
  meeting: string[];
  outstanding: string[];
};

export const BEHAVIOR_STANDARDS: Record<number, BehaviorStandard> = {
  1: {
    failing: [
      'Chưa chủ động học khi nhận thấy mình còn thiếu hụt kiến thức hoặc kỹ năng.',
      'Ngại hỏi, ngại xin góp ý, ngại thừa nhận điểm chưa biết.',
      'Có tiếp nhận góp ý nhưng chưa chuyển thành hành động cải thiện cụ thể.',
      'Học còn đối phó, học để hoàn thành yêu cầu, chưa áp dụng rõ vào công việc.',
      'Lặp lại lỗi cũ do chưa thực sự rút kinh nghiệm.',
    ],
    meeting: [
      'Nhìn đúng mình đang thiếu gì, yếu gì.',
      'Chủ động học, hỏi, tìm hiểu khi gặp vấn đề chưa rõ.',
      'Tiếp thu góp ý với tinh thần cầu thị.',
      'Sau góp ý có hành động điều chỉnh cụ thể.',
      'Có bằng chứng về việc học và áp dụng vào công việc.',
    ],
    outstanding: [
      'Chủ động học trước khi được nhắc hoặc trước khi phát sinh yêu cầu bắt buộc.',
      'Biến kiến thức mới thành cách làm mới hoặc cải thiện hiệu quả công việc.',
      'Chủ động chia sẻ kiến thức, kinh nghiệm cho đồng nghiệp.',
      'Giúp người khác cùng học, cùng sửa, cùng tiến bộ.',
      'Tạo được tinh thần học hỏi tích cực trong nhóm/phòng.',
    ],
  },
  2: {
    failing: [
      'Đọc lướt, đọc chưa kỹ, chưa nắm được ý chính của văn bản.',
      'Không bóc tách rõ việc phải làm, đầu mối thực hiện, thời hạn, rủi ro cần lưu ý.',
      'Dễ hiểu sai chỉ đạo, quy định hoặc hướng dẫn nghiệp vụ.',
      'Chưa có thói quen tra cứu văn bản, căn cứ trước khi xử lý công việc.',
      'Còn phụ thuộc nhiều vào người khác giải thích thay vì tự đọc, tự nghiên cứu.',
    ],
    meeting: [
      'Đọc kỹ, hiểu đúng nội dung chính của văn bản.',
      'Tóm tắt được điểm chính, việc cần làm, người liên quan và thời hạn.',
      'Biết tra cứu đúng nguồn thông tin, văn bản, quy định.',
      'Triển khai công việc dựa trên căn cứ rõ ràng.',
      'Giảm sai sót do hiểu chưa đúng hoặc chưa đầy đủ văn bản.',
    ],
    outstanding: [
      'Đọc sâu, phát hiện sớm điểm cần lưu ý, điểm rủi ro hoặc điểm dễ hiểu sai.',
      'Chuyển hóa văn bản thành checklist, hướng dẫn, đầu việc cụ thể.',
      'Chủ động hướng dẫn đồng nghiệp hiểu đúng và làm đúng.',
      'Góp phần giảm lỗi triển khai trong nhóm/phòng.',
      'Có thể hỗ trợ quản lý trong việc bóc tách văn bản thành kế hoạch thực hiện.',
    ],
  },
  3: {
    failing: [
      'Còn phản ứng phòng thủ khi được góp ý.',
      'Giải thích, tranh luận hoặc đổ lỗi nhiều hơn lắng nghe.',
      'Tiếp thu góp ý nhưng chưa thay đổi hành vi rõ ràng.',
      'Có biểu hiện tự mãn, cho rằng mình đã biết hoặc đã làm tốt.',
      'Lặp lại lỗi cũ do chưa thực sự sửa từ góp ý.',
    ],
    meeting: [
      'Lắng nghe góp ý với thái độ bình tĩnh, xây dựng.',
      'Biết hỏi lại để hiểu đúng nội dung góp ý.',
      'Ghi nhận điểm cần sửa và có hành động điều chỉnh.',
      'Không né tránh phản hồi trái chiều.',
      'Có tiến bộ sau mỗi lần được góp ý.',
    ],
    outstanding: [
      'Chủ động xin phản hồi, không chờ đến khi bị nhắc.',
      'Biết tự soi điểm mù của bản thân.',
      'Chuyển góp ý thành hành động cải thiện rõ ràng.',
      'Chia sẻ lại bài học để người khác tránh lỗi tương tự.',
      'Góp phần tạo văn hóa góp ý thẳng thắn, cầu thị, không phòng thủ trong nhóm/phòng.',
    ],
  },
  4: {
    failing: [
      'Chưa chủ động phối hợp với đồng nghiệp hoặc đơn vị liên quan.',
      'Chưa chia sẻ thông tin kịp thời, gây chậm tiến độ hoặc hiểu nhầm.',
      'Còn tập trung nhiều vào phần việc/KPI cá nhân, chưa quan tâm đầy đủ đến kết quả chung.',
      'Chưa sẵn sàng hỗ trợ đồng nghiệp khi cần.',
      'Khi phối hợp chưa làm rõ đầu mối, trách nhiệm, thời hạn và kết quả cần đạt.',
    ],
    meeting: [
      'Chủ động phối hợp, chia sẻ thông tin cần thiết.',
      'Biết chốt rõ đầu mối, phần việc, thời hạn và trách nhiệm.',
      'Cân bằng giữa mục tiêu cá nhân và mục tiêu chung.',
      'Hỗ trợ đồng nghiệp trong phạm vi phù hợp.',
      'Có trách nhiệm với kết quả chung của nhóm/phòng/đơn vị.',
    ],
    outstanding: [
      'Chủ động kết nối các bên để công việc chung chạy thông suốt.',
      'Hỗ trợ đồng nghiệp ngay cả khi việc đó không trực tiếp mang lại lợi ích cá nhân.',
      'Góp phần tháo điểm nghẽn phối hợp liên phòng/liên nhóm.',
      'Được đồng nghiệp và quản lý ghi nhận là người làm vì việc chung.',
      'Lan tỏa tinh thần đồng đội, chia sẻ và cùng chịu trách nhiệm.',
    ],
  },
  5: {
    failing: [
      'Có lúc chỉ dừng ở "đã gửi", "đã báo cáo", "đã nhắc" nhưng chưa theo đến kết quả cuối cùng.',
      'Theo việc chưa sát, chưa bám tiến độ hoặc chưa kiểm tra kết quả thực tế.',
      'Báo cáo còn hình thức, chưa phản ánh đúng thực trạng, vướng mắc hoặc kết quả.',
      'Ngại nhắc việc, ngại chấn chỉnh, ngại phản biện khi thấy chưa đúng.',
      'Chưa chủ động đề xuất phương án xử lý khi có vướng mắc.',
    ],
    meeting: [
      'Làm việc thực chất, bám việc đến kết quả cuối cùng.',
      'Chủ động đôn đốc, nhắc nhở, chấn chỉnh khi cần.',
      'Báo cáo đúng thực trạng, đúng vướng mắc, đúng kết quả.',
      'Giữ nguyên tắc trong thực thi, không hợp thức hóa hình thức.',
      'Có trách nhiệm với việc được giao cho đến khi khép việc.',
    ],
    outstanding: [
      'Chủ động nhận việc khó và theo đến khi có kết quả cuối cùng.',
      'Không chỉ phát hiện vấn đề mà còn đề xuất phương án xử lý.',
      'Dám phản biện đúng, nhắc việc đúng, chấn chỉnh đúng trên tinh thần xây dựng.',
      'Tạo chuẩn mực "làm đến cùng" cho đồng nghiệp, nhóm hoặc phòng.',
      'Giúp giảm tình trạng việc tồn, việc trôi, báo cáo đẹp nhưng kết quả không thật.',
    ],
  },
  6: {
    failing: [
      'Làm việc theo thói quen, chưa có thói quen tự kiểm tra lại.',
      'Chỉ phát hiện lỗi khi có người nhắc hoặc khi đã phát sinh hậu quả.',
      'PDCA còn hình thức, chưa tạo thay đổi thực tế.',
      'Ít đề xuất cải tiến cách làm.',
      'Chưa theo dõi kết quả sau khi điều chỉnh hoặc cải tiến.',
    ],
    meeting: [
      'Có thói quen tự rà soát công việc.',
      'Biết nhìn lại việc tốt, việc chưa tốt và việc cần sửa.',
      'Có hành động điều chỉnh sau rà soát.',
      'Có đề xuất cải tiến nhỏ, phù hợp với công việc thực tế.',
      'Theo dõi được kết quả sau khi cải tiến.',
    ],
    outstanding: [
      'Chủ động phát hiện điểm nghẽn trước khi phát sinh lỗi lớn.',
      'Đề xuất cải tiến có hiệu quả thực tế.',
      'Biết dùng công cụ theo dõi như checklist, Kanban, Miro hoặc bảng tiến độ để cải thiện chất lượng công việc.',
      'Giúp nhóm/phòng hình thành nhịp rà soát và cải tiến thực chất.',
      'Lan tỏa tinh thần PDCA, cải tiến liên tục và đo được tác động.',
    ],
  },
};
