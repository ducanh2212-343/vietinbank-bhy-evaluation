-- Gỡ dữ liệu nạp sổ sao. Vì sổ chỉ có thể phình thêm qua khai báo lô /
-- bàn giao / tặng, cách lùi trung thực duy nhất là làm rỗng sổ — mọi liên
-- kết số↔phiếu, tồn kho, bàn giao đang ghi trong sổ đều mất. Nạp lại được
-- bằng chính migration seed (phần gắn phiếu suy ra từ cột serial của
-- star_records nên không mất gốc).
delete from public.star_serials;
delete from public.star_handovers;
