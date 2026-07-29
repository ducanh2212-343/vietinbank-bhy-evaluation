import React, { useState } from 'react';
import { BookOpen, ShieldCheck, Layers, Sparkles, CheckCircle2, AlertTriangle, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { MOVE3_SKILL_GROUPS, MOVE3_ATTITUDES, MOVE3_LEVELS, MOVE3_BM01_QUESTIONS } from '@/data/one/move3Data';

export const Move3FrameworkViewer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'skills' | 'attitudes' | 'bm01'>('skills');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('group1');
  const [expandedSkillId, setExpandedSkillId] = useState<number | null>(1);

  const currentSkillGroup = MOVE3_SKILL_GROUPS.find(g => g.groupId === selectedGroupId) || MOVE3_SKILL_GROUPS[0];

  return (
    <div className="mt-12 pt-8 border-t-2 border-purple-200 bg-gradient-to-b from-purple-50/40 to-white rounded-3xl p-6 sm:p-8 text-left animate-fade-in">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-300 inline-block mb-2">
            📚 Hệ Sinh Thái Chiêu Thức #3 Chuẩn Hóa
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-brand-navy tracking-tight">
            KHUNG PHÁT TRIỂN CÁN BỘ: 38 SKILL & 6 THÁI ĐỘ
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            Ngôn ngữ phát triển cán bộ thống nhất toàn Chi nhánh VietinBank Bắc Hưng Yên (Bản 3.3) kỷ niệm mốc 38 năm VietinBank. Neo chặt vào thực tiễn BM01 và lộ trình IDP 70-20-10.
          </p>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex flex-wrap gap-2 shrink-0 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('skills')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeSubTab === 'skills' ? 'bg-brand-navy text-white shadow' : 'text-slate-700 hover:bg-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-300" />
            <span>38 Kỹ Năng</span>
          </button>
          <button
            onClick={() => setActiveSubTab('attitudes')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeSubTab === 'attitudes' ? 'bg-purple-700 text-white shadow' : 'text-slate-700 hover:bg-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>6 Thái Độ</span>
          </button>
          <button
            onClick={() => setActiveSubTab('bm01')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeSubTab === 'bm01' ? 'bg-emerald-700 text-white shadow' : 'text-slate-700 hover:bg-white'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-300" />
            <span>BM01 & IDP</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: 38 SKILLS BREAKDOWN */}
      {activeSubTab === 'skills' && (
        <div className="space-y-8 animate-fade-in">

          {/* 4 Levels Quick Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MOVE3_LEVELS.map((lv, idx) => (
              <div key={idx} className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${lv.color}`}>
                <strong className="block font-black text-sm mb-1">{lv.level}</strong>
                <span>{lv.desc}</span>
              </div>
            ))}
          </div>

          {/* Group Selector Pills */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            {MOVE3_SKILL_GROUPS.map((grp) => {
              const isSelected = grp.groupId === selectedGroupId;
              return (
                <button
                  key={grp.groupId}
                  onClick={() => {
                    setSelectedGroupId(grp.groupId);
                    setExpandedSkillId(grp.skills[0]?.id || null);
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold cursor-pointer transition-all border text-left flex items-center gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-brand-navy to-blue-700 text-white border-blue-800 shadow-md ring-2 ring-blue-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  <Award className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`} />
                  <div>
                    <span className="block font-black">{grp.title.split('(')[0]}</span>
                    <span className={`text-[10px] block ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {grp.badge} ({grp.skills.length} skill)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Skills Accordion List */}
          <div className="grid grid-cols-1 gap-3">
            {currentSkillGroup.skills.map((s) => {
              const isExpanded = expandedSkillId === s.id;
              return (
                <div
                  key={s.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded ? 'bg-white border-brand-navy shadow-md ring-1 ring-brand-navy/30' : 'bg-slate-50/80 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div
                    onClick={() => setExpandedSkillId(isExpanded ? null : s.id)}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-brand-navy font-mono font-black text-xs shrink-0">
                        #{s.id < 10 ? `0${s.id}` : s.id}
                      </span>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-slate-800 leading-snug">{s.name}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-brand-navy" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-3 bg-blue-50/20 text-xs">
                      <p className="text-slate-700 leading-relaxed">
                        <strong className="text-slate-900 font-bold">Mô tả năng lực: </strong>
                        {s.desc}
                      </p>

                      <div className="p-3 bg-white rounded-xl border border-blue-200 text-slate-800 leading-relaxed">
                        <span className="text-brand-navy font-extrabold uppercase block mb-1">🎯 Điểm chuẩn mốc level & yêu cầu thực thi:</span>
                        {s.keyPoints}
                      </div>

                      {s.aiApplication && (
                        <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 text-purple-950 flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-purple-900 font-black block">Hành động AI làm việc số (Skill #07):</strong>
                            <span>{s.aiApplication}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 6 ATTITUDE GROUPS */}
      {activeSubTab === 'attitudes' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-r from-purple-800 to-indigo-900 p-6 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xl font-black uppercase">Khung 6 Nhóm Thái Độ Chuẩn Hành Vi</h4>
              <p className="text-xs text-purple-100 mt-1">
                Không dùng để chấm level chuyên môn, mà là chuẩn hành vi định hướng làm việc, phối hợp. Đánh giá theo 3 mức: <strong className="text-amber-300">Nổi bật — Đạt mong đợi — Cần cải thiện</strong>.
              </p>
            </div>
            <div className="bg-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/20 text-xs font-mono font-bold shrink-0">
              ⚡ Nguyên tắc: Nhận xét bằng hành vi thật
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MOVE3_ATTITUDES.map((att) => (
              <div key={att.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-purple-300 transition-all">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600" />

                <div className="space-y-3">
                  <span className="text-sm font-black text-purple-900 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200 inline-block">
                    {att.name}
                  </span>

                  <div className="p-3 bg-red-50/70 rounded-2xl border border-red-200 text-xs text-red-950 space-y-1">
                    <div className="flex items-center gap-1.5 text-brand-red font-black uppercase text-[10px]">
                      <AlertTriangle className="w-3.5 h-3.5" /> Biểu hiện chưa đạt (Cần chấn chỉnh):
                    </div>
                    <p className="leading-relaxed">{att.badBehavior}</p>
                  </div>

                  <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-black uppercase text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Biểu hiện mong đợi (Thực thi):
                    </div>
                    <p className="leading-relaxed">{att.expectedBehavior}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                  <div>
                    <strong className="text-slate-800">🛠️ Cách cải thiện cá nhân & Quản lý: </strong>
                    <span className="text-slate-600">{att.improvement}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700 font-mono text-[11px]">
                    <strong>📈 Bằng chứng tiến bộ: </strong>{att.evidence}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BM01 & UPSKILL 70-20-10 */}
      {activeSubTab === 'bm01' && (
        <div className="space-y-8 animate-fade-in">

          {/* Upskill 70-20-10 Card */}
          <div className="bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
            <span className="text-amber-300 font-mono text-xs uppercase font-black tracking-wider block mb-2">
              🧭 Lộ Trình Phát Triển Năng Lực Chuẩn (IDP)
            </span>
            <h4 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-4">
              MÔ HÌNH UPSKILL 70 — 20 — 10
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-900">
              <div className="bg-white p-5 rounded-2xl shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-emerald-700">70%</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Thực chiến</span>
                </div>
                <strong className="block text-xs uppercase font-black text-slate-800">Học qua công việc thật</strong>
                <p className="text-[11px] text-slate-600">Thẩm định tờ trình, tiếp KH, làm báo cáo, xử lý vướng mắc đầu việc thật trên Miro/Kanban.</p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-blue-700">20%</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Shadowing</span>
                </div>
                <strong className="block text-xs uppercase font-black text-slate-800">Học qua người khác</strong>
                <p className="text-[11px] text-slate-600">Kèm cặp (coaching), shadow lãnh đạo/CB giỏi, review phản biện chéo hồ sơ trong họp phòng.</p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-purple-700">10%</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">Đào tạo số</span>
                </div>
                <strong className="block text-xs uppercase font-black text-slate-800">Học qua tài liệu / Quiz</strong>
                <p className="text-[11px] text-slate-600">Đọc văn bản, case study, microlearning, quiz chấm điểm qua Slido, NotebookLM, MyGenie.</p>
              </div>
            </div>
          </div>

          {/* BM01 Coaching 1-1 Questions Log */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-black uppercase text-emerald-700 block">📝 Phụ lục Mẫu Biểu BM01 Khai Vấn</span>
                <h4 className="text-xl font-black text-slate-800">8 Câu Hỏi Khai Vấn & Chốt IDP (Trao đổi 1:1 Quý)</h4>
              </div>
              <span className="text-xs font-mono bg-slate-100 px-3 py-1 rounded-xl font-bold text-slate-600">
                Chỉ chọn 2-3 skill trọng tâm
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOVE3_BM01_QUESTIONS.map((q) => (
                <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 hover:bg-white hover:border-emerald-300 transition-all">
                  <h5 className="text-xs sm:text-sm font-black text-brand-navy leading-snug">{q.question}</h5>
                  <div className="text-xs text-slate-700 space-y-1 pt-1 border-t border-slate-200/60">
                    <p><strong className="text-slate-900">👤 Trách nhiệm cán bộ: </strong>{q.targetRole}</p>
                    <p><strong className="text-emerald-800">🧭 Hướng dẫn quản lý: </strong>{q.guidance}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-center justify-between flex-wrap gap-4">
              <div>
                <strong className="block font-black uppercase text-amber-800 mb-0.5">⭐ Kết luận BM01 Mẫu Chốt Nhận Xét:</strong>
                <span>Nói gọn lại: Cán bộ trả lời bằng công việc và trải nghiệm thật. Quản lý quy chiếu bằng 38 skill và 6 thái độ để phát triển đúng người, đúng hướng.</span>
              </div>
              <button
                onClick={() => alert("Đã mô phỏng gửi BM01 về phòng Tổ chức tổng hợp lưu trữ kẹp file!")}
                className="px-4 py-2 bg-brand-navy text-white font-bold rounded-xl hover:bg-blue-800 cursor-pointer shadow shrink-0"
              >
                Gửi BM01 & Chốt IDP Quý
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
