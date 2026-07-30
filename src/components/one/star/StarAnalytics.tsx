import React, { useMemo, useRef, useState } from 'react';
import {
  Award, CheckCircle2, ChevronDown, ChevronUp, DollarSign, Download, FileText,
  Gift, Loader2, Search, Sparkles, Star, Trash2, TrendingUp, Upload, Users, X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { useStarRecords, type StarRecord } from './useStarRecords';
import {
  calculateRewardValue, formatVnd, getMilestoneInfo, getRewardBreakdown,
} from './starMath';
import {
  DEPT_QUOTAS, buildTemplateWorkbook, parseStarWorkbook, type ParseResult,
} from './starParser';

// Trình tổng hợp & phân tích Sao tích lũy — port từ app "Sao Xứng Đáng" đã triển khai,
// dữ liệu thật từ Supabase (bảng star_records) thay cho Firestore.

interface IndividualStat {
  name: string;
  department: string;
  totalStars: number;
  records: StarRecord[];
}

interface DepartmentStat {
  department: string;
  collectiveName: string;
  totalStars: number;
  staffCount: number;
  recordsCount: number;
}

interface PreviewState extends ParseResult {
  fileName: string;
}

export const StarAnalytics: React.FC = () => {
  const {
    records, isLoading, isContentAdmin, replaceAll, deleteRecord, deleteAll,
  } = useStarRecords();

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [expandedStaff, setExpandedStaff] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'individual' | 'department' | 'details'>('individual');
  const [uploadError, setUploadError] = useState('');
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Tổng hợp cá nhân: gộp theo (tên, phòng), LOẠI phiếu tập thể ----
  const individualStats = useMemo<IndividualStat[]>(() => {
    const statsMap: Record<string, IndividualStat> = {};
    records.forEach((rec) => {
      if (rec.isCollective) return;
      const key = `${rec.name}-${rec.department}`;
      if (!statsMap[key]) {
        statsMap[key] = { name: rec.name, department: rec.department, totalStars: 0, records: [] };
      }
      statsMap[key].totalStars += Number(rec.stars) || 0;
      statsMap[key].records.push(rec);
    });
    return Object.values(statsMap).sort((a, b) => b.totalStars - a.totalStars);
  }, [records]);

  // ---- Tổng hợp phòng ban ----
  // SỬA CÓ CHỦ ĐÍCH so với bản gốc: tổng sao của phòng bao gồm CẢ phiếu cá nhân lẫn
  // phiếu tập thể của phòng đó. Bản gốc chỉ cộng phiếu tập thể, khiến sao cá nhân
  // không được tính vào thi đua phòng ban.
  const departmentStats = useMemo<DepartmentStat[]>(() => {
    const statsMap: Record<string, { totalStars: number; staff: Set<string>; recordsCount: number }> = {};
    Object.keys(DEPT_QUOTAS).forEach((dept) => {
      statsMap[dept] = { totalStars: 0, staff: new Set(), recordsCount: 0 };
    });
    records.forEach((rec) => {
      const dept = rec.department || 'Phòng KHDN';
      if (!statsMap[dept]) {
        statsMap[dept] = { totalStars: 0, staff: new Set(), recordsCount: 0 };
      }
      statsMap[dept].totalStars += Number(rec.stars) || 0;
      statsMap[dept].recordsCount += 1;
      if (!rec.isCollective) statsMap[dept].staff.add(rec.name);
    });
    return Object.entries(statsMap)
      .map(([dept, s]) => ({
        department: dept,
        collectiveName: dept === 'Ban Giám đốc' ? dept : `Tập thể ${dept}`,
        totalStars: s.totalStars,
        staffCount: s.staff.size,
        recordsCount: s.recordsCount,
      }))
      .sort((a, b) => b.totalStars - a.totalStars);
  }, [records]);

  const getTopIndividualForDept = (deptName: string): string => {
    const deptIndividuals = individualStats.filter((st) => st.department === deptName);
    if (deptIndividuals.length === 0) return 'Chưa có';
    const top = deptIndividuals[0]; // đã sắp xếp giảm dần
    return `${top.name} (${top.totalStars} ⭐)`;
  };

  // Dự trù kinh phí = Σ giá trị quy đổi của từng CÁ NHÂN (loại tập thể) — như app gốc
  const totalStars = useMemo(() => records.reduce((sum, r) => sum + (Number(r.stars) || 0), 0), [records]);
  const totalBudget = useMemo(
    () => individualStats.reduce((sum, st) => sum + getRewardBreakdown(st.totalStars).totalValue, 0),
    [individualStats],
  );

  // ---- Nhập file (admin): đọc → xem trước → xác nhận thay thế toàn bộ ----
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');

    const ok = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!ok) {
      setUploadError('Hệ thống hỗ trợ file Excel (.xlsx, .xls) hoặc file CSV (.csv).');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const result = parseStarWorkbook(buffer);
      if (result.records.length === 0) {
        setUploadError('Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng kiểm tra lại cấu trúc cột (tải file mẫu để đối chiếu).');
        return;
      }
      setPreview({ ...result, fileName: file.name });
    } catch (err) {
      setUploadError(`Lỗi đọc file: ${(err as Error).message}`);
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    setImporting(true);
    const ok = await replaceAll(preview.records);
    setImporting(false);
    if (ok) {
      setPreview(null);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
    }
  };

  const downloadTemplate = () => {
    const buf = buildTemplateWorkbook();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'File_mau_Sao_Xung_Dang.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Xuất Excel 3 sheet (cấu trúc như exportToExcel bản gốc, số liệu live) ----
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const individualData = individualStats.map((st, idx) => {
        const milestone = getMilestoneInfo(st.totalStars);
        return {
          'STT': idx + 1,
          'Họ và tên': st.name,
          'Phòng ban': st.department,
          'Tổng sao tích lũy': st.totalStars,
          'Mốc quà lớn nhất đạt được': milestone.achievedTier?.name || 'Chưa đạt mốc',
          'Giá trị quà tặng': milestone.achievedTier?.maxVal || '0 đ',
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(individualData), 'Thống kê cá nhân');

      const deptData = departmentStats.map((dept, idx) => {
        const milestone = getMilestoneInfo(dept.totalStars);
        const totalReward = calculateRewardValue(dept.totalStars);
        const breakdown = getRewardBreakdown(dept.totalStars);
        const quota = DEPT_QUOTAS[dept.department] || 20;
        return {
          'Hạng': idx + 1,
          'Tập thể': dept.collectiveName,
          'Số CB được ghi nhận': dept.staffCount,
          'Tổng Sao đạt được': dept.totalStars,
          'Chỉ tiêu / Quota năm': quota,
          // Không giới hạn 100% để thấy phòng vượt chỉ tiêu
          'Tỷ lệ hoàn thành': `${Math.round((dept.totalStars / quota) * 100)}%`,
          'Mốc quà đạt được': milestone.achievedTier?.name || 'Chưa đạt mốc',
          'Giá trị quà tặng': formatVnd(totalReward),
          'Chi tiết quy đổi': `${dept.totalStars} Sao × 100k (gốc: ${formatVnd(breakdown.baseValue)}) + ${breakdown.threeStarCount} mốc 3 Sao × 300k (${formatVnd(breakdown.threeStarValue)}) + Mốc 6 Sao (${formatVnd(breakdown.sixStarValue)}) + Mốc cao nhất >= 8 Sao (${formatVnd(breakdown.highTierValue)})`,
          'Cán bộ xuất sắc nhất': getTopIndividualForDept(dept.department),
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deptData), 'Thi đua Phòng ban');

      const rawData = records.map((rec, idx) => ({
        'STT': idx + 1,
        'Họ và tên': rec.name,
        'Phòng ban': rec.department,
        'Số sao': rec.stars,
        'Lý do ghi nhận': rec.reason,
        'Hiệu quả thực tế': rec.result,
        'Ngày nhận': rec.date,
        'Người gửi': rec.sender,
        'Serial': rec.serial,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawData), 'Danh sách chi tiết');

      XLSX.writeFile(wb, `Bao_cao_Sao_Xung_Dang_2026_${new Date().toISOString().split('T')[0]}.xlsx`);
      confetti({ particleCount: 30 });
    } catch (err) {
      setUploadError(`Lỗi xuất file Excel: ${(err as Error).message}`);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t-2 border-dashed border-amber-200" id="star-analytics-engine">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4 animate-pulse" />
            <span>Hệ thống Quản trị & Đối soát Chi nhánh</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight">
            📊 TRÌNH TỔNG HỢP & PHÂN TÍCH SAO TÍCH LŨY
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống tự động xếp hạng thi đua phòng ban, danh hiệu cá nhân và dự phòng ngân sách dựa trên số liệu sao tích lũy.
          </p>
        </div>
        {isContentAdmin && (
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all cursor-pointer"
              title="Tải file Excel mẫu đúng cấu trúc cột C→J"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tải file mẫu</span>
            </button>
            <button
              type="button"
              onClick={exportToExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md cursor-pointer"
              title="Xuất dữ liệu đối soát ra file Excel (3 sheet)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất file đối soát (Excel)</span>
            </button>
          </div>
        )}
      </div>

      {/* Khu nhập file (admin) / banner chế độ xem (cán bộ) */}
      {isContentAdmin ? (
        <div className="relative p-6 sm:p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-navy/50 bg-slate-50/60 hover:bg-slate-50 transition-all text-center">
          <input
            ref={fileInputRef}
            type="file"
            id="star-file-upload"
            className="hidden"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
          />
          <label htmlFor="star-file-upload" className="cursor-pointer block">
            <div className="mx-auto w-12 h-12 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs sm:text-sm font-black text-slate-800">
              Chọn file Excel (.xlsx, .xls) hoặc CSV (.csv) để nhập dữ liệu sao — hệ thống sẽ hiển thị bản xem trước để đối soát trước khi ghi đè
            </p>
            <div className="mt-3">
              <span className="px-4 py-2 inline-flex items-center gap-1.5 rounded-xl bg-brand-navy text-white text-xs font-bold transition-all shadow-md hover:bg-blue-800 cursor-pointer">
                Chọn file dữ liệu Excel/CSV
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-3 max-w-2xl mx-auto leading-relaxed bg-slate-100 p-2.5 rounded-lg border border-slate-200">
              <p className="font-bold text-slate-600 mb-1">Cấu hình ánh xạ cột tự động (header "1." → "8." tại cột C → J):</p>
              <p className="font-mono text-[9.5px] text-slate-700">
                C: Dấu thời gian | D: Người tặng sao | F: Phòng ban | G: Cán bộ/Tập thể nhận sao | I: Số lượng sao | J: Serial
              </p>
            </div>
          </label>

          {uploadError && (
            <p className="mt-3 text-xs text-red-600 font-bold bg-red-50 py-1.5 px-3 rounded-lg inline-block border border-red-200">
              ⚠️ {uploadError}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy shrink-0">
              <CheckCircle2 className="w-5 h-5 text-brand-navy" />
            </div>
            <div className="text-left">
              <h5 className="font-extrabold text-xs sm:text-sm text-slate-800">Chế độ Xem Báo Cáo & Tra Cứu (NV)</h5>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                Số liệu sao tích lũy được đồng bộ chính xác trực tiếp từ hệ thống đối soát chính thức của Chi nhánh Bắc Hưng Yên do Ban Quản trị cập nhật.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ĐÃ ĐỐI SOÁT CHÍNH THỨC
          </span>
        </div>
      )}

      {/* BẢN XEM TRƯỚC dữ liệu nhập (chỉ hiện sau khi đọc file, trước khi ghi đè) */}
      {isContentAdmin && preview && (
        <div className="mt-4 bg-white rounded-2xl border-2 border-amber-300 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 border-b border-amber-200">
            <div>
              <h5 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                Xem trước dữ liệu nhập: {preview.fileName}
              </h5>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Đọc được <strong>{preview.records.length} phiếu sao</strong>
                {preview.warnings.length > 0 && (
                  <> — <strong className="text-amber-700">{preview.warnings.length} cảnh báo</strong> cần soát lại</>
                )}
                . Khi xác nhận, dữ liệu này sẽ <strong className="text-red-600">THAY THẾ TOÀN BỘ</strong> dữ liệu sao hiện có trên hệ thống.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="p-1.5 rounded-lg hover:bg-amber-100 text-slate-500 cursor-pointer shrink-0"
              title="Đóng bản xem trước"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {preview.warnings.length > 0 && (
            <div className="p-4 bg-amber-50/50 border-b border-amber-100 max-h-40 overflow-y-auto">
              <span className="text-[10px] font-black uppercase text-amber-700 block mb-1.5">⚠️ Cảnh báo dữ liệu (đã dùng giá trị mặc định):</span>
              <ul className="space-y-1 text-[11px] text-slate-700">
                {preview.warnings.map((w, i) => (
                  <li key={i}>
                    <span className="font-mono font-bold text-amber-700">Dòng {w.row}:</span> {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black sticky top-0">
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">Họ và tên / Tập thể</th>
                  <th className="p-2.5">Phòng ban</th>
                  <th className="p-2.5 text-center">Sao</th>
                  <th className="p-2.5">Lý do</th>
                  <th className="p-2.5 text-center">Ngày</th>
                  <th className="p-2.5">Người gửi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {preview.records.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-slate-800">
                      {rec.name}
                      {rec.isCollective && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-black uppercase">Tập thể</span>
                      )}
                    </td>
                    <td className="p-2.5">{rec.department}</td>
                    <td className="p-2.5 text-center font-bold text-amber-600">{rec.stars} ⭐</td>
                    <td className="p-2.5 max-w-xs truncate" title={rec.reason}>{rec.reason}</td>
                    <td className="p-2.5 text-center font-mono">{rec.date}</td>
                    <td className="p-2.5">{rec.sender}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPreview(null)}
              disabled={importing}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={confirmImport}
              disabled={importing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Xác nhận nhập {preview.records.length} phiếu (thay thế toàn bộ)</span>
            </button>
          </div>
        </div>
      )}

      {/* 3 THẺ THỐNG KÊ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Tổng số sao tích lũy</span>
            <span className="text-xl sm:text-2xl font-black text-brand-navy">{totalStars} ⭐</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Tổng phiếu ghi nhận</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600">{records.length} phiếu</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Dự trù kinh phí quà</span>
            <span className="text-xl sm:text-2xl font-black text-rose-600">{formatVnd(totalBudget)}</span>
          </div>
          <div className="p-2 rounded-xl bg-rose-50 text-rose-700 text-[10px] font-bold" title="Tổng kinh phí quy đổi tích lũy của từng cá nhân (không gồm phiếu tập thể)">
            Dự trù ngân sách
          </div>
        </div>
      </div>

      {/* DASHBOARD 3 TAB */}
      <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/85 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'individual' ? 'bg-white text-brand-navy shadow border border-slate-100' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Thống kê cá nhân ({individualStats.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('department')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'department' ? 'bg-white text-brand-navy shadow border border-slate-100' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Thi đua Phòng ban</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'details' ? 'bg-white text-brand-navy shadow border border-slate-100' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Danh sách chi tiết ({records.length} dòng)</span>
          </button>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tải dữ liệu sao từ hệ thống...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: CÁ NHÂN */}
              {activeTab === 'individual' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute top-2.5 left-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm họ tên cán bộ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand-navy"
                      />
                    </div>

                    <select
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-brand-navy text-slate-700 font-medium"
                    >
                      <option value="all">Tất cả Phòng ban</option>
                      {Object.keys(DEPT_QUOTAS).map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {individualStats
                      .filter((staff) => {
                        const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesDept = deptFilter === 'all' || staff.department === deptFilter;
                        return matchesSearch && matchesDept;
                      })
                      .map((staff, idx) => {
                        // Khóa mở rộng theo (tên, phòng) — không dùng index để không lệch khi lọc
                        const expandKey = `${staff.name}-${staff.department}`;
                        const isExpanded = !!expandedStaff[expandKey];
                        const { nextTier } = getMilestoneInfo(staff.totalStars);
                        const breakdown = getRewardBreakdown(staff.totalStars);

                        return (
                          <div key={expandKey} className="bg-slate-50 hover:bg-slate-50/80 rounded-2xl border border-slate-100 overflow-hidden transition-all shadow-sm">
                            <div
                              onClick={() => setExpandedStaff((prev) => ({ ...prev, [expandKey]: !isExpanded }))}
                              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-brand-navy/10 flex items-center justify-center font-black text-brand-navy text-xs shrink-0">
                                  {idx + 1}
                                </div>
                                <div>
                                  <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm">{staff.name}</h5>
                                  <span className="text-[10px] text-slate-500 font-bold bg-slate-200/60 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                                    🏢 {staff.department}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 font-extrabold text-xs flex items-center gap-1 shrink-0">
                                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                                  <span>{staff.totalStars} Sao</span>
                                </div>

                                <div className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center gap-1 shrink-0 shadow-sm border border-emerald-700">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>Thưởng quy đổi: {formatVnd(breakdown.totalValue)}</span>
                                </div>

                                {nextTier ? (
                                  <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold flex items-center gap-1 shrink-0">
                                    <TrendingUp className="w-3 h-3 text-blue-600" />
                                    <span>Cần thêm {nextTier.stars - staff.totalStars} ⭐ (Lên {nextTier.stars}⭐)</span>
                                  </div>
                                ) : (
                                  <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-center gap-1 shrink-0">
                                    <Sparkles className="w-3 h-3 text-rose-500 animate-pulse" />
                                    <span>Đã đạt mốc tối đa 🎉</span>
                                  </div>
                                )}

                                <span className="text-slate-400 ml-1">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </span>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="px-4 pb-4 pt-2 border-t border-slate-200/60 bg-white space-y-4">
                                {/* Bảng quy đổi 5 dòng */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
                                  <h6 className="text-[10px] font-black text-brand-navy uppercase flex items-center gap-1.5">
                                    <Gift className="w-3.5 h-3.5 text-amber-500" />
                                    BẢNG PHÂN TÍCH QUY ĐỔI GIÁ TRỊ THƯỞNG TÍCH LŨY:
                                  </h6>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-2 pt-1">
                                    <div className="space-y-1.5 text-slate-600">
                                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                        <span>• Giá trị Sao gốc (100k/Sao):</span>
                                        <span className="font-bold text-slate-800">{staff.totalStars} × 100k = {formatVnd(breakdown.baseValue)}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                        <span>• Quà tặng mốc 3 Sao (300k/set):</span>
                                        <span className="font-bold text-slate-800">{breakdown.threeStarCount} set × 300k = {formatVnd(breakdown.threeStarValue)}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                        <span>• Quà tặng mốc 6 Sao (500k):</span>
                                        <span className="font-bold text-slate-800">{breakdown.sixStarValue > 0 ? 'Có' : 'Không'} = {formatVnd(breakdown.sixStarValue)}</span>
                                      </div>
                                    </div>

                                    <div className="space-y-1.5 text-slate-600 sm:border-l sm:pl-3">
                                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                        <span>• Mốc quà &gt;= 8 Sao lớn nhất:</span>
                                        <span className="font-bold text-slate-800">{breakdown.highTierName || 'Chưa đạt'}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                        <span>• Trị giá mốc quà &gt;= 8 Sao:</span>
                                        <span className="font-bold text-slate-800">{formatVnd(breakdown.highTierValue)}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                        <span className="font-black text-brand-navy">💰 TỔNG THƯỞNG QUY ĐỔI:</span>
                                        <span className="font-black text-emerald-600 text-sm">{formatVnd(breakdown.totalValue)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Lịch sử phiếu */}
                                <div className="space-y-2">
                                  <span className="text-[10px] font-black text-brand-navy uppercase block">
                                    📋 LỊCH SỬ THÀNH TÍCH GHI NHẬN ({staff.records.length} lần):
                                  </span>

                                  <div className="space-y-2.5">
                                    {staff.records.map((r) => (
                                      <div key={r.id} className="p-3 bg-amber-50/30 border border-amber-200/40 rounded-xl space-y-1.5 text-[11px] leading-relaxed">
                                        <div className="flex items-center justify-between font-bold text-slate-700">
                                          <span className="flex items-center gap-1 text-amber-700 font-black">
                                            <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                                            <span>+{r.stars} Sao tích lũy</span>
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono">📅 {r.date}</span>
                                        </div>
                                        <p className="text-slate-800">
                                          <strong className="text-slate-500 font-bold">Vì đã:</strong> {r.reason}
                                        </p>
                                        {r.result && (
                                          <p className="text-emerald-800 bg-emerald-50/50 p-2 rounded-lg font-semibold">
                                            <strong className="text-emerald-700">Hiệu quả thực tế:</strong> {r.result}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 2: PHÒNG BAN */}
              {activeTab === 'department' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black">
                          <th className="p-3 rounded-l-xl text-center">Hạng</th>
                          <th className="p-3">Tập thể Phòng ban</th>
                          <th className="p-3 text-center">Số CB được ghi nhận</th>
                          <th className="p-3 text-center">Tổng Sao đạt được</th>
                          <th className="p-3 text-center">Chỉ tiêu / Quota năm</th>
                          <th className="p-3">Tỷ lệ hoàn thành chỉ tiêu</th>
                          <th className="p-3">Mốc quà đạt được</th>
                          <th className="p-3 text-right">Giá trị quà tặng</th>
                          <th className="p-3 rounded-r-xl pl-4">Cán bộ xuất sắc nhất</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                        {departmentStats.map((dept, idx) => {
                          const quota = DEPT_QUOTAS[dept.department] || 20;
                          // Không giới hạn 100% — hiển thị đúng mức vượt chỉ tiêu
                          const pct = Math.round((dept.totalStars / quota) * 100);
                          const barPct = Math.min(100, pct);
                          const { achievedTier, nextTier } = getMilestoneInfo(dept.totalStars);
                          const breakdown = getRewardBreakdown(dept.totalStars);

                          return (
                            <tr key={dept.department} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-black text-slate-800 text-center w-12">
                                {idx + 1 <= 3 ? (
                                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white font-mono text-[10px] font-black ${
                                    idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                ) : (
                                  idx + 1
                                )}
                              </td>
                              <td className="p-3 font-extrabold text-slate-800">{dept.collectiveName}</td>
                              <td className="p-3 text-center font-bold text-slate-600">{dept.staffCount} đ/c</td>
                              <td className="p-3 text-center font-black text-brand-navy text-sm">{dept.totalStars} ⭐</td>
                              <td className="p-3 text-center font-bold text-slate-500">{quota} sao</td>
                              <td className="p-3 min-w-40">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-blue-500'
                                      }`}
                                      style={{ width: `${barPct}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-black shrink-0 w-10">{pct}%</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1">
                                  {achievedTier ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white font-black text-[10px] shadow-sm w-fit">
                                      <Gift className="w-3 h-3" />
                                      <span>{achievedTier.name} ({achievedTier.stars}⭐)</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-semibold italic text-[10px]">Chưa đạt mốc</span>
                                  )}
                                  {nextTier ? (
                                    <span className="text-[9px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md w-fit">
                                      Cần thêm {nextTier.stars - dept.totalStars} ⭐ (Lên {nextTier.stars}⭐)
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md w-fit animate-pulse">
                                      Đã đạt mốc tối đa 🎉
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="font-black text-emerald-600 text-xs sm:text-sm">
                                    {formatVnd(breakdown.totalValue)}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono text-right leading-tight max-w-[220px]" title="Chi tiết: Gốc + Mốc 3 Sao + Mốc 6 Sao + Mốc Cao Nhất >= 8 Sao">
                                    ({dept.totalStars}×100k + {breakdown.threeStarCount}×300k + {breakdown.sixStarValue > 0 ? '500k' : '0'} + {breakdown.highTierValue > 0 ? formatVnd(breakdown.highTierValue) : '0'})
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 pl-4">
                                <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200/50 px-2 py-1 rounded-md font-bold">
                                  {getTopIndividualForDept(dept.department)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: CHI TIẾT */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold">
                      Danh sách hiển thị toàn bộ các phiếu ghi nhận trong hệ thống đối soát:
                    </span>
                    {isContentAdmin && records.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu hiện tại để nhập mới không?')) {
                            void deleteAll();
                          }
                        }}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-bold hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa toàn bộ ({records.length})</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto max-h-[400px] border border-slate-100 rounded-xl">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black sticky top-0">
                          <th className="p-2.5">Họ và tên</th>
                          <th className="p-2.5">Phòng ban</th>
                          <th className="p-2.5 text-center">Sao</th>
                          <th className="p-2.5">Lý do ghi nhận</th>
                          <th className="p-2.5">Hiệu quả đem lại</th>
                          <th className="p-2.5 text-center">Ngày nhận</th>
                          <th className="p-2.5 text-center">Nguồn</th>
                          {isContentAdmin && <th className="p-2.5 text-center">Hành động</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                        {records.length === 0 ? (
                          <tr>
                            <td colSpan={isContentAdmin ? 8 : 7} className="p-8 text-center text-slate-400 font-bold italic">
                              Chưa có dữ liệu đối soát. Vui lòng liên hệ Quản trị viên để cập nhật dữ liệu thi đua của Chi nhánh.
                            </td>
                          </tr>
                        ) : (
                          records.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-800">{rec.name}</td>
                              <td className="p-2.5">{rec.department}</td>
                              <td className="p-2.5 text-center font-bold text-amber-600">+{rec.stars} ⭐</td>
                              <td className="p-2.5 max-w-xs truncate" title={rec.reason}>{rec.reason}</td>
                              <td className="p-2.5 max-w-xs truncate" title={rec.result}>{rec.result}</td>
                              <td className="p-2.5 text-center font-mono">{rec.date}</td>
                              <td className="p-2.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                  rec.source === 'form' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {rec.source === 'form' ? 'Form' : 'Import'}
                                </span>
                              </td>
                              {isContentAdmin && (
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => void deleteRecord(rec.id)}
                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Xóa dòng này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
