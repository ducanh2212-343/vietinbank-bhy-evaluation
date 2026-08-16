import React, { useMemo, useState } from 'react';
import { Crown, Trash2, UserPlus, Users } from 'lucide-react';
import { useActiveProfiles, useCouncilMembers } from './useIdeaCouncil';

// Quản lý đội hình Hội đồng BHY Ideas — học nguyên khung CouncilMembersTab của
// Hội đồng đầu mối: thêm từ hồ sơ đang hoạt động, tạm ngưng bằng is_active
// (giữ phiếu đã chấm), cờ Chủ tịch (vượt khóa xem tổng hợp + bấm công bố).
// Danh sách này là MẪU SỐ của quorum 2/3 — giữ đúng thực tế nhân sự.

export const IdeaCouncilMembers: React.FC = () => {
  const { members, isLoading, themThanhVien, capNhatThanhVien, xoaThanhVien } = useCouncilMembers(true);
  const { profiles } = useActiveProfiles(true);
  const [profileId, setProfileId] = useState('');
  const [note, setNote] = useState('');

  const chuaLaThanhVien = useMemo(() => {
    const daCo = new Set(members.map(m => m.profileId));
    return profiles.filter(p => !daCo.has(p.id));
  }, [profiles, members]);

  const soHoatDong = members.filter(m => m.isActive).length;

  return (
    <div className="space-y-3 text-xs">
      <p className="font-black text-slate-800 flex items-center gap-1.5">
        <Users className="w-4 h-4 text-amber-500" />
        Thành viên Hội đồng ({soHoatDong} đang hoạt động)
      </p>
      <p className="text-[10px] text-slate-500">
        Giám đốc quyết định thành phần từng thời kỳ — TCTH cập nhật tại đây. Danh sách đang hoạt
        động là <b>mẫu số quorum 2/3</b>: người nghỉ dài hạn hãy tắt «Hoạt động» thay vì xóa
        (xóa mất luôn lịch sử ai từng thuộc Hội đồng; phiếu đã chấm vẫn được giữ).
      </p>

      <form
        onSubmit={e => {
          e.preventDefault();
          if (!profileId) return;
          void themThanhVien(profileId, note).then(() => {
            setProfileId('');
            setNote('');
          });
        }}
        className="flex flex-wrap items-end gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
      >
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="font-bold text-slate-700 block">Thêm cán bộ vào Hội đồng</label>
          <select
            value={profileId}
            onChange={e => setProfileId(e.target.value)}
            className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-semibold"
          >
            <option value="">-- Chọn cán bộ --</option>
            {chuaLaThanhVien.map(p => (
              <option key={p.id} value={p.id}>
                {p.full_name}{p.position ? ` — ${p.position}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[140px] space-y-1">
          <label className="font-bold text-slate-700 block">Ghi chú</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="VD: bổ sung theo QĐ của GĐ"
            className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-medium"
          />
        </div>
        <button
          type="submit"
          disabled={!profileId}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-bold shadow-sm transition-all cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Thêm</span>
        </button>
      </form>

      {isLoading ? (
        <p className="text-slate-400 italic text-center py-3">Đang tải danh sách…</p>
      ) : (
        <div className="space-y-1">
          {members.map(m => (
            <div
              key={m.id}
              className={`flex flex-wrap items-center gap-2 p-2 rounded-lg border ${m.isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-60'}`}
            >
              <span className="font-bold text-slate-700 flex items-center gap-1">
                {m.isChair && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                {m.fullName}
              </span>
              <span className="text-[10px] text-slate-500 flex-1 min-w-[120px]">{m.position}{m.note ? ` · ${m.note}` : ''}</span>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer" title="Chủ tịch Hội đồng: vượt khóa xem tổng hợp khi đang chấm + bấm công bố kết quả">
                <input
                  type="checkbox"
                  checked={m.isChair}
                  onChange={e => void capNhatThanhVien(m.id, { isChair: e.target.checked })}
                  className="accent-amber-500"
                />
                Chủ tịch
              </label>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer" title="Tắt = tạm ngưng (không chấm, không tính vào quorum), phiếu cũ vẫn giữ">
                <input
                  type="checkbox"
                  checked={m.isActive}
                  onChange={e => void capNhatThanhVien(m.id, { isActive: e.target.checked })}
                  className="accent-emerald-600"
                />
                Hoạt động
              </label>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Xóa ${m.fullName} khỏi Hội đồng? Nếu chỉ tạm ngưng, hãy tắt «Hoạt động» thay vì xóa.`)) {
                    void xoaThanhVien(m.id);
                  }
                }}
                className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                title="Xóa khỏi Hội đồng"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-slate-400 italic text-center py-3">Chưa có thành viên nào — thêm ở trên.</p>
          )}
        </div>
      )}
    </div>
  );
};
