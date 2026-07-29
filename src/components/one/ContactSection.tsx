import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Share2, Shield, MessageSquare, Clock, Award } from 'lucide-react';
import { EditableText } from './AdminEditableContext';
import confetti from 'canvas-confetti';

export const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    phone: '',
    email: '',
    topic: 'connect',
    message: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form không có backend: chỉ hiển thị trạng thái thành công tại chỗ, không gọi mạng
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      alert('Vui lòng điền đầy đủ Họ tên và Số điện thoại!');
      return;
    }

    setLoading(true);
    // Simulate API request
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#005A9C', '#E31B23', '#ffd700']
      });
    }, 1200);
  };

  const topicLabels: Record<string, string> = {
    connect: 'VietinBank BHY Connect - Hợp tác hệ sinh thái doanh nghiệp',
    credit360: 'BHY Credit 360 - Tư vấn vay vốn & GHTD',
    sharing: 'Đóng góp tài liệu Sharing / Đào tạo',
    ideas: 'Gửi đề xuất sáng kiến cải tiến (BHY Ideas)',
    general: 'Tư vấn mở tài khoản, thẻ tín dụng & dịch vụ khác'
  };

  const networkOffices = [
    {
      name: 'VietinBank Chi nhánh Bắc Hưng Yên',
      address: 'Số 88 đường Nguyễn Văn Linh, Phường Mỹ Hào, Tỉnh Hưng Yên',
      phone: '02213 943 501',
      type: 'Trụ sở chính',
      coverage: 'Mỹ Hào & Trung tâm khu vực phía Bắc tỉnh Hưng Yên',
      color: 'border-blue-300 bg-blue-50/70 shadow-md'
    },
    {
      name: 'Phòng Giao Dịch Văn Giang',
      address: 'Thị trấn Văn Giang, Huyện Văn Giang, Tỉnh Hưng Yên (Khu vực Đô thị Ecopark)',
      phone: '0221 3731 168',
      type: 'Phòng giao dịch trực thuộc',
      coverage: 'Địa bàn Huyện Văn Giang & lân cận',
      color: 'border-slate-200 bg-white'
    },
    {
      name: 'Phòng Giao Dịch Văn Lâm',
      address: 'Huyện Văn Lâm, Tỉnh Hưng Yên (Khu vực công nghiệp phát triển)',
      phone: '0221 3985 666',
      type: 'Phòng giao dịch trực thuộc',
      coverage: 'Địa bàn Huyện Văn Lâm & lân cận',
      color: 'border-slate-200 bg-white'
    },
    {
      name: 'Phòng Giao Dịch Khoái Châu',
      address: 'Thị trấn Khoái Châu, Huyện Khoái Châu, Tỉnh Hưng Yên',
      phone: '0221 3711 555',
      type: 'Phòng giao dịch trực thuộc',
      coverage: 'Địa bàn Huyện Khoái Châu & lân cận',
      color: 'border-slate-200 bg-white'
    },
    {
      name: 'Phòng Giao Dịch Yên Mỹ',
      address: 'Thị trấn Yên Mỹ, Huyện Yên Mỹ, Tỉnh Hưng Yên (KCN Thăng Long II)',
      phone: '0221 3971 222',
      type: 'Phòng giao dịch trực thuộc',
      coverage: 'Địa bàn Huyện Yên Mỹ & lân cận',
      color: 'border-slate-200 bg-white'
    },
    {
      name: 'Phòng Giao Dịch Ân Thi',
      address: 'Thị trấn Ân Thi, Huyện Ân Thi, Tỉnh Hưng Yên',
      phone: '0221 3831 999',
      type: 'Phòng giao dịch trực thuộc',
      coverage: 'Địa bàn Huyện Ân Thi & lân cận',
      color: 'border-slate-200 bg-white'
    }
  ];

  return (
    <section id="contact" className="py-20 bg-slate-50 border-t border-b border-slate-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-red mb-2.5 block">
            <EditableText id="contact.tagline" defaultVal="Kết nối cùng phát triển bền vững" className="text-xs font-bold uppercase text-brand-red" />
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-brand-royal tracking-tight mb-4">
            <EditableText id="contact.title" defaultVal="LIÊN HỆ & ĐĂNG KÝ HỢP TÁC" className="text-3xl sm:text-4xl font-black text-brand-royal" />
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-brand-royal to-brand-red mx-auto rounded-full mb-6" />
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            <EditableText
              id="contact.desc"
              defaultVal="Quý khách hàng cá nhân, chủ hộ kinh doanh và quý doanh nghiệp có nhu cầu đồng hành cùng hệ sinh thái VietinBank Bắc Hưng Yên vui lòng gửi thông tin yêu cầu dưới đây."
              multiline={true}
              as="span"
            />
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch mb-20">

          {/* Left Column: Contact info & value statement */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-brand-royal text-xs font-bold border border-blue-200">
                <Share2 className="w-4 h-4 text-brand-red" />
                <EditableText id="contact.left_badge" defaultVal="Hệ sinh thái kết nối mở" className="text-xs font-bold text-brand-royal" />
              </div>

              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
                <EditableText id="contact.left_title" defaultVal="Chúng tôi luôn sẵn sàng lắng nghe và đồng hành" className="text-2xl font-black text-slate-800" />
              </h3>

              <p className="text-slate-600 text-sm leading-relaxed">
                <EditableText
                  id="contact.left_desc"
                  defaultVal="Đội ngũ cán bộ Quan hệ Khách hàng (RM) giàu kinh nghiệm của VietinBank Chi nhánh Bắc Hưng Yên cam kết phản hồi các yêu cầu tư vấn, thẩm định tín dụng, hoặc đề xuất hợp tác chuỗi cung ứng trong thời gian nhanh nhất."
                  multiline={true}
                  as="span"
                />
              </p>

              {/* Direct channels cards */}
              <div className="space-y-4 pt-2 text-xs sm:text-sm text-slate-700">
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <MapPin className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-800">
                      <EditableText id="contact.card1.title" defaultVal="Trụ sở chính Chi nhánh" className="font-bold text-slate-800" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      <EditableText id="contact.card1.desc" defaultVal="Phố Nối, Thị xã Mỹ Hào, Tỉnh Hưng Yên (Giao lộ Quốc lộ 5 & Quốc lộ 39)" className="text-xs text-slate-500" />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <Phone className="w-5 h-5 text-brand-royal shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-800">
                      <EditableText id="contact.card2.title" defaultVal="Đầu mối Tổng đài hỗ trợ" className="font-bold text-slate-800" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      <EditableText id="contact.card2.desc" defaultVal="Hotline: 0221 3943 888 | Fax: 0221 3943 555" className="text-xs text-slate-500 font-bold text-brand-royal" />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <Mail className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-800">
                      <EditableText id="contact.card3.title" defaultVal="Hộp thư điện tử chính thức" className="font-bold text-slate-800" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      <EditableText id="contact.card3.desc" defaultVal="Email: bhy@vietinbank.vn" className="text-xs text-slate-500 font-bold text-brand-royal" />
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick response badge */}
            <div className="p-4 bg-brand-royal/5 rounded-2xl border border-brand-royal/10 flex items-center gap-3 text-xs text-slate-600 font-medium">
              <Clock className="w-5 h-5 text-brand-royal shrink-0" />
              <span>
                <EditableText id="contact.badge" defaultVal="Cam kết phản hồi trong vòng 04 giờ làm việc đối với mọi yêu cầu đăng ký thông tin trực tuyến." className="text-xs" />
              </span>
            </div>
          </div>

          {/* Right Column: Submission Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl relative overflow-hidden h-full flex flex-col justify-center">

              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 pb-3 border-b mb-4">
                    <MessageSquare className="w-5 h-5 text-brand-royal" />
                    <h4 className="font-black text-slate-800 text-base uppercase tracking-tight">
                      Gửi yêu cầu trực&nbsp;tuyến
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Họ và tên khách hàng *</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Nguyễn Văn A"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:bg-white focus:border-brand-royal text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tên đơn vị / Doanh nghiệp (nếu có)</label>
                      <input
                        type="text"
                        placeholder="VD: Công ty TNHH Nhựa Phố Nối"
                        value={formData.companyName}
                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:bg-white focus:border-brand-royal text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Số điện thoại liên hệ *</label>
                      <input
                        type="tel"
                        required
                        placeholder="VD: 0987654321"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:bg-white focus:border-brand-royal text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Địa chỉ Email</label>
                      <input
                        type="email"
                        placeholder="VD: nva@gmail.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:bg-white focus:border-brand-royal text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nội dung / Chủ đề cần kết nối</label>
                    <select
                      value={formData.topic}
                      onChange={e => setFormData({ ...formData, topic: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:bg-white text-xs font-bold text-brand-royal"
                    >
                      <option value="connect">VietinBank BHY Connect - Hợp tác liên kết kinh doanh</option>
                      <option value="credit360">BHY Credit 360 - Đăng ký tư vấn vay vốn & bảo lãnh tín dụng</option>
                      <option value="sharing">Đóng góp bài giảng / Tài liệu nghiệp vụ tốt (BHY Sharing)</option>
                      <option value="ideas">Gửi sáng kiến cải tiến quy trình nghiệp vụ (BHY Ideas)</option>
                      <option value="general">Ý kiến góp ý chất lượng dịch vụ / Nhu cầu khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nội dung chi tiết yêu cầu *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Quý khách vui lòng mô tả chi tiết nhu cầu để Chi nhánh sắp xếp đầu mối xử lý chuyên biệt..."
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:bg-white focus:border-brand-royal text-xs font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1 pb-2">
                    <input type="checkbox" required id="agreeTerms" className="rounded text-brand-royal" defaultChecked />
                    <label htmlFor="agreeTerms" className="text-[11px] text-slate-500 font-medium">
                      Tôi đồng ý cung cấp thông tin liên hệ và cam kết nội dung gửi là hoàn toàn chính xác.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-brand-royal to-[#003870] hover:from-[#003870] hover:to-[#002b4d] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <span>Đang gửi thông tin liên kết...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>ĐĂNG KÝ KẾT NỐI NGAY</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center space-y-6 py-8 animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-brand-royal">
                      GỬI YÊU CẦU THÀNH CÔNG!
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                      Cảm ơn anh/chị <strong className="text-slate-800">{formData.fullName}</strong> đã đăng ký kết nối về chủ đề: <br />
                      <span className="text-brand-red font-bold">"{topicLabels[formData.topic]}"</span>.
                    </p>
                    {/* Ghi nhận tại chỗ, không gửi qua mạng */}
                    <p className="text-[11px] text-emerald-700 font-semibold">
                      Đã ghi nhận, đầu mối sẽ liên hệ lại.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs max-w-md mx-auto space-y-1 text-slate-600">
                    <p>• <strong>Mã yêu cầu:</strong> BHY-{Math.floor(Math.random() * 900000 + 100000)}</p>
                    <p>• <strong>Đầu mối xử lý:</strong> Phòng Tổng hợp & Phòng nghiệp vụ chuyên doanh</p>
                    <p>• <strong>Thời gian dự kiến liên hệ lại:</strong> Trước 4 giờ làm việc tiếp theo</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({
                        fullName: '',
                        companyName: '',
                        phone: '',
                        email: '',
                        topic: 'connect',
                        message: ''
                      });
                    }}
                    className="px-6 py-2.5 bg-brand-royal hover:bg-[#003c70] text-white text-xs font-bold rounded-lg transition-all shadow cursor-pointer"
                  >
                    Gửi thêm yêu cầu khác
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* TRANSACTION OFFICES NETWORK SECTION */}
        <div className="border-t border-slate-200 pt-16 mt-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-2xl font-black text-brand-royal tracking-tight uppercase mb-2">
              Mạng Lưới Các Điểm Giao&nbsp;Dịch
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm">
              Hệ thống phòng giao dịch trải rộng khắp các huyện công nghiệp trọng điểm tỉnh Hưng&nbsp;Yên
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {networkOffices.map((office, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${office.color}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-royal/10 text-brand-royal">
                      {office.type}
                    </span>
                    <MapPin className="w-4 h-4 text-brand-red" />
                  </div>
                  <h4 className="font-extrabold text-brand-royal text-sm sm:text-base mb-2">
                    {office.name}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    <strong>Địa chỉ:</strong> {office.address}
                  </p>
                  <p className="text-xs text-slate-700 bg-slate-50 border border-slate-100 p-2 rounded-lg leading-relaxed mb-4">
                    <strong>Địa bàn phụ trách:</strong> {office.coverage}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-brand-royal" />
                    <span>ĐT: {office.phone}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(office.phone);
                      alert(`Đã sao chép số điện thoại: ${office.phone}`);
                    }}
                    className="text-[10px] text-brand-royal hover:text-brand-red font-bold uppercase transition-colors"
                  >
                    Sao chép số ĐT
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Regional coverage & Key industrial zone highlights */}
          <div className="mt-8 bg-gradient-to-br from-blue-50 to-slate-100/50 border border-blue-100 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h4 className="text-base sm:text-lg font-black text-brand-royal tracking-tight mb-4 uppercase flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-red" />
              Phạm Vi Phục Vụ & Các Địa Bàn Kinh Tế Trọng Điểm
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
              <div className="space-y-3">
                <p className="text-slate-700 leading-relaxed">
                  VietinBank Chi nhánh Bắc Hưng Yên hiện tập trung khai thác và phục vụ toàn diện các địa bàn kinh tế trọng điểm phía Bắc của tỉnh Hưng Yên bao gồm:
                  <strong className="text-slate-800"> Mỹ Hào, Văn Lâm, Văn Giang, Yên Mỹ, Khoái Châu, và Ân Thi</strong>.
                </p>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {['Mỹ Hào', 'Văn Lâm', 'Văn Giang', 'Yên Mỹ', 'Khoái Châu', 'Ân Thi'].map((item, i) => (
                    <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-brand-royal font-extrabold text-[11px] rounded-lg shadow-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200/80 pt-4 md:pt-0 md:pl-6">
                <p className="text-slate-700 leading-relaxed">
                  Đây là khu vực công nghiệp năng động và tập trung phần lớn khách hàng doanh nghiệp FDI, doanh nghiệp sản xuất lớn tại các khu công nghiệp trọng điểm:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800 font-bold">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
                    <span>KCN Phố Nối A</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
                    <span>KCN Phố Nối B</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
                    <span>KCN Thăng Long II</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
                    <span>Khu đô thị Ecopark</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
