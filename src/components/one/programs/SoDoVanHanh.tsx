import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, Clock, Download, FileText, Info, ShieldAlert, Users,
} from 'lucide-react';
import { timVaiTro, type TepTaiVe, type MoHinhVanHanh } from '@/data/one/vanHanhChuongTrinh';
import { SoDoLuongViec } from './SoDoLuongViec';
import { SoDoPhatBieu } from './SoDoPhatBieu';

/**
 * SƠ ĐỒ VẬN HÀNH của một chương trình Bắc Hưng Yên Ways.
 *
 * Vì sao dựng riêng khối này: trang thương hiệu trước đây kể chuyện bằng đoạn
 * văn — người mới đọc xong vẫn không trả lời được ba câu «hồ sơ nào phải vào?»,
 * «tôi làm gì, đến lượt ai?», «xong nộp giấy gì?». Ba câu đó thành ba khối có
 * hình: điều kiện vào, sơ đồ bước, sơ đồ phát biểu — rồi mới tới biểu mẫu.
 *
 * Hai sơ đồ (làn bơi ở SoDoLuongViec, bàn tròn ở SoDoPhatBieu) đều là SVG dựng
 * từ dữ liệu chứ không phải ảnh: quy chế đổi thì sơ đồ đổi theo, chữ là chữ thật
 * nên trình đọc màn hình đọc được. Danh sách thẻ «chi tiết từng bước» giữ lại
 * dưới sơ đồ vì điện thoại co sơ đồ nhỏ, cần một bản đọc được bằng chữ.
 *
 * Toàn bộ nội dung đọc từ `src/data/one/vanHanhChuongTrinh.ts` nên thêm chương
 * trình thứ hai (Ideas, Quizzi…) chỉ là thêm dữ liệu, không sửa file này.
 */

/** Nhãn tròn nhỏ ghi tên vai trò — dùng ở cả sơ đồ bước lẫn sơ đồ phát biểu */
function NhanVaiTro({ ten }: { ten: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-800">
      <Users className="h-3 w-3" />
      {ten}
    </span>
  );
}

function KhoiTieuDe({ so, tieuDe, phu }: { so: string; tieuDe: string; phu: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-sm"
      >
        {so}
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-black tracking-tight text-slate-900">{tieuDe}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{phu}</p>
      </div>
    </div>
  );
}

/** Nút tải một biểu mẫu; biểu mẫu chưa có tệp thì nói thẳng là chưa có */
function TheBieuMau({ bieuMau }: { bieuMau: TepTaiVe }) {
  const coTep = !!bieuMau.tep;
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${
        coTep ? 'border-emerald-200 bg-white' : 'border-dashed border-slate-300 bg-slate-50'
      }`}
    >
      <span
        aria-hidden
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-black ${
          coTep ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
        }`}
      >
        {bieuMau.ma}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black leading-snug text-slate-900">
          Mẫu biểu {bieuMau.ma} — {bieuMau.ten}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{bieuMau.moTa}</p>
      </div>
      {coTep ? (
        <a
          href={bieuMau.tep}
          download
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
        >
          <Download className="h-4 w-4" />
          Tải mẫu {bieuMau.ma}
          {bieuMau.kichCo && <span className="font-bold opacity-80">· {bieuMau.kichCo}</span>}
        </a>
      ) : (
        // Không bày nút bấm vào rồi báo lỗi 404: nói thẳng tệp chưa đăng tải
        <span className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-500">
          Chưa đăng tải tệp
        </span>
      )}
    </div>
  );
}

export const SoDoVanHanh: React.FC<{ moHinh: MoHinhVanHanh }> = ({ moHinh }) => {
  return (
    <div className="space-y-10">
      {/* ---- Mục tiêu và ranh giới ---- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 lg:col-span-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Chương trình này để làm gì</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{moHinh.mucTieu}</p>
        </div>
        {/* Ranh giới thẩm quyền đặt ngang hàng với mục tiêu, không nhét xuống
            chân trang: hiểu nhầm «họp xong là được duyệt» là hiểu nhầm đắt nhất */}
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800">
            <ShieldAlert className="h-3.5 w-3.5" />
            Chương trình KHÔNG làm gì
          </p>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">{moHinh.khongLam}</p>
        </div>
      </div>

      {/* ---- 1. Hồ sơ nào phải vào phiên ---- */}
      <section>
        <KhoiTieuDe
          so="1"
          tieuDe="Hồ sơ nào phải vào phiên"
          phu="Phạm vi áp dụng và ngưỡng GHTD theo từng phân khúc (mục 3 của văn bản)."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {moHinh.dieuKien.map((dk) => (
            <div key={dk.ma} className="rounded-2xl border border-emerald-200 bg-white p-4">
              <p className="flex items-center gap-1.5 text-sm font-black text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {dk.nhan}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{dk.moTa}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- 2. Sơ đồ các bước ---- */}
      <section>
        <KhoiTieuDe
          so="2"
          tieuDe="Đường đi của một hồ sơ"
          phu="Bốn bước của quy trình (mục 5 của văn bản); Bước 3 «Tổ chức phiên» tách thành năm việc (i)–(v). Mỗi cột là một vai trò — nhìn sơ đồ là thấy việc chuyền tay qua mấy người."
        />
        <SoDoLuongViec moHinh={moHinh} />

        <p className="mb-3 mt-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
          Chi tiết từng bước
        </p>
        <ol>
          {moHinh.buoc.map((buoc, i) => {
            const vaiTro = timVaiTro(moHinh, buoc.vaiTro);
            const cuoi = i === moHinh.buoc.length - 1;
            return (
              <li key={buoc.ma} className="relative">
                <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-300">
                  <div className="flex shrink-0 flex-col items-center">
                    <span
                      aria-hidden
                      className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    >
                      <buoc.icon className="h-5 w-5" />
                    </span>
                    {/* Đường nối dọc trong thẻ — nối tiếp với mũi tên nằm giữa hai
                        thẻ bên dưới, thành một mạch chảy liền từ bước 1 tới bước cuối */}
                    {!cuoi && <span aria-hidden className="mt-1 w-px flex-1 bg-emerald-200" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">{buoc.soVanBan}</span>
                      <h4 className="text-sm font-black text-slate-900">{buoc.ten}</h4>
                      <NhanVaiTro ten={vaiTro.tenNgan} />
                      {buoc.moc && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                          <Clock className="h-3 w-3" />
                          {buoc.moc}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{buoc.moTa}</p>
                    {/* Danh sách con — VD chín nội dung tối thiểu của bộ tài liệu 360°.
                        Đánh số để cán bộ tự tích được từng mục trước khi gửi */}
                    {buoc.danhSach && (
                      <ol className="mt-2 grid gap-1 text-xs leading-relaxed text-slate-700 sm:grid-cols-2">
                        {buoc.danhSach.map((d, k) => (
                          <li key={k} className="flex gap-2">
                            <span className="shrink-0 font-black text-emerald-700">{k + 1}.</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ol>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                      {/* «Kết quả:» phải liền một khối — trên màn 390px nó từng bị
                          ngắt thành «Kết / quả:» ngay giữa hai chữ */}
                      <span className="inline-flex items-start gap-1.5 font-semibold text-slate-500">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>
                          <span className="whitespace-nowrap">Kết quả:</span>{' '}
                          <span className="font-bold text-slate-700">{buoc.dauRa}</span>
                        </span>
                      </span>
                      {buoc.bieuMau?.map((ma) => (
                        <span key={ma} className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <FileText className="h-3.5 w-3.5" />
                          Mẫu biểu {ma}
                        </span>
                      ))}
                      {buoc.duongDan && (
                        <Link
                          to={buoc.duongDan}
                          className="inline-flex items-center gap-1 font-black text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                        >
                          Làm ngay trên cổng
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mũi tên nối hai thẻ — canh đúng cột biểu tượng (16px đệm thẻ +
                    20px nửa ô biểu tượng) nên mắt đi thẳng một mạch xuống dưới.
                    Xếp DỌC chứ không phải hàng ngang 8 bước: hàng ngang vỡ ngay
                    ở màn điện thoại, mà phần lớn cán bộ mở cổng bằng điện thoại. */}
                {!cuoi && (
                  <span aria-hidden className="ml-[2.25rem] flex h-2 items-center">
                    <span className="h-full w-px bg-emerald-200" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ---- 3. Sơ đồ phát biểu trong phiên ---- */}
      <section>
        <KhoiTieuDe
          so="3"
          tieuDe="Thứ tự phát biểu trong phiên"
          phu={`Trình tự trao đổi, phát biểu tại Bước 3 (iii) của văn bản — ${moHinh.phatBieu.length} vị trí quanh bàn, theo chiều kim đồng hồ từ người gần hồ sơ nhất tới Người điều phối. Bấm vào từng người để xem việc của vị trí đó.`}
        />
        <SoDoPhatBieu moHinh={moHinh} />
      </section>

      {/* ---- 4. Ai làm gì ---- */}
      <section>
        <KhoiTieuDe
          so="4"
          tieuDe="Ai làm gì"
          phu={`${moHinh.vaiTro.length} vai trò của một phiên — là ai và trách nhiệm gì, theo mục 4 của văn bản.`}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {moHinh.vaiTro.map((v) => (
            <div key={v.ma} className="rounded-2xl border border-slate-200 bg-white p-4">
              {/* Chấm màu trùng với màu vai trò trên sơ đồ — bảng này là chú giải
                  của sơ đồ, không phải một danh sách rời */}
              <p className="flex items-center gap-2 text-sm font-black text-slate-900">
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: v.mau }} />
                {v.ten}
              </p>
              {v.laAi && <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{v.laAi}</p>}
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{v.trachNhiem}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- 5. Biểu mẫu ---- */}
      <section>
        <KhoiTieuDe so="5" tieuDe="Biểu mẫu dùng trong phiên" phu="Tải về, điền tại phiên, lưu cùng hồ sơ trình duyệt." />
        <div className="space-y-3">
          {moHinh.bieuMau.map((bm) => (
            <TheBieuMau key={bm.ma} bieuMau={bm} />
          ))}
        </div>
      </section>

      {/* ---- Nguyên tắc + nguồn ---- */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nguyên tắc thực hiện (mục 2 của văn bản)</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {moHinh.nguyenTac.map((nt) => (
            <li key={nt} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              {nt}
            </li>
          ))}
        </ul>
        {/* Ghi nguồn để người sau đối chiếu được với văn bản gốc thay vì tin vào
            trang web — quy chế đổi thì trang phải đổi theo, không ngược lại */}
        <p className="mt-4 flex items-start gap-2 border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Nguồn: {moHinh.nguon}</span>
        </p>
      </section>
    </div>
  );
};
