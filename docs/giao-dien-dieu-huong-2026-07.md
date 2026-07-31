# Giao diện & điều hướng cổng BHY ONE — bản dựng lại 07/2026

**Phạm vi:** hệ điều hướng toàn cổng, hệ thống thiết kế nền, và tốc độ tải trang.
Tài liệu cấu trúc site (cái gì nằm ở đâu) vẫn là `docs/so-do-site-bhy-one.md`;
tài liệu này nói *code hiện thực nó ra sao*.

---

## 1. Vì sao phải dựng lại

Rà soát phát hiện cổng đang chạy **hai hệ menu song song**:

| | Bản cũ | Hệ quả |
|---|---|---|
| Menu dọc `AppSidebar` | Hiện ở **mọi** trang, 3 tầng, ~60 mục | Tại `/one` nó lặp lại đúng 5 khu mà thanh ngang đã liệt kê |
| Thanh ngang `OneSectionNav` | Chỉ hiện trong `/one/*` — 7 trên 70 trang | Chính mục "Nhân sự 343" của nó dẫn tới trang **không có** thanh ngang |

Trái nguyên tắc #3 đã duyệt: *"Ở đâu cũng thấy thanh ONE — một cổng, không phải
hai website."* Kèm theo: ô tìm kiếm ở đầu trang không có `value`/`onChange`/
`onSubmit` nào (gõ rồi Enter không xảy ra gì), dải 768–1023px mất hẳn menu,
điện thoại chỉ có một nút hamburger ở góc xa ngón cái nhất.

## 2. Kiến trúc mới — một nguồn dữ liệu, bốn bề mặt

```
src/lib/navigation.ts          ← NGUỒN DUY NHẤT: cây khu → thư mục → mục lá
        │                        + hàm thuần: canSeeLeaf / filterSections /
        │                          resolveLocation / flattenLeaves
        ▼
src/hooks/useNavTree.tsx       ← gọi 3 hook phân quyền ĐÚNG MỘT LẦN, phát Context
        │
        ├── TopNav.tsx            thanh ngang toàn cục (mọi trang) + mega-menu
        ├── WorkspaceSidebar.tsx  menu dọc (CHỈ trong phân hệ) + thanh biểu tượng
        ├── MobileNav.tsx         thanh tab đáy + tấm menu toàn màn hình
        └── CommandPalette.tsx    bảng lệnh ⌘K
```

**Khái niệm "khu" (`zone`)** quyết định bố cục, không phải đường dẫn:

- `portal` — 5 khu cổng ONE: chỉ thanh ngang, nội dung tràn hết bề ngang.
- `workspace` — phân hệ 343 + Quản trị người dùng: thanh ngang **+** menu dọc.

Nhờ vậy menu dọc biến mất khỏi cổng ONE, hết cảnh hai hệ menu chồng nhau.

### Bố cục theo khổ màn hình

| Khổ | Thanh ngang | Tầng 2 | Ghi chú |
|---|---|---|---|
| ≥1024px | Nhãn đầy đủ + mega-menu | Menu dọc 240px | |
| 768–1023px | Nhãn ngắn (`shortLabel`) | Thanh biểu tượng 68px, chạm mở cột nổi | Dải này gồm toàn bộ iPad cầm dọc — bản cũ mất hẳn menu |
| <768px | Logo + ⌘K + tài khoản | Thanh tab đáy 5 mục + tấm menu vaul | |

Nhãn ngắn ở dải máy tính bảng vì 7 nhãn đầy đủ không vừa bề ngang 768px. Tên đầy
đủ đặt ở `aria-label` nên trình đọc màn hình luôn nghe đúng tên khu.

## 3. Các trường của mục lá (`NavLeaf`)

| Trường | Dùng để làm gì |
|---|---|
| `minRole` / `special` / `guestVisible` | Phân quyền — **giữ nguyên văn** thứ tự xét của bản cũ: khách fail-closed → `special` → `minRole`. Đổi thứ tự là đổi quyền. |
| `extraPaths` | Route con không có mục menu riêng (`/chi-tiet-can-bo/:id`, `/quizzi/*`, `/bieu-mau-0x`) được nhận về đúng mục cha để tô sáng + dựng breadcrumb. |
| `bleed` | Trang tự dựng bố cục tràn viền (bọc trong `OnePageShell`) — khung không thêm khoảng đệm. **Mặc định false**, nên trang mới quên khai vẫn có khoảng đệm chuẩn thay vì dính mép. |
| `keywords` | Từ khóa phụ cho ⌘K, viết KHÔNG dấu. |
| `end` | Chỉ khớp chính xác (dùng cho `/one`, tránh nó giành mất `/one/nguon-coi`). |

## 4. Bảng lệnh ⌘K

Thay ô tìm kiếm trang trí. So khớp **bỏ dấu hai phía** (`src/lib/vietnamese.ts`):
gõ `tu danh gia` ra `Tự đánh giá`, `hoi dong` ra `Đánh giá đầu mối`. Bắt buộc với
nhãn tiếng Việt — không ai gõ đủ dấu trong ô tìm nhanh.

Danh sách "Gần đây" lưu **đường dẫn của mục**, không phải `pathname` thật: xem hồ
sơ ở `/chi-tiet-can-bo/abc-123` được ghi thành `/danh-gia-can-bo`.

## 5. Hiệu năng — đo được, không phải ước lượng

Mục tiêu: ~150 cán bộ dùng hằng ngày.

**Số chunk phải tải thêm cho một lượt vào trang**

| Trang | Trước | Sau |
|---|---|---|
| `/tu-danh-gia` | 72 chunk | 38 |
| `/tong-quan` | 62 chunk | 38 |
| `/one/ghi-nhan` | 34 chunk, 547 kB thô | **5 chunk, 87 kB thô** |

**Đường tải chính:** 188 kB gzip (2 tệp) → 200 kB gzip (7 tệp). Phần tăng là gói
biểu tượng dùng chung, đổi lại bỏ được **135 chunk nhỏ dưới 2 kB** và gói đó
cache vĩnh viễn.

**Việc đã làm**

- `manualChunks` tách nhà cung cấp theo *nhịp thay đổi* (React / router / dữ liệu
  / tiện ích / biểu tượng). Sau mỗi lần phát hành, cán bộ chỉ tải lại phần mã ứng
  dụng (~40 kB gzip) thay vì trọn gói 168 kB.
  **Cố ý KHÔNG gom `@radix-ui`** — đo được là gộp lại kéo thêm 74 kB gzip vào lần
  tải đầu vì mỗi trang chỉ dùng vài nguyên thủy.
- `Cache-Control: immutable` cho `/assets/*` (`vercel.json` + `public/_headers`
  cho Cloudflare Worker). Trước đây **không có header cache nào**, nên mọi tài sản
  đều phải hỏi lại máy chủ ở từng lượt vào.
- `xlsx` (157 kB gzip), `jspdf` (124), `html2canvas` (48), `docx`+`file-saver`
  (102) chuyển sang nạp động — chỉ tải khi người dùng bấm nhập/xuất.
- Font Inter nạp trục `300..900` và không chặn hiển thị. Trước chỉ nạp 400–700
  trong khi giao diện dùng `font-black`/`font-extrabold` **286 chỗ** → trình duyệt
  bôi đậm giả, nét chữ nhòe.
- Kịch bản nội tuyến đặt chế độ sáng/tối **trước** khung hình đầu — hết chớp trắng.
- Quầng sáng nền chuyển sang lớp giả cố định, bỏ `background-attachment: fixed`
  (nguyên nhân giật khi cuộn trên điện thoại tầm trung).

## 6. Hệ thống thiết kế

- **Thang chữ**: cỡ giữ nguyên để không xô lệch 70 trang; phần sửa là chiều cao
  dòng và khoảng cách chữ. Tiếng Việt xếp hai tầng dấu (Ế, Ữ, Ộ) nên mặc định
  `text-xs = 12/16` của Tailwind làm dấu mũ chạm chân chữ dòng trên — mọi bậc thân
  bài nay tối thiểu 1.5. Thêm bậc `2xs` (11px) thay cho hàng trăm chỗ viết tay.
- **Chuyển động**: token `ease-smooth` / `ease-exit`, keyframe `menu-in` /
  `menu-out` (ra nhanh hơn vào ~65% để thao tác thấy dứt khoát).
- **Lớp chồng**: thang `z-index` đặt tên (`sticky` < `sidebar` < `header` <
  `drawer` < `overlay`) thay cho số rải rác.
- **Tương phản**: 3 trong 4 màu huy hiệu Sao trượt WCAG AA ở chế độ sáng
  (Sao Mai chỉ 1,67:1) — đã hạ độ sáng, giữ nguyên hue/saturation.
- Dọn ~77 dòng CSS menu cũ đã chết; bổ sung `.scrollbar-none` vốn được dùng mà
  chưa từng khai báo.

## 7. Kiểm thử

`src/lib/__tests__/navigation.test.ts` (109 test) khóa những thứ dễ vỡ nhất:

- **Quét thẳng bảng định tuyến trong `src/App.tsx`**: mọi `<Route path>` phải tra
  được về một mục trên cây. Thêm route mà quên khai vào `navigation.ts` là đỏ test.
- Phân quyền cho 4 nhóm vai trò, gồm test khẳng định `special` được xét **trước**
  `minRole` (đúng như bản cũ) và khách đối tác fail-closed kể cả khi mang quyền khác.
- Không mục nào bị mục khác giành mất do trùng tiền tố (`/bao-cao` vs
  `/bao-cao-dau-moi`).

`src/components/layout/__tests__/appLayout.test.tsx` (12 test) dựng thật cả khung:
menu dọc **không** xuất hiện ở cổng ONE, mega-menu **không** nằm sẵn trong DOM khi
chưa mở, thanh tab đáy ≤5 mục, trạng thái mở thư mục không ghi đè lẫn nhau.

## 8. Còn lại cho đợt sau

- **Chế độ tối cho cổng ONE.** 35 file dưới `src/components/one` + `src/pages/one`
  dùng bảng màu slate/blue của Tailwind (400 lần `text-slate-*`, 144 lần
  `bg-white`) thay vì token. Lớp `.one-light` đang giữ cổng ở hệ màu sáng — đây là
  chủ ý thiết kế gốc ("đảo sáng") và **không phải hồi quy**, nhưng muốn cổng theo
  được chế độ tối thì phải chuyển 35 file đó sang token, kèm xử lý các gradient
  trang trí (`from-blue-50 via-white`) vốn chỉ đúng trên nền sáng.
- **670 chỗ cỡ chữ viết tay** `text-[10px]`/`text-[11px]` nên quy về bậc `2xs`.
- **Emoji dùng làm biểu tượng** trong `Hero.tsx` (📚 🎯 💡 ⚖️ 🏛️) nên thay bằng
  biểu tượng vector cho đồng bộ.
- 7 lỗi TypeScript **có sẵn từ trước** (`KanbanAdminPage`, 3 trang Quizzi) chưa
  đụng tới trong đợt này.
