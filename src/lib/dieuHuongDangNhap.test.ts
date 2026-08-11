import { describe, expect, it } from 'vitest';
import { DICH_MAC_DINH, dichSauDangNhap, lienDangNhap } from './dieuHuongDangNhap';

describe('Giữ đích đến qua cửa đăng nhập', () => {
  it('mang nguyên đường dẫn kèm tham số của thẻ việc', () => {
    const lien = lienDangNhap({ pathname: '/one/chieu-thuc-2', search: '?the=abc-123' });
    expect(lien).toBe('/dang-nhap?tiep=%2Fone%2Fchieu-thuc-2%3Fthe%3Dabc-123');
    // Đi vòng qua cửa đăng nhập rồi phải ra đúng chỗ cũ
    expect(dichSauDangNhap(new URL(`https://x${lien}`).search)).toBe('/one/chieu-thuc-2?the=abc-123');
  });

  it('giữ được cả tab hồ sơ tín dụng và trang Kanban CT3', () => {
    const hoSo = lienDangNhap({ pathname: '/one/chieu-thuc-2', search: '?tab=tin-dung' });
    expect(dichSauDangNhap(new URL(`https://x${hoSo}`).search)).toBe('/one/chieu-thuc-2?tab=tin-dung');
    const kanban = lienDangNhap({ pathname: '/hanh-dong-phat-trien', search: '?view=team' });
    expect(dichSauDangNhap(new URL(`https://x${kanban}`).search)).toBe('/hanh-dong-phat-trien?view=team');
  });

  it('không có tham số thì về cổng ONE', () => {
    expect(dichSauDangNhap('')).toBe(DICH_MAC_DINH);
    expect(dichSauDangNhap('?tiep=')).toBe(DICH_MAC_DINH);
  });

  it('chặn mọi đường ném người dùng ra ngoài hệ thống', () => {
    // Tên miền khác đội lốt đường dẫn nội bộ — trình duyệt hiểu «//» là tên miền
    expect(dichSauDangNhap('?tiep=' + encodeURIComponent('//trang-gia-mao.com'))).toBe(DICH_MAC_DINH);
    expect(dichSauDangNhap('?tiep=' + encodeURIComponent('/\\trang-gia-mao.com'))).toBe(DICH_MAC_DINH);
    expect(dichSauDangNhap('?tiep=' + encodeURIComponent('https://trang-gia-mao.com'))).toBe(DICH_MAC_DINH);
    expect(dichSauDangNhap('?tiep=' + encodeURIComponent('javascript:alert(1)'))).toBe(DICH_MAC_DINH);
    // Ký tự điều khiển chèn giữa để lách bộ lọc
    expect(dichSauDangNhap('?tiep=' + encodeURIComponent('/\nhttps://trang-gia-mao.com'))).toBe(DICH_MAC_DINH);
    // Và lienDangNhap cũng không tự sinh ra tham số bẩn
    expect(lienDangNhap({ pathname: '//trang-gia-mao.com' })).toBe('/dang-nhap');
  });

  it('không quay vòng lại chính cửa đăng nhập', () => {
    expect(lienDangNhap({ pathname: '/dang-nhap' })).toBe('/dang-nhap');
    expect(dichSauDangNhap('?tiep=' + encodeURIComponent('/dang-nhap?tiep=%2Fone'))).toBe(DICH_MAC_DINH);
  });

  it('giữ dấu gạch ngang trong đường dẫn — mọi trang của hệ thống đều có', () => {
    // Chốt chặn cho lỗi đã mắc khi viết: dải ký tự điều khiển viết hụt thành «khoảng
    // trắng tới gạch ngang» sẽ loại sạch /dang-nhap, /chieu-thuc-2, /hanh-dong-phat-trien…
    expect(dichSauDangNhap('?tiep=' + encodeURIComponent('/hanh-dong-phat-trien')))
      .toBe('/hanh-dong-phat-trien');
    expect(dichSauDangNhap('?tiep=' + encodeURIComponent('/one/chieu-thuc-2')))
      .toBe('/one/chieu-thuc-2');
  });
});
