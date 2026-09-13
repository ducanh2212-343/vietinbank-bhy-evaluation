import { idNgan } from './index';

/**
 * BẢNG VẼ TAY — lưu NÉT chứ không lưu ảnh: một nét là dãy điểm (x, y, áp lực),
 * nên bản vẽ nhỏ, hoàn tác được từng nét, và vẽ lại sắc nét ở mọi độ phóng.
 * Ảnh PNG chỉ sinh ra lúc xuất.
 *
 * Điểm lưu phẳng [x, y, p, x, y, p, …] thay vì mảng đối tượng: một nét bút cảm
 * ứng dễ tới 200 điểm, mười nét là 2.000 điểm — lưu đối tượng thì jsonb phình
 * gấp ba mà không thêm thông tin gì.
 */

export interface NetVe {
  id: string;
  mau: string;
  /** Độ dày nét, đơn vị điểm ảnh của bảng vẽ */
  do_day: number;
  /** Tẩy: nét này xoá thay vì tô */
  tay?: boolean;
  /** Nét hình đã nhận (đường thẳng, tròn, chữ nhật…): vẽ độ dày đều, không thon theo áp lực */
  hinh?: boolean;
  /** [x, y, p, x, y, p, …] — p là áp lực 0–1 (chuột thì 0.5) */
  diem: number[];
}

export interface DuLieuVeTay {
  phien_ban: 1;
  rong: number;
  cao: number;
  nen: string;
  net: NetVe[];
}

export const MAU_BUT = ['#1F2937', '#1F4E79', '#B5443C', '#2E7D5B', '#A8763E', '#6A4C93', '#C97B1A', '#FFFFFF'];
export const DO_DAY_BUT = [3, 6, 12] as const;
export const NEN_VE = '#FFFDF8';

/** Khổ mặc định 16:10 — vừa màn laptop lẫn khi xuất ảnh đưa vào slide */
export function taoVeTay(rong = 1600, cao = 1000): DuLieuVeTay {
  return { phien_ban: 1, rong, cao, nen: NEN_VE, net: [] };
}

export function docVeTay(json: unknown): DuLieuVeTay {
  const mac = taoVeTay();
  const o = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const so = (x: unknown, m: number, min: number, max: number) => {
    const n = Number(x);
    return Number.isFinite(n) && n >= min && n <= max ? n : m;
  };
  const net = (Array.isArray(o.net) ? o.net : []).flatMap((n): NetVe[] => {
    if (!n || typeof n !== 'object') return [];
    const r = n as Record<string, unknown>;
    if (!Array.isArray(r.diem) || r.diem.length < 3) return [];
    const diem = r.diem.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (diem.length < 3) return [];
    return [{
      id: typeof r.id === 'string' && r.id ? r.id : idNgan(),
      mau: typeof r.mau === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.mau) ? r.mau : MAU_BUT[0],
      do_day: so(r.do_day, DO_DAY_BUT[1], 1, 40),
      ...(r.tay === true ? { tay: true } : {}),
      ...(r.hinh === true ? { hinh: true } : {}),
      // Cắt về bội của 3 — một điểm thiếu toạ độ là cả nét vẽ lệch
      diem: diem.slice(0, diem.length - (diem.length % 3)),
    }];
  });
  return {
    phien_ban: 1,
    rong: so(o.rong, mac.rong, 200, 8000),
    cao: so(o.cao, mac.cao, 200, 8000),
    nen: typeof o.nen === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.nen) ? o.nen : mac.nen,
    net,
  };
}

export function themNet(d: DuLieuVeTay, net: Omit<NetVe, 'id'>): DuLieuVeTay {
  return { ...d, net: [...d.net, { ...net, id: idNgan() }] };
}

export function boNetCuoi(d: DuLieuVeTay): DuLieuVeTay {
  return { ...d, net: d.net.slice(0, -1) };
}

export function xoaHet(d: DuLieuVeTay): DuLieuVeTay {
  return { ...d, net: [] };
}

/** Bỏ điểm quá sát nhau để nét bút cảm ứng không phình 1.000 điểm cho một gạch */
export function rutGonDiem(diem: number[], khoangToiThieu = 1.5): number[] {
  if (diem.length <= 6) return diem;
  const ra = [diem[0], diem[1], diem[2]];
  for (let i = 3; i < diem.length; i += 3) {
    const dx = diem[i] - ra[ra.length - 3];
    const dy = diem[i + 1] - ra[ra.length - 2];
    const cuoi = i + 3 >= diem.length;
    if (cuoi || dx * dx + dy * dy >= khoangToiThieu * khoangToiThieu) ra.push(diem[i], diem[i + 1], diem[i + 2]);
  }
  return ra;
}

/** Tách mảng phẳng thành [x, y, p][] cho perfect-freehand */
export function taiDiem(diem: number[]): Array<[number, number, number]> {
  const ra: Array<[number, number, number]> = [];
  for (let i = 0; i + 2 < diem.length; i += 3) ra.push([diem[i], diem[i + 1], diem[i + 2]]);
  return ra;
}
