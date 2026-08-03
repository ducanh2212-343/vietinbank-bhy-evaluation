import React, { useEffect, useState } from 'react';
import { AlertTriangle, Lightbulb, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  IDEA_APPLICABILITIES,
  IDEA_DEPARTMENTS,
  IDEA_LEVELS,
  type IdeaApplicability,
  type IdeaLevel,
} from '@/data/one/ideasConfig';
import type { IdeaInput, PortalIdea } from './usePortalIdeas';

// Form 9 trường đăng ký ý tưởng — nhãn/placeholder/lựa chọn giữ nguyên
// DEFAULT_IDEA_FIELDS của bản deploy (UniquePrograms.tsx:224-246).
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
  departmentName: string;
  hasDemo: string; // 'Có' | 'Không' | '' — quy đổi boolean khi gửi
  proposer: string;
}

const IDEA_FIELDS: FieldConfig[] = [
  { id: 'level', label: 'Cấp đề xuất', type: 'select', required: true, options: IDEA_LEVELS },
  { id: 'applicability', label: 'Có thể thử/áp dụng ở đâu?', type: 'select', required: true, options: IDEA_APPLICABILITIES },
  { id: 'title', label: 'Tên ý tưởng/vấn đề?', type: 'text', placeholder: 'VD: Cải tiến thao tác in sao kê tự động tại quầy...', required: true },
  { id: 'currentStatus', label: 'Thực trạng hiện tại (Khó khăn, bất cập):', type: 'textarea', placeholder: 'Mô tả chi tiết những điểm chưa tối ưu, tốn thời gian...', required: true },
  { id: 'proposedSolution', label: 'Đề xuất cách làm mới / giải pháp:', type: 'textarea', placeholder: 'Mô tả cụ thể phương án, quy trình mới...', required: true },
  { id: 'expectedBenefits', label: 'Lợi ích dự kiến mang lại:', type: 'textarea', placeholder: 'Giảm bao nhiêu phút, tiết kiệm bao nhiêu chi phí...', required: true },
  { id: 'departmentName', label: 'Khai báo thông tin Phòng/Ban:', type: 'select', required: true, options: IDEA_DEPARTMENTS },
  { id: 'hasDemo', label: 'Xác nhận có sản phẩm Demo?', type: 'select', required: true, options: ['Không', 'Có'] },
  { id: 'proposer', label: 'Cán bộ / Nhóm đề xuất:', type: 'text', placeholder: 'Nhập tên cán bộ hoặc tên nhóm phòng ban đề xuất...', required: true },
];

const emptyValues = (proposer: string): FormValues => ({
  level: '',
  applicability: '',
  title: '',
  currentStatus: '',
  proposedSolution: '',
  expectedBenefits: '',
  departmentName: '',
  hasDemo: '',
  proposer,
});

const valuesFromIdea = (idea: PortalIdea): FormValues => ({
  level: idea.level,
  applicability: idea.applicability,
  title: idea.title,
  currentStatus: idea.currentStatus,
  proposedSolution: idea.proposedSolution,
  expectedBenefits: idea.expectedBenefits,
  departmentName: idea.departmentName,
  hasDemo: idea.hasDemo ? 'Có' : 'Không',
  proposer: idea.proposer,
});

interface IdeaFormProps {
  /** Tên mặc định của người gửi (profile.full_name) — đổ sẵn vào trường "Cán bộ / Nhóm đề xuất" */
  defaultProposer?: string;
  onCreate: (input: IdeaInput) => Promise<boolean>;
  onUpdate: (id: string, input: IdeaInput) => Promise<boolean>;
  /** Chế độ sửa: đổ sẵn dữ liệu ý tưởng và gọi onUpdate thay vì onCreate */
  editing?: PortalIdea | null;
  /** Gọi khi cập nhật xong hoặc hủy sửa */
  onDone?: () => void;
}

export const IdeaForm: React.FC<IdeaFormProps> = ({ defaultProposer = '', onCreate, onUpdate, editing = null, onDone }) => {
  const [values, setValues] = useState<FormValues>(() => emptyValues(defaultProposer));
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đổ sẵn dữ liệu khi vào/thoát chế độ sửa
  useEffect(() => {
    if (editing) setValues(valuesFromIdea(editing));
    else setValues(emptyValues(defaultProposer));
    setSubmitError('');
  }, [editing, defaultProposer]);

  // Đổ tên người gửi khi profile tải xong (không ghi đè nếu đã gõ tay)
  useEffect(() => {
    if (!editing && defaultProposer) {
      setValues(prev => (prev.proposer ? prev : { ...prev, proposer: defaultProposer }));
    }
  }, [defaultProposer, editing]);

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
        departmentName: values.departmentName,
        hasDemo: values.hasDemo === 'Có',
        proposer: values.proposer,
      };

      if (editing) {
        const ok = await onUpdate(editing.id, input);
        if (ok) onDone?.();
      } else {
        const ok = await onCreate(input);
        if (ok) {
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          setValues(emptyValues(defaultProposer));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-b pb-3 flex justify-between items-center">
        <div>
          <h4 className="font-black text-slate-800 text-base flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span>{editing ? '✏️ Cập Nhật Ý Tưởng Sáng Kiến' : 'Đăng Ký Ý Tưởng Sáng Kiến Mới'}</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Các ý tưởng được lưu trữ trên hệ thống và hiển thị trong báo cáo thống kê của chi nhánh.
          </p>
        </div>
        {editing && (
          <button
            type="button"
            onClick={() => onDone?.()}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold px-2.5"
            title="Hủy sửa"
          >
            <X className="w-3.5 h-3.5" />
            <span>Hủy sửa</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
