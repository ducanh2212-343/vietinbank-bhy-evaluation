import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, Clock, Download, FileText, Info, ShieldAlert, Timer, Users,
} from 'lucide-react';
import {
  timVaiTro, tongThoiLuongPhien,
  type BieuMauChuongTrinh, type MoHinhVanHanh,
} from '@/data/one/vanHanhChuongTrinh';

/**
 * SƠ ĐỒ VẬN HÀNH của một chương trình Bắc Hưng Yên Ways.
 *
 * Vì sao dựng riêng khối này: trang thương hiệu trước đây kể chuyện bằng đoạn
 * văn — người mới đọc xong vẫn không trả lời được ba câu «hồ sơ nào phải vào?»,
 * «tôi làm gì, đến lượt ai?», «xong nộp giấy gì?». Ba câu đó thành ba khối có
 * hình: điều kiện vào, sơ đồ bước, sơ đồ phát biểu — rồi mới tới biểu mẫu.
 *
 * Vì sao vẽ bằng thẻ + đường kẻ CSS chứ không phải một tấm SVG hay ảnh:
 *   - Tên phòng, mốc giờ và ngưỡng GHTD còn đổi theo quy chế. Ảnh thì mỗi lần
 *     sửa phải vẽ lại và ai đó phải nhớ thay tệp; thẻ thì sửa dữ liệu là xong.
 *   - Sơ đồ phải đọc được trên điện thoại — 150 cán bộ phần lớn mở bằng điện
 *     thoại. Một tấm SVG ngang 8 bước trên màn 390px là không đọc nổi; thẻ thì
 *     xếp dọc lại được.
 *   - Trình đọc màn hình đọc được chữ thật, không phải một tấm ảnh câm.
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
function TheBieuMau({ bieuMau }: { bieuMau: BieuMauChuongTrinh }) {
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
  const tongPhut = tongThoiLuongPhien(moHinh);

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
          phu="Đủ các điều kiện dưới đây là hồ sơ thuộc diện bắt buộc đưa ra thảo luận."
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
          phu={`${moHinh.buoc.length} bước, từ lúc sàng lọc tới lúc ghi nhật ký. Mỗi bước ghi rõ ai làm và kết thúc bằng cái gì.`}
        />
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
                      <span className="text-[10px] font-black text-slate-400">BƯỚC {i + 1}</span>
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
          phu={`Gợi ý cho một phiên khoảng ${tongPhut} phút. Biết trước lượt của mình thì ai cũng chuẩn bị được đúng phần mình nói.`}
        />
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {moHinh.phatBieu.map((luot, i) => {
            const vaiTro = timVaiTro(moHinh, luot.vaiTro);
            // Bề rộng dải thời lượng tỉ lệ với số phút — nhìn là thấy phần thảo
            // luận chiếm nhiều thời gian nhất, không phải phần trình bày
            const tiLe = Math.round((luot.phut / tongPhut) * 100);
            return (
              <div
                key={luot.thuTu}
                className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4 ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <span
                  aria-hidden
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 text-[11px] font-black text-white"
                >
                  {luot.thuTu}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{vaiTro.ten}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                      <Timer className="h-3.5 w-3.5" />
                      ~{luot.phut} phút
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{luot.noiDung}</p>
                </div>
                <div className="hidden h-2 w-40 shrink-0 overflow-hidden rounded-full bg-slate-100 sm:block">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${tiLe}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- 4. Ai làm gì ---- */}
      <section>
        <KhoiTieuDe so="4" tieuDe="Ai làm gì" phu="Sáu vai trò trong một phiên và trách nhiệm của từng vai." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {moHinh.vaiTro.map((v) => (
            <div key={v.ma} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-black text-slate-900">{v.ten}</p>
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
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bốn nguyên tắc giữ chất lượng phiên</p>
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
