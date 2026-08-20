#!/usr/bin/env node
/**
 * Tạo một mục lịch sử phiên bản mới.
 *
 *   npm run phien-ban -- co-gi-moi --loai=tinh-nang --phan-he=nen-tang
 *
 * Sinh ra file `src/data/changelog/<YYYY-MM-DD>-<slug>.ts` với đủ khung để điền.
 * Lý do có script này thay vì "copy file cũ rồi sửa": copy file cũ là cách chắc
 * chắn nhất để quên đổi `ma` — mà `ma` trùng thì kiểm thử đỏ, còn tệ hơn là hai
 * mục đè lên nhau trong mốc "đã xem" của cán bộ.
 *
 * KHÔNG có tham số số phiên bản: số phiên bản do hệ thống tự tính từ `loai`.
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const THU_MUC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'changelog');
const CAC_LOAI = ['lon', 'tinh-nang', 'sua-loi'];
const CAC_PHAN_HE = ['one-home', 'cay-ky-uc', 'bhy-ways', 'chieu-thuc-2', 'hr-343', 'user-admin', 'nen-tang'];

const thamSo = process.argv.slice(2);
const co = (ten) => {
  const t = thamSo.find((x) => x.startsWith(`--${ten}=`));
  return t ? t.split('=').slice(1).join('=') : null;
};
const slug = thamSo.find((x) => !x.startsWith('--'));
const loai = co('loai') || 'tinh-nang';
const phanHe = co('phan-he') || 'nen-tang';
const ngay = co('ngay') || new Date().toISOString().slice(0, 10);

function thoat(thongDiep) {
  console.error(`✗ ${thongDiep}`);
  process.exit(1);
}

if (!slug) {
  thoat('Thiếu tên ngắn (slug). Ví dụ: npm run phien-ban -- nhac-nhip-sang --loai=tinh-nang --phan-he=chieu-thuc-2');
}
if (!/^[a-z0-9-]+$/.test(slug)) thoat('Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.');
if (!CAC_LOAI.includes(loai)) thoat(`--loai phải là một trong: ${CAC_LOAI.join(' | ')}`);
if (!CAC_PHAN_HE.includes(phanHe)) thoat(`--phan-he phải là một trong: ${CAC_PHAN_HE.join(' | ')}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) thoat('--ngay phải dạng YYYY-MM-DD.');

const ma = `${ngay}-${slug}`;
const duongDan = join(THU_MUC, `${ma}.ts`);
if (existsSync(duongDan)) thoat(`Đã có file ${ma}.ts — đổi slug hoặc sửa thẳng file đó.`);

mkdirSync(THU_MUC, { recursive: true });
writeFileSync(duongDan, `import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '${ma}',
  ngay: '${ngay}',
  loai: '${loai}',
  phanHe: '${phanHe}',
  // Một câu nói rõ CÁN BỘ ĐƯỢC GÌ (≤ 80 ký tự). Không nói tên bảng, tên hàm.
  tieuDe: 'TODO',
  // 1–3 câu: dùng để làm gì, thay cho cách làm cũ nào.
  tomTat: 'TODO',
  // 1–5 gạch đầu dòng — điểm chính của lần cập nhật này.
  diemChinh: [
    'TODO',
  ],
  // duongDan: '/duong-dan-mo-thang-tinh-nang',
  // danhCho: ['system_admin', 'tcth_admin', 'bgd'],  // bỏ trống = mọi cán bộ
  // pr: 0,
};

export default muc;
`, 'utf8');

console.log(`✓ Đã tạo src/data/changelog/${ma}.ts`);
console.log('  Điền tieuDe / tomTat / diemChinh rồi chạy: npm run test -- lichSuPhienBan');
