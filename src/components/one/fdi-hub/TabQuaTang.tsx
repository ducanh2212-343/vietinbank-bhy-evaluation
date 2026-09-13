import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FDI_HUB_CATALOGUE_QUA,
  FDI_HUB_DIEM_CHAM,
  FDI_HUB_NEO,
  FDI_HUB_NGUYEN_TAC_5D,
  FDI_HUB_NGU_HANH,
  FDI_HUB_NHA_CUNG_CAP,
  FDI_HUB_PHAN_TANG_QUA,
  FDI_HUB_QUA_NEN_KHONG_NEN,
  FDI_HUB_SLIDE_QUA_TANG,
} from '@/data/one/fdiHub';
import { DaiDauTab, DayChip, GoiY, LuoiThe, ReNhanh, The, TheBieuTuong, TieuDeMuc, TieuDePhu } from './dungChung';

/** Chiến lược quà tặng: 5 infographic, 11 điểm chạm, catalogue 4 nhóm, ngũ hành, phân tầng, nhà cung cấp */
export function TabQuaTang() {
  const [slideMo, datSlideMo] = useState<number | null>(null);
  const [diemChamMo, datDiemChamMo] = useState<number | null>(null);
  const dc = diemChamMo === null ? null : FDI_HUB_DIEM_CHAM[diemChamMo];

  return (
    <div className="space-y-4">
      <DaiDauTab bieuTuong="🎁" tieuDe="Chiến lược quà tặng FDI" moTa="11 điểm chạm trong năm — mỗi món quà là một lời chúc, mỗi điểm chạm là một bước tiến gắn kết" mau1="#C8102E" mau2="#FF6D00" />

      <The className="py-4">
        <DayChip
          lienKet={[
            { loai: 'noi-bo', nhan: '🤖 Gợi ý quà cá nhân hóa bằng AI (năm sinh, phong thủy, ảnh WeChat)', tab: 'tro-ly-ai', neo: FDI_HUB_NEO.aiTroLyQuaTang },
            { loai: 'noi-bo', nhan: '🧭 Gợi ý theo phong thủy', tab: 'qua-tang', neo: FDI_HUB_NEO.quaTangPhongThuy },
            { loai: 'noi-bo', nhan: '📖 Catalogue 4 nhóm quà', tab: 'qua-tang', neo: FDI_HUB_NEO.quaTangCatalogue },
          ]}
        />
      </The>

      <The>
        <TieuDeMuc>🖼️ Bộ infographic chiến lược quà tặng FDI (in/gửi trực tiếp)</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">5 slide chuẩn VietinBank Bắc Hưng Yên — bấm vào ảnh để phóng to. Có thể chụp/gửi khách hoặc in làm cẩm nang để bàn.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FDI_HUB_SLIDE_QUA_TANG.map((s, i) => (
            <figure key={s.src} className="m-0">
              <button type="button" onClick={() => datSlideMo(i)} className="block w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm transition hover:scale-[1.02]">
                <img src={s.src} alt={s.chuThich} loading="lazy" className="block w-full" />
              </button>
              <figcaption className="mt-1 text-center text-2xs text-slate-500">{s.chuThich}</figcaption>
            </figure>
          ))}
        </div>
      </The>

      <The id={FDI_HUB_NEO.quaTangDiemCham}>
        <TieuDeMuc>① 11 điểm chạm khách hàng trong năm</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">Mỗi điểm chạm là một cơ hội tặng quà đúng lúc. Bấm vào thẻ để xem quà ưu tiên, lựa chọn thay thế và ngân sách gợi ý.</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {FDI_HUB_DIEM_CHAM.map((t, i) => (
            <button
              key={t.so}
              type="button"
              onClick={() => datDiemChamMo(diemChamMo === i ? null : i)}
              aria-expanded={diemChamMo === i}
              className={cn('relative overflow-hidden rounded-xl px-3 py-3 text-left text-white shadow transition hover:-translate-y-0.5 hover:shadow-md', diemChamMo === i && 'ring-4 ring-white ring-offset-2')}
              style={{ background: t.mau, ...(diemChamMo === i ? { ['--tw-ring-offset-color' as string]: t.mau } : {}) }}
            >
              <span className="absolute right-2 top-1 text-2xl font-black opacity-25" aria-hidden>{t.so}</span>
              <span className="block text-xl" aria-hidden>{t.bieuTuong}</span>
              <span className="mt-1 block text-xs font-extrabold leading-snug">{t.ten}</span>
              <span className="mt-1 inline-block rounded-md bg-white/20 px-1.5 py-0.5 text-2xs">{t.nganSach}</span>
            </button>
          ))}
        </div>
        {dc && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" style={{ borderLeft: `5px solid ${dc.mau}` }}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl text-xl text-white" style={{ background: dc.mau }} aria-hidden>{dc.bieuTuong}</span>
              <div>
                <div className="text-sm font-extrabold text-brand-navy">Điểm chạm {dc.so} — {dc.ten}</div>
                <div className="text-xs text-slate-500">{dc.mucDich}</div>
              </div>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-start gap-2"><dt className="shrink-0 rounded-md px-2 py-0.5 text-2xs font-bold text-white" style={{ background: dc.mau }}>Quà ưu tiên</dt><dd className="font-bold text-slate-800">{dc.quaUuTien}</dd></div>
              <div className="flex items-start gap-2"><dt className="shrink-0 rounded-md bg-slate-500 px-2 py-0.5 text-2xs font-bold text-white">Lựa chọn khác</dt><dd className="text-slate-700">{dc.luaChonKhac.join(' · ')}</dd></div>
              <div className="flex items-start gap-2"><dt className="shrink-0 rounded-md bg-green-700 px-2 py-0.5 text-2xs font-bold text-white">Ngân sách</dt><dd className="text-slate-700">{dc.nganSach}</dd></div>
            </dl>
            <DayChip className="mt-3" lienKet={[{ loai: 'noi-bo', nhan: 'Xem chi tiết trong Catalogue', tab: 'qua-tang', neo: FDI_HUB_NEO.quaTangCatalogue }]} />
          </div>
        )}
      </The>

      <The id={FDI_HUB_NEO.quaTangCatalogue}>
        <TieuDeMuc>② Catalogue quà tặng theo 4 nhóm</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">Từng loại quà cụ thể kèm ý nghĩa, khoảng giá và nhà cung cấp — chọn theo điểm chạm &amp; ngân sách.</p>
        <div className="space-y-3">
          {FDI_HUB_CATALOGUE_QUA.map((nhom) => (
            <div key={nhom.ten} className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-extrabold text-white" style={{ background: nhom.mau }}>
                <span aria-hidden>{nhom.bieuTuong}</span> {nhom.ten}
              </div>
              <div className="grid sm:grid-cols-2">
                {nhom.mon.map((m) => (
                  <div key={m.ten} className="border-b border-slate-100 px-4 py-2.5 sm:odd:border-r">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <b className="text-slate-800">{m.ten}</b>
                      <span className="whitespace-nowrap text-xs font-bold text-red-700">{m.gia}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">💡 {m.yNghia}</div>
                    <div className="text-2xs text-slate-500">🏬 {m.nhaCungCap}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </The>

      <The id={FDI_HUB_NEO.quaTangPhongThuy}>
        <TieuDeMuc>③ Gợi ý quà theo phong thủy – ngũ hành</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">
          Tra nhanh theo mệnh (ngũ hành) của khách để chọn màu sắc &amp; chất liệu quà hợp phong thủy. Muốn gợi ý cá nhân hóa chi tiết theo năm sinh, giới tính, ảnh moment WeChat/Zalo — dùng Trợ lý quà tặng AI ở tab Trợ lý AI.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FDI_HUB_NGU_HANH.map((m) => (
            <div key={m.ten} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm" style={{ borderTop: `4px solid ${m.mau}` }}>
              <div className="mb-2 flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg text-xl font-black" style={{ color: m.mau, background: m.mauNhat }} aria-hidden>{m.han}</span>
                <b className="text-sm text-slate-800">Mệnh {m.ten}</b>
              </div>
              <dl className="space-y-1 text-xs text-slate-700">
                <div><dt className="inline font-bold text-brand-navy">Màu hợp: </dt><dd className="inline">{m.mauHop}</dd></div>
                <div><dt className="inline font-bold text-brand-navy">Quà gợi ý: </dt><dd className="inline">{m.quaGoiY}</dd></div>
                <div><dt className="inline font-bold text-red-700">Nên tránh: </dt><dd className="inline">{m.nenTranh}</dd></div>
              </dl>
            </div>
          ))}
        </div>
        <GoiY kieu="xanh" className="mt-3">
          🀄 <b>Lưu ý chung:</b> người Trung Quốc/Đài/Hàn nói chung ưa <b>đỏ &amp; vàng</b> (may mắn, phú quý), thích <b>số chẵn (2, 6, 8)</b>, kiêng <b>số 4</b>. Phong thủy theo mệnh là lớp tinh chỉnh thêm — khi chưa rõ mệnh, chọn tông đỏ/vàng là an toàn nhất.
        </GoiY>
      </The>

      <The>
        <TieuDeMuc>④ Phân tầng quà theo mức độ quan hệ</TieuDeMuc>
        <LuoiThe>
          {FDI_HUB_PHAN_TANG_QUA.map((t) => (
            <div key={t.hang} className="rounded-2xl border-2 bg-white p-4 shadow-sm" style={{ borderColor: t.vien }}>
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black" style={{ background: t.nen, color: t.chu }}>
                {t.bieuTuong} {t.hang} · {t.khoang}
              </span>
              <div className="mt-2 text-sm font-bold text-slate-800">{t.doiTuong}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-600">{t.moTa}</div>
            </div>
          ))}
        </LuoiThe>
        <TieuDePhu>✨ Nguyên tắc 5Đ khi chọn quà FDI</TieuDePhu>
        <LuoiThe className="lg:grid-cols-5">
          {FDI_HUB_NGUYEN_TAC_5D.map((n) => (
            <TheBieuTuong key={n.ten} bieuTuong={n.bieuTuong} mau={n.mau} mauNhat={n.mauNhat} ten={n.ten}>
              {n.moTa}
            </TheBieuTuong>
          ))}
        </LuoiThe>
        <ReNhanh className="mt-4" nhanCo="✓ NÊN" nhanKhong="✗ KHÔNG NÊN" co={FDI_HUB_QUA_NEN_KHONG_NEN.nen} khong={FDI_HUB_QUA_NEN_KHONG_NEN.khongNen} />
      </The>

      <The>
        <TieuDeMuc>📇 Thông tin nhà cung cấp chính</TieuDeMuc>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {FDI_HUB_NHA_CUNG_CAP.map((n) => (
            <div key={n.ten} className="rounded-xl bg-sky-50 px-3 py-2.5 text-xs">
              <b className="block text-brand-navy">{n.ten}</b>
              <span className="text-slate-600">{n.lienHe}</span>
            </div>
          ))}
        </div>
      </The>

      {slideMo !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={FDI_HUB_SLIDE_QUA_TANG[slideMo].chuThich}
          className="fixed inset-0 z-[200] flex cursor-zoom-out items-center justify-center bg-slate-950/90 p-4"
          onClick={() => datSlideMo(null)}
        >
          <button type="button" aria-label="Đóng" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => datSlideMo(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={FDI_HUB_SLIDE_QUA_TANG[slideMo].src} alt={FDI_HUB_SLIDE_QUA_TANG[slideMo].chuThich} className="max-h-[92vh] max-w-[96vw] rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}
