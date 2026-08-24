import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Layers, FileText, Edit, Trash2, X, Search, ArrowRight } from 'lucide-react';
import { EditableText } from '@/components/one/AdminEditableContext';
import { PillarAdminUploader } from './PillarGallery';
import { useCreditSessions, CreditSession, CreditSessionInput } from '@/components/one/credit/useCreditSessions';
import { useMyFullName } from '@/components/one/useMyFullName';
import { useAuth } from '@/hooks/useAuth';
import { IDEA_DEPARTMENTS } from '@/data/one/ideasConfig';
import { dongCsv } from '@/lib/xuatCsv';

interface Credit360PillarProps {
  images: string[];
  onImageUpload: (index: number, fileOrUrl: string) => void;
  /** Trang đặc trưng chỉ giới thiệu — nơi làm việc thật là /one/credit-360 (một chức năng một cửa) */
  introOnly?: boolean;
}

const EMPTY_FORM: CreditSessionInput = {
  sessionDate: '',
  departmentName: '',
  customerName: '',
  businessField: '',
  actualRevenue: '',
  creditLimit: null,
  underwriter: '',
  deptLeader: '',
};

// Nhật ký phiên thảo luận Credit 360 — form đăng ký + thống kê + bảng tra cứu.
const CreditSessionLogger: React.FC = () => {
  const { sessions, isLoading, isContentAdmin, createSession, updateSession, deleteSession } = useCreditSessions();
  const myFullName = useMyFullName();

  const [form, setForm] = useState<CreditSessionInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');

  const set = (key: keyof CreditSessionInput, value: string | number | null) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleStartEdit = (s: CreditSession) => {
    setEditingId(s.id);
    setForm({
      sessionDate: s.sessionDate,
      departmentName: s.departmentName,
      customerName: s.customerName,
      businessField: s.businessField,
      actualRevenue: s.actualRevenue,
      creditLimit: s.creditLimit,
      underwriter: s.underwriter,
      deptLeader: s.deptLeader,
    });
    document.getElementById('credit360-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const ok = editingId
      ? await updateSession(editingId, form)
      : await createSession(form, myFullName || 'Ẩn danh');
    setIsSubmitting(false);
    if (ok) resetForm();
  };

  const handleDelete = (s: CreditSession) => {
    if (window.confirm(`Xóa phiên họp của khách hàng "${s.customerName}"?`)) {
      if (editingId === s.id) resetForm();
      deleteSession(s.id);
    }
  };

  // 3 ô thống kê nhanh (theo bản deploy): tổng phiên, tổng GHTD, số phòng đề xuất
  const totalCreditLimit = useMemo(
    () => sessions.reduce((sum, s) => sum + (Number(s.creditLimit) || 0), 0),
    [sessions],
  );
  const departmentCount = useMemo(
    () => new Set(sessions.map(s => s.departmentName).filter(Boolean)).size,
    [sessions],
  );

  // Tra cứu: khớp từ khóa trên mọi cột chữ + lọc theo phòng; sessions đã sắp mới nhất trước
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter(s => {
      const matchesSearch = q === '' || [
        s.sessionDate, s.departmentName, s.customerName, s.businessField,
        s.actualRevenue, String(s.creditLimit ?? ''), s.underwriter, s.deptLeader, s.creatorName,
      ].some(v => v.toLowerCase().includes(q));
      const matchesDept = filterDept === 'all' || s.departmentName === filterDept;
      return matchesSearch && matchesDept;
    });
  }, [sessions, searchQuery, filterDept]);

  const handleExportCSV = () => {
    if (sessions.length === 0) {
      alert('Không có dữ liệu phiên họp Credit 360 để kết xuất!');
      return;
    }
    const headers = [
      'STT', 'Phiên họp ngày', 'Phòng đề xuất', 'Tên KH', 'Lĩnh vực/ngành nghề kinh doanh',
      'Doanh thu thực tế', 'GHTD cấp (đơn vị tỷ đồng)', 'CBTĐ', 'LĐP', 'Người tạo', 'Ngày đăng ký',
    ];
    const rows = sessions.map((s, i) => [
      i + 1,
      s.sessionDate ? new Date(s.sessionDate).toLocaleDateString('vi-VN') : '',
      s.departmentName,
      s.customerName,
      s.businessField,
      s.actualRevenue,
      s.creditLimit ?? '',
      s.underwriter,
      s.deptLeader,
      s.creatorName,
      s.createdAt ? new Date(s.createdAt).toLocaleDateString('vi-VN') : '',
    ]);
    // TÊN KHÁCH HÀNG và lĩnh vực kinh doanh là chữ do cán bộ gõ, nên ngoài việc
    // bọc dấu " như cũ còn phải chặn ô mở đầu bằng = + - @ — Excel sẽ hiểu là
    // công thức và chạy trên máy lãnh đạo mở tệp. Xem src/lib/xuatCsv.ts.
    const csvContent = [headers, ...rows]
      .map(row => dongCsv(row, ','))
      .join('\n');
    // BOM UTF-8 để Excel mở đúng tiếng Việt có dấu
    const blob = new Blob(['﻿', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TONG_HOP_PHIEN_CREDIT_360_BHY_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const inputCls = 'w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>Nhật Ký Đăng Ký Phiên Thảo Luận Credit 360</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Cán bộ nhập liệu thông tin các phiên họp Credit 360. Admin thực hiện kết xuất file tổng hợp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            REALTIME DỮ LIỆU
          </span>
          {isContentAdmin && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Xuất CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-base">📊</div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Tổng số phiên họp</span>
            <span className="text-lg font-black text-slate-800">{sessions.length} phiên</span>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base">💰</div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Tổng GHTD đề xuất</span>
            <span className="text-lg font-black text-slate-800">{totalCreditLimit.toLocaleString('vi-VN')} Tỷ VNĐ</span>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-base">🏢</div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Số phòng đề xuất</span>
            <span className="text-lg font-black text-slate-800">{departmentCount} đơn vị</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cột form đăng ký / cập nhật */}
        <div id="credit360-form-container" className="lg:col-span-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">
              {editingId ? '✏️ Cập nhật thông tin phiên họp' : '✍️ Đăng ký thông tin phiên mới'}
            </h4>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full transition-all cursor-pointer"
                title="Hủy sửa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Phiên họp ngày <span className="text-red-500">*</span></label>
              <input type="date" value={form.sessionDate} onChange={e => set('sessionDate', e.target.value)} required className={`${inputCls} font-semibold`} />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Phòng đề xuất <span className="text-red-500">*</span></label>
              <select value={form.departmentName} onChange={e => set('departmentName', e.target.value)} required className={`${inputCls} font-semibold`}>
                <option value="">-- Chọn một giá trị --</option>
                {IDEA_DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Tên KH <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Ví dụ: Công ty TNHH ABC" value={form.customerName} onChange={e => set('customerName', e.target.value)} required className={inputCls} />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Lĩnh vực/ngành nghề kinh doanh <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Ví dụ: Sản xuất bao bì" value={form.businessField} onChange={e => set('businessField', e.target.value)} required className={inputCls} />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Doanh thu thực tế <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Ví dụ: 120 tỷ đồng/năm" value={form.actualRevenue} onChange={e => set('actualRevenue', e.target.value)} required className={inputCls} />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">GHTD cấp (đơn vị tỷ đồng) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="any"
                placeholder="Nhập số, ví dụ: 25.5"
                value={form.creditLimit ?? ''}
                onChange={e => set('creditLimit', e.target.value === '' ? null : Number(e.target.value))}
                required
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">CBTĐ <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Tên cán bộ" value={form.underwriter} onChange={e => set('underwriter', e.target.value)} required className={inputCls} />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">LĐP <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Tên lãnh đạo" value={form.deptLeader} onChange={e => set('deptLeader', e.target.value)} required className={inputCls} />
            </div>

            <div className="flex items-center gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl transition-all border border-slate-200 flex items-center justify-center cursor-pointer"
                >
                  Hủy sửa
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`py-3 px-4 text-white font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  editingId ? 'bg-amber-600 hover:bg-amber-700 w-2/3' : 'bg-emerald-600 hover:bg-emerald-700 w-full'
                }`}
              >
                <span>{isSubmitting ? 'Đang lưu...' : editingId ? 'Cập Nhật Phiên' : 'Lưu Thông Tin Phiên'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Cột bảng tra cứu */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Tìm kiếm thông tin nhanh qua nhật ký..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white outline-none text-xs transition-all"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>

            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs focus:border-emerald-500 focus:bg-white text-slate-600 font-semibold"
            >
              <option value="all">Tất cả đơn vị đề xuất</option>
              {IDEA_DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm bg-white">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-400">Đang đồng bộ dữ liệu phiên họp...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold italic">
                Chưa có thông tin phiên họp nào khớp với bộ lọc tìm kiếm.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500 select-none">
                      <th className="p-3 text-center w-12 font-black">STT</th>
                      <th className="p-3 font-black whitespace-nowrap">Phiên họp ngày</th>
                      <th className="p-3 font-black whitespace-nowrap">Phòng đề xuất</th>
                      <th className="p-3 font-black whitespace-nowrap">Tên KH</th>
                      <th className="p-3 font-black whitespace-nowrap">Lĩnh vực/ngành nghề kinh doanh</th>
                      <th className="p-3 font-black whitespace-nowrap">Doanh thu thực tế</th>
                      <th className="p-3 font-black whitespace-nowrap">GHTD cấp (đơn vị tỷ đồng)</th>
                      <th className="p-3 font-black whitespace-nowrap">CBTĐ</th>
                      <th className="p-3 font-black whitespace-nowrap">LĐP</th>
                      <th className="p-3 text-center w-24 font-black">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filtered.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <span className="font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md block text-center w-fit text-[10px] whitespace-nowrap">
                            {s.sessionDate ? new Date(s.sessionDate).toLocaleDateString('vi-VN') : 'N/A'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-600 block leading-relaxed whitespace-nowrap">{s.departmentName || '-'}</span>
                        </td>
                        <td className="p-3">
                          <div className="min-w-[150px]">
                            <span className="font-extrabold text-slate-900 block leading-tight">{s.customerName || '-'}</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Tạo bởi: {s.creatorName || 'Ẩn danh'}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-600 block line-clamp-2 leading-relaxed min-w-[100px]">{s.businessField || '-'}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-600 block line-clamp-2 leading-relaxed min-w-[100px]">{s.actualRevenue || '-'}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-black text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block whitespace-nowrap">
                            {(s.creditLimit ?? 0).toLocaleString('vi-VN')} tỷ
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-600 block leading-relaxed min-w-[80px]">{s.underwriter || '-'}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-600 block leading-relaxed min-w-[80px]">{s.deptLeader || '-'}</span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {(s.isMine || isContentAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(s)}
                                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 cursor-pointer transition-all inline-block"
                                title="Sửa phiên họp"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {isContentAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleDelete(s)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer transition-all inline-block"
                                title="Xóa phiên họp"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Credit360Pillar: React.FC<Credit360PillarProps> = ({ images, onImageUpload, introOnly }) => {
  const { isGuest } = useAuth();

  // --- Credit 360 Simulator State ---
  const [creditType, setCreditType] = useState<'KHDN' | 'KHBL'>('KHDN');
  const [creditAmount, setCreditAmount] = useState<number>(18);
  const [timemarkVerified, setTimemarkVerified] = useState(false);

  const threshold = creditType === 'KHDN' ? 15 : 10;
  const qualifies = creditAmount >= threshold && timemarkVerified;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <EditableText id="programs.credit360.subject" defaultVal="Trao đổi nghiệp vụ nội bộ 360° - Không làm thay quyết định phê duyệt" className="font-bold text-xs text-emerald-800" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-700">
            <EditableText id="programs.credit360.title" defaultVal="Bắc Hưng Yên Credit 360" className="font-black text-2xl sm:text-3xl text-emerald-700" />
          </h3>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            <EditableText
              id="programs.credit360.desc"
              defaultVal="Tạo môi trường thảo luận đa chiều đối với các hồ sơ đề xuất GHTD phức tạp trước khi trình cấp thẩm quyền. Giúp đội ngũ cán bộ QHKH rèn tư duy trình bày, phản biện và nhận diện rủi ro."
              multiline={true}
              as="span"
            />
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-sm">
              <EditableText id="programs.credit360.corp_segment" defaultVal="🏢 Phân khúc KHDN&#10;Áp dụng hồ sơ cấp mới/tái cấp có tổng GHTD từ 15 tỷ đồng trở lên." className="whitespace-pre-line text-xs leading-relaxed" multiline={true} as="div" />
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-sm">
              <EditableText id="programs.credit360.retail_segment" defaultVal="🛍️ Phân khúc KHBL&#10;Áp dụng hồ sơ cấp mới/tái cấp có tổng GHTD từ 10 tỷ đồng trở lên." className="whitespace-pre-line text-xs leading-relaxed" multiline={true} as="div" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border">
            <span className="font-bold text-xs text-slate-800 block mb-1">
              <EditableText id="programs.credit360.schedule_title" defaultVal="📅 Khung giờ ưu tiên triệu tập" className="font-bold text-xs block" />
            </span>
            <p className="text-xs text-slate-600">
              <EditableText
                id="programs.credit360.schedule_content"
                defaultVal="Chiều thứ 2, Sáng thứ 3 hoặc ngày thứ 5 hằng tuần. Cán bộ trình bày gửi hồ sơ trước tối thiểu 01 ngày. Bắt buộc minh chứng ảnh cơ sở kinh doanh/TSBĐ chụp qua ứng dụng Timemark."
                multiline={true}
                as="span"
                className="text-xs"
              />
            </p>
          </div>
        </div>

        {/* Credit 360 Checklist Simulator */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-emerald-300 shadow-md space-y-4">
          <div className="relative h-40 rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <img src={images[0]} alt="BHY Credit 360 Illustration" className="w-full h-full object-cover" />
            <PillarAdminUploader onUpload={(v) => onImageUpload(0, v)} />
          </div>
          <h4 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            <span>Checklist Kiểm Tra Điều Kiện Đưa Vào Phiên Credit 360</span>
          </h4>

          <div className="space-y-4 text-xs mb-6">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phân khúc Khách hàng:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={creditType === 'KHDN'} onChange={() => setCreditType('KHDN')} className="text-emerald-600" />
                  <span className="font-semibold">Khách hàng Doanh nghiệp (KHDN)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={creditType === 'KHBL'} onChange={() => setCreditType('KHBL')} className="text-emerald-600" />
                  <span className="font-semibold">Khách hàng Bán lẻ (KHBL)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tổng GHTD đề xuất (Tỷ VNĐ):</label>
              <input
                type="number"
                value={creditAmount}
                onChange={e => setCreditAmount(Number(e.target.value))}
                className="w-full p-2 border rounded text-xs"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input type="checkbox" checked={timemarkVerified} onChange={e => setTimemarkVerified(e.target.checked)} className="rounded text-emerald-600" />
                <span>Đã chụp Timemark xác thực vị trí nhà xưởng/TSBĐ</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input type="checkbox" defaultChecked className="rounded text-emerald-600" />
                <span>Đã thu thập đánh giá 360° khách hàng từ CRM 1.0</span>
              </label>
            </div>
          </div>

          {/* Status Indicator */}
          <div className={`p-4 rounded-xl border text-center ${qualifies ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
            <span className="font-black text-sm block mb-1">
              {qualifies ? '✅ ĐỦ ĐIỀU KIỆN ĐƯA VÀO PHIÊN THẢO LUẬN' : 'ℹ️ Chưa đủ ngưỡng bắt buộc hoặc thiếu Timemark'}
            </span>
            <p className="text-[11px] opacity-90">
              {qualifies
                ? `Hồ sơ ${creditType} GHTD ${creditAmount} tỷ >= ${threshold} tỷ. Sẵn sàng sắp xếp calendar triệu tập Hội đồng 360°.`
                : `Ngưỡng tối thiểu cho ${creditType} là ${threshold} tỷ VNĐ và yêu cầu xác thực Timemark.`}
            </p>
          </div>
        </div>
      </div>

      {/* Nhật ký phiên họp — nơi làm việc thật. Trang giới thiệu chỉ đặt nút dẫn sang;
          khách đối tác không thấy cả hai (RLS chặn dữ liệu). */}
      {introOnly && !isGuest && (
        <div className="text-center">
          <Link
            to="/one/credit-360"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all hover:-translate-y-0.5"
          >
            Vào sổ đăng ký Credit 360
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
      {!introOnly && !isGuest && <CreditSessionLogger />}
    </div>
  );
};
