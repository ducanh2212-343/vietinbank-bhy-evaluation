import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Command as CommandPrimitive } from 'cmdk';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Clock, CornerDownLeft, LogOut, Moon, Search, Sun, User } from 'lucide-react';
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useNavTree } from '@/hooks/useNavTree';
import { diemKhop } from '@/lib/vietnamese';
import { cn } from '@/lib/utils';

const KHOA_GAN_DAY = 'bhy-trang-gan-day';
const SO_TRANG_GAN_DAY = 5;

function napGanDay(): string[] {
  try {
    const raw = localStorage.getItem(KHOA_GAN_DAY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* dữ liệu hỏng — bỏ qua */
  }
  return [];
}

/**
 * Ghi nhớ trang vừa xem để bảng lệnh gợi ý lần sau.
 *
 * Nhận đường dẫn của MỤC trên cây điều hướng, không phải pathname thật: xem hồ sơ
 * cán bộ ở /chi-tiet-can-bo/abc-123 phải được ghi là '/danh-gia-can-bo'. Nếu ghi
 * pathname thô, danh sách "Gần đây" sẽ toàn khoá không tra ngược được và tự rỗng dần.
 */
export function useGhiNhoTrangGanDay(duongDanMuc: string | undefined) {
  useEffect(() => {
    if (!duongDanMuc) return;
    try {
      const ds = napGanDay().filter((p) => p !== duongDanMuc);
      ds.unshift(duongDanMuc);
      localStorage.setItem(KHOA_GAN_DAY, JSON.stringify(ds.slice(0, SO_TRANG_GAN_DAY)));
    } catch {
      /* bỏ qua */
    }
  }, [duongDanMuc]);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Bảng lệnh ⌘K — lối tắt đưa cả 70 trang về "một chạm + gõ".
 *
 * Thay cho ô tìm kiếm ở bản cũ vốn không có value/onChange/onSubmit nào, tức là
 * gõ vào rồi bấm Enter thì không xảy ra gì.
 *
 * So khớp bỏ dấu hai phía: cán bộ gõ "tu danh gia" vẫn ra "Tự đánh giá" — bắt
 * buộc với nhãn tiếng Việt, vì gõ đủ dấu trong ô tìm nhanh là điều không ai làm.
 */
export function CommandPalette({ open, onOpenChange }: Props) {
  const { leaves } = useNavTree();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [ganDay, setGanDay] = useState<string[]>([]);

  // Chỉ đọc localStorage khi mở — tránh chạm đĩa ở mỗi lần dựng lại
  useEffect(() => {
    if (open) setGanDay(napGanDay());
  }, [open]);

  const theoDuongDan = useMemo(
    () => new Map(leaves.map((l) => [l.leaf.path, l])),
    [leaves],
  );

  const di = useCallback(
    (path: string) => {
      onOpenChange(false);
      navigate(path);
    },
    [navigate, onOpenChange],
  );

  // cmdk lọc bằng hàm này: điểm 0 nghĩa là ẩn mục. Ghép nhãn + khu + từ khóa để
  // gõ "hoi dong" cũng ra "Đánh giá đầu mối".
  const locBoDau = useCallback((value: string, search: string, keywords?: string[]) => {
    const vanBan = [value, ...(keywords ?? [])].join(' ');
    return diemKhop(vanBan, search);
  }, []);

  const trangGanDay = ganDay
    .map((p) => theoDuongDan.get(p))
    .filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-overlay bg-foreground/25 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />
        {/*
          Dựng trên primitive Radix thay vì bọc DialogContent của shadcn: bản bọc
          luôn chèn một nút đóng ở góc phải-trên, đúng chỗ ô tìm kiếm, và ép sẵn
          padding + nền kính không hợp với bảng lệnh.
          Neo lệch lên trên (top-[12vh]) theo lối bảng lệnh quen thuộc — mắt và
          con trỏ đều đã ở nửa trên màn hình.
        */}
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-[12vh] z-overlay w-[calc(100%-1.5rem)] max-w-[36rem] -translate-x-1/2',
            'overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-menu',
            'data-[state=open]:animate-menu-in data-[state=closed]:animate-menu-out',
          )}
        >
          {/* Radix yêu cầu Title + Description để hộp thoại có tên và mô tả cho
              trình đọc màn hình. Dùng .sr-only của Tailwind thay vì gói
              @radix-ui/react-visually-hidden — gói đó chỉ là phụ thuộc gián tiếp,
              khai báo thẳng sẽ khiến `npm ci` trên bản checkout sạch bị gãy. */}
          <DialogPrimitive.Title className="sr-only">Tìm kiếm và đi nhanh tới trang</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Gõ tên trang để đi tới. Dùng phím mũi tên để chọn, Enter để mở, Esc để đóng.
          </DialogPrimitive.Description>
        <CommandPrimitive
          filter={locBoDau}
          loop
          className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground"
        >
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
            <CommandPrimitive.Input
              autoFocus
              placeholder="Tìm trang, chức năng… (gõ không dấu cũng được)"
              className={cn(
                'flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none',
                'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
              )}
            />
          </div>

          <CommandList className="max-h-[min(60vh,24rem)]">
            <CommandEmpty>
              <span className="text-sm text-muted-foreground">Không tìm thấy trang nào phù hợp.</span>
            </CommandEmpty>

            {trangGanDay.length > 0 && (
              <>
                <CommandGroup heading="Gần đây">
                  {trangGanDay.map(({ leaf, section }) => (
                    <CommandItem
                      key={`gan-day-${leaf.path}`}
                      value={`gan-day ${leaf.label} ${section.label}`}
                      keywords={[leaf.label, section.label, ...(leaf.keywords ?? [])]}
                      onSelect={() => di(leaf.path)}
                    >
                      <Clock className="mr-2 h-4 w-4 shrink-0 opacity-60" aria-hidden />
                      <span className="truncate">{leaf.label}</span>
                      <span className="ml-auto shrink-0 pl-3 text-xs text-muted-foreground">
                        {section.shortLabel ?? section.label}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            <CommandGroup heading="Đi tới trang">
              {leaves.map(({ leaf, section, folder }) => (
                <CommandItem
                  key={leaf.path}
                  value={`${leaf.label} ${section.label} ${folder?.folder ?? ''}`}
                  keywords={[leaf.label, section.label, folder?.folder ?? '', ...(leaf.keywords ?? [])]}
                  onSelect={() => di(leaf.path)}
                >
                  <leaf.icon className="mr-2 h-4 w-4 shrink-0 opacity-60" aria-hidden />
                  <span className="truncate">{leaf.label}</span>
                  <span className="ml-auto shrink-0 pl-3 text-xs text-muted-foreground">
                    {folder ? `${section.shortLabel ?? section.label} › ${folder.folder}` : (section.shortLabel ?? section.label)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Thao tác">
              <CommandItem
                value="ho so ca nhan tai khoan profile"
                keywords={['hồ sơ cá nhân', 'tài khoản']}
                onSelect={() => di('/ho-so-ca-nhan')}
              >
                <User className="mr-2 h-4 w-4 shrink-0 opacity-60" aria-hidden />
                Hồ sơ cá nhân
              </CommandItem>
              <CommandItem
                value="doi giao dien sang toi dark mode"
                keywords={['giao diện tối', 'giao diện sáng', 'dark mode']}
                onSelect={() => {
                  toggleTheme();
                  onOpenChange(false);
                }}
              >
                {theme === 'dark' ? (
                  <Sun className="mr-2 h-4 w-4 shrink-0 opacity-60" aria-hidden />
                ) : (
                  <Moon className="mr-2 h-4 w-4 shrink-0 opacity-60" aria-hidden />
                )}
                {theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              </CommandItem>
              <CommandItem
                value="dang xuat thoat logout"
                keywords={['đăng xuất', 'thoát']}
                onSelect={() => {
                  onOpenChange(false);
                  signOut();
                }}
                className="text-destructive data-[selected=true]:bg-destructive/10 data-[selected=true]:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                Đăng xuất
              </CommandItem>
            </CommandGroup>
          </CommandList>

          <div className="hidden items-center gap-3 border-t px-3 py-2 text-2xs text-muted-foreground sm:flex">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-sans">↑</kbd>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-sans">↓</kbd>
              di chuyển
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-sans">
                <CornerDownLeft className="h-3 w-3" aria-hidden />
              </kbd>
              mở
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-sans">Esc</kbd>
              đóng
            </span>
          </div>
        </CommandPrimitive>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Bắt phím tắt mở bảng lệnh: Ctrl/⌘ + K. */
export function usePhimTatBangLenh(setOpen: (fn: (v: boolean) => boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);
}
