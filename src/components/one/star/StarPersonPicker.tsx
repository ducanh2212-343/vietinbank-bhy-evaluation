import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { chuanHoaTen } from './starSerial';
import type { StaffOption } from './useStarSerials';

// Ô CHỌN CÁN BỘ dùng chung cho ba chỗ của chương trình Sao: người nhận Sao, người
// tặng ở chế độ nhập bù, và lãnh đạo nhận bàn giao. Ba chỗ trước đây chép lại nhau
// gần như từng dòng — sửa một chỗ thì hai chỗ kia vẫn hỏng.
//
// Rà lại theo phản ánh 04/09/2026 («ô tìm kiếm bị bôi đen không nhìn được»), sửa
// bốn điểm chứ không chỉ cái nền đen:
//
//   1. NỀN Ô — khai `bg-white` thẳng. Gốc lỗi đã vá ở index.css (`color-scheme:
//      light` cho đảo sáng), nhưng ô nhập là nơi cán bộ gõ chữ nên khai luôn cho
//      chắc, không phụ thuộc một luật ở tận file khác.
//   2. GỢI Ý NGAY KHI BẤM VÀO — Trưởng phòng chỉ tặng được cán bộ phòng mình, tức
//      8–15 người. Bắt gõ trước khi thấy gì là bắt họ đoán mình được phép chọn ai.
//   3. BÀN PHÍM — ↑ ↓ chọn, Enter chốt, Esc đóng. Trên máy tính để bàn không ai
//      muốn rời tay khỏi bàn phím giữa chừng để rê chuột.
//   4. KHÔNG THẤY THÌ NÓI RÕ VÌ SAO — «không có ai tên …» khác hẳn «bạn không được
//      phép tặng người này»; câu cũ trộn hai việc làm người dùng tưởng mình gõ sai.

export interface StarPersonPickerProps {
  value: StaffOption | null;
  onChange: (p: StaffOption | null) => void;
  people: StaffOption[];
  id?: string;
  placeholder?: string;
  /** Câu giải thích khi gõ mà không ra ai — nói phạm vi được phép, không nói "sai" */
  emptyHint?: string;
  /** Tông màu viền khi đã chọn xong: emerald cho người nhận, violet cho người tặng */
  tone?: 'emerald' | 'violet';
}

const TONE = {
  emerald: 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100',
  violet: 'border-violet-200 bg-violet-50/60 hover:bg-violet-100',
} as const;

const MAX_GOI_Y = 8;

export const StarPersonPicker: React.FC<StarPersonPickerProps> = ({
  value, onChange, people, id, placeholder = 'Gõ tên cán bộ…', emptyHint, tone = 'emerald',
}) => {
  const [query, setQuery] = useState('');
  const [dangMo, setDangMo] = useState(false);
  const [chiSo, setChiSo] = useState(0);
  const boc = useRef<HTMLDivElement>(null);

  // Chưa gõ gì thì bày sẵn danh sách; gõ rồi thì lọc theo tên đã bỏ dấu.
  // Dùng chung `chuanHoaTen` với phần đối chiếu sổ sao để "Thuý" và "Thúy" cùng ra.
  const goiY = useMemo(() => {
    const q = chuanHoaTen(query);
    const nguon = q ? people.filter((p) => chuanHoaTen(p.fullName).includes(q)) : people;
    return nguon.slice(0, MAX_GOI_Y);
  }, [people, query]);

  useEffect(() => { setChiSo(0); }, [query]);

  // Bấm ra ngoài thì đóng — không thì bảng gợi ý che mất các ô bên dưới
  useEffect(() => {
    if (!dangMo) return;
    const ngoai = (e: MouseEvent) => {
      if (boc.current && !boc.current.contains(e.target as Node)) setDangMo(false);
    };
    document.addEventListener('mousedown', ngoai);
    return () => document.removeEventListener('mousedown', ngoai);
  }, [dangMo]);

  const chon = (p: StaffOption) => {
    onChange(p);
    setQuery('');
    setDangMo(false);
  };

  const moTa = (p: StaffOption) =>
    `${p.starDept ?? p.rawDept ?? 'chưa rõ phòng'}${p.position ? ` · ${p.position}` : ''}`;

  if (value) {
    return (
      <div className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border ${TONE[tone]}`}>
        <span className="font-bold text-slate-800">
          {value.fullName}
          <span className="font-semibold text-slate-500"> — {moTa(value)}</span>
        </span>
        <button
          type="button"
          onClick={() => { onChange(null); setQuery(''); }}
          className="p-1 rounded hover:bg-white/70 cursor-pointer"
          title="Chọn người khác"
        >
          <X className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
    );
  }

  const phimTat = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setDangMo(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setDangMo(true);
      if (goiY.length === 0) return;
      setChiSo((i) => (e.key === 'ArrowDown'
        ? (i + 1) % goiY.length
        : (i - 1 + goiY.length) % goiY.length));
      return;
    }
    if (e.key === 'Enter' && dangMo && goiY[chiSo]) {
      e.preventDefault();
      chon(goiY[chiSo]);
    }
  };

  return (
    <div className="relative" ref={boc}>
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus-within:border-brand-navy">
        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setDangMo(true); }}
          onFocus={() => setDangMo(true)}
          onKeyDown={phimTat}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={dangMo}
          aria-controls={id ? `${id}-goi-y` : undefined}
          className="w-full bg-white text-slate-800 font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
        />
        {people.length > 0 && (
          <span className="shrink-0 text-2xs font-bold text-slate-500 tabular-nums">
            {people.length} người
          </span>
        )}
      </div>

      {dangMo && goiY.length > 0 && (
        <ul
          id={id ? `${id}-goi-y` : undefined}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg"
        >
          {goiY.map((p, i) => (
            <li key={p.profileId} role="option" aria-selected={i === chiSo}>
              <button
                type="button"
                onClick={() => chon(p)}
                onMouseEnter={() => setChiSo(i)}
                className={`w-full text-left px-3.5 py-2 cursor-pointer border-b border-slate-50 last:border-0 ${
                  i === chiSo ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <span className="font-bold text-slate-800">{p.fullName}</span>
                <span className="text-slate-500"> — {moTa(p)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {dangMo && query.trim() !== '' && goiY.length === 0 && (
        <p className="mt-1 text-2xs text-amber-700">
          Không có ai tên «{query.trim()}» trong danh bạ bạn được chọn.
          {emptyHint ? ` ${emptyHint}` : ''}
        </p>
      )}
    </div>
  );
};
