import { UploadedItem, IdeaItem, QuizQuestion, StarProfile, StarType } from './types';

export const MOCK_UPLOADED_ITEMS: UploadedItem[] = [
  {
    id: 'bhy-img-1',
    title: 'Buổi sinh hoạt Bắc Hưng Yên Sharing #14: Nhận diện xu hướng FDI & Cụm công nghiệp địa bàn',
    category: 'sharing',
    author: 'Nguyễn Văn Long',
    department: 'Phòng KHDN',
    date: '25/06/2026',
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
    summary: 'Ban Giám đốc và phòng KHDN chia sẻ case study tiếp cận các doanh nghiệp trong Khu công nghiệp Phố Nối A và Phố Nối B.',
    tags: ['KHDN', 'FDI', 'Thị trường', 'CaseStudy'],
    likes: 42,
    isFeatured: true
  },
  {
    id: 'bhy-img-2',
    title: 'Vinh danh Top 3 Quán quân Bắc Hưng Yên Quizzi tuần 3 tháng 6',
    category: 'quizzi',
    author: 'Trần Thị Thu Hà',
    department: 'Phòng TCTH',
    date: '22/06/2026',
    imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    summary: 'Chúc mừng 3 cán bộ đạt điểm tuyệt đối với thời gian nhanh nhất: Nhận thưởng trực tiếp 200.000đ và 100.000đ từ Ban Giám đốc.',
    tags: ['VinhDanh', 'Quizzi', 'ÔnTậpQuyĐịnh'],
    likes: 56,
    isFeatured: true
  },
  {
    id: 'bhy-img-3',
    title: 'Phiên thẩm định rủi ro Bắc Hưng Yên Credit 360: Phương án tài trợ chuỗi cung ứng',
    category: 'credit360',
    author: 'Phạm Quốc Bảo',
    department: 'Phòng HTTD',
    date: '20/06/2026',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    summary: 'Trao đổi nghiệp vụ sâu về hồ sơ đề xuất GHTD trên 15 tỷ đồng. Ghi nhận góc nhìn 360 độ từ các cán bộ QHKH và lãnh đạo phòng kiểm soát.',
    tags: ['Credit360', 'ThẩmĐịnhRủiRo', 'GHTD15Tỷ'],
    likes: 38
  },
  {
    id: 'bhy-img-4',
    title: 'Chiêu thức số 1: Phòng Bán lẻ rực lửa khẩu hiệu "VietinBank - Năng lượng ngày mới"',
    category: 'move1',
    author: 'Lê Phương Thảo',
    department: 'Phòng KHBL',
    date: '26/06/2026',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    summary: 'Đầu giờ sáng thứ 2, toàn thể cán bộ phòng Bán lẻ chụm tay hô vang khẩu hiệu truyền lửa ra quân thúc đẩy chỉ tiêu Huy động vốn net.',
    tags: ['ChiêuThức1', 'HuyĐộngVốn', 'NăngLượngNgàyMới'],
    likes: 89,
    isFeatured: true
  },
  {
    id: 'bhy-img-5',
    title: 'Ứng dụng bảng Kanban & Thư viện Tri thức điện tử 01_BHY_Sharing tại PGD Văn Giang',
    category: 'connect',
    author: 'Hoàng Minh Tuấn',
    department: 'PGD Văn Giang',
    date: '18/06/2026',
    imageUrl: 'https://images.unsplash.com/photo-1507207611509-ec012433ff52?auto=format&fit=crop&w=800&q=80',
    summary: 'Định chuẩn hóa thư mục lưu trữ tài liệu nội bộ gắn thẻ từ khóa, kết nối vòng lặp PDCA giám sát dòng chảy công việc hằng ngày.',
    tags: ['ChuyểnĐổiSố', 'Kanban', 'ThưViệnTriThức'],
    likes: 31
  },
  {
    id: 'bhy-img-6',
    title: 'Hành trình thay ảnh đại diện frame kỷ niệm 20 năm "Vun Gốc Bền Rễ - Vươn Tầm Tương Lai"',
    category: 'celebration20',
    author: 'Hạt nhân Văn hóa',
    department: 'Phòng TCTH',
    date: '15/06/2026',
    imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
    summary: 'Hơn 150 cán bộ nhân viên Chi nhánh đồng loạt thay ảnh đại diện Facebook/Zalo lan tỏa niềm tự hào chặng đường 2006 - 2026.',
    tags: ['KỷNiệm20Năm', 'VietinBankBHY', 'TựHào'],
    likes: 120,
    isFeatured: true
  },
  {
    id: 'bhy-img-7',
    title: 'Chiêu thức số 2: Triển khai ma trận 5W2H phân rã mục tiêu Doanh số bán tới từng RM',
    category: 'move2',
    author: 'Vũ Thanh Bùi',
    department: 'Phòng KHDN',
    date: '12/06/2026',
    imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80',
    summary: 'Rà soát nhân sự bán hàng, đánh giá năng suất lao động bình quân và lập Action Plan khắc phục khoảng trống GAP năm 2026.',
    tags: ['ChiêuThức2', '5W2H', 'SWOT', 'QuảnLýKPI'],
    likes: 45
  },
  {
    id: 'bhy-img-8',
    title: 'Chiêu thức số 3: Lập kế hoạch phát triển nhân sự & Phân nhóm Sao Xứng Đáng Q2/2026',
    category: 'move3',
    author: 'Lãnh đạo Phòng Tổ chức',
    department: 'Phòng TCTH',
    date: '10/06/2026',
    imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    summary: 'Chuẩn hóa kẹp file lưu trữ hồ sơ cá nhân theo từng khoa học: Phân định Sao Mai, Sao Băng, Sao Khuê và Sao Hôm để bồi dưỡng lộ trình.',
    tags: ['ChiêuThức3', 'PhátTriểnNhânSự', 'SaoXứngĐáng'],
    likes: 64
  }
];

export const MOCK_IDEAS_DATA: IdeaItem[] = [
  {
    id: 'idea-1',
    code: 'BHYI-2026-001',
    title: 'Checklist giảm lỗi mẫu biểu & đối chiếu hồ sơ giao dịch tại quầy',
    author: 'Tổ Giao dịch viên',
    department: 'Phòng DVKH',
    tier: 'vươn_cành',
    rewardAmount: 1000000,
    smpStream: 'chi_nhánh',
    submittedDate: '05/06/2026',
    status: 'Đã nghiệm thu',
    avgScore: 4.2
  },
  {
    id: 'idea-2',
    code: 'BHYI-2026-008',
    title: 'Ứng dụng AI tự động hóa nhắc việc & tổng hợp tiến độ PDCA hằng ngày',
    author: 'Hoàng Văn Huy',
    department: 'Phòng TCTH',
    tier: 'lan_tỏa',
    rewardAmount: 2500000,
    smpStream: 'chi_nhánh',
    submittedDate: '14/06/2026',
    status: 'Đã nhân rộng',
    avgScore: 4.8
  },
  {
    id: 'idea-3',
    code: 'BHYI-2026-012',
    title: 'Bộ kịch bản xử lý từ chối và khai thác tín dụng KHDN FDI trên địa bàn',
    author: 'Nhóm Tăng Tốc',
    department: 'Phòng KHDN',
    tier: 'bén_rễ',
    rewardAmount: 300000,
    smpStream: 'chi_nhánh',
    submittedDate: '20/06/2026',
    status: 'Đang thử nghiệm',
    avgScore: 3.8
  },
  {
    id: 'idea-4',
    code: 'BHYI-2026-015',
    title: 'Đề xuất kiến nghị TSC điều chỉnh biểu phí thanh toán quốc tế cho cụm doanh nghiệp đặc thù',
    author: 'Trần Thị Mai',
    department: 'PGD Yên Mỹ',
    tier: 'ươm_mầm',
    rewardAmount: 100000,
    smpStream: 'trụ_sở_chính',
    submittedDate: '24/06/2026',
    status: 'Đang lựa chọn',
    avgScore: 3.5
  }
];

export const MOCK_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Trong chương trình Bắc Hưng Yên Quizzi, tỷ lệ câu hỏi thuộc nhóm "Nhận biết điểm trọng yếu" được khuyến nghị là bao nhiêu %?',
    options: ['15%', '25%', '30%', '50%'],
    correctOptionIndex: 2,
    category: 'BHY Quizzi',
    explanation: 'Theo cơ cấu thiết kế câu hỏi BQI: Nhận biết điểm trọng yếu chiếm 30%, Hiểu đúng trách nhiệm 25%, Tình huống áp dụng 30%, Rủi ro/lỗi dễ gặp 15%.',
    sourceRef: 'Mục IV.3 - Thông báo triển khai 350/TB-CNBHY-TCTH'
  },
  {
    id: 2,
    question: 'Chương trình "Bắc Hưng Yên Credit 360" áp dụng đối với Hồ sơ cấp mới/tái cấp KHDN có tổng giới hạn tín dụng từ ngưỡng nào trở lên?',
    options: ['Từ 5 tỷ đồng', 'Từ 10 tỷ đồng', 'Từ 15 tỷ đồng', 'Từ 50 tỷ đồng'],
    correctOptionIndex: 2,
    category: 'Credit 360',
    explanation: 'Phạm vi áp dụng Credit 360: Phân khúc KHDN áp dụng tổng GHTD từ 15 tỷ đồng trở lên; phân khúc KHBL từ 10 tỷ đồng trở lên.',
    sourceRef: 'Mục 3 - Thông báo triển khai Credit 360'
  },
  {
    id: 3,
    question: 'Trong Chiêu thức số 1 "Năng lượng ngày mới", chủ điểm trọng tâm của Chi nhánh trong năm 2026 là gì?',
    options: ['Tăng thu phí dịch vụ thẻ', 'Huy động vốn net', 'Bán chéo bảo hiểm VBI/Manulife', 'Xử lý nợ xấu'],
    correctOptionIndex: 1,
    category: 'Chiêu thức 1',
    explanation: 'Chiêu thức số 1 năm 2026 có chủ điểm trọng tâm là: HUY ĐỘNG VỐN (triển khai từ 16/03/2026).',
    sourceRef: 'Slide tài liệu Chiêu thức số 1'
  },
  {
    id: 4,
    question: 'Trong cơ chế khen thưởng Bắc Hưng Yên Ideas, cấp độ cao nhất "Lan tỏa" (Chuẩn hóa/nhân rộng toàn Chi nhánh) được thưởng mức bao nhiêu?',
    options: ['100.000đ', '300.000đ', '1.000.000đ', '2.000.000 – 3.000.000đ'],
    correctOptionIndex: 3,
    category: 'BHY Ideas',
    explanation: 'Cơ chế 4 cấp độ: Ươm mầm 100k, Bén rễ 300k, Vươn cành 1.000k, Lan tỏa từ 2.000.000 – 3.000.000đ/ý tưởng.',
    sourceRef: 'Mục V.6 - Thông báo triển khai Ideas'
  },
  {
    id: 5,
    question: 'Khi cập nhật tiến độ ý tưởng đang pilot theo mô hình PDCA/Miro (Phụ lục 09), trường thông tin "BLOCK" dùng để ghi nội dung gì?',
    options: ['Việc đã hoàn thành từ lần trước', 'Vướng mắc/rủi ro đang cản trở', 'Cam kết thời điểm hoàn thành (ETA)', 'Bài học kinh nghiệm rút ra'],
    correctOptionIndex: 1,
    category: 'PDCA & Miro',
    explanation: 'Phụ lục 09: DONE (việc đã hoàn thành), TODAY/NEXT (việc tiếp theo), BLOCK (vướng mắc/rủi ro cản trở), NEED (cần hỗ trợ), ETA (thời hạn), LESSON (bài học).',
    sourceRef: 'Phụ lục 09 - Mẫu cập nhật PDCA/Miro'
  }
];

export const STAR_PROFILES: Record<StarType, StarProfile> = {
  sao_mai: {
    type: 'sao_mai',
    name: 'SAO MAI ⭐',
    badge: 'Dẫn Đầu Tỏa Sáng',
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50/80',
    borderColor: 'border-amber-400',
    managementMetaphor: 'Là ngôi sao dẫn đầu, tỏa sáng rực rỡ và báo hiệu bình minh.',
    traits: 'Hiệu quả công việc rất cao, thái độ & phối hợp cực kỳ tích cực, đóng góp nổi bật.',
    strategy: 'Ủy quyền & Trao quyền: Giao các nhiệm vụ trọng tâm, quan trọng, việc khó, có tính thách thức cao để bồi dưỡng lãnh đạo.'
  },
  sao_băng: {
    type: 'sao_băng',
    name: 'SAO BĂNG 🔥',
    badge: 'Đột Phá Năng Lực',
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50/80',
    borderColor: 'border-orange-400',
    managementMetaphor: 'Là ngôi sao rực rỡ, đột phá nhưng quỹ đạo khó lường và ngẫu hứng.',
    traits: 'Năng lực chuyên môn rất tốt nhưng còn hạn chế về kỹ năng mềm, phối hợp liên phòng hoặc thái độ tuân thủ.',
    strategy: 'Hỗ trợ & Đối thoại sâu: Định hướng văn hóa doanh nghiệp, nắn chỉnh thái độ và sự gắn kết. Đặt mục tiêu rõ ràng kèm deadline giám sát chặt chẽ.'
  },
  sao_khuê: {
    type: 'sao_khuê',
    name: 'SAO KHUÊ 🌟',
    badge: 'Bền Bỉ Ổn Định',
    iconColor: 'text-sky-600',
    bgColor: 'bg-sky-50/80',
    borderColor: 'border-sky-400',
    managementMetaphor: 'Là ngôi sao của sự bền bỉ, tỏa sáng nhẹ nhàng nhưng kiên định.',
    traits: 'Thái độ rất tốt, chăm chỉ, chuẩn mực nhưng năng lực hoặc kết quả đầu ra chưa đạt mức bứt phá cao nhất.',
    strategy: 'Kèm cặp & Đào tạo chuyên sâu: Giao những việc đòi hỏi sự tỉ mỉ, cẩn thận, cần nhiều thời gian. Tập trung đào tạo nâng cao nghiệp vụ để chuyển đổi thành Sao Mai.'
  },
  sao_hôm: {
    type: 'sao_hôm',
    name: 'SAO HÔM 🌘',
    badge: 'Cần Thắp Sáng Lại',
    iconColor: 'text-slate-600',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    managementMetaphor: 'Là ngôi sao đang bị che phủ trong vùng tối, cần truyền thêm năng lượng để thắp sáng trở lại.',
    traits: 'Kết quả hiệu quả thấp và kỹ năng/thái độ chưa đáp ứng yêu cầu vị trí công việc.',
    strategy: 'Chỉ đạo sát sao (IDP): Đặt các cột mốc cụ thể trong bản kế hoạch phát triển cá nhân để cho cơ hội thắp sáng. Thiết lập lộ trình cải thiện hiệu suất nghiêm ngặt.'
  }
};
