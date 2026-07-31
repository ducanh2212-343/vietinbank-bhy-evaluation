import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, KeyRound } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useAuth } from '@/hooks/useAuth';
import { useNavTree } from '@/hooks/useNavTree';
import { NoiDungMenuPhanHe } from '@/components/layout/WorkspaceSidebar';
import { isFolder, matchesLeaf, leavesOf } from '@/lib/navigation';
import { cn } from '@/lib/utils';

/**
 * Điều hướng cho điện thoại: thanh tab dưới đáy + tấm menu toàn màn hình.
 *
 * Bản cũ chỉ có một lối vào là nút hamburger ở góc trên-trái — vị trí xa ngón
 * cái nhất trên màn hình cầm một tay, và đi từ cổng ONE sang phân hệ 343 mất 6
 * thao tác. Thanh tab đưa 4 khu hay dùng nhất về đúng 1 chạm.
 *
 * Tấm menu dùng vaul (Drawer) nên có sẵn bẫy tiêu điểm, đóng bằng Esc, khoá
 * cuộn nền và cử chỉ vuốt xuống — những thứ ngăn kéo tự chế của bản cũ đều thiếu.
 */
export function MobileNav() {
  const { sections } = useNavTree();
  const { user, roles, isGuest, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [moMenu, setMoMenu] = useState(false);

  // Đổi trang thì đóng tấm menu
  useEffect(() => setMoMenu(false), [pathname]);

  // 4 khu cổng đầu tiên lên thanh tab; phần còn lại nằm trong "Thêm".
  // Khách đối tác chỉ có 2–3 khu nên thanh tự co lại.
  const tabs = sections.filter((s) => s.zone === 'portal').slice(0, 4);
  const coKhuLamViec = sections.some((s) => s.zone === 'workspace');

  return (
    <>
      {/* Thanh tab dưới đáy — chỉ điện thoại */}
      <nav
        aria-label="Điều hướng nhanh"
        className={cn(
          'fixed inset-x-0 bottom-0 z-header border-t border-border/70 md:hidden',
          'bg-background/85 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/70',
          'pb-[env(safe-area-inset-bottom)]',
        )}
      >
        <ul className="flex items-stretch">
          {tabs.map((section) => {
            const dangXem = leavesOf(section).some((l) => matchesLeaf(pathname, l));
            const dich = section.path ?? leavesOf(section)[0]?.path ?? '/one';
            return (
              <li key={section.id} className="min-w-0 flex-1">
                <NavLink
                  to={dich}
                  end={section.end}
                  aria-current={dangXem ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors duration-fast',
                    dangXem ? 'text-primary' : 'text-muted-foreground active:bg-muted',
                  )}
                >
                  <section.icon className={cn('h-[22px] w-[22px] shrink-0', dangXem && 'stroke-[2.25]')} />
                  <span className="w-full truncate text-center text-[10px] font-medium leading-tight">
                    {section.shortLabel ?? section.label}
                  </span>
                </NavLink>
              </li>
            );
          })}

          <li className="min-w-0 flex-1">
            <Drawer open={moMenu} onOpenChange={setMoMenu}>
              <DrawerTrigger
                aria-label="Mở toàn bộ menu"
                className={cn(
                  'flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5',
                  'text-muted-foreground transition-colors duration-fast active:bg-muted',
                  moMenu && 'text-primary',
                )}
              >
                <Menu className="h-[22px] w-[22px] shrink-0" />
                <span className="text-[10px] font-medium leading-tight">Thêm</span>
              </DrawerTrigger>

              <DrawerContent className="max-h-[88dvh]">
                <DrawerTitle className="sr-only">Toàn bộ menu</DrawerTitle>

                <div className="overflow-y-auto overscroll-contain px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                  {/* Tài khoản */}
                  <div className="mb-3 flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
                    <span
                      aria-hidden
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-semibold text-primary"
                    >
                      {(user?.email ?? '?').slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{user?.email}</p>
                      {roles[0] && <p className="truncate text-xs text-muted-foreground">{roles[0]}</p>}
                    </div>
                  </div>

                  {/* Mọi khu của cổng */}
                  <div className="space-y-0.5">
                    <div className="px-2.5 pb-1 pt-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Cổng BHY ONE
                    </div>
                    {sections
                      .filter((s) => s.zone === 'portal')
                      .flatMap((section) =>
                        leavesOf(section).map((leaf) => {
                          const dangXem = matchesLeaf(pathname, leaf);
                          return (
                            <NavLink
                              key={`${section.id}-${leaf.path}`}
                              to={leaf.path}
                              end={leaf.end}
                              aria-current={dangXem ? 'page' : undefined}
                              className={cn(
                                'flex min-h-[44px] items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors duration-fast',
                                dangXem ? 'bg-accent font-semibold text-accent-foreground' : 'active:bg-muted',
                              )}
                            >
                              <leaf.icon className="h-[18px] w-[18px] shrink-0 text-primary" />
                              <span className="truncate">{leaf.label}</span>
                            </NavLink>
                          );
                        }),
                      )}
                  </div>

                  {/* Phân hệ chuyên sâu — dùng lại đúng cây của menu dọc */}
                  {coKhuLamViec && (
                    <div className="mt-2 rounded-2xl bg-sidebar px-2 pb-3 pt-1">
                      <NoiDungMenuPhanHe onDieuHuong={() => setMoMenu(false)} />
                    </div>
                  )}

                  {/* Tài khoản — tách khỏi điều hướng, đăng xuất để riêng dưới cùng */}
                  <div className="mt-3 space-y-0.5 border-t border-border pt-3">
                    {/* Khách đối tác bị GuestGate chặn trang này — không mời vào ngõ cụt */}
                    {!isGuest && (
                      <button
                        type="button"
                        onClick={() => { setMoMenu(false); navigate('/ho-so-ca-nhan'); }}
                        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm active:bg-muted"
                      >
                        <User className="h-[18px] w-[18px] shrink-0" />
                        Hồ sơ cá nhân
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setMoMenu(false); navigate('/doi-mat-khau'); }}
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm active:bg-muted"
                    >
                      <KeyRound className="h-[18px] w-[18px] shrink-0" />
                      Đổi mật khẩu
                    </button>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-destructive active:bg-destructive/10"
                    >
                      <LogOut className="h-[18px] w-[18px] shrink-0" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </li>
        </ul>
      </nav>
    </>
  );
}
