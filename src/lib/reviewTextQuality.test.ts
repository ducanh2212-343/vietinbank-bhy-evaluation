import { describe, expect, it } from 'vitest';
import { isBareAgreement } from './reviewTextQuality';

describe('isBareAgreement — phát hiện ý kiến CBQL "đồng ý" suông', () => {
  it('bắt các cụm đồng ý đơn thuần (kèm dấu câu, hoa thường)', () => {
    expect(isBareAgreement('đồng ý')).toBe(true);
    expect(isBareAgreement('Đồng ý.')).toBe(true);
    expect(isBareAgreement('  ĐỒNG Ý!  ')).toBe(true);
    expect(isBareAgreement('dong y')).toBe(true);
    expect(isBareAgreement('Nhất trí')).toBe(true);
    expect(isBareAgreement('OK')).toBe(true);
    expect(isBareAgreement('đã xem')).toBe(true);
  });

  it('không bắt nhận xét có nội dung thật', () => {
    expect(isBareAgreement('Đồng ý với mức tự chấm vì cán bộ đã có minh chứng xử lý hồ sơ X')).toBe(false);
    expect(isBareAgreement('Nhất trí, tuy nhiên cần bổ sung kỹ năng thuyết trình')).toBe(false);
    expect(isBareAgreement('Cần chủ động hơn trong quý tới')).toBe(false);
  });

  it('bỏ qua chuỗi rỗng/null — không cảnh báo khi chưa nhập', () => {
    expect(isBareAgreement('')).toBe(false);
    expect(isBareAgreement('   ')).toBe(false);
    expect(isBareAgreement(null)).toBe(false);
    expect(isBareAgreement(undefined)).toBe(false);
  });
});
