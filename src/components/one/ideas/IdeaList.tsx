import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Lightbulb, MessageSquare, Send, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import {
  IDEA_DEPARTMENTS,
  IDEA_DEV_LEVELS,
  IDEA_DEV_LEVEL_EMOJI,
  type IdeaDevLevel,
} from '@/data/one/ideasConfig';
import { useIdeaComments, type PortalIdea } from './usePortalIdeas';

// Bảng theo dõi ý tưởng — accordion nhóm theo phòng/ban (thứ tự IDEA_DEPARTMENTS,
// phòng lạ gom cuối vào "Bộ phận khác"), thẻ ý tưởng 5 lớp như bản deploy:
// badges → chip cấp độ phát triển → tiêu đề (bấm mở chi tiết) → panel chi tiết →
// footer (người đề xuất, ngày, thích/không thích, bình luận). Bình luận tải lười.

interface AdminPatch {
  developmentLevel?: IdeaDevLevel;
  departmentName?: string;
  councilProposal?: boolean;
}

interface IdeaListProps {
  /** Danh sách đã lọc theo cấp đề xuất (Tất cả / Nội bộ CN / Đề xuất TSC) và ô tìm kiếm */
  ideas: PortalIdea[];
  /** Đang áp bộ lọc/tìm kiếm — đổi thông báo khi rỗng để khỏi hiểu nhầm là chưa có dữ liệu */
  isFiltered?: boolean;
  isLoading: boolean;
  isContentAdmin: boolean;
  /** Tên hiển thị khi gửi bình luận (profile.full_name) */
  myName: string;
  onEdit: (idea: PortalIdea) => void;
  onDelete: (id: string) => void;
  onVote: (ideaId: string, next: 1 | -1 | null) => void;
  onAdminUpdate: (ideaId: string, patch: AdminPatch) => void;
}

const DEV_LEVEL_CHIP: Record<IdeaDevLevel, string> = {
  'Ươm mầm': 'bg-amber-50 text-amber-700 border-amber-200',
  'Bén rễ': 'bg-teal-50 text-teal-700 border-teal-200',
  'Vươn cành': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Lan tỏa': 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
};

/** Các khối chi tiết chính (nhãn đúng DEFAULT_IDEA_FIELDS bản gốc) */
const DETAIL_BLOCKS: { key: 'currentStatus' | 'proposedSolution' | 'expectedBenefits'; label: string; icon: string; cls: string }[] = [
  { key: 'currentStatus', label: 'Thực trạng hiện tại (Khó khăn, bất cập):', icon: '⚠️', cls: 'bg-red-50/40 border border-red-100/50' },
  { key: 'proposedSolution', label: 'Đề xuất cách làm mới / giải pháp:', icon: '💡', cls: 'bg-amber-50/40 border border-amber-100/50' },
  { key: 'expectedBenefits', label: 'Lợi ích dự kiến mang lại:', icon: '📈', cls: 'bg-emerald-50/30 border border-emerald-100/50' },
];

const formatCommentDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

/* ----------------------------- Bình luận ----------------------------- */

const IdeaCommentsBlock: React.FC<{ ideaId: string; myName: string }> = ({ ideaId, myName }) => {
  const { comments, isLoading, isContentAdmin, addComment, deleteComment } = useIdeaComments(ideaId, true);
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await addComment(input, myName || 'Ẩn danh');
    setInput('');
  };

  return (
    <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 space-y-3">
      {isLoading ? (
        <p className="text-[10px] text-slate-400 italic text-center py-2">Đang tải bình luận...</p>
      ) : comments.length === 0 ? (
        <p className="text-[10px] text-slate-400 italic text-center py-2">
          Chưa có bình luận nào. Hãy chia sẻ cảm nghĩ của bạn!
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {comments.map(comment => (
            <div key={comment.id} className="bg-white p-2 rounded-lg border border-slate-200 relative group">
              <div className="flex justify-between items-start mb-1 text-[10px]">
                <span className="font-extrabold text-slate-700">{comment.userName}</span>
                <span className="text-slate-400 text-[9px]">{formatCommentDate(comment.createdAt)}</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-line font-medium pr-6 text-left">
                {comment.body}
              </p>
              {(comment.isMine || isContentAdmin) && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) void deleteComment(comment.id);
                  }}
                  className="absolute right-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 cursor-pointer"
                  title="Xóa bình luận"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-center text-xs">
        <input
          type="text"
          placeholder="Nhập bình luận của bạn..."
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-[11px] font-medium text-slate-700 placeholder-slate-400 focus:border-amber-400 text-left"
          required
        />
        <button
          type="submit"
          className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all shadow-sm cursor-pointer"
          title="Gửi bình luận"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

/* ----------------------------- Thẻ ý tưởng ----------------------------- */

interface IdeaCardProps {
  idea: PortalIdea;
  isContentAdmin: boolean;
  myName: string;
  onEdit: (idea: PortalIdea) => void;
  onDelete: (id: string) => void;
  onVote: (ideaId: string, next: 1 | -1 | null) => void;
  onAdminUpdate: (ideaId: string, patch: AdminPatch) => void;
}

const IdeaCard: React.FC<IdeaCardProps> = ({ idea, isContentAdmin, myName, onEdit, onDelete, onVote, onAdminUpdate }) => {
  const [detailOpen, setDetailOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const canManage = isContentAdmin || idea.isMine;

  const customEntries = Object.entries(idea.customValues ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && String(v).trim() !== '',
  );

  return (
    <div className="group relative bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div className="space-y-3">
        {/* Lớp 1: hàng badge */}
        <div className="flex flex-wrap gap-1.5 items-center justify-between">
          <div className="flex flex-wrap gap-1">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${idea.level === 'Nội bộ CN' ? 'bg-[#005a9c]/10 text-[#005a9c]' : 'bg-[#ed1b24]/10 text-[#ed1b24]'}`}>
              {idea.level}
            </span>
            <span className="px-2 py-0.5 text-slate-500 font-bold text-[9px] bg-slate-100 rounded-md">
              {idea.applicability}
            </span>
            {idea.councilProposal && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 border border-violet-200">
                🏛️ Đề xuất Hội đồng
              </span>
            )}
          </div>
          {idea.hasDemo && (
            <span className="px-2 py-0.5 font-black text-[9px] border rounded-md bg-emerald-50 text-emerald-700 border-emerald-200">
              🧪 Có Demo
            </span>
          )}
        </div>

        {/* Lớp 2: chip cấp độ phát triển (+ điều khiển admin) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 py-1 bg-slate-50/50 px-2 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold">Cấp độ phát triển:</span>
            {isContentAdmin ? (
              <select
                value={idea.developmentLevel}
                onChange={e => onAdminUpdate(idea.id, { developmentLevel: e.target.value as IdeaDevLevel })}
                className="text-[10px] font-extrabold border border-slate-200 rounded bg-white p-0.5 px-1 outline-none text-slate-700 focus:border-amber-500 cursor-pointer"
              >
                {IDEA_DEV_LEVELS.map(lv => (
                  <option key={lv} value={lv}>{lv} {IDEA_DEV_LEVEL_EMOJI[lv]}</option>
                ))}
              </select>
            ) : (
              <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-md ${DEV_LEVEL_CHIP[idea.developmentLevel]}`}>
                {idea.developmentLevel} {IDEA_DEV_LEVEL_EMOJI[idea.developmentLevel]}
              </span>
            )}
          </div>

          {isContentAdmin && (
            <div className="flex items-center gap-1.5 py-1 bg-amber-50/30 px-2 rounded-lg border border-amber-100/50">
              <span className="text-[10px] text-amber-800 font-bold">🏢 Chuyển phòng ban:</span>
              <select
                value={idea.departmentName}
                onChange={e => onAdminUpdate(idea.id, { departmentName: e.target.value })}
                className="text-[10px] font-extrabold border border-amber-200 rounded bg-white p-0.5 px-1 outline-none text-slate-700 focus:border-amber-500 cursor-pointer max-w-[150px] truncate"
              >
                {IDEA_DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
                {!(IDEA_DEPARTMENTS as readonly string[]).includes(idea.departmentName) && (
                  <option value={idea.departmentName}>{idea.departmentName}</option>
                )}
              </select>
            </div>
          )}

          {isContentAdmin && (
            <div className="flex items-center gap-1.5 py-1 bg-violet-50/40 px-2 rounded-lg border border-violet-100">
              <span className="text-[10px] text-violet-800 font-bold">🏛️ Đề xuất Hội đồng:</span>
              <select
                value={idea.councilProposal ? 'yes' : 'no'}
                onChange={e => onAdminUpdate(idea.id, { councilProposal: e.target.value === 'yes' })}
                className="text-[10px] font-extrabold border border-violet-200 rounded bg-white p-0.5 px-1 outline-none text-slate-700 focus:border-violet-500 cursor-pointer"
              >
                <option value="no">Chưa đề xuất ⏳</option>
                <option value="yes">Đề xuất Hội đồng 🏛️</option>
              </select>
            </div>
          )}
        </div>

        {/* Lớp 3: tiêu đề — bấm để mở/đóng chi tiết */}
        <button
          type="button"
          onClick={() => setDetailOpen(o => !o)}
          className="w-full flex items-start justify-between gap-3 text-left group/title cursor-pointer mt-1 p-2 rounded-lg hover:bg-amber-50/50 transition-all border border-transparent hover:border-amber-200/50"
        >
          <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-snug group-hover/title:text-amber-600 transition-colors flex-1">
            {idea.title}
          </h5>
          <span className="p-1 text-slate-400 group-hover/title:text-amber-500 rounded-md transition-all flex-shrink-0 bg-slate-100 group-hover/title:bg-amber-100/50">
            {detailOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {/* Lớp 4: panel chi tiết */}
        {detailOpen && (
          <div className="space-y-2 text-[11px] border-t pt-2 border-slate-100">
            {DETAIL_BLOCKS.map(block => {
              const val = idea[block.key];
              if (!val || !String(val).trim()) return null;
              return (
                <div key={block.key} className="space-y-0.5">
                  <span className="font-bold text-slate-500 flex items-center gap-1">
                    <span>{block.icon}</span>
                    <span>{block.label}</span>
                  </span>
                  <p className={`${block.cls} text-slate-700 p-2 rounded-lg leading-relaxed text-[11px] whitespace-pre-line font-medium`}>
                    {String(val)}
                  </p>
                </div>
              );
            })}
            {customEntries.map(([key, value]) => (
              <div key={key} className="flex gap-1 bg-slate-50 p-2 rounded-lg text-slate-700">
                <span className="font-bold text-slate-500">{key}:</span>
                <span className="font-medium whitespace-pre-line">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lớp 5: footer — người đề xuất, ngày, sửa/xóa */}
      <div className="mt-4 pt-2.5 border-t border-slate-100 flex justify-between items-end text-[11px]">
        <div>
          <span className="text-slate-400 text-[10px]">Đề xuất bởi:</span>
          <span className="font-extrabold text-slate-700 block">{idea.proposer}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[10px]">
            {idea.createdAt ? new Date(idea.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
          </span>
          {canManage && (
            <button
              type="button"
              onClick={() => onEdit(idea)}
              className="p-1.5 rounded text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-all cursor-pointer"
              title="Sửa nội dung ý tưởng"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn xóa ý tưởng này?')) onDelete(idea.id);
              }}
              className="p-1.5 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer"
              title="Xóa ý tưởng"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Thích / Không thích / Bình luận */}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onVote(idea.id, idea.myVote === 1 ? null : 1)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                idea.myVote === 1
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'hover:bg-slate-50 hover:text-slate-800 border-slate-100'
              }`}
              title="Thích ý tưởng này"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${idea.myVote === 1 ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{idea.likes}</span>
            </button>

            <button
              type="button"
              onClick={() => onVote(idea.id, idea.myVote === -1 ? null : -1)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                idea.myVote === -1
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'hover:bg-slate-50 hover:text-slate-800 border-slate-100'
              }`}
              title="Không thích ý tưởng này"
            >
              <ThumbsDown className={`w-3.5 h-3.5 ${idea.myVote === -1 ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{idea.unlikes}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCommentsOpen(o => !o)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              commentsOpen
                ? 'bg-blue-50 text-blue-600 border-blue-200 font-bold'
                : 'hover:bg-slate-50 hover:text-slate-800 border-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{idea.commentCount} bình luận</span>
          </button>
        </div>

        {commentsOpen && <IdeaCommentsBlock ideaId={idea.id} myName={myName} />}
      </div>
    </div>
  );
};

/* ----------------------------- Danh sách theo phòng ----------------------------- */

const OTHER_DEPT_KEY = 'Bộ phận khác';

export const IdeaList: React.FC<IdeaListProps> = ({ ideas, isFiltered = false, isLoading, isContentAdmin, myName, onEdit, onDelete, onVote, onAdminUpdate }) => {
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
        <span className="text-xs text-slate-400 mt-2 block font-medium">Đang đồng bộ dữ liệu ý tưởng...</span>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed">
        <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-2" />
        {isFiltered ? (
          <>
            <p className="text-slate-500 text-sm font-semibold">Không có ý tưởng nào khớp bộ lọc/từ khóa.</p>
            <p className="text-slate-400 text-xs mt-1">Chưa ai đề xuất nội dung này — bạn có thể gửi ý tưởng mới.</p>
          </>
        ) : (
          <>
            <p className="text-slate-500 text-sm font-semibold">Chưa có ý tưởng nào được gửi lên hệ thống.</p>
            <p className="text-slate-400 text-xs mt-1">Hãy là người đầu tiên đóng góp ý tưởng cải tiến!</p>
          </>
        )}
      </div>
    );
  }

  // Nhóm theo phòng/ban đúng thứ tự chuẩn; phòng lạ gom cuối
  const known = new Set<string>(IDEA_DEPARTMENTS);
  const sections: { name: string; ideas: PortalIdea[] }[] = IDEA_DEPARTMENTS
    .map(dept => ({ name: dept as string, ideas: ideas.filter(i => i.departmentName === dept) }))
    .filter(s => s.ideas.length > 0);
  const otherIdeas = ideas.filter(i => !known.has(i.departmentName));
  if (otherIdeas.length > 0) sections.push({ name: OTHER_DEPT_KEY, ideas: otherIdeas });

  return (
    <div className="space-y-4">
      {sections.map(section => {
        const isExpanded = expandedDepts[section.name] ?? true;
        return (
          <div key={section.name} className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/50 shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedDepts(prev => ({ ...prev, [section.name]: !isExpanded }))}
              className="w-full flex items-center justify-between p-3 bg-slate-100/90 hover:bg-slate-200/70 transition-colors border-b border-slate-200 text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${section.name === OTHER_DEPT_KEY ? 'bg-slate-400' : 'bg-amber-500 animate-pulse'}`} />
                <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{section.name}</span>
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-slate-200 text-slate-600">
                  {section.ideas.length} ý tưởng
                </span>
              </div>
              <div className="text-slate-500 font-bold text-xs select-none">
                {isExpanded ? '▲ Thu gọn' : '▼ Mở rộng'}
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {section.ideas.map(idea => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      isContentAdmin={isContentAdmin}
                      myName={myName}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onVote={onVote}
                      onAdminUpdate={onAdminUpdate}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
