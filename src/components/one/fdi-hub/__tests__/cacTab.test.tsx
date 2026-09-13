import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FdiHubContext } from '../dungChung';
import { TabTongQuan } from '../TabTongQuan';
import { TabHanhTrinh } from '../TabHanhTrinh';
import { TabChecklist } from '../TabChecklist';
import { TabVanHoa } from '../TabVanHoa';
import { TabQuaTang } from '../TabQuaTang';
import { TabKhoCongCu } from '../TabKhoCongCu';
import { TabBaoCaoNhanh } from '../TabBaoCaoNhanh';
import { TabKichBan } from '../TabKichBan';
import { TabTroLyAI } from '../TabTroLyAI';
import { FDI_HUB_CAC_BUOC, FDI_HUB_NEO } from '@/data/one/fdiHub';

/**
 * Chín tab dựng từ dữ liệu thuần — kiểm thử này chỉ cần chắc mỗi tab render
 * không ném lỗi và các tương tác chính (chọn bước, tích việc, chip liên kết)
 * chạy đúng. Nội dung được soát ở fdiHub.test.ts.
 */

function dung(ui: React.ReactElement, diDenTab = vi.fn()) {
  return { ...render(<FdiHubContext.Provider value={{ tab: 'tong-quan', diDenTab }}>{ui}</FdiHubContext.Provider>), diDenTab };
}

describe('FDI Hub — các tab render được', () => {
  it.each([
    ['Tổng quan', <TabTongQuan />],
    ['Hành trình', <TabHanhTrinh />],
    ['Checklist', <TabChecklist />],
    ['Văn hóa', <TabVanHoa />],
    ['Quà tặng', <TabQuaTang />],
    ['Kho công cụ', <TabKhoCongCu />],
    ['Báo cáo nhanh', <TabBaoCaoNhanh />],
    ['Kịch bản', <TabKichBan />],
    ['Trợ lý AI', <TabTroLyAI />],
  ])('tab %s', (_ten, ui) => {
    const { container } = dung(ui);
    // Mỗi tab mở đầu bằng dải màu có tiêu đề, và ruột phải có nội dung thật
    expect(container.textContent?.length ?? 0).toBeGreaterThan(300);
  });
});

describe('FDI Hub — hành trình 6 bước', () => {
  it('chọn mốc thì hiện đúng bước; tích việc đếm lên; đánh dấu xong cộng vào tiến độ', () => {
    window.localStorage.clear();
    dung(<TabHanhTrinh />);
    const b2 = FDI_HUB_CAC_BUOC[1];
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${b2.ma} · ${b2.ten}`) }));
    expect(screen.getByRole('heading', { level: 3, name: b2.tieuDe })).toBeInTheDocument();

    const oTich = screen.getAllByRole('checkbox');
    expect(oTich).toHaveLength(b2.viecCanLam.length);
    fireEvent.click(oTich[0]);
    expect(screen.getByText(`(1/${b2.viecCanLam.length})`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu hoàn thành' }));
    expect(screen.getByText('1/6 bước đã hoàn thành')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '✓ Đã hoàn thành' })).toBeInTheDocument();

    // Tiến độ nằm trong localStorage dưới tiền tố fdihub:
    expect(window.localStorage.getItem('fdihub:hanh-trinh')).toContain('"B2":true');
  });

  it('chip liên kết nội bộ gọi diDenTab với đúng tab và neo', () => {
    window.localStorage.clear();
    const { diDenTab } = dung(<TabHanhTrinh />);
    const b2 = FDI_HUB_CAC_BUOC[1];
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${b2.ma} · ${b2.ten}`) }));
    fireEvent.click(screen.getByRole('button', { name: /Dùng WeChat hiệu quả/ }));
    expect(diDenTab).toHaveBeenCalledWith('van-hoa', FDI_HUB_NEO.vanHoaWechat);
  });
});

describe('FDI Hub — báo cáo nhanh', () => {
  it('chưa nhập tên thì nút sao chép tắt; nhập tên thì prompt xem trước ghép tên', () => {
    window.localStorage.clear();
    dung(<TabBaoCaoNhanh />);
    const nut = screen.getByRole('button', { name: /Sao chép prompt đầy đủ/ });
    expect(nut).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Tên doanh nghiệp/), { target: { value: 'Công ty ABC' } });
    expect(nut).toBeEnabled();
    expect(screen.getByText(/Doanh nghiệp cần phân tích: Công ty ABC/)).toBeInTheDocument();
  });
});

describe('FDI Hub — quà tặng', () => {
  it('bấm điểm chạm thì mở chi tiết quà ưu tiên', () => {
    dung(<TabQuaTang />);
    fireEvent.click(screen.getByRole('button', { name: /Khai trương nhà máy/ }));
    expect(screen.getByText('Điểm chạm 4 — Khai trương nhà máy')).toBeInTheDocument();
    expect(screen.getByText('Tranh đồng thiết kế riêng nhà máy')).toBeInTheDocument();
  });
});
