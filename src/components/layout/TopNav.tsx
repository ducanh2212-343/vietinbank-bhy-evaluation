import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import * as NavMenu from '@radix-ui/react-navigation-menu';
import { ChevronDown, Search, LogOut, User, KeyRound } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useNavTree } from '@/hooks/useNavTree';
import { isFolder, matchesLeaf, leavesOf, type NavSection } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import vtbLogo from '@/assets/vietinbank-bhy-logo.png';

const ROLE_LABEL: Record<string, string> = {
  bgd: 'Ban Giám đốc',
  tcth_admin: 'TCTH Admin',
  system_admin: 'System Admin',
  manager: 'Trưởng phòng',
  pgd: 'Phó Giám đốc',
  employee: 'Nhân viên',
  guest: 'Khách đối tác',
};

/** Khu này có cần bảng menu bung xuống không, hay chỉ là một liên kết đơn? */
function coBangMenu(section: NavSection): boolean {
  const leaves = leavesOf(section);
  if (leaves.length === 0) return false;
  // Khu dẫn thẳng tới một trang và chỉ có đúng mục đó thì không cần bảng
  if (section.path && leaves.length === 1 && leaves[0].path === section.path) return false;
  return true;
}

/** Bảng menu bung xuống: một cột cho khu ít mục, nhiều cột cho phân hệ lớn. */
function BangMenu({ section, onDieuHuong }: { section: NavSection; onDieuHuong: () => void }) {
  const { pathname } = useLocation();
  const folders = (section.items ?? []).filter(isFolder);
  const leavesTrucTiep = (section.items ?? []).filter((e) => !isFolder(e));

  // Phân hệ nhiều thư mục → mega-menu chia cột; khu nhỏ → một cột gọn
  const laMega = folders.length > 1;

  return (
    <div
      className={cn(
        'p-4 sm:p-5',
        laMega ? 'w-[min(92vw,64rem)]' : 'w-[min(92vw,20rem)]',
      )}
    >
      {laMega && section.desc && (
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">{section.desc}</p>
      )}

      <div
        className={cn(
          laMega
            ? 'grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3'
            : 'flex flex-col gap-0.5',
        )}
      >
        {leavesTrucTiep.map((leaf) => {
          if (isFolder(leaf)) return null;
          const dangXem = matchesLeaf(pathname, leaf);
          return (
            <NavMenu.Link asChild key={leaf.path}>
              <Link
                to={leaf.path}
                onClick={onDieuHuong}
                aria-current={dangXem ? 'page' : undefined}
                className={cn(
                  'group flex min-h-[44px] items-start gap-3 rounded-xl px-3 py-2.5 transition-colors duration-fast',
                  dangXem ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                )}
              >
                <leaf.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-snug">{leaf.label}</span>
                </span>
              </Link>
            </NavMenu.Link>
          );
        })}

        {folders.map((folder) => (
          <div key={folder.id} className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2 px-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              <folder.icon className="h-3.5 w-3.5" />
              {folder.folder}
            </div>
            <div className="flex flex-col gap-0.5">
              {folder.items.map((leaf) => {
                const dangXem = matchesLeaf(pathname, leaf);
                return (
                  <NavMenu.Link asChild key={leaf.path}>
                    <Link
                      to={leaf.path}
                      onClick={onDieuHuong}
                      aria-current={dangXem ? 'page' : undefined}
                      className={cn(
                        'flex min-h-[36px] items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors duration-fast',
                        dangXem
                          ? 'bg-accent font-semibold text-accent-foreground'
                          : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <leaf.icon className="h-[15px] w-[15px] shrink-0 opacity-70" />
                      <span className="truncate">{leaf.label}</span>
                    </Link>
                  </NavMenu.Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  /** Mở bảng lệnh ⌘K */
  onMoBangLenh: () => void;
}

/**
 * Thanh điều hướng ngang toàn cục — tầng 1 của cổng, hiện ở MỌI trang sau đăng
 * nhập (nguyên tắc #3, docs/so-do-site-bhy-one.md: "ở đâu cũng thấy thanh ONE —
 * một cổng, không phải hai website").
 *
 * Bảng menu con dùng Radix NavigationMenu: nội dung chỉ được gắn vào DOM khi mở,
 * nên ~60 mục của phân hệ 343 không nằm sẵn trong cây DOM của mọi trang.
 */
export function TopNav({ onMoBangLenh }: Props) {
  const { user, roles, signOut } = useAuth();
  const { sections } = useNavTree();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  // Trên máy Apple hiện ⌘K, còn lại hiện Ctrl K
  const [phimTat, setPhimTat] = useState('Ctrl K');

  useEffect(() => {
    if (typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)) {
      setPhimTat('⌘K');
    }
  }, []);

  // Đổi trang thì đóng bảng menu đang mở
  useEffect(() => setValue(''), [pathname]);

  const vaiTro = roles.length > 0 ? ROLE_LABEL[roles[0]] || roles[0] : '';

  return (
    <header className="sticky top-0 z-header border-b border-border/70 bg-background/80 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-1 px-3 sm:px-4 lg:px-6">
        {/* Nhận diện — về trang chủ cổng */}
        <Link
          to="/one"
          className="flex shrink-0 items-center gap-2.5 rounded-xl py-1 pr-2 transition-opacity duration-fast hover:opacity-80"
        >
          <img
            src={vtbLogo}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-lg bg-white object-contain p-0.5 shadow-soft"
          />
          <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:block">
            BHY <span className="text-primary">ONE</span>
          </span>
        </Link>

        {/* Điều hướng chính — máy tính và máy tính bảng ngang */}
        <NavMenu.Root
          value={value}
          onValueChange={setValue}
          aria-label="Điều hướng chính cổng BHY ONE"
          className="relative ml-1 hidden min-w-0 flex-1 md:block"
          // Trễ 0 khi rời chuột để bảng không dính lại lúc lướt qua
          delayDuration={80}
          skipDelayDuration={300}
        >
          <NavMenu.List className="flex list-none items-center gap-0.5">
            {sections.map((section) => {
              const dangXem = leavesOf(section).some((l) => matchesLeaf(pathname, l));
              const nhan = (
                <>
                  <span className="truncate">{section.label}</span>
                </>
              );

              if (!coBangMenu(section)) {
                return (
                  <NavMenu.Item key={section.id}>
                    <NavMenu.Link asChild active={dangXem}>
                      <NavLink
                        to={section.path!}
                        end={section.end}
                        className={cn(
                          'relative flex h-9 items-center rounded-full px-3 text-sm font-medium transition-colors duration-fast lg:px-3.5',
                          dangXem
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground/75 hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {nhan}
                      </NavLink>
                    </NavMenu.Link>
                  </NavMenu.Item>
                );
              }

              return (
                <NavMenu.Item key={section.id} value={section.id}>
                  <NavMenu.Trigger
                    className={cn(
                      'group flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium outline-none transition-colors duration-fast lg:px-3.5',
                      dangXem
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/75 hover:bg-muted hover:text-foreground',
                      'data-[state=open]:bg-muted data-[state=open]:text-foreground',
                    )}
                  >
                    {nhan}
                    <ChevronDown
                      aria-hidden
                      className="h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-normal group-data-[state=open]:rotate-180"
                    />
                  </NavMenu.Trigger>
                  <NavMenu.Content
                    className={cn(
                      'data-[motion=from-start]:animate-menu-in data-[motion=from-end]:animate-menu-in',
                      'data-[motion=to-start]:animate-menu-out data-[motion=to-end]:animate-menu-out',
                      'data-[state=open]:animate-menu-in data-[state=closed]:animate-menu-out',
                    )}
                  >
                    <BangMenu section={section} onDieuHuong={() => setValue('')} />
                  </NavMenu.Content>
                </NavMenu.Item>
              );
            })}
          </NavMenu.List>

          {/* Khung chứa bảng menu — neo dưới thanh, bo góc mềm như thẻ vật lý */}
          <div className="absolute left-0 top-full flex w-full justify-start pt-2">
            <NavMenu.Viewport
              className={cn(
                'relative h-[var(--radix-navigation-menu-viewport-height)] w-[var(--radix-navigation-menu-viewport-width)]',
                'origin-top overflow-hidden rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-menu',
                'transition-[width,height] duration-normal ease-smooth',
                'data-[state=open]:animate-menu-in data-[state=closed]:animate-menu-out',
              )}
            />
          </div>
        </NavMenu.Root>

        <div className="flex-1 md:hidden" />

        {/* Tìm kiếm — nút mở bảng lệnh, thay ô nhập trang trí của bản cũ */}
        <button
          type="button"
          onClick={onMoBangLenh}
          aria-label="Tìm kiếm và đi nhanh tới trang"
          className={cn(
            'group flex h-9 items-center gap-2 rounded-full border border-border/70 bg-muted/40 pl-3 pr-2 text-sm text-muted-foreground',
            'transition-colors duration-fast hover:bg-muted hover:text-foreground',
            'lg:w-56',
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden flex-1 text-left lg:block">Tìm kiếm…</span>
          <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-sans text-2xs font-medium lg:block">
            {phimTat}
          </kbd>
        </button>

        <ThemeToggle />

        {/* Tài khoản */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'flex h-9 min-w-0 shrink-0 items-center gap-2 rounded-full pl-1 pr-1.5 text-sm outline-none',
              'transition-colors duration-fast hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label="Mở menu tài khoản"
          >
            <span
              aria-hidden
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/12 text-2xs font-semibold text-primary"
            >
              {(user?.email ?? '?').slice(0, 2).toUpperCase()}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-sm font-medium">{user?.email}</span>
              {vaiTro && <span className="mt-0.5 block text-xs text-muted-foreground">{vaiTro}</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/ho-so-ca-nhan')}>
              <User className="mr-2 h-4 w-4" />
              Hồ sơ cá nhân
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/doi-mat-khau')}>
              <KeyRound className="mr-2 h-4 w-4" />
              Đổi mật khẩu
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => signOut()}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
