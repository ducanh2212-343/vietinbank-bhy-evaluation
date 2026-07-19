import { lazy, Suspense, ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { IdleLogoutGuard } from "@/components/IdleLogoutGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute, ManagerOrAboveRoute } from "@/components/AdminRoute";

import Login from "./pages/Login";
import Unsubscribe from "./pages/Unsubscribe";

// Retry dynamic import once on failure (handles stale chunk hashes after redeploys).
function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    const KEY = "lovable:chunk-reloaded";
    try {
      return await factory();
    } catch (err) {
      if (typeof window !== "undefined" && !sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

const Overview = lazyWithRetry(() => import("./pages/Overview"));
const PersonalProfile = lazyWithRetry(() => import("./pages/PersonalProfile"));
const EditMyProfile = lazyWithRetry(() => import("./pages/EditMyProfile"));
const CoreSkillsByPosition = lazyWithRetry(() => import("./pages/CoreSkillsByPosition"));
const ExtraSkillsPage = lazyWithRetry(() => import("./pages/ExtraSkillsPage"));
const SelfAssessmentPage = lazyWithRetry(() => import("./pages/SelfAssessmentPage"));
const DevelopmentPlanPage = lazyWithRetry(() => import("./pages/DevelopmentPlanPage"));
const AIApplicationPage = lazyWithRetry(() => import("./pages/AIApplicationPage"));
const AttitudeMindset = lazyWithRetry(() => import("./pages/AttitudeMindset"));
const TeamOverview = lazyWithRetry(() => import("./pages/TeamOverview"));
const StaffGrouping = lazyWithRetry(() => import("./pages/StaffGrouping"));
const StaffList = lazyWithRetry(() => import("./pages/StaffList"));
const AddStaff = lazyWithRetry(() => import("./pages/AddStaff"));
const BulkAddStaffTable = lazyWithRetry(() => import("./pages/BulkAddStaffTable"));
const EditStaff = lazyWithRetry(() => import("./pages/EditStaff"));
const RoleManagement = lazyWithRetry(() => import("./pages/RoleManagement"));
const StaffEvaluation = lazyWithRetry(() => import("./pages/StaffEvaluation"));
const EvaluationTrackingPage = lazyWithRetry(() => import("./pages/EvaluationTrackingPage"));
const StaffDetail = lazyWithRetry(() => import("./pages/StaffDetail"));
const UploadStaffPage = lazyWithRetry(() => import("./pages/UploadStaffPage"));
const ConfigCoreSkillsPage = lazyWithRetry(() => import("./pages/ConfigCoreSkillsPage"));
const SkillMediaPage = lazyWithRetry(() => import("./pages/SkillMediaPage"));
const SkillCriteriaAdminPage = lazyWithRetry(() => import("./pages/SkillCriteriaAdminPage"));
const ReportsPage = lazyWithRetry(() => import("./pages/ReportsPage"));
const SettingsPage = lazyWithRetry(() => import("./pages/SettingsPage"));
const BM01Page = lazyWithRetry(() => import("./pages/BM01Page"));
const BM02Page = lazyWithRetry(() => import("./pages/BM02Page"));
const BM03Page = lazyWithRetry(() => import("./pages/BM03Page"));
const ApproveRegistrations = lazyWithRetry(() => import("./pages/ApproveRegistrations"));
const AIPromptsAdmin = lazyWithRetry(() => import("./pages/AIPromptsAdmin"));
const EmailAdmin = lazyWithRetry(() => import("./pages/EmailAdmin"));
const CycleManagementPage = lazyWithRetry(() => import("./pages/CycleManagementPage"));
const OrgStructurePage = lazyWithRetry(() => import("./pages/OrgStructurePage"));
const OneOnOneQuestionsAdminPage = lazyWithRetry(() => import("./pages/OneOnOneQuestionsAdminPage"));
const EvaluatorAssignmentPage = lazyWithRetry(() => import("./pages/EvaluatorAssignmentPage"));
const SubmissionTimeReportPage = lazyWithRetry(() => import("./pages/SubmissionTimeReportPage"));
const VtbCoursesAdminPage = lazyWithRetry(() => import("./pages/VtbCoursesAdminPage"));
const PersonalKanbanPage = lazyWithRetry(() => import("./pages/PersonalKanbanPage"));
const LeadershipMarksPage = lazyWithRetry(() => import("./pages/LeadershipMarksPage"));
const TrainingNeedsPage = lazyWithRetry(() => import("./pages/TrainingNeedsPage"));
const SkillRiskHeatmapPage = lazyWithRetry(() => import("./pages/SkillRiskHeatmapPage"));
const CareerPathPage = lazyWithRetry(() => import("./pages/CareerPathPage"));
const TransferSimulationPage = lazyWithRetry(() => import("./pages/TransferSimulationPage"));
const QuarterlyNewsletterPage = lazyWithRetry(() => import("./pages/QuarterlyNewsletterPage"));
const LearningCampaignsPage = lazyWithRetry(() => import("./pages/LearningCampaignsPage"));
const QuizziHomePage = lazyWithRetry(() => import("./pages/QuizziHomePage"));
const QuizComposerPage = lazyWithRetry(() => import("./pages/QuizComposerPage"));
const QuizPlayPage = lazyWithRetry(() => import("./pages/QuizPlayPage"));
const QuizResultsPage = lazyWithRetry(() => import("./pages/QuizResultsPage"));
const QuizCampaignsPage = lazyWithRetry(() => import("./pages/QuizCampaignsPage"));
const QuizCampaignComposerPage = lazyWithRetry(() => import("./pages/QuizCampaignComposerPage"));
const QuizCampaignPlayPage = lazyWithRetry(() => import("./pages/QuizCampaignPlayPage"));
const QuizCampaignResultsPage = lazyWithRetry(() => import("./pages/QuizCampaignResultsPage"));
const CouncilEvaluationPage = lazyWithRetry(() => import("./pages/CouncilEvaluationPage"));
const CouncilReportPage = lazyWithRetry(() => import("./pages/CouncilReportPage"));
const CouncilAdminPage = lazyWithRetry(() => import("./pages/CouncilAdminPage"));
const CouncilAnalyticsPage = lazyWithRetry(() => import("./pages/CouncilAnalyticsPage"));
const ChangePassword = lazyWithRetry(() => import("./pages/ChangePassword"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));


const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading, mustChangePassword } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải...</div>;
  if (!user) return <Navigate to="/dang-nhap" replace />;
  // Đang dùng mật khẩu tạm: chặn mọi trang, ép về trang đổi mật khẩu trước.
  if (mustChangePassword && location.pathname !== '/doi-mat-khau') {
    return <Navigate to="/doi-mat-khau" replace />;
  }
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải...</div>}><AppLayout /></Suspense>;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải...</div>;
  if (user) return <Navigate to="/tong-quan" replace />;
  return <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <IdleLogoutGuard />
          <Routes>
            <Route path="/dang-nhap" element={<LoginRoute />} />
            <Route path="/dang-ky-tai-khoan" element={<Navigate to="/dang-nhap" replace />} />
            <Route path="/quen-mat-khau" element={<Suspense fallback={null}><ForgotPassword /></Suspense>} />
            <Route path="/dat-lai-mat-khau" element={<Suspense fallback={null}><ResetPassword /></Suspense>} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route element={<ProtectedRoutes />}>
              <Route path="/" element={<Navigate to="/tong-quan" replace />} />

              {/* Group 1: Cá nhân / Năng lực */}
              <Route path="/tong-quan" element={<Overview />} />
              <Route path="/ho-so-ca-nhan" element={<PersonalProfile />} />
              <Route path="/ho-so-ca-nhan/sua" element={<EditMyProfile />} />
              <Route path="/doi-mat-khau" element={<ChangePassword />} />
              <Route path="/ho-so-ca-nhan/:id" element={<PersonalProfile />} />
              <Route path="/skill-loi-theo-vi-tri" element={<CoreSkillsByPosition />} />
              <Route path="/skill-bo-sung" element={<ExtraSkillsPage />} />
              <Route path="/tu-danh-gia" element={<SelfAssessmentPage />} />
              <Route path="/ke-hoach-phat-trien" element={<DevelopmentPlanPage />} />
              <Route path="/ung-dung-ai" element={<AIApplicationPage />} />
              <Route path="/thai-do-tu-duy" element={<AttitudeMindset />} />
              <Route path="/hanh-dong-phat-trien" element={<PersonalKanbanPage />} />
              <Route path="/dau-an" element={<LeadershipMarksPage />} />
              <Route path="/chien-dich-hoc-tap" element={<LearningCampaignsPage />} />
              <Route path="/quizzi" element={<QuizziHomePage />} />
              <Route path="/quizzi/tao-moi" element={<QuizComposerPage />} />
              <Route path="/quizzi/chien-dich" element={<QuizCampaignsPage />} />
              <Route path="/quizzi/chien-dich/tao-moi" element={<QuizCampaignComposerPage />} />
              <Route path="/quizzi/chien-dich/:id/sua" element={<QuizCampaignComposerPage />} />
              <Route path="/quizzi/chien-dich/:id/ket-qua" element={<QuizCampaignResultsPage />} />
              <Route path="/quizzi/chien-dich/:id" element={<QuizCampaignPlayPage />} />
              <Route path="/quizzi/:id/sua" element={<QuizComposerPage />} />
              <Route path="/quizzi/:id/ket-qua" element={<QuizResultsPage />} />
              <Route path="/quizzi/:id" element={<QuizPlayPage />} />

              {/* Hội đồng đánh giá đầu mối — trang tự gác quyền: thành viên HĐ chấm điểm, đầu mối/admin xem báo cáo */}
              <Route path="/danh-gia-dau-moi" element={<CouncilEvaluationPage />} />
              <Route path="/bao-cao-dau-moi" element={<CouncilReportPage />} />

              <Route path="/bieu-mau-01" element={<BM01Page />} />
              <Route path="/bieu-mau-02" element={<BM02Page />} />
              <Route path="/bieu-mau-03" element={<BM03Page />} />

              {/* Group 2: Quản trị đội ngũ — manager / pgd / admin */}
              <Route element={<ManagerOrAboveRoute />}>
                <Route path="/doi-ngu-phong-ban" element={<TeamOverview />} />
                <Route path="/phan-nhom-can-bo" element={<StaffGrouping />} />
                <Route path="/chi-tiet-can-bo/:id" element={<StaffDetail />} />
                <Route path="/danh-sach-can-bo" element={<StaffList />} />
                <Route path="/sua-can-bo/:id" element={<EditStaff />} />
                <Route path="/danh-gia/:id" element={<StaffEvaluation />} />
                <Route path="/danh-gia-can-bo" element={<EvaluationTrackingPage />} />
                <Route path="/bao-cao" element={<ReportsPage />} />
                {/* Trang tự kiểm soát phạm vi: GĐ/PGĐ thấy phòng phụ trách; TCTH lead + admin thấy full */}
                <Route path="/bao-cao-nop-bieu-mau" element={<SubmissionTimeReportPage />} />
                {/* Chiến lược nhân sự — tự gác quyền trong trang: BGĐ + Phòng TCTH */}
                <Route path="/ban-do-rui-ro-nang-luc" element={<SkillRiskHeatmapPage />} />
                <Route path="/con-duong-su-nghiep" element={<CareerPathPage />} />
                <Route path="/mo-phong-dieu-chuyen" element={<TransferSimulationPage />} />
              </Route>

              {/* Admin-only routes */}
              <Route element={<AdminRoute />}>
                <Route path="/them-can-bo" element={<AddStaff />} />
                <Route path="/nhap-nhanh-can-bo" element={<BulkAddStaffTable />} />
                <Route path="/phan-quyen" element={<RoleManagement />} />
                <Route path="/upload-danh-sach-cb" element={<UploadStaffPage />} />
                <Route path="/cau-hinh-skill-loi" element={<ConfigCoreSkillsPage />} />
                <Route path="/quan-tri-hinh-anh-skill" element={<SkillMediaPage />} />
                <Route path="/quan-tri-tieu-chi-level" element={<SkillCriteriaAdminPage />} />
                <Route path="/cai-dat" element={<SettingsPage />} />
                <Route path="/duyet-yeu-cau-user" element={<ApproveRegistrations />} />
                <Route path="/quan-tri-ai" element={<AIPromptsAdmin />} />
                <Route path="/quan-tri-email" element={<EmailAdmin />} />
                <Route path="/quan-tri-khoa-hoc-vtb" element={<VtbCoursesAdminPage />} />
                <Route path="/tong-hop-nhu-cau-dao-tao" element={<TrainingNeedsPage />} />
                <Route path="/quan-ly-ky-danh-gia" element={<CycleManagementPage />} />
                <Route path="/quan-ly-phong-ban" element={<OrgStructurePage />} />
                <Route path="/quan-tri-cau-hoi-1-1" element={<OneOnOneQuestionsAdminPage />} />
                <Route path="/phan-cong-danh-gia" element={<EvaluatorAssignmentPage />} />
                <Route path="/quan-tri-hoi-dong-dau-moi" element={<CouncilAdminPage />} />
                <Route path="/phan-tich-dau-moi" element={<CouncilAnalyticsPage />} />
                <Route path="/ban-tin-quy" element={<QuarterlyNewsletterPage />} />
              </Route>

            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
