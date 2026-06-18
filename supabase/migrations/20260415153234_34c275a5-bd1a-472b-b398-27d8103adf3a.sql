
-- Add is_active to departments
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Insert Phòng Bán lẻ
INSERT INTO public.departments (id, code, name, is_active)
VALUES ('a1000000-0000-0000-0000-000000000009', 'BL', 'Phòng Bán lẻ', true)
ON CONFLICT (id) DO NOTHING;

-- Deactivate CNTT and Kế toán
UPDATE public.departments SET is_active = false WHERE id IN (
  'a1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000003'
);

-- Fix department name casing
UPDATE public.departments SET name = 'Phòng Dịch vụ khách hàng' WHERE id = 'a1000000-0000-0000-0000-000000000005';
UPDATE public.departments SET name = 'Phòng giao dịch' WHERE id = 'a1000000-0000-0000-0000-000000000007';
UPDATE public.departments SET name = 'Phòng Hỗ trợ tín dụng' WHERE id = 'a1000000-0000-0000-0000-000000000006';

-- Add Bán lẻ positions
INSERT INTO public.positions (id, department_id, name, code, sort_order, is_active) VALUES
  ('d0000000-0007-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000009', 'Trưởng phòng Bán lẻ', 'TP_BL', 1, true),
  ('d0000000-0007-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000009', 'Phó phòng Bán lẻ', 'PP_BL', 2, true),
  ('d0000000-0007-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000009', 'Cán bộ quan hệ khách hàng bán lẻ', 'CB_BL', 3, true)
ON CONFLICT (id) DO NOTHING;
