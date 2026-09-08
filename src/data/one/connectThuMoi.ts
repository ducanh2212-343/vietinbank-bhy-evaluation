/**
 * Nội dung thư mời «Chạm AI, Chạm tương lai» — diễn đàn chia sẻ ứng dụng AI
 * trong doanh nghiệp của Bắc Hưng Yên Connect, 26/08/2026.
 *
 * Chép lại từ thư mời in (ảnh poster) để trang Connect dựng lại được thư mời
 * ngay cả khi ảnh trong kho tư liệu chưa ký được đường dẫn — và để chữ trên
 * thư mời tìm kiếm/đọc được thay vì nằm chết trong ảnh.
 */
export interface MocChuongTrinh {
  gio: string;
  noiDung: string;
  /** Mốc nổi bật (phiên chính) — tô màu khác trong timeline */
  nhan?: 'PHIÊN 1' | 'PHIÊN 2' | 'TỌA ĐÀM / Q&A' | 'TIỆC TỐI';
}

export const THU_MOI_CHAM_AI = {
  tieuDe: 'Chạm AI, Chạm tương lai',
  phuDe: 'Diễn đàn chia sẻ ứng dụng AI trong doanh nghiệp',
  khauHieu: ['Kết nối tri thức', 'Đồng hành chuyển đổi', 'Kiến tạo giá trị'],
  ngay: '26/08/2026',
  gio: '13h30 – 16h50',
  diaDiem: 'Hội trường Tinh Hoa – Tầng 5, Toà nhà VietinBank Bắc Hưng Yên',
  timeline: [
    { gio: '13h30', noiDung: 'Khai mạc – giới thiệu chương trình' },
    { gio: '13h50', nhan: 'PHIÊN 1', noiDung: 'AI trong quản trị & ra quyết định: từ thực tiễn doanh nghiệp sản xuất' },
    { gio: '14h35', noiDung: 'Tea break, trải nghiệm Bắc Hưng Yên Kit Lab, thực hành AI' },
    { gio: '14h45', nhan: 'PHIÊN 2', noiDung: 'Từ thực chiến đến quy luật thành công: showcase thực tế ứng dụng doanh nghiệp và demo' },
    { gio: '15h00', noiDung: 'Thực hành AI' },
    { gio: '15h20', noiDung: 'Vòng quay may mắn' },
    { gio: '15h30', nhan: 'PHIÊN 2', noiDung: 'Từ thực chiến đến quy luật thành công: doanh nghiệp cần gì để đi xa với AI?' },
    { gio: '15h40', noiDung: 'Góc nhìn VietinBank: AI mở ra cơ hội gì cho doanh nghiệp?' },
    { gio: '16h00', nhan: 'TỌA ĐÀM / Q&A', noiDung: 'AI của doanh nghiệp: bắt đầu từ đâu?' },
    { gio: '16h30', noiDung: 'Quizzi' },
    { gio: '16h50', noiDung: 'Cảm ơn – chụp ảnh – kết nối sau hội thảo' },
    { gio: '17h30', nhan: 'TIỆC TỐI', noiDung: 'Kết nối giao lưu' },
  ] satisfies MocChuongTrinh[],
  giaTri: [
    { ten: 'Giao lưu & kết nối', moTa: 'Mở rộng quan hệ, hợp tác bền vững' },
    { ten: 'Tìm giải pháp phù hợp', moTa: 'Để triển khai AI hiệu quả, mang lại giá trị thiết thực' },
    { ten: 'Đồng hành chuyển đổi', moTa: 'Kiến tạo giá trị mới cùng doanh nghiệp' },
  ],
} as const;
