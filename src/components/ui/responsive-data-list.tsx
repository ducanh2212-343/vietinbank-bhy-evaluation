import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ResponsiveDataList — hiển thị bảng trên desktop, card/list trên mobile.
 *
 * Cách dùng:
 * <ResponsiveDataList
 *   data={rows}
 *   columns={[
 *     { key: "name", header: "Tên", render: (r) => r.name },
 *     { key: "role", header: "Vai trò", render: (r) => r.role },
 *   ]}
 *   keyField={(r) => r.id}
 *   renderActions={(r) => <Button>Sửa</Button>}
 * />
 *
 * - Desktop (md+): render <table>
 * - Mobile (<md): render danh sách card, mỗi card có "label: value"
 */
export type ResponsiveColumn<T> = {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  /** Ẩn cột này khỏi mobile card view */
  hideOnMobile?: boolean;
  /** Hiển thị làm tiêu đề (in đậm) trên card mobile */
  primary?: boolean;
  className?: string;
};

interface Props<T> {
  data: T[];
  columns: ResponsiveColumn<T>[];
  keyField: (row: T) => string;
  renderActions?: (row: T) => React.ReactNode;
  emptyText?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function ResponsiveDataList<T>({
  data,
  columns,
  keyField,
  renderActions,
  emptyText = "Không có dữ liệu",
  className,
  onRowClick,
}: Props<T>) {
  if (!data.length) {
    return (
      <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="relative w-full overflow-auto rounded-md border">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground"
                  >
                    {c.header}
                  </th>
                ))}
                {renderActions && <th className="h-12 px-4 text-right" />}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={keyField(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn("p-4 align-middle", c.className)}>
                      {c.render(row)}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="p-4 text-right">{renderActions(row)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {data.map((row) => (
          <div
            key={keyField(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "rounded-lg border bg-card p-4 shadow-sm",
              onRowClick && "cursor-pointer active:bg-muted/50",
            )}
          >
            <div className="space-y-2">
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((c) => (
                  <div
                    key={c.key}
                    className={cn(
                      c.primary
                        ? "text-base font-semibold text-foreground"
                        : "flex items-start justify-between gap-3 text-sm",
                    )}
                  >
                    {!c.primary && (
                      <span className="shrink-0 text-muted-foreground">{c.header}</span>
                    )}
                    <span className={cn(!c.primary && "text-right text-foreground")}>
                      {c.render(row)}
                    </span>
                  </div>
                ))}
            </div>
            {renderActions && (
              <div className="mt-3 flex justify-end gap-2 border-t pt-3">
                {renderActions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
