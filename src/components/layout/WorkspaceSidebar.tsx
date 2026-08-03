import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNavTree } from '@/hooks/useNavTree';
import { useMoThuMuc } from '@/hooks/useMoThuMuc';
import { isFolder, matchesLeaf, type NavFolder, type NavLeaf, type NavSection } from '@/lib/navigation';
import { cn } from '@/lib/utils';

function MucLa({ leaf, onDieuHuong }: { leaf: NavLeaf; onDieuHuong?: () => void }) {
  const { pathname } = useLocation();
  const dangXem = matchesLeaf(pathname, leaf);
  return (
    <NavLink
      to={leaf.path}
      onClick={onDieuHuong}
      aria-current={dangXem ? 'page' : undefined}
      className={cn(
        'flex min-h-[36px] items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-0',
        dangXem
          ? 'bg-white/[0.14] font-semibold text-white shadow-[inset_2px_0_0_0_hsl(var(--brand-gold))]'
          : 'text-sidebar-foreground/85 hover:bg-white/[0.07] hover:text-white',
      )}
    >
      <leaf.icon className="h-[15px] w-[15px] shrink-0 opacity-75" />
      <span className="truncate">{leaf.label}</span>
    </NavLink>
  );
}

function ThuMuc({
  folder,
  onDieuHuong,
}: {
  folder: NavFolder;
  onDieuHuong?: () => void;
}) {
  const { pathname } = useLocation();
  const chuaTrangHienTai = folder.items.some((l) => matchesLeaf(pathname, l));
  const { banDo, dao, mo: moThuMuc } = useMoThuMuc();

  // Vào bằng liên kết trực tiếp thì tự mở đúng thư mục chứa trang đó
  useEffect(() => {
    if (chuaTrangHienTai) moThuMuc(folder.id);
  }, [chuaTrangHienTai, folder.id, moThuMuc]);

  const mo = !!banDo[folder.id];

  return (
    <li>
      <button
        type="button"
        onClick={() => dao(folder.id)}
        aria-expanded={mo}
        aria-controls={`thu-muc-${folder.id}`}
        className={cn(
          'flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors duration-fast',
          'text-sidebar-foreground hover:bg-white/[0.06]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        )}
      >
        <folder.icon className="h-[15px] w-[15px] shrink-0 opacity-75" />
        <span className="flex-1 truncate text-left">{folder.folder}</span>
        <ChevronRight
          aria-hidden
          className={cn('h-3.5 w-3.5 shrink-0 text-sidebar-muted transition-transform duration-normal', mo && 'rotate-90')}
        />
      </button>
      {mo && (
        <ul
          id={`thu-muc-${folder.id}`}
          className="ml-3 mt-0.5 space-y-0.5 border-l border-dashed border-white/15 pl-2"
        >
          {folder.items.map((leaf) => (
            <li key={leaf.path}>
              <MucLa leaf={leaf} onDieuHuong={onDieuHuong} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Cây mục của MỘT khu, có thư mục thu gọn được.
 *
 * Dùng lại ở ba nơi để cách bung mục con giống hệt nhau: menu dọc trên máy tính,
 * tấm «Thêm» toàn màn hình, và tấm bung ra khi chạm một tab khu trên điện thoại.
 * `anTieuDe` dùng khi tên khu đã là tiêu đề của tấm bung ra — khỏi lặp hai lần.
 */
export function NoiDungKhu({
  section,
  onDieuHuong,
  anTieuDe,
}: {
  section: NavSection;
  onDieuHuong?: () => void;
  anTieuDe?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      {!anTieuDe && (
        <div className="px-2.5 pb-1 pt-3 text-2xs font-semibold uppercase tracking-wider text-sidebar-muted">
          {section.label}
        </div>
      )}
      <ul className="space-y-0.5">
        {(section.items ?? []).map((entry) =>
          isFolder(entry) ? (
            <ThuMuc key={entry.id} folder={entry} onDieuHuong={onDieuHuong} />
          ) : (
            <li key={entry.path}>
              <MucLa leaf={entry} onDieuHuong={onDieuHuong} />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

/** Thanh biểu tượng 68px cho máy tính bảng — chạm vào mở cột mục con nổi. */
function ThanhBieuTuong({ sections }: { sections: NavSection[] }) {
  const { pathname } = useLocation();
  // Cột nổi phải tự đóng sau khi chọn trang. Không đóng thì trên máy tính bảng
  // cảm ứng nó nằm đè lên nội dung trang vừa mở, phải chạm ra ngoài mới thoát.
  const [dangMo, setDangMo] = useState<string | null>(null);
  useEffect(() => setDangMo(null), [pathname]);

  return (
    <nav
      aria-label="Điều hướng phân hệ (thu gọn)"
      className="flex h-full w-[68px] flex-col gap-1 overflow-y-auto bg-sidebar px-2 py-3"
    >
      {sections.flatMap((section) =>
        (section.items ?? []).filter(isFolder).map((folder) => {
          const dangXem = folder.items.some((l) => matchesLeaf(pathname, l));
          return (
            <Popover
              key={folder.id}
              open={dangMo === folder.id}
              onOpenChange={(o) => setDangMo(o ? folder.id : null)}
            >
              <PopoverTrigger
                aria-label={folder.folder}
                className={cn(
                  'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-colors duration-fast',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  dangXem
                    ? 'bg-white/[0.14] text-white'
                    : 'text-sidebar-foreground/80 hover:bg-white/[0.07] hover:text-white',
                )}
              >
                <folder.icon className="h-[18px] w-[18px] shrink-0" />
                {/* Lấy nguyên tên rồi cắt xuống dòng, KHÔNG lấy từ đầu tiên: cắt
                    theo dấu cách biến "Cá nhân" thành "Cá", "Quản trị đội ngũ"
                    thành "Quản", "Tổ chức" thành "Tổ" — đọc không ra nghĩa gì. */}
                <span className="line-clamp-2 w-full break-words text-center text-[10px] font-medium leading-[1.15]">
                  {folder.folder}
                </span>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" className="w-64 border-sidebar-border bg-sidebar p-2">
                <div className="px-2 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-sidebar-muted">
                  {folder.folder}
                </div>
                <ul className="space-y-0.5">
                  {folder.items.map((leaf) => (
                    <li key={leaf.path}>
                      <MucLa leaf={leaf} onDieuHuong={() => setDangMo(null)} />
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          );
        }),
      )}
    </nav>
  );
}

/**
 * Menu dọc của phân hệ chuyên sâu (343, Quản trị người dùng) — tầng 2.
 *
 * Chỉ hiện khi trang đang xem thuộc khu 'workspace'; ở cổng ONE người dùng chỉ
 * thấy thanh ngang, đúng nguyên tắc 2 tầng của sơ đồ site đã duyệt. Nhờ vậy hết
 * cảnh hai hệ menu cùng liệt kê một nội dung như bản cũ.
 *
 * Máy tính bảng (768–1023px) hiện thanh biểu tượng 68px thay vì biến mất hoàn
 * toàn như bản cũ (`hidden lg:block`) — dải này gồm toàn bộ iPad cầm dọc.
 */
export function WorkspaceSidebar() {
  const { sections } = useNavTree();
  const khuLamViec = sections.filter((s) => s.zone === 'workspace');
  if (khuLamViec.length === 0) return null;

  return (
    <>
      {/* Máy tính bảng: thanh biểu tượng */}
      <div className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 border-r border-sidebar-border md:block lg:hidden">
        <ThanhBieuTuong sections={khuLamViec} />
      </div>

      {/* Máy tính: menu đầy đủ */}
      <nav
        aria-label="Điều hướng phân hệ"
        className={cn(
          'sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto overscroll-contain',
          'border-r border-sidebar-border bg-sidebar px-2 pb-6 lg:block',
          '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20',
        )}
      >
        {khuLamViec.map((section) => (
          <NoiDungKhu key={section.id} section={section} />
        ))}
      </nav>
    </>
  );
}
