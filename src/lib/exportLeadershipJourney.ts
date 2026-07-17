// Xuất "Hành trình tạo dấu ấn Bắc Hưng Yên Mark" của một PGĐ ra Word:
// nhóm theo NĂNG LỰC LÃNH ĐẠO và theo SKILL, kèm STAR, sản phẩm để lại và
// dòng thời gian tiến độ lấy từ kanban_card_logs (thẻ sinh từ dấu ấn).
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const cellBorders = { top: border, bottom: border, left: border, right: border };

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp', active: 'Đang thực hiện', confirmed: 'Đã ghi nhận', archived: 'Đã lưu trữ',
};
const KANBAN_LABEL: Record<string, string> = { todo: 'Chưa bắt đầu', doing: 'Đang làm', done: 'Hoàn thành' };
const LOG_LABEL: Record<string, string> = {
  created: 'Tạo thẻ', status_change: 'Chuyển trạng thái', progress_update: 'Cập nhật tiến độ',
  completion_requested: 'Gửi hoàn thành', completion_confirmed: 'Lãnh đạo xác nhận',
  returned: 'Trả lại bổ sung', evidence_added: 'Bổ sung bằng chứng',
};

export interface JourneyMark {
  id: string;
  title: string;
  description: string | null;
  role_focus: string | null;
  status: string;
  deadline: string | null;
  star_situation: string | null;
  star_task: string | null;
  star_action: string | null;
  star_result: string | null;
  deliverable: string | null;
  sort_order: number;
  competency: string | null;
  core_value: string | null;
  skills: { code: string | null; name: string }[];
  cycleName: string | null;
}

interface CardInfo {
  markId: string;
  kanban_status: string;
  progress_percent: number;
  logs: { at: string; label: string; note: string }[];
}

function p(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; spacingAfter?: number } = {}) {
  return new Paragraph({
    spacing: opts.spacingAfter != null ? { after: opts.spacingAfter } : undefined,
    children: [new TextRun({ text: text || '', bold: opts.bold, italics: opts.italics, size: opts.size ?? 22 })],
  });
}

function labelValue(label: string, value: string) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value || '—', size: 22 }),
    ],
  });
}

function cell(text: string, opts: { bold?: boolean; shade?: string; widthPct?: number } = {}) {
  return new TableCell({
    borders: cellBorders,
    width: opts.widthPct ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shade ? { fill: opts.shade, type: ShadingType.CLEAR } : undefined,
    children: [p(text, { bold: opts.bold })],
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

/** Tải toàn bộ dữ liệu hành trình của 1 PGĐ (RLS quyết định quyền xem). */
export async function fetchJourneyData(profileId: string): Promise<{ marks: JourneyMark[]; cards: Map<string, CardInfo> }> {
  const sb = supabase as any;
  const { data: markRows, error } = await sb
    .from('leadership_marks')
    .select(`
      id, title, description, role_focus, status, deadline, sort_order,
      star_situation, star_task, star_action, star_result, deliverable,
      leadership_competencies ( name ),
      core_values ( name ),
      evaluation_cycles ( name ),
      leadership_mark_skills ( sort_order, skill_catalog ( code, name ) )
    `)
    .eq('profile_id', profileId)
    .neq('status', 'archived')
    .order('sort_order');
  if (error) throw error;

  const marks: JourneyMark[] = (markRows || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    role_focus: r.role_focus,
    status: r.status,
    deadline: r.deadline,
    sort_order: r.sort_order,
    star_situation: r.star_situation,
    star_task: r.star_task,
    star_action: r.star_action,
    star_result: r.star_result,
    deliverable: r.deliverable,
    competency: r.leadership_competencies?.name ?? null,
    core_value: r.core_values?.name ?? null,
    cycleName: r.evaluation_cycles?.name ?? null,
    skills: (r.leadership_mark_skills || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((s: any) => ({ code: s.skill_catalog?.code ?? null, name: s.skill_catalog?.name ?? '' })),
  }));

  const cards = new Map<string, CardInfo>();
  const markIds = marks.map(m => m.id);
  if (markIds.length) {
    const { data: cardRows } = await sb
      .from('kanban_cards')
      .select('id, leadership_mark_id, kanban_status, progress_percent')
      .in('leadership_mark_id', markIds)
      .eq('is_active', true);
    const cardIdToMark = new Map<string, string>();
    (cardRows || []).forEach((c: any) => {
      cardIdToMark.set(c.id, c.leadership_mark_id);
      cards.set(c.leadership_mark_id, {
        markId: c.leadership_mark_id,
        kanban_status: c.kanban_status,
        progress_percent: c.progress_percent,
        logs: [],
      });
    });
    const cardIds = Array.from(cardIdToMark.keys());
    if (cardIds.length) {
      const { data: logRows } = await sb
        .from('kanban_card_logs')
        .select('card_id, log_type, new_status, progress_percent, progress_note, current_result, evidence_text, created_at')
        .in('card_id', cardIds)
        .order('created_at');
      (logRows || []).forEach((l: any) => {
        const markId = cardIdToMark.get(l.card_id);
        const info = markId ? cards.get(markId) : undefined;
        if (!info) return;
        const parts: string[] = [];
        if (l.new_status) parts.push(KANBAN_LABEL[l.new_status] || l.new_status);
        if (l.progress_percent != null) parts.push(`${l.progress_percent}%`);
        if (l.progress_note) parts.push(l.progress_note);
        if (l.current_result) parts.push(`Kết quả: ${l.current_result}`);
        if (l.evidence_text) parts.push(`Bằng chứng: ${l.evidence_text}`);
        info.logs.push({
          at: l.created_at,
          label: LOG_LABEL[l.log_type] || l.log_type,
          note: parts.join(' · '),
        });
      });
    }
  }
  return { marks, cards };
}

function markBlock(m: JourneyMark, card: CardInfo | undefined): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  out.push(new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 60 },
    children: [new TextRun({ text: `${m.sort_order}. ${m.title}`, bold: true, size: 24 })],
  }));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        cell('Năng lực lãnh đạo trọng tâm', { bold: true, shade: 'F2F2F2', widthPct: 30 }),
        cell(m.competency || '—'),
      ]}),
      new TableRow({ children: [
        cell('Năng lực cốt lõi bổ trợ', { bold: true, shade: 'F2F2F2' }),
        cell(m.core_value || '—'),
      ]}),
      new TableRow({ children: [
        cell('Skill liên quan', { bold: true, shade: 'F2F2F2' }),
        cell(m.skills.map(s => (s.code ? `${s.code} · ${s.name}` : s.name)).join('  |  ') || '—'),
      ]}),
      new TableRow({ children: [
        cell('Trạng thái', { bold: true, shade: 'F2F2F2' }),
        cell(`${STATUS_LABEL[m.status] || m.status}${card ? ` — Kanban: ${KANBAN_LABEL[card.kanban_status] || card.kanban_status} (${card.progress_percent}%)` : ''} · Hạn: ${fmtDate(m.deadline)}`),
      ]}),
    ],
  }));
  if (m.description) {
    out.push(p('Yêu cầu:', { bold: true, spacingAfter: 40 }));
    out.push(p(m.description, { spacingAfter: 80 }));
  }
  out.push(p('Trình bày STAR (chuẩn đầu ra cuối kỳ):', { bold: true, spacingAfter: 40 }));
  out.push(labelValue('Bối cảnh (Situation)', m.star_situation || ''));
  out.push(labelValue('Nhiệm vụ (Task)', m.star_task || ''));
  out.push(labelValue('Hành động lãnh đạo (Action)', m.star_action || ''));
  out.push(labelValue('Kết quả (Result)', m.star_result || ''));
  out.push(labelValue('Sản phẩm quản trị để lại', m.deliverable || ''));
  if (card && card.logs.length) {
    out.push(p('Dòng thời gian tiến độ:', { bold: true, spacingAfter: 40 }));
    out.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          cell('Thời điểm', { bold: true, shade: 'F2F2F2', widthPct: 18 }),
          cell('Sự kiện', { bold: true, shade: 'F2F2F2', widthPct: 22 }),
          cell('Nội dung', { bold: true, shade: 'F2F2F2' }),
        ]}),
        ...card.logs.map(l => new TableRow({ children: [
          cell(new Date(l.at).toLocaleString('vi-VN')),
          cell(l.label),
          cell(l.note || '—'),
        ]})),
      ],
    }));
  }
  return out;
}

/** Xuất docx hành trình dấu ấn của 1 PGĐ. */
export async function exportLeadershipJourney(profileId: string, profileName: string) {
  const { marks, cards } = await fetchJourneyData(profileId);
  if (!marks.length) throw new Error('Chưa có dấu ấn nào để xuất');

  const cycleName = marks[0].cycleName || '';
  const roleFocus = marks[0].role_focus || '';

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'HÀNH TRÌNH TẠO DẤU ẤN BẮC HƯNG YÊN MARK', bold: true, size: 30 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `${profileName}${cycleName ? ` — Kỳ ${cycleName}` : ''}`, size: 24 })],
    }),
  ];
  if (roleFocus) children.push(labelValue('Trọng tâm vai trò', roleFocus));
  children.push(p(`Tổng số dấu ấn: ${marks.length} · Xuất ngày ${new Date().toLocaleDateString('vi-VN')}`, { italics: true, spacingAfter: 160 }));

  // ── Phần A: theo năng lực lãnh đạo ─────────────────────────────────────
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text: 'A. HÀNH TRÌNH THEO NĂNG LỰC LÃNH ĐẠO', bold: true, size: 26 })],
  }));
  const byCompetency = new Map<string, JourneyMark[]>();
  marks.forEach(m => {
    const key = m.competency || 'Chưa gắn năng lực';
    byCompetency.set(key, [...(byCompetency.get(key) || []), m]);
  });
  byCompetency.forEach((list, comp) => {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 160, after: 40 },
      children: [new TextRun({ text: `Năng lực: ${comp} (${list.length} dấu ấn)`, bold: true, size: 25 })],
    }));
    list.forEach(m => children.push(...markBlock(m, cards.get(m.id))));
  });

  // ── Phần B: theo skill ─────────────────────────────────────────────────
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 80 },
    children: [new TextRun({ text: 'B. HÀNH TRÌNH THEO SKILL (BỘ 38 SKILL)', bold: true, size: 26 })],
  }));
  const bySkill = new Map<string, JourneyMark[]>();
  marks.forEach(m => {
    m.skills.forEach(s => {
      const key = s.code ? `${s.code} · ${s.name}` : s.name;
      bySkill.set(key, [...(bySkill.get(key) || []), m]);
    });
  });
  const skillKeys = Array.from(bySkill.keys()).sort();
  skillKeys.forEach(key => {
    const list = bySkill.get(key)!;
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 160, after: 40 },
      children: [new TextRun({ text: `${key} (${list.length} dấu ấn)`, bold: true, size: 25 })],
    }));
    // Phần B chỉ liệt kê tóm tắt (chi tiết đã có ở phần A) — tránh trùng lặp dài dòng
    list.forEach(m => {
      const card = cards.get(m.id);
      children.push(new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: `• ${m.title}`, bold: true, size: 22 }),
          new TextRun({
            text: `  — ${m.competency || '—'} · ${STATUS_LABEL[m.status] || m.status}${card ? ` · ${KANBAN_LABEL[card.kanban_status] || card.kanban_status} ${card.progress_percent}%` : ''}`,
            size: 22,
          }),
        ],
      }));
      if (m.star_result) children.push(p(`   Kết quả: ${m.star_result}`, { italics: true, spacingAfter: 60 }));
    });
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const safeName = profileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]+/g, '-');
  saveAs(blob, `Hanh-trinh-dau-an-${safeName}.docx`);
}
