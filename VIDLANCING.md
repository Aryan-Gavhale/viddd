# Vidlancing — Complete Product Documentation

> **The world's first freelancing platform built exclusively for video editors.**
>
> Vidlancing connects video editors with clients through a specialized marketplace featuring milestone-based payments, real-time collaboration tools, AI-powered matching, and a full creative toolkit — all with industry-leading low fees.

---

## Table of Contents

1. [High-Level Design (HLD)](#1-high-level-design)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema](#4-database-schema)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Real-Time Communication](#7-real-time-communication)
8. [Security Architecture](#8-security-architecture)
9. [Revenue & Monetization](#9-revenue--monetization)
10. [Feature Catalog](#10-feature-catalog)
11. [API Reference](#11-api-reference)
12. [Infrastructure & DevOps](#12-infrastructure--devops)
13. [Data Flow Diagrams](#13-data-flow-diagrams)
14. [Scalability Considerations](#14-scalability-considerations)

---

## 1. High-Level Design

### 1.1 Vision

Vidlancing is a vertical marketplace solving the fragmented video editing freelance market. Unlike horizontal platforms (Upwork, Fiverr), it provides specialized tools for the video production workflow: frame-accurate review, render farm integration, milestone-based escrow payments, and AI-powered editor matching.

### 1.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS (Browsers)                         │
│   React 18 + Vite 6 + Redux Toolkit + TanStack Query + Tailwind   │
└────────────────────┬──────────────────┬────────────────────────────┘
                     │ HTTPS/REST       │ WSS (Socket.IO)
                     ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LOAD BALANCER / REVERSE PROXY                 │
│                         (Nginx / AWS ALB)                          │
└────────────────────┬──────────────────┬────────────────────────────┘
                     │                  │
                     ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION SERVER CLUSTER                       │
│                                                                     │
│  ┌───────────────────────────────┐  ┌────────────────────────────┐ │
│  │      Fastify HTTP Server      │  │   Socket.IO Server         │ │
│  │  ┌─────────┐  ┌────────────┐  │  │  ┌────────┐  ┌─────────┐  │ │
│  │  │  Routes  │  │ Middleware │  │  │  │ Events │  │  Rooms  │  │ │
│  │  │ (39 rte) │  │ (10 mw)   │  │  │  │ (15+)  │  │ (3 pat) │  │ │
│  │  └────┬─────┘  └─────┬─────┘  │  │  └────────┘  └─────────┘  │ │
│  │       │              │         │  │                            │ │
│  │  ┌────▼──────────────▼──────┐  │  │                            │ │
│  │  │   Controllers (36)       │  │  │                            │ │
│  │  └────────────┬─────────────┘  │  │                            │ │
│  └───────────────┼────────────────┘  └────────────────────────────┘ │
│                  │                                                   │
└──────────────────┼───────────────────────────────────────────────────┘
                   │
     ┌─────────────┼──────────────┬──────────────────┐
     ▼             ▼              ▼                  ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐
│PostgreSQL│  │  Redis   │  │  AWS S3  │  │    Stripe     │
│  (60+    │  │ (Cache,  │  │ (Files,  │  │  (Payments,   │
│  tables) │  │  Queues, │  │  Media,  │  │   Escrow,     │
│          │  │  Rate    │  │  Assets) │  │   Webhooks)   │
│          │  │  Limit)  │  │          │  │               │
└─────────┘  └──────────┘  └──────────┘  └───────────────┘
                   │
              ┌────▼────┐
              │  Bull    │
              │ Queues   │
              │ (Email,  │
              │  Notif)  │
              └─────────┘
```

### 1.3 Core Entities

| Entity | Description |
|--------|-------------|
| **User** | Client, Freelancer, or Admin with role-based access |
| **FreelancerProfile** | Extended profile with skills, software, style tags, portfolio |
| **Gig** | Service listing by a freelancer with tiered pricing |
| **Job** | Project posted by a client seeking freelancers |
| **Order** | Accepted engagement between client and freelancer |
| **Milestone** | Payment checkpoint within an order |
| **Message** | Real-time chat with reactions, edits, attachments |
| **Transaction** | Financial record (escrow, release, refund) |
| **Review** | Client ↔ freelancer feedback |

---

## 2. System Architecture

### 2.1 Monolithic Application (Current)

The application follows a **modular monolith** pattern — a single deployable with clearly separated domains organized by controllers, routes, and services.

### 2.2 Request Lifecycle

```
HTTP Request
  → Fastify Server
    → Rate Limiter (Redis-backed)
    → Helmet (Security Headers + CSP)
    → CORS (cookie credentials)
    → Cookie Parser
    → Authentication Middleware (JWT httpOnly cookie)
    → Joi Validation (request body/params)
    → Controller Logic
    → Raw PostgreSQL (pg driver)
    → ApiResponse / ApiError formatting
    → Error Middleware (centralized)
  → HTTP Response
```

### 2.3 Background Processing

```
Bull Queue (Redis-backed)
  ├── emailQueue     → Nodemailer (SMTP)
  ├── notificationQueue → DB insert + Socket.IO emit
  └── paymentQueue   → Stripe API calls
```

---

## 3. Tech Stack

### 3.1 Backend

| Technology | Purpose | Version |
|-----------|---------|---------|
| **Node.js** | Runtime | 18+ |
| **TypeScript** | Type safety | 5.x |
| **Fastify** | HTTP framework (migrated from Express) | 5.x |
| **PostgreSQL** | Primary database | 15+ |
| **pg** | Database driver (raw SQL, replaced Prisma) | 8.x |
| **Redis / ioredis** | Caching, rate limiting, session, queues | 5.x |
| **Socket.IO** | Real-time bidirectional communication | 4.x |
| **Bull** | Background job processing | 4.x |
| **Stripe** | Payment processing, escrow | latest |
| **AWS S3 (v3 SDK)** | File storage, media hosting | 3.x |
| **Joi** | Request validation | 17.x |
| **JWT (jsonwebtoken)** | Authentication tokens | 9.x |
| **bcrypt** | Password hashing | 5.x |
| **Winston** | Structured logging | 3.x |
| **Helmet** | Security headers | latest |
| **Multer + multer-s3** | File upload handling | latest |
| **Nodemailer** | Transactional emails | latest |

### 3.2 Frontend

| Technology | Purpose | Version |
|-----------|---------|---------|
| **React** | UI framework | 18.x |
| **Vite** | Build tool & dev server | 6.x |
| **Redux Toolkit** | Global state management | latest |
| **TanStack Query** | Server state & caching | latest |
| **React Router DOM** | Client-side routing | 6.x |
| **Tailwind CSS** | Utility-first styling | 3.x |
| **Framer Motion** | Animations & transitions | latest |
| **Recharts** | Data visualization | latest |
| **Socket.IO Client** | Real-time frontend | 4.x |
| **Axios** | HTTP client (with 401 interceptor) | latest |
| **React Toastify** | Toast notifications | latest |
| **React Helmet Async** | Dynamic page titles & meta | latest |
| **Lucide React** | Icon library | latest |
| **Headless UI / Radix** | Accessible UI primitives | latest |

### 3.3 Shared

| Component | Location |
|-----------|----------|
| Socket.IO event constants | `shared/socketEvents.js` |
| Room patterns | `shared/socketEvents.js` |

---

## 4. Database Schema

### 4.1 Entity-Relationship Overview

The database contains **60+ tables** organized across the following domains:

#### Core Platform
| Table | Description |
|-------|-------------|
| `User` | Authentication, roles (CLIENT/FREELANCER/ADMIN), profile |
| `FreelancerProfile` | Extended freelancer data (bio, skills, rates, style tags) |
| `FreelancerSkill` | Many-to-many user ↔ skill junction |
| `FreelancerSoftware` | Software proficiency records |
| `Category` | Platform categories (Motion Graphics, Color Grading, etc.) |
| `SubCategory` | Granular niches (Logo Animations, Wedding Films, etc.) |

#### Marketplace
| Table | Description |
|-------|-------------|
| `Gig` | Freelancer service listings with tiered pricing (JSON) |
| `GigSampleMedia` | Portfolio samples attached to gigs |
| `Job` | Client project postings |
| `Application` | Freelancer applications to jobs |
| `Order` | Accepted engagements with commission tracking |
| `OrderStatusHistory` | Status audit trail |
| `Milestone` | Payment checkpoints within orders |

#### Financial
| Table | Description |
|-------|-------------|
| `Transaction` | All financial movements (escrow, release, refund) |
| `Invoice` | Generated invoices |
| `PlatformFee` | Fee configuration |
| `PlatformRevenue` | Revenue tracking across all streams |
| `PaymentSetting` | User payment preferences |

#### Communication
| Table | Description |
|-------|-------------|
| `Message` | Chat messages with edit/reaction support |
| `MessageAttachment` | File attachments in chat |
| `MessageReaction` | Emoji reactions on messages |
| `Notification` | In-app notifications |

#### Collaboration
| Table | Description |
|-------|-------------|
| `VideoComment` | Timecoded comments with annotation data |
| `ProjectBrief` | Multi-step client brief builder |
| `TeamProposal` | Team collaboration proposals |
| `TeamMember` | Team member assignments |
| `Revision` | Version tracking for deliverables |

#### Creative Tools
| Table | Description |
|-------|-------------|
| `PortfolioVideo` | Freelancer video portfolio items |
| `DemoReel` | Auto-generated portfolio reels |
| `Template` | Marketplace templates for sale |
| `TemplatePurchase` | Template purchase records |
| `TemplateReview` | Template ratings and reviews |
| `RenderJob` | Cloud rendering job queue |
| `SkillTest` | Skill verification tests |
| `SkillTestAttempt` | Test submission records |
| `SkillBadge` | Earned skill verification badges |

#### Engagement & Growth
| Table | Description |
|-------|-------------|
| `Review` | Client ↔ freelancer ratings |
| `CommunityPost` | Community discussion posts |
| `CommunityComment` | Comments on community posts |
| `CommunityLike` | Like interactions |
| `BlogPost` | CMS-managed blog articles |
| `Badge` | Admin-assigned badges |
| `UserBadge` | User ↔ badge junction |
| `AutoBadgeRule` | Behavior-triggered badge rules |
| `Referral` | Referral tracking with tier system |
| `ReferralReward` | Referral reward history |
| `Promotion` | Featured listing promotions |

#### AI & Matching
| Table | Description |
|-------|-------------|
| `MatchRequest` | AI editor matching requests |
| `MatchResult` | Matching algorithm results with scores |

#### Revenue & Subscriptions
| Table | Description |
|-------|-------------|
| `SubscriptionPlan` | Free / Pro / Business plan definitions |
| `UserSubscription` | Active user subscriptions |
| `EnterpriseAccount` | Enterprise company accounts |
| `EnterpriseMember` | Enterprise team members |

#### Other
| Table | Description |
|-------|-------------|
| `Dispute` | Order dispute records |
| `DisputeComment` | Dispute discussion thread |
| `DisputeEvidence` | Evidence attachments |
| `Contact` | Contact form submissions |
| `UserVerification` | Email verification tokens |

### 4.2 Key Relationships

```
User (1) ──── (1) FreelancerProfile
User (1) ──── (*) Gig (via FreelancerProfile)
User (1) ──── (*) Job (as client)
Gig  (1) ──── (*) Order
Job  (1) ──── (*) Application
Order(1) ──── (*) Milestone
Order(1) ──── (*) Message
Order(1) ──── (*) Transaction
Order(1) ──── (*) Revision
Order(1) ──── (*) VideoComment
User (1) ──── (*) UserSubscription
User (1) ──── (1) EnterpriseAccount (as owner)
```

### 4.3 Key Design Decisions

- **Raw PostgreSQL** over ORM: Direct SQL via `pg` driver for maximum performance, explicit query control, and avoiding Prisma's connection pool limitations
- **Decimal money**: All monetary values stored as `INTEGER` (cents) to avoid floating-point rounding
- **Soft deletes**: `deletedAt` column on Gig, Job, Order models
- **JSONB columns**: Gig pricing tiers, message reactions, annotation data
- **Full-text search**: PostgreSQL `tsvector` indexes on gigs, jobs, and freelancer profiles
- **Cursor-based pagination**: Available utilities (used in job and gig listings)

---

## 5. Backend Architecture

### 5.1 Directory Structure

```
vid/src/
├── Controllers/          # 40+ controller files — business logic
│   ├── admin.controller.ts
│   ├── analytics.controller.ts
│   ├── autoBadge.controller.ts
│   ├── blog.controller.ts
│   ├── brief.controller.ts
│   ├── community.controller.ts
│   ├── contact.controller.ts
│   ├── demoReel.controller.ts
│   ├── dispute.controller.ts
│   ├── emailVerification.controller.ts
│   ├── escrow.controller.ts
│   ├── freelancer.controller.ts
│   ├── gig.controller.ts
│   ├── job.controller.ts
│   ├── matching.controller.ts
│   ├── message.controller.ts
│   ├── milestone.controller.ts
│   ├── notification.controller.ts
│   ├── order.controller.ts
│   ├── portfolio.controller.ts
│   ├── profile.controller.ts
│   ├── promotion.controller.ts
│   ├── referral.controller.ts
│   ├── renderFarm.controller.ts
│   ├── revenue.controller.ts
│   ├── review.controller.ts
│   ├── revision.controller.ts
│   ├── search.controller.ts
│   ├── skillTest.controller.ts
│   ├── subCategory.controller.ts
│   ├── teamProposal.controller.ts
│   ├── template.controller.ts
│   ├── transaction.controller.ts
│   ├── user.controller.ts
│   ├── videoReview.controller.ts
│   ├── webhook.controller.ts
│   ├── invoice.controller.ts
│   ├── calendar.controller.ts
│   ├── contract.controller.ts
│   ├── thumbnail.controller.ts
│   └── fileManager.controller.ts
├── Middlewares/          # 10 middleware files
│   ├── auth.middleware.ts        # JWT httpOnly cookie authentication
│   ├── admin.middleware.ts       # Admin role guard
│   ├── error.middleware.ts       # Centralized error handling
│   ├── ownership.middleware.ts   # Resource ownership verification
│   ├── ratelimit.middleware.ts   # Per-route rate limiting
│   ├── upload.middleware.ts      # Multer/S3 file upload
│   ├── validate.middleware.ts    # Joi schema validation
│   ├── protect.middleware.ts     # Route protection
│   ├── restrict.middleware.ts    # Role restriction
│   └── isAuthenticated.ts        # Auth check
├── Routes/               # 39 route files — URL → controller mapping
├── Utils/                # 14 utility modules
│   ├── ApiError.ts              # Custom error class with status codes
│   ├── ApiResponse.ts           # Standardized response wrapper
│   ├── asyncHandler.ts          # Async error boundary
│   ├── dto.ts                   # Data transfer object helpers
│   ├── fileUpload.ts            # S3 upload utilities
│   ├── fullTextSearch.ts        # PostgreSQL FTS helpers
│   ├── logger.ts                # Winston logger configuration
│   ├── pagination.ts            # Cursor-based pagination
│   ├── s3.ts                    # AWS S3 client & presigned URLs
│   ├── tokens.ts                # JWT token generation (access + refresh)
│   └── validateEnv.ts           # Startup environment validation
├── Services/
│   └── authService.ts           # Authentication service
├── types/                # TypeScript type definitions
│   ├── index.ts                 # Core types (ExpressRequest, etc.)
│   └── fastify.d.ts             # Fastify augmentation
├── app.ts                # Fastify app configuration & route registration
├── db.ts                 # PostgreSQL connection pool & transaction helpers
├── index.ts              # Server entry point with graceful shutdown
├── socket.ts             # Socket.IO server with event handlers
└── queues.ts             # Bull queue definitions
```

### 5.2 Controller Pattern

Route handlers are written as **Fastify-compatible functions** (typed with legacy `ExpressRequest`-style request objects for `req.user`, body, etc.) and are exposed to Fastify with **`wrapHandler`**, which adapts the `(req, res, next)`-style flow to Fastify’s `reply` API. In route modules you will see: `fastify.get("...", { preHandler: [...], handler: wrapHandler(controllerFn) })`.

Every controller follows a consistent pattern:

```typescript
import { sql, sqlOne, withTransaction } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

export const createSomething: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as Record<string, unknown>;
    const result = await sqlOne(`INSERT INTO ... RETURNING *`, [params]);
    return res.status(201).json(new ApiResponse(201, result, "Created"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("createSomething: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};
```

### 5.3 Database Access Layer

```typescript
// db.ts provides:
sql(query, params)              // Returns rows array
sqlOne(query, params)           // Returns single row or null
withTransaction(async (client) => { ... })  // Atomic transactions
pool                            // Raw pg Pool access
```

### 5.4 Error Handling

```
Controller throws ApiError(statusCode, message)
  → error.middleware.ts catches
    → Strips internal details in production
    → Returns { success: false, statusCode, message }
    → Logs via Winston (not console)
```

### 5.5 Authentication Flow

```
Login → POST /api/v1/users/signin
  → bcrypt.compare(password, hash)
  → Generate access token (15min) + refresh token (7d)
  → Set httpOnly cookies (access_token, refresh_token)
  → Return user data (no password hash)

Authenticated Request:
  → auth.middleware.ts reads cookie
  → Verify JWT with type === "access"
  → Attach req.user = { id, email, role }
  → Proceed to controller

Token Refresh → POST /api/v1/users/refresh-token
  → Verify refresh token
  → Issue new access + refresh tokens
  → Rotate cookies
```

---

## 6. Frontend Architecture

### 6.1 Directory Structure

```
vid-frontend/src/
├── api/
│   └── axiosInstance.js        # Axios with 401 interceptor
├── app/
│   └── Store.js                # Redux store
├── Components/                 # 54 component folders + 22 top-level .jsx
│   ├── AboutUs/
│   ├── Badges/                 # BadgeAchievements
│   ├── BriefBuilder/           # BriefWizard
│   ├── ChatClientSection/      # Client workspace (chat, timeline, milestones)
│   ├── ChatEditorSection/      # Freelancer chat dashboard
│   ├── ChatPage/               # Chat interface
│   ├── ClientDashboard/        # Client dashboard, shortlist, applicants
│   ├── Community/              # Community dashboard
│   ├── DemoReel/               # ReelBuilder
│   ├── EditorDashboard/        # Freelancer dashboard
│   ├── Enterprise/             # Enterprise account management
│   ├── ExploreEditor/          # Browse freelancers
│   ├── GigSection/             # Gig marketplace & detail pages
│   ├── GigsDashboard/          # Freelancer gig management
│   ├── JobPage/                # Job marketplace
│   ├── Matching/               # AI editor matching
│   ├── Milestones/             # Milestone tracker & setup
│   ├── Notifications/          # Notification center
│   ├── Portfolio/              # Video portfolio showcase
│   ├── Profile/                # User profile & pricing tiers
│   ├── ProjectManagement/      # Project workspace
│   ├── ProjectTimeline/        # Gantt chart timeline
│   ├── Referrals/              # Referral dashboard
│   ├── RenderFarm/             # Cloud rendering dashboard
│   ├── Revenue/                # Admin revenue dashboard
│   ├── RevisionTracker/        # Version comparison tools
│   ├── Settings/               # User settings
│   ├── SkillTests/             # Skill verification hub
│   ├── SubCategories/          # Category picker
│   ├── Subscriptions/          # Pricing page
│   ├── TeamCollaboration/      # Team proposal builder
│   ├── TemplateMarketplace/    # Template marketplace
│   ├── VideoReview/            # Frame-accurate video review
│   └── ...                     # Auth, Landing, Static pages
├── features/
│   └── user/userSlice.js       # Redux auth slice
├── App.jsx                     # Route definitions (80+ routes)
├── main.jsx                    # React entry point
└── index.css                   # Tailwind imports
```

### 6.2 State Management

| Layer | Tool | Use Case |
|-------|------|----------|
| Global Auth | Redux Toolkit | User session, role, login state |
| Server State | TanStack Query | API data fetching & caching |
| Component State | React useState/useReducer | Local UI state |
| Real-time | Socket.IO Client | Chat, notifications, presence, video calls |
| Internationalization | react-i18next | Multi-language UI (EN, ES, FR, HI) |

### 6.3 Routing Strategy

- **Lazy loading**: All route components are `React.lazy()` imports
- **Suspense**: `<PageSuspense>` wrapper with skeleton fallbacks
- **Protected routes**: `<ProtectedRoute>` component checks auth state
- **Page titles**: `<PageTitle>` component uses React Helmet Async
- **Error boundaries**: Global + per-route error boundaries

---

## 7. Real-Time Communication

### 7.1 Socket.IO Architecture

```
Client connects with JWT from cookie/auth
  → Server authenticates via jsonwebtoken
  → User joins personal room: user:{userId}
  → User can join job rooms: job:{jobId}
```

### 7.2 Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `job:room:join` | Client → Server | Join a job chat room |
| `job:room:leave` | Client → Server | Leave a job chat room |
| `message:send` | Client → Server | Send a message |
| `message:edit` | Client → Server | Edit a message |
| `message:delete` | Client → Server | Delete a message |
| `message:reaction:add` | Client → Server | Toggle reaction |
| `user:typing:start` | Client → Server | Typing indicator on |
| `user:typing:stop` | Client → Server | Typing indicator off |
| `message:new` | Server → Room | New message broadcast |
| `message:edited` | Server → Room | Edited message broadcast |
| `message:deleted` | Server → Room | Deleted message broadcast |
| `message:reaction:updated` | Server → Room | Updated reactions |
| `user:typing` | Server → Room | Typing status broadcast |
| `user:online` | Server → All | User came online |
| `user:offline` | Server → All | User went offline |
| `error` | Server → Client | Error notification |

### 7.3 Room Patterns

| Room | Pattern | Purpose |
|------|---------|---------|
| User | `user:{userId}` | Personal notifications |
| Job | `job:{jobId}` | Job chat & collaboration |
| Order | `order:{orderId}` | Order status updates |

---

## 8. Security Architecture

### 8.1 Authentication & Authorization

| Layer | Implementation |
|-------|---------------|
| Password Storage | bcrypt with salt rounds |
| Token Strategy | Short-lived access (15min) + long-lived refresh (7d) |
| Token Storage | httpOnly cookies (not localStorage) |
| Token Type Check | `type: "access"` verified to prevent refresh token as bearer |
| CSRF Protection | Double-submit cookie pattern |
| Role-Based Access | ADMIN, CLIENT, FREELANCER guards |
| Account Lockout | Redis-backed (fails closed if Redis is down) |

### 8.2 Input & Output Security

| Protection | Implementation |
|------------|---------------|
| Input Validation | Joi schemas on all endpoints |
| SQL Injection | Parameterized queries (no string concatenation) |
| XSS Prevention | Helmet CSP headers, sanitized outputs |
| File Upload | Multer with type/size limits → S3 |
| S3 Access | Private ACLs + presigned URLs with ownership check |
| Rate Limiting | Fastify per-route limits, Redis-backed |
| Error Leakage | Sanitized error messages in production |
| Password Policy | Complexity rules enforced |

### 8.3 Infrastructure Security

| Layer | Implementation |
|-------|---------------|
| HTTPS | TLS termination at load balancer |
| CORS | Origin whitelist with credentials |
| Headers | Helmet with comprehensive CSP |
| Logging | Winston (no console.log in production) |
| Environment | Startup validation of all required env vars |

---

## 9. Revenue & Monetization

### 9.1 Revenue Streams (6 Active)

| Stream | Model | Details |
|--------|-------|---------|
| **Service Fee** | Per-transaction | 10-15% from freelancer + 3-5% from client (lower than Fiverr's 20%) |
| **Featured Listings** | Pay-per-day | $5/day to feature a gig or job in search results |
| **Template Marketplace** | Commission | 30% platform commission on template sales |
| **Cloud Rendering** | Usage-based | Pay-per-render pricing based on resolution × priority |
| **Premium Subscriptions** | Monthly/Yearly | Free → Pro ($14.99/mo) → Business ($39.99/mo) |
| **Enterprise Tier** | Custom pricing | Standard ($49.99) → Premium ($99.99) → Scale ($249.99/mo) |

### 9.2 Subscription Tiers

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Portfolio Items | 3 | 25 | Unlimited |
| Active Gigs | 2 | 10 | Unlimited |
| Priority Search | ✗ | ✓ | ✓ |
| Analytics Dashboard | ✗ | ✓ | ✓ |
| Custom Branding | ✗ | ✗ | ✓ |
| Render Credits/mo | 0 | 100 | 500 |
| Template Listings | 0 | 5 | Unlimited |
| Dedicated Support | ✗ | ✗ | ✓ |

### 9.3 Enterprise Plans

| Feature | Standard | Premium | Scale |
|---------|----------|---------|-------|
| Team Seats | 5 | 25 | 100 |
| Bulk Hiring | ✗ | ✓ | ✓ |
| Custom Workflows | ✗ | ✗ | ✓ |
| API Access | ✗ | ✓ | ✓ |
| SSO | ✗ | ✗ | ✓ |
| Monthly Budget | $100 | $500 | $2,000 |

### 9.4 Revenue Tracking

All revenue events are recorded in the `PlatformRevenue` table with type classification, enabling:
- Real-time admin dashboard at `/admin/revenue`
- Revenue by stream breakdown
- Monthly trend analysis
- Active subscription & enterprise account counts

---

## 10. Feature Catalog

### 10.1 Core Marketplace

| Feature | Description | Status |
|---------|-------------|--------|
| **Gig Marketplace** | Browse, search, filter gigs with tiered pricing | ✅ Live |
| **Job Board** | Client-posted projects with applications | ✅ Live |
| **Full-Text Search** | PostgreSQL tsvector search across gigs, jobs, profiles | ✅ Live |
| **Order Management** | End-to-end order lifecycle with status tracking | ✅ Live |
| **Escrow Payments** | Hold → release → refund flow via Stripe | ✅ Live |
| **Reviews & Ratings** | Bidirectional feedback system | ✅ Live |
| **Dispute Resolution** | Structured dispute flow with evidence | ✅ Live |

### 10.2 Video-Specific Tools

| Feature | Description | Status |
|---------|-------------|--------|
| **Video Portfolio Showcase** | Beautiful grid with modal player, featured portfolios | ✅ Live |
| **Frame-Accurate Video Review** | Timecoded comments with drawing annotations | ✅ Live |
| **Revision Tracking** | Side-by-side version comparison with timeline | ✅ Live |
| **Demo Reel Builder** | Auto-generate portfolio reels from existing videos | ✅ Live |
| **Cloud Rendering** | Submit render jobs with resolution/priority pricing | ✅ Live |
| **Automated Portfolio Thumbnails** | Auto-generate thumbnails for portfolio videos | ✅ Live |

### 10.3 Collaboration

| Feature | Description | Status |
|---------|-------------|--------|
| **Real-Time Chat** | Socket.IO messaging with reactions, edits, attachments | ✅ Live |
| **Video Calls (WebRTC)** | Peer-to-peer video calls with screen sharing | ✅ Live |
| **Project Timeline / Gantt** | Visual project tracking with dependencies | ✅ Live |
| **Milestone Payments** | Checkpoint-based payment release | ✅ Live |
| **Client Brief Builder** | Multi-step project brief wizard | ✅ Live |
| **Team Proposals** | Team formation and invitation system | ✅ Live |
| **Project File Management** | Folder-based file organization with versioning | ✅ Live |
| **Contract/NDA Templates** | Pre-built contract templates with digital signing | ✅ Live |
| **Freelancer Availability Calendar** | Weekly schedule with timezone support | ✅ Live |
| **Invoice Generator** | Auto-generated invoices with PDF export | ✅ Live |

### 10.4 AI & Matching

| Feature | Description | Status |
|---------|-------------|--------|
| **AI Editor Matching** | Score-based matching across skills, style, software | ✅ Live |
| **Skills Verification** | Timed tests with auto-grading and badges | ✅ Live |

### 10.5 Marketplace Extensions

| Feature | Description | Status |
|---------|-------------|--------|
| **Template Marketplace** | Buy/sell video templates with reviews | ✅ Live |
| **Sub-Categories** | Granular video editing niches (60+ pre-seeded) | ✅ Live |

### 10.6 Community & Engagement

| Feature | Description | Status |
|---------|-------------|--------|
| **Community Dashboard** | Dynamic posts, comments, likes, stats | ✅ Live |
| **Blog / CMS** | Backend-managed articles with categories | ✅ Live |
| **Badge System** | Behavior-triggered achievement badges | ✅ Live |
| **Referral Program** | Tiered referral system (Bronze → Platinum) | ✅ Live |
| **Notifications** | In-app + real-time notification center | ✅ Live |

### 10.7 Monetization Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Service Fee System** | Automatic commission on every order | ✅ Live |
| **Featured Listings** | Paid promotion with payment flow | ✅ Live |
| **Template Commission** | 30% platform cut on template sales | ✅ Live |
| **Subscription Plans** | Free / Pro / Business tiers | ✅ Live |
| **Enterprise Accounts** | Team seats, bulk hiring, custom workflows | ✅ Live |
| **Revenue Dashboard** | Admin analytics across all revenue streams | ✅ Live |

---

## 11. API Reference

### 11.1 API Endpoints (39 Route Groups)

All endpoints are prefixed with `/api/v1/`.

| Prefix | Controller | Auth | Description |
|--------|-----------|------|-------------|
| `/users` | user | Partial | Registration, login, profile, refresh token |
| `/jobs` | job | Yes | CRUD, search, applications |
| `/profile` | profile | Yes | Freelancer profile management |
| `/gig` | gig | Yes | Gig CRUD, packages, search |
| `/orders` | order | Yes | Order lifecycle, delivery |
| `/transactions` | transaction | Yes | Financial records |
| `/reviews` | review | Yes | Rating & feedback |
| `/messages` | message | Yes | Chat CRUD, reactions |
| `/notifications` | notification | Yes | Notification management |
| `/disputes` | dispute | Yes | Dispute flow |
| `/search` | search | No | Full-text search |
| `/admin` | admin | Admin | Admin operations |
| `/analytics` | analytics | Yes | Dashboard analytics |
| `/referrals` | referral | Yes | Referral codes & rewards |
| `/promotions` | promotion | Yes | Featured listings |
| `/freelancer` | freelancer | Yes | Freelancer-specific endpoints |
| `/portfolio` | portfolio | Yes | Video portfolio CRUD |
| `/contact` | contact | No | Contact form |
| `/timeline` | timeline | Yes | Project timeline items |
| `/applications` | application | Yes | Job applications |
| `/files` | files | Yes | S3 presigned URLs |
| `/webhooks` | webhook | No | Stripe webhooks |
| `/escrow` | escrow | Yes | Escrow operations |
| `/milestones` | milestone | Yes | Milestone management |
| `/video-review` | videoReview | Yes | Timecoded comments |
| `/briefs` | brief | Yes | Client brief builder |
| `/render-farm` | renderFarm | Yes | Render job queue |
| `/skill-tests` | skillTest | Yes | Skill verification |
| `/team-proposals` | teamProposal | Yes | Team collaboration |
| `/matching` | matching | Yes | AI editor matching |
| `/demo-reels` | demoReel | Yes | Demo reel builder |
| `/templates` | template | Yes | Template marketplace |
| `/revisions` | revision | Yes | Revision tracking |
| `/community` | community | Yes | Community posts & comments |
| `/blog` | blog | Partial | Blog articles |
| `/sub-categories` | subCategory | Partial | Category management |
| `/auto-badges` | autoBadge | Yes | Behavior badges |
| `/revenue` | revenue | Yes/Admin | Revenue & subscriptions |
| `/invoices` | invoice | Yes | Invoice generation & PDF |
| `/calendar` | calendar | Yes/Partial | Freelancer availability |
| `/contracts` | contract | Yes | Contract templates & signing |
| `/thumbnails` | thumbnail | Yes/Partial | Portfolio thumbnail generation |
| `/project-files` | fileManager | Yes | Project file management |
| `/email` | emailVerification | No | Email verification |

### 11.2 Standard Response Format

```json
// Success
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "message": "Operation successful"
}

// Error
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed"
}
```

---

## 12. Infrastructure & DevOps

### 12.1 Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `AWS_ACCESS_KEY_ID` | S3 authentication |
| `AWS_SECRET_ACCESS_KEY` | S3 authentication |
| `AWS_S3_BUCKET` | S3 bucket for file storage |
| `AWS_REGION` | S3 region |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `SMTP_HOST/PORT/USER/PASS` | Email sending |
| `SENTRY_DSN` | Error tracking (optional) |
| `VITE_API_URL` | Frontend API base URL |

### 12.2 Containerization

```bash
# Build and start all services
docker compose up --build

# Services: postgres:15, redis:7, api (Node 20), frontend (Nginx)
# Health checks on postgres and redis before api starts
```

### 12.3 CI/CD Pipeline

```
GitHub Actions (.github/workflows/ci.yml)
  ├── lint-and-typecheck (tsc --noEmit)
  ├── build-backend (npm ci, tsc)
  └── build-frontend (npm ci, vite build)
```

### 12.2 Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `tsx watch src/index.ts` | Development server with hot reload |
| `build` | `tsc` | TypeScript compilation |
| `start` | `node dist/index.js` | Production start |
| `typecheck` | `tsc --noEmit` | Type checking only |
| `seed` | `tsx scripts/seed.ts` | Database seeding |
| `seed:admin` | `tsx scripts/seed.ts --admin` | Seed admin user |
| `seed:categories` | `tsx scripts/seed.ts --categories` | Seed categories |
| `seed:badges` | `tsx scripts/seed.ts --badges` | Seed badges |
| `seed:test` | `tsx scripts/seed.ts --test-data` | Seed test data |

### 12.3 Health Check

```
GET /health
→ Checks: Process alive, DB connectivity, Redis connectivity, Bull queue status
→ Returns 200 with component status or 503 if any check fails
```

### 12.4 Graceful Shutdown

```
SIGTERM/SIGINT received
  → Stop accepting new connections
  → Close Bull queues (drain in-flight jobs)
  → Disconnect Redis
  → Close PostgreSQL pool
  → Close Socket.IO connections
  → Exit process
```

---

## 13. Data Flow Diagrams

### 13.1 Order Creation Flow

```
Client places order
  ├── Validate gig exists and is ACTIVE
  ├── Calculate pricing (base + express + fees)
  ├── Calculate commission breakdown:
  │     ├── Platform fee: 12.5% of order total
  │     ├── Client fee: 3.5% of order total
  │     └── Freelancer payout: total - platform fee
  ├── BEGIN TRANSACTION
  │     ├── INSERT Order (with commission columns)
  │     ├── INSERT OrderStatusHistory
  │     ├── INSERT PlatformRevenue (SERVICE_FEE)
  │     ├── UPDATE Gig (orderCount, lastOrderedAt)
  │     ├── UPDATE FreelancerProfile (totalOrders)
  │     └── INSERT Notification
  ├── COMMIT
  └── Return order with fee breakdown
```

### 13.2 Escrow Payment Flow

```
Order accepted
  → Client charged via Stripe
  → Escrow status = HELD
  → Freelancer delivers work
  → Client accepts delivery
    → Escrow status = RELEASED (atomic WHERE status='HELD')
    → Freelancer earnings credited
    → Transaction recorded
  OR Client disputes
    → Dispute created
    → Admin reviews evidence
    → Admin resolves (release to freelancer / refund to client)
```

### 13.3 Template Purchase Flow

```
Buyer clicks purchase
  ├── BEGIN TRANSACTION
  │     ├── Lock template row (FOR UPDATE)
  │     ├── Verify not own template & not already purchased
  │     ├── Calculate: 30% platform commission, 70% seller payout
  │     ├── INSERT TemplatePurchase (with commission breakdown)
  │     ├── UPDATE Template (salesCount + 1)
  │     └── INSERT PlatformRevenue (TEMPLATE_COMMISSION)
  ├── COMMIT
  └── Return download URL
```

---

## 14. Scalability Considerations

### 14.1 Current Optimizations

| Area | Implementation |
|------|---------------|
| Database | Connection pooling (pg Pool), prepared statements |
| Search | PostgreSQL tsvector indexes for O(log n) full-text search |
| Pagination | Cursor-based pagination available (vs offset for scale) |
| Caching | Redis for rate limits, sessions, account lockout |
| Background Jobs | Bull queues for async email/notification processing |
| File Storage | S3 with presigned URLs (CDN-ready) |
| Frontend | React.lazy + code splitting, React.memo on heavy components |

### 14.2 Scaling Path

| Phase | Approach |
|-------|----------|
| **10K users** | Single server + managed PostgreSQL + ElastiCache |
| **100K users** | Horizontal app servers behind ALB, Redis Cluster |
| **1M users** | Read replicas for PostgreSQL, CDN for S3, dedicated search (Elasticsearch) |
| **10M+ users** | Microservice decomposition, event-driven architecture (Kafka), sharded database |

### 14.3 Bottleneck Analysis

| Component | Current Limit | Mitigation |
|-----------|--------------|------------|
| PostgreSQL | ~5K concurrent connections | Connection pooling (PgBouncer) |
| Socket.IO | ~10K concurrent per server | Redis adapter installed (`@socket.io/redis-adapter`) |
| S3 Uploads | ~3,500 PUT/s per prefix | Randomized key prefixes |
| Bull Queues | Single Redis instance | Redis Cluster or separate Redis |

### 14.4 Recommended Future Improvements

1. **CDN Integration** — CloudFront for S3 assets and static frontend
2. **Database Read Replicas** — Separate read/write for analytics queries
3. **Elasticsearch** — Replace PostgreSQL FTS for better ranking and faceting
4. **WebSocket Clustering** — Redis adapter for Socket.IO across instances
5. **Containerization** — Docker + Kubernetes for horizontal scaling
6. **CI/CD Pipeline** — Automated testing, staging environment
7. **Monitoring** — APM (Datadog/New Relic), error tracking (Sentry)
8. **Rate Limiting** — Move from in-memory to shared Redis store (already partially done)

---

## Appendix

### A. Quick Start

```bash
# Backend
cd vid
npm install
cp .env.example .env   # Configure all env vars
npm run dev

# Frontend
cd vid-frontend
npm install
npm run dev

# Database
# Run all migration SQL files in prisma/migrations/ in order
```

### B. Key File Locations

| What | Path |
|------|------|
| Backend entry | `vid/src/index.ts` |
| App config | `vid/src/app.ts` |
| Database | `vid/src/db.ts` |
| Socket.IO | `vid/src/socket.ts` |
| Shared events | `shared/socketEvents.js` |
| Frontend entry | `vid-frontend/src/main.jsx` |
| Router | `vid-frontend/src/App.jsx` |
| API client | `vid-frontend/src/api/axiosInstance.js` |
| Redux store | `vid-frontend/src/app/Store.js` |
| Migrations | `vid/prisma/migrations/` |

### C. Contact

Built with TypeScript, Fastify, React, and PostgreSQL.

---

*Last updated: April 22, 2026*
