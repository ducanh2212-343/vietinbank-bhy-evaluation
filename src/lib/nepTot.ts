// Nếp Tốt — Sổ tay hành vi BHY: kiểu dữ liệu, nhãn hiển thị và logic thuần
// cho phân hệ ghi nhận & phát triển hành vi cán bộ.

export type BehaviorType = 'tich_cuc' | 'can_cai_thien';
export type BehaviorNoteStatus = 'nhap' | 'da_xac_nhan' | 'luu_tru';
export type ImpactLevel = 'thap' | 'vua' | 'cao';
/** quan_ly: TP và cấp trên của cán bộ nhìn được bản đã xác nhận (mặc định);
 *  rieng_tu: chỉ người ghi thấy — dùng khi chưa muốn cấp trên nắm. */
export type NoteVisibility = 'quan_ly' | 'rieng_tu';

export const BEHAVIOR_TYPE_LABELS: Record<BehaviorType, string> = {
  tich_cuc: 'Hành vi tích cực',
  can_cai_thien: 'Hành vi cần cải thiện',
};

export const NOTE_STATUS_LABELS: Record<BehaviorNoteStatus, string> = {
  nhap: 'Mẩu nhớ nháp',
  da_xac_nhan: 'Đã xác nhận',
  luu_tru: 'Lưu trữ',
};

export const IMPACT_LEVEL_LABELS: Record<ImpactLevel, string> = {
  thap: 'Tác động thấp',
  vua: 'Tác động vừa',
  cao: 'Tác động cao',
};

export const VISIBILITY_LABELS: Record<NoteVisibility, string> = {
  quan_ly: 'Quản lý của cán bộ xem được',
  rieng_tu: 'Riêng tư — chỉ mình tôi',
};

/** Giới hạn gắn nhãn để bản ghi tập trung (khớp prompt AI) */
export const MAX_SKILLS_PER_NOTE = 3;
export const MAX_ATTITUDES_PER_NOTE = 2;

export interface QuickNoteInput {
  employeeId: string | null;
  rawText: string;
  behaviorType: BehaviorType | null;
  occurredAt: string; // ISO
}

/** Validate form ghi nhanh — trả về thông báo lỗi tiếng Việt, null nếu hợp lệ. */
export function validateQuickNote(input: QuickNoteInput): string | null {
  if (!input.employeeId) return 'Chọn cán bộ được ghi nhận.';
  if (!input.rawText || input.rawText.trim().length < 10) {
    return 'Nội dung quá ngắn — ghi ít nhất một câu về việc đã xảy ra.';
  }
  if (!input.behaviorType) return 'Chọn loại: Hành vi tích cực hoặc Hành vi cần cải thiện.';
  const t = Date.parse(input.occurredAt);
  if (Number.isNaN(t)) return 'Thời điểm xảy ra không hợp lệ.';
  if (t > Date.now() + 5 * 60_000) return 'Thời điểm xảy ra không được ở tương lai.';
  return null;
}

/** Cấu trúc AI đề xuất khi hoàn thiện mẩu nhớ (mode behavior_structuring). */
export interface StructuringSuggestion {
  situation: string;
  behavior: string;
  impact: string;
  skill_codes: string[];
  attitude_ids: number[];
  impact_level: ImpactLevel | null;
  is_repeated_hint: string;
  rewrite: string;
}

/**
 * Parse phản hồi AI thành StructuringSuggestion. Chịu được: code fence ```json,
 * text thừa quanh JSON, thiếu trường (điền mặc định), sai kiểu (ép/loại bỏ).
 * Trả null khi không tìm được object JSON nào dùng được.
 */
export function parseStructuringResponse(text: string): StructuringSuggestion | null {
  if (!text) return null;
  let src = text.trim();
  const fence = src.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) src = fence[1].trim();
  // Lấy object JSON ngoài cùng nếu model kèm giải thích thừa
  const start = src.indexOf('{');
  const end = src.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(src.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const skillCodes = Array.isArray(o.skill_codes)
    ? o.skill_codes
        .filter((c): c is string => typeof c === 'string')
        .map((c) => c.trim().toUpperCase())
        .filter((c) => /^SK\d{2}$/.test(c))
        .slice(0, MAX_SKILLS_PER_NOTE)
    : [];
  const attitudeIds = Array.isArray(o.attitude_ids)
    ? o.attitude_ids
        .map((n) => (typeof n === 'string' ? Number(n) : n))
        .filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 6)
        .slice(0, MAX_ATTITUDES_PER_NOTE)
    : [];
  const lvl = str(o.impact_level).toLowerCase();
  const impactLevel: ImpactLevel | null = lvl === 'thap' || lvl === 'vua' || lvl === 'cao' ? (lvl as ImpactLevel) : null;

  const suggestion: StructuringSuggestion = {
    situation: str(o.situation),
    behavior: str(o.behavior),
    impact: str(o.impact),
    skill_codes: skillCodes,
    attitude_ids: attitudeIds,
    impact_level: impactLevel,
    is_repeated_hint: str(o.is_repeated_hint),
    rewrite: str(o.rewrite),
  };
  // Không có nội dung nào dùng được → coi như parse thất bại
  if (!suggestion.behavior && !suggestion.rewrite && !suggestion.situation) return null;
  return suggestion;
}

/** Nháp Ghi nhanh lưu localStorage — sống sót khi lỡ đóng sheet/mất mạng. */
export const QUICK_NOTE_DRAFT_KEY = '343skill:nep-tot-quick-note-draft';

export interface QuickNoteDraft {
  employeeId: string | null;
  rawText: string;
  behaviorType: BehaviorType | null;
  occurredAt: string;
  /** true = 'rieng_tu' (nháp cũ không có trường này → mặc định false) */
  isPrivate?: boolean;
  savedAt: string;
}

export function saveQuickNoteDraft(draft: Omit<QuickNoteDraft, 'savedAt'>): void {
  try {
    // Không lưu nháp rỗng — tránh khôi phục màn hình trống
    if (!draft.rawText.trim() && !draft.employeeId) {
      localStorage.removeItem(QUICK_NOTE_DRAFT_KEY);
      return;
    }
    localStorage.setItem(
      QUICK_NOTE_DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() } satisfies QuickNoteDraft),
    );
  } catch {
    /* storage đầy/bị chặn — bỏ qua, không chặn thao tác ghi */
  }
}

export function loadQuickNoteDraft(): QuickNoteDraft | null {
  try {
    const raw = localStorage.getItem(QUICK_NOTE_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as QuickNoteDraft;
    if (typeof d?.rawText !== 'string') return null;
    return d;
  } catch {
    return null;
  }
}

export function clearQuickNoteDraft(): void {
  try {
    localStorage.removeItem(QUICK_NOTE_DRAFT_KEY);
  } catch {
    /* noop */
  }
}

/** datetime-local (giờ địa phương) ↔ ISO — input mobile dùng datetime-local. */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
