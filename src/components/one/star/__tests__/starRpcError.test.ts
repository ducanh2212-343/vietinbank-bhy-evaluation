import { describe, expect, it } from 'vitest';
import { rpcErrorMessage } from '../starRpcError';

describe('rpcErrorMessage — không bao giờ hiện "[object Object]"', () => {
  it('đọc được lỗi supabase-js trả về (object thường, không phải Error) — ca thật 04/09', () => {
    const loiTuMayChu = {
      message: 'Các số không còn trong kho (đã bàn giao/đã tặng/đã hủy): 209, 210, 211',
      details: null,
      hint: null,
      code: 'P0001',
    };
    expect(rpcErrorMessage(loiTuMayChu)).toBe(
      'Các số không còn trong kho (đã bàn giao/đã tặng/đã hủy): 209, 210, 211',
    );
    expect(rpcErrorMessage(loiTuMayChu)).not.toContain('[object Object]');
  });

  it('vẫn đọc được Error thật và chuỗi trần', () => {
    expect(rpcErrorMessage(new Error('Chưa đăng nhập'))).toBe('Chưa đăng nhập');
    expect(rpcErrorMessage('Lỗi mạng')).toBe('Lỗi mạng');
  });

  it('bỏ tiền tố mã lỗi P0001 nếu có', () => {
    expect(rpcErrorMessage({ message: 'ERROR: P0001: Chỉ Phòng TCTH được bàn giao sao' }))
      .toBe('Chỉ Phòng TCTH được bàn giao sao');
  });

  it('object không có message thì in nội dung ra, không in "[object Object]"', () => {
    expect(rpcErrorMessage({ code: 'PGRST202' })).toBe('{"code":"PGRST202"}');
    expect(rpcErrorMessage({})).toBe('{}');
  });

  it('null / undefined / chuỗi rỗng thì ra câu mặc định có hướng dẫn', () => {
    expect(rpcErrorMessage(null)).toMatch(/Lỗi không xác định/);
    expect(rpcErrorMessage(undefined)).toMatch(/Lỗi không xác định/);
    expect(rpcErrorMessage({ message: '   ' })).toMatch(/Lỗi không xác định/);
  });
});
