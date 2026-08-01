import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Eye, EyeOff, Newspaper, Pencil, Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadModal } from '@/components/one/UploadModal';
import { useOneUploads } from '@/components/one/useOneUploads';
import { useAuth } from '@/hooks/useAuth';
import { boDau } from '@/lib/vietnamese';
import { locTinTuc, sapXepTinTuc, SO_TIN_TRANG_CHU } from '@/lib/tinTuc';
import { CATEGORY_NAMES, type ProgramCategory, type UploadedItem } from '@/data/one/types';

/**
 * QUẢN TRỊ TIN TỨC NỘI BỘ — dành cho System Admin và Admin TCTH.
 *
 * Tin nội bộ dùng chung kho `portal_uploads` với Kho tri thức, nên màn hình này
 * KHÔNG phải nơi duy nhất tạo nội dung: cán bộ vẫn tự đăng bài chia sẻ ở
 * /one/tin-tuc. Việc của TCTH ở đây là biên tập: ghim tin lên đầu Trang chủ, sửa
 * câu chữ, mở/đóng cho khách đối tác và gỡ tin không phù hợp.
 *
 * Menu dùng mốc `minRole: 'admin'` — mốc này gồm cả Ban Giám đốc, trong khi RLS
 * chỉ cho system_admin và tcth_admin ghi. Vì vậy trang tự nhận biết và chuyển
 * sang chế độ CHỈ XEM thay vì để người dùng bấm rồi nhận lỗi máy chủ khó hiểu.
 */

const CATEGORIES = Object.keys(CATEGORY_NAMES) as ProgramCategory[];

export default function NewsAdminPage() {
  const { roles } = useAuth();
  const { items, addItem, deleteItem, toggleShare, toggleFeatured, updateItem } = useOneUploads();
  const [tuKhoa, setTuKhoa] = useState('');
  const [dangSua, setDangSua] = useState<UploadedItem | null>(null);
  const [dangXoa, setDangXoa] = useState<UploadedItem | null>(null);
  const [dangDang, setDangDang] = useState(false);
  const [luuDang, setLuuDang] = useState(false);

  const bienTapDuoc = roles.some((r) => r === 'system_admin' || r === 'tcth_admin');

  const danhSach = useMemo(
    () => locTinTuc(sapXepTinTuc(items), tuKhoa, boDau),
    [items, tuKhoa],
  );
  const soGhim = items.filter((i) => i.isFeatured).length;

  const luuSua = async (form: { title: string; summary: string; content: string; category: string }) => {
    if (!dangSua) return;
    setLuuDang(true);
    const ok = await updateItem(dangSua.id, {
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      content: form.content.trim() || null,
      category: form.category,
    });
    setLuuDang(false);
    if (ok) setDangSua(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Newspaper className="h-5 w-5 text-primary" />
            Quản trị tin tức nội bộ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trang chủ hiển thị {SO_TIN_TRANG_CHU} tin mới nhất trên dải trượt ngang, tin ghim luôn
            đứng đầu. Hiện có <strong>{items.length}</strong> tin, trong đó <strong>{soGhim}</strong> tin đang ghim.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" asChild>
            <Link to="/one/tin-tuc" target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Xem trang tin
            </Link>
          </Button>
          {bienTapDuoc && (
            <Button onClick={() => setDangDang(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Đăng tin mới
            </Button>
          )}
        </div>
      </div>

      {!bienTapDuoc && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardContent className="py-4 text-sm text-amber-900">
            Bạn đang ở chế độ <strong>chỉ xem</strong>. Quyền biên tập tin nội bộ thuộc về
            System Admin và Admin TCTH — đây là ràng buộc ở tầng cơ sở dữ liệu, không phải chỉ
            ẩn nút trên giao diện.
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
          placeholder="Tìm theo tiêu đề, tác giả, phòng… (gõ không dấu cũng được)"
          className="pl-9"
          aria-label="Tìm tin nội bộ"
        />
      </div>

      {danhSach.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {items.length === 0 ? 'Chưa có tin nào trong kho.' : 'Không có tin nào khớp từ khóa.'}
        </p>
      ) : (
        <div className="space-y-2.5">
          {danhSach.map((item) => (
            <Card key={item.id} className={item.isFeatured ? 'border-amber-300' : undefined}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-20 w-full shrink-0 rounded-lg object-cover sm:w-28"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{CATEGORY_NAMES[item.category] || item.category}</Badge>
                    {item.isFeatured && <Badge className="bg-amber-500 hover:bg-amber-500">Ghim Trang chủ</Badge>}
                    {item.isShared && <Badge variant="outline" className="text-emerald-700">Mở cho khách</Badge>}
                  </div>
                  <p className="truncate font-semibold">{item.title}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.author} · {item.department} · {item.date} · {item.likes} lượt thích
                  </p>
                </div>

                {bienTapDuoc && (
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFeatured(item.id, !item.isFeatured)}
                      title={item.isFeatured ? 'Bỏ ghim khỏi Trang chủ' : 'Ghim lên đầu Trang chủ'}
                    >
                      {item.isFeatured ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      <span className="ml-1.5 hidden sm:inline">{item.isFeatured ? 'Bỏ ghim' : 'Ghim'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleShare(item.id, !item.isShared)}
                      title={item.isShared ? 'Ngừng chia sẻ cho khách đối tác' : 'Chia sẻ cho khách đối tác'}
                    >
                      {item.isShared ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDangSua(item)} title="Sửa tin">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDangXoa(item)}
                      title="Xóa tin"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dangSua && (
        <HopSuaTin
          item={dangSua}
          dangLuu={luuDang}
          onDong={() => setDangSua(null)}
          onLuu={luuSua}
        />
      )}

      <AlertDialog open={!!dangXoa} onOpenChange={(o) => !o && setDangXoa(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tin này?</AlertDialogTitle>
            <AlertDialogDescription>
              «{dangXoa?.title}» sẽ biến mất khỏi Trang chủ, trang tin và cả Kho tri thức. Lượt
              thích của tin cũng mất theo và không khôi phục được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (dangXoa) deleteItem(dangXoa.id);
                setDangXoa(null);
              }}
            >
              Xóa tin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UploadModal
        isOpen={dangDang}
        onClose={() => setDangDang(false)}
        onSubmitNewItem={addItem}
        defaultCategory="sharing"
      />
    </div>
  );
}

/** Hộp sửa phần chữ của một tin. Ảnh sửa ở màn đăng bài, không nhân đôi ở đây. */
function HopSuaTin({
  item,
  dangLuu,
  onDong,
  onLuu,
}: {
  item: UploadedItem;
  dangLuu: boolean;
  onDong: () => void;
  onLuu: (form: { title: string; summary: string; content: string; category: string }) => void;
}) {
  const [form, setForm] = useState({
    title: item.title,
    summary: item.summary ?? '',
    content: item.content ?? '',
    category: item.category as string,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onDong()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa tin nội bộ</DialogTitle>
          <DialogDescription>
            Nội dung sửa áp dụng ngay cho dải tin Trang chủ, trang tin và Kho tri thức.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tin-tieu-de">Tiêu đề</Label>
            <Input
              id="tin-tieu-de"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tin-chuyen-muc">Chuyên mục</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger id="tin-chuyen-muc"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_NAMES[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tin-tom-tat">Tóm tắt — hiện trên thẻ ở Trang chủ</Label>
            <Textarea
              id="tin-tom-tat"
              rows={3}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tin-noi-dung">Nội dung chi tiết</Label>
            <Textarea
              id="tin-noi-dung"
              rows={7}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDong}>Hủy</Button>
          <Button disabled={dangLuu || !form.title.trim()} onClick={() => onLuu(form)}>
            {dangLuu ? 'Đang lưu…' : 'Lưu tin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
