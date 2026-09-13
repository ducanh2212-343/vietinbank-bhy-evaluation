import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { IdCard, Menu, X, LogOut, User, KeyRound } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useAuth } from '@/hooks/useAuth';
import { nhanDangNhap } from '@/lib/taiKhoanKhach';
import { useNavTree } from '@/hooks/useNavTree';
import { NoiDungKhu } from '@/components/layout/WorkspaceSidebar';
import { isFolder, matchesLeaf, leavesOf, type NavSection } from '@/lib/navigation';
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
/** Khu có thư mục con thì phải dựng cây thu gọn, không liệt kê phẳng. */
function coThuMuc(section: NavSection): boolean {
  return (section.items ?? []).some(isFolder);
}

export function MobileNav() {
  const { sections } = useNavTree();
  const { user, roles, isGuest, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [moMenu, setMoMenu] = useState(false);
  // Khu đang bung danh sách con ngay trên thanh tab (khu không dẫn tới trang nào)
  const [khuMo, setKhuMo] = useState<NavSection | null>(null);

  // Đổi trang thì đóng cả tấm menu lẫn danh sách con
  useEffect(() => {
    setMoMenu(false);
    setKhuMo(null);
  }, [pathname]);

  // Thứ tự trên thanh tab do `mobileOrder` quyết định, KHÔNG theo khu bố cục:
  // Chi nhánh muốn Trang chủ → Bắc Hưng Yên Ways → Chiêu thức 3 → Chiêu thức 2,
  // mà Chiêu thức 3 lại là phân hệ chuyên sâu. Khu không đặt mobileOrder thì luôn
  // nằm trong nút «Thêm». Lấy 4 mục đầu; khách đối tác chỉ còn 2 nên thanh tự co.
  const tabs = sections
    .filter((s) => s.mobileOrder !== undefined)
    .sort((a, b) => (a.mobileOrder ?? 99) - (b.mobileOrder ?? 99))
    .slice(0, 4);
  // «Thêm» chỉ chứa phần CHƯA có trên thanh tab. Trước đây nó lặp lại nguyên cây
  // Chiêu thức 3 (~49 mục) dù khu này đã có tab riêng — cuộn mãi không hết.
  const idTrenThanh = new Set(tabs.map((s) => s.id));
  const khuConLai = sections.filter((s) => !idTrenThanh.has(s.id));

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
            const noiDung = (
              <>
                <section.icon className={cn('h-[22px] w-[22px] shrink-0', dangXem && 'stroke-[2.25]')} />
                <span className="w-full truncate text-center text-[10px] font-medium leading-tight">
                  {section.shortLabel ?? section.label}
                </span>
              </>
            );
            const lop = cn(
              'flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors duration-fast',
              dangXem ? 'text-primary' : 'text-muted-foreground active:bg-muted',
            );

            // Khu không dẫn tới trang nào (VD Bắc Hưng Yên Ways) thì chạm vào là
            // bung ngay danh sách con — không đá người dùng sang một trang bất kỳ.
            if (!section.path) {
              return (
                <li key={section.id} className="min-w-0 flex-1">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={khuMo?.id === section.id}
                    onClick={() => setKhuMo(section)}
                    className={lop}
                  >
                    {noiDung}
                  </button>
                </li>
              );
            }

            return (
              <li key={section.id} className="min-w-0 flex-1">
                <NavLink
                  to={section.path}
                  end={section.end}
                  aria-current={dangXem ? 'page' : undefined}
                  className={lop}
                >
                  {noiDung}
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
                      <p className="truncate text-sm font-medium">{nhanDangNhap(user?.email)}</p>
                      {roles[0] && <p className="truncate text-xs text-muted-foreground">{roles[0]}</p>}
                    </div>
                  </div>

                  {khuConLai.length === 0 && (
                    <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">
                      Mọi khu đều đã có trên thanh dưới đáy.
                    </p>
                  )}

                  {khuConLai.map((section) => {
                    const la = leavesOf(section);
                    const khuDangXem = la.some((l) => matchesLeaf(pathname, l));
                    const tieuDe = (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                            khuDangXem ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <section.icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="truncate text-[15px] font-semibold">{section.label}</span>
                      </>
                    );
                    const lopTieuDe = cn(
                      'flex min-h-[48px] items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-fast',
                      khuDangXem ? 'bg-primary/10 text-primary' : 'text-foreground',
                    );

                    return (
                      <div key={section.id} className="mb-2">
                        {/* Khu không dẫn tới trang nào thì tiêu đề là chữ thuần —
                            các mục con đã nằm ngay bên dưới, không cần bấm đi đâu */}
                        {section.path ? (
                          <NavLink to={section.path} end={section.end} className={cn(lopTieuDe, 'active:bg-muted')}>
                            {tieuDe}
                          </NavLink>
                        ) : (
                          <div className={lopTieuDe}>{tieuDe}</div>
                        )}

                        {/* Khu nhiều tầng dựng cây thu gọn được; khu phẳng liệt kê thẳng */}
                        {coThuMuc(section) ? (
                          <div className="mt-1 rounded-2xl bg-sidebar px-2 pb-3 pt-1">
                            <NoiDungKhu section={section} onDieuHuong={() => setMoMenu(false)} anTieuDe />
                          </div>
                        ) : (
                          la.length > 1 && (
                            <ul className="ml-6 mt-0.5 space-y-0.5 border-l border-border pl-2.5">
                              {la.map((leaf) => {
                                const dangXem = matchesLeaf(pathname, leaf);
                                return (
                                  <li key={leaf.path}>
                                    <NavLink
                                      to={leaf.path}
                                      end={leaf.end}
                                      aria-current={dangXem ? 'page' : undefined}
                                      className={cn(
                                        'flex min-h-[40px] items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-fast',
                                        dangXem
                                          ? 'bg-accent font-semibold text-accent-foreground'
                                          : 'text-muted-foreground active:bg-muted',
                                      )}
                                    >
                                      <leaf.icon className="h-4 w-4 shrink-0 opacity-70" />
                                      <span className="truncate">{leaf.label}</span>
                                    </NavLink>
                                  </li>
                                );
                              })}
                            </ul>
                          )
                        )}
                      </div>
                    );
                  })}

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
                    {/* Bắc Hưng Yên VCard — danh thiếp số của chính mình, đặt cạnh hồ sơ
                        cá nhân theo chốt 02/09/2026 (tiện ích cá nhân, không phải mục menu) */}
                    {!isGuest && (
                      <button
                        type="button"
                        onClick={() => { setMoMenu(false); navigate('/vcard'); }}
                        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm active:bg-muted"
                      >
                        <IdCard className="h-[18px] w-[18px] shrink-0" />
                        Danh thiếp VCard của tôi
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

      {/* Danh sách con của khu vừa chạm — bung tại chỗ, không rời trang */}
      <Drawer open={!!khuMo} onOpenChange={(o) => !o && setKhuMo(null)}>
        <DrawerContent className="max-h-[80dvh] md:hidden">
          <DrawerTitle className="px-4 pb-1 pt-1 text-base font-semibold">
            {khuMo?.label}
          </DrawerTitle>
          {khuMo?.desc && (
            <p className="px-4 pb-2 text-sm leading-relaxed text-muted-foreground">{khuMo.desc}</p>
          )}
          <div className="overflow-y-auto overscroll-contain px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {khuMo && coThuMuc(khuMo) ? (
              /* Khu nhiều tầng (Chiêu thức 3 có tới 6 thư mục, ~49 mục): dựng cây
                 thu gọn được y như tấm «Thêm», mở sẵn thư mục chứa trang đang xem.
                 Liệt kê phẳng cả 49 mục ở đây là quá tải, không ai đọc nổi. */
              <div className="rounded-2xl bg-sidebar px-2 pb-3 pt-1">
                <NoiDungKhu section={khuMo} onDieuHuong={() => setKhuMo(null)} anTieuDe />
              </div>
            ) : (
              <ul className="space-y-0.5">
                {khuMo && leavesOf(khuMo).map((leaf) => {
                  const dangXem = matchesLeaf(pathname, leaf);
                  return (
                    <li key={leaf.path}>
                      <NavLink
                        to={leaf.path}
                        end={leaf.end}
                        onClick={() => setKhuMo(null)}
                        aria-current={dangXem ? 'page' : undefined}
                        className={cn(
                          'flex min-h-[48px] items-center gap-3 rounded-xl px-2.5 py-2 text-[15px] transition-colors duration-fast',
                          dangXem ? 'bg-accent font-semibold text-accent-foreground' : 'active:bg-muted',
                        )}
                      >
                        <span
                          aria-hidden
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
                        >
                          <leaf.icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="truncate">{leaf.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
