import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavTree } from '@/hooks/useNavTree';
import { cn } from '@/lib/utils';

/**
 * Dải định vị cho phân hệ chuyên sâu: "Khu › Thư mục › Trang".
 *
 * Chỉ hiện trong khu 'workspace' — nơi menu có tới 3 tầng và 60 mục. Ở cổng ONE
 * các trang tự có tiêu đề lớn nên thêm breadcrumb chỉ tổ nhiễu.
 *
 * Trên màn hẹp thu gọn thành một nút quay về cấp cha, thay cho 15 nút back tự
 * chế rời rạc ở các trang.
 */
export function Breadcrumbs() {
  const { location } = useNavTree();
  const navigate = useNavigate();
  const { section, folder, leaf, zone } = location;

  if (zone !== 'workspace' || !section || !leaf) return null;

  const capTren = folder?.items.find((l) => l.path !== leaf.path)?.path;

  return (
    <nav aria-label="Đường dẫn trang" className="mb-3 min-w-0">
      {/* Màn hẹp: một nút quay lui gọn */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className={cn(
          'inline-flex min-h-[36px] items-center gap-1 rounded-lg pr-2 text-sm text-muted-foreground',
          'transition-colors duration-fast hover:text-foreground sm:hidden',
        )}
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{folder?.folder ?? section.label}</span>
      </button>

      {/* Máy tính bảng trở lên: đường dẫn đầy đủ */}
      <ol className="hidden min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground sm:flex">
        <li className="min-w-0">
          <span className="truncate font-medium text-foreground/70">{section.label}</span>
        </li>
        {folder && (
          <>
            <li aria-hidden className="shrink-0">
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            </li>
            <li className="min-w-0">
              {capTren ? (
                <Link to={capTren} className="truncate transition-colors duration-fast hover:text-foreground">
                  {folder.folder}
                </Link>
              ) : (
                <span className="truncate">{folder.folder}</span>
              )}
            </li>
          </>
        )}
        <li aria-hidden className="shrink-0">
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        </li>
        <li className="min-w-0">
          <span aria-current="page" className="truncate font-semibold text-foreground">
            {leaf.label}
          </span>
        </li>
      </ol>
    </nav>
  );
}
