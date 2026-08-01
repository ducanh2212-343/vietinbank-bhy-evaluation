import { describe, it, expect } from 'vitest';
import {
  laQuaHan,
  boNhipTuan,
  soNgayConLai,
  tomTatTheoPhong,
  xepHangPhong,
  sapXepKeHoach,
  laLoiThieuBang,
  type ActionPlan,
} from '../actionPlans';

// Mốc thời gian cố định để test không phụ thuộc ngày chạy.
// 2026-08-05 là THỨ TƯ (giờ Việt Nam) → đầu tuần là thứ Hai 2026-08-03.
const MOC = new Date('2026-08-05T03:00:00Z'); // 10:00 giờ VN

function keHoach(p: Partial<ActionPlan> = {}): ActionPlan {
  return {
    id: 'kh-1',
    cycle_id: null,
    owner_department_id: 'phong-a',
    title: 'Kế hoạch mẫu',
    why: null,
    where_place: null,
    who_profile_id: null,
    how: null,
    how_much: null,
    start_date: null,
    due_date: null,
    status: 'todo',
    progress_percent: 0,
    pdca_stage: 'plan',
    is_campaign: false,
    created_by: null,
    last_progress_at: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...p,
  };
}

describe('Quá hạn', () => {
  it('hạn còn hiệu lực đến HẾT ngày hết hạn', () => {
    // Đang là 05/08, hạn 05/08 → chưa quá hạn
    expect(laQuaHan(keHoach({ due_date: '2026-08-05' }), MOC)).toBe(false);
  });

  it('qua ngày hết hạn thì báo quá hạn', () => {
    expect(laQuaHan(keHoach({ due_date: '2026-08-04' }), MOC)).toBe(true);
  });

  it('việc đã hoàn thành không bao giờ tính quá hạn', () => {
    expect(laQuaHan(keHoach({ due_date: '2026-01-01', status: 'done' }), MOC)).toBe(false);
  });

  it('không đặt hạn thì không tính quá hạn', () => {
    expect(laQuaHan(keHoach({ due_date: null }), MOC)).toBe(false);
  });
});

describe('Nhịp báo cáo tuần', () => {
  it('chưa từng báo lần nào là bỏ nhịp', () => {
    expect(boNhipTuan(keHoach({ last_progress_at: null }), MOC)).toBe(true);
  });

  it('báo trong tuần này thì đạt nhịp', () => {
    // Thứ Hai 03/08 nằm trong tuần chứa 05/08
    expect(boNhipTuan(keHoach({ last_progress_at: '2026-08-03T02:00:00Z' }), MOC)).toBe(false);
  });

  it('báo từ tuần trước là bỏ nhịp', () => {
    expect(boNhipTuan(keHoach({ last_progress_at: '2026-07-31T02:00:00Z' }), MOC)).toBe(true);
  });

  it('việc đã hoàn thành thì thôi không đòi báo nhịp', () => {
    expect(boNhipTuan(keHoach({ last_progress_at: null, status: 'done' }), MOC)).toBe(false);
  });
});

describe('Số ngày còn lại', () => {
  it('đếm đúng ngày còn lại và ngày đã trễ', () => {
    expect(soNgayConLai(keHoach({ due_date: '2026-08-10' }), MOC)).toBe(5);
    expect(soNgayConLai(keHoach({ due_date: '2026-08-05' }), MOC)).toBe(0);
    expect(soNgayConLai(keHoach({ due_date: '2026-08-01' }), MOC)).toBe(-4);
    expect(soNgayConLai(keHoach({ due_date: null }), MOC)).toBeNull();
  });
});

describe('Tổng hợp theo phòng', () => {
  const ds: ActionPlan[] = [
    keHoach({ id: '1', owner_department_id: 'A', status: 'done', progress_percent: 100, last_progress_at: '2026-08-04T02:00:00Z' }),
    keHoach({ id: '2', owner_department_id: 'A', status: 'doing', progress_percent: 50, last_progress_at: '2026-08-04T02:00:00Z' }),
    keHoach({ id: '3', owner_department_id: 'A', status: 'todo', progress_percent: 0, due_date: '2026-07-01' }),
    keHoach({ id: '4', owner_department_id: 'B', status: 'doing', progress_percent: 30, last_progress_at: '2026-08-04T02:00:00Z' }),
  ];

  it('đếm đúng từng trạng thái', () => {
    const A = tomTatTheoPhong(ds, MOC).find((x) => x.departmentId === 'A')!;
    expect(A.tong).toBe(3);
    expect(A.hoanThanh).toBe(1);
    expect(A.dangLam).toBe(1);
    expect(A.chuaBatDau).toBe(1);
    expect(A.quaHan).toBe(1);
    expect(A.boNhip).toBe(1); // thẻ 3 chưa từng báo
    expect(A.tienDoTrungBinh).toBe(50); // (100+50+0)/3
  });

  it('tỉ lệ báo nhịp chỉ tính trên việc còn dang dở', () => {
    const A = tomTatTheoPhong(ds, MOC).find((x) => x.departmentId === 'A')!;
    // Dang dở: thẻ 2 (đã báo) và thẻ 3 (chưa báo) → 1/2 = 50%
    expect(A.tiLeBaoNhip).toBe(50);
    const B = tomTatTheoPhong(ds, MOC).find((x) => x.departmentId === 'B')!;
    expect(B.tiLeBaoNhip).toBe(100);
  });

  it('phòng chỉ có việc đã xong vẫn đạt 100% nhịp, không chia cho 0', () => {
    const chiXong = [keHoach({ owner_department_id: 'C', status: 'done', progress_percent: 100 })];
    expect(tomTatTheoPhong(chiXong, MOC)[0].tiLeBaoNhip).toBe(100);
  });

  it('chiến dịch chung tính cho phòng chủ trì, không nhân bản sang phòng tham gia', () => {
    const cd = [keHoach({ owner_department_id: 'A', is_campaign: true })];
    const tt = tomTatTheoPhong(cd, MOC);
    expect(tt).toHaveLength(1);
    expect(tt[0].departmentId).toBe('A');
  });
});

describe('Xếp hạng thi đua', () => {
  it('ưu tiên NHỊP trước khối lượng — phòng ít việc mà đều nhịp đứng trên', () => {
    const tt = tomTatTheoPhong(
      [
        // Phòng nhiều việc nhưng bỏ bẵng
        keHoach({ id: 'x1', owner_department_id: 'NHIEU', status: 'doing', progress_percent: 80 }),
        keHoach({ id: 'x2', owner_department_id: 'NHIEU', status: 'doing', progress_percent: 80 }),
        keHoach({ id: 'x3', owner_department_id: 'NHIEU', status: 'doing', progress_percent: 80 }),
        // Phòng ít việc nhưng tuần nào cũng báo
        keHoach({ id: 'y1', owner_department_id: 'DEU', status: 'doing', progress_percent: 20, last_progress_at: '2026-08-04T02:00:00Z' }),
      ],
      MOC,
    );
    expect(xepHangPhong(tt)[0].departmentId).toBe('DEU');
  });

  it('cùng nhịp thì phòng ít quá hạn đứng trên', () => {
    const tt = tomTatTheoPhong(
      [
        keHoach({ id: 'a', owner_department_id: 'P1', status: 'doing', due_date: '2026-07-01', last_progress_at: '2026-08-04T02:00:00Z' }),
        keHoach({ id: 'b', owner_department_id: 'P2', status: 'doing', due_date: '2026-09-01', last_progress_at: '2026-08-04T02:00:00Z' }),
      ],
      MOC,
    );
    expect(xepHangPhong(tt)[0].departmentId).toBe('P2');
  });
});

describe('Sắp xếp thẻ trong cột', () => {
  it('quá hạn lên đầu, rồi tới bỏ nhịp, rồi tới gần hạn', () => {
    const ds = [
      keHoach({ id: 'binh-thuong', due_date: '2026-12-01', last_progress_at: '2026-08-04T02:00:00Z' }),
      keHoach({ id: 'qua-han', due_date: '2026-07-01' }),
      keHoach({ id: 'bo-nhip', due_date: '2026-12-01' }),
    ];
    expect(sapXepKeHoach(ds, MOC).map((p) => p.id)).toEqual(['qua-han', 'bo-nhip', 'binh-thuong']);
  });

  it('việc không đặt hạn xếp sau việc có hạn', () => {
    const ds = [
      keHoach({ id: 'khong-han', last_progress_at: '2026-08-04T02:00:00Z' }),
      keHoach({ id: 'co-han', due_date: '2026-12-01', last_progress_at: '2026-08-04T02:00:00Z' }),
    ];
    expect(sapXepKeHoach(ds, MOC).map((p) => p.id)).toEqual(['co-han', 'khong-han']);
  });
});

describe('Nhận diện chưa áp migration', () => {
  it('bắt được mã lỗi thiếu bảng của Postgres', () => {
    expect(laLoiThieuBang({ code: '42P01' })).toBe(true);
    expect(laLoiThieuBang({ message: 'relation "public.action_plans" does not exist' })).toBe(true);
  });

  it('không nhầm lỗi khác thành thiếu bảng', () => {
    expect(laLoiThieuBang(null)).toBe(false);
    expect(laLoiThieuBang({ code: '42501', message: 'permission denied' })).toBe(false);
  });
});
