-- =============================================
-- FEATURE 1: Community Dashboard (real data)
-- =============================================
CREATE TABLE IF NOT EXISTS "CommunityPost" (
  "id"              SERIAL PRIMARY KEY,
  "authorId"        INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type"            VARCHAR(20) NOT NULL DEFAULT 'DISCUSSION',
  "title"           VARCHAR(300) NOT NULL,
  "content"         TEXT,
  "tags"            TEXT[],
  "mediaUrl"        TEXT,
  "likesCount"      INTEGER DEFAULT 0,
  "commentsCount"   INTEGER DEFAULT 0,
  "viewsCount"      INTEGER DEFAULT 0,
  "isPinned"        BOOLEAN DEFAULT false,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CommunityComment" (
  "id"              SERIAL PRIMARY KEY,
  "postId"          INTEGER NOT NULL REFERENCES "CommunityPost"("id") ON DELETE CASCADE,
  "authorId"        INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "content"         TEXT NOT NULL,
  "parentId"        INTEGER REFERENCES "CommunityComment"("id") ON DELETE CASCADE,
  "likesCount"      INTEGER DEFAULT 0,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "CommunityLike" (
  "id"              SERIAL PRIMARY KEY,
  "userId"          INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "postId"          INTEGER REFERENCES "CommunityPost"("id") ON DELETE CASCADE,
  "commentId"       INTEGER REFERENCES "CommunityComment"("id") ON DELETE CASCADE,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("userId", "postId"),
  UNIQUE("userId", "commentId")
);

CREATE INDEX IF NOT EXISTS "idx_community_post_type" ON "CommunityPost" ("type");
CREATE INDEX IF NOT EXISTS "idx_community_post_author" ON "CommunityPost" ("authorId");
CREATE INDEX IF NOT EXISTS "idx_community_comment_post" ON "CommunityComment" ("postId");

-- =============================================
-- FEATURE 2: Blog System (real CMS)
-- =============================================
CREATE TABLE IF NOT EXISTS "BlogPost" (
  "id"              SERIAL PRIMARY KEY,
  "authorId"        INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title"           VARCHAR(300) NOT NULL,
  "slug"            VARCHAR(300) NOT NULL UNIQUE,
  "excerpt"         TEXT,
  "content"         TEXT NOT NULL,
  "coverImageUrl"   TEXT,
  "category"        VARCHAR(50) NOT NULL,
  "tags"            TEXT[],
  "status"          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "readTimeMinutes" INTEGER DEFAULT 5,
  "viewCount"       INTEGER DEFAULT 0,
  "likeCount"       INTEGER DEFAULT 0,
  "isFeatured"      BOOLEAN DEFAULT false,
  "publishedAt"     TIMESTAMP,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_blog_slug" ON "BlogPost" ("slug");
CREATE INDEX IF NOT EXISTS "idx_blog_status" ON "BlogPost" ("status");
CREATE INDEX IF NOT EXISTS "idx_blog_category" ON "BlogPost" ("category");
CREATE INDEX IF NOT EXISTS "idx_blog_featured" ON "BlogPost" ("isFeatured") WHERE "isFeatured" = true;

-- =============================================
-- FEATURE 3: Sub-Categories
-- =============================================
CREATE TABLE IF NOT EXISTS "SubCategory" (
  "id"              SERIAL PRIMARY KEY,
  "parentCategory"  VARCHAR(50) NOT NULL,
  "name"            VARCHAR(100) NOT NULL,
  "slug"            VARCHAR(100) NOT NULL UNIQUE,
  "description"     TEXT,
  "iconName"        VARCHAR(50),
  "sortOrder"       INTEGER DEFAULT 0,
  "isActive"        BOOLEAN DEFAULT true,
  "gigCount"        INTEGER DEFAULT 0,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_subcat_parent" ON "SubCategory" ("parentCategory");

INSERT INTO "SubCategory" ("parentCategory", "name", "slug", "sortOrder") VALUES
  ('Video Editing', 'YouTube Shorts Editing', 'youtube-shorts-editing', 1),
  ('Video Editing', 'YouTube Long-Form Editing', 'youtube-longform-editing', 2),
  ('Video Editing', 'Wedding Highlight Reel', 'wedding-highlight-reel', 3),
  ('Video Editing', 'Documentary Editing', 'documentary-editing', 4),
  ('Video Editing', 'Podcast Video Editing', 'podcast-video-editing', 5),
  ('Video Editing', 'Corporate Training Video', 'corporate-training-video', 6),
  ('Video Editing', 'Real Estate Walkthrough', 'real-estate-walkthrough', 7),
  ('Color Grading', 'Music Video Color Grade', 'music-video-color-grade', 1),
  ('Color Grading', 'Film Color Grade', 'film-color-grade', 2),
  ('Color Grading', 'Commercial Color Grade', 'commercial-color-grade', 3),
  ('Color Grading', 'LUT Creation', 'lut-creation', 4),
  ('Motion Graphics', 'Logo Animation', 'logo-animation', 1),
  ('Motion Graphics', 'Social Media Animations', 'social-media-animations', 2),
  ('Motion Graphics', 'Explainer Video Animation', 'explainer-video-animation', 3),
  ('Motion Graphics', 'Lower Thirds & Titles', 'lower-thirds-titles', 4),
  ('Motion Graphics', 'Kinetic Typography', 'kinetic-typography', 5),
  ('VFX', 'Green Screen Compositing', 'green-screen-compositing', 1),
  ('VFX', 'Particle Effects', 'particle-effects', 2),
  ('VFX', 'Sky Replacement', 'sky-replacement', 3),
  ('VFX', 'Object Removal / Cleanup', 'object-removal-cleanup', 4),
  ('Sound Design', 'Foley & Sound Effects', 'foley-sound-effects', 1),
  ('Sound Design', 'Dialogue Editing & ADR', 'dialogue-editing-adr', 2),
  ('Sound Design', 'Music Mixing & Mastering', 'music-mixing-mastering', 3),
  ('Sound Design', 'Podcast Audio Editing', 'podcast-audio-editing', 4),
  ('3D Animation', 'Product Visualization', 'product-visualization', 1),
  ('3D Animation', 'Character Animation', 'character-animation', 2),
  ('3D Animation', 'Architectural Visualization', 'architectural-visualization', 3)
ON CONFLICT ("slug") DO NOTHING;

-- =============================================
-- FEATURE 4: Behavior-Earned Badges
-- =============================================
CREATE TABLE IF NOT EXISTS "AutoBadgeRule" (
  "id"              SERIAL PRIMARY KEY,
  "badgeName"       VARCHAR(100) NOT NULL,
  "description"     TEXT,
  "icon"            VARCHAR(50) DEFAULT 'award',
  "color"           VARCHAR(20) DEFAULT 'indigo',
  "triggerType"     VARCHAR(50) NOT NULL,
  "triggerValue"    INTEGER NOT NULL DEFAULT 1,
  "isActive"        BOOLEAN DEFAULT true,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO "AutoBadgeRule" ("badgeName", "description", "icon", "color", "triggerType", "triggerValue") VALUES
  ('First Order', 'Completed your first order', 'zap', 'emerald', 'ORDERS_COMPLETED', 1),
  ('Rising Star', 'Completed 5 orders', 'star', 'amber', 'ORDERS_COMPLETED', 5),
  ('Power Editor', 'Completed 25 orders', 'rocket', 'indigo', 'ORDERS_COMPLETED', 25),
  ('Elite Editor', 'Completed 100 orders', 'crown', 'purple', 'ORDERS_COMPLETED', 100),
  ('5-Star Streak', 'Received 10 five-star reviews', 'sparkles', 'amber', 'FIVE_STAR_REVIEWS', 10),
  ('Top Rated', 'Maintained 4.8+ rating over 20 reviews', 'trophy', 'amber', 'HIGH_RATING', 20),
  ('Quick Responder', 'Average response time under 1 hour', 'clock', 'blue', 'FAST_RESPONSE', 1),
  ('Community Hero', 'Created 10 community posts', 'heart', 'pink', 'COMMUNITY_POSTS', 10),
  ('Skill Master', 'Passed 3 skill verification tests', 'shield', 'emerald', 'SKILL_TESTS_PASSED', 3),
  ('Referral Champion', 'Successfully referred 5 users', 'users', 'indigo', 'REFERRALS_REDEEMED', 5),
  ('Portfolio Pro', 'Uploaded 5+ portfolio videos', 'film', 'purple', 'PORTFOLIO_VIDEOS', 5),
  ('Early Adopter', 'Among the first 100 platform users', 'flag', 'orange', 'EARLY_ADOPTER', 100)
ON CONFLICT DO NOTHING;

-- =============================================
-- FEATURE 5: Referral Viral Loop Enhancements
-- =============================================
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "tier" VARCHAR(20) DEFAULT 'BRONZE';
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "bonusMultiplier" DOUBLE PRECISION DEFAULT 1.0;

CREATE TABLE IF NOT EXISTS "ReferralReward" (
  "id"              SERIAL PRIMARY KEY,
  "userId"          INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type"            VARCHAR(30) NOT NULL,
  "amount"          INTEGER NOT NULL DEFAULT 0,
  "description"     TEXT,
  "referralId"      INTEGER REFERENCES "Referral"("id") ON DELETE SET NULL,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ref_reward_user" ON "ReferralReward" ("userId");
