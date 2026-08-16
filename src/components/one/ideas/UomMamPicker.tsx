import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Info, Sprout } from 'lucide-react';
import { HO_SO_PHONG_SANG_IDEAS } from '@/data/one/ideasConfig';
import {
  LY_DO_THUONG_LABELS,
  MOC_HOI_TO_THUONG,
  TRAN_UOM_MAM_MOI_TUAN,
  dauTuan,
  dienGiaiTien,
  suatUomMamConLai,
} from '@/lib/ideaRewards';
import {
  cacTuanGanDay,
  useMyDepartmentForIdeas,
  useUomMamActions,
  useYTuongTheoTuan,
} from './useUomMamPicker';

// Màn "Trưởng phòng chọn ý tưởng Ươm mầm" — tính năng theo chỉ đạo 08/2026:
// phòng nào vượt trần thì Trưởng phòng phải LỰA CHỌN ý tưởng nào được ghi
// nhận, để KPI đo lường chuẩn. Cán bộ vẫn gửi ý tưởng không giới hạn.

const nhanTuan = (tuan: string): string => {
  const d = new Date(`${tuan}T00:00:00`);
  const cuoi = new Date(d);
  cuoi.setDate(cuoi.getDate() + 6);
  const f = (x: Date) => `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`;
  return `Tuần ${f(d)} – ${f(cuoi)}/${d.getFullYear()}`;
};

export const UomMamPicker: React.FC = () => {
  const { phongHoSo, laLanhDaoPhong, isAdmin, isLoading: loadingDept } = useMyDepartmentForIdeas();
  const tuanList = useMemo(() => cacTuanGanDay(12), []);
  const [tuan, setTuan] = useState(() => dauTuan(new Date()));
  const [phongChon, setPhongChon] = useState<string>('');

  // Lãnh đạo phòng: khóa vào phòng của mình. Admin TCTH: chọn phòng bất kỳ.
  const phongCuaToi = phongHoSo ? HO_SO_PHONG_SANG_IDEAS[phongHoSo] ?? null : null;
  const phongIdeas = isAdmin ? (phongChon || phongCuaToi) : phongCuaToi;

  const { items, isLoading } = useYTuongTheoTuan(phongIdeas, tuan);
  const { chon, boChon } = useUomMamActions(phongIdeas, tuan);

  // Chỉ ý tưởng do PHÒNG chọn mới chiếm suất; ý tưởng SMP/TSC ghi nhận thì không
  const daChiemSuat = items.filter(
    i => i.award?.ghiNhanKpi && i.award.nguonGhiNhan === 'phong_chon',
  ).length;
  const suat = suatUomMamConLai(daChiemSuat);

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
          Chọn ý tưởng Ươm mầm — {phongIdeas}
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
        <span className={`ml-auto px-2.5 py-1 rounded-full text-[11px] font-black ${suat.het ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
          Đã ghi nhận {suat.daDung}/{TRAN_UOM_MAM_MOI_TUAN} suất tuần này
        </span>
      </div>

      <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-[11px] text-sky-900 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Mỗi tuần phòng được ghi nhận tối đa <b>{TRAN_UOM_MAM_MOI_TUAN} ý tưởng</b> Ươm mầm — đây là
          con số tính vào <b>KPI Đổi mới sáng tạo</b>, phải đúng hạn mức để KPI đo lường chuẩn.
          Cán bộ vẫn gửi ý tưởng không giới hạn và mọi ý tưởng đều được lưu, vinh danh.
          Riêng ý tưởng gửi <b>trước {new Date(`${MOC_HOI_TO_THUONG}T00:00:00`).toLocaleDateString('vi-VN')}</b> vẫn
          được <b>thưởng tiền khuyến khích</b> kể cả khi không nằm trong hạn mức.
        </span>
      </div>

      {isLoading ? (
        <p className="text-slate-400 italic text-center py-4">Đang tải ý tưởng…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-400 italic text-center py-4">Tuần này phòng chưa có ý tưởng nào được gửi.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(it => {
            const ghiNhan = !!it.award?.ghiNhanKpi;
            const quaSmp = it.award?.nguonGhiNhan === 'smp_tsc';
            // Ý tưởng đã được SMP/TSC ghi nhận thì Trưởng phòng không cần (và
            // không được) chọn lại — ghi nhận đó đến từ Trụ sở chính
            const khoa = quaSmp || (!ghiNhan && suat.het);
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
                  onClick={() => void (ghiNhan ? boChon(it.id) : chon(it.id))}
                  title={
                    quaSmp ? 'SMP (Trụ sở chính) đã ghi nhận — không cần phòng chọn'
                      : khoa ? 'Hết suất tuần này — bỏ chọn một ý tưởng khác trước'
                      : ghiNhan ? 'Bỏ ghi nhận' : 'Ghi nhận Ươm mầm'
                  }
                  className={`flex-shrink-0 transition-all ${khoa ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
                >
                  {ghiNhan
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    : <Circle className="w-5 h-5 text-slate-300" />}
                </button>

                <div className="flex-1 min-w-[180px]">
                  <p className="font-bold text-slate-700 leading-snug">{it.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {it.proposer} · gửi {new Date(it.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>

                {ghiNhan && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${quaSmp ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}
                    title={quaSmp ? 'TSC đã phê duyệt trên SMP — ghi nhận theo quy chế, không chiếm suất tuần' : 'Phòng chọn trong hạn mức tuần'}
                  >
                    ✓ Tính KPI{quaSmp ? ' · SMP/TSC' : ''}
                  </span>
                )}
                {it.award && it.award.mucThuong > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                    title={LY_DO_THUONG_LABELS[it.award.lyDoThuong]}
                  >
                    💰 {dienGiaiTien(it.award.mucThuong, it.award.mucThuong)}
                  </span>
                )}
                {it.award && it.award.mucThuong === 0 && !ghiNhan && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                    Ghi nhận, chưa chi thưởng
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
