--
-- PostgreSQL database dump
--

\restrict rBqUrQUdr3XfCGUb9rl7sJAYUxbzLaq5zFLrndYieFnCAzD6kvWYd98hckqMpsr

-- Dumped from database version 17.8 (9c8634e)
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: Availability; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."Availability" AS ENUM (
    'FULL_TIME',
    'PART_TIME',
    'UNAVAILABLE'
);


--
-- Name: ContactCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."ContactCategory" AS ENUM (
    'TECHNICAL',
    'BILLING',
    'ACCOUNT',
    'FEATURE',
    'OTHER'
);


--
-- Name: ContactMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."ContactMethod" AS ENUM (
    'EMAIL',
    'PHONE',
    'ANY'
);


--
-- Name: ContactPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."ContactPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: ContactStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."ContactStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);


--
-- Name: DiscountType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."DiscountType" AS ENUM (
    'PERCENTAGE',
    'FIXED'
);


--
-- Name: DisputeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."DisputeStatus" AS ENUM (
    'OPEN',
    'IN_REVIEW',
    'RESOLVED',
    'CLOSED'
);


--
-- Name: ExperienceLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."ExperienceLevel" AS ENUM (
    'ENTRY',
    'INTERMEDIATE',
    'EXPERT'
);


--
-- Name: GigStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."GigStatus" AS ENUM (
    'ACTIVE',
    'PAUSED',
    'DRAFT',
    'DELETED'
);


--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."InvoiceStatus" AS ENUM (
    'PENDING',
    'ISSUED',
    'PAID',
    'OVERDUE',
    'CANCELLED'
);


--
-- Name: IssueCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."IssueCategory" AS ENUM (
    'TECHNICAL',
    'BILLING',
    'ACCOUNT',
    'FEATURE',
    'OTHER'
);


--
-- Name: JobDifficulty; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."JobDifficulty" AS ENUM (
    'EASY',
    'INTERMEDIATE',
    'HARD'
);


--
-- Name: JobStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."JobStatus" AS ENUM (
    'OPEN',
    'ACCEPTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: MediaType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."MediaType" AS ENUM (
    'IMAGE',
    'VIDEO',
    'THUMBNAIL'
);


--
-- Name: MessageStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."MessageStatus" AS ENUM (
    'SENT',
    'DELIVERED',
    'READ',
    'FAILED'
);


--
-- Name: MilestoneStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."MilestoneStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: ModerationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."ModerationStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."NotificationType" AS ENUM (
    'ORDER_UPDATE',
    'MESSAGE',
    'PAYMENT',
    'REVIEW',
    'DISPUTE',
    'SYSTEM',
    'APPLICATION'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."OrderStatus" AS ENUM (
    'PENDING',
    'CURRENT',
    'COMPLETED',
    'REJECTED'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."PaymentStatus" AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'CAPTURED',
    'FAILED',
    'REFUNDED'
);


--
-- Name: Priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."Priority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH'
);


--
-- Name: PriorityLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."PriorityLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: ProjectLength; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."ProjectLength" AS ENUM (
    'SHORT_TERM',
    'MEDIUM_TERM',
    'LONG_TERM'
);


--
-- Name: PromotionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."PromotionStatus" AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'DISABLED'
);


--
-- Name: PromotionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."PromotionType" AS ENUM (
    'PROMO_CODE',
    'FEATURED_LISTING'
);


--
-- Name: ReferralStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."ReferralStatus" AS ENUM (
    'PENDING',
    'REDEEMED',
    'EXPIRED'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."Role" AS ENUM (
    'FREELANCER',
    'CLIENT',
    'ADMIN'
);


--
-- Name: SubmissionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."SubmissionStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);


--
-- Name: TransactionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."TransactionStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED'
);


--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."TransactionType" AS ENUM (
    'PAYMENT',
    'REFUND',
    'PAYOUT'
);


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: Application; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Application" (
    "id" integer NOT NULL,
    "jobId" integer NOT NULL,
    "freelancerId" integer NOT NULL,
    "aboutFreelancer" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Application_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Application_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Application_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Application_id_seq" OWNED BY "public"."Application"."id";


--
-- Name: Badge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Badge" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "color" "text" NOT NULL,
    "description" "text" NOT NULL
);


--
-- Name: Category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Category" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "parent_id" integer
);


--
-- Name: Category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Category_id_seq" OWNED BY "public"."Category"."id";


--
-- Name: CoWatchSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."CoWatchSession" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "jobId" integer NOT NULL,
    "fileId" integer NOT NULL,
    "hostId" integer NOT NULL,
    "currentTimeSec" numeric(10,3) DEFAULT 0 NOT NULL,
    "isPlaying" boolean DEFAULT false NOT NULL,
    "lastUpdatedAt" timestamp(3) without time zone DEFAULT "now"() NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT "now"() NOT NULL,
    "endedAt" timestamp(3) without time zone
);


--
-- Name: Contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Contact" (
    "id" integer NOT NULL,
    "firstName" "text" NOT NULL,
    "lastName" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "category" "public"."ContactCategory" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "priority" "public"."ContactPriority" NOT NULL,
    "contactMethod" "public"."ContactMethod" NOT NULL,
    "status" "public"."ContactStatus" DEFAULT 'PENDING'::"public"."ContactStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ContactFile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ContactFile" (
    "id" "text" NOT NULL,
    "contactSubmissionId" character varying(36) NOT NULL,
    "fileName" character varying(255),
    "fileUrl" character varying(512) NOT NULL,
    "fileType" character varying(100) NOT NULL,
    "fileSize" integer NOT NULL,
    "description" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "contactId" integer
);


--
-- Name: ContactSubmission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ContactSubmission" (
    "id" "text" NOT NULL,
    "firstName" "text" NOT NULL,
    "lastName" "text" NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(20),
    "category" "public"."IssueCategory" DEFAULT 'OTHER'::"public"."IssueCategory" NOT NULL,
    "subject" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "priority" "public"."PriorityLevel" DEFAULT 'MEDIUM'::"public"."PriorityLevel" NOT NULL,
    "contactMethod" "public"."ContactMethod" DEFAULT 'EMAIL'::"public"."ContactMethod" NOT NULL,
    "status" "public"."SubmissionStatus" DEFAULT 'PENDING'::"public"."SubmissionStatus" NOT NULL,
    "isResolved" boolean DEFAULT false NOT NULL,
    "assignedAdminId" character varying(36),
    "resolutionNotes" "text",
    "lastActionAt" timestamp(3) without time zone,
    "createdBy" character varying(36),
    "updatedBy" character varying(36),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Contact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Contact_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Contact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Contact_id_seq" OWNED BY "public"."Contact"."id";


--
-- Name: CounterpartyReview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."CounterpartyReview" (
    "id" integer NOT NULL,
    "scopeType" character varying(10) NOT NULL,
    "orderId" integer,
    "jobId" integer,
    "reviewerId" integer NOT NULL,
    "revieweeId" integer NOT NULL,
    "reviewerRole" character varying(20) NOT NULL,
    "revieweeRole" character varying(20) NOT NULL,
    "rating" integer NOT NULL,
    "criteriaRatings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "tags" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "publicComment" "text",
    "privateNote" "text",
    "wouldWorkAgain" boolean DEFAULT true NOT NULL,
    "moderationStatus" character varying(30) DEFAULT 'APPROVED'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deletedAt" timestamp without time zone,
    CONSTRAINT "CounterpartyReview_no_self_check" CHECK (("reviewerId" <> "revieweeId")),
    CONSTRAINT "CounterpartyReview_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "CounterpartyReview_scope_check" CHECK ((((("scopeType")::"text" = 'ORDER'::"text") AND ("orderId" IS NOT NULL) AND ("jobId" IS NULL)) OR ((("scopeType")::"text" = 'JOB'::"text") AND ("jobId" IS NOT NULL) AND ("orderId" IS NULL))))
);


--
-- Name: CounterpartyReview_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."CounterpartyReview_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CounterpartyReview_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."CounterpartyReview_id_seq" OWNED BY "public"."CounterpartyReview"."id";


--
-- Name: Dispute; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Dispute" (
    "id" integer NOT NULL,
    "order_id" integer NOT NULL,
    "raised_by_id" integer NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "public"."DisputeStatus" DEFAULT 'OPEN'::"public"."DisputeStatus" NOT NULL,
    "resolution" "text",
    "resolvedAt" timestamp(3) without time zone,
    "resolved_by" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DisputeComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."DisputeComment" (
    "id" integer NOT NULL,
    "dispute_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "content" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DisputeComment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."DisputeComment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DisputeComment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."DisputeComment_id_seq" OWNED BY "public"."DisputeComment"."id";


--
-- Name: DisputeEvidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."DisputeEvidence" (
    "id" integer NOT NULL,
    "dispute_id" integer NOT NULL,
    "fileUrl" "text" NOT NULL,
    "fileType" "text" NOT NULL,
    "fileName" "text",
    "uploaded_by" integer NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DisputeEvidence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."DisputeEvidence_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DisputeEvidence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."DisputeEvidence_id_seq" OWNED BY "public"."DisputeEvidence"."id";


--
-- Name: Dispute_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Dispute_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Dispute_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Dispute_id_seq" OWNED BY "public"."Dispute"."id";


--
-- Name: FileUpload; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."FileUpload" (
    "id" integer NOT NULL,
    "userId" integer NOT NULL,
    "uploadId" "text" NOT NULL,
    "s3Key" "text" NOT NULL,
    "fileName" "text" NOT NULL,
    "contentType" "text" NOT NULL,
    "fileSize" bigint NOT NULL,
    "orderId" integer,
    "jobId" integer,
    "status" "text" DEFAULT 'IN_PROGRESS'::"text" NOT NULL,
    "totalParts" integer,
    "completedParts" integer DEFAULT 0,
    "finalUrl" "text",
    "createdAt" timestamp with time zone DEFAULT "now"(),
    "updatedAt" timestamp with time zone DEFAULT "now"()
);


--
-- Name: FileUpload_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."FileUpload_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: FileUpload_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."FileUpload_id_seq" OWNED BY "public"."FileUpload"."id";


--
-- Name: FinalDelivery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."FinalDelivery" (
    "id" integer NOT NULL,
    "scopeType" character varying(10) NOT NULL,
    "orderId" integer,
    "jobId" integer,
    "submittedById" integer NOT NULL,
    "reviewedById" integer,
    "status" character varying(30) DEFAULT 'SUBMITTED'::character varying NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "releaseNotes" "text",
    "reviewNote" "text",
    "finalFileIds" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "revisionIds" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "sourceIncluded" boolean DEFAULT false NOT NULL,
    "reviewDueAt" timestamp without time zone,
    "submittedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "reviewedAt" timestamp without time zone,
    "approvedAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "reviewFileIds" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "masterFileIds" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "masterDeliveredAt" timestamp without time zone,
    CONSTRAINT "FinalDelivery_scope_check" CHECK ((((("scopeType")::"text" = 'ORDER'::"text") AND ("orderId" IS NOT NULL) AND ("jobId" IS NULL)) OR ((("scopeType")::"text" = 'JOB'::"text") AND ("jobId" IS NOT NULL) AND ("orderId" IS NULL))))
);


--
-- Name: FinalDelivery_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."FinalDelivery_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: FinalDelivery_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."FinalDelivery_id_seq" OWNED BY "public"."FinalDelivery"."id";


--
-- Name: FreelancerProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."FreelancerProfile" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "city" "text",
    "state" "text",
    "pinCode" "text",
    "jobTitle" "text",
    "overview" "text",
    "skills" "text"[],
    "languages" "text"[],
    "socialLinks" "jsonb",
    "tools" "text"[],
    "equipmentCameras" "text",
    "equipmentLenses" "text",
    "equipmentLighting" "text",
    "equipmentOther" "text",
    "certifications" "text"[] DEFAULT ARRAY[]::"text"[],
    "minimumRate" numeric(12,2),
    "maximumRate" numeric(12,2),
    "availabilityStatus" "public"."Availability" DEFAULT 'UNAVAILABLE'::"public"."Availability" NOT NULL,
    "weeklyHours" integer,
    "hourlyRate" numeric(12,2),
    "experienceLevel" "public"."ExperienceLevel" DEFAULT 'ENTRY'::"public"."ExperienceLevel" NOT NULL,
    "totalEarnings" numeric(14,2) DEFAULT 0.00 NOT NULL,
    "rating" double precision DEFAULT 0.0 NOT NULL,
    "totalJobs" integer DEFAULT 0 NOT NULL,
    "totalHours" integer DEFAULT 0 NOT NULL,
    "successRate" double precision DEFAULT 0 NOT NULL,
    "orderCount" integer DEFAULT 0 NOT NULL,
    "activeOrders" integer DEFAULT 0 NOT NULL,
    "lastActiveAt" timestamp(3) without time zone,
    "responseRate" double precision DEFAULT 0.0,
    "cancellationRate" double precision DEFAULT 0.0,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastModifiedBy" integer,
    "performanceScore" double precision DEFAULT 0.0,
    "maxConcurrentOrders" integer DEFAULT 10 NOT NULL,
    "search_vector" "tsvector",
    "services" "jsonb",
    "stripeConnectedAccountId" "text",
    "stripePayoutsEnabled" boolean DEFAULT false NOT NULL,
    "stripeOnboardingComplete" boolean DEFAULT false NOT NULL
);


--
-- Name: FreelancerProfile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."FreelancerProfile_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: FreelancerProfile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."FreelancerProfile_id_seq" OWNED BY "public"."FreelancerProfile"."id";


--
-- Name: FreelancerSkill; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."FreelancerSkill" (
    "freelancer_id" integer NOT NULL,
    "skill_id" integer NOT NULL
);


--
-- Name: FreelancerSoftware; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."FreelancerSoftware" (
    "id" integer NOT NULL,
    "freelancer_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "level" integer NOT NULL
);


--
-- Name: FreelancerSoftware_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."FreelancerSoftware_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: FreelancerSoftware_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."FreelancerSoftware_id_seq" OWNED BY "public"."FreelancerSoftware"."id";


--
-- Name: Gig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Gig" (
    "id" integer NOT NULL,
    "freelancer_id" integer NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "pricing" "jsonb" NOT NULL,
    "deliveryTime" integer,
    "revisionCount" integer,
    "status" "public"."GigStatus" DEFAULT 'ACTIVE'::"public"."GigStatus" NOT NULL,
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "requirements" "text",
    "thumbnailUrl" "text",
    "faqs" "jsonb" DEFAULT '[]'::"jsonb",
    "packageDetails" "jsonb" DEFAULT '[]'::"jsonb",
    "isFeatured" boolean DEFAULT false NOT NULL,
    "views" integer DEFAULT 0 NOT NULL,
    "revenue" numeric(14,2) DEFAULT 0.00 NOT NULL,
    "responseTime" double precision,
    "completionRate" double precision DEFAULT 0.0,
    "orderCount" integer DEFAULT 0 NOT NULL,
    "lastOrderedAt" timestamp(3) without time zone,
    "impressions" integer DEFAULT 0 NOT NULL,
    "clickThroughRate" double precision DEFAULT 0.0,
    "isPromoted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "averageOrderValue" numeric(12,2) DEFAULT 0.00,
    "visibilityScore" double precision DEFAULT 0.0,
    "lastModifiedBy" integer,
    "geoRestrictions" "text"[] DEFAULT ARRAY[]::"text"[],
    "conversionRate" double precision DEFAULT 0.0,
    "deletedAt" timestamp(3) without time zone,
    "search_vector" "tsvector"
);


--
-- Name: GigSampleMedia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."GigSampleMedia" (
    "id" integer NOT NULL,
    "gig_id" integer NOT NULL,
    "mediaUrl" "text" NOT NULL,
    "mediaType" "public"."MediaType" NOT NULL,
    "title" "text",
    "description" "text",
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: GigSampleMedia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."GigSampleMedia_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: GigSampleMedia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."GigSampleMedia_id_seq" OWNED BY "public"."GigSampleMedia"."id";


--
-- Name: Gig_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Gig_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Gig_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Gig_id_seq" OWNED BY "public"."Gig"."id";


--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Invoice" (
    "id" "text" NOT NULL,
    "order_id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "freelancer_id" integer NOT NULL,
    "invoiceNumber" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "taxAmount" numeric(12,2),
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "status" "public"."InvoiceStatus" DEFAULT 'PENDING'::"public"."InvoiceStatus" NOT NULL,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate" timestamp(3) without time zone,
    "pdfUrl" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Job; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Job" (
    "id" integer NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text"[],
    "budgetMin" numeric(12,2) NOT NULL,
    "budgetMax" numeric(12,2) NOT NULL,
    "deadline" timestamp(3) without time zone NOT NULL,
    "jobDifficulty" "public"."JobDifficulty" NOT NULL,
    "projectLength" "public"."ProjectLength" NOT NULL,
    "keyResponsibilities" "text"[],
    "requiredSkills" "text"[],
    "tools" "text"[],
    "scope" "text" NOT NULL,
    "posted_by_id" integer NOT NULL,
    "freelancer_id" integer,
    "status" "public"."JobStatus" DEFAULT 'OPEN'::"public"."JobStatus" NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "company" "text",
    "note" "text",
    "videoFileUrl" "text",
    "rating" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "location" "text" DEFAULT 'Remote'::"text" NOT NULL,
    "proposals" integer DEFAULT 0 NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "search_vector" "tsvector"
);


--
-- Name: Job_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Job_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Job_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Job_id_seq" OWNED BY "public"."Job"."id";


--
-- Name: MediaAsset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."MediaAsset" (
    "id" integer NOT NULL,
    "sourceType" character varying(30) NOT NULL,
    "projectFileId" integer,
    "fileUploadId" integer,
    "ownerId" integer NOT NULL,
    "scopeType" character varying(10),
    "orderId" integer,
    "jobId" integer,
    "originalKey" "text",
    "originalUrl" "text",
    "mimeType" character varying(200),
    "fileSize" bigint DEFAULT 0 NOT NULL,
    "status" character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    "scanStatus" character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    "processingStatus" character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    "posterKey" "text",
    "previewKey" "text",
    "watermarkedKey" "text",
    "variants" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "error" "text",
    "cleanupAfter" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deletedAt" timestamp without time zone,
    CONSTRAINT "MediaAsset_scope_check" CHECK (((("scopeType" IS NULL) AND ("orderId" IS NULL) AND ("jobId" IS NULL)) OR ((("scopeType")::"text" = 'ORDER'::"text") AND ("orderId" IS NOT NULL) AND ("jobId" IS NULL)) OR ((("scopeType")::"text" = 'JOB'::"text") AND ("jobId" IS NOT NULL) AND ("orderId" IS NULL))))
);


--
-- Name: MediaAsset_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."MediaAsset_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: MediaAsset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."MediaAsset_id_seq" OWNED BY "public"."MediaAsset"."id";


--
-- Name: Message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Message" (
    "id" "text" NOT NULL,
    "jobId" integer,
    "senderId" integer NOT NULL,
    "receiverId" integer,
    "orderId" integer,
    "content" "text",
    "subject" "text",
    "status" "public"."MessageStatus" DEFAULT 'SENT'::"public"."MessageStatus" NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "isFlagged" boolean DEFAULT false NOT NULL,
    "reactions" "jsonb",
    "parentId" "text",
    "deletedAt" timestamp(3) without time zone,
    "attachments" "jsonb"[] DEFAULT ARRAY[]::"jsonb"[],
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "replyTo" "text",
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deliveredAt" timestamp(3) without time zone,
    "readAt" timestamp(3) without time zone
);


--
-- Name: MessageReaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."MessageReaction" (
    "id" "text" NOT NULL,
    "messageId" "text" NOT NULL,
    "userId" integer NOT NULL,
    "emoji" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Milestone; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Milestone" (
    "id" integer NOT NULL,
    "order_id" integer NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "dueDate" timestamp(3) without time zone NOT NULL,
    "status" "public"."MilestoneStatus" DEFAULT 'PENDING'::"public"."MilestoneStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "progress" integer DEFAULT 0 NOT NULL,
    "deliverables" "jsonb",
    "lastModifiedBy" integer,
    "amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "jobId" integer
);


--
-- Name: Milestone_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Milestone_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Milestone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Milestone_id_seq" OWNED BY "public"."Milestone"."id";


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Notification" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "content" "text" NOT NULL,
    "entityType" "text",
    "entityId" integer,
    "priority" "public"."Priority" DEFAULT 'NORMAL'::"public"."Priority" NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "metadata" "jsonb",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deliveryStatus" "text",
    "deliveryMethod" "text",
    "batchId" "text",
    "retryCount" integer DEFAULT 0 NOT NULL,
    "scheduledAt" timestamp(3) without time zone
);


--
-- Name: Notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Notification_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Notification_id_seq" OWNED BY "public"."Notification"."id";


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Order" (
    "id" integer NOT NULL,
    "gig_id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "freelancer_id" integer NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "videoType" "text",
    "numberOfVideos" integer,
    "totalDuration" integer,
    "referenceUrl" "text",
    "aspectRatio" "text",
    "addSubtitles" boolean DEFAULT false NOT NULL,
    "expressDelivery" boolean DEFAULT false NOT NULL,
    "uploadedFiles" "jsonb",
    "package" "text" NOT NULL,
    "totalPrice" numeric(12,2) NOT NULL,
    "status" "public"."OrderStatus" DEFAULT 'PENDING'::"public"."OrderStatus" NOT NULL,
    "requirements" "text",
    "deliveryDeadline" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "orderNumber" "text" NOT NULL,
    "revisionsRequested" integer DEFAULT 0 NOT NULL,
    "revisionsCompleted" integer DEFAULT 0 NOT NULL,
    "deliveryExtensions" integer DEFAULT 0 NOT NULL,
    "extensionReason" "text",
    "cancellationReason" "text",
    "cancellationDate" timestamp(3) without time zone,
    "isUrgent" boolean DEFAULT false NOT NULL,
    "priorityFee" numeric(12,2),
    "customDetails" "jsonb",
    "progress" integer DEFAULT 0 NOT NULL,
    "daysLeft" integer,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "sourceIp" "text",
    "trackingId" "text",
    "lastNotifiedAt" timestamp(3) without time zone,
    "orderSource" "text",
    "clientNotes" "text",
    "urgencyLevel" "text",
    "orderPriority" integer DEFAULT 0 NOT NULL,
    "metadata" "jsonb",
    "lastModifiedBy" integer,
    "region" "text",
    "slaCompliance" boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "escrowStatus" "text" DEFAULT 'NONE'::"text",
    "platformFeePercent" double precision DEFAULT 12.5,
    "platformFeeAmount" integer DEFAULT 0,
    "clientFeePercent" double precision DEFAULT 3.5,
    "clientFeeAmount" integer DEFAULT 0,
    "freelancerPayout" integer DEFAULT 0
);


--
-- Name: OrderStatusHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."OrderStatusHistory" (
    "id" integer NOT NULL,
    "order_id" integer NOT NULL,
    "status" "public"."OrderStatus" NOT NULL,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "changed_by" integer
);


--
-- Name: OrderStatusHistory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."OrderStatusHistory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: OrderStatusHistory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."OrderStatusHistory_id_seq" OWNED BY "public"."OrderStatusHistory"."id";


--
-- Name: Order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Order_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Order_id_seq" OWNED BY "public"."Order"."id";


--
-- Name: PaymentSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."PaymentSetting" (
    "id" integer NOT NULL,
    "freelancer_id" integer NOT NULL,
    "method" "text" NOT NULL,
    "details" "jsonb" NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL
);


--
-- Name: PaymentSetting_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."PaymentSetting_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PaymentSetting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."PaymentSetting_id_seq" OWNED BY "public"."PaymentSetting"."id";


--
-- Name: PinnedMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."PinnedMessage" (
    "id" integer NOT NULL,
    "jobId" integer NOT NULL,
    "messageId" "text" NOT NULL,
    "pinnedById" integer NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: PinnedMessage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."PinnedMessage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PinnedMessage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."PinnedMessage_id_seq" OWNED BY "public"."PinnedMessage"."id";


--
-- Name: PlatformFee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."PlatformFee" (
    "id" integer NOT NULL,
    "transaction_id" integer NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "percentage" numeric(5,4) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PlatformFee_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."PlatformFee_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PlatformFee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."PlatformFee_id_seq" OWNED BY "public"."PlatformFee"."id";


--
-- Name: PlatformRevenue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."PlatformRevenue" (
    "id" integer NOT NULL,
    "type" character varying(30) NOT NULL,
    "amount" integer DEFAULT 0 NOT NULL,
    "sourceId" integer,
    "sourceType" character varying(30),
    "description" "text",
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL
);


--
-- Name: PlatformRevenue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."PlatformRevenue_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PlatformRevenue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."PlatformRevenue_id_seq" OWNED BY "public"."PlatformRevenue"."id";


--
-- Name: PortfolioVideo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."PortfolioVideo" (
    "id" integer NOT NULL,
    "freelancer_id" integer NOT NULL,
    "videoUrl" "text" NOT NULL,
    "title" "text",
    "description" "text",
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "views" integer DEFAULT 0 NOT NULL,
    "category" "text",
    "thumbnailUrl" "text"
);


--
-- Name: PortfolioVideo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."PortfolioVideo_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PortfolioVideo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."PortfolioVideo_id_seq" OWNED BY "public"."PortfolioVideo"."id";


--
-- Name: ProjectFile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ProjectFile" (
    "id" integer NOT NULL,
    "jobId" integer,
    "uploaderId" integer NOT NULL,
    "fileName" "text" NOT NULL,
    "url" "text" NOT NULL,
    "mimeType" "text",
    "size" bigint DEFAULT 0 NOT NULL,
    "category" "text" DEFAULT 'deliverable'::"text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'PENDING_REVIEW'::"text" NOT NULL,
    "note" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "openCommentCount" integer DEFAULT 0 NOT NULL,
    "totalCommentCount" integer DEFAULT 0 NOT NULL,
    "durationSec" numeric(10,3),
    "orderId" integer,
    "uploadedBy" integer,
    "fileKey" "text",
    "fileSize" bigint,
    "folder" "text" DEFAULT '/'::"text" NOT NULL,
    "isLatest" boolean DEFAULT true NOT NULL,
    "tags" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


--
-- Name: ProjectFile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."ProjectFile_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ProjectFile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."ProjectFile_id_seq" OWNED BY "public"."ProjectFile"."id";


--
-- Name: Promotion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Promotion" (
    "id" integer NOT NULL,
    "type" "public"."PromotionType" NOT NULL,
    "code" "text",
    "entityType" "text",
    "entityId" integer,
    "discountAmount" numeric(12,2),
    "discountType" "public"."DiscountType",
    "user_id" integer,
    "status" "public"."PromotionStatus" DEFAULT 'ACTIVE'::"public"."PromotionStatus" NOT NULL,
    "maxUses" integer,
    "uses" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone
);


--
-- Name: Promotion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Promotion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Promotion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Promotion_id_seq" OWNED BY "public"."Promotion"."id";


--
-- Name: Referral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Referral" (
    "id" integer NOT NULL,
    "referrer_id" integer NOT NULL,
    "referee_id" integer,
    "referralCode" "text" NOT NULL,
    "status" "public"."ReferralStatus" DEFAULT 'PENDING'::"public"."ReferralStatus" NOT NULL,
    "rewardAmount" numeric(12,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "redeemedAt" timestamp(3) without time zone
);


--
-- Name: Referral_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Referral_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Referral_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Referral_id_seq" OWNED BY "public"."Referral"."id";


--
-- Name: Review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Review" (
    "id" integer NOT NULL,
    "order_id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "freelancer_id" integer NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "title" "text",
    "isAnonymous" boolean DEFAULT false NOT NULL,
    "helpfulCount" integer DEFAULT 0 NOT NULL,
    "response" "text",
    "respondedAt" timestamp(3) without time zone,
    "isVerified" boolean DEFAULT true NOT NULL,
    "moderationStatus" "public"."ModerationStatus" DEFAULT 'APPROVED'::"public"."ModerationStatus" NOT NULL,
    "moderatedAt" timestamp(3) without time zone,
    "moderated_by" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "gig_id" integer NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: Review_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Review_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Review_id_seq" OWNED BY "public"."Review"."id";


--
-- Name: SavedItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."SavedItem" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "entityType" "text" NOT NULL,
    "entityId" integer NOT NULL,
    "note" "text",
    "createdAt" timestamp(3) without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "SavedItem_entityType_check" CHECK (("entityType" = ANY (ARRAY['GIG'::"text", 'FREELANCER'::"text", 'JOB'::"text"])))
);


--
-- Name: SavedItem_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."SavedItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SavedItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."SavedItem_id_seq" OWNED BY "public"."SavedItem"."id";


--
-- Name: Skill; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Skill" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL
);


--
-- Name: Skill_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Skill_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Skill_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Skill_id_seq" OWNED BY "public"."Skill"."id";


--
-- Name: Timeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Timeline" (
    "id" integer NOT NULL,
    "jobId" integer NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "startDate" timestamp without time zone,
    "endDate" timestamp without time zone,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT "now"() NOT NULL,
    "progress" integer DEFAULT 0,
    "color" character varying(20),
    "dependsOnId" integer,
    "status" character varying(20) DEFAULT 'PENDING'::character varying
);


--
-- Name: Timeline_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Timeline_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Timeline_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Timeline_id_seq" OWNED BY "public"."Timeline"."id";


--
-- Name: Transaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Transaction" (
    "id" integer NOT NULL,
    "order_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "paymentMethod" "text",
    "status" "public"."TransactionStatus" DEFAULT 'PENDING'::"public"."TransactionStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paymentGatewayId" "text",
    "paymentIntentId" "text",
    "refundReason" "text",
    "fraudStatus" "text",
    "ipAddress" "text",
    "gatewayFee" numeric(12,2),
    "metadata" "jsonb"
);


--
-- Name: Transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Transaction_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Transaction_id_seq" OWNED BY "public"."Transaction"."id";


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."User" (
    "id" integer NOT NULL,
    "auth0Id" "text",
    "firstname" "text" NOT NULL,
    "lastname" "text" NOT NULL,
    "email" "text" NOT NULL,
    "password" "text",
    "country" "text" NOT NULL,
    "username" "text",
    "role" "public"."Role" DEFAULT 'CLIENT'::"public"."Role" NOT NULL,
    "profilePicture" "text",
    "bio" "text",
    "company" "text",
    "companyEmail" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isProfileComplete" boolean DEFAULT false NOT NULL,
    "lastNameChange" timestamp(3) without time zone,
    "isVerified" boolean DEFAULT false NOT NULL,
    "totalJobs" integer DEFAULT 0 NOT NULL,
    "totalHours" integer DEFAULT 0 NOT NULL,
    "successRate" double precision DEFAULT 0 NOT NULL,
    "rating" double precision DEFAULT 0 NOT NULL,
    "applied_jobs_id" integer[],
    "accepted_jobs_id" integer[],
    "rejected_jobs_id" integer[]
);


--
-- Name: UserBadge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."UserBadge" (
    "id" "text" NOT NULL,
    "freelancerId" integer NOT NULL,
    "badgeId" "text" NOT NULL,
    "earnedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isVisible" boolean DEFAULT true NOT NULL
);


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."User_id_seq" OWNED BY "public"."User"."id";


--
-- Name: VideoReviewComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."VideoReviewComment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "jobId" integer NOT NULL,
    "fileId" integer NOT NULL,
    "authorId" integer NOT NULL,
    "timestampSec" numeric(10,3) DEFAULT 0 NOT NULL,
    "endTimestampSec" numeric(10,3),
    "content" "text" NOT NULL,
    "drawing" "jsonb",
    "parentId" "uuid",
    "status" "text" DEFAULT 'OPEN'::"text" NOT NULL,
    "resolvedById" integer,
    "resolvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT "now"() NOT NULL
);


--
-- Name: WebhookEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."WebhookEvent" (
    "id" integer NOT NULL,
    "stripeEventId" "text" NOT NULL,
    "type" "text" NOT NULL,
    "processed" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: WebhookEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."WebhookEvent_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: WebhookEvent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."WebhookEvent_id_seq" OWNED BY "public"."WebhookEvent"."id";


--
-- Name: Application id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Application" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Application_id_seq"'::"regclass");


--
-- Name: Category id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Category" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Category_id_seq"'::"regclass");


--
-- Name: Contact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Contact" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Contact_id_seq"'::"regclass");


--
-- Name: CounterpartyReview id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."CounterpartyReview" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."CounterpartyReview_id_seq"'::"regclass");


--
-- Name: Dispute id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Dispute" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Dispute_id_seq"'::"regclass");


--
-- Name: DisputeComment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."DisputeComment" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."DisputeComment_id_seq"'::"regclass");


--
-- Name: DisputeEvidence id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."DisputeEvidence" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."DisputeEvidence_id_seq"'::"regclass");


--
-- Name: FileUpload id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FileUpload" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."FileUpload_id_seq"'::"regclass");


--
-- Name: FinalDelivery id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FinalDelivery" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."FinalDelivery_id_seq"'::"regclass");


--
-- Name: FreelancerProfile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FreelancerProfile" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."FreelancerProfile_id_seq"'::"regclass");


--
-- Name: FreelancerSoftware id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FreelancerSoftware" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."FreelancerSoftware_id_seq"'::"regclass");


--
-- Name: Gig id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Gig" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Gig_id_seq"'::"regclass");


--
-- Name: GigSampleMedia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."GigSampleMedia" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."GigSampleMedia_id_seq"'::"regclass");


--
-- Name: Job id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Job" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Job_id_seq"'::"regclass");


--
-- Name: MediaAsset id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MediaAsset" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."MediaAsset_id_seq"'::"regclass");


--
-- Name: Milestone id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Milestone" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Milestone_id_seq"'::"regclass");


--
-- Name: Notification id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Notification" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Notification_id_seq"'::"regclass");


--
-- Name: Order id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Order" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Order_id_seq"'::"regclass");


--
-- Name: OrderStatusHistory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."OrderStatusHistory" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."OrderStatusHistory_id_seq"'::"regclass");


--
-- Name: PaymentSetting id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PaymentSetting" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PaymentSetting_id_seq"'::"regclass");


--
-- Name: PinnedMessage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PinnedMessage" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PinnedMessage_id_seq"'::"regclass");


--
-- Name: PlatformFee id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PlatformFee" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PlatformFee_id_seq"'::"regclass");


--
-- Name: PlatformRevenue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PlatformRevenue" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PlatformRevenue_id_seq"'::"regclass");


--
-- Name: PortfolioVideo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PortfolioVideo" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PortfolioVideo_id_seq"'::"regclass");


--
-- Name: ProjectFile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ProjectFile" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ProjectFile_id_seq"'::"regclass");


--
-- Name: Promotion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Promotion" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Promotion_id_seq"'::"regclass");


--
-- Name: Referral id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Referral" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Referral_id_seq"'::"regclass");


--
-- Name: Review id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Review" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Review_id_seq"'::"regclass");


--
-- Name: SavedItem id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."SavedItem" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."SavedItem_id_seq"'::"regclass");


--
-- Name: Skill id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Skill" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Skill_id_seq"'::"regclass");


--
-- Name: Timeline id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Timeline" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Timeline_id_seq"'::"regclass");


--
-- Name: Transaction id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Transaction" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Transaction_id_seq"'::"regclass");


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."User" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."User_id_seq"'::"regclass");


--
-- Name: WebhookEvent id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."WebhookEvent" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."WebhookEvent_id_seq"'::"regclass");


--
-- Data for Name: Application; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Application" ("id", "jobId", "freelancerId", "aboutFreelancer", "status", "createdAt", "updatedAt") FROM stdin;
2	1	6	sdfsdf	ACCEPTED	2026-04-28 06:00:06.105	2026-04-28 06:20:53.226
\.


--
-- Data for Name: Badge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Badge" ("id", "name", "icon", "color", "description") FROM stdin;
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Category" ("id", "name", "description", "parent_id") FROM stdin;
\.


--
-- Data for Name: CoWatchSession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."CoWatchSession" ("id", "jobId", "fileId", "hostId", "currentTimeSec", "isPlaying", "lastUpdatedAt", "createdAt", "endedAt") FROM stdin;
7b6f7e74-8f29-4a58-b053-fe9d90fc4166	1	1	6	0.000	t	2026-04-28 17:03:42.897	2026-04-28 17:03:42.897	\N
\.


--
-- Data for Name: Contact; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Contact" ("id", "firstName", "lastName", "email", "phone", "category", "subject", "message", "priority", "contactMethod", "status", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ContactFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."ContactFile" ("id", "contactSubmissionId", "fileName", "fileUrl", "fileType", "fileSize", "description", "createdAt", "contactId") FROM stdin;
\.


--
-- Data for Name: ContactSubmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."ContactSubmission" ("id", "firstName", "lastName", "email", "phone", "category", "subject", "message", "priority", "contactMethod", "status", "isResolved", "assignedAdminId", "resolutionNotes", "lastActionAt", "createdBy", "updatedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CounterpartyReview; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."CounterpartyReview" ("id", "scopeType", "orderId", "jobId", "reviewerId", "revieweeId", "reviewerRole", "revieweeRole", "rating", "criteriaRatings", "tags", "publicComment", "privateNote", "wouldWorkAgain", "moderationStatus", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: Dispute; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Dispute" ("id", "order_id", "raised_by_id", "reason", "description", "status", "resolution", "resolvedAt", "resolved_by", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DisputeComment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."DisputeComment" ("id", "dispute_id", "user_id", "content", "createdAt") FROM stdin;
\.


--
-- Data for Name: DisputeEvidence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."DisputeEvidence" ("id", "dispute_id", "fileUrl", "fileType", "fileName", "uploaded_by", "uploadedAt") FROM stdin;
\.


--
-- Data for Name: FileUpload; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."FileUpload" ("id", "userId", "uploadId", "s3Key", "fileName", "contentType", "fileSize", "orderId", "jobId", "status", "totalParts", "completedParts", "finalUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FinalDelivery; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."FinalDelivery" ("id", "scopeType", "orderId", "jobId", "submittedById", "reviewedById", "status", "version", "releaseNotes", "reviewNote", "finalFileIds", "revisionIds", "sourceIncluded", "reviewDueAt", "submittedAt", "reviewedAt", "approvedAt", "createdAt", "updatedAt", "reviewFileIds", "masterFileIds", "masterDeliveredAt") FROM stdin;
\.


--
-- Data for Name: FreelancerProfile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."FreelancerProfile" ("id", "user_id", "city", "state", "pinCode", "jobTitle", "overview", "skills", "languages", "socialLinks", "tools", "equipmentCameras", "equipmentLenses", "equipmentLighting", "equipmentOther", "certifications", "minimumRate", "maximumRate", "availabilityStatus", "weeklyHours", "hourlyRate", "experienceLevel", "totalEarnings", "rating", "totalJobs", "totalHours", "successRate", "orderCount", "activeOrders", "lastActiveAt", "responseRate", "cancellationRate", "createdAt", "updatedAt", "lastModifiedBy", "performanceScore", "maxConcurrentOrders", "search_vector", "services", "stripeConnectedAccountId", "stripePayoutsEnabled", "stripeOnboardingComplete") FROM stdin;
1	3	\N	\N	\N	\N	\N	{}	{}	\N	{}	\N	\N	\N	\N	{}	\N	\N	UNAVAILABLE	\N	\N	ENTRY	0.00	0	0	0	0	0	0	\N	0	0	2026-04-27 07:29:16.285	2026-04-27 07:29:16.285	\N	0	10	\N	\N	\N	f	f
5	7	\N	\N	\N	\N	\N	{}	{}	\N	{}	\N	\N	\N	\N	{}	\N	\N	UNAVAILABLE	\N	\N	ENTRY	0.00	0	0	0	0	0	0	\N	0	0	2026-04-28 10:31:00.877	2026-04-28 10:31:00.877	\N	0	10	\N	\N	\N	f	f
2	6	dsad	sdff	1734234	dsad	dsadsad	{dsad}	{}	\N	{dsadsa}					{}	2.00	32.00	FULL_TIME	\N	12.00	ENTRY	0.00	0	0	0	0	1	1	2026-05-05 11:51:34.782	0	0	2026-04-27 16:44:35.82	2026-05-05 10:40:37.718	\N	0	10	\N	\N	\N	f	f
\.


--
-- Data for Name: FreelancerSkill; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."FreelancerSkill" ("freelancer_id", "skill_id") FROM stdin;
\.


--
-- Data for Name: FreelancerSoftware; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."FreelancerSoftware" ("id", "freelancer_id", "name", "icon", "level") FROM stdin;
\.


--
-- Data for Name: Gig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Gig" ("id", "freelancer_id", "title", "description", "category", "pricing", "deliveryTime", "revisionCount", "status", "tags", "requirements", "thumbnailUrl", "faqs", "packageDetails", "isFeatured", "views", "revenue", "responseTime", "completionRate", "orderCount", "lastOrderedAt", "impressions", "clickThroughRate", "isPromoted", "createdAt", "updatedAt", "averageOrderValue", "visibilityScore", "lastModifiedBy", "geoRestrictions", "conversionRate", "deletedAt", "search_vector") FROM stdin;
1	2	sdfdsf	gdsgdsgdsgdsgdsgfdgfdfdgfdgfdgfdgfdgfdgfdgfdfdhfdhgf	Color Grading	[{"name": "Basic", "price": "23", "revisions": "1", "description": "sadfsf", "deliveryTime": "3"}]	3	1	ACTIVE	{Wedding,Corporate,Vlog}	gsdgdsg	\N	[]	[]	f	17	0.00	\N	0	1	2026-05-05 11:51:34.417	0	0	f	2026-04-28 17:05:54.621	2026-05-05 06:38:50.252	0.00	0	\N	{}	0	\N	\N
\.


--
-- Data for Name: GigSampleMedia; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."GigSampleMedia" ("id", "gig_id", "mediaUrl", "mediaType", "title", "description", "uploadedAt") FROM stdin;
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Invoice" ("id", "order_id", "client_id", "freelancer_id", "invoiceNumber", "amount", "taxAmount", "currency", "status", "issuedAt", "dueDate", "pdfUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Job; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Job" ("id", "title", "description", "category", "budgetMin", "budgetMax", "deadline", "jobDifficulty", "projectLength", "keyResponsibilities", "requiredSkills", "tools", "scope", "posted_by_id", "freelancer_id", "status", "progress", "name", "email", "company", "note", "videoFileUrl", "rating", "createdAt", "updatedAt", "isVerified", "location", "proposals", "deletedAt", "search_vector") FROM stdin;
1	Youtube Video	fxtxxgfgknm	{"Wedding Videos"}	5.00	6.00	2026-04-30 05:30:00	INTERMEDIATE	MEDIUM_TERM	{"Video Production"}	{"Color Correction"}	{"Adobe Premiere Pro"}	xffghn fxtrxthydxcvxcnbd\n 	4	6	COMPLETED	100	test test	anjaliv@amdocs.com	Software Developer	\N	\N	\N	2026-04-27 10:06:11.201	2026-05-05 10:16:56.127	t	Remote	0	\N	\N
\.


--
-- Data for Name: MediaAsset; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."MediaAsset" ("id", "sourceType", "projectFileId", "fileUploadId", "ownerId", "scopeType", "orderId", "jobId", "originalKey", "originalUrl", "mimeType", "fileSize", "status", "scanStatus", "processingStatus", "posterKey", "previewKey", "watermarkedKey", "variants", "metadata", "error", "cleanupAfter", "createdAt", "updatedAt", "deletedAt") FROM stdin;
1	FILE_UPLOAD	\N	\N	1	\N	\N	\N	dev-placeholder/media-smoke/1778653888616.mp4	dev-placeholder/media-smoke/1778653888616.mp4	video/mp4	12345	READY	SKIPPED_DEV	READY	\N	\N	\N	[{"id": "original", "key": "dev-placeholder/media-smoke/1778653888616.mp4", "kind": "original", "label": "Original", "ready": true}]	{"smoke": true, "isPlaceholder": true}	\N	\N	2026-05-13 06:31:29.012587	2026-05-13 06:31:29.541438	2026-05-13 06:31:30.067529
2	FILE_UPLOAD	\N	\N	1	\N	\N	\N	dev-placeholder/media-smoke/1778653923917.mp4	dev-placeholder/media-smoke/1778653923917.mp4	video/mp4	12345	READY	SKIPPED_DEV	READY	\N	\N	\N	[{"id": "original", "key": "dev-placeholder/media-smoke/1778653923917.mp4", "kind": "original", "label": "Original", "ready": true}]	{"smoke": true, "isPlaceholder": true}	\N	\N	2026-05-13 06:32:04.296208	2026-05-13 06:32:04.802182	2026-05-13 06:32:05.534654
3	FILE_UPLOAD	\N	\N	1	\N	\N	\N	dev-placeholder/media-smoke/1778655768438.mp4	dev-placeholder/media-smoke/1778655768438.mp4	video/mp4	12345	READY	SKIPPED_DEV	READY	\N	\N	\N	[{"id": "original", "key": "dev-placeholder/media-smoke/1778655768438.mp4", "kind": "original", "label": "Original", "ready": true}]	{"smoke": true, "isPlaceholder": true}	\N	\N	2026-05-13 07:02:48.840076	2026-05-13 07:02:49.370851	2026-05-13 07:02:50.119847
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Message" ("id", "jobId", "senderId", "receiverId", "orderId", "content", "subject", "status", "isRead", "isFlagged", "reactions", "parentId", "deletedAt", "attachments", "timestamp", "replyTo", "isDeleted", "deliveredAt", "readAt") FROM stdin;
cf5d7c26-7192-41af-92fb-2fbe040173ca	1	4	6	\N	e2e probe @ 2026-04-28T08:52:13.366Z	\N	SENT	f	f	[]	\N	\N	{}	2026-04-28 08:52:14.07	\N	f	\N	2026-04-28 10:50:55.193
acf2e0b3-b204-40bd-b95d-a3cb1d1d4ba7	1	4	6	\N	socket probe @ 2026-04-28T08:52:16.563Z	\N	SENT	f	f	[]	\N	\N	{}	2026-04-28 08:52:16.946	\N	f	\N	2026-04-28 10:50:55.193
b0dfe733-ac1e-4525-ba86-09b71a1dae73	1	4	6	\N	hii	\N	SENT	f	f	[]	\N	\N	{}	2026-04-28 09:08:20.131	\N	f	\N	2026-04-28 10:50:55.193
db448838-e7d1-470f-80d0-4b0eaaf4ca23	1	4	6	\N	hiii	\N	SENT	f	f	[]	\N	\N	{}	2026-04-28 09:08:24.752	\N	f	\N	2026-04-28 10:50:55.193
69427c77-f3ca-4c1e-8108-9c82bfe806a4	1	4	6	\N	Hey	\N	SENT	f	f	[]	\N	\N	{}	2026-04-28 10:51:41.89	\N	f	\N	2026-04-28 12:04:29.24
8a74e8c3-5d48-49c1-8269-423d3474014f	1	4	6	\N	hi	\N	SENT	f	f	[]	\N	\N	{}	2026-05-04 07:24:40.249	\N	f	\N	2026-05-05 06:39:47.042
76685402-eb8e-488c-806d-f366da1d5587	1	4	6	\N	hi	\N	SENT	f	f	[]	\N	\N	{}	2026-05-05 06:25:06.759	\N	f	\N	2026-05-05 06:39:47.042
ecf577ee-be9d-415f-98d3-e67a34d320bf	1	4	6	\N	hi	\N	SENT	f	f	[]	\N	\N	{}	2026-05-05 06:39:48.664	\N	f	\N	2026-05-05 06:52:04.361
\.


--
-- Data for Name: MessageReaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."MessageReaction" ("id", "messageId", "userId", "emoji", "createdAt") FROM stdin;
\.


--
-- Data for Name: Milestone; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Milestone" ("id", "order_id", "title", "description", "dueDate", "status", "createdAt", "updatedAt", "completedAt", "progress", "deliverables", "lastModifiedBy", "amount", "approvedAt", "jobId") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Notification" ("id", "user_id", "type", "content", "entityType", "entityId", "priority", "isRead", "readAt", "expiresAt", "metadata", "createdAt", "updatedAt", "deliveryStatus", "deliveryMethod", "batchId", "retryCount", "scheduledAt") FROM stdin;
5	4	ORDER_UPDATE	Your order #ORD-20260504-9ABE has been placed.	ORDER	2	HIGH	f	\N	\N	\N	2026-05-04 11:04:06.713	2026-05-04 11:04:06.713	\N	IN_APP	\N	0	\N
7	4	ORDER_UPDATE	Your order #ORD-20260504-88B1 has been placed.	ORDER	3	HIGH	f	\N	\N	\N	2026-05-04 11:05:34.27	2026-05-04 11:05:34.27	\N	IN_APP	\N	0	\N
9	4	ORDER_UPDATE	Your order #ORD-20260505-5FA7 has been placed.	ORDER	4	HIGH	f	\N	\N	\N	2026-05-05 06:00:29.022	2026-05-05 06:00:29.022	\N	IN_APP	\N	0	\N
4	6	SYSTEM	Congratulations! You have been selected for the job "Youtube Video"	JOB	1	HIGH	t	2026-05-05 06:41:15.493	\N	{"jobId": 1, "status": "ACCEPTED", "jobTitle": "Youtube Video", "acceptedAt": "2026-04-28T06:20:54.168Z"}	2026-04-28 06:20:53.226	2026-04-28 06:20:53.226	\N	\N	\N	0	\N
6	6	ORDER_UPDATE	You have a new order #ORD-20260504-9ABE.	ORDER	2	HIGH	t	2026-05-05 06:41:15.493	\N	\N	2026-05-04 11:04:06.713	2026-05-04 11:04:06.713	\N	IN_APP	\N	0	\N
8	6	ORDER_UPDATE	You have a new order #ORD-20260504-88B1.	ORDER	3	HIGH	t	2026-05-05 06:41:15.493	\N	\N	2026-05-04 11:05:34.27	2026-05-04 11:05:34.27	\N	IN_APP	\N	0	\N
10	6	ORDER_UPDATE	You have a new order #ORD-20260505-5FA7.	ORDER	4	HIGH	t	2026-05-05 06:41:15.493	\N	\N	2026-05-05 06:00:29.022	2026-05-05 06:00:29.022	\N	IN_APP	\N	0	\N
16	4	ORDER_UPDATE	Final delivery v1 is ready for review.	Job	1	HIGH	f	\N	\N	{"scopeType": "JOB", "deliveryId": 2}	2026-05-05 06:58:53.213	2026-05-05 06:58:53.213	\N	\N	\N	0	\N
17	6	ORDER_UPDATE	The client requested changes on the final delivery.	Job	1	HIGH	f	\N	\N	{"scopeType": "JOB", "deliveryId": 2, "reviewNote": "Smoke job change request"}	2026-05-05 06:58:55.074	2026-05-05 06:58:55.074	\N	\N	\N	0	\N
18	4	ORDER_UPDATE	Final delivery v2 is ready for review.	Job	1	HIGH	f	\N	\N	{"scopeType": "JOB", "deliveryId": 3}	2026-05-05 06:58:56.961	2026-05-05 06:58:56.961	\N	\N	\N	0	\N
19	4	ORDER_UPDATE	Final delivery v1 is ready for review.	Job	1	HIGH	f	\N	\N	{"scopeType": "JOB", "deliveryId": 4}	2026-05-05 06:59:46.595	2026-05-05 06:59:46.595	\N	\N	\N	0	\N
20	6	ORDER_UPDATE	The client requested changes on the final delivery.	Job	1	HIGH	f	\N	\N	{"scopeType": "JOB", "deliveryId": 4, "reviewNote": "Smoke job change request"}	2026-05-05 06:59:48.469	2026-05-05 06:59:48.469	\N	\N	\N	0	\N
21	4	ORDER_UPDATE	Final delivery v2 is ready for review.	Job	1	HIGH	f	\N	\N	{"scopeType": "JOB", "deliveryId": 5}	2026-05-05 06:59:50.361	2026-05-05 06:59:50.361	\N	\N	\N	0	\N
22	6	PAYMENT	Final delivery approved. The project is now closed.	Job	1	HIGH	f	\N	\N	{"scopeType": "JOB", "deliveryId": 5}	2026-05-05 06:59:52.242	2026-05-05 06:59:52.242	\N	\N	\N	0	\N
23	4	REVIEW	Project closed. Please leave a review for your editor.	Job	1	NORMAL	f	\N	\N	{"scopeType": "JOB", "deliveryId": 5}	2026-05-05 06:59:52.242	2026-05-05 06:59:52.242	\N	\N	\N	0	\N
24	4	ORDER_UPDATE	Final delivery v1 is ready for review.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 6}	2026-05-05 07:01:39.37	2026-05-05 07:01:39.37	\N	\N	\N	0	\N
25	6	ORDER_UPDATE	The client requested changes on the final delivery.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 6, "reviewNote": "Smoke change request"}	2026-05-05 07:01:41.464	2026-05-05 07:01:41.464	\N	\N	\N	0	\N
26	4	ORDER_UPDATE	Final delivery v2 is ready for review.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 7}	2026-05-05 07:01:43.603	2026-05-05 07:01:43.603	\N	\N	\N	0	\N
27	6	PAYMENT	Final delivery approved. Escrow has been released.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 7}	2026-05-05 07:01:45.712	2026-05-05 07:01:45.712	\N	\N	\N	0	\N
28	4	REVIEW	Project closed. Please leave a review for your editor.	Order	4	NORMAL	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 7}	2026-05-05 07:01:45.712	2026-05-05 07:01:45.712	\N	\N	\N	0	\N
29	4	ORDER_UPDATE	Watermarked review cut v1 is ready for approval.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 8}	2026-05-05 07:19:10.754	2026-05-05 07:19:10.754	\N	\N	\N	0	\N
30	6	ORDER_UPDATE	The client requested changes on the final delivery.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 8, "reviewNote": "Smoke change request"}	2026-05-05 07:19:12.644	2026-05-05 07:19:12.644	\N	\N	\N	0	\N
31	4	ORDER_UPDATE	Watermarked review cut v2 is ready for approval.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 9}	2026-05-05 07:19:14.787	2026-05-05 07:19:14.787	\N	\N	\N	0	\N
32	6	ORDER_UPDATE	The client approved the review cut. Upload the full-resolution final master to complete delivery.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 9}	2026-05-05 07:19:16.661	2026-05-05 07:19:16.661	\N	\N	\N	0	\N
33	4	ORDER_UPDATE	Full-resolution final master is ready to download.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 9}	2026-05-05 07:19:18.818	2026-05-05 07:19:18.818	\N	\N	\N	0	\N
34	6	PAYMENT	Final master delivered. Escrow has been released.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 9}	2026-05-05 07:19:18.818	2026-05-05 07:19:18.818	\N	\N	\N	0	\N
35	4	REVIEW	Project closed. Please leave a review for your editor.	Order	4	NORMAL	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 9}	2026-05-05 07:19:18.818	2026-05-05 07:19:18.818	\N	\N	\N	0	\N
36	4	ORDER_UPDATE	Watermarked review cut v1 is ready for approval.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 10}	2026-05-05 08:53:27.433	2026-05-05 08:53:27.433	\N	\N	\N	0	\N
37	6	ORDER_UPDATE	The client requested changes on the final delivery.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 10, "reviewNote": "Smoke change request"}	2026-05-05 08:53:29.505	2026-05-05 08:53:29.505	\N	\N	\N	0	\N
38	4	ORDER_UPDATE	Watermarked review cut v2 is ready for approval.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 11}	2026-05-05 08:53:31.998	2026-05-05 08:53:31.998	\N	\N	\N	0	\N
39	6	ORDER_UPDATE	The client approved the review cut. Upload the full-resolution final master to complete delivery.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 11}	2026-05-05 08:53:33.856	2026-05-05 08:53:33.856	\N	\N	\N	0	\N
40	4	ORDER_UPDATE	Full-resolution final master is ready to download.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 11}	2026-05-05 08:53:35.984	2026-05-05 08:53:35.984	\N	\N	\N	0	\N
41	6	PAYMENT	Final master delivered. Escrow has been released.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 11}	2026-05-05 08:53:35.984	2026-05-05 08:53:35.984	\N	\N	\N	0	\N
42	4	REVIEW	Project closed. Please leave a review for your editor.	Order	4	NORMAL	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 11}	2026-05-05 08:53:35.984	2026-05-05 08:53:35.984	\N	\N	\N	0	\N
45	4	ORDER_UPDATE	Watermarked review cut v1 is ready for approval.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 13}	2026-05-05 10:10:50.874	2026-05-05 10:10:50.874	\N	\N	\N	0	\N
46	6	ORDER_UPDATE	The client requested changes on the final delivery.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 13, "reviewNote": "Smoke change request"}	2026-05-05 10:10:52.815	2026-05-05 10:10:52.815	\N	\N	\N	0	\N
47	4	ORDER_UPDATE	Watermarked review cut v2 is ready for approval.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 14}	2026-05-05 10:10:55.346	2026-05-05 10:10:55.346	\N	\N	\N	0	\N
48	6	ORDER_UPDATE	The client approved the review cut. Upload the full-resolution final master to complete delivery.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 14}	2026-05-05 10:10:57.255	2026-05-05 10:10:57.255	\N	\N	\N	0	\N
49	4	ORDER_UPDATE	Full-resolution final master is ready to download.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 14}	2026-05-05 10:10:59.42	2026-05-05 10:10:59.42	\N	\N	\N	0	\N
50	6	PAYMENT	Final master delivered. Escrow has been released.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 14}	2026-05-05 10:10:59.42	2026-05-05 10:10:59.42	\N	\N	\N	0	\N
51	4	REVIEW	Project closed. Please leave a review for your editor.	Order	4	NORMAL	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 14}	2026-05-05 10:10:59.42	2026-05-05 10:10:59.42	\N	\N	\N	0	\N
57	4	ORDER_UPDATE	Watermarked review cut v1 is ready for approval.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 16}	2026-05-05 10:40:24.876	2026-05-05 10:40:24.876	\N	\N	\N	0	\N
58	6	ORDER_UPDATE	The client requested changes on the final delivery.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 16, "reviewNote": "Smoke change request"}	2026-05-05 10:40:26.705	2026-05-05 10:40:26.705	\N	\N	\N	0	\N
59	4	ORDER_UPDATE	Watermarked review cut v2 is ready for approval.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 17}	2026-05-05 10:40:29.037	2026-05-05 10:40:29.037	\N	\N	\N	0	\N
60	6	ORDER_UPDATE	The client approved the review cut. Upload the full-resolution final master to complete delivery.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 17}	2026-05-05 10:40:30.92	2026-05-05 10:40:30.92	\N	\N	\N	0	\N
61	4	ORDER_UPDATE	Full-resolution final master is ready to download.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 17}	2026-05-05 10:40:32.987	2026-05-05 10:40:32.987	\N	\N	\N	0	\N
62	6	PAYMENT	Final master delivered. Escrow has been released.	Order	4	HIGH	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 17}	2026-05-05 10:40:32.987	2026-05-05 10:40:32.987	\N	\N	\N	0	\N
63	4	REVIEW	Project closed. Please leave a review for your editor.	Order	4	NORMAL	f	\N	\N	{"scopeType": "ORDER", "deliveryId": 17}	2026-05-05 10:40:32.987	2026-05-05 10:40:32.987	\N	\N	\N	0	\N
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Order" ("id", "gig_id", "client_id", "freelancer_id", "title", "description", "videoType", "numberOfVideos", "totalDuration", "referenceUrl", "aspectRatio", "addSubtitles", "expressDelivery", "uploadedFiles", "package", "totalPrice", "status", "requirements", "deliveryDeadline", "createdAt", "updatedAt", "completedAt", "orderNumber", "revisionsRequested", "revisionsCompleted", "deliveryExtensions", "extensionReason", "cancellationReason", "cancellationDate", "isUrgent", "priorityFee", "customDetails", "progress", "daysLeft", "currency", "sourceIp", "trackingId", "lastNotifiedAt", "orderSource", "clientNotes", "urgencyLevel", "orderPriority", "metadata", "lastModifiedBy", "region", "slaCompliance", "deletedAt", "escrowStatus", "platformFeePercent", "platformFeeAmount", "clientFeePercent", "clientFeeAmount", "freelancerPayout") FROM stdin;
4	1	4	2	fdggdfgfg	fgnffgfgnfnfgnfgngggfgfgfnfgnfgngfnfgngfnfgnfgnfgng	reels	1	19	https://www.youtube.com/watch?v=A_rkI2UQG6s	16:9	f	f	[]	Basic	23.00	PENDING	Any specific requirements	2026-05-08 11:30:25.696	2026-05-05 06:00:25.812	2026-05-05 06:00:25.812	\N	ORD-20260505-5FA7	0	0	0	\N	\N	\N	f	\N	{}	0	\N	USD	\N	\N	\N	WEB	\N	STANDARD	0	{"clientIp": "127.0.0.1"}	\N	\N	t	\N	NONE	12.5	3	3.5	1	20
\.


--
-- Data for Name: OrderStatusHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."OrderStatusHistory" ("id", "order_id", "status", "changedAt", "changed_by") FROM stdin;
4	4	PENDING	2026-05-05 06:00:25.812	4
7	4	COMPLETED	2026-05-05 07:01:45.712	4
\.


--
-- Data for Name: PaymentSetting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."PaymentSetting" ("id", "freelancer_id", "method", "details", "isVerified") FROM stdin;
\.


--
-- Data for Name: PinnedMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."PinnedMessage" ("id", "jobId", "messageId", "pinnedById", "createdAt") FROM stdin;
\.


--
-- Data for Name: PlatformFee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."PlatformFee" ("id", "transaction_id", "amount", "percentage", "createdAt") FROM stdin;
\.


--
-- Data for Name: PlatformRevenue; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."PlatformRevenue" ("id", "type", "amount", "sourceId", "sourceType", "description", "createdAt") FROM stdin;
3	SERVICE_FEE	4	4	Order	Order #ORD-20260505-5FA7: 12.5% freelancer fee + 3.5% client fee	2026-05-05 06:00:25.811999
\.


--
-- Data for Name: PortfolioVideo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."PortfolioVideo" ("id", "freelancer_id", "videoUrl", "title", "description", "uploadedAt", "views", "category", "thumbnailUrl") FROM stdin;
\.


--
-- Data for Name: ProjectFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."ProjectFile" ("id", "jobId", "uploaderId", "fileName", "url", "mimeType", "size", "category", "version", "status", "note", "createdAt", "updatedAt", "openCommentCount", "totalCommentCount", "durationSec", "orderId", "uploadedBy", "fileKey", "fileSize", "folder", "isLatest", "tags") FROM stdin;
1	1	4	test-clip.mp4	https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4	video/mp4	1024	deliverable	1	APPROVED	smoke test	2026-04-28 11:29:11.393251+00	2026-05-05 10:16:19.834571+00	2	2	\N	\N	\N	\N	\N	/	t	[]
10	1	6	Project (1).mp4	dev-placeholder/job/1/master/1777976207163-Project%20(1).mp4	video/mp4	47487982	final	1	APPROVED	Full-resolution final master	2026-05-05 10:16:48.061446+00	2026-05-05 10:16:56.127343+00	0	0	\N	\N	\N	\N	\N	/	t	[]
\.


--
-- Data for Name: Promotion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Promotion" ("id", "type", "code", "entityType", "entityId", "discountAmount", "discountType", "user_id", "status", "maxUses", "uses", "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: Referral; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Referral" ("id", "referrer_id", "referee_id", "referralCode", "status", "rewardAmount", "createdAt", "redeemedAt") FROM stdin;
\.


--
-- Data for Name: Review; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Review" ("id", "order_id", "client_id", "freelancer_id", "rating", "comment", "title", "isAnonymous", "helpfulCount", "response", "respondedAt", "isVerified", "moderationStatus", "moderatedAt", "moderated_by", "createdAt", "updatedAt", "gig_id", "deletedAt") FROM stdin;
\.


--
-- Data for Name: SavedItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."SavedItem" ("id", "user_id", "entityType", "entityId", "note", "createdAt", "updatedAt") FROM stdin;
3	4	GIG	1	\N	2026-05-04 08:54:05.283	2026-05-04 08:54:05.283
\.


--
-- Data for Name: Skill; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Skill" ("id", "name") FROM stdin;
\.


--
-- Data for Name: Timeline; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Timeline" ("id", "jobId", "title", "description", "startDate", "endDate", "isCompleted", "createdAt", "updatedAt", "progress", "color", "dependsOnId", "status") FROM stdin;
1	1	Rough delivery	\N	2026-05-01 05:30:00	2026-05-21 05:30:00	t	2026-05-05 06:02:10.398442	2026-05-05 06:41:31.328652	100	\N	\N	COMPLETED
2	1	Milestone 2	\N	2026-05-14 05:30:00	2026-05-14 05:30:00	t	2026-05-05 06:02:29.001491	2026-05-05 06:41:33.425306	100	\N	\N	COMPLETED
\.


--
-- Data for Name: Transaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."Transaction" ("id", "order_id", "user_id", "amount", "type", "paymentMethod", "status", "createdAt", "paymentGatewayId", "paymentIntentId", "refundReason", "fraudStatus", "ipAddress", "gatewayFee", "metadata") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."User" ("id", "auth0Id", "firstname", "lastname", "email", "password", "country", "username", "role", "profilePicture", "bio", "company", "companyEmail", "createdAt", "updatedAt", "isActive", "isProfileComplete", "lastNameChange", "isVerified", "totalJobs", "totalHours", "successRate", "rating", "applied_jobs_id", "accepted_jobs_id", "rejected_jobs_id") FROM stdin;
1	\N	Aryan	Gavhale	aryangavhale1405@gmail.com	$2b$10$k3VH.zV6YsuFi8G4ZqeDhOgTtrJgu2TXSCDEXzzva3aVuKA8pIpuy	IN	\N	CLIENT	\N	\N	\N	\N	2026-04-27 06:41:01.42	2026-04-27 06:41:01.42	t	t	\N	f	0	0	0	0	\N	\N	\N
2	\N	Aryan	Gavhale	aryangavhale14053@gmail.com	$2b$10$1Id41S8FoIgGreJ1jUr2/eG2Z7T/RpfZg/XxST96SnNBZ.dLoB.5G	IN	\N	CLIENT	\N	\N	\N	\N	2026-04-27 06:55:50.83	2026-04-27 06:55:50.83	t	t	\N	f	0	0	0	0	\N	\N	\N
3	\N	Aryan	Gavhale	aryangavhale140583@gmail.com	$2b$10$4dSy9qgtwKa56BqLcJ1Uz.JjUJ/MCDG7bLatRc9arVG1OGOWLuIzS	IN	\N	FREELANCER	\N	\N	\N	\N	2026-04-27 07:29:16.285	2026-04-27 07:29:16.285	t	f	\N	f	0	0	0	0	\N	\N	\N
4	\N	Aryan	Gavhale	aryan@gmail.com	$2b$10$maypv7xWjmpBepoFEkwKAOMQ.1BVSMgNHvVKB7u38kZ.M6WN.xeTa	IN	\N	CLIENT	\N	\N	\N	\N	2026-04-27 09:58:39.022	2026-04-27 09:58:39.022	t	t	\N	f	0	0	0	0	\N	\N	\N
5	\N	Aryan	Gavhale	aryangavhale@gmail.com	$2b$10$3IYIxWSn5yoCkuWFlXJJsu/Gpqiyr1xLC9uAkhi0.Mdlahbi/s8rO	IN	\N	CLIENT	\N	\N	\N	\N	2026-04-27 16:43:47.5	2026-04-27 16:43:47.5	t	t	\N	f	0	0	0	0	\N	\N	\N
6	\N	Aryan	Gavhale	aryangavhale1@gmail.com	$2b$10$XLKtBUIAbapt1X48RUsTc.FqLS26qzQaKMM6WCUgxOJ19eG4FAPDi	IN	\N	FREELANCER	\N	\N	\N	\N	2026-04-27 16:44:35.82	2026-04-28 05:44:44.052	t	t	\N	f	0	0	0	0	{1}	{1}	\N
7	\N	John	Doe	john@example.com	$2b$10$2EgjoT4kjjHrhSTSDfo6SOx2fiWRCAROkvgVClC8FS3Sqa.C.8ree	US	\N	FREELANCER	\N	\N	\N	\N	2026-04-28 10:31:00.877	2026-04-28 10:31:00.877	t	f	\N	f	0	0	0	0	\N	\N	\N
\.


--
-- Data for Name: UserBadge; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."UserBadge" ("id", "freelancerId", "badgeId", "earnedAt", "isVisible") FROM stdin;
\.


--
-- Data for Name: VideoReviewComment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."VideoReviewComment" ("id", "jobId", "fileId", "authorId", "timestampSec", "endTimestampSec", "content", "drawing", "parentId", "status", "resolvedById", "resolvedAt", "createdAt", "updatedAt") FROM stdin;
1e0adf1a-f705-4a0e-bfb9-dc88fe459600	1	1	6	0.000	\N	Here is the issue	\N	\N	OPEN	\N	\N	2026-04-28 17:02:52.896	2026-04-28 17:02:52.896
85ffd7e8-a61d-46f4-9dcf-abf9d7506fcb	1	1	6	0.000	\N	Here is the issue	\N	\N	OPEN	\N	\N	2026-04-28 17:02:54.238	2026-04-28 17:02:54.238
\.


--
-- Data for Name: WebhookEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."WebhookEvent" ("id", "stripeEventId", "type", "processed", "createdAt") FROM stdin;
\.


--
-- Name: Application_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Application_id_seq"', 2, true);


--
-- Name: Category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Category_id_seq"', 1, false);


--
-- Name: Contact_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Contact_id_seq"', 1, false);


--
-- Name: CounterpartyReview_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."CounterpartyReview_id_seq"', 2, true);


--
-- Name: DisputeComment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."DisputeComment_id_seq"', 1, false);


--
-- Name: DisputeEvidence_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."DisputeEvidence_id_seq"', 1, false);


--
-- Name: Dispute_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Dispute_id_seq"', 1, false);


--
-- Name: FileUpload_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."FileUpload_id_seq"', 1, false);


--
-- Name: FinalDelivery_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."FinalDelivery_id_seq"', 17, true);


--
-- Name: FreelancerProfile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."FreelancerProfile_id_seq"', 5, true);


--
-- Name: FreelancerSoftware_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."FreelancerSoftware_id_seq"', 1, false);


--
-- Name: GigSampleMedia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."GigSampleMedia_id_seq"', 1, false);


--
-- Name: Gig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Gig_id_seq"', 1, true);


--
-- Name: Job_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Job_id_seq"', 1, true);


--
-- Name: MediaAsset_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."MediaAsset_id_seq"', 3, true);


--
-- Name: Milestone_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Milestone_id_seq"', 1, false);


--
-- Name: Notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Notification_id_seq"', 63, true);


--
-- Name: OrderStatusHistory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."OrderStatusHistory_id_seq"', 7, true);


--
-- Name: Order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Order_id_seq"', 5, true);


--
-- Name: PaymentSetting_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."PaymentSetting_id_seq"', 1, false);


--
-- Name: PinnedMessage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."PinnedMessage_id_seq"', 1, false);


--
-- Name: PlatformFee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."PlatformFee_id_seq"', 1, false);


--
-- Name: PlatformRevenue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."PlatformRevenue_id_seq"', 4, true);


--
-- Name: PortfolioVideo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."PortfolioVideo_id_seq"', 1, false);


--
-- Name: ProjectFile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."ProjectFile_id_seq"', 13, true);


--
-- Name: Promotion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Promotion_id_seq"', 1, false);


--
-- Name: Referral_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Referral_id_seq"', 1, false);


--
-- Name: Review_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Review_id_seq"', 1, false);


--
-- Name: SavedItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."SavedItem_id_seq"', 3, true);


--
-- Name: Skill_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Skill_id_seq"', 1, false);


--
-- Name: Timeline_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Timeline_id_seq"', 2, true);


--
-- Name: Transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."Transaction_id_seq"', 1, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."User_id_seq"', 7, true);


--
-- Name: WebhookEvent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."WebhookEvent_id_seq"', 1, false);


--
-- Name: Application Application_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Application"
    ADD CONSTRAINT "Application_pkey" PRIMARY KEY ("id");


--
-- Name: Badge Badge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Badge"
    ADD CONSTRAINT "Badge_pkey" PRIMARY KEY ("id");


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY ("id");


--
-- Name: CoWatchSession CoWatchSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."CoWatchSession"
    ADD CONSTRAINT "CoWatchSession_pkey" PRIMARY KEY ("id");


--
-- Name: ContactFile ContactFile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ContactFile"
    ADD CONSTRAINT "ContactFile_pkey" PRIMARY KEY ("id");


--
-- Name: ContactSubmission ContactSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ContactSubmission"
    ADD CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id");


--
-- Name: Contact Contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Contact"
    ADD CONSTRAINT "Contact_pkey" PRIMARY KEY ("id");


--
-- Name: CounterpartyReview CounterpartyReview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."CounterpartyReview"
    ADD CONSTRAINT "CounterpartyReview_pkey" PRIMARY KEY ("id");


--
-- Name: DisputeComment DisputeComment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."DisputeComment"
    ADD CONSTRAINT "DisputeComment_pkey" PRIMARY KEY ("id");


--
-- Name: DisputeEvidence DisputeEvidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."DisputeEvidence"
    ADD CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id");


--
-- Name: Dispute Dispute_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Dispute"
    ADD CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id");


--
-- Name: FileUpload FileUpload_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FileUpload"
    ADD CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id");


--
-- Name: FinalDelivery FinalDelivery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FinalDelivery"
    ADD CONSTRAINT "FinalDelivery_pkey" PRIMARY KEY ("id");


--
-- Name: FreelancerProfile FreelancerProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FreelancerProfile"
    ADD CONSTRAINT "FreelancerProfile_pkey" PRIMARY KEY ("id");


--
-- Name: FreelancerSkill FreelancerSkill_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FreelancerSkill"
    ADD CONSTRAINT "FreelancerSkill_pkey" PRIMARY KEY ("freelancer_id", "skill_id");


--
-- Name: FreelancerSoftware FreelancerSoftware_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FreelancerSoftware"
    ADD CONSTRAINT "FreelancerSoftware_pkey" PRIMARY KEY ("id");


--
-- Name: GigSampleMedia GigSampleMedia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."GigSampleMedia"
    ADD CONSTRAINT "GigSampleMedia_pkey" PRIMARY KEY ("id");


--
-- Name: Gig Gig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Gig"
    ADD CONSTRAINT "Gig_pkey" PRIMARY KEY ("id");


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id");


--
-- Name: Job Job_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Job"
    ADD CONSTRAINT "Job_pkey" PRIMARY KEY ("id");


--
-- Name: MediaAsset MediaAsset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MediaAsset"
    ADD CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id");


--
-- Name: MessageReaction MessageReaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MessageReaction"
    ADD CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id");


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY ("id");


--
-- Name: Milestone Milestone_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Milestone"
    ADD CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id");


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY ("id");


--
-- Name: OrderStatusHistory OrderStatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."OrderStatusHistory"
    ADD CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id");


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");


--
-- Name: PaymentSetting PaymentSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PaymentSetting"
    ADD CONSTRAINT "PaymentSetting_pkey" PRIMARY KEY ("id");


--
-- Name: PinnedMessage PinnedMessage_jobId_messageId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PinnedMessage"
    ADD CONSTRAINT "PinnedMessage_jobId_messageId_key" UNIQUE ("jobId", "messageId");


--
-- Name: PinnedMessage PinnedMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PinnedMessage"
    ADD CONSTRAINT "PinnedMessage_pkey" PRIMARY KEY ("id");


--
-- Name: PlatformFee PlatformFee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PlatformFee"
    ADD CONSTRAINT "PlatformFee_pkey" PRIMARY KEY ("id");


--
-- Name: PlatformRevenue PlatformRevenue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PlatformRevenue"
    ADD CONSTRAINT "PlatformRevenue_pkey" PRIMARY KEY ("id");


--
-- Name: PortfolioVideo PortfolioVideo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PortfolioVideo"
    ADD CONSTRAINT "PortfolioVideo_pkey" PRIMARY KEY ("id");


--
-- Name: ProjectFile ProjectFile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ProjectFile"
    ADD CONSTRAINT "ProjectFile_pkey" PRIMARY KEY ("id");


--
-- Name: Promotion Promotion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Promotion"
    ADD CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id");


--
-- Name: Referral Referral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Referral"
    ADD CONSTRAINT "Referral_pkey" PRIMARY KEY ("id");


--
-- Name: Review Review_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Review"
    ADD CONSTRAINT "Review_pkey" PRIMARY KEY ("id");


--
-- Name: SavedItem SavedItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."SavedItem"
    ADD CONSTRAINT "SavedItem_pkey" PRIMARY KEY ("id");


--
-- Name: SavedItem SavedItem_user_id_entityType_entityId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."SavedItem"
    ADD CONSTRAINT "SavedItem_user_id_entityType_entityId_key" UNIQUE ("user_id", "entityType", "entityId");


--
-- Name: Skill Skill_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Skill"
    ADD CONSTRAINT "Skill_pkey" PRIMARY KEY ("id");


--
-- Name: Timeline Timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Timeline"
    ADD CONSTRAINT "Timeline_pkey" PRIMARY KEY ("id");


--
-- Name: Transaction Transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Transaction"
    ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id");


--
-- Name: UserBadge UserBadge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."UserBadge"
    ADD CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");


--
-- Name: VideoReviewComment VideoReviewComment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."VideoReviewComment"
    ADD CONSTRAINT "VideoReviewComment_pkey" PRIMARY KEY ("id");


--
-- Name: WebhookEvent WebhookEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."WebhookEvent"
    ADD CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id");


--
-- Name: Application_freelancerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Application_freelancerId_idx" ON "public"."Application" USING "btree" ("freelancerId");


--
-- Name: Application_jobId_freelancerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Application_jobId_freelancerId_key" ON "public"."Application" USING "btree" ("jobId", "freelancerId");


--
-- Name: Badge_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Badge_name_key" ON "public"."Badge" USING "btree" ("name");


--
-- Name: Category_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category" USING "btree" ("name");


--
-- Name: ContactFile_contactId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactFile_contactId_idx" ON "public"."ContactFile" USING "btree" ("contactId");


--
-- Name: ContactFile_contactSubmissionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactFile_contactSubmissionId_idx" ON "public"."ContactFile" USING "btree" ("contactSubmissionId");


--
-- Name: ContactSubmission_assignedAdminId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactSubmission_assignedAdminId_idx" ON "public"."ContactSubmission" USING "btree" ("assignedAdminId");


--
-- Name: ContactSubmission_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactSubmission_createdAt_idx" ON "public"."ContactSubmission" USING "btree" ("createdAt");


--
-- Name: ContactSubmission_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactSubmission_email_idx" ON "public"."ContactSubmission" USING "btree" ("email");


--
-- Name: ContactSubmission_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactSubmission_priority_idx" ON "public"."ContactSubmission" USING "btree" ("priority");


--
-- Name: ContactSubmission_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactSubmission_status_idx" ON "public"."ContactSubmission" USING "btree" ("status");


--
-- Name: Dispute_order_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Dispute_order_id_key" ON "public"."Dispute" USING "btree" ("order_id");


--
-- Name: FileUpload_jobId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FileUpload_jobId_idx" ON "public"."FileUpload" USING "btree" ("jobId");


--
-- Name: FileUpload_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FileUpload_orderId_idx" ON "public"."FileUpload" USING "btree" ("orderId");


--
-- Name: FileUpload_uploadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FileUpload_uploadId_idx" ON "public"."FileUpload" USING "btree" ("uploadId");


--
-- Name: FileUpload_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FileUpload_userId_idx" ON "public"."FileUpload" USING "btree" ("userId");


--
-- Name: FreelancerProfile_performanceScore_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FreelancerProfile_performanceScore_idx" ON "public"."FreelancerProfile" USING "btree" ("performanceScore");


--
-- Name: FreelancerProfile_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FreelancerProfile_user_id_idx" ON "public"."FreelancerProfile" USING "btree" ("user_id");


--
-- Name: FreelancerProfile_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FreelancerProfile_user_id_key" ON "public"."FreelancerProfile" USING "btree" ("user_id");


--
-- Name: Gig_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Gig_category_idx" ON "public"."Gig" USING "btree" ("category");


--
-- Name: Gig_freelancer_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Gig_freelancer_id_status_idx" ON "public"."Gig" USING "btree" ("freelancer_id", "status");


--
-- Name: Gig_visibilityScore_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Gig_visibilityScore_idx" ON "public"."Gig" USING "btree" ("visibilityScore");


--
-- Name: Invoice_invoiceNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "public"."Invoice" USING "btree" ("invoiceNumber");


--
-- Name: Invoice_order_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invoice_order_id_key" ON "public"."Invoice" USING "btree" ("order_id");


--
-- Name: Job_freelancer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Job_freelancer_id_idx" ON "public"."Job" USING "btree" ("freelancer_id");


--
-- Name: Job_posted_by_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Job_posted_by_id_idx" ON "public"."Job" USING "btree" ("posted_by_id");


--
-- Name: Job_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Job_status_idx" ON "public"."Job" USING "btree" ("status");


--
-- Name: MessageReaction_messageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MessageReaction_messageId_idx" ON "public"."MessageReaction" USING "btree" ("messageId");


--
-- Name: MessageReaction_messageId_userId_emoji_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "public"."MessageReaction" USING "btree" ("messageId", "userId", "emoji");


--
-- Name: Message_jobId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_jobId_timestamp_idx" ON "public"."Message" USING "btree" ("jobId", "timestamp");


--
-- Name: Message_orderId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_orderId_timestamp_idx" ON "public"."Message" USING "btree" ("orderId", "timestamp");


--
-- Name: Message_senderId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_senderId_timestamp_idx" ON "public"."Message" USING "btree" ("senderId", "timestamp");


--
-- Name: Milestone_order_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Milestone_order_id_status_idx" ON "public"."Milestone" USING "btree" ("order_id", "status");


--
-- Name: Notification_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_entityType_entityId_idx" ON "public"."Notification" USING "btree" ("entityType", "entityId");


--
-- Name: Notification_user_id_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_user_id_createdAt_idx" ON "public"."Notification" USING "btree" ("user_id", "createdAt");


--
-- Name: Order_client_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_client_id_status_idx" ON "public"."Order" USING "btree" ("client_id", "status");


--
-- Name: Order_freelancer_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_freelancer_id_status_idx" ON "public"."Order" USING "btree" ("freelancer_id", "status");


--
-- Name: Order_gig_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_gig_id_status_idx" ON "public"."Order" USING "btree" ("gig_id", "status");


--
-- Name: Order_orderNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_orderNumber_idx" ON "public"."Order" USING "btree" ("orderNumber");


--
-- Name: Order_orderNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_orderNumber_key" ON "public"."Order" USING "btree" ("orderNumber");


--
-- Name: Order_orderPriority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_orderPriority_idx" ON "public"."Order" USING "btree" ("orderPriority");


--
-- Name: Order_trackingId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_trackingId_key" ON "public"."Order" USING "btree" ("trackingId");


--
-- Name: PinnedMessage_jobId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PinnedMessage_jobId_idx" ON "public"."PinnedMessage" USING "btree" ("jobId");


--
-- Name: PlatformFee_transaction_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PlatformFee_transaction_id_key" ON "public"."PlatformFee" USING "btree" ("transaction_id");


--
-- Name: ProjectFile_jobId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectFile_jobId_idx" ON "public"."ProjectFile" USING "btree" ("jobId");


--
-- Name: ProjectFile_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectFile_status_idx" ON "public"."ProjectFile" USING "btree" ("status");


--
-- Name: Promotion_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Promotion_code_key" ON "public"."Promotion" USING "btree" ("code");


--
-- Name: Referral_referee_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Referral_referee_id_key" ON "public"."Referral" USING "btree" ("referee_id");


--
-- Name: Referral_referralCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Referral_referralCode_key" ON "public"."Referral" USING "btree" ("referralCode");


--
-- Name: Review_order_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Review_order_id_key" ON "public"."Review" USING "btree" ("order_id");


--
-- Name: Skill_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Skill_name_key" ON "public"."Skill" USING "btree" ("name");


--
-- Name: Transaction_paymentGatewayId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Transaction_paymentGatewayId_key" ON "public"."Transaction" USING "btree" ("paymentGatewayId");


--
-- Name: User_auth0Id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_auth0Id_key" ON "public"."User" USING "btree" ("auth0Id");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_email_idx" ON "public"."User" USING "btree" ("email");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON "public"."User" USING "btree" ("email");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_username_key" ON "public"."User" USING "btree" ("username");


--
-- Name: WebhookEvent_stripeEventId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WebhookEvent_stripeEventId_key" ON "public"."WebhookEvent" USING "btree" ("stripeEventId");


--
-- Name: idx_counterparty_review_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_counterparty_review_job" ON "public"."CounterpartyReview" USING "btree" ("jobId", "createdAt" DESC);


--
-- Name: idx_counterparty_review_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_counterparty_review_order" ON "public"."CounterpartyReview" USING "btree" ("orderId", "createdAt" DESC);


--
-- Name: idx_counterparty_review_reviewee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_counterparty_review_reviewee" ON "public"."CounterpartyReview" USING "btree" ("revieweeId", "createdAt" DESC);


--
-- Name: idx_counterparty_review_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_counterparty_review_unique_active" ON "public"."CounterpartyReview" USING "btree" ("scopeType", COALESCE("orderId", 0), COALESCE("jobId", 0), "reviewerId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_cws_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_cws_active" ON "public"."CoWatchSession" USING "btree" ("fileId") WHERE ("endedAt" IS NULL);


--
-- Name: idx_final_delivery_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_final_delivery_job" ON "public"."FinalDelivery" USING "btree" ("jobId", "createdAt" DESC);


--
-- Name: idx_final_delivery_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_final_delivery_order" ON "public"."FinalDelivery" USING "btree" ("orderId", "createdAt" DESC);


--
-- Name: idx_final_delivery_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_final_delivery_status" ON "public"."FinalDelivery" USING "btree" ("status", "reviewDueAt");


--
-- Name: idx_freelancer_stripe_connected_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_freelancer_stripe_connected_account" ON "public"."FreelancerProfile" USING "btree" ("stripeConnectedAccountId");


--
-- Name: idx_media_asset_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_asset_cleanup" ON "public"."MediaAsset" USING "btree" ("cleanupAfter") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_media_asset_file_upload_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_media_asset_file_upload_active" ON "public"."MediaAsset" USING "btree" ("fileUploadId") WHERE (("fileUploadId" IS NOT NULL) AND ("deletedAt" IS NULL));


--
-- Name: idx_media_asset_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_asset_job" ON "public"."MediaAsset" USING "btree" ("jobId", "createdAt" DESC);


--
-- Name: idx_media_asset_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_asset_order" ON "public"."MediaAsset" USING "btree" ("orderId", "createdAt" DESC);


--
-- Name: idx_media_asset_project_file_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_media_asset_project_file_active" ON "public"."MediaAsset" USING "btree" ("projectFileId") WHERE (("projectFileId" IS NOT NULL) AND ("deletedAt" IS NULL));


--
-- Name: idx_media_asset_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_media_asset_status" ON "public"."MediaAsset" USING "btree" ("status", "scanStatus", "processingStatus");


--
-- Name: idx_project_file_order_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_project_file_order_folder" ON "public"."ProjectFile" USING "btree" ("orderId", "folder", "isLatest");


--
-- Name: idx_revenue_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_revenue_date" ON "public"."PlatformRevenue" USING "btree" ("createdAt");


--
-- Name: idx_revenue_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_revenue_type" ON "public"."PlatformRevenue" USING "btree" ("type");


--
-- Name: idx_review_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_review_deleted_at" ON "public"."Review" USING "btree" ("deletedAt") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_saved_item_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_saved_item_user_created" ON "public"."SavedItem" USING "btree" ("user_id", "createdAt" DESC);


--
-- Name: idx_saved_item_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_saved_item_user_type" ON "public"."SavedItem" USING "btree" ("user_id", "entityType");


--
-- Name: idx_timeline_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_timeline_job" ON "public"."Timeline" USING "btree" ("jobId");


--
-- Name: idx_vrc_file; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_vrc_file" ON "public"."VideoReviewComment" USING "btree" ("fileId", "status");


--
-- Name: idx_vrc_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_vrc_job" ON "public"."VideoReviewComment" USING "btree" ("jobId");


--
-- Name: idx_vrc_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_vrc_parent" ON "public"."VideoReviewComment" USING "btree" ("parentId");


--
-- Name: idx_vrc_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_vrc_timestamp" ON "public"."VideoReviewComment" USING "btree" ("fileId", "timestampSec");


--
-- Name: Application Application_freelancerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Application"
    ADD CONSTRAINT "Application_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Application Application_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Application"
    ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Category Category_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Category"
    ADD CONSTRAINT "Category_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."Category"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ContactFile ContactFile_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ContactFile"
    ADD CONSTRAINT "ContactFile_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ContactFile ContactFile_contactSubmissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ContactFile"
    ADD CONSTRAINT "ContactFile_contactSubmissionId_fkey" FOREIGN KEY ("contactSubmissionId") REFERENCES "public"."ContactSubmission"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DisputeComment DisputeComment_dispute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."DisputeComment"
    ADD CONSTRAINT "DisputeComment_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "public"."Dispute"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DisputeComment DisputeComment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."DisputeComment"
    ADD CONSTRAINT "DisputeComment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DisputeEvidence DisputeEvidence_dispute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."DisputeEvidence"
    ADD CONSTRAINT "DisputeEvidence_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "public"."Dispute"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DisputeEvidence DisputeEvidence_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."DisputeEvidence"
    ADD CONSTRAINT "DisputeEvidence_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dispute Dispute_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Dispute"
    ADD CONSTRAINT "Dispute_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."Order"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Dispute Dispute_raised_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Dispute"
    ADD CONSTRAINT "Dispute_raised_by_id_fkey" FOREIGN KEY ("raised_by_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dispute Dispute_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Dispute"
    ADD CONSTRAINT "Dispute_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FileUpload FileUpload_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FileUpload"
    ADD CONSTRAINT "FileUpload_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id");


--
-- Name: FileUpload FileUpload_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FileUpload"
    ADD CONSTRAINT "FileUpload_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id");


--
-- Name: FileUpload FileUpload_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FileUpload"
    ADD CONSTRAINT "FileUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id");


--
-- Name: FreelancerProfile FreelancerProfile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FreelancerProfile"
    ADD CONSTRAINT "FreelancerProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FreelancerSkill FreelancerSkill_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FreelancerSkill"
    ADD CONSTRAINT "FreelancerSkill_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "public"."FreelancerProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FreelancerSkill FreelancerSkill_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FreelancerSkill"
    ADD CONSTRAINT "FreelancerSkill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."Skill"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FreelancerSoftware FreelancerSoftware_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."FreelancerSoftware"
    ADD CONSTRAINT "FreelancerSoftware_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "public"."FreelancerProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GigSampleMedia GigSampleMedia_gig_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."GigSampleMedia"
    ADD CONSTRAINT "GigSampleMedia_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "public"."Gig"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Gig Gig_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Gig"
    ADD CONSTRAINT "Gig_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "public"."FreelancerProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Invoice Invoice_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Invoice"
    ADD CONSTRAINT "Invoice_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Invoice"
    ADD CONSTRAINT "Invoice_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "public"."FreelancerProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Invoice Invoice_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Invoice"
    ADD CONSTRAINT "Invoice_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."Order"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Job Job_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Job"
    ADD CONSTRAINT "Job_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Job Job_posted_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Job"
    ADD CONSTRAINT "Job_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MessageReaction MessageReaction_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MessageReaction"
    ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MessageReaction MessageReaction_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MessageReaction"
    ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Message"
    ADD CONSTRAINT "Message_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Message Message_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Message"
    ADD CONSTRAINT "Message_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Message Message_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Message"
    ADD CONSTRAINT "Message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Message"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Message Message_receiverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Message"
    ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Message Message_replyTo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Message"
    ADD CONSTRAINT "Message_replyTo_fkey" FOREIGN KEY ("replyTo") REFERENCES "public"."Message"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Message Message_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Message"
    ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Milestone Milestone_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Milestone"
    ADD CONSTRAINT "Milestone_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Milestone Milestone_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Milestone"
    ADD CONSTRAINT "Milestone_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."Order"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Notification"
    ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderStatusHistory OrderStatusHistory_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."OrderStatusHistory"
    ADD CONSTRAINT "OrderStatusHistory_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderStatusHistory OrderStatusHistory_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."OrderStatusHistory"
    ADD CONSTRAINT "OrderStatusHistory_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."Order"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Order Order_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Order"
    ADD CONSTRAINT "Order_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Order"
    ADD CONSTRAINT "Order_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "public"."FreelancerProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Order Order_gig_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Order"
    ADD CONSTRAINT "Order_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "public"."Gig"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentSetting PaymentSetting_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PaymentSetting"
    ADD CONSTRAINT "PaymentSetting_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "public"."FreelancerProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PinnedMessage PinnedMessage_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PinnedMessage"
    ADD CONSTRAINT "PinnedMessage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE;


--
-- Name: PinnedMessage PinnedMessage_pinnedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PinnedMessage"
    ADD CONSTRAINT "PinnedMessage_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "public"."User"("id");


--
-- Name: PlatformFee PlatformFee_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PlatformFee"
    ADD CONSTRAINT "PlatformFee_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."Transaction"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PortfolioVideo PortfolioVideo_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PortfolioVideo"
    ADD CONSTRAINT "PortfolioVideo_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "public"."FreelancerProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectFile ProjectFile_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ProjectFile"
    ADD CONSTRAINT "ProjectFile_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE;


--
-- Name: ProjectFile ProjectFile_uploaderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ProjectFile"
    ADD CONSTRAINT "ProjectFile_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "public"."User"("id");


--
-- Name: Promotion Promotion_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Promotion"
    ADD CONSTRAINT "Promotion_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Referral Referral_referee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Referral"
    ADD CONSTRAINT "Referral_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Referral Referral_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Referral"
    ADD CONSTRAINT "Referral_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Review Review_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Review"
    ADD CONSTRAINT "Review_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Review Review_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Review"
    ADD CONSTRAINT "Review_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "public"."FreelancerProfile"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Review Review_gig_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Review"
    ADD CONSTRAINT "Review_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "public"."Gig"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Review Review_moderated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Review"
    ADD CONSTRAINT "Review_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Review Review_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Review"
    ADD CONSTRAINT "Review_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."Order"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SavedItem SavedItem_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."SavedItem"
    ADD CONSTRAINT "SavedItem_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE;


--
-- Name: Timeline Timeline_dependsOnId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Timeline"
    ADD CONSTRAINT "Timeline_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "public"."Timeline"("id") ON DELETE SET NULL;


--
-- Name: Timeline Timeline_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Timeline"
    ADD CONSTRAINT "Timeline_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE;


--
-- Name: Transaction Transaction_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Transaction"
    ADD CONSTRAINT "Transaction_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."Order"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Transaction Transaction_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Transaction"
    ADD CONSTRAINT "Transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserBadge UserBadge_badgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."UserBadge"
    ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "public"."Badge"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserBadge UserBadge_freelancerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."UserBadge"
    ADD CONSTRAINT "UserBadge_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "public"."FreelancerProfile"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VideoReviewComment VideoReviewComment_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."VideoReviewComment"
    ADD CONSTRAINT "VideoReviewComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."VideoReviewComment"("id") ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict rBqUrQUdr3XfCGUb9rl7sJAYUxbzLaq5zFLrndYieFnCAzD6kvWYd98hckqMpsr

