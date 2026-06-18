import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Hiển thị skill kèm mã định danh để tránh nhầm lẫn giữa các skill
 * có tên gần giống nhau. Ví dụ: "SK01 · Lập kế hoạch bán hàng".
 */
export function formatSkillLabel(
  code?: string | null,
  name?: string | null,
  sep: string = ' · ',
): string {
  const c = (code || '').trim();
  const n = (name || '').trim();
  if (c && n) return `${c}${sep}${n}`;
  return c || n || '';
}
