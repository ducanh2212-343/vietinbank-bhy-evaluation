import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

/** Nút chuyển giao diện Sáng / Tối để dễ đọc. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      // aria-pressed để trình đọc màn hình biết đây là công tắc có trạng thái,
      // không phải nút hành động một chiều
      aria-pressed={isDark}
      aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors duration-fast hover:bg-muted hover:text-foreground"
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
