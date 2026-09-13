import { idNgan } from './index';

/**
 * MÔ HÌNH 4 HỘP — ma trận hai trục, mỗi trục tự đặt tên và đặt hai đầu (thấp /
 * cao). Bốn ô đánh số cố định theo vị trí để mẫu và thẻ không lệch khi đổi tên:
 *
 *      0 (trái trên)  |  1 (phải trên)      ← trục Y cao
 *      2 (trái dưới)  |  3 (phải dưới)      ← trục Y thấp
 *        trục X thấp  |  trục X cao
 */

export type OBonHop = 0 | 1 | 2 | 3;

export interface TrucBonHop { ten: string; thap: string; cao: string }

export interface TheBonHop {
  id: string;
  van_ban: string;
  /** null = còn ở khay «chưa xếp» */
  o: OBonHop | null;
  mau?: string;
}

export interface DuLieuBonHop {
  phien_ban: 1;
  truc_x: TrucBonHop;
  truc_y: TrucBonHop;
  o: [OHop, OHop, OHop, OHop];
  the: TheBonHop[];
}

export interface OHop { ten: string; mau: string }

export interface MauBonHop {
  ma: string;
  ten: string;
  moTa: string;
  truc_x: TrucBonHop;
  truc_y: TrucBonHop;
  o: [OHop, OHop, OHop, OHop];
}

/** Bảng màu ô — nhạt để chữ thẻ đen vẫn đọc được */
export const MAU_O = ['#E8F1FA', '#FDF1E3', '#E6F4EC', '#FBE9E7', '#EFE9F7', '#FFF6DD'];
export const MAU_THE = ['#FFFFFF', '#FFF4C2', '#D9F2E3', '#DCEBFA', '#FBDDDD', '#EADCF5'];

export const MAU_BON_HOP: MauBonHop[] = [
  {
    ma: 'EISENHOWER', ten: 'Quan trọng – Khẩn cấp',
    moTa: 'Ma trận Eisenhower: việc nào làm ngay, việc nào lên lịch, việc nào giao, việc nào bỏ.',
    truc_x: { ten: 'Khẩn cấp', thap: 'Không khẩn', cao: 'Khẩn cấp' },
    truc_y: { ten: 'Quan trọng', thap: 'Ít quan trọng', cao: 'Quan trọng' },
    o: [
      { ten: 'Lên lịch làm', mau: MAU_O[0] }, { ten: 'Làm ngay', mau: MAU_O[3] },
      { ten: 'Loại bỏ', mau: MAU_O[5] }, { ten: 'Giao người khác', mau: MAU_O[1] },
    ],
  },
  {
    ma: 'TU_LAM_GIAO_VIEC', ten: 'Tự làm – Giao việc (ngày 5)',
    moTa: 'Hai câu kiểm chứng của Bảng việc: việc này tôi làm tốt nhất? việc này ai khác làm được? → tự làm · giao việc · tự động hoá · tạm dừng.',
    truc_x: { ten: 'Ai khác làm được?', thap: 'Không', cao: 'Có' },
    truc_y: { ten: 'Tôi làm tốt nhất?', thap: 'Không', cao: 'Có' },
    o: [
      { ten: 'Tự làm', mau: MAU_O[0] }, { ten: 'Giao việc kèm chuẩn', mau: MAU_O[2] },
      { ten: 'Tạm dừng', mau: MAU_O[5] }, { ten: 'Tự động hoá', mau: MAU_O[1] },
    ],
  },
  {
    ma: 'NO_LUC_TAC_DONG', ten: 'Nỗ lực – Tác động',
    moTa: 'Chọn việc đáng làm trước: tác động cao mà nỗ lực thấp là thắng nhanh.',
    truc_x: { ten: 'Nỗ lực', thap: 'Thấp', cao: 'Cao' },
    truc_y: { ten: 'Tác động', thap: 'Thấp', cao: 'Cao' },
    o: [
      { ten: 'Thắng nhanh', mau: MAU_O[2] }, { ten: 'Dự án lớn', mau: MAU_O[0] },
      { ten: 'Việc lấp chỗ', mau: MAU_O[5] }, { ten: 'Không đáng', mau: MAU_O[3] },
    ],
  },
  {
    ma: 'SWOT', ten: 'SWOT',
    moTa: 'Điểm mạnh, điểm yếu bên trong; cơ hội, thách thức bên ngoài.',
    truc_x: { ten: 'Nguồn gốc', thap: 'Bên trong', cao: 'Bên ngoài' },
    truc_y: { ten: 'Tính chất', thap: 'Bất lợi', cao: 'Có lợi' },
    o: [
      { ten: 'Điểm mạnh', mau: MAU_O[2] }, { ten: 'Cơ hội', mau: MAU_O[0] },
      { ten: 'Điểm yếu', mau: MAU_O[3] }, { ten: 'Thách thức', mau: MAU_O[1] },
    ],
  },
  {
    ma: 'TRONG', ten: 'Tự đặt trục',
    moTa: 'Hai trục và bốn ô để trống, tự đặt theo bài.',
    truc_x: { ten: 'Trục ngang', thap: 'Thấp', cao: 'Cao' },
    truc_y: { ten: 'Trục dọc', thap: 'Thấp', cao: 'Cao' },
    o: [
      { ten: 'Ô 1', mau: MAU_O[0] }, { ten: 'Ô 2', mau: MAU_O[1] },
      { ten: 'Ô 3', mau: MAU_O[2] }, { ten: 'Ô 4', mau: MAU_O[3] },
    ],
  },
];

export function taoBonHop(maMau: string = 'EISENHOWER'): DuLieuBonHop {
  const m = MAU_BON_HOP.find((x) => x.ma === maMau) ?? MAU_BON_HOP[0];
  return {
    phien_ban: 1,
    truc_x: { ...m.truc_x }, truc_y: { ...m.truc_y },
    o: m.o.map((x) => ({ ...x })) as DuLieuBonHop['o'],
    the: [],
  };
}

function docTruc(x: unknown, mac: TrucBonHop): TrucBonHop {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
  return {
    ten: typeof o.ten === 'string' ? o.ten : mac.ten,
    thap: typeof o.thap === 'string' ? o.thap : mac.thap,
    cao: typeof o.cao === 'string' ? o.cao : mac.cao,
  };
}

/** Đọc jsonb; thiếu gì lấy mặc định của mẫu Eisenhower, thẻ hỏng thì bỏ */
export function docBonHop(json: unknown): DuLieuBonHop {
  const mac = taoBonHop('EISENHOWER');
  const o = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const oJson = Array.isArray(o.o) ? o.o : [];
  const oDoc = mac.o.map((m, i) => {
    const x = (oJson[i] && typeof oJson[i] === 'object' ? oJson[i] : {}) as Record<string, unknown>;
    return {
      ten: typeof x.ten === 'string' ? x.ten : m.ten,
      mau: typeof x.mau === 'string' && /^#[0-9a-fA-F]{6}$/.test(x.mau) ? x.mau : m.mau,
    };
  }) as DuLieuBonHop['o'];
  const the = (Array.isArray(o.the) ? o.the : []).flatMap((t): TheBonHop[] => {
    if (!t || typeof t !== 'object') return [];
    const r = t as Record<string, unknown>;
    if (typeof r.van_ban !== 'string') return [];
    const oThe = r.o === 0 || r.o === 1 || r.o === 2 || r.o === 3 ? r.o : null;
    return [{
      id: typeof r.id === 'string' && r.id ? r.id : idNgan(),
      van_ban: r.van_ban, o: oThe,
      ...(typeof r.mau === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.mau) ? { mau: r.mau } : {}),
    }];
  });
  return { phien_ban: 1, truc_x: docTruc(o.truc_x, mac.truc_x), truc_y: docTruc(o.truc_y, mac.truc_y), o: oDoc, the };
}

export function themThe(d: DuLieuBonHop, vanBan: string, o: OBonHop | null = null): { d: DuLieuBonHop; id: string } {
  const id = idNgan();
  return { d: { ...d, the: [...d.the, { id, van_ban: vanBan, o }] }, id };
}

export function suaThe(d: DuLieuBonHop, id: string, vanBan: string): DuLieuBonHop {
  return { ...d, the: d.the.map((t) => t.id === id ? { ...t, van_ban: vanBan } : t) };
}

export function xoaThe(d: DuLieuBonHop, id: string): DuLieuBonHop {
  return { ...d, the: d.the.filter((t) => t.id !== id) };
}

export function chuyenThe(d: DuLieuBonHop, id: string, o: OBonHop | null): DuLieuBonHop {
  return { ...d, the: d.the.map((t) => t.id === id ? { ...t, o } : t) };
}

export function doiMauThe(d: DuLieuBonHop, id: string, mau: string | undefined): DuLieuBonHop {
  return { ...d, the: d.the.map((t) => {
    if (t.id !== id) return t;
    const { mau: _bo, ...conLai } = t;
    return mau ? { ...conLai, mau } : conLai;
  }) };
}

export function theTrongO(d: DuLieuBonHop, o: OBonHop | null): TheBonHop[] {
  return d.the.filter((t) => t.o === o);
}

/** Áp mẫu khác: đổi trục và tên ô, GIỮ thẻ và vị trí ô của thẻ — đổi khung không làm mất việc đã ghi */
export function apMau(d: DuLieuBonHop, maMau: string): DuLieuBonHop {
  const m = taoBonHop(maMau);
  return { ...d, truc_x: m.truc_x, truc_y: m.truc_y, o: m.o };
}
