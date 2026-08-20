import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Handshake, Info, Send, Sprout } from 'lucide-react';
import { HO_SO_PHONG_SANG_IDEAS } from '@/data/one/ideasConfig';
import {
  LY_DO_THUONG_LABELS,
  MOC_HOI_TO_THUONG,
  dauTuan,
  dienGiaiTien,
  suatUomMamConLai,
} from '@/lib/ideaRewards';
import {
  cacTuanGanDay,
  useCauHinhIdeas,
  useMyDepartmentForIdeas,
  useUomMamActions,
  useYTuongTheoTuan,
} from './useUomMamPicker';
import { useBenReActions } from './useBenRe';

// Màn "Chốt ý tưởng Ươm mầm" — tính năng theo chỉ đạo 08/2026: phòng nào vượt
// trần thì phải LỰA CHỌN ý tưởng nào được ghi nhận, để KPI đo lường chuẩn.
// Cán bộ vẫn gửi ý tưởng không giới hạn.
//
// Quyền chốt đọc từ cấu hình `bhy_ideas_cau_hinh.ai_chon_uom_mam`:
//   'tcth'         — Phòng TCTH tạm giữ quyền, chốt với Trưởng phòng rồi đánh
//                    dấu (hiện hành). Trưởng phòng vẫn mở màn này xem được
//                    phòng mình đang được ghi nhận những ý tưởng nào.
//   'truong_phong' — trả quyền về từng Trưởng phòng.

const nhanTuan = (tuan: string): string => {
  const d = new Date(`${tuan}T00:00:00`);
  const cuoi = new Date(d);
  cuoi.setDate(cuoi.getDate() + 6);
  const f = (x: Date) => `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`;
  return `Tuần ${f(d)} – ${f(cuoi)}/${d.getFullYear()}`;
};

export const UomMamPicker: React.FC = () => {
  const { phongHoSo, laLanhDaoPhong, isAdmin, isLoading: loadingDept } = useMyDepartmentForIdeas();
  const { cauHinh } = useCauHinhIdeas();
  const tuanList = useMemo(() => cacTuanGanDay(12), []);
  const [tuan, setTuan] = useState(() => dauTuan(new Date()));
  const [phongChon, setPhongChon] = useState<string>('');
  const [daChotVoiTp, setDaChotVoiTp] = useState(false);
  const [ghiChuChot, setGhiChuChot] = useState('');

  // Lãnh đạo phòng: khóa vào phòng của mình. Admin TCTH: chọn phòng bất kỳ.
  const phongCuaToi = phongHoSo ? HO_SO_PHONG_SANG_IDEAS[phongHoSo] ?? null : null;
  const phongIdeas = isAdmin ? (phongChon || phongCuaToi) : phongCuaToi;

  const { items, isLoading } = useYTuongTheoTuan(phongIdeas, tuan);
  const { chon, boChon } = useUomMamActions(phongIdeas, tuan);
  const { trinh } = useBenReActions();

  // Quyền CHỐT theo công tắc cấu hình — trùng đúng hàm gác của CSDL
  const tcthGiuQuyen = cauHinh.aiChonUomMam === 'tcth';
  const duocChot = isAdmin || (!tcthGiuQuyen && laLanhDaoPhong);

  // Chỉ suất do CHI NHÁNH duyệt mới chiếm hạn mức; TSC duyệt trên SMP thì không
  const daChiemSuat = items.filter(i => i.award?.ghiNhanKpi && i.award.duyetCn).length;
  const suat = suatUomMamConLai(daChiemSuat, cauHinh.tranUomMamMoiTuan);

  if (loadingDept) {
    return <p className="text-xs text-slate-400 italic py-4 text-center">Đang đọc hồ sơ…</p>;
  }
  if (!laLanhDaoPhong && !isAdmin) return null;
  if (!phongIdeas) {
    return (
      <p className="text-xs text-slate-500 italic py-4">
        Hồ sơ của bạn chưa gắn Phòng/Ban trong hệ thống Ideas — liên hệ Phòng TCTH để cập nhật.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-black text-slate-800 flex items-center gap-1.5">
          <Sprout className="w-4 h-4 text-emerald-500" />
          {duocChot ? 'Chốt ý tưởng Ươm mầm' : 'Ý tưởng Ươm mầm được ghi nhận'} — {phongIdeas}
        </p>
        <select
          value={tuan}
          onChange={e => setTuan(e.target.value)}
          className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-bold text-slate-700"
        >
          {tuanList.map(t => (
            <option key={t} value={t}>{nhanTuan(t)}</option>
          ))}
        </select>
        {isAdmin && (
          <select
            value={phongChon}
            onChange={e => setPhongChon(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-semibold text-slate-700"
          >
            <option value="">— Phòng của tôi —</option>
            {Object.values(HO_SO_PHONG_SANG_IDEAS).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
        <span className={`ml-auto px-2.5 py-1 rounded-full text-2xs font-black ${suat.het ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
          Đã ghi nhận {suat.daDung}/{cauHinh.tranUomMamMoiTuan} suất tuần này
        </span>
      </div>

      <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-2xs text-sky-900 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Mỗi tuần phòng được ghi nhận tối đa <b>{cauHinh.tranUomMamMoiTuan} ý tưởng</b> Ươm mầm — đây là
          con số tính vào <b>KPI Đổi mới sáng tạo</b>, phải đúng hạn mức để KPI đo lường chuẩn.
          Cán bộ vẫn gửi ý tưởng không giới hạn và mọi ý tưởng đều được lưu, vinh danh.
          Riêng ý tưởng gửi <b>trước {new Date(`${MOC_HOI_TO_THUONG}T00:00:00`).toLocaleDateString('vi-VN')}</b> vẫn
          được <b>thưởng tiền khuyến khích</b> kể cả khi không nằm trong hạn mức.
        </span>
      </div>

      {tcthGiuQuyen && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-2xs text-amber-900 flex gap-2">
          <Handshake className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {isAdmin ? (
              <>
                <b>Phòng TCTH đang giữ quyền chốt</b> cấp Ươm mầm để hạn mức và KPI đi cùng
                một mối. Hãy <b>chốt với Trưởng phòng</b> trước khi đánh dấu, rồi tích ô bên
                dưới để lưu lại dấu vết đã trao đổi.
              </>
            ) : (
              <>
                Cấp Ươm mầm hiện do <b>Phòng TCTH</b> chốt sau khi trao đổi với Trưởng phòng —
                màn này để anh/chị theo dõi phòng mình đang được ghi nhận ý tưởng nào. Có ý
                kiến khác, liên hệ Phòng TCTH để chốt lại.
              </>
            )}
          </span>
        </div>
      )}

      {duocChot && tcthGiuQuyen && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={daChotVoiTp}
              onChange={e => setDaChotVoiTp(e.target.checked)}
              className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
            />
            Đã chốt với Trưởng phòng
          </label>
          <input
            type="text"
            value={ghiChuChot}
            onChange={e => setGhiChuChot(e.target.value)}
            placeholder="Chốt với ai, ngày nào (không bắt buộc)…"
            className="flex-1 min-w-[180px] p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500"
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-slate-400 italic text-center py-4">Đang tải ý tưởng…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-400 italic text-center py-4">Tuần này phòng chưa có ý tưởng nào được gửi.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(it => {
            const ghiNhan = !!it.award?.ghiNhanKpi;
            const duyetCn = !!it.award?.duyetCn;
            const duyetTsc = !!it.award?.duyetTsc;
            // TSC đã duyệt thì ý tưởng đã được ghi nhận sẵn — phòng không cần
            // tiêu suất cho nó nữa, nhưng vẫn chọn/bỏ chọn phía Chi nhánh được
            // (hai cờ độc lập, ghi nhận và tiền vẫn chỉ một lần).
            const khoa = !duocChot || (!duyetCn && suat.het);
            return (
              <div
                key={it.id}
                className={`flex flex-wrap items-center gap-2 p-2.5 rounded-xl border transition-all ${
                  ghiNhan ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'
                }`}
              >
                <button
                  type="button"
                  disabled={khoa}
                  onClick={() => void (duyetCn
                    ? boChon(it.id)
                    : chon(it.id, daChotVoiTp, ghiChuChot))}
                  title={
                    !duocChot ? 'Quyền chốt cấp Ươm mầm đang thuộc Phòng TCTH'
                      : khoa ? 'Hết suất tuần này — bỏ chọn một ý tưởng khác trước'
                      : duyetCn ? 'Bỏ chọn (thu lại suất của phòng)'
                      : duyetTsc ? 'TSC đã duyệt trên SMP — chọn thêm ở Chi nhánh nếu muốn'
                      : 'Ghi nhận Ươm mầm'
                  }
                  className={`flex-shrink-0 transition-all ${khoa ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
                >
                  {duyetCn
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    : <Circle className="w-5 h-5 text-slate-300" />}
                </button>

                <div className="flex-1 min-w-[180px]">
                  <p className="font-bold text-slate-700 leading-snug">{it.title}</p>
                  <p className="text-2xs text-slate-500">
                    {it.proposer} · gửi {new Date(it.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>

                {ghiNhan && (
                  <span
                    className="px-2 py-0.5 rounded-full text-2xs font-black bg-emerald-100 text-emerald-700"
                    title="Ý tưởng này được tính vào KPI Đổi mới sáng tạo"
                  >
                    ✓ Tính KPI
                  </span>
                )}
                {duyetCn && (
                  <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-slate-100 text-slate-600"
                    title="Chi nhánh duyệt — chiếm 1 suất hạn mức tuần của phòng">
                    CN duyệt
                  </span>
                )}
                {duyetTsc && (
                  <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-sky-100 text-sky-700"
                    title="TSC đã duyệt trên SMP — ghi nhận theo quy chế, không chiếm suất tuần của phòng">
                    TSC duyệt (SMP)
                  </span>
                )}
                {it.award?.chotVoiTp && (
                  <span
                    className="px-2 py-0.5 rounded-full text-2xs font-bold bg-violet-50 text-violet-700 border border-violet-200"
                    title={it.award.chotVoiTpGhiChu || 'TCTH đã chốt với Trưởng phòng trước khi ghi nhận'}
                  >
                    🤝 Đã chốt với TP
                  </span>
                )}
                {it.award && it.award.mucThuong > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-200"
                    title={LY_DO_THUONG_LABELS[it.award.lyDoThuong]}
                  >
                    💰 {dienGiaiTien(it.award.mucThuong, it.award.mucThuong)}
                  </span>
                )}
                {it.award && it.award.mucThuong === 0 && !ghiNhan && (
                  <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-500">
                    Ghi nhận, chưa chi thưởng
                  </span>
                )}

                {/* Bén rễ trình liên tục: TCTH trình thẳng từ đây, khỏi đi màn khác */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => void trinh(it.id)}
                    title="Trình Giám đốc xem xét công nhận cấp Bén rễ"
                    className="px-2 py-1 rounded-lg bg-[#005a9c]/10 hover:bg-[#005a9c]/20 text-[#005a9c] font-bold text-2xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Send className="w-3 h-3" /> Trình Bén rễ
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
