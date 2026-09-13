-- Nạp sổ sao từ dữ liệu đã làm sạch 08/2026.
--
-- Căn cứ khai báo dải 1–259: số 259 đã được dùng trên phiếu thật, mà sao in và
-- đóng số theo quyển nên quyển in tối thiểu phải chạy đến 259. Các số chưa gắn
-- phiếu nào được coi là TỒN KHO HỆ THỐNG — cần đối chiếu với số sao thật còn
-- trong kho TCTH; số nào thực tế đã phát mà thiếu phiếu thì bổ sung phiếu, số
-- hỏng thì chuyển 'void'.
--
-- (Sau khi áp trên CSDL 29/08: bảng phiếu lúc đó chứa bản nhập 21+28/08 với quyển
-- đã chạy đến 266 — bước vá bổ sung đã khai báo thêm 260–262 và ghi chú ca trùng
-- serial 90 trong cột note; xem docs/doi-chieu-van-ban-va-tinh-nang-sao-2026-08.md.)

-- 1. Các số đã nằm trên phiếu → 'awarded', gắn đúng phiếu
insert into public.star_serials (serial_no, status, record_id, note)
select distinct on ((btrim(t))::int)
       (btrim(t))::int, 'awarded', r.id, 'Nạp từ dữ liệu phiếu đã làm sạch 08/2026'
from public.star_records r,
     lateral regexp_split_to_table(coalesce(r.serial,''), '[,;]') t
where btrim(t) ~ '^[0-9]+$'
on conflict (serial_no) do nothing;

-- 2. Phần còn lại của quyển 1–259 → tồn kho chờ đối soát
insert into public.star_serials (serial_no, note)
select s, 'Khai báo theo quyển in 1–259; tồn hệ thống, chờ đối soát kho thật'
from generate_series(1, 259) s
on conflict (serial_no) do nothing;
