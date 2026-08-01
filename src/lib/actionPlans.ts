import { getVietnamWeekStart } from '@/lib/kanban';

/**
 * Chiêu thức 2 — kế hoạch hành động cấp Phòng (5W2H + PDCA).
 *
 * KHÁC với `kanban_cards`: đó là hành động phát triển năng lực của TỪNG CÁN BỘ,
 * sinh ra từ phiếu tự đánh giá. Ở đây là kế hoạch hành động của CẢ PHÒNG, do
 * lãnh đạo Phòng lập theo Chiêu thức 2 và cả phòng cùng báo nhịp PDCA.
 *
 * Phần dưới cố ý là HÀM THUẦN — kiểm thử được mà không cần mạng hay React.
 */

export type ActionStatus = 'todo' | 'doing' | 'done';
export type PdcaStage = 'plan' | 'do' | 'check' | 'act';

export interface ActionPlan {
  id: string;
  cycle_id: string | null;
  owner_department_id: string;
  title: string;
  why: string | null;
  where_place: string | null;
  who_profile_id: string | null;
  how: string | null;
  how_much: string | null;
  start_date: string | null;
  due_date: string | null;
  status: ActionStatus;
  progress_percent: number;
  pdca_stage: PdcaStage;
  is_campaign: boolean;
  created_by: string | null;
  last_progress_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionPlanUpdate {
  id: string;
  action_plan_id: string;
  profile_id: string | null;
  department_id: string | null;
  pdca_stage: PdcaStage;
  progress_percent: number | null;
  note: string;
  created_at: string;
}

export const STATUS_LABEL: Record<ActionStatus, string> = {
  todo: 'Chưa bắt đầu',
  doing: 'Đang làm',
  done: 'Hoàn thành',
};

export const PDCA_LABEL: Record<PdcaStage, string> = {
  plan: 'Plan — Lập kế hoạch',
  do: 'Do — Thực hiện',
  check: 'Check — Kiểm tra',
  act: 'Act — Cải tiến',
};

export const PDCA_SHORT: Record<PdcaStage, string> = {
  plan: 'Plan', do: 'Do', check: 'Check', act: 'Act',
};

export const PDCA_ORDER: PdcaStage[] = ['plan', 'do', 'check', 'act'];

/** Quá hạn: còn dang dở mà đã qua ngày hết hạn. Việc đã xong thì không tính. */
export function laQuaHan(plan: Pick<ActionPlan, 'due_date' | 'status'>, moc: Date = new Date()): boolean {
  if (plan.status === 'done' || !plan.due_date) return false;
  // So sánh theo NGÀY: hạn 05/08 vẫn còn hiệu lực đến hết ngày 05/08
  const han = new Date(`${plan.due_date}T23:59:59+07:00`);
  return moc.getTime() > han.getTime();
}

/**
 * Bỏ nhịp tuần: chưa có lần báo tiến độ nào trong tuần hiện tại (theo giờ Việt Nam).
 * Việc đã hoàn thành thì thôi không đòi báo nhịp nữa.
 */
export function boNhipTuan(plan: Pick<ActionPlan, 'last_progress_at' | 'status'>, moc: Date = new Date()): boolean {
  if (plan.status === 'done') return false;
  const dauTuan = getVietnamWeekStart(moc).getTime();
  if (!plan.last_progress_at) return true;
  return new Date(plan.last_progress_at).getTime() < dauTuan;
}

/** Số ngày còn lại tới hạn; âm là đã quá hạn. null khi không đặt hạn. */
export function soNgayConLai(plan: Pick<ActionPlan, 'due_date'>, moc: Date = new Date()): number | null {
  if (!plan.due_date) return null;
  const han = new Date(`${plan.due_date}T00:00:00+07:00`).getTime();
  const homNay = new Date(`${moc.toISOString().slice(0, 10)}T00:00:00+07:00`).getTime();
  return Math.round((han - homNay) / 86_400_000);
}

export interface TomTatPhong {
  departmentId: string;
  tong: number;
  hoanThanh: number;
  dangLam: number;
  chuaBatDau: number;
  quaHan: number;
  boNhip: number;
  /** Tiến độ trung bình của mọi kế hoạch, làm tròn xuống */
  tienDoTrungBinh: number;
  /** Tỉ lệ kế hoạch có báo nhịp trong tuần này (0–100) */
  tiLeBaoNhip: number;
}

/**
 * Gom số liệu theo phòng cho bảng thi đua.
 *
 * Chiến dịch chung được tính cho phòng CHỦ TRÌ, không nhân bản sang mọi phòng
 * tham gia — nếu không, một chiến dịch 8 phòng sẽ thổi phồng số liệu của cả 8.
 */
export function tomTatTheoPhong(plans: ActionPlan[], moc: Date = new Date()): TomTatPhong[] {
  const theoPhong = new Map<string, ActionPlan[]>();
  for (const p of plans) {
    const ds = theoPhong.get(p.owner_department_id);
    if (ds) ds.push(p);
    else theoPhong.set(p.owner_department_id, [p]);
  }

  const ketQua: TomTatPhong[] = [];
  for (const [departmentId, ds] of theoPhong) {
    const hoanThanh = ds.filter((p) => p.status === 'done').length;
    const dangLam = ds.filter((p) => p.status === 'doing').length;
    const chuaBatDau = ds.filter((p) => p.status === 'todo').length;
    const quaHan = ds.filter((p) => laQuaHan(p, moc)).length;
    const boNhip = ds.filter((p) => boNhipTuan(p, moc)).length;
    const tongTienDo = ds.reduce((s, p) => s + p.progress_percent, 0);
    // Chỉ đòi báo nhịp ở việc còn dang dở
    const canBaoNhip = ds.filter((p) => p.status !== 'done').length;
    ketQua.push({
      departmentId,
      tong: ds.length,
      hoanThanh,
      dangLam,
      chuaBatDau,
      quaHan,
      boNhip,
      tienDoTrungBinh: ds.length ? Math.floor(tongTienDo / ds.length) : 0,
      tiLeBaoNhip: canBaoNhip ? Math.round(((canBaoNhip - boNhip) / canBaoNhip) * 100) : 100,
    });
  }
  return ketQua;
}

/**
 * Xếp hạng thi đua giữa các phòng.
 *
 * Ưu tiên NHỊP trước KHỐI LƯỢNG: một phòng ít việc nhưng tuần nào cũng báo và
 * không để quá hạn đứng trên phòng nhiều việc mà bỏ bẵng. Đây chính là hành vi
 * mà Chiêu thức 2 muốn tạo động lực.
 */
export function xepHangPhong(tomTat: TomTatPhong[]): TomTatPhong[] {
  return [...tomTat].sort((a, b) => {
    if (b.tiLeBaoNhip !== a.tiLeBaoNhip) return b.tiLeBaoNhip - a.tiLeBaoNhip;
    if (a.quaHan !== b.quaHan) return a.quaHan - b.quaHan;
    if (b.tienDoTrungBinh !== a.tienDoTrungBinh) return b.tienDoTrungBinh - a.tienDoTrungBinh;
    return b.tong - a.tong;
  });
}

/** Sắp thẻ trong một cột: việc gấp lên trước — quá hạn → bỏ nhịp → gần hạn. */
export function sapXepKeHoach(plans: ActionPlan[], moc: Date = new Date()): ActionPlan[] {
  const diem = (p: ActionPlan) => {
    if (laQuaHan(p, moc)) return 0;
    if (boNhipTuan(p, moc)) return 1;
    return 2;
  };
  return [...plans].sort((a, b) => {
    const d = diem(a) - diem(b);
    if (d !== 0) return d;
    const ha = soNgayConLai(a, moc);
    const hb = soNgayConLai(b, moc);
    if (ha === null && hb === null) return a.title.localeCompare(b.title, 'vi');
    if (ha === null) return 1;
    if (hb === null) return -1;
    return ha - hb;
  });
}

/** Bảng này chưa có trong database — migration chưa được áp vào project. */
export function laLoiThieuBang(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // 42P01 = undefined_table (PostgREST trả nguyên mã của Postgres)
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message ?? '');
}
