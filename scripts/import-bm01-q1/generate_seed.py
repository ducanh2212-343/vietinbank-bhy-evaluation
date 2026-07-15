#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sinh SQL seed phiếu BM01 Quý I/2026 từ file Excel trích xuất Word/PDF.

Bối cảnh: kỳ Quý I/2026 cán bộ thực hiện Biểu mẫu 01 trên bản Word/PDF
(không nhập app). File Excel tổng hợp (sheet "Bang hanh dong Word") chứa
các hành động 2.1 Phát triển năng lực và 2.2 Gắn với AI của từng cán bộ.
Script này sinh 1 file SQL idempotent để nhập các hành động đó vào các bảng
form_submissions / form_skill_priorities / form_skill_actions /
form_ai_actions_v2, nhờ đó mục "Rà soát hành động kỳ trước" của BM02
hiển thị và PDCA được các hành động Quý I.

Input (không commit dữ liệu cá nhân vào repo — truyền qua tham số):
  --excel        File Excel BM01 (sheet "Bang hanh dong Word")
  --profiles     JSON [{id, full_name, dept}] xuất từ bảng profiles
  --skills       JSON {"SK01": "<uuid>", ...} xuất từ skill_catalog
  --manual-map   CSV stt,code,confidence,basis — gán skill cho hành động 2.1
                 không ghi rõ "Skill NN" (phân loại thủ công/AI)
  --cycle-id     UUID chu kỳ "Quý I/2026" trong evaluation_cycles
  --out          File SQL đầu ra
  --report       CSV báo cáo mapping đầy đủ (cán bộ, hành động, skill, căn cứ)

Idempotent: SQL bắt đầu bằng DELETE các phiếu có marker [IMPORT-BM01-Q1]
trong manager_comment (cascade xoá bảng con), nên chạy lại an toàn.
Cuối file SQL archive các thẻ kanban sinh ra bởi trigger sync_kanban_*.
"""
import argparse
import csv
import json
import re
import unicodedata
import uuid
from datetime import datetime

IMPORT_TAG = '[IMPORT-BM01-Q1]'
SHEET = 'Bang hanh dong Word'

# Đơn vị trong file Excel → tên phòng trong bảng departments
DEPT_ALIAS = {
    'PHÒNG TCTH': 'Phòng Tổ chức Tổng hợp',
    'PGD VĂN LÂM': 'Phòng giao dịch Văn Lâm',
    'P. KHDN': 'Phòng KHDN',
    'P. HTTD': 'Phòng Hỗ trợ tín dụng',
    'P. BÁN LẺ': 'Phòng Bán lẻ',
    'PGD VĂN GIANG': 'Phòng giao dịch Văn Giang',
    'PGD YÊN MỸ': 'Phòng giao dịch Yên Mỹ',
    'PGD KHOÁI CHÂU': 'Phòng giao dịch Khoái Châu',
    'PGD ÂN THI': 'Phòng giao dịch Ân Thi',
    'P. DVKH': 'Phòng Dịch vụ khách hàng',
    'BAN GIÁM ĐỐC': 'Ban Giám đốc',
}


def norm_name(s: str) -> str:
    """Chuẩn hóa tên: bỏ dấu, viết hoa, gộp khoảng trắng (khớp 'VU THI THU HA' ~ 'Vũ Thị Thu Hà')."""
    if not s:
        return ''
    s = unicodedata.normalize('NFD', str(s))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.replace('Đ', 'D').replace('đ', 'd')
    return ' '.join(s.upper().split())


PLACEHOLDERS = {'chưa nhập', 'chưa đặt tên', '(chưa đặt tên)', 'chưa có nội dung', 'chưa có nội dung hành động'}


def dedup_action_text(text: str, scope_key, seen: dict) -> str:
    """Chống vi phạm unique index chống trùng hành động (uniq_ai_action_per_form /
    uniq_skill_action_per_priority): nếu cùng scope đã có hành động trùng nguyên văn
    (so sánh lower/btrim như index), thêm hậu tố " (hành động N)" để giữ đủ các dòng
    thật sự khác nhau (VD: 2 hành động AI cùng tên skill nhưng khác kết quả mục tiêu)."""
    base = (text or '').strip()
    norm = base.lower()
    if not norm or norm in PLACEHOLDERS:
        return text
    n = 1
    out = base
    while (scope_key, out.lower()) in seen:
        n += 1
        out = f"{base} (hành động {n})"
    seen[(scope_key, out.lower())] = True
    return out


def sql_str(s):
    if s is None or s == '':
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"


def parse_deadline(s: str):
    """dd/mm/yyyy → yyyy-mm-dd; không parse được → None."""
    if not s:
        return None
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', str(s))
    if not m:
        return None
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    try:
        return datetime(y, mo, d).strftime('%Y-%m-%d')
    except ValueError:
        return None


def load_actions(path):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[SHEET]
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r[0] is None:
            continue
        rows.append({
            'stt': int(r[0]),
            'unit': str(r[1]).strip(),
            'staff': str(r[2]).strip(),
            'group': str(r[3]).strip(),
            'action': str(r[5]).strip() if r[5] else '',
            'target': str(r[6]).strip() if r[6] else '',
            'deadline': str(r[7]).strip() if r[7] else '',
            'support': str(r[8]).strip() if r[8] else '',
        })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--excel', required=True)
    ap.add_argument('--profiles', required=True)
    ap.add_argument('--skills', required=True)
    ap.add_argument('--manual-map', required=True)
    ap.add_argument('--cycle-id', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--report', required=True)
    args = ap.parse_args()

    actions = load_actions(args.excel)
    profiles = json.load(open(args.profiles, encoding='utf-8'))
    skills = json.load(open(args.skills, encoding='utf-8'))

    manual = {}
    with open(args.manual_map, encoding='utf-8') as f:
        for row in csv.DictReader(f):
            manual[int(row['stt'])] = (row['code'], row.get('confidence', ''), row.get('basis', ''))

    # --- khớp cán bộ ---
    by_name = {}
    for p in profiles:
        by_name.setdefault(norm_name(p['full_name']), []).append(p)

    staff_map, skipped_staff = {}, []
    for unit, staff in sorted({(r['unit'], r['staff']) for r in actions}):
        cands = by_name.get(norm_name(staff), [])
        if len(cands) > 1:
            dept = DEPT_ALIAS.get(unit)
            cands = [c for c in cands if c['dept'] == dept] or cands
        if len(cands) == 1:
            staff_map[(unit, staff)] = cands[0]
        else:
            skipped_staff.append((unit, staff, len(cands)))

    # --- gán skill cho hành động 2.1 ---
    def resolve_skill(row):
        m = re.search(r'[Ss]kill\s*(\d{1,2})\b', row['action'])
        if m and 1 <= int(m.group(1)) <= 38:
            return f"SK{int(m.group(1)):02d}", 'explicit', f"Ghi rõ Skill {m.group(1)} trong hành động"
        if row['stt'] in manual:
            code, conf, basis = manual[row['stt']]
            return code, conf or 'manual', basis
        return None, None, None

    # --- gom dữ liệu theo cán bộ ---
    report_rows, missing_skill = [], []
    forms = {}  # (unit,staff) -> {'form_id', 'priorities': {code: prio_id}, 'skill_actions': [], 'ai_actions': []}
    for r in actions:
        key = (r['unit'], r['staff'])
        if key not in staff_map:
            report_rows.append([r['stt'], r['unit'], r['staff'], r['group'], '', 'BỎ QUA', 'Không có profile trong app', r['action'][:120]])
            continue
        f = forms.setdefault(key, {
            'form_id': str(uuid.uuid4()), 'profile': staff_map[key],
            'priorities': {}, 'skill_actions': [], 'ai_actions': [],
        })
        if r['group'].startswith('2.2'):
            f['ai_actions'].append(r)
            report_rows.append([r['stt'], r['unit'], r['staff'], r['group'], 'AI', 'OK', 'Hành động gắn với AI', r['action'][:120]])
        else:
            code, conf, basis = resolve_skill(r)
            if not code or code not in skills:
                missing_skill.append(r['stt'])
                report_rows.append([r['stt'], r['unit'], r['staff'], r['group'], '', 'THIẾU SKILL', 'Chưa gán được skill', r['action'][:120]])
                continue
            if code not in f['priorities']:
                f['priorities'][code] = str(uuid.uuid4())
            f['skill_actions'].append((r, code))
            report_rows.append([r['stt'], r['unit'], r['staff'], r['group'], code, conf, basis, r['action'][:120]])

    if missing_skill:
        raise SystemExit(f"Thiếu mapping skill cho các dòng STT: {missing_skill} — bổ sung vào manual-map rồi chạy lại.")

    # --- sinh SQL ---
    cyc = sql_str(args.cycle_id)
    out = []
    out.append('BEGIN;')
    out.append(f"-- Seed BM01 Quý I/2026 từ hồ sơ Word/PDF — sinh bởi scripts/import-bm01-q1/generate_seed.py")
    out.append(f"-- Idempotent: xoá dữ liệu import cũ theo marker {IMPORT_TAG} trước khi insert lại.")
    out.append(f"DELETE FROM form_submissions WHERE cycle_id = {cyc} AND manager_comment LIKE '%{IMPORT_TAG}%';")

    comment = f"Phiếu BM01 Quý I/2026 nhập từ hồ sơ Word/PDF (Chiêu thức số 3). {IMPORT_TAG}"
    for key, f in sorted(forms.items()):
        out.append(
            "INSERT INTO form_submissions (id, cycle_id, employee_id, status, submitted_at, manager_comment) VALUES "
            f"({sql_str(f['form_id'])}, {cyc}, {sql_str(f['profile']['id'])}, 'approved', '2026-04-15T09:00:00+07:00', {sql_str(comment)});"
        )
        order = 0
        for code, prio_id in f['priorities'].items():
            order += 1
            out.append(
                "INSERT INTO form_skill_priorities (id, form_id, skill_id, priority_order, reason_text, source_type, status) VALUES "
                f"({sql_str(prio_id)}, {sql_str(f['form_id'])}, {sql_str(skills[code])}, {order}, "
                f"{sql_str('Hành động BM01 Quý I (bản Word/PDF)')}, 'core_skill', 'planned');"
            )
        row_no = {}
        seen_texts = {}
        for r, code in f['skill_actions']:
            prio_id = f['priorities'][code]
            row_no[code] = row_no.get(code, 0) + 1
            dl = parse_deadline(r['deadline'])
            target = r['target']
            if r['deadline'] and not dl:
                target = (target + f" (Thời hạn gốc: {r['deadline']})").strip()
            action_text = dedup_action_text(r['action'] or 'Chưa nhập', ('skill', prio_id), seen_texts)
            out.append(
                "INSERT INTO form_skill_actions (form_id, skill_priority_id, row_no, action_type, action_text, expected_result, deadline, requested_support, status) VALUES "
                f"({sql_str(f['form_id'])}, {sql_str(prio_id)}, {row_no[code]}, '70', {sql_str(action_text)}, "
                f"{sql_str(target)}, {sql_str(dl)}, {sql_str(r['support'])}, 'planned');"
            )
        for i, r in enumerate(f['ai_actions'], 1):
            dl = parse_deadline(r['deadline'])
            target = r['target']
            if r['deadline'] and not dl:
                target = (target + f" (Thời hạn gốc: {r['deadline']})").strip()
            action_text = dedup_action_text(r['action'] or 'Chưa nhập', ('ai', f['form_id']), seen_texts)
            out.append(
                "INSERT INTO form_ai_actions_v2 (form_id, row_no, ai_action_text, expected_result, deadline, requested_support, status) VALUES "
                f"({sql_str(f['form_id'])}, {i}, {sql_str(action_text)}, "
                f"{sql_str(target)}, {sql_str(dl)}, {sql_str(r['support'])}, 'planned');"
            )

    # Trigger sync_kanban_* tự tạo thẻ kanban cho từng hành động — archive để không
    # làm ngập Kanban cá nhân bằng thẻ Quý I đã quá hạn.
    out.append(
        f"UPDATE kanban_cards SET is_active = false WHERE form_id IN "
        f"(SELECT id FROM form_submissions WHERE cycle_id = {cyc} AND manager_comment LIKE '%{IMPORT_TAG}%');"
    )
    out.append('COMMIT;')

    with open(args.out, 'w', encoding='utf-8') as fo:
        fo.write('\n'.join(out) + '\n')
    with open(args.report, 'w', encoding='utf-8', newline='') as fr:
        w = csv.writer(fr)
        w.writerow(['STT', 'Đơn vị', 'Cán bộ', 'Nhóm', 'Skill gán', 'Độ tin cậy', 'Căn cứ', 'Hành động (rút gọn)'])
        w.writerows(report_rows)

    n_forms = len(forms)
    n_sk = sum(len(f['skill_actions']) for f in forms.values())
    n_ai = sum(len(f['ai_actions']) for f in forms.values())
    print(f"Phiếu: {n_forms} | Hành động skill (2.1): {n_sk} | Hành động AI (2.2): {n_ai}")
    if skipped_staff:
        print('Cán bộ bị bỏ qua (không khớp profile):')
        for u, s, n in skipped_staff:
            print(f"  - {u} | {s} (ứng viên: {n})")


if __name__ == '__main__':
    main()
