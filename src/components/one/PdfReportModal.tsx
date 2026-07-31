import React, { useRef, useState } from 'react';
import { Download, X, Printer, FileText, CheckCircle, Award, Calendar, Building, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UploadedItem } from '@/data/one/types';
import { useAdminEditable } from './AdminEditableContext';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: UploadedItem[];
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  items
}) => {
  const { siteContent } = useAdminEditable();
  const getContent = (key: string, defaultVal: string) => siteContent[key] ?? defaultVal;

  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setDownloading(true);

    try {
      // html2canvas (48 kB gzip) + jspdf (129 kB gzip) chỉ cần khi người dùng bấm
      // xuất PDF — nạp tại chỗ để trang Học hỏi & Chia sẻ không gánh 177 kB thừa.
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210; // A4 standard width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Bao_Cao_Doi_Moi_Sang_Tao_VietinBank_BHY_${new Date().toISOString().slice(0, 10)}.pdf`);

      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Lỗi khi tạo PDF:', err);
      alert('Có lỗi nhỏ khi render PDF trong môi trường sandbox. Vui lòng mở trang ở tab mới nếu trình duyệt chặn canvas.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-100 rounded-3xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">

        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-brand-royal text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-brand-red" />
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider">
                Xem Trước & Xuất Báo Cáo Định Kỳ (PDF HD)
              </h3>
              <span className="text-[10px] text-blue-200 block">Hỗ trợ xuất bản văn bản chính thức trình Ban Giám đốc Chi nhánh</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPdf}
              disabled={downloading}
              className="px-5 py-2 rounded-xl bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm uppercase shadow transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Đang tạo PDF...' : 'Tải File PDF'}</span>
            </button>

            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Report Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">

          {/* Actual Print Sheet (A4 Proportion Simulation) */}
          <div
            ref={reportRef}
            className="bg-white p-8 sm:p-12 shadow-lg max-w-[760px] w-full text-slate-900 border border-slate-200 text-left font-sans"
            style={{ minHeight: '1200px' }}
          >
            {/* National Header */}
            <div className="flex justify-between items-start text-center mb-8 pb-4 border-b-2 border-brand-royal font-sans">
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 uppercase block">NH TMCP CÔNG THƯƠNG VIỆT NAM</span>
                <span className="text-sm font-black text-brand-royal uppercase block">CHI NHÁNH BẮC HƯNG YÊN</span>
                <span className="text-[10px] text-slate-500 block">Số: 350/BC-CNBHY-TCTH</span>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-800 uppercase block">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span>
                <span className="text-xs font-bold text-slate-800 block">Độc lập - Tự do - Hạnh phúc</span>
                <span className="text-[10px] italic text-slate-500 block mt-1">Hưng Yên, ngày 26 tháng 06 năm 2026</span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center my-8 font-sans">
              <h1 className="text-xl sm:text-2xl font-black text-brand-royal uppercase tracking-tight mb-2">
                BÁO CÁO TỔNG HỢP KẾT QUẢ TRIỂN KHAI
              </h1>
              <h2 className="text-sm sm:text-base font-extrabold text-brand-red uppercase mb-1">
                Các Chương Trình Đổi Mới Sáng Tạo & Bộ Chiêu Thức Vận Hành
              </h2>
              <p className="text-xs italic text-slate-500">
                Chào mừng Kỷ niệm 20 năm thành lập VietinBank Chi nhánh Bắc Hưng Yên (2006 - 2026)
              </p>
            </div>

            {/* Section I: Overview Stats */}
            <div className="mb-6 font-sans">
              <h3 className="text-sm font-black text-brand-royal uppercase border-l-4 border-brand-red pl-2 mb-3">
                I. TỔNG QUAN HỆ SINH THÁI LIÊN THÔNG (PDCA)
              </h3>
              <p className="text-xs leading-relaxed text-slate-700 mb-4">
                Thực hiện chủ điểm <strong>"Học - Đọc - Đào Tạo"</strong> và thúc đẩy chỉ tiêu kinh doanh năm 2026, toàn Chi nhánh đã vận hành liên thông các chương trình đặc trưng gắn kết với hệ thống quản trị rủi ro và phát triển nhân sự.
              </p>

              <div className="grid grid-cols-3 gap-3 text-center mb-6">
                <div className="p-3 rounded bg-blue-50 border border-blue-200">
                  <span className="text-lg font-black text-brand-royal block">{items.length}</span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Tư liệu & Sáng kiến</span>
                </div>
                <div className="p-3 rounded bg-red-50 border border-red-200">
                  <span className="text-lg font-black text-brand-red block">100%</span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Phòng ban tham gia</span>
                </div>
                <div className="p-3 rounded bg-amber-50 border border-amber-200">
                  <span className="text-lg font-black text-amber-700 block">
                    {getContent('sao2026.stars_count', '412')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Ngôi Sao Phân Bổ</span>
                </div>
              </div>
            </div>

            {/* Section II: Key Program Highlights */}
            <div className="mb-6 font-sans">
              <h3 className="text-sm font-black text-brand-royal uppercase border-l-4 border-brand-red pl-2 mb-3">
                II. CHI TIẾT 5 CHƯƠNG TRÌNH ĐẶC TRƯNG VĂN HÓA
              </h3>

              <div className="space-y-4 text-xs">
                {/* Sharing */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-extrabold text-brand-royal uppercase text-xs mb-1">
                    1. {getContent('programs.sharing.title', 'Bắc Hưng Yên Sharing')}
                    <span className="text-[10px] font-medium text-slate-500 normal-case ml-2">
                      ({getContent('programs.sharing.subject', 'Chủ điểm: "Học - Đọc - Đào Tạo"')})
                    </span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed mb-2">
                    {getContent('programs.sharing.desc', 'Tạo cơ hội để cán bộ, lãnh đạo các Phòng chia sẻ tri thức cốt lõi định kỳ.')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-100 text-slate-700">
                      <strong>Nội dung ưu tiên:</strong> {getContent('programs.sharing.prio_content', 'Kiến thức KHDN FDI, khu công nghiệp, quản trị rủi ro & CX/EX.')}
                    </div>
                    <div className="p-2 bg-rose-50 rounded border border-rose-100 text-slate-700">
                      <strong>Hạn chế:</strong> {getContent('programs.sharing.discourage_content', 'Không đọc lại văn bản quy trình có sẵn.')}
                    </div>
                  </div>
                  <p className="text-[10px] italic text-brand-red mt-1">
                    Tần suất: {getContent('programs.sharing.frequency', 'Tối thiểu 02 lần/tháng.')}
                  </p>
                </div>

                {/* Quizzi */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-extrabold text-brand-red uppercase text-xs mb-1">
                    2. {getContent('programs.quizzi.title', 'Bắc Hưng Yên Quizzi')}
                    <span className="text-[10px] font-medium text-slate-500 normal-case ml-2">
                      ({getContent('programs.quizzi.subject', 'Không áp lực điểm số, tập trung nhớ sâu quy định mới')})
                    </span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed mb-2">
                    {getContent('programs.quizzi.desc', 'Trắc nghiệm ngắn ôn tập quy định mới. Thưởng trực tiếp Top 3 mỗi kỳ.')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 bg-blue-50 rounded border border-blue-100 text-slate-700">
                      <strong>Cơ cấu khuyến nghị:</strong> {getContent('programs.quizzi.recom_content', '50% Quy định mới phát hành - 30% Kỹ năng mềm - 20% Câu hỏi vui.')}
                    </div>
                    <div className="p-2 bg-amber-50 rounded border border-amber-100 text-slate-700">
                      <strong>Trao thưởng:</strong> {getContent('programs.quizzi.reward_content', 'Thưởng nóng ngay sau buổi thi đấu: Nhất 150k, Nhì 100k, Ba 50k.')}
                    </div>
                  </div>
                </div>

                {/* Ideas */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-extrabold text-amber-700 uppercase text-xs mb-1">
                    3. {getContent('programs.ideas.title', 'Bắc Hưng Yên Ideas')}
                    <span className="text-[10px] font-medium text-slate-500 normal-case ml-2">
                      ({getContent('programs.ideas.budget', 'Tổng ngân sách khen thưởng: 100.000.000 VNĐ')})
                    </span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed mb-2">
                    {getContent('programs.ideas.desc', 'Khuyến khích cán bộ toàn Chi nhánh hiến kế đổi mới sáng tạo, sàng lọc qua 4 cấp độ.')}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 text-[9px] text-center mb-1.5">
                    <div className="p-1 bg-slate-100 rounded border font-medium text-slate-800 whitespace-pre-line">
                      {getContent('programs.ideas.tier1', '1. Ươm mầm 🌱\nDám nghĩ dám đề xuất\nThưởng: 100.000đ')}
                    </div>
                    <div className="p-1 bg-slate-100 rounded border font-medium text-slate-800 whitespace-pre-line">
                      {getContent('programs.ideas.tier2', '2. Bén rễ 🌿\nĐược TSC phê duyệt\nThưởng: 300.000đ')}
                    </div>
                    <div className="p-1 bg-slate-100 rounded border font-medium text-slate-800 whitespace-pre-line">
                      {getContent('programs.ideas.tier3', '3. Vươn cành 🌳\nPilot có kết quả rõ\nThưởng: 1.000.000đ')}
                    </div>
                    <div className="p-1 bg-slate-100 rounded border font-medium text-slate-800 whitespace-pre-line">
                      {getContent('programs.ideas.tier4', '4. Lan tỏa ⭐\nChuẩn hóa nhân rộng\n2.000.000 - 3.000.000đ')}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-700 bg-amber-50 p-2 rounded border border-amber-100">
                    <strong>Hội đồng thẩm định:</strong> {getContent('programs.ideas.jury_content', 'Phê duyệt ý tưởng nhanh gọn qua nhóm chung, không rườm rà giấy tờ.')}
                  </p>
                </div>

                {/* Credit 360 */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-extrabold text-emerald-700 uppercase text-xs mb-1">
                    4. {getContent('programs.credit360.title', 'Bắc Hưng Yên Credit 360')}
                  </h4>
                  <p className="text-slate-600 leading-relaxed mb-2">
                    {getContent('programs.credit360.desc', 'Mô hình trao đổi nghiệp vụ 360 độ hỗ trợ phòng Quan hệ khách hàng đẩy nhanh tiến độ phê duyệt.')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] mb-1.5">
                    <div className="p-2 bg-slate-100 rounded border text-slate-700 whitespace-pre-line">
                      {getContent('programs.credit360.corp_segment', '🏢 Phân khúc KHDN\nÁp dụng hồ sơ cấp mới/tái cấp có tổng GHTD từ 15 tỷ đồng trở lên.')}
                    </div>
                    <div className="p-2 bg-slate-100 rounded border text-slate-700 whitespace-pre-line">
                      {getContent('programs.credit360.retail_segment', '🛍️ Phân khúc KHBL\nÁp dụng hồ sơ cấp mới/tái cấp có tổng GHTD từ 10 tỷ đồng trở lên.')}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-700 bg-emerald-50 p-2 rounded border border-emerald-100">
                    <strong>Khung giờ ưu tiên:</strong> {getContent('programs.credit360.schedule_content', 'Từ 16h30 đến 17h30 hằng ngày, ưu tiên xử lý hồ sơ gấp.')}
                  </p>
                </div>

                {/* Connect & Technology */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h5 className="font-extrabold text-brand-royal uppercase text-[11px] mb-1">
                        5. {getContent('programs.connect.title', 'Kết Nối Cùng Phát Triển')}
                      </h5>
                      <p className="text-slate-600 leading-relaxed text-[10px] mb-1">
                        {getContent('programs.connect.desc', 'Chương trình BHY Connect nâng tầm hệ sinh thái đối tác kinh doanh cá nhân & doanh nghiệp.')}
                      </p>
                      <p className="text-[10px] text-slate-700 font-medium">
                        {getContent('programs.connect.competitive_title', '🌟 Lợi thế cạnh tranh:')} <span className="font-normal text-slate-500">{getContent('programs.connect.competitive_content', 'Bán hàng theo chuỗi cung ứng.')}</span>
                      </p>
                    </div>

                    <div>
                      <h5 className="font-extrabold text-brand-red uppercase text-[11px] mb-1">
                        {getContent('programs.technology.title', 'Văn Hóa Làm Việc Thông Minh')}
                      </h5>
                      <p className="text-slate-600 leading-relaxed text-[10px] italic mb-1">
                        "{getContent('programs.technology.quote', 'Công nghệ không chỉ là công cụ, mà là văn hóa làm việc thông minh.')}"
                      </p>
                      <div className="text-[9px] text-slate-600 space-y-1">
                        <div>
                          <strong>CX:</strong> {getContent('programs.technology.cx_desc', 'Welcome điện tử; Ký số 100%.')}
                        </div>
                        <div>
                          <strong>EX:</strong> {getContent('programs.technology.ex_desc', 'Kanban online MIRO, APC soạn thảo mẫu.')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section III: Master Moves */}
            <div className="mb-6 font-sans">
              <h3 className="text-sm font-black text-brand-royal uppercase border-l-4 border-brand-red pl-2 mb-3">
                III. BỘ 3 CHIÊU THỨC VẬN HÀNH (MASTER MOVES 2026)
              </h3>
              <p className="text-xs text-slate-600 mb-3">
                {getContent('moves.desc', 'Chuẩn hóa hành động từ khâu truyền lửa ngày mới, thiết lập kế hoạch ma trận 5W2H cho đến phát triển nhân sự theo ma trận ngôi sao.')}
              </p>

              <div className="space-y-3 text-xs">
                {/* Chiêu 1 */}
                <div className="p-3 bg-red-50/40 rounded-xl border border-red-100">
                  <h4 className="font-bold text-brand-red uppercase text-xs mb-1">
                    Chiêu thức 1: {getContent('moves.move1.title', '"VietinBank - Năng lượng ngày mới!"')}
                  </h4>
                  <p className="text-slate-600 mb-2">
                    {getContent('moves.move1.desc', 'Thiết lập nếp sinh hoạt đầu ngày tại toàn bộ các phòng và phòng giao dịch trực thuộc.')}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[9px]">
                    <div className="p-1.5 bg-white rounded border border-red-100 text-slate-700 whitespace-pre-line">
                      {getContent('moves.move1.schedule1', '🌅 Sáng Thứ 2\n3-5 phút định hướng tuần, báo cáo nhanh KH đến hạn/tái đảo.')}
                    </div>
                    <div className="p-1.5 bg-white rounded border border-red-100 text-slate-700 whitespace-pre-line">
                      {getContent('moves.move1.schedule2', '⏰ Đầu giờ hằng ngày\nGhi nhận tiền gửi lớn hôm trước, rút kinh nghiệm món sụt giảm.')}
                    </div>
                    <div className="p-1.5 bg-white rounded border border-red-100 text-slate-700 whitespace-pre-line">
                      {getContent('moves.move1.schedule3', '👏 Kết thúc họp\nChụm tay vỗ tay vui vẻ hô vang khẩu hiệu quyết tâm.')}
                    </div>
                  </div>
                </div>

                {/* Chiêu 2 */}
                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                  <h4 className="font-bold text-brand-royal uppercase text-xs mb-1">
                    Chiêu thức 2: {getContent('moves.move2.title', 'Kế Hoạch — Hành Động (SWOT & 5W2H)')}
                  </h4>
                  <p className="text-slate-600 mb-1">
                    {getContent('moves.move2.desc', '“Bí kíp bỏ túi” để các Phòng thực hiện giao chỉ tiêu và lập kế hoạch hành động hiệu quả theo mô hình SWOT và công thức 5W2H.')}
                  </p>
                  <p className="text-[10px] italic text-slate-500 bg-white p-1.5 rounded border border-blue-100">
                    <strong>Châm ngôn:</strong> "{getContent('moves.move2.quote', 'Muốn làm, quyết làm thì cho làm. Muốn làm, quyết làm sẽ tìm cách để làm. Cái gì không đo lường được, không có deadline thì sẽ không kiểm soát được!')}"
                  </p>
                </div>

                {/* Chiêu 3 */}
                <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-100">
                  <h4 className="font-bold text-purple-800 uppercase text-xs mb-1">
                    Chiêu thức 3: {getContent('moves.move3.title', 'Phát Triển Nhân Sự & Ma Trận 4 Sao')}
                  </h4>
                  <p className="text-slate-600 mb-2">
                    {getContent('moves.move3.desc', 'Thiết lập chu trình phát triển cán bộ thực chất.')}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[9px] text-purple-900">
                    <div className="p-1.5 bg-white rounded border border-purple-100">
                      <strong>70% Thực chiến:</strong> {getContent('moves.move3.upskill_70', 'Học qua công việc thực tế hằng ngày trên Kanban/Miro')}
                    </div>
                    <div className="p-1.5 bg-white rounded border border-purple-100">
                      <strong>20% Kèm cặp:</strong> {getContent('moves.move3.upskill_20', 'Coaching 1-1, shadowing lãnh đạo hoặc cán bộ giỏi')}
                    </div>
                    <div className="p-1.5 bg-white rounded border border-purple-100">
                      <strong>10% Đào tạo:</strong> {getContent('moves.move3.upskill_10', 'Đào tạo số, bóc tách văn bản, quiz kiểm tra MyGenie')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section IV: Sao Xung Dang */}
            <div className="mb-6 font-sans">
              <h3 className="text-sm font-black text-brand-royal uppercase border-l-4 border-brand-red pl-2 mb-3">
                IV. CHƯƠNG TRÌNH THI ĐUA "SAO XỨNG ĐÁNG 2026"
              </h3>
              <p className="text-xs text-slate-600 mb-3">
                {getContent('sao2026.desc', 'Thi đua lập thành tích chào mừng kỷ niệm 20 năm thành lập Chi nhánh VietinBank Bắc Hưng Yên.')}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-3 text-center">
                <div className="p-2 bg-amber-50 rounded border border-amber-200">
                  <span className="text-base font-black text-amber-700 block">{getContent('sao2026.stars_count', '412')}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">{getContent('sao2026.stars_label', 'Ngôi Sao Phân Bổ')}</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                  <span className="text-base font-black text-emerald-700 block">{getContent('sao2026.kpi_points', '+0.5')}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">{getContent('sao2026.kpi_label', 'Điểm KPI / 1 Sao')}</span>
                </div>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs">
                <div className="flex justify-between items-center mb-1 border-b pb-1 font-bold">
                  <span className="text-brand-red uppercase">{getContent('sao2026.reward_title', 'TỦ QUÀ TẶNG 500 TRIỆU ĐỒNG')}</span>
                  <span className="text-rose-900 bg-rose-100 px-1.5 py-0.5 rounded text-[9px]">{getContent('sao2026.reward_badge', '>=8 Sao: Đóng dấu "ĐÃ ĐỔI QUÀ"')}</span>
                </div>
                <p className="text-[10px] text-slate-700 leading-relaxed whitespace-pre-line">
                  {getContent('sao2026.rules_content', '• Với các mốc từ 1 đến 6 Sao: Cán bộ được đổi thưởng và vẫn được tích lũy giá trị Sao để lên các mốc cao hơn.\n• Với mốc từ 08 Sao trở lên: Khi đổi quà sẽ đóng dấu “ĐÃ ĐỔI QUÀ” và dừng tích lũy tiếp lên mốc cao.\n• Phòng TCTH là đầu mối mua sắm quà tặng, không cố định loại quà, linh hoạt theo sở thích cán bộ.')}
                </p>
              </div>
            </div>

            {/* Section V: Recent Uploaded Items */}
            <div className="mb-6 font-sans">
              <h3 className="text-sm font-black text-brand-royal uppercase border-l-4 border-brand-red pl-2 mb-3">
                V. TƯ LIỆU ĐÓNG GÓP TIÊU BIỂU TRONG KỲ
              </h3>
              <div className="space-y-2 text-xs">
                {items.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">Chưa có tài liệu đóng góp nào được tải lên hệ thống.</p>
                ) : (
                  items.slice(0, 5).map((it, idx) => (
                    <div key={it.id} className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800 text-[11px]">{idx + 1}. {it.title}</span>
                        <span className="text-[10px] text-slate-500 block">Tác giả: {it.author} ({it.department})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-brand-royal text-[9px] font-bold shrink-0">
                        #{it.tags[0] || 'BHY'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section VI: Contact */}
            <div className="mb-8 font-sans">
              <h3 className="text-sm font-black text-brand-royal uppercase border-l-4 border-brand-red pl-2 mb-3">
                VI. THÔNG TIN LIÊN HỆ & ĐẦU MỐI ĐƯỜNG DÂY NÓNG
              </h3>
              <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-600">
                <div className="p-2 rounded bg-slate-50 border">
                  <strong className="text-slate-800 block text-[10px] mb-0.5">{getContent('contact.card1.title', 'Trụ sở chính Chi nhánh')}</strong>
                  <span>{getContent('contact.card1.desc', 'Phố Nối, Thị xã Mỹ Hào, Tỉnh Hưng Yên')}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border">
                  <strong className="text-slate-800 block text-[10px] mb-0.5">{getContent('contact.card2.title', 'Đầu mối Tổng đài hỗ trợ')}</strong>
                  <span>{getContent('contact.card2.desc', 'Hotline: 0221 3943 888')}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border">
                  <strong className="text-slate-800 block text-[10px] mb-0.5">{getContent('contact.card3.title', 'Hộp thư điện tử chính thức')}</strong>
                  <span>{getContent('contact.card3.desc', 'Email: bhy@vietinbank.vn')}</span>
                </div>
              </div>
              <p className="text-[10px] italic text-brand-royal mt-2">
                * {getContent('contact.badge', 'Cam kết phản hồi trong vòng 04 giờ làm việc đối với mọi yêu cầu đăng ký thông tin trực tuyến.')}
              </p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 text-center pt-6 border-t border-slate-200 font-sans">
              <div>
                <span className="text-xs font-bold uppercase block">Phòng Tổ Chức Tổng Hợp</span>
                <span className="text-[10px] italic text-slate-500 block mb-14">(Đầu mối tham mưu tổng hợp)</span>
                <span className="text-xs font-bold underline">Trần Thị Thu Hà</span>
              </div>

              <div>
                <span className="text-xs font-black uppercase text-brand-royal block">GIÁM ĐỐC CHI NHÁNH</span>
                <span className="text-[10px] italic text-slate-500 block mb-14">(Phê duyệt & Ban hành)</span>
                <span className="text-xs font-black text-brand-royal">Trần Đức Anh</span>
              </div>
            </div>

            <div className="mt-12 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 font-sans">
              Tài liệu lưu hành nội bộ VietinBank Chi nhánh Bắc Hưng Yên • Bảo mật thông tin khách hàng & Dữ liệu ngân hàng
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
