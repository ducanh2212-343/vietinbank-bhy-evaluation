import { describe, expect, it } from 'vitest';
import {
  apDungKieu, demChuCoDau, doiKieu, tachChu, xoaDinhDang,
} from '../../../supabase/functions/_shared/zaloDinhDang';

// Zalo chỉ nhận văn bản thuần nên «đậm» là thay chữ cái bằng ký tự Unicode có
// sẵn nét đậm. Ràng buộc đã kiểm chứng bằng tin thật gửi vào nhóm 13/09/2026:
// chữ tiếng Việt có dấu KHÔNG có bản đậm/nghiêng, phải giữ nguyên chứ không
// được phân rã dấu (phân rã ra thì Zalo hiện chữ vỡ, dấu lệch).

describe('doiKieu', () => {
  it('chữ không dấu và số thành đậm', () => {
    expect(doiKieu('Lan Anh 12', 'dam')).toBe('𝐋𝐚𝐧 𝐀𝐧𝐡 𝟏𝟐');
  });
  it('chữ có dấu giữ nguyên, không phân rã dấu', () => {
    const ra = doiKieu('Nguyễn Thị', 'dam');
    expect(ra).toBe('𝐍𝐠𝐮𝐲ễ𝐧 𝐓𝐡ị');
    expect(ra.normalize('NFC')).toBe(ra);
  });
  it('nghiêng, gạch chân, gạch ngang', () => {
    expect(doiKieu('Lan', 'nghieng')).toBe('𝘓𝘢𝘯');
    expect(doiKieu('Lan', 'gach_chan')).toBe('L̲a̲n̲');
    expect(doiKieu('Lan', 'gach_ngang')).toBe('L̶a̶n̶');
  });
  it('gạch chân áp được cho cả chữ có dấu — khác hẳn đậm/nghiêng', () => {
    expect(doiKieu('ễ', 'gach_chan')).toBe('ễ̲');
  });
  it('VIẾT HOA giữ đủ dấu tiếng Việt', () => {
    expect(doiKieu('Nguyễn Thị Lan Anh', 'hoa')).toBe('NGUYỄN THỊ LAN ANH');
  });
  it('emoji và khoảng trắng không bị đụng tới', () => {
    expect(doiKieu('⭐ Sao', 'dam')).toBe('⭐ 𝐒𝐚𝐨');
    expect(doiKieu('a b', 'gach_chan')).toBe('a̲ b̲');
  });
  it('đổi kiểu hai lần không chồng nhau — luôn gỡ kiểu cũ trước', () => {
    expect(doiKieu(doiKieu('Lan', 'dam'), 'dam')).toBe('𝐋𝐚𝐧');
    expect(doiKieu(doiKieu('Lan', 'dam'), 'nghieng')).toBe('𝘓𝘢𝘯');
    expect(doiKieu(doiKieu('Lan', 'gach_chan'), 'dam')).toBe('𝐋𝐚𝐧');
  });
});

describe('xoaDinhDang', () => {
  it('trả về chữ gốc từ mọi kiểu', () => {
    for (const k of ['dam', 'dam_sans', 'nghieng', 'gach_chan', 'gach_ngang'] as const) {
      expect(xoaDinhDang(doiKieu('Nguyễn Lan 7', k))).toBe('Nguyễn Lan 7');
    }
  });
});

describe('demChuCoDau — để giao diện cảnh báo trước khi bấm Đậm', () => {
  it('đếm đúng số chữ không đậm được', () => {
    expect(demChuCoDau('Lan Anh')).toBe(0);
    expect(demChuCoDau('Nguyễn Thị')).toBe(2);
    expect(demChuCoDau('SAO XỨNG ĐÁNG')).toBe(3);
  });
  it('đếm trên chữ gốc, không cộng dồn khi đã định dạng', () => {
    expect(demChuCoDau(doiKieu('Nguyễn Thị', 'dam'))).toBe(2);
  });
});

describe('apDungKieu — đoạn bôi đen trong ô soạn mẫu', () => {
  it('ô {ten} được gắn hậu tố, KHÔNG đổi chữ trong ngoặc', () => {
    expect(apDungKieu('{ten_phong}', 'dam')).toBe('{ten_phong:dam}');
  });
  it('đoạn lẫn chữ thường và ô thì mỗi thứ xử lý một kiểu', () => {
    expect(apDungKieu('Chuc mung {ten}!', 'dam')).toBe('𝐂𝐡𝐮𝐜 𝐦𝐮𝐧𝐠 {ten:dam}!');
  });
  it('đổi kiểu ô đã có kiểu thì thay hậu tố, không chồng', () => {
    expect(apDungKieu('{ten:dam}', 'nghieng')).toBe('{ten:nghieng}');
  });
  it('xoá định dạng gỡ luôn hậu tố của ô', () => {
    expect(apDungKieu('{ten:dam} 𝐋𝐚𝐧', 'thuong')).toBe('{ten} Lan');
  });
});

describe('tachChu', () => {
  it('giữ nguyên chữ có dấu và ký tự ngoài mặt phẳng cơ bản', () => {
    expect(tachChu('ễ⭐𝐀')).toEqual(['ễ', '⭐', '𝐀']);
  });
});
