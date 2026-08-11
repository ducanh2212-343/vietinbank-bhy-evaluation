import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock, Info, Loader2, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useCauHinhNhip, useLamTuoiCauHinhNhip } from '@/hooks/useCauHinhNhip';
import { CAU_HINH_MAC_DINH, gioNgan, gioSangPhut, type CauHinhNhip } from '@/lib/cauHinhNhip';

/**
 * Đặt mốc giờ nhịp cho cả Chi nhánh.
 *
 * Đây là những con số trước kia chôn cứng trong mã nguồn. Đưa ra đây vì giờ
 * giao ban là quyết định của Chi nhánh, không phải của người viết phần mềm —
 * đổi giờ mà phải chờ triển khai lại thì thực tế là không đổi được.
 *
 * Cảnh báo trước khi lưu chứ không chặn: hệ quả của việc đổi mốc là chuyện
 * nghiệp vụ, người đặt phải thấy hệ quả rồi tự quyết.
 */

type Form = CauHinhNhip;

export function Ct2CaiDatMocGio() {
  const { data, isLoading, isError } = useCauHinhNhip();
  const lamTuoi = useLamTuoiCauHinhNhip();
  const [f, setF] = useState<Form>({ ...CAU_HINH_MAC_DINH });
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    if (data) setF({ ...CAU_HINH_MAC_DINH, ...data });
  }, [data]);

  const dat = <K extends keyof Form>(k: K, v: Form[K]) => setF((cu) => ({ ...cu, [k]: v }));

  // Tác vụ chốt sổ chạy 09:00 giờ VN. Ân hạn muộn hơn mốc đó thì nhịp ghi sau
  // 09:00 không kịp vào ảnh chụp của ngày hôm đó.
  const anHanQuaMuon = gioSangPhut(f.gio_an_han) > 9 * 60;
  const gioSai = gioSangPhut(f.gio_dung_gio) >= gioSangPhut(f.gio_an_han);
  const khungNhipSai = gioSangPhut(f.gio_mo_nhip) >= gioSangPhut(f.gio_dong_nhip);
  const yenTinhSai = gioSangPhut(f.gio_yen_tinh_tu) >= gioSangPhut(f.gio_yen_tinh_den);
  const coLoi = gioSai || khungNhipSai || yenTinhSai;

  const luu = async () => {
    if (coLoi) { toast.error('Còn mốc giờ chưa hợp lệ — kiểm tra lại các ô báo đỏ.'); return; }
    setDangLuu(true);
    const db = supabase as unknown as {
      from(t: string): {
        update(v: unknown): {
          eq(c: string, v: unknown): {
            select(c: string): PromiseLike<{ data: unknown[] | null; error: { message?: string } | null }>;
          };
        };
      };
    };
    /*
      `.select()` không phải để lấy dữ liệu — nó để ĐẾM SỐ DÒNG THỰC SỰ ĐỔI.
      RLS chặn một UPDATE thì PostgREST trả 0 dòng và KHÔNG kèm lỗi, nên bản cũ
      báo «Đã lưu mốc giờ» trong khi không lưu gì: Giám đốc bấm lưu, thấy báo
      thành công, mở lại thấy số cũ, không có manh mối nào để đoán vì sao.
      Một màn hình nói dối còn tệ hơn một màn hình báo lỗi.
    */
    const { data: doi, error } = await db
      .from('ct2_cau_hinh_thoi_gian').update(f).eq('id', true).select('id');
    setDangLuu(false);
    if (error) { toast.error(error.message ?? 'Không lưu được.'); return; }
    if (!doi || doi.length === 0) {
      toast.error('Không lưu được: tài khoản của anh/chị không có quyền đổi mốc giờ '
        + 'của Chi nhánh. Cần vai Giám đốc, Tổ chức Tổng hợp hoặc quản trị hệ thống.');
      return;
    }
    toast.success('Đã lưu mốc giờ. Các bảng sẽ tính lại theo mốc mới.');
    lamTuoi();
  };

  return (
    <Card>
      <CardHeader>
        <p className="flex items-center gap-2 font-semibold">
          <Clock className="h-4 w-4" /> Mốc giờ nhịp Chiêu thức 2
        </p>
        <p className="text-xs text-muted-foreground">
          Đổi ở đây là đổi cho toàn Chi nhánh: cách chấm nhịp sáng, khung phát thông báo và
          các ngưỡng cảnh báo đều đọc từ đây.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/*
          LUÔN hiện form, kể cả khi chưa đọc được cấu hình. Chặn sau một vòng
          quay là cách chắc chắn để quản trị không sửa được gì đúng lúc mạng
          chập chờn; form đã khởi tạo bằng đúng mặc định của database nên hiện
          ra vẫn là con số đang chạy.
        */}
        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang đọc mốc giờ hiện tại…
          </p>
        )}
        {isError && (
          <Alert className="border-amber-300 bg-amber-50">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Chưa đọc được mốc giờ đang chạy</AlertTitle>
            <AlertDescription>
              Các ô dưới đang hiện <b>giá trị mặc định</b>, có thể khác với mốc Chi nhánh đang
              dùng. Tải lại trang trước khi lưu, để tránh vô tình ghi đè mốc người khác vừa đặt.
            </AlertDescription>
          </Alert>
        )}
        <>
            <div>
              <p className="mb-2 text-sm font-medium">Chấm nhịp sáng</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <OGio id="dung-gio" nhan="Ghi trước giờ này = ĐÚNG GIỜ"
                  gia={f.gio_dung_gio} onDoi={(v) => dat('gio_dung_gio', v)} loi={gioSai} />
                <OGio id="an-han" nhan="Ghi trước giờ này = MUỘN (sau đó là mất nhịp)"
                  gia={f.gio_an_han} onDoi={(v) => dat('gio_an_han', v)} loi={gioSai} />
              </div>
              {gioSai && (
                <p className="mt-1 text-xs text-red-600">Giờ đúng giờ phải sớm hơn giờ ân hạn.</p>
              )}
              <p className="mt-1.5 text-2xs text-muted-foreground">
                Lãnh đạo Phòng ghi trong khung ân hạn vẫn tính là đúng giờ — khung này vốn dành
                cho lãnh đạo chốt sau khi cả phòng đã ghi.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Khung «bảng sống»</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <OGio id="mo-nhip" nhan="Bắt đầu tự làm mới bảng"
                  gia={f.gio_mo_nhip} onDoi={(v) => dat('gio_mo_nhip', v)} loi={khungNhipSai} />
                <OGio id="dong-nhip" nhan="Ngừng tự làm mới"
                  gia={f.gio_dong_nhip} onDoi={(v) => dat('gio_dong_nhip', v)} loi={khungNhipSai} />
              </div>
              <p className="mt-1.5 text-2xs text-muted-foreground">
                Trong khung này bảng của Phòng tự cập nhật để thấy đồng nghiệp đang ghi nhịp.
                Ngoài khung thì tắt, để 150 người mở cùng lúc không dội truy vấn vô ích.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Khung được phép báo</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <OGio id="yen-tu" nhan="Sớm nhất được phép báo"
                  gia={f.gio_yen_tinh_tu} onDoi={(v) => dat('gio_yen_tinh_tu', v)} loi={yenTinhSai} />
                <OGio id="yen-den" nhan="Muộn nhất được phép báo"
                  gia={f.gio_yen_tinh_den} onDoi={(v) => dat('gio_yen_tinh_den', v)} loi={yenTinhSai} />
              </div>
              <p className="mt-1.5 text-2xs text-muted-foreground">
                Thông báo sinh ngoài khung này không bị mất — nó được HOÃN tới {gioNgan(f.gio_yen_tinh_tu)}
                {' '}buổi sáng làm việc kế tiếp. Riêng mức ⛔ vẫn báo ngay.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Ngưỡng cảnh báo</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <OSo id="nguong-cho" nhan="Nghẽn cột chờ (ngày làm việc)"
                  gia={f.nguong_tuoi_cho} onDoi={(v) => dat('nguong_tuoi_cho', v)} min={1} max={30} />
                <OSo id="nguong-im" nhan="Hồ sơ tín dụng chưa cập nhật (ngày làm việc)"
                  gia={f.nguong_im_lang_ho_so} onDoi={(v) => dat('nguong_im_lang_ho_so', v)} min={1} max={30} />
              </div>
              {/*
                Ô «Trần thông báo / người / ngày» đã gỡ 09/08/2026 theo yêu cầu Giám đốc.
                Đối chiếu số liệu: trần chỉ từng chặn mã N15 «Có việc chờ anh/chị chốt» —
                đúng loại tin cần hành động nhất — trong khi hai loại ồn nhất (nhịp và
                trao đổi) vốn đã được miễn trừ. Chống phiền nay chỉ còn dựa vào khung giờ
                yên tĩnh phía trên.
              */}
              <p className="mt-1.5 text-2xs text-muted-foreground">
                Không còn giới hạn số thông báo mỗi người mỗi ngày. Việc chống phiền do
                khung giờ yên tĩnh phía trên đảm nhiệm.
              </p>
            </div>

            {anHanQuaMuon && (
              <Alert className="border-amber-300 bg-amber-50">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Ân hạn muộn hơn giờ chốt sổ</AlertTitle>
                <AlertDescription>
                  Tác vụ chốt sổ nhịp chạy lúc <b>09:00</b> mỗi ngày làm việc. Đặt ân hạn sau mốc
                  đó thì nhịp ghi muộn sẽ không kịp vào ảnh chụp của ngày hôm ấy, và bảng tổng hợp
                  tuần/tháng sẽ tính thiếu. Muốn để ân hạn muộn hơn thì phải dời cả tác vụ chốt sổ.
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Đổi mốc không sửa lại quá khứ</AlertTitle>
              <AlertDescription>
                Nhịp đã ghi giữ nguyên kết quả đã chấm; mốc mới áp dụng từ lần ghi tiếp theo.
                Đây là chủ ý — chấm lại quá khứ theo luật mới thì con số của các kỳ đã chốt sẽ đổi.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2">
              <Button onClick={luu} disabled={dangLuu || coLoi}>
                {dangLuu && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Lưu mốc giờ
              </Button>
              <Button variant="outline" onClick={() => setF({ ...CAU_HINH_MAC_DINH })}>
                Về mặc định
              </Button>
            </div>
        </>
      </CardContent>
    </Card>
  );
}

function OGio({ id, nhan, gia, onDoi, loi }: {
  id: string; nhan: string; gia: string; onDoi: (v: string) => void; loi?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">{nhan}</Label>
      <Input id={id} type="time" value={gioNgan(gia)} onChange={(e) => onDoi(e.target.value)}
        className={loi ? 'border-red-400' : ''} />
    </div>
  );
}

function OSo({ id, nhan, gia, onDoi, min, max }: {
  id: string; nhan: string; gia: number; onDoi: (v: number) => void; min: number; max: number;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">{nhan}</Label>
      <Input id={id} type="number" min={min} max={max} value={gia}
        onChange={(e) => onDoi(Math.min(max, Math.max(min, Number(e.target.value) || min)))} />
    </div>
  );
}
