import React from 'react';
import {
  FDI_HUB_BAN_TIEC_VAT_DUNG,
  FDI_HUB_CHUAN_RM,
  FDI_HUB_DON_KHACH,
  FDI_HUB_NEO,
  FDI_HUB_NGHI_THUC_BAN_TIEC,
  FDI_HUB_THAM_KHACH,
  FDI_HUB_VAN_HOA_CHUNG,
  FDI_HUB_WECHAT,
} from '@/data/one/fdiHub';
import { DaiDauTab, DanhSach, GoiY, LuoiThe, Pill, The, TheBieuTuong, TieuDeMuc, TieuDePhu } from './dungChung';

/** RM Hoa ngữ & văn hóa tiếp khách: chuẩn RM, WeChat, đón khách tại Chi nhánh, đến thăm khách */
export function TabVanHoa() {
  return (
    <div className="space-y-4">
      <DaiDauTab bieuTuong="🎎" tieuDe="RM Hoa ngữ & Văn hóa tiếp khách" moTa="Hình ảnh chuẩn · công cụ số · ngoại ngữ · hiểu văn hóa · chăm sóc bằng giá trị" mau1="#8E24AA" mau2="#D81B60" />

      <The>
        <TieuDeMuc>Chuẩn hóa RM FDI Hoa ngữ</TieuDeMuc>
        <p className="mb-3 text-sm text-slate-700">
          <b>Công thức:</b> RM FDI chuyên nghiệp = Hình ảnh chuẩn + Công cụ số + Ngoại ngữ + Hiểu văn hóa + Chăm sóc bằng giá trị.
        </p>
        <LuoiThe>
          {FDI_HUB_CHUAN_RM.map((c) => (
            <TheBieuTuong key={c.ten} bieuTuong={c.bieuTuong} mau={c.mau} mauNhat={c.mauNhat} ten={c.ten}>
              {c.moTa}
            </TheBieuTuong>
          ))}
        </LuoiThe>
        <GoiY className="mt-3">⚠️ Không phụ thuộc hoàn toàn vào máy dịch — RM cần giao tiếp cơ bản bằng tiếng Trung.</GoiY>
      </The>

      <The id={FDI_HUB_NEO.vanHoaWechat} className="border-green-200 bg-gradient-to-b from-green-50 to-white">
        <TieuDeMuc mau="#2E7D32">💬 Sử dụng WeChat hiệu quả</TieuDeMuc>
        <p className="text-sm text-slate-700">
          WeChat là kênh chăm sóc chính với khách Trung Quốc — dùng đúng cách sẽ quyết định phần lớn mức độ tin tưởng của khách.
        </p>
        <TieuDePhu mau="#2E7D32">Thiết lập chuẩn</TieuDePhu>
        <DanhSach muc={FDI_HUB_WECHAT.thietLap} />
        <TieuDePhu mau="#2E7D32">Dùng trong từng giai đoạn</TieuDePhu>
        <DanhSach
          muc={FDI_HUB_WECHAT.theoGiaiDoan.map((g) => (
            <>
              <b>{g.nhan}:</b> {g.noiDung}
            </>
          ))}
        />
        <TieuDePhu mau="#2E7D32">Nguyên tắc vàng 🏆</TieuDePhu>
        <DanhSach muc={FDI_HUB_WECHAT.nguyenTacVang} />
      </The>

      <The id={FDI_HUB_NEO.vanHoaDonKhach} className="border-amber-200 bg-gradient-to-b from-amber-50 to-white">
        <TieuDeMuc mau="#9C6B00">
          🏛 Khi khách hàng đến thăm VietinBank{' '}
          <Pill className="ml-1 bg-amber-100 text-amber-800">VIP</Pill>
        </TieuDeMuc>
        <p className="text-xs text-slate-500">Trích Quy trình &amp; Nguyên tắc tiếp đón khách hàng FDI/VIP tại Chi nhánh.</p>
        {FDI_HUB_DON_KHACH.map((m) => (
          <React.Fragment key={m.tieuDe}>
            <TieuDePhu mau="#9C6B00">{m.tieuDe}</TieuDePhu>
            <DanhSach muc={m.muc} />
          </React.Fragment>
        ))}
        <TieuDePhu mau="#9C6B00">🥢 5. Sắp xếp bát, đũa, cốc</TieuDePhu>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-white">
                <th className="rounded-l-lg px-3 py-2" style={{ background: '#9C6B00' }}>Vật dụng</th>
                <th className="rounded-r-lg px-3 py-2" style={{ background: '#9C6B00' }}>Vị trí chuẩn</th>
              </tr>
            </thead>
            <tbody>
              {FDI_HUB_BAN_TIEC_VAT_DUNG.map(([vat, viTri]) => (
                <tr key={vat} className="border-b border-slate-100 even:bg-slate-50/60">
                  <td className="px-3 py-2 font-semibold text-slate-800">{vat}</td>
                  <td className="px-3 py-2 text-slate-700">{viTri}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TieuDePhu mau="#9C6B00">🎊 6. Nghi thức bàn tiệc</TieuDePhu>
        <DanhSach
          muc={FDI_HUB_NGHI_THUC_BAN_TIEC.map((n) => (
            <>
              <b>{n.nhan}:</b> {n.noiDung}
            </>
          ))}
        />
      </The>

      <The id={FDI_HUB_NEO.vanHoaThamKhach} className="border-teal-200 bg-gradient-to-b from-teal-50 to-white">
        <TieuDeMuc mau="#00897B">🚗 Khi RM đến thăm khách hàng (tại nhà máy/trụ sở KH)</TieuDeMuc>
        <p className="text-xs text-slate-500">Áp dụng cho B3 (hẹn gặp lần đầu) và các lần thăm khảo sát nhà máy, khai trương, chúc mừng...</p>
        <ol className="relative mt-4 space-y-5 border-l-[3px] border-slate-200 pl-6">
          {FDI_HUB_THAM_KHACH.map((m, i) => (
            <li key={m.tieuDe} className="relative">
              <span
                className="absolute -left-[31px] top-0 grid h-6 w-6 place-items-center rounded-full text-2xs font-black text-white ring-[3px] ring-white"
                style={{ background: m.mau }}
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="mb-1 text-sm font-extrabold" style={{ color: m.mau }}>{m.tieuDe}</div>
              <DanhSach muc={m.muc} />
            </li>
          ))}
        </ol>
      </The>

      <The>
        <TieuDePhu className="mt-0">🌏 Văn hóa chung cần lưu ý khi tiếp khách Trung Quốc</TieuDePhu>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-navy text-left text-xs text-white">
                <th className="rounded-l-lg px-3 py-2">Chủ đề</th>
                <th className="rounded-r-lg px-3 py-2">Lưu ý thực hành</th>
              </tr>
            </thead>
            <tbody>
              {FDI_HUB_VAN_HOA_CHUNG.map(([chuDe, luuY]) => (
                <tr key={chuDe} className="border-b border-slate-100 even:bg-slate-50/60">
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-800">{chuDe}</td>
                  <td className="px-3 py-2 text-slate-700">{luuY}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </The>
    </div>
  );
}
