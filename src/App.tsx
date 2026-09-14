import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BrandingProvider } from "@/hooks/useBranding";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import JobsPage from "./pages/JobsPage";
import PublicJobsPage from "./pages/PublicJobsPage";
import JobSeekerDashboardPage from "./pages/JobSeekerDashboardPage";
import InterviewChatPage from "./pages/InterviewChatPage";
import MentorshipPage from "./pages/MentorshipPage";
import LearningPage from "./pages/LearningPage";
import LearnerDashboardPage from "./pages/LearnerDashboardPage";
import CreatorDashboardPage from "./pages/CreatorDashboardPage";
import LearningAdminPage from "./pages/LearningAdminPage";
import AdminPage from "./pages/AdminPage";
import RecruiterPage from "./pages/RecruiterPage";
import RecruitmentAdminPage from "./pages/RecruitmentAdminPage";
import MyApplicationsPage from "./pages/MyApplicationsPage";
import ChatPage from "./pages/ChatPage";
import CVGeneratorPage from "./pages/CVGeneratorPage";
import SearchPage from "./pages/SearchPage";
import CoursePage from "./pages/CoursePage";
import MentorshipAdminPage from "./pages/MentorshipAdminPage";
import VerifyCertificatePage from "./pages/VerifyCertificatePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AnalyticsDashboardPage from "./pages/AnalyticsDashboardPage";
import SmartJobMatchPage from "./pages/SmartJobMatchPage";
import AIInterviewCoachPage from "./pages/AIInterviewCoachPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import BulkOperationsPage from "./pages/BulkOperationsPage";
import NotificationsPage from "./pages/NotificationsPage";
import WorkflowAutomationPage from "./pages/WorkflowAutomationPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import TalentMarketplacePage from "./pages/TalentMarketplacePage";
import CompanyProfilesPage from "./pages/CompanyProfilesPage";
import RecruitmentAnalyticsPage from "./pages/RecruitmentAnalyticsPage";
import CareerProfilePage from "./pages/CareerProfilePage";
import CBTAdminPage from "./pages/CBTAdminPage";
import CitizenDBAdminPage from "./pages/CitizenDBAdminPage";
import LGAOfficerPage from "./pages/LGAOfficerPage";
import WardOfficerPage from "./pages/WardOfficerPage";
import MentorshipMarketplacePage from "./pages/MentorshipMarketplacePage";
import VideoMeetingsPage from "./pages/VideoMeetingsPage";
import CommunityPage from "./pages/CommunityPage";
import BrandingAdminPage from "./pages/BrandingAdminPage";
import Navbar from "./components/Navbar";
import DashboardLayout from "./components/dashboard/DashboardLayout";

const queryClient = new QueryClient();

const LayoutWithNav = ({ children }: { children: React.ReactNode }) => (
  <>
    <Navbar />
    {children}
  </>
);

const DashLayout = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout>{children}</DashboardLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrandingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LayoutWithNav><LoginPage /></LayoutWithNav>} />
            <Route path="/register" element={<LayoutWithNav><RegisterPage /></LayoutWithNav>} />
            <Route path="/jobs-board" element={<PublicJobsPage />} />
            <Route path="/verify-certificate/:certNumber" element={<VerifyCertificatePage />} />
            <Route path="/verify-certificate" element={<VerifyCertificatePage />} />
            <Route path="/reset-password" element={<LayoutWithNav><ResetPasswordPage /></LayoutWithNav>} />

            {/* Dashboard routes with sidebar layout */}
            <Route path="/dashboard" element={<DashLayout><DashboardPage /></DashLayout>} />
            <Route path="/profile" element={<DashLayout><ProfilePage /></DashLayout>} />
            <Route path="/cv" element={<DashLayout><CVGeneratorPage /></DashLayout>} />
            <Route path="/jobs" element={<DashLayout><JobsPage /></DashLayout>} />
            <Route path="/job-seeker" element={<DashLayout><JobSeekerDashboardPage /></DashLayout>} />
            <Route path="/applications" element={<DashLayout><MyApplicationsPage /></DashLayout>} />
            <Route path="/interview-chat" element={<DashLayout><InterviewChatPage /></DashLayout>} />
            <Route path="/mentorship" element={<DashLayout><MentorshipPage /></DashLayout>} />
            <Route path="/chat" element={<DashLayout><ChatPage /></DashLayout>} />
            <Route path="/learning" element={<DashLayout><LearnerDashboardPage /></DashLayout>} />
            <Route path="/learning/creator" element={<DashLayout><CreatorDashboardPage /></DashLayout>} />
            <Route path="/learning/admin" element={<DashLayout><LearningAdminPage /></DashLayout>} />
            <Route path="/course/:courseId" element={<DashLayout><CoursePage /></DashLayout>} />
            <Route path="/search" element={<DashLayout><SearchPage /></DashLayout>} />
            <Route path="/admin" element={<DashLayout><AdminPage /></DashLayout>} />
            <Route path="/recruitment-admin" element={<DashLayout><RecruitmentAdminPage /></DashLayout>} />
            <Route path="/recruiter" element={<DashLayout><RecruiterPage /></DashLayout>} />
            <Route path="/mentorship-admin" element={<DashLayout><MentorshipAdminPage /></DashLayout>} />
            <Route path="/analytics" element={<DashLayout><AnalyticsDashboardPage /></DashLayout>} />
            <Route path="/smart-match" element={<DashLayout><SmartJobMatchPage /></DashLayout>} />
            <Route path="/ai-coach" element={<DashLayout><AIInterviewCoachPage /></DashLayout>} />
            <Route path="/announcements" element={<DashLayout><AnnouncementsPage /></DashLayout>} />
            <Route path="/bulk-operations" element={<DashLayout><BulkOperationsPage /></DashLayout>} />
            <Route path="/notifications" element={<DashLayout><NotificationsPage /></DashLayout>} />
            <Route path="/workflows" element={<DashLayout><WorkflowAutomationPage /></DashLayout>} />
            <Route path="/audit-logs" element={<DashLayout><AuditLogsPage /></DashLayout>} />
            <Route path="/talent-marketplace" element={<DashLayout><TalentMarketplacePage /></DashLayout>} />
            <Route path="/companies" element={<DashLayout><CompanyProfilesPage /></DashLayout>} />
            <Route path="/recruitment-analytics" element={<DashLayout><RecruitmentAnalyticsPage /></DashLayout>} />
            <Route path="/career-profile" element={<DashLayout><CareerProfilePage /></DashLayout>} />
            <Route path="/cbt-admin" element={<DashLayout><CBTAdminPage /></DashLayout>} />
            <Route path="/citizen-db" element={<DashLayout><CitizenDBAdminPage /></DashLayout>} />
            <Route path="/lga-officer" element={<DashLayout><LGAOfficerPage /></DashLayout>} />
            <Route path="/ward-officer" element={<DashLayout><WardOfficerPage /></DashLayout>} />
            <Route path="/mentorship-marketplace" element={<DashLayout><MentorshipMarketplacePage /></DashLayout>} />
            <Route path="/video-meetings" element={<DashLayout><VideoMeetingsPage /></DashLayout>} />
            <Route path="/community" element={<DashLayout><CommunityPage /></DashLayout>} />
            <Route path="/branding" element={<DashLayout><BrandingAdminPage /></DashLayout>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </BrandingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
