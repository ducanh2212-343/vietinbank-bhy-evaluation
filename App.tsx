import { lazy, Suspense, ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute, ManagerOrAboveRoute } from "@/components/AdminRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
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
const EditStaff = lazyWithRetry(() => import("./pages/EditStaff"));
const RoleManagement = lazyWithRetry(() => import("./pages/RoleManagement"));
const StaffEvaluation = lazyWithRetry(() => import("./pages/StaffEvaluation"));
const EvaluationTrackingPage = lazyWithRetry(() => import("./pages/EvaluationTrackingPage"));
const StaffDetail = lazyWithRetry(() => import("./pages/StaffDetail"));
const UploadStaffPage = lazyWithRetry(() => import("./pages/UploadStaffPage"));
const ConfigCoreSkillsPage = lazyWithRetry(() => import("./pages/ConfigCoreSkillsPage"));
const SkillMediaPage = lazyWithRetry(() => import("./pages/SkillMediaPage"));
const ReportsPage = lazyWithRetry(() => import("./pages/ReportsPage"));
const SettingsPage = lazyWithRetry(() => import("./pages/SettingsPage"));
const BM01Page = lazyWithRetry(() => import("./pages/BM01Page"));
const BM02Page = lazyWithRetry(() => import("./pages/BM02Page"));
const BM03Page = lazyWithRetry(() => import("./pages/BM03Page"));
const ApproveRegistrations = lazyWithRetry(() => import("./pages/ApproveRegistrations"));
const AIPromptsAdmin = lazyWithRetry(() => import("./pages/AIPromptsAdmin"));
const VtbCoursesAdminPage = lazyWithRetry(() => import("./pages/VtbCoursesAdminPage"));
const PersonalKanbanPage = lazyWithRetry(() => import("./pages/PersonalKanbanPage"));
const ChangePassword = lazyWithRetry(() => import("./pages/ChangePassword"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));


const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải...</div>;
  if (!user) return <Navigate to="/dang-nhap" replace />;
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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/dang-nhap" element={<LoginRoute />} />
            <Route path="/dang-ky-tai-khoan" element={<Register />} />
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
              </Route>

              {/* Admin-only routes */}
              <Route element={<AdminRoute />}>
                <Route path="/them-can-bo" element={<AddStaff />} />
                <Route path="/phan-quyen" element={<RoleManagement />} />
                <Route path="/upload-danh-sach-cb" element={<UploadStaffPage />} />
                <Route path="/cau-hinh-skill-loi" element={<ConfigCoreSkillsPage />} />
                <Route path="/quan-tri-hinh-anh-skill" element={<SkillMediaPage />} />
                <Route path="/cai-dat" element={<SettingsPage />} />
                <Route path="/duyet-yeu-cau-user" element={<ApproveRegistrations />} />
                <Route path="/quan-tri-ai" element={<AIPromptsAdmin />} />
                <Route path="/quan-tri-khoa-hoc-vtb" element={<VtbCoursesAdminPage />} />
              </Route>

            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
