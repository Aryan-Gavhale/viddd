import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from './redux/userSlice';
import Navbar from './Components/Navbar/Navbar';
import Footer from './Components/Footer';
import ProtectedRoute from './Components/protectedRoutes';
import ErrorBoundary from './Components/ErrorBoundary';
import PageTitle from './Components/PageTitle';
import { SkeletonDashboard, SkeletonGigGrid } from './Components/Skeleton';

/* ────────────────────────────────────────────────────────────
   Lazy-loaded page components grouped by domain
   ──────────────────────────────────────────────────────────── */

// Landing / Marketing
const Homepage = lazy(() => import('./Components/Homepage'));
const Homepage2 = lazy(() => import('./Components/Homepage2'));
const Aieditor = lazy(() => import('./Components/Aieditor'));
const BusinessGrowth = lazy(() => import('./Components/BusinessGrowth'));
const Testimonials = lazy(() => import('./Components/Testimonials'));
const WorkYourWay = lazy(() => import('./Components/WorkYourWay'));
const PopularServices = lazy(() => import('./Components/PopularService'));
const Suite = lazy(() => import('./Components/Suite'));
const TrendingGigs = lazy(() => import('./Components/GigsSection'));
const AboutUs = lazy(() => import('./Components/AboutUs/Aboutus'));
const PricingTiers = lazy(() => import('./Components/Profile/pricing-tiers'));
const TeamMembers = lazy(() => import('./Components/TeamMembers/TeamMembers'));
const ContactUs = lazy(() => import('./Components/Contactus/Contactus'));
const FAQPage = lazy(() => import('./Components/Faqs/FaqsPage'));
const ReviewPage = lazy(() => import('./Components/ReviewPage'));
const BlogPage = lazy(() => import('./Components/Blog'));
const JoinPage = lazy(() => import('./Components/Join/Join'));
const OnboardingPage = lazy(() => import('./Components/TypeOfEditorPopup'));

// Auth
const SignupPage = lazy(() => import('./Components/Signup/Signup'));
const Login = lazy(() => import('./Components/Login/Login'));
const EmailVerification = lazy(() => import('./Components/Signup/EmailVerification'));
const VerifyEmail = lazy(() => import('./Components/Signup/VerifyEmail'));
const PasswordRecovery = lazy(() => import('./Components/Login/password_recovery'));
const PasswordRecoveryVerify = lazy(() => import('./Components/Login/PasswordRecoveryVerify'));

// Public browse
const GigMainPage = lazy(() => import('./Components/GigSection/Page'));
const VideoEditingGig = lazy(() => import('./Components/GigSection/GigDescriptionPage'));
const JobPage = lazy(() => import('./Components/JobPage/Jobpage'));
const JobDescriptionPage = lazy(() => import('./Components/JobDescription/Page'));
const FindEditorsPage = lazy(() => import('./Components/EditorsPage/Page'));
const ProfilePage = lazy(() => import('./Components/Profile/profile-page'));
const PortfolioPage = lazy(() => import('./Components/Portfolio'));

// Shared authenticated
const CreateProfile = lazy(() => import('./Components/CreateProfile/Page'));
const DashboardPage = lazy(() => import('./Components/Dashboard'));
const Settings = lazy(() => import('./Components/Settings/settings'));
const NotificationsPage = lazy(() => import('./Components/Notifications/NotificationsPage'));
const SavedItemsPage = lazy(() => import('./Components/SavedItems/SavedItemsPage'));
const ChatInterface = lazy(() => import('./Components/ChatPage/ChatInterface'));
import FloatingChatWidget from './Components/Chat/FloatingChatWidget';
const ProjectWorkspace = lazy(() => import('./Components/ProjectManagement/ProjectWorkspace'));
const PaymentPage = lazy(() => import('./Components/PaymentPage/Payment'));
const InvoiceDashboard = lazy(() => import('./Components/Invoices/InvoiceDashboard'));
const ContractManager = lazy(() => import('./Components/Contracts/ContractManager'));
const ComingSoonPage = lazy(() => import('./Components/Placeholder/ComingSoonPage'));
const CommunityDashboard = lazy(() => import('./Components/Community/community-dashboard'));
const ReferralDashboard = lazy(() => import('./Components/Referrals/ReferralDashboard'));
const BadgeAchievements = lazy(() => import('./Components/Badges/BadgeAchievements'));
const PricingPage = lazy(() => import('./Components/Subscriptions/PricingPage'));
const TemplateMarketplace = lazy(() => import('./Components/TemplateMarketplace/TemplateMarketplace'));
const JobProfile = lazy(() => import('./Components/JobProfilePage/Page'));
const TeamProposalBuilder = lazy(() => import('./Components/TeamCollaboration/TeamProposalBuilder'));
const ProjectFileManager = lazy(() => import('./Components/FileManager/ProjectFileManager'));
const RevisionTracker = lazy(() => import('./Components/RevisionTracker/RevisionTracker'));
const GanttTimeline = lazy(() => import('./Components/ProjectTimeline/GanttTimeline'));
const ProjectBriefForm = lazy(() => import('./Components/GigSection/Project-brief- form'));
const GigPaymentPage = lazy(() => import('./Components/GigSection/Payment-page'));
const CheckoutSuccessPage = lazy(() => import('./Components/GigSection/CheckoutSuccessPage'));

/**
 * Tiny shim that pulls `:orderId` out of the URL and redirects into the
 * unified WorkspaceShell at `/workspace?orderId=…`. We keep it here (rather
 * than inline) so the legacy `/orders/:orderId/...` deep-links from emails
 * and notifications continue to work — they'll land on the shared workspace
 * with the right scope preselected.
 */
function RedirectOrderToWorkspace({ basePath = "/workspace" }) {
  const { orderId } = useParams();
  return <Navigate to={`${basePath}?orderId=${orderId}`} replace />;
}

// Editor / Freelancer
const VideoEditorDashboard = lazy(() => import('./Components/EditorDashboard/editorDashboard'));
const EditorPaymentDetails = lazy(() => import('./Components/EditorPaymentDetails/Page'));
const ChatDashboard = lazy(() => import('./Components/ChatEditorSection/dashboard'));
const WorkspaceShell = lazy(() => import('./Components/Workspace/WorkspaceShell'));
const GigDashboard = lazy(() => import('./Components/GigsDashboard/Page'));
const CreateGigForm = lazy(() => import('./Components/GigsDashboard/GigForm'));
const GigDetailWrapper = lazy(() => import('./Components/EditorGigDetail/gigDetail'));
const PreviewGig = lazy(() => import('./Components/GigsDashboard/PreviewGig'));
const PortfolioManager = lazy(() => import('./Components/Portfolio/PortfolioManager'));
const AvailabilityCalendar = lazy(() => import('./Components/Calendar/AvailabilityCalendar'));
const RenderFarmDashboard = lazy(() => import('./Components/RenderFarm/RenderFarmDashboard'));
const SkillTestHub = lazy(() => import('./Components/SkillTests/SkillTestHub'));
const ReelBuilder = lazy(() => import('./Components/DemoReel/ReelBuilder'));

// Client
const ClientDashboard = lazy(() => import('./Components/ClientDashboard/page'));
const ClientProfile = lazy(() => import('./Components/ClientProfile/Page'));
const ChatClientDashboard = lazy(() => import('./Components/ChatClientSection/page'));
const ClientJobs = lazy(() => import('./Components/JobPage/ClientJobs'));
const JobPosting = lazy(() => import('./Components/JobPost/Page'));
const Shortlist = lazy(() => import('./Components/ClientDashboard/ShortList'));
const JobApplicants = lazy(() => import('./Components/ClientDashboard/JobApplicants'));
const BriefWizard = lazy(() => import('./Components/BriefBuilder/BriefWizard'));
const EditorMatcher = lazy(() => import('./Components/Matching/EditorMatcher'));

// Admin
const RevenueDashboard = lazy(() => import('./Components/Revenue/RevenueDashboard'));
const EnterpriseDashboard = lazy(() => import('./Components/Enterprise/EnterpriseDashboard'));

/* ────────────────────────────────────────────────────────────
   Shared layout helpers
   ──────────────────────────────────────────────────────────── */

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

/* ────────────────────────────────────────────────────────────
   Application root
   ──────────────────────────────────────────────────────────── */

function NavbarPage() {
  const user = useSelector(selectUser);

  return (
    <Router>
      <Navbar />
      <div style={{ paddingTop: "5rem" }}>
        <ErrorBoundary fallback={RouteErrorFallback}>
          <Routes>
            {/* ═══════════════════════════════════════════
                PUBLIC — Marketing & Landing
               ═══════════════════════════════════════════ */}
            <Route path="/" element={
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
            } />
            <Route path="/about" element={<PageSuspense><PageTitle title="About Us" /><AboutUs /></PageSuspense>} />
            <Route path="/pricing" element={<PageSuspense><PageTitle title="Pricing" /><PricingTiers /></PageSuspense>} />
            <Route path="/team" element={<PageSuspense><PageTitle title="Our Team" /><TeamMembers /></PageSuspense>} />
            <Route path="/contact" element={<PageSuspense><PageTitle title="Contact Us" /><ContactUs /></PageSuspense>} />
            <Route path="/faqs" element={<PageSuspense><PageTitle title="FAQs" /><FAQPage /></PageSuspense>} />
            <Route path="/reviews" element={<PageSuspense><PageTitle title="Reviews" /><ReviewPage /></PageSuspense>} />
            <Route path="/blog" element={<PageSuspense><PageTitle title="Blog" /><BlogPage /></PageSuspense>} />
            <Route path="/join" element={<PageSuspense><PageTitle title="Join" /><JoinPage /></PageSuspense>} />
            <Route path="/onboarding" element={<PageSuspense><OnboardingPage /></PageSuspense>} />

            {/* ═══════════════════════════════════════════
                PUBLIC — Auth Flow
               ═══════════════════════════════════════════ */}
            <Route path="/login" element={<PageSuspense><PageTitle title="Log In" /><Login /></PageSuspense>} />
            <Route path="/signup" element={<PageSuspense><PageTitle title="Sign Up" /><SignupPage /></PageSuspense>} />
            <Route path="/verify-email" element={<PageSuspense><PageTitle title="Verify Email" /><EmailVerification /></PageSuspense>} />
            <Route path="/verify-email/confirm" element={<PageSuspense><PageTitle title="Verify Email" /><VerifyEmail /></PageSuspense>} />
            <Route path="/password-recovery" element={<PageSuspense><PageTitle title="Password Recovery" /><PasswordRecovery /></PageSuspense>} />
            <Route path="/password-recovery/verify" element={<PageSuspense><PageTitle title="Reset Password" /><PasswordRecoveryVerify /></PageSuspense>} />

            {/* ═══════════════════════════════════════════
                PUBLIC — Browse Resources
               ═══════════════════════════════════════════ */}
            <Route path="/gigs" element={<PageSuspense skeleton={<SkeletonGigGrid />}><PageTitle title="Browse Gigs" /><GigMainPage /></PageSuspense>} />
            <Route path="/gigs/:gigId" element={<PageSuspense><PageTitle title="Gig Details" /><VideoEditingGig /></PageSuspense>} />
            <Route path="/find-work" element={<PageSuspense><PageTitle title="Find Work" /><JobPage /></PageSuspense>} />
            <Route path="/jobs/:jobId" element={<PageSuspense><PageTitle title="Job Details" /><JobDescriptionPage /></PageSuspense>} />
            <Route path="/editors" element={<PageSuspense><PageTitle title="Find Editors" /><FindEditorsPage /></PageSuspense>} />
            <Route path="/freelancers/:freelancerId" element={<PageSuspense><PageTitle title="Freelancer Profile" /><ProfilePage /></PageSuspense>} />
            <Route path="/portfolios" element={<PageSuspense><PageTitle title="Portfolio" /><PortfolioPage /></PageSuspense>} />

            {/* ═══════════════════════════════════════════
                PROTECTED — Any Authenticated User
               ═══════════════════════════════════════════ */}
            <Route path="/create-profile" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Create Profile" /><CreateProfile /></PageSuspense></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><PageSuspense skeleton={<SkeletonDashboard />}><PageTitle title="Dashboard" /><DashboardPage /></PageSuspense></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><PageSuspense><PageTitle title="Settings" /><Settings /></PageSuspense></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><PageSuspense><PageTitle title="Notifications" /><NotificationsPage /></PageSuspense></ProtectedRoute>} />
            <Route path="/saved" element={<ProtectedRoute><PageSuspense><PageTitle title="Saved Items" /><SavedItemsPage /></PageSuspense></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><PageSuspense><PageTitle title="Favorites" /><SavedItemsPage /></PageSuspense></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><PageSuspense><PageTitle title="Messages" /><ChatInterface /></PageSuspense></ProtectedRoute>} />
            <Route path="/workspace" element={
              <ProtectedRoute>
                <PageSuspense>
                  <PageTitle title="Workspace" />
                  <WorkspaceShell />
                </PageSuspense>
              </ProtectedRoute>
            } />
            <Route path="/project-workspace" element={<ProtectedRoute><PageSuspense><PageTitle title="Project Workspace" /><ProjectWorkspace /></PageSuspense></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><PageSuspense><PageTitle title="Payment" /><PaymentPage /></PageSuspense></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><PageSuspense><PageTitle title="Invoices" /><InvoiceDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute><PageSuspense><PageTitle title="Contracts" /><ContractManager /></PageSuspense></ProtectedRoute>} />
            <Route path="/disputes" element={<ProtectedRoute><PageSuspense><PageTitle title="Disputes" /><ComingSoonPage title="Disputes" /></PageSuspense></ProtectedRoute>} />
            <Route path="/escrow" element={<ProtectedRoute><PageSuspense><PageTitle title="Escrow" /><ComingSoonPage title="Escrow" /></PageSuspense></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><PageSuspense><PageTitle title="Community" /><CommunityDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/referrals" element={<ProtectedRoute><PageSuspense><PageTitle title="Referrals" /><ReferralDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><PageSuspense><PageTitle title="Achievements" /><BadgeAchievements /></PageSuspense></ProtectedRoute>} />
            <Route path="/subscriptions" element={<ProtectedRoute><PageSuspense><PageTitle title="Subscriptions" /><PricingPage /></PageSuspense></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><PageSuspense><PageTitle title="Template Marketplace" /><TemplateMarketplace /></PageSuspense></ProtectedRoute>} />
            <Route path="/job-profile" element={<ProtectedRoute><PageSuspense><PageTitle title="Job Profile" /><JobProfile /></PageSuspense></ProtectedRoute>} />
            <Route path="/team-proposals" element={<ProtectedRoute><PageSuspense><PageTitle title="Team Proposals" /><TeamProposalBuilder /></PageSuspense></ProtectedRoute>} />
            <Route path="/team-proposals/:jobId" element={<ProtectedRoute><PageSuspense><PageTitle title="Team Proposals" /><TeamProposalBuilder /></PageSuspense></ProtectedRoute>} />

            {/* Order-scoped resources.
                /orders/:orderId and /orders/:orderId/details now redirect into
                the unified WorkspaceShell so gig orders and custom jobs share
                a single shell. The deep links to specialised tools (the file
                manager and revision tracker) keep their dedicated pages for
                now since they predate the workspace and still get linked from
                emails / notifications. */}
            <Route path="/orders/:orderId" element={<ProtectedRoute><RedirectOrderToWorkspace /></ProtectedRoute>} />
            <Route path="/orders/:orderId/details" element={<ProtectedRoute><RedirectOrderToWorkspace /></ProtectedRoute>} />
            <Route path="/orders/:orderId/files" element={<ProtectedRoute><PageSuspense><PageTitle title="Project Files" /><ProjectFileManager /></PageSuspense></ProtectedRoute>} />
            <Route path="/orders/:orderId/revisions" element={<ProtectedRoute><PageSuspense><PageTitle title="Revision Tracker" /><RevisionTracker /></PageSuspense></ProtectedRoute>} />
            <Route path="/projects/:jobId/timeline" element={<ProtectedRoute><PageSuspense><PageTitle title="Project Timeline" /><GanttTimeline /></PageSuspense></ProtectedRoute>} />

            {/* Checkout flow */}
            <Route path="/checkout/:gigId/:pkgName" element={<ProtectedRoute><PageSuspense><PageTitle title="Project Brief" /><ProjectBriefForm /></PageSuspense></ProtectedRoute>} />
            <Route path="/checkout/:gigId/:pkgName/payment" element={<ProtectedRoute><PageSuspense><PageTitle title="Payment" /><GigPaymentPage /></PageSuspense></ProtectedRoute>} />
            <Route path="/checkout/:gigId/:pkgName/success" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Payment Completed" /><CheckoutSuccessPage /></PageSuspense></ProtectedRoute>} />

            {/* ═══════════════════════════════════════════
                PROTECTED — Freelancer / Editor
               ═══════════════════════════════════════════ */}
            <Route path="/editor/dashboard" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense skeleton={<SkeletonDashboard />}><PageTitle title="Editor Dashboard" /><VideoEditorDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/payments" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Payment Details" /><EditorPaymentDetails /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/workspace" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Workspace" /><WorkspaceShell /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/workspace/orders/:orderId" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><RedirectOrderToWorkspace basePath="/editor/workspace" /></ProtectedRoute>} />
            <Route path="/editor/gigs" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense skeleton={<SkeletonDashboard />}><PageTitle title="My Gigs" /><GigDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/gigs/new" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Create Gig" /><CreateGigForm /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/gigs/:gigId/edit" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Update Gig" /><CreateGigForm isUpdate={true} /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/gigs/:gigId" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Gig Detail" /><GigDetailWrapper /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/gigs/preview" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Preview Gig" /><PreviewGig /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/portfolio" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Portfolio Manager" /><PortfolioManager /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/availability" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Availability" /><AvailabilityCalendar /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/render-farm" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Render Farm" /><RenderFarmDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/skill-tests" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Skill Tests" /><SkillTestHub /></PageSuspense></ProtectedRoute>} />
            <Route path="/editor/demo-reels" element={<ProtectedRoute allowedRoles={["FREELANCER"]}><PageSuspense><PageTitle title="Demo Reels" /><ReelBuilder /></PageSuspense></ProtectedRoute>} />

            {/* ═══════════════════════════════════════════
                PROTECTED — Client
               ═══════════════════════════════════════════ */}
            <Route path="/client/dashboard" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense skeleton={<SkeletonDashboard />}><PageTitle title="Client Dashboard" /><ClientDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/client/profile" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Client Profile" /><ClientProfile /></PageSuspense></ProtectedRoute>} />
            <Route path="/client/workspace" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Workspace" /><WorkspaceShell /></PageSuspense></ProtectedRoute>} />
            <Route path="/client/workspace/orders/:orderId" element={<ProtectedRoute allowedRoles={["CLIENT"]}><RedirectOrderToWorkspace basePath="/client/workspace" /></ProtectedRoute>} />
            <Route path="/client/jobs" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="My Jobs" /><ClientJobs /></PageSuspense></ProtectedRoute>} />
            <Route path="/client/jobs/new" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Post a Job" /><JobPosting /></PageSuspense></ProtectedRoute>} />
            <Route path="/client/jobs/:jobId/shortlist" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Shortlist" /><Shortlist /></PageSuspense></ProtectedRoute>} />
            <Route path="/client/jobs/:jobId/applicants" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Job Applicants" /><JobApplicants /></PageSuspense></ProtectedRoute>} />
            <Route path="/client/briefs/new" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Create Brief" /><BriefWizard /></PageSuspense></ProtectedRoute>} />
            <Route path="/client/briefs/:briefId" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Edit Brief" /><BriefWizard /></PageSuspense></ProtectedRoute>} />
            <Route path="/client/find-editor" element={<ProtectedRoute allowedRoles={["CLIENT"]}><PageSuspense><PageTitle title="Find Editor" /><EditorMatcher /></PageSuspense></ProtectedRoute>} />

            {/* ═══════════════════════════════════════════
                PROTECTED — Admin
               ═══════════════════════════════════════════ */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["ADMIN"]}><PageSuspense skeleton={<SkeletonDashboard />}><PageTitle title="Admin Dashboard" /><ClientDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/admin/revenue" element={<ProtectedRoute allowedRoles={["ADMIN"]}><PageSuspense><PageTitle title="Revenue Dashboard" /><RevenueDashboard /></PageSuspense></ProtectedRoute>} />
            <Route path="/admin/enterprise" element={<ProtectedRoute allowedRoles={["ADMIN"]}><PageSuspense><PageTitle title="Enterprise" /><EnterpriseDashboard /></PageSuspense></ProtectedRoute>} />

            {/* ═══════════════════════════════════════════
                404
               ═══════════════════════════════════════════ */}
            <Route path="*" element={
              <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Page not found</h2>
                  <p className="text-gray-500 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
                  <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Go home</a>
                </div>
              </div>
            } />
          </Routes>
        </ErrorBoundary>
      </div>
      <FloatingChatWidget />
      <Footer />
    </Router>
  );
}

export default NavbarPage;
