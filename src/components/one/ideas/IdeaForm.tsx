import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Lightbulb, Sparkles, UserCheck, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  IDEA_APPLICABILITIES,
  IDEA_LEVELS,
  type IdeaApplicability,
  type IdeaLevel,
} from '@/data/one/ideasConfig';
import { useStaffDirectory, type StaffOption } from './useStaffDirectory';
import type { IdeaInput, PortalIdea } from './usePortalIdeas';

// Form đăng ký ý tưởng — nhãn/placeholder/lựa chọn giữ nguyên DEFAULT_IDEA_FIELDS
// của bản deploy (UniquePrograms.tsx:224-246), trừ hai trường "Cán bộ đề xuất" và
// "Phòng/Ban": cán bộ đã đăng nhập nên hai thông tin này lấy thẳng từ hồ sơ nhân sự
// thay vì gõ tay. Ô chữ tự do trước đây làm công sáng kiến gán sai người khi phòng
// dùng chung một tài khoản để gửi hộ (xem docs/nap-du-lieu-bhy-ideas-2026-08.md).
// Hỗ trợ chế độ sửa: truyền `editing` để đổ sẵn dữ liệu và gọi onUpdate.

interface FieldConfig {
  id: keyof FormValues;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  required: boolean;
  options?: readonly string[];
}

interface FormValues {
  level: string;
  applicability: string;
  title: string;
  currentStatus: string;
  proposedSolution: string;
  expectedBenefits: string;
  hasDemo: string; // 'Có' | 'Không' | '' — quy đổi boolean khi gửi
}

const IDEA_FIELDS: FieldConfig[] = [
  { id: 'level', label: 'Cấp đề xuất', type: 'select', required: true, options: IDEA_LEVELS },
  { id: 'applicability', label: 'Có thể thử/áp dụng ở đâu?', type: 'select', required: true, options: IDEA_APPLICABILITIES },
  { id: 'title', label: 'Tên ý tưởng/vấn đề?', type: 'text', placeholder: 'VD: Cải tiến thao tác in sao kê tự động tại quầy...', required: true },
  { id: 'currentStatus', label: 'Thực trạng hiện tại (Khó khăn, bất cập):', type: 'textarea', placeholder: 'Mô tả chi tiết những điểm chưa tối ưu, tốn thời gian...', required: true },
  { id: 'proposedSolution', label: 'Đề xuất cách làm mới / giải pháp:', type: 'textarea', placeholder: 'Mô tả cụ thể phương án, quy trình mới...', required: true },
  { id: 'expectedBenefits', label: 'Lợi ích dự kiến mang lại:', type: 'textarea', placeholder: 'Giảm bao nhiêu phút, tiết kiệm bao nhiêu chi phí...', required: true },
  { id: 'hasDemo', label: 'Xác nhận có sản phẩm Demo?', type: 'select', required: true, options: ['Không', 'Có'] },
];

const emptyValues = (): FormValues => ({
  level: '',
  applicability: '',
  title: '',
  currentStatus: '',
  proposedSolution: '',
  expectedBenefits: '',
  hasDemo: '',
});

const valuesFromIdea = (idea: PortalIdea): FormValues => ({
  level: idea.level,
  applicability: idea.applicability,
  title: idea.title,
  currentStatus: idea.currentStatus,
  proposedSolution: idea.proposedSolution,
  expectedBenefits: idea.expectedBenefits,
  hasDemo: idea.hasDemo ? 'Có' : 'Không',
});

interface IdeaFormProps {
  onCreate: (input: IdeaInput) => Promise<boolean>;
  onUpdate: (id: string, input: IdeaInput) => Promise<boolean>;
  /** Chế độ sửa: đổ sẵn dữ liệu ý tưởng và gọi onUpdate thay vì onCreate */
  editing?: PortalIdea | null;
  /** Gọi khi cập nhật xong hoặc hủy sửa */
  onDone?: () => void;
  /** Quản trị (TCTH/hệ thống) được nhập hộ cán bộ khác */
  canSubmitForOthers?: boolean;
}

export const IdeaForm: React.FC<IdeaFormProps> = ({
  onCreate,
  onUpdate,
  editing = null,
  onDone,
  canSubmitForOthers = false,
}) => {
  const { staff, me, isLoading: loadingStaff } = useStaffDirectory();
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [proposerId, setProposerId] = useState('');
  const [coAuthorIds, setCoAuthorIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đổ sẵn dữ liệu khi vào/thoát chế độ sửa
  useEffect(() => {
    setValues(editing ? valuesFromIdea(editing) : emptyValues());
    if (!editing) setCoAuthorIds([]);
    setSubmitError('');
  }, [editing]);

  // Mặc định người đề xuất là chính mình, ngay khi danh bạ tải xong
  useEffect(() => {
    if (me && !proposerId) setProposerId(me.userId);
  }, [me, proposerId]);

  const proposer: StaffOption | null = useMemo(
    () => staff.find(s => s.userId === proposerId) ?? me,
    [staff, proposerId, me],
  );
  const coAuthors = useMemo(
    () => coAuthorIds.map(id => staff.find(s => s.userId === id)).filter((s): s is StaffOption => !!s),
    [coAuthorIds, staff],
  );

  /** Ô "Cán bộ / Nhóm đề xuất" gửi lên: người đề xuất trước, đồng tác giả nối sau */
  const proposerText = [proposer?.fullName, ...coAuthors.map(s => s.fullName)]
    .filter(Boolean).join(', ');

  const setField = (id: keyof FormValues, value: string) =>
    setValues(prev => ({ ...prev, [id]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Kiểm tra từng trường bắt buộc theo thứ tự (thông báo như bản gốc)
    for (const field of IDEA_FIELDS) {
      if (field.required && !String(values[field.id] ?? '').trim()) {
        setSubmitError(`Vui lòng nhập đầy đủ thông tin: ${field.label}`);
        return;
      }
    }

    // Người đề xuất & phòng lấy từ hồ sơ nhân sự — chặn gửi khi hồ sơ chưa đủ
    if (!editing && !proposer) {
      setSubmitError('Chưa đọc được hồ sơ cán bộ của bạn. Vui lòng tải lại trang hoặc báo Phòng TCTH.');
      return;
    }
    if (!editing && !proposer?.department) {
      setSubmitError('Hồ sơ của bạn chưa gắn Phòng/Ban. Vui lòng liên hệ Phòng TCTH cập nhật trước khi gửi ý tưởng.');
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      const input: IdeaInput = {
        level: values.level as IdeaLevel,
        applicability: values.applicability as IdeaApplicability,
        title: values.title,
        currentStatus: values.currentStatus,
        proposedSolution: values.proposedSolution,
        expectedBenefits: values.expectedBenefits,
        // Chế độ sửa giữ nguyên người đề xuất & phòng đã lưu (sửa quy về quản trị)
        departmentName: editing ? editing.departmentName : proposer!.department!,
        hasDemo: values.hasDemo === 'Có',
        proposer: editing ? editing.proposer : proposerText,
        createdBy: editing ? undefined : proposer!.userId,
      };

      if (editing) {
        const ok = await onUpdate(editing.id, input);
        if (ok) onDone?.();
      } else {
        const ok = await onCreate(input);
        if (ok) {
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          setValues(emptyValues());
          setCoAuthorIds([]);
          if (me) setProposerId(me.userId);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const identityLabel = editing
    ? { name: editing.proposer, dept: editing.departmentName }
    : { name: proposer?.fullName ?? '', dept: proposer?.department ?? '' };

  return (
    <div className="space-y-4">
      <div className="border-b pb-3 flex justify-between items-center">
        <div>
          <h4 className="font-black text-slate-800 text-base flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span>{editing ? '✏️ Cập Nhật Ý Tưởng Sáng Kiến' : 'Đăng Ký Ý Tưởng Sáng Kiến Mới'}</span>
          </h4>
          <p className="text-2xs text-slate-500 mt-1">
            Các ý tưởng được lưu trữ trên hệ thống và hiển thị trong báo cáo thống kê của chi nhánh.
          </p>
        </div>
        {editing && (
          <button
            type="button"
            onClick={() => onDone?.()}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all cursor-pointer flex items-center gap-1 text-2xs font-bold px-2.5"
            title="Hủy sửa"
          >
            <X className="w-3.5 h-3.5" />
            <span>Hủy sửa</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Người đề xuất & Phòng/Ban lấy từ hồ sơ cán bộ đang đăng nhập, không gõ tay */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
          <div className="flex items-start gap-2">
            <UserCheck className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-700">Cán bộ đề xuất</p>
              {editing || !canSubmitForOthers ? (
                <p className="font-black text-slate-800 truncate">
                  {identityLabel.name || (loadingStaff ? 'Đang đọc hồ sơ…' : '—')}
                </p>
              ) : (
                <select
                  value={proposerId}
                  onChange={e => setProposerId(e.target.value)}
                  className="mt-1 w-full p-2 bg-white border border-amber-300 rounded-lg font-semibold outline-none focus:border-amber-500"
                >
                  {staff.map(s => (
                    <option key={s.userId} value={s.userId}>
                      {s.fullName}{s.department ? ` — ${s.department}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-2xs text-slate-500 mt-0.5">
                Phòng/Ban: <span className="font-bold text-slate-700">{identityLabel.dept || '—'}</span>
                {' · '}Lấy từ hồ sơ nhân sự, không cần khai lại.
              </p>
            </div>
          </div>

          {!editing && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Đồng đề xuất <span className="font-medium text-slate-500">(bỏ trống nếu làm một mình)</span>
              </label>
              <select
                multiple
                value={coAuthorIds}
                onChange={e => setCoAuthorIds(Array.from(e.target.selectedOptions, o => o.value))}
                className="w-full p-2 bg-white border border-amber-300 rounded-lg font-semibold outline-none focus:border-amber-500 h-24"
              >
                {staff.filter(s => s.userId !== proposerId).map(s => (
                  <option key={s.userId} value={s.userId}>
                    {s.fullName}{s.department ? ` — ${s.department}` : ''}
                  </option>
                ))}
              </select>
              {coAuthors.length > 0 && (
                <p className="text-2xs text-slate-600 mt-1">
                  Ghi nhận: <span className="font-bold">{proposerText}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {IDEA_FIELDS.map(field => {
          const val = values[field.id] ?? '';
          return (
            <div key={field.id} className="space-y-1">
              <label className="block font-bold text-slate-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>

              {field.type === 'select' ? (
                <select
                  value={val}
                  onChange={e => setField(field.id, e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-semibold outline-none transition-all"
                >
                  <option value="">-- Chọn một giá trị --</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  placeholder={field.placeholder}
                  value={val}
                  onChange={e => setField(field.id, e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-medium"
                  rows={3}
                />
              ) : (
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={val}
                  onChange={e => setField(field.id, e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-medium"
                />
              )}
            </div>
          );
        })}

        {submitError && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{submitError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-[#ed1b24] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow transition-all flex items-center justify-center gap-2 cursor-pointer ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? (
            <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{editing ? 'CẬP NHẬT Ý TƯỞNG SÁNG KIẾN' : 'GỬI Ý TƯỞNG SÁNG KIẾN LÊN HỆ THỐNG'}</span>
        </button>
      </form>
    </div>
  );
};
