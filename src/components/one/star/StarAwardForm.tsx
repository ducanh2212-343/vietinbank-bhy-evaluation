import React, { useMemo, useState } from 'react';
import {
  BadgeCheck, Building2, Check, Copy, Gift, Loader2, Search, Sparkles, Star,
  User, Users, X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '@/hooks/useAuth';
import { getKpiPoints, formatKpi } from './starMath';
import { suggestSerials } from './starSerial';
import { tenTapThe } from './starStats';
import {
  useAwardablePeople, useProfileNames, useStarDepartments, useStarOps, useStarSerials,
  useStarSubUnits, type StaffOption,
} from './useStarSerials';

// FORM TẶNG SAO TRÊN CỔNG — thay cho đường nhập Lark (tạm hoãn 08/2026).
//
// Ba chế độ ghi nhận, khớp yêu cầu vận hành của chi nhánh:
//   1. "Tôi tặng"        — người tặng TỰ ĐỘNG là cán bộ đang đăng nhập (lãnh đạo).
//   2. "Nhập hộ"         — Phòng TCTH nhập thay một lãnh đạo (chọn từ danh sách
//                          người đang giữ sao); phiếu vẫn đứng tên lãnh đạo đó.
//   3. "Sao chương trình"— sao của chương trình thi đua/chiến dịch gắn cơ chế
//                          Sao xứng đáng (văn bản mục 4), lấy số từ kho TCTH,
//                          người tặng là TÊN CHƯƠNG TRÌNH.
//
// Chống trùng số sao: người dùng CHỌN số từ pool đang giữ (không gõ tay), và
// RPC award_star phía CSDL khóa từng số trong một giao dịch — hai người cùng
// bấm một số thì chỉ một phiếu được ghi, phiếu kia báo lỗi rõ ràng.

const normalize = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const todayIso = (): string => new Date().toISOString().slice(0, 10);

type EntryMode = 'self' | 'proxy' | 'program';
type RecipientType = 'person' | 'collective';

export const StarAwardForm: React.FC = () => {
  const { roles } = useAuth();
  const canProxy = roles.includes('tcth_admin') || roles.includes('system_admin');

  const { pools, stockPool, myPool, isLoading: serialsLoading } = useStarSerials();
  const { people } = useAwardablePeople(true);
  const { awardStar } = useStarOps();
  // Danh sách phòng nhận Sao tập thể lấy từ danh bạ: phòng mới tạo hiện ra ngay,
  // phòng đổi tên hiện tên mới, phòng «Ngừng sử dụng» tự biến mất khỏi ô chọn.
  const { nhanDangDung } = useStarDepartments();
  // Tổ / tập thể nhỏ (Tổ FDI thuộc KHDN, Tổ truyền thông liên phòng…) — danh mục
  // do TCTH quản, ý kiến 04/09/2026: cán bộ thuộc tổ được ghi nhận theo tổ, và
  // tổ cũng nhận được sao tập thể.
  const { dangDung: toDangDung } = useStarSubUnits();

  const [mode, setMode] = useState<EntryMode>('self');
  const [holderId, setHolderId] = useState<string | null>(null);
  const [programName, setProgramName] = useState('');

  const [recipientType, setRecipientType] = useState<RecipientType>('person');
  const [recipient, setRecipient] = useState<StaffOption | null>(null);
  const [personQuery, setPersonQuery] = useState('');
  const [collectiveDept, setCollectiveDept] = useState<string>('');
  /** Tổ / tập thể nhỏ gắn phiếu cá nhân ('' = không thuộc tổ nào) */
  const [subUnit, setSubUnit] = useState<string>('');
  const laTapTheTo = toDangDung.some((t) => t.nhan === collectiveDept);

  const [starsCount, setStarsCount] = useState(1);
  const [selectedSerials, setSelectedSerials] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState('');
  const [awardedOn, setAwardedOn] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Danh sách lãnh đạo đang giữ sao (cho chế độ nhập hộ)
  const holderIds = useMemo(() => [...pools.keys()], [pools]);
  const holderNames = useProfileNames(holderIds, canProxy);

  // Pool số sao đang thao tác theo chế độ
  const activePool = useMemo(() => {
    if (mode === 'self') return myPool;
    if (mode === 'proxy') return holderId ? pools.get(holderId) ?? [] : [];
    return stockPool;
  }, [mode, myPool, pools, holderId, stockPool]);

  const toggleSerial = (n: number) => {
    setSelectedSerials((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (prev.length >= starsCount) return prev; // đủ số rồi — bỏ chọn số cũ trước
      return [...prev, n].sort((a, b) => a - b);
    });
  };

  const pickStarsCount = (n: number) => {
    setStarsCount(n);
    setSelectedSerials((prev) => prev.slice(0, n));
  };

  const switchMode = (m: EntryMode) => {
    setMode(m);
    setSelectedSerials([]);
  };

  // Gợi ý người nhận theo tên không dấu; RLS đã giới hạn danh bạ đúng phạm vi từng cấp
  const personMatches = useMemo(() => {
    const q = normalize(personQuery);
    if (!q) return [];
    return people
      .filter((p) => normalize(p.fullName).includes(q))
      .slice(0, 8);
  }, [people, personQuery]);

  const recipientLabel = recipientType === 'person'
    ? (recipient ? recipient.fullName : '')
    : (collectiveDept ? tenTapThe(collectiveDept) : '');

  const previewText =
    `Cảm ơn ${recipientLabel || '...'}\n`
    + `vì đã ${reason || '...'}\n`
    + `đem lại ${result || '...'}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const validationError = useMemo((): string | null => {
    if (mode === 'proxy' && !holderId) return 'Chọn lãnh đạo được nhập hộ';
    if (mode === 'program' && !programName.trim()) return 'Nhập tên chương trình động lực';
    if (recipientType === 'person' && !recipient) return 'Chọn cán bộ nhận Sao từ danh bạ';
    if (recipientType === 'collective' && !collectiveDept) return 'Chọn phòng nhận Sao tập thể';
    if (!reason.trim()) return 'Điền vế "vì đã [hành vi cụ thể]"';
    if (!result.trim()) return 'Điền vế "đem lại [kết quả cụ thể]"';
    if (selectedSerials.length !== starsCount) {
      return `Chọn đủ ${starsCount} số serial (đang chọn ${selectedSerials.length})`;
    }
    return null;
  }, [mode, holderId, programName, recipientType, recipient, collectiveDept, reason, result, selectedSerials, starsCount]);

  const handleSubmit = async () => {
    if (validationError || submitting) return;
    setSubmitting(true);
    const ok = await awardStar({
      entryMode: mode,
      serials: selectedSerials,
      isCollective: recipientType === 'collective',
      recipientProfileId: recipientType === 'person' ? recipient?.profileId : null,
      recipientName: recipientType === 'collective' ? tenTapThe(collectiveDept) : null,
      department: recipientType === 'person'
        ? (recipient?.starDept ?? recipient?.rawDept ?? null)
        : collectiveDept,
      reason,
      result,
      awardedOn,
      holderProfileId: mode === 'proxy' ? holderId : null,
      programName: mode === 'program' ? programName : null,
      // Tập thể là tổ → gắn tổ; cá nhân → tổ đã chọn (nếu có)
      subUnit: recipientType === 'collective'
        ? (laTapTheTo ? collectiveDept : null)
        : (subUnit || null),
    });
    setSubmitting(false);
    if (ok) {
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.7 } });
      setRecipient(null);
      setPersonQuery('');
      setCollectiveDept('');
      setSubUnit('');
      setReason('');
      setResult('');
      setSelectedSerials([]);
      setStarsCount(1);
      setAwardedOn(todayIso());
    }
  };

  const modeTabs: Array<{ key: EntryMode; label: string; visible: boolean }> = [
    { key: 'self', label: 'Tôi tặng Sao', visible: true },
    { key: 'proxy', label: 'Nhập hộ lãnh đạo', visible: canProxy },
    { key: 'program', label: 'Sao chương trình động lực', visible: canProxy },
  ];

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-amber-200 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-wide">
          <Star className="w-5 h-5 fill-amber-400 text-amber-600" />
          <span>Ghi Nhận Sao Xứng Đáng</span>
        </div>
        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
          Số serial kiểm soát tự động
        </span>
      </div>

      {/* Chế độ ghi nhận */}
      <div className="flex flex-wrap gap-2 mb-5">
        {modeTabs.filter((t) => t.visible).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchMode(t.key)}
            className={`px-3.5 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${
              mode === t.key
                ? 'bg-brand-navy text-white border-brand-navy shadow'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 text-xs">
        {/* Người tặng theo chế độ */}
        {mode === 'self' && (
          <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3 flex items-center gap-2 text-[11px]">
            <BadgeCheck className="w-4 h-4 text-brand-navy shrink-0" />
            <span className="text-slate-700">
              Người tặng: <strong>chính bạn</strong> — hệ thống tự nhận diện theo tài khoản đăng nhập,
              phiếu sẽ đứng tên bạn và trừ vào số sao bạn đang giữ.
            </span>
          </div>
        )}

        {mode === 'proxy' && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nhập hộ cho lãnh đạo (đang giữ sao):</label>
            <div className="flex flex-wrap gap-2">
              {holderIds.length === 0 && (
                <span className="text-slate-500 italic">Chưa có lãnh đạo nào được bàn giao sao — bàn giao ở khu Quản lý Sao trước.</span>
              )}
              {holderIds.map((id) => {
                const info = holderNames.get(id);
                const pool = pools.get(id) ?? [];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setHolderId(id); setSelectedSerials([]); }}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                      holderId === id
                        ? 'bg-brand-navy text-white border-brand-navy'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-brand-navy/40'
                    }`}
                  >
                    {info?.name ?? 'Đang tải…'} · còn {pool.length} sao
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === 'program' && (
          <div>
            <label className="block font-bold text-slate-700 mb-1" htmlFor="sxd-program">
              Tên chương trình / chiến dịch gắn cơ chế Sao xứng đáng:
            </label>
            <input
              id="sxd-program"
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="VD: Chiến dịch thúc đẩy Huy động vốn Quý 3/2026"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Sao chương trình nằm ngoài phân bổ quý của lãnh đạo, lấy số trực tiếp từ kho TCTH;
              người tặng trên phiếu là tên chương trình.
            </p>
          </div>
        )}

        {/* Người nhận */}
        <div>
          <span className="block font-bold text-slate-700 mb-1">Cảm ơn (người / tập thể nhận Sao):</span>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setRecipientType('person')}
              className={`flex-1 py-2 rounded-xl border font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                recipientType === 'person' ? 'bg-brand-navy text-white border-brand-navy' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Cá nhân
            </button>
            <button
              type="button"
              onClick={() => setRecipientType('collective')}
              className={`flex-1 py-2 rounded-xl border font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                recipientType === 'collective' ? 'bg-brand-navy text-white border-brand-navy' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Tập thể (phòng / tổ)
            </button>
          </div>

          {recipientType === 'person' && (
            recipient ? (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
                <span className="font-bold text-slate-800">
                  {recipient.fullName}
                  <span className="text-slate-500 font-semibold"> — {recipient.starDept ?? recipient.rawDept ?? 'chưa rõ phòng'}{recipient.position ? ` · ${recipient.position}` : ''}</span>
                </span>
                <button type="button" onClick={() => setRecipient(null)} className="p-1 rounded hover:bg-emerald-100 cursor-pointer" title="Chọn người khác">
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 focus-within:border-brand-navy">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={personQuery}
                    onChange={(e) => setPersonQuery(e.target.value)}
                    placeholder="Gõ tên cán bộ để tìm trong danh bạ (đúng phạm vi phụ trách của bạn)…"
                    className="w-full outline-none font-semibold text-slate-800"
                  />
                </div>
                {personMatches.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {personMatches.map((p) => (
                      <button
                        key={p.profileId}
                        type="button"
                        onClick={() => { setRecipient(p); setPersonQuery(''); }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                      >
                        <span className="font-bold text-slate-800">{p.fullName}</span>
                        <span className="text-slate-500"> — {p.starDept ?? p.rawDept ?? 'chưa rõ phòng'}{p.position ? ` · ${p.position}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
                {personQuery && personMatches.length === 0 && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    Không thấy trong phạm vi danh bạ của bạn — Trưởng phòng chỉ tặng được cán bộ phòng mình (theo văn bản triển khai).
                  </p>
                )}
              </div>
            )
          )}

          {recipientType === 'person' && recipient && toDangDung.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={subUnit}
                onChange={(e) => setSubUnit(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800 bg-white cursor-pointer"
                title="Cán bộ thuộc tổ / tập thể nhỏ nào? Sao vẫn tính cho phòng, đồng thời hiện ở dòng tổ"
              >
                <option value="">Không thuộc tổ / tập thể nhỏ nào</option>
                {toDangDung.map((t) => (
                  <option key={t.id} value={t.nhan}>
                    Thuộc {t.nhan}{t.phongCha ? ` (${t.phongCha})` : ' (liên phòng)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {recipientType === 'collective' && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={collectiveDept}
                onChange={(e) => setCollectiveDept(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800 bg-white cursor-pointer"
              >
                <option value="">— Chọn tập thể nhận Sao —</option>
                <optgroup label="Phòng ban / Ban Giám đốc">
                  {nhanDangDung.map((d) => (
                    <option key={d} value={d}>{tenTapThe(d)}</option>
                  ))}
                </optgroup>
                {toDangDung.length > 0 && (
                  <optgroup label="Tổ / tập thể nhỏ">
                    {toDangDung.map((t) => (
                      <option key={t.id} value={t.nhan}>
                        Tập thể {t.nhan}{t.phongCha ? ` — thuộc ${t.phongCha}` : ' — liên phòng'}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}
        </div>

        {/* Hành vi + kết quả (đủ 3 vế theo văn bản) */}
        <div>
          <label className="block font-bold text-slate-700 mb-1" htmlFor="sxd-reason">Vì đã (hành vi / hành động cụ thể):</label>
          <input
            id="sxd-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Hành động xuất sắc, ngắn gọn…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1" htmlFor="sxd-result">Đem lại (kết quả / thành tích cụ thể):</label>
          <input
            id="sxd-result"
            type="text"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="Kết quả định lượng: số dư, khách hàng, tiến độ…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800"
          />
        </div>

        {/* Số sao + chọn serial từ pool */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="block font-bold text-slate-700 mb-1">Số lượng Sao:</span>
            <div className="flex gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => pickStarsCount(num)}
                  className={`flex-1 py-2 rounded-xl border font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    starsCount === num ? 'bg-amber-500 text-white border-amber-600 shadow' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${starsCount === num ? 'fill-white' : 'fill-slate-400'}`} />
                  <span>{num}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1" htmlFor="sxd-date">Ngày trao Sao:</label>
            <input
              id="sxd-date"
              type="date"
              value={awardedOn}
              onChange={(e) => setAwardedOn(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-brand-navy outline-none font-semibold text-slate-800 bg-white"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-slate-700">
              Chọn {starsCount} số serial từ {mode === 'program' ? 'kho TCTH' : 'số sao đang giữ'} ({activePool.length} số khả dụng):
            </span>
            {activePool.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSerials(suggestSerials(activePool, starsCount))}
                className="text-[10px] font-black text-brand-navy hover:underline cursor-pointer"
              >
                Chọn giúp {starsCount} số nhỏ nhất
              </button>
            )}
          </div>

          {serialsLoading ? (
            <div className="flex items-center gap-2 text-slate-500 py-3"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải sổ sao…</div>
          ) : activePool.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-slate-700">
              {mode === 'self' && (
                <>Bạn <strong>chưa được bàn giao sao</strong> (hoặc đã tặng hết số được giao).
                Liên hệ Phòng TCTH để nhận bàn giao sao của quý này trước khi ghi nhận.</>
              )}
              {mode === 'proxy' && (holderId ? 'Lãnh đạo này đã tặng hết số sao được bàn giao.' : 'Chọn lãnh đạo ở trên để hiện số sao đang giữ.')}
              {mode === 'program' && 'Kho TCTH không còn số tồn — khai báo lô sao in mới ở khu Quản lý Sao.'}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl border border-slate-100 bg-slate-50/60">
              {activePool.map((n) => {
                const chosen = selectedSerials.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleSerial(n)}
                    className={`px-2.5 py-1 rounded-lg border font-mono font-black text-[11px] transition-all cursor-pointer ${
                      chosen
                        ? 'bg-amber-500 text-white border-amber-600 shadow'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
                    }`}
                    title={chosen ? 'Bấm để bỏ chọn' : 'Bấm để chọn số này'}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Xem trước phiếu */}
        <div className="mt-2 pt-4 border-t border-dashed border-amber-300">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase text-amber-700">🎫 Bản xem trước Phiếu Ghi Nhận:</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black transition-all cursor-pointer"
              title="Copy lời ghi nhận (để ghi tay lên sao / đăng vinh danh)"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Đã copy' : 'Copy lời ghi nhận'}</span>
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-300 text-slate-800 shadow-inner relative overflow-hidden">
            <div className="absolute top-2 right-2 flex">
              {Array.from({ length: starsCount }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-600" />
              ))}
            </div>
            <p className="text-xs leading-relaxed font-serif">
              “<strong className="text-brand-navy font-sans font-black">CẢM ƠN </strong>
              <span className="font-bold underline decoration-amber-500">{recipientLabel || '...'}</span> <br />
              <strong className="text-slate-900 font-sans font-bold">vì đã: </strong> <span>{reason || '...'}</span> <br />
              <strong className="text-emerald-800 font-sans font-bold">đem lại: </strong>
              <span className="font-bold text-red-600">{result || '...'}</span>”
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono text-slate-500 border-t border-amber-200/80 pt-2">
              <span>
                Serial: {selectedSerials.length > 0 ? selectedSerials.join(', ') : '—'}
                {mode === 'program' && programName.trim() ? ` · ${programName.trim()}` : ''}
              </span>
              <span className="text-emerald-700 font-bold">+ {formatKpi(getKpiPoints(starsCount))} điểm KPI</span>
            </div>
          </div>
        </div>

        {validationError && (
          <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            {validationError}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!!validationError || submitting}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-navy via-blue-700 to-brand-royal text-white font-black text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
          <span>Ghi nhận {starsCount} Sao — số {selectedSerials.length > 0 ? selectedSerials.join(', ') : '…'}</span>
        </button>

        <p className="text-[10px] text-slate-500 leading-relaxed flex items-start gap-1.5">
          <Gift className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
          <span>
            Phiếu ghi xong vào thẳng bảng tổng hợp — đối soát của Phòng TCTH; số serial được khóa
            ngay khi ghi nên không thể trùng. Ghi nhận trên hệ thống <em>trước khi</em> tổ chức trao Sao
            (văn bản triển khai, mục 6).
          </span>
        </p>
      </div>
    </div>
  );
};
