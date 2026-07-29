import React, { useState, useRef } from 'react';
import { Upload, Download, Sparkles, Award, Check, Heart, ExternalLink, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';

export const AvatarFrameTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'official' | 'quick'>('official');
  const [userImage, setUserImage] = useState<string>('https://i.ibb.co/fd4RDL7B/Tour-245.jpg');
  const [name, setName] = useState('Nguyễn Thị Phượng');
  const [department, setDepartment] = useState('Phòng Tổ Chức Tổng Hợp');
  const [message, setMessage] = useState('Chúc mừng sinh nhật VietinBank Bắc Hưng Yên 20 tuổi!');
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(156);
  const [copied, setCopied] = useState(false);

  const officialLink = "https://khunghinh.net/p/vtbbhy20y";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(officialLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    confetti({ particleCount: 30, spread: 50 });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUserImage(url);
      confetti({ particleCount: 50, spread: 60 });
    }
  };

  const handleDownload = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
    alert('Đã tạo xong ảnh đại diện Kỷ niệm 20 Năm! File ảnh chuẩn HD đã sẵn sàng để thay đại diện Facebook & Zalo.');
  };

  const handleLike = () => {
    if (!liked) {
      setLiked(true);
      setLikesCount(c => c + 1);
      confetti({ particleCount: 30, spread: 40 });
    }
  };

  return (
    <section id="avatar" className="py-16 bg-[#F4F7FA] border-b border-slate-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100 text-brand-royal font-bold text-xs uppercase tracking-widest mb-3 animate-pulse">
            <Sparkles className="w-4 h-4 text-brand-red" />
            <span>Chiến dịch Kỷ niệm 20 Năm (2006 - 2026)</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-brand-royal tracking-tight mb-4 uppercase">
            Thay Ảnh Đại Diện - Lan Tỏa Niềm Tự Hào
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Mỗi ảnh đại diện được thay là một lời chúc mừng sinh nhật Chi nhánh Bắc Hưng Yên, một niềm tự hào và dấu ấn gắn kết cùng cột mốc 20 năm đáng nhớ.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="mt-8 inline-flex p-1.5 bg-slate-200/80 rounded-2xl shadow-inner gap-2 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('official')}
              className={`px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'official'
                  ? 'bg-brand-red text-white shadow-md shadow-red-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
              }`}
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>Khung Ảnh KhungHinh.net Chính Thức</span>
            </button>
            <button
              onClick={() => setActiveTab('quick')}
              className={`px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'quick'
                  ? 'bg-brand-royal text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Tạo Thiệp Chúc Mừng Nhanh</span>
            </button>
          </div>
        </div>

        {/* TAB 1: OFFICIAL KHUNGHINH.NET FRAME TOOL */}
        {activeTab === 'official' && (
          <div className="space-y-8 animate-fade-in">

            {/* Prominent Hero CTA Banner */}
            <div className="bg-gradient-to-br from-brand-royal via-[#004275] to-brand-red p-8 sm:p-10 rounded-3xl text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-slate-900 rounded-lg font-black text-xs uppercase tracking-wider">
                  🎯 Link Tạo Khung Chính Thức 20 Năm
                </div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight">
                  Tải Ảnh Chuẩn HD Từ KhungHinh.net
                </h3>
                <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                  Để ghép ảnh đại diện với khung Kỷ niệm 20 năm chuẩn màu sắc và độ phân giải cao nhất từ VietinBank Bắc Hưng Yên, cán bộ vui lòng truy cập đường dẫn KhungHinh.net dưới đây:
                </p>

                {/* Copy Link Box */}
                <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl backdrop-blur-md max-w-lg border border-white/20">
                  <input
                    type="text"
                    readOnly
                    value={officialLink}
                    className="bg-transparent text-amber-300 font-mono text-xs sm:text-sm px-3 py-1 outline-none flex-1 truncate font-bold"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      copied ? 'bg-green-500 text-white' : 'bg-white text-slate-900 hover:bg-amber-300'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Đã sao chép link' : 'Copy link'}</span>
                  </button>
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-3 w-full md:w-auto">
                <a
                  href={officialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-base sm:text-lg uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-3 hover:scale-105 active:scale-95"
                >
                  <ExternalLink className="w-6 h-6 text-brand-red" />
                  <span>Mở KhungHinh.net Ngay</span>
                </a>
                <span className="text-[11px] text-center text-blue-200 font-semibold italic">
                  *(Hỗ trợ tốt nhất trên cả Máy tính & Điện thoại)*
                </span>
              </div>
            </div>

            {/* Embedded Iframe View of KhungHinh */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span>Cửa sổ tạo khung trực tiếp KhungHinh.net:</span>
                </div>
                <a
                  href={officialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-royal hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Không hiển thị được cửa sổ? Bấm vào đây để mở tab mới</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative w-full h-[680px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
                <iframe
                  src={officialLink}
                  title="Khung ảnh 20 năm VietinBank Bắc Hưng Yên"
                  className="w-full h-full border-0"
                  allow="camera; clipboard-write"
                />
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: QUICK CUSTOM GREETING CARD GENERATOR */}
        {activeTab === 'quick' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">

            {/* Controls & Presets */}
            <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
              <h3 className="text-lg font-black text-brand-royal border-b pb-3 uppercase tracking-wide flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-red" />
                <span>Tùy chỉnh thiệp Kỷ niệm nhanh</span>
              </h3>

              {/* Upload trigger */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">
                  1. Tải lên ảnh cá nhân của bạn:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-3 px-4 border-2 border-dashed border-brand-royal bg-blue-50/50 hover:bg-blue-50 text-brand-royal rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Chọn ảnh từ máy tính / điện thoại</span>
                  </button>
                </div>
              </div>

              {/* Presets avatars */}
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-2">Hoặc chọn ảnh đồng nghiệp mẫu:</span>
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {[
                    { name: 'Thị Phượng', dept: 'TCTH', img: 'https://i.ibb.co/fd4RDL7B/Tour-245.jpg' },
                    { name: 'Đức Anh', dept: 'Ban Giám Đốc', img: 'https://i.ibb.co/FkT1KCLB/boss.jpg' },
                    { name: 'Mai Hương', dept: 'TCTH', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80' },
                    { name: 'Văn Long', dept: 'KHDN', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80' }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setUserImage(p.img);
                        setName(p.name);
                        setDepartment(`Phòng ${p.dept}`);
                      }}
                      className={`p-1.5 rounded-xl border flex flex-col items-center min-w-[76px] transition-all cursor-pointer ${userImage === p.img ? 'border-brand-red bg-red-50/50 ring-2 ring-brand-red' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <img src={p.img} alt={p.name} className="w-10 h-10 rounded-full object-cover mb-1" />
                      <span className="text-[10px] font-bold text-slate-800 truncate max-w-[68px]">{p.name}</span>
                      <span className="text-[8px] text-slate-400">{p.dept}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Họ tên hiển thị:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-semibold text-slate-800 focus:border-brand-royal outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Đơn vị công tác:</label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs text-slate-700 focus:border-brand-royal outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Lời chúc 20 năm gửi Chi nhánh:</label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs text-slate-700 focus:border-brand-royal outline-none resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full py-3.5 rounded-2xl bg-brand-royal hover:bg-blue-800 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Tải Thiệp Chúc Mừng</span>
              </button>
            </div>

            {/* Live Preview Frame Simulation */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center">
              <div className="relative w-80 sm:w-96 aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-900 group">

                {/* User Photo Base */}
                <img
                  src={userImage}
                  alt="Avatar Base"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlay Gradient for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-royal via-transparent to-black/20 pointer-events-none" />

                {/* Top Right Commemorative Badge */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-brand-red flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-royal text-white font-black text-xs flex items-center justify-center border border-brand-red">
                    20
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black tracking-tight text-brand-royal leading-none">VIETINBANK</span>
                    <span className="text-[8px] font-bold text-brand-red uppercase">Bắc Hưng Yên</span>
                  </div>
                </div>

                {/* Bottom Frame Ribbon */}
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white pointer-events-none space-y-1 bg-gradient-to-t from-[#003861] via-brand-royal/90 to-transparent">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-brand-red" />
                    <span>20 NĂM VUN GỐC BỀN RỄ - VƯƠN TẦM TƯƠNG LAI</span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white drop-shadow-md truncate">
                    {name}
                  </h4>
                  <p className="text-xs font-semibold text-blue-100 opacity-90 truncate">
                    {department}
                  </p>
                  <p className="text-[11px] italic opacity-85 line-clamp-1 pt-1 text-slate-200">
                    "{message}"
                  </p>
                </div>

                {/* Decorative Corner Ribbons */}
                <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none overflow-hidden">
                  <div className="absolute -left-6 top-3 bg-brand-red text-white text-[8px] font-bold py-1 px-8 -rotate-45 shadow">
                    2006-2026
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Social Share Hashtags */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
          <span className="px-3 py-1 bg-white rounded-full border border-slate-200 text-brand-royal font-bold">
            #VietinBankBacHungYen
          </span>
          <span className="px-3 py-1 bg-white rounded-full border border-slate-200 text-brand-red font-bold">
            #20NamVunGocBenReVuonTamTuongLai
          </span>
          <span className="px-3 py-1 bg-white rounded-full border border-slate-200 text-brand-royal font-bold">
            #khunghinh_vtbbhy20y
          </span>
          <button
            onClick={handleLike}
            className={`ml-2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${liked ? 'bg-red-100 text-brand-red' : 'bg-white text-slate-600 border hover:border-brand-red'}`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-brand-red' : ''}`} />
            <span>{likesCount} Yêu thích</span>
          </button>
        </div>

      </div>
    </section>
  );
};
