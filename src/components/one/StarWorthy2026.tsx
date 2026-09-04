import React from 'react';
import { Star, Gift, Award, Sparkles, Coffee, ShoppingBag, Headphones, Briefcase, Watch, Plane, Smartphone, ChevronRight, AlertCircle } from 'lucide-react';
import { EditableText } from './AdminEditableContext';

interface RewardTier {
  stars: number;
  name: string;
  maxVal: string;
  icon: React.ReactNode;
  color: string;
  isHighTier?: boolean;
}

const REWARDS_2026: RewardTier[] = [
  { stars: 1, name: 'Voucher Cafe / Ăn uống / Tiền mặt', maxVal: '100,000 đ', icon: <Coffee className="w-5 h-5 text-amber-600" />, color: 'bg-amber-50 border-amber-200 text-amber-900' },
  { stars: 3, name: 'Giftset VietinBank (Logo Chi nhánh)', maxVal: '300,000 đ', icon: <Gift className="w-5 h-5 text-blue-600" />, color: 'bg-blue-50 border-blue-200 text-blue-900' },
  { stars: 6, name: 'Voucher Siêu thị / Quà tặng tiện ích', maxVal: '500,000 đ', icon: <ShoppingBag className="w-5 h-5 text-emerald-600" />, color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  { stars: 8, name: 'Loa / Tai nghe Bluetooth chính hãng', maxVal: '1,500,000 đ', icon: <Headphones className="w-5 h-5 text-purple-600" />, color: 'bg-purple-50 border-purple-200 text-purple-900', isHighTier: true },
  { stars: 12, name: 'Túi xách / Giày công sở cao cấp', maxVal: '2,500,000 đ', icon: <Briefcase className="w-5 h-5 text-indigo-600" />, color: 'bg-indigo-50 border-indigo-200 text-indigo-900', isHighTier: true },
  { stars: 15, name: 'Apple Watch Series đời mới nhất', maxVal: '12,000,000 đ', icon: <Watch className="w-5 h-5 text-rose-600" />, color: 'bg-rose-50 border-rose-200 text-rose-900', isHighTier: true },
  { stars: 18, name: 'Voucher Du lịch (Vé máy bay + Khách sạn)', maxVal: '15,000,000 đ', icon: <Plane className="w-5 h-5 text-cyan-600" />, color: 'bg-cyan-50 border-cyan-200 text-cyan-900', isHighTier: true },
  { stars: 20, name: 'iPhone 18 Pro Max mới nhất', maxVal: '45,000,000 đ', icon: <Smartphone className="w-5 h-5 text-amber-500" />, color: 'bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-700 text-white shadow-lg border-amber-400', isHighTier: true },
];

/**
 * Phần GIỚI THIỆU chương trình Sao Xứng Đáng — chỉ nội dung đọc.
 *
 * Ô tặng sao, bảng tổng hợp và khu quản lý kho sao đã tách sang các màn riêng
 * (/one/ghi-nhan/tang-sao, /tong-hop, /quan-ly) — xem StarNav.tsx. Trước đây cả
 * bốn nằm chồng trong một trang: cán bộ muốn xem sao của mình phải cuộn qua khu
 * quản trị của Phòng TCTH.
 */
export const StarWorthy2026: React.FC = () => {

  return (
    <div className="mt-12 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 rounded-3xl p-6 sm:p-8 border-2 border-amber-300 shadow-xl text-left animate-fade-in">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-navy via-[#003870] to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-lg relative overflow-hidden mb-8">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Star className="w-64 h-64 fill-amber-400 text-amber-300" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider mb-3 shadow">
              <Sparkles className="w-4 h-4 text-red-600" />
              <EditableText id="sao2026.subject" defaultVal="Cải tiến VHDN Năm 2026" className="font-black text-xs uppercase" />
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-amber-300 uppercase tracking-tight">
              <EditableText id="sao2026.title" defaultVal="CHƯƠNG TRÌNH: SAO XỨNG ĐÁNG 2026" className="font-black text-2xl sm:text-4xl uppercase" />
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 mt-2 max-w-2xl leading-relaxed">
              <EditableText
                id="sao2026.desc"
                defaultVal="Thi đua lập thành tích chào mừng kỷ niệm 20 năm thành lập Chi nhánh VietinBank Bắc Hưng Yên. Mỗi ngôi sao trao đi là một lời tri ân sâu sắc, tích lũy điểm KPI và quy đổi tủ quà tặng lên tới 500 triệu đồng."
                multiline={true}
                as="span"
              />
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0 text-center">
            <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-md border border-white/20">
              <span className="text-2xl sm:text-3xl font-black text-amber-300 block">
                <EditableText id="sao2026.stars_count" defaultVal="412" className="font-black text-2xl sm:text-3xl text-amber-300" />
              </span>
              <span className="text-[10px] text-blue-200 font-bold block mt-0.5">
                <EditableText id="sao2026.stars_label" defaultVal="Ngôi Sao Phân Bổ" className="text-[10px] font-bold text-blue-200" />
              </span>
            </div>
            <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-md border border-white/20">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 block">
                <EditableText id="sao2026.kpi_points" defaultVal="+0.5" className="font-black text-2xl sm:text-3xl text-emerald-400" />
              </span>
              <span className="text-[10px] text-blue-200 font-bold block mt-0.5">
                <EditableText id="sao2026.kpi_label" defaultVal="Điểm KPI / 1 Sao" className="text-[10px] font-bold text-blue-200" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* CỘT TRÁI: PHÂN BỔ SAO THEO ĐƠN VỊ */}
        <div className="lg:col-span-6 space-y-6">
          {/* QUOTA BREAKDOWN TABLE (PAGE 3 PDF) */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="font-black text-xs uppercase text-brand-navy">📦 Phân Bổ 412 Sao Năm 2026 Theo Đơn Vị</span>
              <span className="text-[10px] font-mono text-slate-500">Giao trước mồng 5 đầu quý · Quý 1: trước 10/03/2026</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                    <th className="p-2.5 rounded-l-xl">Quy mô nhân sự</th>
                    <th className="p-2.5">Nhóm Phòng / Lãnh đạo</th>
                    <th className="p-2.5 text-right rounded-r-xl">Sao <span className="font-black">phát ra</span> / năm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  <tr>
                    <td className="p-2.5 font-bold text-slate-800">&gt;= 14 người (8 Sao/quý)</td>
                    <td className="p-2.5">Phòng TCTH (16), Phòng KHDN (14)</td>
                    <td className="p-2.5 text-right font-black text-brand-navy">32 Sao / phòng</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-800">10 - 13 người (6 Sao/quý)</td>
                    <td className="p-2.5">Phòng DVKH (13), P. Văn Lâm (12), P. Khoái Châu (10), P. Văn Giang (10), PGD Ocean City (10, tên cũ: P. Yên Mỹ)</td>
                    <td className="p-2.5 text-right font-black text-brand-navy">24 Sao / phòng</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-800">7 - 9 người (5 Sao/quý)</td>
                    <td className="p-2.5">Phòng Bán lẻ (9), P. Ân Thi (8), P. HTTD (7)</td>
                    <td className="p-2.5 text-right font-black text-brand-navy">20 Sao / phòng</td>
                  </tr>
                  <tr className="bg-amber-50/60">
                    <td className="p-2.5 font-black text-amber-900">Giám đốc (12 Sao/quý)</td>
                    <td className="p-2.5 font-bold text-slate-800">Giám đốc Chi nhánh</td>
                    <td className="p-2.5 text-right font-black text-red-600 text-sm">48 Sao</td>
                  </tr>
                  <tr className="bg-blue-50/50">
                    <td className="p-2.5 font-black text-blue-900">Phó GĐ (10 Sao/quý)</td>
                    <td className="p-2.5 font-bold text-slate-800">PGĐ N.Đ.Thái Hoàng, N.T.Thùy Linh, P. Minh Hải</td>
                    <td className="p-2.5 text-right font-black text-brand-navy text-sm">40 Sao / PGĐ</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 italic leading-relaxed">
              *Đây là số Sao mỗi đơn vị được <strong>phát ra</strong> trong năm, không phải chỉ tiêu Sao phải nhận về.
              Ngoài mức phân bổ này, cá nhân/tập thể còn được nhận Sao từ các chương trình, chiến dịch có gắn cơ chế Sao Xứng Đáng.
              <br />
              *Tập thể được nhận Sao có thể họp bàn và trao lại cho cán bộ trong phòng có đóng góp, tối đa bằng số Sao tập thể được nhận.
              Khi đã phân bổ, tập thể vẫn giữ nguyên điểm KPI nhưng <strong>số Sao đã phân bổ không còn giá trị quy đổi quà</strong> cho tập thể.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: TỦ QUÀ TẶNG 500 TRIỆU SHOWCASE */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b">
              <div>
                <span className="text-xs font-black uppercase text-red-600 block">
                  <EditableText id="sao2026.reward_tag" defaultVal="🎁 Danh Mục Thưởng Quy Định" className="text-xs font-black uppercase text-red-600 block" />
                </span>
                <h4 className="text-xl font-black text-brand-navy">
                  <EditableText id="sao2026.reward_title" defaultVal="TỦ QUÀ TẶNG 500 TRIỆU ĐỒNG" className="text-xl font-black text-brand-navy" />
                </h4>
              </div>
              <div className="bg-rose-100 text-rose-900 px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 self-start sm:self-auto">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <EditableText id="sao2026.reward_badge" defaultVal=">=8 Sao: Đóng dấu 'ĐÃ ĐỔI QUÀ'" className="text-[10px] font-extrabold text-rose-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {REWARDS_2026.map((rw, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] ${rw.color}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-white/80 shadow-sm shrink-0">
                      {rw.icon}
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-black/10 font-mono font-black text-xs shrink-0 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{rw.stars < 10 ? `0${rw.stars}` : rw.stars} SAO</span>
                    </span>
                  </div>

                  <div>
                    <h5 className="font-extrabold text-xs sm:text-sm leading-snug mb-1">{rw.name}</h5>
                    <div className="text-[11px] opacity-80 font-semibold">Giá trị tối đa:</div>
                    <div className="text-sm sm:text-base font-black tracking-tight">{rw.maxVal}</div>
                  </div>

                  {rw.isHighTier && (
                    <div className="mt-3 pt-2 border-t border-black/10 text-[10px] font-bold flex items-center justify-between">
                      <span>Mốc quy đổi cao cấp</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-slate-900 to-brand-navy p-5 rounded-2xl text-white text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-black uppercase">
                <Award className="w-4 h-4" />
                <EditableText id="sao2026.rules_title" defaultVal="Nguyên Tắc Tích Lũy & Quy Đổi" className="font-black uppercase text-amber-300" />
              </div>
              <div className="space-y-1.5 text-slate-200 text-[11px] leading-relaxed">
                <EditableText
                  id="sao2026.rules_content"
                  defaultVal="• Với các mốc từ 1 đến 6 Sao: Cán bộ được đổi thưởng và vẫn được tích lũy giá trị Sao để lên các mốc cao hơn.&#10;• Với mốc từ 08 Sao trở lên: Khi đổi quà sẽ đóng dấu “ĐÃ ĐỔI QUÀ” và dừng tích lũy tiếp lên mốc cao.&#10;• Phòng TCTH là đầu mối mua sắm quà tặng, không cố định loại quà, linh hoạt theo sở thích cán bộ trong ngưỡng ước tính."
                  multiline={true}
                  as="div"
                  className="whitespace-pre-line text-[11px] text-slate-200 leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
