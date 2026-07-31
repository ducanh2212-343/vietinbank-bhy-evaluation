import React, { useState } from 'react';
import { usePortalSlotImages } from './usePortalSlotImages';
import { Link } from 'react-router-dom';
import { Target, Users, Flame, ArrowRight, Sparkles, Upload, Star } from 'lucide-react';
import { EditableText, useAdminEditable } from './AdminEditableContext';
import confetti from 'canvas-confetti';
import { STAR_PROFILES } from '@/data/one/mockData';
import { StarType } from '@/data/one/types';
import { Move3FrameworkViewer } from './Move3FrameworkViewer';

interface MasterMovesProps {
  onOpenUpload: (cat: string) => void;
}

// Ảnh minh họa mặc định cho từng chiêu thức (giữ nguyên từ nguồn)
const DEFAULT_MOVE_IMAGES: Record<string, string[]> = {
  move1: ['https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80'],
  move2: ['https://i.ibb.co/CsStV1xg/image-11.png'],
  move3: ['https://i.ibb.co/CsStV1xg/image-11.png'],
  sao2026: ['https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80']
};

export const MasterMoves: React.FC<MasterMovesProps> = ({ onOpenUpload }) => {
  // Quyền sửa lấy từ context chung (tcth_admin/system_admin)
  const { isAdmin } = useAdminEditable();
  const [activeMove, setActiveMove] = useState<'move1' | 'move2' | 'move3' | 'sao2026'>('move1');

  // Gallery ảnh chiêu thức lưu ở bảng portal_images (slot 'move.<id>')
  const { images: moveImages, handleImageUpload: handleMoveImageUpload } =
    usePortalSlotImages('move', DEFAULT_MOVE_IMAGES);

  const renderAdminMoveUploader = (moveId: string, index: number) => {
    if (!isAdmin) return null;
    return (
      <div className="absolute bottom-2 right-2 z-10 bg-black/75 backdrop-blur-sm p-1.5 rounded-lg border border-white/20 shadow flex items-center gap-1.5">
        <label className="text-[10px] font-bold text-white cursor-pointer hover:text-amber-300 flex items-center gap-1 select-none">
          <Upload className="w-3 h-3 text-brand-red" />
          <span>Đổi ảnh</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  if (event.target?.result) {
                    handleMoveImageUpload(moveId, index, event.target.result as string);
                    confetti({ particleCount: 30, spread: 40 });
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </label>
        <span className="text-white/30 text-xs">|</span>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Nhập URL hình ảnh trực tuyến:");
            if (url) {
              handleMoveImageUpload(moveId, index, url);
              confetti({ particleCount: 30, spread: 40 });
            }
          }}
          className="text-[10px] font-bold text-white hover:text-amber-300 cursor-pointer"
        >
          URL
        </button>
      </div>
    );
  };

  // --- Move 1 State ---
  const [energyCount, setEnergyCount] = useState(142);
  const [shouting, setShouting] = useState(false);

  // --- Move 2 5W2H Builder State ---
  const [wWhat, setWWhat] = useState('');
  const [wWhy, setWWhy] = useState('');
  const [wWho, setWWho] = useState('');
  const [wHow, setWHow] = useState('');
  const [wWhen, setWWhen] = useState('Trước 30/06/2026');
  const [wWhere, setWWhere] = useState('Tại quầy PGD');
  const [wHowMuch, setWHowMuch] = useState('Tăng 5 tỷ CASA');
  const [planGenerated, setPlanGenerated] = useState(false);

  // --- Move 3 Star Simulator State ---
  const [perfScore, setPerfScore] = useState<number>(85); // 0-100
  const [attitudeScore, setAttitudeScore] = useState<number>(90); // 0-100

  const triggerShout = () => {
    setShouting(true);
    setEnergyCount(c => c + 1);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ed1b24', '#004b93', '#ffbf00']
    });
    setTimeout(() => setShouting(false), 2000);
  };

  // Determine Star Category based on sliders
  const determineStar = (): StarType => {
    const isHighPerf = perfScore >= 65;
    const isHighAttitude = attitudeScore >= 65;
    if (isHighPerf && isHighAttitude) return 'sao_mai';
    if (isHighPerf && !isHighAttitude) return 'sao_băng';
    if (!isHighPerf && isHighAttitude) return 'sao_khuê';
    return 'sao_hôm';
  };

  const currentStarObj = STAR_PROFILES[determineStar()];

  return (
    <section id="moves" className="py-16 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-navy mb-2 block">
            <EditableText id="moves.tag" defaultVal="Kỷ Luật & Năng Suất Vượt Trội 2026" className="font-bold uppercase text-xs" />
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-brand-red tracking-tight mb-4">
            <EditableText id="moves.title" defaultVal="BỘ 3 CHIÊU THỨC VẬN HÀNH" className="font-black text-3xl sm:text-4xl uppercase" />
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            <EditableText
              id="moves.desc"
              defaultVal="Chuẩn hóa hành động từ khâu truyền lửa ngày mới, thiết lập kế hoạch ma trận 5W2H cho đến phát triển nhân sự theo ma trận ngôi sao."
              multiline={true}
              as="span"
            />
          </p>
        </div>

        {/* Move Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            {
              id: 'move1',
              num: 'Chiêu thức số 1',
              title: 'Năng Lượng Ngày Mới',
              focus: 'Trọng tâm: Huy Động Vốn',
              icon: Flame,
              bg: 'from-red-500 to-amber-500'
            },
            {
              id: 'move2',
              num: 'Chiêu thức số 2',
              title: 'Lập Kế Hoạch 5W2H',
              focus: 'Trọng tâm: KHHĐ & TOWS',
              icon: Target,
              bg: 'from-blue-600 to-cyan-500'
            },
            {
              id: 'move3',
              num: 'Chiêu thức số 3',
              title: 'Phát Triển Nhân Sự',
              focus: 'Trọng tâm: 38 Skill & 4 Sao',
              icon: Users,
              bg: 'from-purple-600 to-indigo-600'
            },
            {
              id: 'sao2026',
              num: 'Động Lực VHDN',
              title: 'Sao Xứng Đáng 2026',
              focus: 'Trọng tâm: Tủ Quà 500 Triệu',
              icon: Star,
              bg: 'from-amber-500 via-amber-600 to-yellow-600'
            }
          ].map((card) => {
            const Icon = card.icon;
            const isActive = activeMove === card.id;
            return (
              <div
                key={card.id}
                onClick={() => setActiveMove(card.id as 'move1' | 'move2' | 'move3' | 'sao2026')}
                className={`cursor-pointer rounded-2xl p-6 transition-all border relative overflow-hidden flex flex-col justify-between ${
                  isActive
                    ? 'bg-white border-brand-navy shadow-xl ring-2 ring-brand-navy scale-[1.02]'
                    : 'bg-white/80 border-slate-200 hover:border-slate-300 shadow-sm hover:bg-white'
                }`}
              >
                {isActive && <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${card.bg}`} />}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">{card.num}</span>
                    <div className={`p-2 rounded-xl bg-gradient-to-r ${card.bg} text-white shadow-sm`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-1">{card.title}</h3>
                  <span className="text-xs font-bold text-brand-red">{card.focus}</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-brand-navy">
                  <span>{isActive ? 'Đang mở mô phỏng' : 'Nhấp để xem'}</span>
                  <ArrowRight className={`w-4 h-4 transition-transform ${isActive ? 'translate-x-1' : ''}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Master Move Panel */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl min-h-[480px]">

          {/* MOVE 1: ENERGY SHOUT */}
          {activeMove === 'move1' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-brand-red text-xs font-bold">
                  <Flame className="w-4 h-4 text-amber-500 animate-bounce" />
                  <EditableText id="moves.move1.subject" defaultVal="Chủ điểm năm 2026: HUY ĐỘNG VỐN NET" className="font-bold text-xs" />
                </div>
                <h3 className="text-2xl sm:text-4xl font-black text-slate-800 tracking-tight">
                  <EditableText id="moves.move1.title" defaultVal='"VietinBank - Năng lượng ngày mới!"' className="font-black text-2xl sm:text-4xl" />
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  <EditableText
                    id="moves.move1.desc"
                    defaultVal="Thiết lập nếp sinh hoạt đầu ngày tại toàn bộ các phòng và phòng giao dịch trực thuộc. Truyền lửa tinh thần hăng say trước giờ làm việc."
                    multiline={true}
                    as="span"
                  />
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <EditableText id="moves.move1.schedule1" defaultVal="🌅 Sáng Thứ 2&#10;3-5 phút định hướng tuần, báo cáo nhanh KH đến hạn/tái đảo." className="whitespace-pre-line text-xs" multiline={true} as="div" />
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <EditableText id="moves.move1.schedule2" defaultVal="⏰ Đầu giờ hằng ngày&#10;Ghi nhận tiền gửi lớn hôm trước, rút kinh nghiệm món sụt giảm." className="whitespace-pre-line text-xs" multiline={true} as="div" />
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <EditableText id="moves.move1.schedule3" defaultVal="👏 Kết thúc họp&#10;Chụm tay vỗ tay vui vẻ hô vang khẩu hiệu quyết tâm." className="whitespace-pre-line text-xs" multiline={true} as="div" />
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex justify-start pt-2">
                    <button onClick={() => onOpenUpload('move1')} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-red hover:underline cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> Chia sẻ video hô khẩu hiệu của phòng bạn
                    </button>
                  </div>
                )}
              </div>

              {/* Energy Shout Animator */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-red-50/50 to-amber-50/50 rounded-2xl border-2 border-dashed border-red-200 relative text-center space-y-4">
                <div className="relative w-full h-40 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                  <img src={moveImages.move1[0]} alt="BHY Energy Shout" className="w-full h-full object-cover" />
                  {renderAdminMoveUploader('move1', 0)}
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Điểm Danh Năng Lượng Khối Phòng</span>

                {/* Huge Shout Button */}
                <button
                  onClick={triggerShout}
                  className={`relative group w-44 h-44 rounded-full bg-gradient-to-tr from-brand-red via-red-600 to-amber-500 text-white shadow-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    shouting ? 'scale-110 ring-8 ring-red-300' : 'hover:scale-105 hover:shadow-red-500/30'
                  }`}
                >
                  <Flame className="w-12 h-12 mb-1 animate-pulse text-amber-300" />
                  <span className="font-black text-sm tracking-tight uppercase px-4 leading-tight">
                    HÔ VANG <br/> KHẨU HIỆU!
                  </span>
                  <div className="absolute -inset-2 rounded-full border-2 border-red-400 opacity-0 group-hover:opacity-100 transition-opacity animate-ping pointer-events-none" />
                </button>

                {shouting && (
                  <div className="mt-6 text-xl sm:text-2xl font-black text-brand-red tracking-tight animate-bounce">
                    "VIETINBANK - NĂNG LƯỢNG NGÀY MỚI!" 🔥
                  </div>
                )}

                <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-white rounded-full border shadow-sm text-xs font-extrabold text-slate-700">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Đã có <span className="text-brand-red text-sm">{energyCount}</span> lượt truyền lửa trong tuần này!</span>
                </div>
              </div>
            </div>
          )}

          {/* MOVE 2: 5W2H BUILDER */}
          {activeMove === 'move2' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-brand-navy text-xs font-bold">
                  <Target className="w-4 h-4" />
                  <EditableText id="moves.move2.subject" defaultVal="Trọng tâm: Giao đúng người - đúng việc" className="font-bold text-xs text-brand-navy" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-brand-navy uppercase tracking-tight">
                  <EditableText id="moves.move2.title" defaultVal="Kế Hoạch — Hành Động (SWOT & 5W2H)" className="font-black text-2xl sm:text-3xl" />
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  <EditableText
                    id="moves.move2.desc"
                    defaultVal="“Bí kíp bỏ túi” để các Phòng thực hiện giao chỉ tiêu và lập kế hoạch hành động hiệu quả, từ việc đánh giá các vấn đề nội tại theo mô hình SWOT, đến việc kết hợp các yếu tố theo ma trận TOWS, và từ đó đưa ra các hành động cụ thể theo công thức 5W2H (What, Why, When, Where, Who, How, How much) giúp các Phòng xác định nhiệm vụ trọng tâm và có những action hiệu quả, đầu mối PDCA định kỳ dễ dàng và có tính định lượng. Triển khai và duy trì từ Tháng 2/2024."
                    multiline={true}
                    as="span"
                  />
                </p>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-950 space-y-2">
                  <span className="font-extrabold text-brand-navy uppercase block">
                    <EditableText id="moves.move2.quote_title" defaultVal="💡 Châm ngôn Chiêu thức 2:" className="font-extrabold text-brand-navy uppercase text-xs" />
                  </span>
                  <p className="italic">
                    “<EditableText
                      id="moves.move2.quote"
                      defaultVal="Muốn làm, quyết làm thì cho làm. Muốn làm, quyết làm sẽ tìm cách để làm. Cái gì không đo lường được, không có deadline thì sẽ không kiểm soát được!"
                      multiline={true}
                      as="span"
                    />”
                  </p>
                </div>

                {/* Illustrative SWOT Planning Photo */}
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                  <img src={moveImages.move2[0]} alt="Lập kế hoạch chiến lược SWOT" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                    <span className="text-[11px] font-bold text-white uppercase">Chiến lược TOWS / 5W2H</span>
                  </div>
                  {renderAdminMoveUploader('move2', 0)}
                </div>

                {isAdmin && (
                  <button onClick={() => onOpenUpload('move2')} className="inline-flex items-center gap-1 text-xs font-bold text-brand-navy hover:underline cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Tải lên bảng phân giao chỉ tiêu của đơn vị
                  </button>
                )}
              </div>

              {/* Interactive 5W2H Builder */}
              <div className="lg:col-span-7 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <span className="font-black text-xs uppercase text-slate-800">Trình Xây Dựng Kế Hoạch Ma Trận 5W2H</span>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold">Chiêu Thức #2 Tool</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">1. What? (Làm nội dung gì):</label>
                    <input type="text" placeholder="VD: Thúc đẩy KH phát hành thẻ tín dụng..." value={wWhat} onChange={e => setWWhat(e.target.value)} className="w-full p-2 bg-white border rounded" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">2. Why? (Ý nghĩa / Tại sao):</label>
                    <input type="text" placeholder="VD: Đóng GAP chỉ tiêu phí dịch vụ bán lẻ..." value={wWhy} onChange={e => setWWhy(e.target.value)} className="w-full p-2 bg-white border rounded" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">3. Who? (Ai chịu trách nhiệm):</label>
                    <input type="text" placeholder="VD: RM Nguyễn Văn A & Giao dịch viên..." value={wWho} onChange={e => setWWho(e.target.value)} className="w-full p-2 bg-white border rounded" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">4. How? (Làm như thế nào):</label>
                    <input type="text" placeholder="VD: Gọi điện khách ưu tiên theo tệp CRM..." value={wHow} onChange={e => setWHow(e.target.value)} className="w-full p-2 bg-white border rounded" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">5. When? (Thời hạn Deadline):</label>
                    <input type="text" value={wWhen} onChange={e => setWWhen(e.target.value)} className="w-full p-2 bg-white border rounded font-semibold text-red-600" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">6. Where? (Địa điểm thực hiện):</label>
                    <input type="text" value={wWhere} onChange={e => setWWhere(e.target.value)} className="w-full p-2 bg-white border rounded" />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="font-bold text-slate-700 block mb-1">7. How much? (Số lượng bao nhiêu / Chỉ số đo lường):</label>
                  <input type="text" value={wHowMuch} onChange={e => setWHowMuch(e.target.value)} className="w-full p-2 bg-white border rounded font-bold text-brand-navy" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPlanGenerated(true);
                    confetti({ particleCount: 50, spread: 60 });
                  }}
                  className="w-full py-2.5 rounded-xl bg-brand-navy text-white font-bold text-xs hover:bg-blue-800 transition-all shadow"
                >
                  Xuất bản kế hoạch hành động 5W2H mẫu
                </button>

                {planGenerated && (
                  <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-xs text-emerald-950 font-mono">
                    ✅ ĐÃ KẾ HOẠCH HÓA CÔNG VIỆC: [{wWhat || 'Mục tiêu chỉ tiêu bán hàng'}] được giao cho [{wWho || 'Cán bộ phụ trách'}], hoàn thành trước [{wWhen}] với chỉ số định lượng [{wHowMuch}]. Đủ chuẩn kẹp file giám sát Chiêu thức số 2!
                  </div>
                )}

                {/* Liên kết sang tính năng Kanban thật của cổng */}
                <div className="mt-3 text-right">
                  <Link
                    to="/hanh-dong-phat-trien"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-navy hover:underline"
                  >
                    Lập kế hoạch hành động thật trên Kanban →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* MOVE 3: STAR MATRIX */}
          {activeMove === 'move3' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-bold">
                  <Users className="w-4 h-4 text-purple-600" />
                  <EditableText id="moves.move3.subject" defaultVal="Chiêu Thức Số 3: Chuẩn Hóa Năng Lực" className="font-bold text-xs" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-purple-800 uppercase tracking-tight">
                  <EditableText id="moves.move3.title" defaultVal="Phát Triển Nhân Sự & Ma Trận 4 Sao" className="font-black text-2xl sm:text-3xl text-purple-800" />
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  <EditableText
                    id="moves.move3.desc"
                    defaultVal="Thiết lập chu trình phát triển cán bộ thực chất: tự đánh giá BM01 định kỳ từng quý, bám sát lộ trình huấn luyện 70% thực chiến — 20% kèm cặp — 10% đào tạo và phân nhóm nhân sự theo Ma trận Ngôi Sao (Phụ lục 1)."
                    multiline={true}
                    as="span"
                  />
                </p>

                {/* Upskill 70-20-10 Box */}
                <div className="bg-gradient-to-br from-purple-800 via-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-md space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/20">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                      <EditableText id="moves.move3.upskill_title" defaultVal="🧭 Nguyên Tắc Upskill 70-20-10:" className="font-black text-xs uppercase" />
                    </span>
                    <span className="text-xs font-mono bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded font-bold">Chốt 2-3 Skill Quý</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="font-black text-amber-300 w-8">70%:</span>
                      <EditableText id="moves.move3.upskill_70" defaultVal="Học qua công việc thực tế hằng ngày trên Kanban/Miro (tiếp KH, làm tờ trình...)" className="text-xs text-purple-100" />
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-black text-cyan-300 w-8">20%:</span>
                      <EditableText id="moves.move3.upskill_20" defaultVal="Học qua kèm cặp (Coaching 1-1), shadowing lãnh đạo hoặc cán bộ giỏi phòng" className="text-xs text-purple-100" />
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-black text-emerald-300 w-8">10%:</span>
                      <EditableText id="moves.move3.upskill_10" defaultVal="Đào tạo số, bóc tách văn bản, làm quiz kiểm tra kiến thức MyGenie" className="text-xs text-purple-100" />
                    </div>
                  </div>
                </div>

                {/* Illustrative Coaching Photo */}
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                  <img src={moveImages.move3[0]} alt="Đánh giá phản hồi 1-1" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
                    <span className="text-[11px] font-bold text-white uppercase">Kèm Cặp & Khai Vấn Đội Ngũ Thực Chất</span>
                  </div>
                  {renderAdminMoveUploader('move3', 0)}
                </div>

                {isAdmin && (
                  <button onClick={() => onOpenUpload('move3')} className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:underline cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Tải lên hồ sơ đánh giá năng lực của đơn vị
                  </button>
                )}
              </div>

              {/* Interactive Star Matrix Simulator */}
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-purple-200 shadow-md">
                <div className="flex items-center justify-between mb-6 pb-3 border-b">
                  <span className="font-black text-xs uppercase text-slate-800">Mô Phỏng Phân Nhóm Cán Bộ (Phụ lục 1)</span>
                  <span className="text-[10px] bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-extrabold">Chiêu Thức #3 Matrix</span>
                </div>

                {/* Sliders Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-xs">
                  <div className="bg-slate-50 p-4 rounded-xl border">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold text-slate-700">Hiệu quả công việc (KPI):</span>
                      <span className="font-black text-brand-navy text-sm">{perfScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={perfScore}
                      onChange={e => setPerfScore(Number(e.target.value))}
                      className="w-full accent-brand-navy cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Thấp</span><span>Cao (&gt;=65%)</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold text-slate-700">Kỹ năng / Phối hợp / Thái độ:</span>
                      <span className="font-black text-purple-700 text-sm">{attitudeScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={attitudeScore}
                      onChange={e => setAttitudeScore(Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Hạn chế</span><span>Tốt (&gt;=65%)</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Quadrant Result Display */}
                <div className={`p-5 rounded-2xl border-2 transition-all ${currentStarObj.bgColor} ${currentStarObj.borderColor}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xl sm:text-2xl font-black tracking-tight ${currentStarObj.iconColor}`}>
                      {currentStarObj.name}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white font-black text-xs shadow-sm border text-slate-700">
                      {currentStarObj.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 italic mb-3">
                    "{currentStarObj.managementMetaphor}"
                  </p>

                  <div className="space-y-2 text-xs pt-3 border-t border-slate-200/60">
                    <div>
                      <strong className="text-slate-900">Đặc điểm nhận diện: </strong>
                      <span className="text-slate-700">{currentStarObj.traits}</span>
                    </div>
                    <div>
                      <strong className="text-purple-900">🧭 Định hướng quản trị & IDP: </strong>
                      <span className="text-slate-800 font-semibold">{currentStarObj.strategy}</span>
                    </div>
                  </div>
                </div>

                {/* Liên kết sang trang phân nhóm 4 Sao thật của cổng */}
                <div className="mt-3 text-right">
                  <Link
                    to="/phan-nhom-can-bo"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-navy hover:underline"
                  >
                    Xem phân nhóm 4 Sao thật →
                  </Link>
                </div>
              </div>
              </div>
              <Move3FrameworkViewer />
            </div>
          )}

          {/* SAO 2026: một chức năng một cửa — chương trình Sao Xứng Đáng
              nằm ở khu Ghi nhận & Lan tỏa, tab này chỉ là thẻ dẫn hướng */}
          {activeMove === 'sao2026' && (
            <div className="mt-12 bg-gradient-to-b from-amber-50/60 via-white to-amber-50/40 rounded-3xl p-8 sm:p-12 border-2 border-amber-300 shadow-xl text-center animate-fade-in">
              <Star className="w-14 h-14 mx-auto fill-amber-400 text-amber-500 mb-4" />
              <h3 className="text-2xl sm:text-3xl font-black text-brand-navy uppercase mb-3">
                Sao Xứng Đáng 2026
              </h3>
              <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed mb-6">
                Chương trình ghi nhận «mọi cán bộ ghi nhận lẫn nhau»: gửi phiếu sao,
                bảng phân tích cá nhân/phòng ban và tủ quà tặng 500 triệu đồng — tất cả
                nằm ở khu Ghi nhận &amp; Lan tỏa của cổng BHY ONE.
              </p>
              <Link
                to="/one/ghi-nhan"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-black text-sm shadow-lg transition-all hover:-translate-y-0.5"
              >
                Vào khu Ghi nhận &amp; Lan tỏa
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

        </div>
      </div>
    </section>
  );
};
