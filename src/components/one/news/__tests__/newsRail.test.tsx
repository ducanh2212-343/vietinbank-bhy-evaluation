import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NewsRail } from '../NewsRail';
import { SO_TIN_TRANG_CHU } from '@/lib/tinTuc';
import type { UploadedItem } from '@/data/one/types';

function tin(id: string, extra: Partial<UploadedItem> = {}): UploadedItem {
  return {
    id,
    title: `Tin số ${id}`,
    category: 'sharing',
    author: 'Nguyễn Văn A',
    department: 'Phòng TCTH',
    date: '1/8/2026',
    summary: 'Tóm tắt tin',
    tags: [],
    likes: 3,
    ...extra,
  };
}

function dung(items: UploadedItem[]) {
  return render(
    <MemoryRouter>
      <NewsRail items={items} />
    </MemoryRouter>,
  );
}

describe('Dải tin tức nội bộ trên Trang chủ', () => {
  it('không dựng gì khi chưa có tin — không để lại tiêu đề rỗng giữa trang', () => {
    const { container } = dung([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('cắt còn đúng số tin của Trang chủ, phần còn lại đọc ở trang tin đầy đủ', () => {
    dung([...Array(30)].map((_, i) => tin(String(i))));
    const khu = screen.getByLabelText('Dải tin tức nội bộ');
    const the = within(khu).getAllByRole('link');
    // Số thẻ tin + 1 thẻ "Xem tất cả tin tức" ở cuối dải
    expect(the).toHaveLength(SO_TIN_TRANG_CHU + 1);
    expect(within(khu).getByText('Xem tất cả tin tức')).toBeInTheDocument();
  });

  it('tin ghim đứng đầu dải dù nằm cuối kho', () => {
    dung([tin('a'), tin('b'), tin('c', { isFeatured: true, title: 'Tin được ghim' })]);
    const khu = screen.getByLabelText('Dải tin tức nội bộ');
    const dauTien = within(khu).getAllByRole('link')[0];
    expect(dauTien).toHaveTextContent('Tin được ghim');
    expect(dauTien).toHaveTextContent('Ghim');
  });

  it('mỗi thẻ dẫn thẳng tới đúng tin trong trang danh sách đầy đủ', () => {
    dung([tin('abc')]);
    const khu = screen.getByLabelText('Dải tin tức nội bộ');
    expect(within(khu).getAllByRole('link')[0]).toHaveAttribute('href', '/one/tin-tuc?tin=abc');
  });

  it('có nút trượt cho chuột và dải tự cuộn được bằng bàn phím', () => {
    dung([...Array(5)].map((_, i) => tin(String(i))));
    expect(screen.getByLabelText('Xem các tin tiếp theo')).toBeInTheDocument();
    expect(screen.getByLabelText('Xem các tin trước đó')).toBeInTheDocument();
    expect(screen.getByLabelText('Dải tin tức nội bộ')).toHaveAttribute('tabindex', '0');
  });
});
