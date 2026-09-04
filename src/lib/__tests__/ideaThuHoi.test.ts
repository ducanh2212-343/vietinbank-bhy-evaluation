import { describe, it, expect } from 'vitest';
import { heQuaThuHoi, rutHoSo, thuHoiQuyetDinh, type DongSoBenRe } from '../ideaThuHoi';

const dong = (mot: Partial<DongSoBenRe>): DongSoBenRe => ({
  trangThai: 'da_ghi_nhan',
  duyetCn: true,
  duyetTsc: false,
  coQuyetDinhGd: true,
  ...mot,
});
const GD = { laGiamDoc: true, laQuanTri: false };
const TCTH = { laGiamDoc: false, laQuanTri: true };
const CAN_BO = { laGiamDoc: false, laQuanTri: false };

describe('Giám đốc thu hồi quyết định — trùng luật hàm gác CSDL', () => {
  it('ca thật 03/09/2026: ấn nhầm «Công nhận» → thu hồi được, về hàng chờ', () => {
    const kq = thuHoiQuyetDinh(dong({}), GD);
    expect(kq).toMatchObject({ duoc: true, loai: 'thu_hoi_quyet_dinh', nhan: 'Thu hồi công nhận' });
  });

  it('từ chối nhầm cũng mở lại được', () => {
    expect(thuHoiQuyetDinh(dong({ trangThai: 'tu_choi', duyetCn: false }), GD))
      .toMatchObject({ duoc: true, nhan: 'Mở lại hồ sơ' });
  });

  it('TSC còn công nhận trên SMP thì không thu hồi phần Chi nhánh — chỉ đường SMP', () => {
    const kq = thuHoiQuyetDinh(dong({ duyetTsc: true }), GD);
    expect(kq.duoc).toBe(false);
    expect(kq.nhan).toContain('SMP');
  });

  it('đã lên Vươn cành/Lan tỏa thì không thu hồi Bén rễ được', () => {
    expect(thuHoiQuyetDinh(dong({ daLenCapCaoHon: true }), GD).duoc).toBe(false);
  });

  it('hồ sơ đang chờ (chưa có quyết định) thì không có gì để thu hồi', () => {
    expect(thuHoiQuyetDinh(dong({ trangThai: 'cho_gd_duyet', coQuyetDinhGd: false }), GD).duoc).toBe(false);
  });

  it('TCTH và cán bộ thường không thu hồi quyết định của Giám đốc', () => {
    expect(thuHoiQuyetDinh(dong({}), TCTH).duoc).toBe(false);
    expect(thuHoiQuyetDinh(dong({}), CAN_BO).duoc).toBe(false);
  });
});

describe('TCTH rút hồ sơ đang chờ', () => {
  it('TCTH rút được hồ sơ mình trình nhầm; Giám đốc cũng rút được', () => {
    const cho = dong({ trangThai: 'cho_gd_duyet', duyetCn: false, coQuyetDinhGd: false });
    expect(rutHoSo(cho, TCTH)).toMatchObject({ duoc: true, loai: 'rut_ho_so' });
    expect(rutHoSo(cho, GD).duoc).toBe(true);
  });

  it('đã có quyết định thì không «rút» — phải đi đường thu hồi của Giám đốc', () => {
    expect(rutHoSo(dong({}), TCTH).duoc).toBe(false);
  });

  it('cán bộ thường không rút được', () => {
    expect(rutHoSo(dong({ trangThai: 'cho_gd_duyet', coQuyetDinhGd: false }), CAN_BO).duoc).toBe(false);
  });
});

describe('Hệ quả nói trước khi bấm', () => {
  it('thu hồi công nhận phải nói đủ ba trục: KPI, tiền, cấp độ', () => {
    const cau = heQuaThuHoi(dong({})).join(' ');
    expect(cau).toContain('KPI');
    expect(cau).toContain('300.000đ');
    expect(cau).toContain('Cấp độ');
  });

  it('rút hồ sơ chỉ đụng hàng chờ, không đụng tiền hay KPI', () => {
    const cau = heQuaThuHoi(dong({ trangThai: 'cho_gd_duyet' })).join(' ');
    expect(cau).not.toContain('KPI');
    expect(cau).not.toContain('đ ');
  });
});
