import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser, selectIsAuthenticated } from './redux/userSlice';
import Navbar from './Components/Navbar/Navbar';
import Footer from './Components/Footer';
import ProtectedRoute from './Components/protectedRoutes';
import ProfileCompletionModal from './Components/ProfileCompletionModal';
import ErrorBoundary from './Components/ErrorBoundary';
import PageTitle from './Components/PageTitle';
import { SkeletonDashboard, SkeletonGigGrid } from './Components/Skeleton';
import ClientJobs from './Components/JobPage/ClientJobs';

const Homepage = lazy(() => import('./Components/Homepage'));
const Homepage2 = lazy(() => import('./Components/Homepage2'));
const Aieditor = lazy(() => import('./Components/Aieditor'));
const BusinessGrowth = lazy(() => import('./Components/BusinessGrowth'));
const Testimonials = lazy(() => import('./Components/Testimonials'));
const JoinPage = lazy(() => import('./Components/Join/Join'));
const SignupPage = lazy(() => import('./Components/Signup/Signup'));
const Login = lazy(() => import('./Components/Login/Login'));
const CreateProfile = lazy(() => import('./Components/CreateProfile/Page'));
const VideoEditorDashboard = lazy(() => import('./Components/EditorDashboard/editorDashboard'));
const ContactUs = lazy(() => import('./Components/Contactus/Contactus'));
const ReviewPage = lazy(() => import('./Components/ReviewPage'));
const ChatInterface = lazy(() => import('./Components/ChatPage/ChatInterface'));
const PricingTiers = lazy(() => import('./Components/Profile/pricing-tiers'));
const Dashboard = lazy(() => import('./Components/ClientDashboard/page'));
const AboutUs = lazy(() => import('./Components/AboutUs/Aboutus'));
const JobPage = lazy(() => import('./Components/JobPage/Jobpage'));
const ProfilePage = lazy(() => import('./Components/Profile/profile-page'));
const EmailVerification = lazy(() => import('./Components/Signup/EmailVerification'));
const VerifyEmail = lazy(() => import('./Components/Signup/VerifyEmail'));
const PasswordRecovery = lazy(() => import('./Components/Login/password_recovery'));
const PasswordRecoveryVerify = lazy(() => import('./Components/Login/PasswordRecoveryVerify'));
const JobPosting = lazy(() => import('./Components/JobPost/Page'));
const PaymentPage = lazy(() => import('./Components/PaymentPage/Payment'));
const JobProfile = lazy(() => import('./Components/JobProfilePage/Page'));
const ProjectWorkspace = lazy(() => import('./Components/ProjectManagement/ProjectWorkspace'));
const FAQPage = lazy(() => import('./Components/Faqs/FaqsPage'));
const EditorPaymentDetails = lazy(() => import('./Components/EditorPaymentDetails/Page'));
const FindEditorsPage = lazy(() => import('./Components/EditorsPage/Page'));
const WorkYourWay = lazy(() => import('./Components/WorkYourWay'));
const PopularServices = lazy(() => import('./Components/PopularService'));
const Suite = lazy(() => import('./Components/Suite'));
const TrendingGigs = lazy(() => import('./Components/GigsSection'));
const OnboardingPage = lazy(() => import('./Components/TypeOfEditorPopup'));
const TeamMembers = lazy(() => import('./Components/TeamMembers/TeamMembers'));
const PortfolioPage = lazy(() => import('./Components/Portfolio'));
const PortfolioManager = lazy(() => import('./Components/Portfolio/PortfolioManager'));
const BlogPage = lazy(() => import('./Components/Blog'));
const DashboardPage = lazy(() => import('./Components/Dashboard'));
const ChatClientDashboard = lazy(() => import('./Components/ChatClientSection/page'));
const ChatDashboard = lazy(() => import('./Components/ChatEditorSection/dashboard'));
const ClientProfile = lazy(() => import('./Components/ClientProfile/Page'));
const GigDashboard = lazy(() => import('./Components/GigsDashboard/Page'));
const CreateGigForm = lazy(() => import('./Components/GigsDashboard/GigForm'));
const Settings = lazy(() => import('./Components/Settings/settings'));
const JobDescriptionPage = lazy(() => import('./Components/JobDescription/Page'));
const GigMainPage = lazy(() => import('./Components/GigSection/Page'));
const PreviewGig = lazy(() => import('./Components/GigsDashboard/PreviewGig'));
const VideoEditingGig = lazy(() => import('./Components/GigSection/GigDescriptionPage'));
const ProjectBriefForm = lazy(() => import('./Components/GigSection/Project-brief- form'));
const GigPaymentPage = lazy(() => import('./Components/GigSection/Payment-page'));
const Shortlist = lazy(() => import('./Components/ClientDashboard/ShortList'));
const JobApplicants = lazy(() => import('./Components/ClientDashboard/JobApplicants'));
const GigDetailWrapper = lazy(() => import('./Components/EditorGigDetail/gigDetail'));
const CommunityDashboard = lazy(() => import('./Components/Community/community-dashboard'));
const NotificationsPage = lazy(() => import('./Components/Notifications/NotificationsPage'));
const ComingSoonPage = lazy(() => import('./Components/Placeholder/ComingSoonPage'));
const VideoReviewPlayer = lazy(() => import('./Components/VideoReview/VideoReviewPlayer'));
const GanttTimeline = lazy(() => import('./Components/ProjectTimeline/GanttTimeline'));
const BriefWizard = lazy(() => import('./Components/BriefBuilder/BriefWizard'));
const RenderFarmDashboard = lazy(() => import('./Components/RenderFarm/RenderFarmDashboard'));
const SkillTestHub = lazy(() => import('./Components/SkillTests/SkillTestHub'));
const TeamProposalBuilder = lazy(() => import('./Components/TeamCollaboration/TeamProposalBuilder'));
const EditorMatcher = lazy(() => import('./Components/Matching/EditorMatcher'));
const ReelBuilder = lazy(() => import('./Components/DemoReel/ReelBuilder'));
const TemplateMarketplace = lazy(() => import('./Components/TemplateMarketplace/TemplateMarketplace'));
const RevisionTracker = lazy(() => import('./Components/RevisionTracker/RevisionTracker'));
const BadgeAchievements = lazy(() => import('./Components/Badges/BadgeAchievements'));
const ReferralDashboard = lazy(() => import('./Components/Referrals/ReferralDashboard'));
const PricingPage = lazy(() => import('./Components/Subscriptions/PricingPage'));
const EnterpriseDashboard = lazy(() => import('./Components/Enterprise/EnterpriseDashboard'));
const RevenueDashboard = lazy(() => import('./Components/Revenue/RevenueDashboard'));
const InvoiceDashboard = lazy(() => import('./Components/Invoices/InvoiceDashboard'));
const AvailabilityCalendar = lazy(() => import('./Components/Calendar/AvailabilityCalendar'));
const ContractManager = lazy(() => import('./Components/Contracts/ContractManager'));
const ProjectFileManager = lazy(() => import('./Components/FileManager/ProjectFileManager'));

function PageSuspense({ children, skeleton }) {
  return (
    <Suspense fallback={skeleton || <FullPageLoader />}>
      {children}
    </Suspense>
  );
}

function FullPageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function RouteErrorFallback({ error, reset }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Page Error</h2>
        <p className="text-gray-500 mb-4">
          {import.meta.env.DEV ? error?.message : "This page encountered an error."}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Retry
          </button>
          <button onClick={() => (window.location.href = "/")} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}

function NavbarPage() {
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (
      isAuthenticated &&
      user?.role === "FREELANCER" &&
      !user.isProfileComplete &&
      localStorage.getItem("hasSkippedFreelancerModal") !== "true"
    ) {
      setShowModal(true);
    }
  }, [user, isAuthenticated]);

  const handleModalClose = (skip = false) => {
    if (skip) {
      localStorage.setItem("hasSkippedFreelancerModal", "true");
    }
    setShowModal(false);
  };

  return (
    <Router>
      <Navbar />
      <div style={{ paddingTop: "5rem" }}>
        <ErrorBoundary fallback={RouteErrorFallback}>
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                <PageSuspense>
                  <PageTitle />
                  <Homepage />
                  <TrendingGigs />
                  <Aieditor />
                  <PopularServices />
                  <Homepage2 />
                  <BusinessGrowth />
                  <WorkYourWay />
                  <Suite />
                  <Testimonials />
                </PageSuspense>
              }
            />
            <Route path="/hireeditor" element={<PageSuspense skeleton={<SkeletonGigGrid />}><PageTitle title="Hire an Editor" /><GigMainPage /></PageSuspense>} />
            <Route path="/join" element={<PageSuspense><PageTitle title="Join" /><JoinPage /></PageSuspense>} />
            <Route path="/login" element={<PageSuspense><PageTitle title="Log In" /><Login /></PageSuspense>} />
            <Route path="/signup" element={<PageSuspense><PageTitle title="Sign Up" /><SignupPage /></PageSuspense>} />
            <Route path="/freelancerProfile" element={<PageSuspense><PageTitle title="Freelancer Profile" /><ProfilePage /></PageSuspense>} />
            <Route path="/freelancerProfile/:freelancerId" element={<PageSuspense><PageTitle title="Freelancer Profile" /><ProfilePage /></PageSuspense>} />
            <Route path="/contact" element={<PageSuspense><PageTitle title="Contact Us" /><ContactUs /></PageSuspense>} />
            <Route path="/findwork" element={<PageSuspense><PageTitle title="Find Work" /><JobPage /></PageSuspense>} />
            <Route path="/faqs" element={<PageSuspense><PageTitle title="FAQs" /><FAQPage /></PageSuspense>} />
            <Route path="/review" element={<PageSuspense><PageTitle title="Reviews" /><ReviewPage /></PageSuspense>} />
            <Route path="/about" element={<PageSuspense><PageTitle title="About Us" /><AboutUs /></PageSuspense>} />
            <Route path="/pricing" element={<PageSuspense><PageTitle title="Pricing" /><PricingTiers /></PageSuspense>} />
            <Route path="/editors" element={<PageSuspense><PageTitle title="Find Editors" /><FindEditorsPage /></PageSuspense>} />
            <Route path="/team" element={<PageSuspense><PageTitle title="Our Team" /><TeamMembers /></PageSuspense>} />
            <Route path="/portfolio" element={<PageSuspense><PageTitle title="Portfolio" /><PortfolioPage /></PageSuspense>} />
            <Route path="/blog" element={<PageSuspense><PageTitle title="Blog" /><BlogPage /></PageSuspense>} />
            <Route path="/pop" element={<PageSuspense><OnboardingPage /></PageSuspense>} />
            <Route path="/job/:jobId" element={<PageSuspense><PageTitle title="Job Details" /><JobDescriptionPage /></PageSuspense>} />
            <Route path="/gig" element={<PageSuspense skeleton={<SkeletonGigGrid />}><PageTitle title="Browse Gigs" /><GigMainPage /></PageSuspense>} />
            <Route path="/gig/preview" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Preview Gig" /><PreviewGig /></PageSuspense></ProtectedRoute>} />
            <Route path="/gig/:gigId" element={<PageSuspense><PageTitle title="Gig Details" /><VideoEditingGig /></PageSuspense>} />

            {/* Email verification */}
            {/* L2 FIX: email moved from URL path to ?email= query param */}
            <Route path="/verify-email" element={<PageSuspense><PageTitle title="Verify Email" /><EmailVerification /></PageSuspense>} />
            <Route path="/verify-email/confirm" element={<PageSuspense><PageTitle title="Verify Email" /><VerifyEmail /></PageSuspense>} />
            <Route path="/password-recovery" element={<PageSuspense><PageTitle title="Password Recovery" /><PasswordRecovery /></PageSuspense>} />
            <Route path="/password-recovery/verify" element={<PageSuspense><PageTitle title="Reset Password" /><PasswordRecoveryVerify /></PageSuspense>} />

            {/* Protected - any authenticated user */}
            <Route path="/create-profile" element={<ProtectedRoute><PageSuspense><PageTitle title="Create Profile" /><CreateProfile /></PageSuspense></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><PageSuspense><PageTitle title="Payment" /><PaymentPage /></PageSuspense></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><PageSuspense><PageTitle title="Messages" /><ChatInterface /></PageSuspense></ProtectedRoute>} />
            <Route path="/project-workspace" element={<ProtectedRoute><PageSuspense><PageTitle title="Project Workspace" /><ProjectWorkspace /></PageSuspense></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><PageSuspense><PageTitle title="Settings" /><Settings /></PageSuspense></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><PageSuspense skeleton={<SkeletonDashboard />}><PageTitle title="Dashboard" /><DashboardPage /></PageSuspense></ProtectedRoute>} />
            <Route path="/jobprofile" element={<ProtectedRoute><PageSuspense><PageTitle title="Job Profile" /><JobProfile /></PageSuspense></ProtectedRoute>} />
            <Route path="/community-dashboard" element={<ProtectedRoute><PageSuspense><PageTitle title="Community" /><CommunityDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><PageSuspense><PageTitle title="Notifications" /><NotificationsPage /></PageSuspense></ProtectedRoute>} />
            <Route path="/referrals" element={<ProtectedRoute><PageSuspense><PageTitle title="Referrals" /><ReferralDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><PageSuspense><PageTitle title="Achievements" /><BadgeAchievements /></PageSuspense></ProtectedRoute>} />
            <Route path="/subscriptions" element={<PageSuspense><PageTitle title="Subscriptions" /><PricingPage /></PageSuspense>} />
            <Route path="/enterprise" element={<ProtectedRoute><PageSuspense><PageTitle title="Enterprise" /><EnterpriseDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/admin/revenue" element={<ProtectedRoute allowedRoles={['ADMIN']}><PageSuspense><PageTitle title="Revenue Dashboard" /><RevenueDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><PageSuspense><PageTitle title="Invoices" /><InvoiceDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/availability" element={<ProtectedRoute><PageSuspense><PageTitle title="Availability" /><AvailabilityCalendar /></PageSuspense></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute><PageSuspense><PageTitle title="Contracts" /><ContractManager /></PageSuspense></ProtectedRoute>} />
            <Route
              path="/project-files/:orderId"
              element={
                <ProtectedRoute>
                  <PageSuspense>
                    <PageTitle title="Project Files" />
                    <ProjectFileManager />
                  </PageSuspense>
                </ProtectedRoute>
              }
            />
            <Route path="/disputes" element={<ProtectedRoute><PageSuspense><PageTitle title="Disputes" /><ComingSoonPage title="Disputes" /></PageSuspense></ProtectedRoute>} />
            <Route path="/escrow" element={<ProtectedRoute><PageSuspense><PageTitle title="Escrow" /><ComingSoonPage title="Escrow" /></PageSuspense></ProtectedRoute>} />
            <Route path="/video-review/:orderId" element={<ProtectedRoute><PageSuspense><PageTitle title="Video Review" /><VideoReviewPlayer /></PageSuspense></ProtectedRoute>} />
            <Route path="/project-timeline/:jobId" element={<ProtectedRoute><PageSuspense><PageTitle title="Project Timeline" /><GanttTimeline /></PageSuspense></ProtectedRoute>} />
            <Route path="/workspace" element={
              <ProtectedRoute>
                <PageSuspense>
                  <PageTitle title="Workspace" />
                  {user?.role === "FREELANCER"
                    ? <ChatDashboard />
                    : <ChatClientDashboard />}
                </PageSuspense>
              </ProtectedRoute>
            } />

            {/* Protected - FREELANCER only */}
            <Route path="/editor-dashboard" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense skeleton={<SkeletonDashboard />}><PageTitle title="Editor Dashboard" /><VideoEditorDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor-payment" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Payment Details" /><EditorPaymentDetails /></PageSuspense></ProtectedRoute>} />
            <Route path="/editorchat" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Messages" /><ChatDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/gigs-dashboard" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense skeleton={<SkeletonDashboard />}><PageTitle title="My Gigs" /><GigDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/create-gig" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Create Gig" /><CreateGigForm /></PageSuspense></ProtectedRoute>} />
            <Route path="/update-gig/:gigId" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Update Gig" /><CreateGigForm isUpdate={true} /></PageSuspense></ProtectedRoute>} />
            <Route path="/gigs-dashboard/gig-detail/:gigId" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Gig Detail" /><GigDetailWrapper /></PageSuspense></ProtectedRoute>} />
            <Route path="/portfolio-manager" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Portfolio manager" /><PortfolioManager /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/workspace" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Workspace" /><ChatDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/render-farm" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Render Farm" /><RenderFarmDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/skill-tests" element={<ProtectedRoute><PageSuspense><PageTitle title="Skill Tests" /><SkillTestHub /></PageSuspense></ProtectedRoute>} />
            <Route path="/team-proposals/:jobId" element={<ProtectedRoute><PageSuspense><PageTitle title="Team Proposals" /><TeamProposalBuilder /></PageSuspense></ProtectedRoute>} />
            <Route path="/team-proposals" element={<ProtectedRoute><PageSuspense><PageTitle title="Team Proposals" /><TeamProposalBuilder /></PageSuspense></ProtectedRoute>} />
            <Route path="/demo-reels" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Demo Reels" /><ReelBuilder /></PageSuspense></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><PageSuspense><PageTitle title="Template Marketplace" /><TemplateMarketplace /></PageSuspense></ProtectedRoute>} />
            <Route path="/revisions/:orderId" element={<ProtectedRoute><PageSuspense><PageTitle title="Revision Tracker" /><RevisionTracker /></PageSuspense></ProtectedRoute>} />
            <Route path="/find-editor" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Find Editor" /><EditorMatcher /></PageSuspense></ProtectedRoute>} />

            {/* Protected - CLIENT only */}
            <Route path="/client-dashboard" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense skeleton={<SkeletonDashboard />}><PageTitle title="Client Dashboard" /><Dashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/jobposting" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Post a Job" /><JobPosting /></PageSuspense></ProtectedRoute>} />
            <Route path="/clientchat" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Messages" /><ChatClientDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/clientProfile" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Client Profile" /><ClientProfile /></PageSuspense></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="My Jobs" /><ClientJobs /></PageSuspense></ProtectedRoute>} />
            <Route path="/jobs/:jobId/shortlist" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Shortlist" /><Shortlist /></PageSuspense></ProtectedRoute>} />
            <Route path="/shortlist/:jobId" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Job Applicants" /><JobApplicants /></PageSuspense></ProtectedRoute>} />
            <Route path="/client/workspace" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Workspace" /><ChatClientDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/client-dashboard/job-applicants/:jobId" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Job Applicants" /><JobApplicants /></PageSuspense></ProtectedRoute>} />
            <Route path="/brief-builder" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Create Brief" /><BriefWizard /></PageSuspense></ProtectedRoute>} />
            <Route path="/brief-builder/:briefId" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Edit Brief" /><BriefWizard /></PageSuspense></ProtectedRoute>} />

            {/* Protected - Admin (redirects to dashboard — a dedicated admin UI can be added later) */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["ADMIN"]}><PageSuspense skeleton={<SkeletonDashboard />}><PageTitle title="Admin Dashboard" /><Dashboard /></PageSuspense></ProtectedRoute>} />

            {/* Protected - ordering flow (any authenticated user) */}
            <Route path="/gig/:gigId/:pkgName/project-brief" element={<ProtectedRoute><PageSuspense><PageTitle title="Project Brief" /><ProjectBriefForm /></PageSuspense></ProtectedRoute>} />
            <Route path="/gig/:gigId/:pkgName/project-brief/payment" element={<ProtectedRoute><PageSuspense><PageTitle title="Payment" /><GigPaymentPage /></PageSuspense></ProtectedRoute>} />

            {/* 404 Fallback */}
            <Route path="*" element={
              <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Page not found</h2>
                  <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
                  <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Go home
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </ErrorBoundary>
        {showModal && <ProfileCompletionModal onClose={handleModalClose} />}
      </div>
      <Footer />
    </Router>
  );
}

export default NavbarPage;
