/** Bộ câu hỏi trao đổi 1-1 mặc định — dùng khi kỳ chưa cấu hình bộ câu hỏi riêng. */

export interface OneOnOneQuestion {
  key: string;
  text: string;
}

export const DEFAULT_ONE_ON_ONE_QUESTIONS: OneOnOneQuestion[] = [
  { key: 'q1', text: 'Đâu là công việc bạn đã làm tốt nhất từ đầu năm đến nay?' },
  { key: 'q2', text: 'Đâu là công việc bạn nghĩ mình có thể làm tốt hơn những gì đã thực hiện từ đầu năm đến nay? Lý do?' },
  { key: 'q3', text: 'Đâu là công việc/năng lực bạn nghĩ trong 5 tháng vừa qua mình đã có sự tiến bộ so với các năm trước? Tại sao bạn đánh giá như vậy?' },
  { key: 'q4', text: 'Bạn đã làm gì để hỗ trợ cho đồng nghiệp hoặc cho cả nhóm đạt được kết quả công việc tốt hơn?' },
  { key: 'q5', text: 'Đâu là năng lực (kiến thức, kỹ năng, khả năng, tố chất) mà bạn cho rằng đó là thế mạnh của mình? Bạn mong muốn được phát huy thế mạnh nào hơn nữa trong công việc hiện tại? Bạn cần sự hỗ trợ gì của lãnh đạo để phát huy được năng lực đó?' },
  { key: 'q6', text: 'Đâu là những năng lực mà bạn cho rằng mình cần cải thiện để làm tốt hơn vị trí công việc hiện tại và/hoặc đạt được vị trí công việc mà bạn mơ ước? Bạn cần sự hỗ trợ gì của lãnh đạo để cải thiện được năng lực đó?' },
  { key: 'q7', text: 'Bạn có đề xuất gì để phòng/nhóm của bạn làm việc hiệu quả hơn?' },
  { key: 'q8', text: 'Mục tiêu công việc của bạn trong 3-5 năm tới là gì? Bạn cần lãnh đạo hỗ trợ gì để đạt được mục tiêu đó?' },
];
