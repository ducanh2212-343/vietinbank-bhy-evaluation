export interface SkillItem {
  id: number;
  code: string;
  name: string;
  desc: string;
  keyPoints: string;
  aiApplication?: string;
}

export interface SkillGroup {
  groupId: string;
  title: string;
  color: string;
  badge: string;
  skills: SkillItem[];
}

export interface AttitudeItem {
  id: number;
  name: string;
  badBehavior: string;
  expectedBehavior: string;
  improvement: string;
  evidence: string;
}

export interface BM01Question {
  id: number;
  question: string;
  targetRole: string;
  guidance: string;
}

export const MOVE3_SKILL_GROUPS: SkillGroup[] = [
  {
    groupId: 'group1',
    title: 'Nhóm I: Skill Nền Tảng Chung (01 - 08)',
    color: 'from-blue-600 to-[#005A9C]',
    badge: 'Nền tảng vận hành & số hóa',
    skills: [
      {
        id: 1,
        code: 'Skill 01',
        name: 'Chiêu thức số 1 - Họp đầu ngày',
        desc: 'Tham gia và vận hành hiệu quả họp đầu ngày, bám sát tiến độ qua Miro/Kanban Online, thực hiện PDCA hằng ngày, duy trì tinh thần Năng lượng cho ngày mới.',
        keyPoints: 'Level 1: Tham gia đầy đủ, cập nhật Kanban trước 8h. Level 2: Phân biệt việc vận hành và trọng tâm. Level 3: Kiểm soát tiến độ tổ/nhóm, tháo gỡ điểm nghẽn. Level 4: Lan tỏa cải tiến họp toàn CN.',
        aiApplication: 'Dùng AI tổng hợp nhắc việc, tự động tóm tắt vướng mắc sau họp đầu ngày.'
      },
      {
        id: 2,
        code: 'Skill 02',
        name: 'Chiêu thức số 2 - Lập kế hoạch hành động 5W2H',
        desc: 'Chuyển hóa chiến lược, định hướng và mục tiêu trọng tâm thành hành động cụ thể, khả thi, có đo lường, giám sát rủi ro và yếu tố con người thực thi.',
        keyPoints: 'Không nhầm mục What với mục tiêu mong muốn. Bám sát mô hình ABCDE, SWOT nối sang TOWS và chốt bằng ma trận 5W2H trên Kanban.',
        aiApplication: 'Dùng AI tạo tình huống phản biện What-if, rà soát tính logic của các hành động TOWS.'
      },
      {
        id: 3,
        code: 'Skill 03',
        name: 'Chiêu thức số 3 - Phát triển nhân sự',
        desc: 'Tự phát triển bản thân và chủ động phát triển đội ngũ; biết sử dụng đánh giá 1-1, IDP, PDCA, khung skill-level và đánh giá 6 thái độ.',
        keyPoints: 'Chốt 2-3 skill trọng tâm trong quý. Gắn chặt với đầu việc thật và quy tắc upskill 70-20-10. Đánh giá thái độ bằng dẫn chứng thật.',
        aiApplication: 'Dùng MyGenie/AI tổng hợp insight nhân sự, gợi ý lộ trình upskill cá nhân hóa.'
      },
      {
        id: 4,
        code: 'Skill 04',
        name: 'Tổng hợp & Phân tích dữ liệu',
        desc: 'Chuyển dữ liệu vận hành thành thông tin quản trị, phát hiện biến động, nguyên nhân gốc (root cause) và cơ hội hành động phục vụ điều hành.',
        keyPoints: 'L1: Trích xuất số liệu chuẩn. L2: Làm sạch dữ liệu, chỉ ra biến động. L3: Phân tích đa chiều (CASA, nợ nhóm 2...). L4: Xây dựng logic điều hành.',
        aiApplication: 'Dùng AI tóm tắt số liệu định kỳ hằng tháng, nhận diện sai lệch và cảnh báo sớm.'
      },
      {
        id: 5,
        code: 'Skill 05',
        name: 'Excel, VBA & Tự động hóa báo cáo',
        desc: 'Sử dụng chuẩn hóa Excel, Macro, VBA hoặc Power Query để xử lý dữ liệu, tái cấu trúc luồng báo cáo giảm thời gian xử lý thủ công.',
        keyPoints: 'L1: Hàm tra cứu & Pivot. L2: Dọn dữ liệu, biểu đồ. L3: VBA/Power Query chuẩn hóa luồng giảm 30% thời gian. L4: Xây dựng bộ file dùng chung phòng.',
        aiApplication: 'Dùng AI giải thích công thức phức tạp, debug Macro và viết script tự động hóa thao tác.'
      },
      {
        id: 6,
        code: 'Skill 06',
        name: 'PowerPoint & Tài liệu trình bày quản trị',
        desc: 'Chuyển hóa dữ liệu, ý tưởng và giải pháp thành tài liệu trình bày trực quan, thuyết phục, đúng chuẩn nhận diện thương hiệu VietinBank.',
        keyPoints: 'Bố cục chuẩn mẫu, storytelling câu chuyện dữ liệu rõ ràng. Thiết kế slide bảo vệ phương án kinh doanh thuyết phục trước BGĐ.',
        aiApplication: 'Dùng AI gợi ý dàn ý (outline), tạo cấu trúc slide trực quan và phản biện luận điểm.'
      },
      {
        id: 7,
        code: 'Skill 07',
        name: 'Ứng dụng AI & Thói quen làm việc số',
        desc: 'Hiểu đúng khả năng AI, sử dụng AI đúng mục đích nguyên tắc bảo mật và hình thành thói quen làm việc có trợ lý AI hằng ngày.',
        keyPoints: 'L1: Nắm cơ bản ChatGPT, Gemini, MyGenie. L2: Dùng trợ lý AI tra cứu quy định NHCT, tạo bản chào KH. L3: Thiết kế AI workflow. L4: Lan tỏa AI phòng.',
        aiApplication: 'Sử dụng Gemini, NotebookLM bóc tách tài liệu, tóm tắt văn bản và soạn thảo văn bản.'
      },
      {
        id: 8,
        code: 'Skill 08',
        name: 'Thấu hiểu & Quản trị trải nghiệm KH/Đối tác VIP',
        desc: 'Thấu hiểu nhu cầu hành vi kỳ vọng của KHDN/KHBL quan trọng để cá nhân hóa tiếp cận, vận dụng nguyên tắc BBB (Bạn - Bàn - Bán).',
        keyPoints: 'Tránh tiếp cận cơ học bán sản phẩm đơn lẻ. Khơi gợi nhu cầu ẩn, xây dựng quan hệ bền vững tin cậy từ các điểm chạm nhạy cảm.',
        aiApplication: 'Dùng AI tạo chân dung khách hàng (Persona), giả lập tình huống tư vấn nhạy cảm.'
      }
    ]
  },
  {
    groupId: 'group2',
    title: 'Nhóm II: Skill Chuyên Môn - Tín Dụng - Tác Nghiệp (09 - 25)',
    color: 'from-emerald-600 to-teal-700',
    badge: 'Nghiệp vụ cốt lõi ngân hàng',
    skills: [
      {
        id: 9,
        code: 'Skill 09',
        name: 'Thẩm định cho vay Dự án đối với KHDN',
        desc: 'Phân tích doanh nghiệp, dự án, ngành nghề, dòng tiền và pháp lý để đánh giá đúng rủi ro khả năng trả nợ, đề xuất cơ chế kiểm soát phù hợp.',
        keyPoints: 'L1: Thu thập đủ hồ sơ pháp lý. L2: Độc lập phân tích tài chính KHDN. L3: Thẩm định sâu TSĐB đặc thù. L4: Dẫn dắt đại án KHDN phức tạp.'
      },
      {
        id: 10,
        code: 'Skill 10',
        name: 'Thẩm định GHTD ngắn hạn & KH bán lẻ',
        desc: 'Đánh giá khách hàng bán lẻ, hộ kinh doanh, lịch sử tín dụng, nguồn thu và độ ổn định dòng tiền để ra quyết định cấp tín dụng chất lượng.',
        keyPoints: 'Nhận diện nhân thân, chu kỳ KD phổ biến, gắn cấp tín dụng với giải ngân theo chứng từ hóa đơn kiểm soát rủi ro.'
      },
      {
        id: 11,
        code: 'Skill 11',
        name: 'Đọc hiểu phê duyệt tín dụng & Triển khai sau phê duyệt',
        desc: 'Rà soát đầy đủ điều kiện cấp tín dụng, đối chiếu công văn phê duyệt với hồ sơ thực tế trước và sau giải ngân đúng quy định NHCT.',
        keyPoints: 'Bóc tách các điều kiện ràng buộc, chuẩn hóa checklist nhận diện sai khác giữa phê duyệt và thực tế.'
      },
      {
        id: 12,
        code: 'Skill 12',
        name: 'Pháp lý tài sản bảo đảm & Đăng ký GDBĐ',
        desc: 'Kiểm soát pháp lý tài sản bảo đảm, công chứng đăng ký giao dịch bảo đảm trên cơ sở tuân thủ pháp luật và quy định VietinBank.',
        keyPoints: 'Nhận diện sai khác chủ thể đồng sở hữu, tài sản hạn chế giao dịch. Thiết kế cấu trúc bảo đảm cho hồ sơ tín dụng phức tạp.'
      },
      {
        id: 13,
        code: 'Skill 13',
        name: 'Tư vấn tài trợ thương mại, Bảo lãnh & Ngoại tệ',
        desc: 'Tư vấn hiệu quả nghiệp vụ L/C, bảo lãnh, thanh toán quốc tế, mua bán ngoại tệ kỳ hạn hoán đổi (FX/CCS) theo cơ chế tập trung.',
        keyPoints: 'L2: Tư vấn L/C cơ bản. L3: Giao case kết hợp bảo lãnh - TTQT - FX - Dòng tiền. L4: Đầu mối trade finance đơn vị.'
      },
      {
        id: 14,
        code: 'Skill 14',
        name: 'Tư vấn cấu trúc tài sản toàn diện (Total Wealth Solutions)',
        desc: 'Phân tích tổng thể tài sản KH Priority/VIP (tiền gửi, trái phiếu, chứng khoán, BĐS, vàng) kết hợp hệ sinh thái công ty con tư vấn giải pháp.',
        keyPoints: 'Thiết kế kế hoạch tài chính đa mục tiêu, chỉ ra điểm mất cân đối thanh khoản hoặc rủi ro tập trung trong danh mục.'
      },
      {
        id: 15,
        code: 'Skill 15',
        name: 'Phát triển khách hàng FDI & DN đa quốc gia',
        desc: 'Hiểu đặc điểm nhu cầu cách làm việc của KH FDI để tiếp cận từ Ban quản lý KCN, tư vấn hạ tầng đến quản lý tài khoản vốn xuyên biên giới.',
        keyPoints: 'Chăm sóc chuỗi cung ứng vendor/supplier của FDI lớn, thiết kế giải pháp dòng tiền đa tệ.'
      },
      {
        id: 16,
        code: 'Skill 16',
        name: 'Nghiệp vụ giao dịch quầy & Dịch vụ khách hàng',
        desc: 'Chuẩn hóa năng lực giao dịch, KYC, hạch toán, hỗ trợ khách hàng và bảo đảm chất lượng dịch vụ vượt trội tại quầy.',
        keyPoints: 'Tuân thủ chuẩn CLDV, tra soát độc lập, xử lý tình huống phát sinh nhanh gọn không để ùn ứ.'
      },
      {
        id: 17,
        code: 'Skill 17',
        name: 'Kiểm soát giao dịch quầy & Điều phối vận hành',
        desc: 'Kiểm soát phê duyệt giao dịch phân quyền, nhận diện sai sót rủi ro nghi ngờ, điều phối luồng khách giữ dòng vận hành thông suốt.',
        keyPoints: 'Xử lý khủng hoảng nhỏ tại quầy, cân bằng giữa tốc độ CLDV và tuân thủ kỷ cương rủi ro.'
      },
      {
        id: 18,
        code: 'Skill 18',
        name: 'Quản trị kho quỹ, An toàn kho & Điều phối tiền mặt',
        desc: 'Quản trị an toàn kho quỹ, kiểm soát mở/đóng kho, dự báo nhu cầu tiếp quỹ thu hồi quỹ tối ưu tồn quỹ tiền mặt.',
        keyPoints: 'Dự báo tiền mặt chuẩn xác, tuân thủ nguyên tắc hai chìa khóa an ninh kho quỹ tuyệt đối.'
      },
      {
        id: 19,
        code: 'Skill 19',
        name: 'Tác nghiệp kho quỹ, Kiểm đếm & Bảo quản tài sản',
        desc: 'Thực hiện chính xác an toàn quy trình kiểm đếm phân loại đóng gói nhập xuất quỹ tiếp quỹ và bảo quản chứng từ.',
        keyPoints: 'Bảo đảm tuyệt đối khớp đúng số lượng chất lượng và dấu vết chứng từ kho quỹ hằng ngày.'
      },
      {
        id: 20,
        code: 'Skill 20',
        name: 'Xử lý nợ xấu, Pháp lý thu hồi nợ & Quan hệ công tác',
        desc: 'Lựa chọn biện pháp đôn đốc thu hồi nợ, hoàn thiện hồ sơ khởi kiện tống đạt văn bản phối hợp Tòa án Thi hành án chính quyền.',
        keyPoints: 'Phân tích nguyên nhân phát sinh nợ xấu, vận dụng linh hoạt tố tụng thu hồi tối đa tài sản.'
      },
      {
        id: 21,
        code: 'Skill 21',
        name: 'Hoạch định tài chính hoạt động & Thanh toán chi phí',
        desc: 'Lập kế hoạch chi phí hoạt động, rà soát hóa đơn định mức chứng từ thanh toán chi nội bộ đúng thẩm quyền quy trình.',
        keyPoints: 'Đối chiếu giữa kế hoạch và thực tế tham mưu kiểm soát ngân sách (budget control) đơn vị.'
      },
      {
        id: 22,
        code: 'Skill 22',
        name: 'Quản lý hồ sơ mua sắm tài sản, CCDC & XDCB',
        desc: 'Rà soát tham mưu hồ sơ mua sắm đầu tư sửa chữa lớn xây dựng cơ bản bảo đảm chặt chẽ hợp đồng nghiệm thu quyết toán.',
        keyPoints: 'Nhận diện điểm thiếu chặt chẽ trong hồ sơ thanh tra kiểm toán, phòng ngừa rủi ro quyết toán.'
      },
      {
        id: 23,
        code: 'Skill 23',
        name: 'Hậu kiểm & Kiểm soát sau tác nghiệp',
        desc: 'Rà soát sai sót chứng từ giao dịch theo danh mục, nhận diện lỗ hổng quy trình đề xuất hành động khắc phục phòng ngừa tái diễn.',
        keyPoints: 'Phân tích root cause của lỗi lặp lại, thiết lập cơ chế cảnh báo sớm giảm số lỗi tái diễn.'
      },
      {
        id: 24,
        code: 'Skill 24',
        name: 'Quản trị trải nghiệm KH & Xử lý khiếu nại',
        desc: 'Tiếp nhận xử lý khiếu nại thông thường đến tình huống nhạy cảm phức tạp, trấn an KH và biến phản hồi thành đầu cải tiến CLDV.',
        keyPoints: 'Giải quyết thỏa đáng các điểm đau (pain points), duy trì uy tín thương hiệu VietinBank.'
      },
      {
        id: 25,
        code: 'Skill 25',
        name: 'Tổ chức sự kiện & Thiết kế trải nghiệm (CX-EX-DX)',
        desc: 'Tổ chức hội nghị KHDN/KHBL sự kiện nội bộ chuẩn ngân hàng, tối ưu trải nghiệm khách mời cán bộ kết hợp số hóa Slido/Miro.',
        keyPoints: 'Lập kế hoạch timeline run-sheet chi tiết, điều phối liên phòng xử lý nhịp nhàng phát sinh.'
      }
    ]
  },
  {
    groupId: 'group3',
    title: 'Nhóm III: Skill Kinh Doanh - Ảnh Hưởng - Đối Ngoại (26 - 31)',
    color: 'from-amber-500 to-orange-600',
    badge: 'Bán hàng & Kết nối hệ sinh thái',
    skills: [
      {
        id: 26,
        code: 'Skill 26',
        name: 'Xử lý từ chối & Bán hàng chéo',
        desc: 'Trình bày kịch bản tư vấn thuyết phục, xử lý các phản đối phổ biến về giá lãi suất phí và chuyển hóa lời từ chối thành cơ hội bán chéo.',
        keyPoints: 'Đo tỷ lệ chuyển đổi sales, thiết kế kịch bản xử lý từ chối nâng cao huấn luyện đội ngũ.'
      },
      {
        id: 27,
        code: 'Skill 27',
        name: 'Giao tiếp Tiếng Anh chuyên ngành ngân hàng',
        desc: 'Đọc hiểu hợp đồng tài liệu chuyên ngành, soạn thảo email nghiệp vụ và trao đổi đàm phán trực tiếp với đối tác KH quốc tế.',
        keyPoints: 'Nắm vững banking English, đại diện đơn vị tham gia các thương vụ hợp tác song ngữ.'
      },
      {
        id: 28,
        code: 'Skill 28',
        name: 'Giao tiếp Tiếng Trung chuyên ngành',
        desc: 'Hỗ trợ tư vấn dịch vụ ngân hàng, dịch thuật chứng từ kinh doanh và giao tiếp đàm phán tháo gỡ vướng mắc với KH nói tiếng Trung.',
        keyPoints: 'Phát triển chiều sâu phân khúc KHDN/FDI tiếng Trung trong địa bàn Bắc Hưng Yên.'
      },
      {
        id: 29,
        code: 'Skill 29',
        name: 'Thuyết trình & Bảo vệ phương án',
        desc: 'Trình bày báo cáo chuyên đề rõ ràng trọng tâm, sử dụng storytelling dữ liệu luận điểm sắc bén bảo vệ đề xuất trước BGĐ/Đối tác.',
        keyPoints: 'Xử lý bình tĩnh các câu hỏi phản biện gắt gao, tạo đồng thuận trong các diễn đàn lớn.'
      },
      {
        id: 30,
        code: 'Skill 30',
        name: 'Nghi thức đối ngoại & Kết nối KH giá trị cao',
        desc: 'Chuẩn hóa hình ảnh trang phục tác phong chuyên nghiệp, nghệ thuật tiếp đón giao tiếp tinh tế kết nối hệ sinh thái Elite/VIP.',
        keyPoints: 'Lựa chọn chủ đề hội thoại tự nhiên phá băng, chủ động tổ chức các sự kiện gặp gỡ riêng.'
      },
      {
        id: 31,
        code: 'Skill 31',
        name: 'Quan hệ đối ngoại CQNN & Lãnh đạo địa phương',
        desc: 'Thiết lập duy trì quan hệ công tác chuẩn mực hiệu quả với cơ quan quản lý nhà nước, chính quyền địa phương hỗ trợ kinh doanh.',
        keyPoints: 'Kết nối giải trình tháo gỡ vướng mắc cho các dự án trọng điểm của Chi nhánh.'
      }
    ]
  },
  {
    groupId: 'group4',
    title: 'Nhóm IV: Skill Quản Lý - Điều Hành - Phát Triển Đội Ngũ (32 - 38)',
    color: 'from-purple-600 to-indigo-700',
    badge: 'Năng lực Lãnh đạo & Tham mưu',
    skills: [
      {
        id: 32,
        code: 'Skill 32',
        name: 'Huấn luyện tại chỗ & Kèm cặp (Coaching)',
        desc: 'Năng lực kèm cặp cán bộ mới hoặc còn yếu qua giao việc thực tế, coaching 1-1 phản hồi kịp thời giúp đồng nghiệp tiến bộ rõ rệt.',
        keyPoints: 'Xây dựng kế hoạch kèm cặp có mốc rà soát định lượng, lan tỏa văn hóa học tập tổ/phòng.'
      },
      {
        id: 33,
        code: 'Skill 33',
        name: 'Phân tích danh mục & Quản trị rủi ro tín dụng',
        desc: 'Đọc bức tranh danh mục tổng thể, phát hiện tín hiệu cảnh báo sớm (chậm trả dưới 10 ngày, nợ nhóm 2 tăng) đề xuất hành động.',
        keyPoints: 'Phân tích rủi ro theo ngành/địa bàn/cán bộ, tham mưu BGĐ cơ chế siết hoặc mở tín dụng.'
      },
      {
        id: 34,
        code: 'Skill 34',
        name: 'Quản trị rủi ro hoạt động & KRI',
        desc: 'Nhận diện phòng ngừa kiểm soát lỗi phát sinh vận hành quầy kho quỹ chứng từ. Thiết lập bộ KRI cảnh báo sớm giảm lỗi tái diễn.',
        keyPoints: 'Theo dõi near-miss, phân tích nguyên nhân gốc hệ thống chấn chỉnh kỷ cương vận hành.'
      },
      {
        id: 35,
        code: 'Skill 35',
        name: 'Tổng hợp, phân tích & Tham mưu điều hành',
        desc: 'Chuyển hóa thông tin thành báo cáo quản trị chiều sâu kết nối số liệu hiện trạng phương án, đầu mối tham mưu tin cậy cho Giám đốc.',
        keyPoints: 'Nhìn bức tranh toàn cảnh đơn vị, chuẩn bị tài liệu ra quyết định chiến lược chất lượng cao.'
      },
      {
        id: 36,
        code: 'Skill 36',
        name: 'Nghiệp vụ tổ chức cán bộ & Quản trị nhân sự',
        desc: 'Thực hiện tham mưu đúng quy định thủ tục hồ sơ nhân sự, chế độ chính sách, đánh giá Talent Review quy hoạch luân chuyển bổ nhiệm.',
        keyPoints: 'Bố trí đúng người đúng việc, xây dựng đội ngũ cán bộ nòng cốt kế cận sẵn sàng thay thế.'
      },
      {
        id: 37,
        code: 'Skill 37',
        name: 'Tra cứu, đọc hiểu & Phân phối văn bản nghiệp vụ',
        desc: 'Tìm đúng bóc tách trọng yếu văn bản NHCT thành công thức: Điểm chính - Việc phải làm - Ai làm - Mốc thời gian - Rủi ro kiểm soát.',
        keyPoints: 'Trình bày lại ngắn gọn bằng ngôn ngữ thông dụng, truyền đạt chỉ đạo chuẩn xác không tam sao thất bản.'
      },
      {
        id: 38,
        code: 'Skill 38',
        name: 'Quan hệ công tác & Phối hợp hiệu quả Trụ sở chính',
        desc: 'Hiểu cấu trúc mô hình vận hành nguyên tắc phân cấp Trụ sở chính VietinBank. Dùng Gapowork liên hệ đúng đầu mối đúng vai đúng cấp.',
        keyPoints: 'Thiết lập cơ chế phối hợp hệ thống giữa Chi nhánh và TSC tháo gỡ vướng mắc, không làm việc lệch vai.'
      }
    ]
  }
];

export const MOVE3_ATTITUDES: AttitudeItem[] = [
  {
    id: 1,
    name: '1. Thái độ học hỏi & cầu thị',
    badBehavior: 'Không chủ động học, ngại cập nhật, ít tiếp thu góp ý. Trạng thái: không biết mình không biết; biết thiếu nhưng không biến thành hành động sửa.',
    expectedBehavior: 'Nhìn đúng mình đang thiếu gì yếu gì; chủ động học chịu hỏi chịu sửa, biến thiếu hụt kiến thức kỹ năng thành hành động cải thiện cụ thể.',
    improvement: 'Sau mỗi góp ý hay lỗi phát sinh ghi rõ thiếu gì sẽ học bằng cách nào hạn hoàn thành. Mỗi tuần tóm tắt ít nhất 1 văn bản hay tài liệu nghiệp vụ.',
    evidence: 'Có ghi chép tự học cụ thể, giảm hành vi lỗi lặp lại do thiếu hiểu biết, tăng chủ động hỏi tháo gỡ.'
  },
  {
    id: 2,
    name: '2. Thái độ đọc, nghiên cứu & làm việc dựa trên văn bản',
    badBehavior: 'Ít đọc, đọc lướt không nắm ý chính, hiểu sai văn bản dẫn đến chỉ đạo hoặc thực hiện sai do không bóc tách được nội dung trọng yếu.',
    expectedBehavior: 'Đọc kỹ hiểu đúng, bóc tách chuẩn 4 ý: điểm chính, việc phải làm, ai làm, mốc thời gian và rủi ro cần lưu ý.',
    improvement: 'Tra cứu đúng nguồn HQedoc, Intranet, MyGenie. Trình bày lại ngắn gọn bằng ngôn ngữ của mình trước khi áp dụng.',
    evidence: 'Tóm tắt đúng hơn ngắn gọn sát ý chính, thực hiện đúng ngay từ đầu giảm tỷ lệ phải sửa lại.'
  },
  {
    id: 3,
    name: '3. Thái độ lắng nghe, tiếp thu & tránh tự mãn',
    badBehavior: 'Cho rằng mình giỏi ít nghe người khác, phản ứng phòng thủ khi được góp ý, tranh luận cảm tính hoặc đổ lỗi cho hoàn cảnh.',
    expectedBehavior: 'Biết lắng nghe hỏi lại để hiểu đúng góp ý, tiếp thu với tinh thần xây dựng sửa bằng hành động cụ thể. Người có thế mạnh dễ tự mãn cần rèn kỹ.',
    improvement: 'Khi được góp ý không phản ứng ngay bằng cảm xúc, ghi lại 1-2 việc cần sửa. Tự rà soát lại sau 1-2 tuần.',
    evidence: 'Giảm phản ứng cảm tính, đồng nghiệp và lãnh đạo thấy dễ trao đổi phối hợp công việc hơn.'
  },
  {
    id: 4,
    name: '4. Thái độ phối hợp & tinh thần đồng đội',
    badBehavior: 'Chỉ quan tâm phần việc và KPI cá nhân; lấy xếp loại cá nhân làm kim chỉ nam mà không nghĩ đến kết quả chung. Đẩy việc, giữ thông tin.',
    expectedBehavior: 'Cân bằng giữa mục tiêu cá nhân và tập thể; hiểu kết quả lớn chỉ đạt được khi phối hợp hỗ trợ nhau. Chủ động đóng góp vào hiệu quả Phòng/CN.',
    improvement: 'Trước việc liên phòng tự hỏi: việc này đóng góp gì cho mục tiêu chung. Chủ động chốt rõ đầu mối deadline phần việc hỗ trợ.',
    evidence: 'Giảm phản ánh đẩy việc, tăng các trường hợp hỗ trợ liên phòng liên nhóm ra kết quả kinh doanh thật.'
  },
  {
    id: 5,
    name: '5. Thái độ làm việc đến cùng, thực chất & giữ kỷ cương',
    badBehavior: 'Làm việc thiếu quyết liệt, thiếu theo dõi đến cùng, dừng ở mức "đã báo cáo, đã gửi" mà chưa ra kết quả cuối cùng. Nể nang ngại va chạm.',
    expectedBehavior: 'Làm việc thực chất theo việc đến cùng, có bản lĩnh giữ nguyên tắc. Khi làm đầu mối chủ động đôn đốc nhắc nhở chấn chỉnh phản biện đúng lúc.',
    improvement: 'Tự xác định rõ trách nhiệm đến đâu và kết quả cuối cùng. Khi thấy sai quy trình lệch chỉ đạo có chính kiến trao đổi thẳng thắn.',
    evidence: 'Giảm tình trạng việc nửa chừng không khép việc, tăng số việc đi đến đầu ra cuối cùng trọn vẹn.'
  },
  {
    id: 6,
    name: '6. Thái độ chủ động rà soát, PDCA & cải tiến',
    badBehavior: 'Làm theo quán tính không kiểm tra lại, không nhìn ra lỗi, không chủ động đề xuất cải tiến. PDCA chỉ làm hình thức cho có.',
    expectedBehavior: 'Biết tự rà soát tự sửa, tự đề xuất cách làm tốt hơn và duy trì thói quen PDCA thực chất hướng vào nâng cao năng suất.',
    improvement: 'Cuối tuần trả lời 3 câu: làm tốt gì, chưa tốt gì, tuần tới sửa gì. Mỗi tháng đề xuất ít nhất 1 cải tiến nhỏ trong công việc.',
    evidence: 'Có đề xuất cải tiến thật áp dụng được vào công việc, giảm việc lãnh đạo phải nhắc nhở nhiều lần.'
  }
];

export const MOVE3_LEVELS = [
  {
    level: 'Level 1: Tân Binh / Tuân Thủ',
    color: 'bg-blue-100 text-blue-900 border-blue-300',
    desc: 'Thực hiện được ở mức cơ bản theo hướng dẫn, đúng quy trình, đúng chuẩn đầu vào. Cần sự hỗ trợ và giám sát thường xuyên.'
  },
  {
    level: 'Level 2: Độc Lập / Thực Chiến',
    color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    desc: 'Làm được độc lập trong phạm vi công việc phổ biến, biết xử lý tình huống thông thường và chủ động theo dõi kết quả.'
  },
  {
    level: 'Level 3: Chuyên Gia / Tối Ưu',
    color: 'bg-amber-100 text-amber-900 border-amber-300',
    desc: 'Xử lý được ca khó hơn, nhìn được nguyên nhân gốc rễ (root cause), tối ưu luồng xử lý và ra kết quả thực tế vượt trội.'
  },
  {
    level: 'Level 4: Bậc Thầy / Dẫn Dắt',
    color: 'bg-purple-100 text-purple-900 border-purple-300',
    desc: 'Dẫn dắt được đơn vị hoặc nhóm, xây dựng chuẩn mẫu, lan tỏa phương pháp huấn luyện người khác và tạo tác động toàn Chi nhánh.'
  }
];

export const MOVE3_BM01_QUESTIONS: BM01Question[] = [
  {
    id: 1,
    question: '1. Đâu là công việc bạn đã làm tốt nhất từ đầu năm đến nay?',
    targetRole: 'Cán bộ chọn 1-2 việc tiêu biểu nêu rõ: đã làm gì, kết quả ra sao, vì sao cho là tốt.',
    guidance: 'Quản lý lắng nghe xác định điểm mạnh thật (chuyên môn, cách làm hay phối hợp), gắn nhẹ skill & level.'
  },
  {
    id: 2,
    question: '2. Đâu là công việc bạn nghĩ mình có thể làm tốt hơn?',
    targetRole: 'Nêu thẳng việc chưa tốt, nguyên nhân thực chất, không né tránh hay trình bày cho đẹp.',
    guidance: 'Quản lý đọc mức độ nhận thức (có nhìn ra điểm mù, trung thực hay đổ lỗi), gắn nhẹ skill 1,2,38.'
  },
  {
    id: 3,
    question: '3. Đâu là công việc / năng lực bạn nghĩ mình đã tiến bộ?',
    targetRole: 'So sánh trước - sau, nêu rõ trước đây yếu ở đâu hiện tiến bộ ở đâu dấu hiệu là gì.',
    guidance: 'Quản lý xác nhận tiến bộ có thật không (giảm lỗi, bám việc tốt hơn), nhận diện skill đang tăng level.'
  },
  {
    id: 4,
    question: '4. Bạn đã làm gì để hỗ trợ đồng nghiệp hoặc nhóm làm việc tốt hơn?',
    targetRole: 'Nêu tình huống cụ thể (hỗ trợ việc gì cho ai kết quả tốt hơn thế nào), không nói chung chung.',
    guidance: 'Quản lý đọc tinh thần tập thể (chủ động hay khi được nhờ, nhìn KPI chung hay riêng), gắn skill 1,2,3,25.'
  },
  {
    id: 5,
    question: '5. Đâu là thế mạnh kiến thức kỹ năng bạn muốn phát huy hơn nữa?',
    targetRole: 'Chọn 1-2 thế mạnh gắn với việc thật kết quả thật, nêu mong muốn được lãnh đạo hỗ trợ giao việc.',
    guidance: 'Quản lý kiểm tra bằng chứng, chốt skill mạnh L2/L3 và đọc kỹ thái độ tránh tự mãn.'
  },
  {
    id: 6,
    question: '6. Năng lực trọng tâm cần cải thiện để làm tốt hơn vị trí hiện tại / mơ ước?',
    targetRole: 'Chọn tối đa 2-3 nội dung ngôn ngữ thông dụng (lập kế hoạch, bóc tách văn bản, thẩm định...).',
    guidance: 'Đây là câu trọng tâm nhất! Quản lý chuẩn quy chiếu về đúng bộ 38 skill và chốt mục tiêu nâng 1 level.'
  },
  {
    id: 7,
    question: '7. Bạn có đề xuất cải tiến gì để phòng/nhóm làm việc hiệu quả hơn?',
    targetRole: 'Trả lời theo hướng: vấn đề tồn tại, nguyên nhân gốc, giải pháp đề xuất (không chỉ than phiền).',
    guidance: 'Quản lý đọc tư duy hệ thống và khả năng dẫn dắt cải tiến L3/L4, gắn skill 1,2,5,7,35.'
  },
  {
    id: 8,
    question: '8. Mục tiêu nghề nghiệp 3-5 năm tới và lộ trình hành động đến 30/06/2026?',
    targetRole: 'Chốt định hướng sâu vị trí hiện tại hay quản lý chuyên gia. Xây IDP 2-3 skill trọng tâm gắn việc thật.',
    guidance: 'Quy ngược từ mục tiêu 3-5 năm về hiện tại áp dụng mô hình upskill 70% việc thật - 20% coaching - 10% đào tạo.'
  }
];
