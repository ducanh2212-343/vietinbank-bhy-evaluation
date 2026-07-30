import React, { useState, useMemo } from 'react';
import { Filter, Search, Upload, ThumbsUp, Calendar, User, Building, Tag, Sparkles, FolderOpen, ArrowUpRight, Check, Eye, Trash2, FileDown, Share2, Image as ImageIcon } from 'lucide-react';
import { UploadedItem, ProgramCategory, CATEGORY_NAMES, Department, DEPARTMENTS, UPLOAD_CUSTOM_FIELDS } from '@/data/one/types';
import confetti from 'canvas-confetti';
import { useAdminEditable } from './AdminEditableContext';

interface DataRepositoryProps {
  items: UploadedItem[];
  onOpenUpload: (defaultCat: string) => void;
  onLikeItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  /* Nút xuất báo cáo PDF (bản gốc nằm ở Navbar đã bỏ) */
  onOpenReport?: () => void;
  /* Admin: bật/tắt chia sẻ tư liệu cho khách đối tác */
  onToggleShare?: (id: string, nextShared: boolean) => void;
}

export const DataRepository: React.FC<DataRepositoryProps> = ({
  items,
  onOpenUpload,
  onLikeItem,
  onDeleteItem,
  searchQuery,
  setSearchQuery,
  onOpenReport,
  onToggleShare
}) => {
  // Quyền admin lấy từ context dùng chung thay vì prop
  const { isAdmin } = useAdminEditable();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [activeModalItem, setActiveModalItem] = useState<UploadedItem | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Mở modal chi tiết luôn bắt đầu từ ảnh đầu tiên
  const openDetailModal = (item: UploadedItem) => {
    setActiveImageIdx(0);
    setActiveModalItem(item);
  };

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => it.tags.forEach(t => set.add(t)));
    return Array.from(set);
  }, [items]);

  // Smart Filtering Logic
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      // Department filter
      if (selectedDepartment !== 'all' && item.department !== selectedDepartment) return false;
      // Tag filter
      if (selectedTag !== 'all' && !item.tags.includes(selectedTag)) return false;
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSummary = item.summary.toLowerCase().includes(q);
        const matchAuthor = item.author.toLowerCase().includes(q);
        const matchTags = item.tags.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchSummary && !matchAuthor && !matchTags) return false;
      }
      return true;
    });
  }, [items, selectedCategory, selectedDepartment, selectedTag, searchQuery]);

  return (
    <section id="community" className="py-16 bg-[#F8FAFC] border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 text-brand-royal font-bold text-xs uppercase tracking-wider mb-2">
              <FolderOpen className="w-3.5 h-3.5 text-brand-sky" />
              <span>Hệ Thống Thư Viện Tri Thức & Sáng&nbsp;Kiến</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-royal tracking-tight uppercase">
              Kho Dữ Liệu Chương&nbsp;Trình
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Phân loại dữ liệu logic bằng bộ lọc thông minh theo từng chuyên mục, đơn vị và thẻ từ khóa chuyên môn.
            </p>
          </div>

          {/* Trang đã nằm sau đăng nhập — mọi cán bộ đều được đóng góp tư liệu */}
          <div className="flex flex-wrap gap-2 self-start md:self-auto">
            {onOpenReport && (
              <button
                onClick={onOpenReport}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border-2 border-brand-navy text-brand-navy hover:bg-blue-50 font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Xuất báo cáo PDF</span>
              </button>
            )}
            <button
              onClick={() => onOpenUpload('sharing')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-red hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>+ Đóng góp bài viết / Ảnh minh họa</span>
            </button>
          </div>
        </div>

        {/* SMART FILTER BAR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-10 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <div className="flex items-center gap-2 text-brand-royal">
              <Filter className="w-4 h-4 text-brand-red" />
              <span>Bộ Lọc Thông Minh (Smart Filter)</span>
            </div>
            <span className="text-slate-400 font-normal">
              Hiển thị <strong className="text-brand-royal">{filteredItems.length}</strong> / {items.length} tư liệu
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">

            {/* Search Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Tìm kiếm từ khóa:</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tiêu đề, tác giả..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg text-xs outline-none focus:bg-white focus:border-brand-royal"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Chuyên mục chương trình:</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-royal"
              >
                <option value="all">Tất cả chương trình</option>
                {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Đơn vị công tác:</label>
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-royal"
              >
                <option value="all">Tất cả Khối Phòng & PGD</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Thẻ tra cứu (Tags):</label>
              <select
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-royal"
              >
                <option value="all">Tất cả thẻ chủ đề</option>
                {allTags.map(t => (
                  <option key={t} value={t}>#{t}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Quick reset if filtered */}
          {(selectedCategory !== 'all' || selectedDepartment !== 'all' || selectedTag !== 'all' || searchQuery !== '') && (
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedDepartment('all');
                  setSelectedTag('all');
                  setSearchQuery('');
                }}
                className="text-xs text-brand-red font-bold hover:underline"
              >
                ↻ Xóa bộ lọc đang chọn
              </button>
            </div>
          )}
        </div>

        {/* DATA ITEMS GRID */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 mb-1">Không tìm thấy tư liệu minh họa phù hợp</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              Thử thay đổi từ khóa hoặc bộ lọc phòng ban để xem các bài viết khác trong Thư viện Bắc Hưng Yên.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedDepartment('all');
                setSelectedTag('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-lg bg-brand-royal text-white text-xs font-bold"
            >
              Xem toàn bộ tư liệu ({items.length})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const catName = CATEGORY_NAMES[item.category] || item.category;
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between ${item.isFeatured ? 'border-brand-royal ring-1 ring-brand-royal/20' : 'border-slate-200'}`}
                >
                  <div>
                    {/* Image Header */}
                    {item.imageUrl ? (
                      <div className="relative h-48 w-full bg-slate-100 overflow-hidden group cursor-pointer" onClick={() => openDetailModal(item)}>
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-md text-[10px] font-black text-brand-royal uppercase shadow-sm border border-slate-200">
                          {catName}
                        </div>
                        {item.isFeatured && (
                          <div className="absolute top-3 right-3 bg-brand-red text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider shadow">
                            ⭐ Nổi bật
                          </div>
                        )}
                        {item.imageUrls && item.imageUrls.length > 1 && (
                          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{item.imageUrls.length} ảnh</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-28 w-full bg-gradient-to-r from-brand-royal to-brand-sky p-4 flex flex-col justify-end text-white relative">
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-80">{catName}</span>
                      </div>
                    )}

                    {/* Content Body */}
                    <div className="p-5 space-y-3">
                      <h3
                        onClick={() => openDetailModal(item)}
                        className="text-sm sm:text-base font-black text-slate-800 hover:text-brand-royal transition-colors leading-snug line-clamp-2 cursor-pointer"
                      >
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.tags.map((t, idx) => (
                          <span
                            key={idx}
                            onClick={() => setSelectedTag(t)}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-brand-royal text-[10px] font-mono font-semibold transition-colors cursor-pointer"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-brand-royal flex items-center justify-center font-bold text-[10px] shrink-0">
                        {item.author.charAt(0)}
                      </div>
                      <div className="truncate text-[11px]">
                        <span className="font-bold text-slate-700">{item.author}</span>
                        <span className="opacity-75 block text-[9px] truncate">{item.department} • {item.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-2">
                      <button
                        onClick={() => openDetailModal(item)}
                        className="p-1 hover:text-brand-royal transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          onLikeItem(item.id);
                          confetti({ particleCount: 25, spread: 35 });
                        }}
                        className="flex items-center gap-1 font-bold text-brand-red hover:scale-110 transition-transform"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{item.likes}</span>
                      </button>

                      {isAdmin && (
                        <div className="flex items-center gap-1.5">
                          {onToggleShare && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleShare(item.id, !item.isShared);
                              }}
                              className={`p-1 rounded transition-all cursor-pointer hover:scale-110 ${
                                item.isShared ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
                              }`}
                              title={item.isShared ? 'Đang chia sẻ cho khách đối tác — bấm để ngừng' : 'Chia sẻ cho khách đối tác'}
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                          {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded border border-red-200 animate-pulse">
                              <span className="text-[10px] font-black text-red-600">Xóa?</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteItem(item.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="text-[9px] font-bold text-white bg-red-600 hover:bg-red-700 px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                Có
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                                className="text-[9px] font-bold text-slate-500 hover:text-slate-700 px-1 py-0.5 rounded cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(item.id);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:scale-110 transition-all cursor-pointer"
                              title="Xóa bài viết"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DETAIL MODAL */}
        {activeModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
              {activeModalItem.imageUrls && activeModalItem.imageUrls.length > 0 ? (
                <div className="relative bg-slate-900 flex flex-col">
                  {/* Ảnh chính: nền tối, object-contain để xem trọn khung */}
                  <div className="relative h-64 sm:h-96 w-full overflow-hidden flex items-center justify-center">
                    <img
                      src={activeModalItem.imageUrls[activeImageIdx] ?? activeModalItem.imageUrls[0]}
                      alt={activeModalItem.title}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => setActiveModalItem(null)}
                      className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center font-bold text-sm hover:bg-black/80 cursor-pointer z-10"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Dải ảnh nhỏ — chỉ hiện khi có nhiều hơn 1 ảnh */}
                  {activeModalItem.imageUrls.length > 1 && (
                    <div className="p-3 bg-slate-950 flex gap-2 overflow-x-auto justify-center border-t border-slate-800">
                      {activeModalItem.imageUrls.map((imgUrl, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImageIdx(i)}
                          className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                            activeImageIdx === i ? 'border-brand-royal scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeModalItem.imageUrl ? (
                <div className="relative h-64 sm:h-80 w-full bg-slate-900">
                  <img src={activeModalItem.imageUrl} alt={activeModalItem.title} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setActiveModalItem(null)}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center font-bold text-sm hover:bg-black/80"
                  >
                    ✕
                  </button>
                </div>
              ) : null}

              <div className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded bg-blue-50 text-brand-royal font-extrabold text-xs uppercase">
                    {CATEGORY_NAMES[activeModalItem.category] || activeModalItem.category}
                  </span>
                  {!activeModalItem.imageUrl && !activeModalItem.imageUrls?.length && (
                    <button onClick={() => setActiveModalItem(null)} className="text-slate-400 hover:text-slate-800 font-bold">✕ Đóng</button>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-snug">
                  {activeModalItem.title}
                </h3>

                <div className="flex items-center gap-3 pb-4 border-b text-xs text-slate-500">
                  <span className="font-bold text-brand-royal">{activeModalItem.author}</span>
                  <span>•</span>
                  <span>{activeModalItem.department}</span>
                  <span>•</span>
                  <span>Ngày đăng: {activeModalItem.date}</span>
                </div>

                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border">
                  {activeModalItem.summary}
                  {activeModalItem.content && `\n\n${activeModalItem.content}`}
                </div>

                {/* 3 trường thông tin bổ sung — chỉ hiện khối có nội dung */}
                {activeModalItem.customValues && UPLOAD_CUSTOM_FIELDS.some(f => activeModalItem.customValues?.[f.id]?.trim()) && (
                  <div className="space-y-4 pt-2">
                    {UPLOAD_CUSTOM_FIELDS.map(field => {
                      const val = activeModalItem.customValues?.[field.id];
                      if (!val || !String(val).trim()) return null;
                      return (
                        <div key={field.id} className="border-t pt-3">
                          <h4 className="font-extrabold text-brand-royal text-xs uppercase tracking-wider mb-1">
                            {field.label}:
                          </h4>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-3 rounded-lg border border-dashed border-slate-200">
                            {val}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-1.5">
                    {activeModalItem.tags.map((t, idx) => (
                      <span key={idx} className="text-xs text-slate-500 font-mono">#{t}</span>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      onLikeItem(activeModalItem.id);
                      confetti({ particleCount: 40, spread: 50 });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-brand-red font-bold text-xs sm:text-sm hover:bg-brand-red hover:text-white transition-all"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Hữu ích ({activeModalItem.likes})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
