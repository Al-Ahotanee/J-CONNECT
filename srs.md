# Software Requirements Specification (SRS)

## J-Connect — Human Capital Development Platform

**Version:** 2.0  
**Date:** April 2026  
**Classification:** Enterprise Government Platform  
**Target:** Jigawa State, Nigeria (extendable to any state/organization via dynamic branding)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Technology Stack](#3-technology-stack)
4. [Design System](#4-design-system)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [Database Schema](#7-database-schema)
8. [Module 1: Landing Page & Public Interface](#8-module-1-landing-page--public-interface)
9. [Module 2: Citizen Registration & Profiles](#9-module-2-citizen-registration--profiles)
10. [Module 3: Dashboard System](#10-module-3-dashboard-system)
11. [Module 4: Recruitment & ATS](#11-module-4-recruitment--ats)
12. [Module 5: E-Learning & CBT](#12-module-5-e-learning--cbt)
13. [Module 6: Mentorship (Trailblazer)](#13-module-6-mentorship-trailblazer)
14. [Module 7: Community Hub](#14-module-7-community-hub)
15. [Module 8: Messaging & Communication](#15-module-8-messaging--communication)
16. [Module 9: Video Meetings](#16-module-9-video-meetings)
17. [Module 10: Administration](#17-module-10-administration)
18. [Module 11: Analytics & Reporting](#18-module-11-analytics--reporting)
19. [Module 12: Branding & White-Label](#19-module-12-branding--white-label)
20. [Module 13: Notifications](#20-module-13-notifications)
21. [Module 14: AI-Powered Features](#21-module-14-ai-powered-features)
22. [Edge Functions (Serverless Backend)](#22-edge-functions-serverless-backend)
23. [File Storage](#23-file-storage)
24. [Routing & Navigation](#24-routing--navigation)
25. [UI Component Library](#25-ui-component-library)
26. [Security Requirements](#26-security-requirements)
27. [Non-Functional Requirements](#27-non-functional-requirements)

---

## 1. Introduction

### 1.1 Purpose

J-Connect is a unified government platform for human capital development, serving as a citizen registry, job marketplace, e-learning hub, mentorship network, and professional community for Jigawa State, Nigeria. It consolidates all citizen data, career services, and professional development tools into a single enterprise-grade web application.

### 1.2 Scope

The platform serves **all 27 Local Government Areas (LGAs)** across **3 Senatorial Zones** of Jigawa State. It targets:

- Citizens (job seekers, students, professionals, entrepreneurs, artisans, farmers, civil servants, retirees)
- Government administrators (super admins, module admins, LGA/ward officers)
- Employers and recruiters
- Mentors (Trailblazers)
- Instructors and course creators

### 1.3 Key Capabilities

| Capability | Description |
|---|---|
| Citizen Database | Centralized registry of all citizens with demographics, education, employment data |
| Recruitment (ATS) | Full applicant tracking from job posting to offer acceptance |
| E-Learning | Course management, video lessons, quizzes, certificates with QR verification |
| CBT Examinations | Computer-based testing with timed exams, auto-grading, question banks |
| Mentorship | AI-powered mentor-mentee matching, marketplace, session tracking |
| Community | Social networking with posts, groups, reactions, follows |
| Video Meetings | In-app video conferencing for interviews, mentorship sessions |
| Analytics & BI | Multi-dimensional reporting with chart visualizations and data export |
| White-Label Branding | Dynamic system name, logo, colors, and SEO metadata configurable by admin |

---

## 2. System Overview

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                      │
│  React 18 · TypeScript 5 · Vite 5 · Tailwind CSS v3        │
│  shadcn/ui · Recharts · Framer Motion · React Router v6     │
├─────────────────────────────────────────────────────────────┤
│                    BACKEND (Supabase)                        │
│  PostgreSQL Database · Row-Level Security (RLS)             │
│  Auth (email/password) · Realtime Subscriptions             │
│  Edge Functions (Deno) · File Storage                       │
├─────────────────────────────────────────────────────────────┤
│                    AI SERVICES                               │
│  Lovable AI Gateway (Google Gemini, OpenAI GPT models)      │
│  Smart Job Matching · Interview Coaching · CV Generation    │
│  Course Recommendations · Auto Mentor Matching              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Application Structure

```
src/
├── App.tsx                          # Root component with routing
├── main.tsx                         # Entry point
├── index.css                        # Design tokens & global styles
├── components/
│   ├── Navbar.tsx                   # Public navigation bar
│   ├── Footer.tsx                   # Public footer
│   ├── NavLink.tsx                  # Navigation link component
│   ├── NotificationCenter.tsx       # Bell icon notification dropdown
│   ├── VideoMeeting.tsx             # Video meeting UI component
│   ├── admin/
│   │   └── AdvancedReporting.tsx    # Multi-filter reporting engine
│   ├── dashboard/
│   │   ├── DashboardLayout.tsx      # Sidebar + header + footer layout
│   │   ├── DashboardSidebar.tsx     # Role-based sidebar navigation
│   │   └── DashboardHeader.tsx      # Dashboard top bar with user info
│   ├── landing/
│   │   └── LandingPage.tsx          # Public landing page sections
│   └── ui/                          # 50+ shadcn/ui components
├── pages/                           # 47 page components (see Section 24)
├── hooks/
│   ├── useAuth.tsx                  # Authentication context & provider
│   ├── useBranding.tsx              # Dynamic branding context
│   ├── useVideoMeeting.ts           # Video meeting state management
│   ├── use-mobile.tsx               # Mobile detection hook
│   └── use-toast.ts                 # Toast notification hook
├── lib/
│   ├── api.ts                       # Core API functions (profiles, jobs, etc.)
│   ├── recruitment-api.ts           # Recruitment-specific API functions
│   ├── mentorship-api.ts            # Mentorship-specific API functions
│   ├── learning-api.ts              # E-learning API functions
│   ├── roles.ts                     # Role definitions, hierarchy, permissions
│   ├── constants.ts                 # LGAs, qualifications, sectors, etc.
│   └── utils.ts                     # Utility functions (cn, etc.)
├── integrations/supabase/
│   ├── client.ts                    # Supabase client (auto-generated)
│   └── types.ts                     # Database types (auto-generated)
└── assets/                          # Static images and logos
```

---

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 5.4 | Build tool & dev server |
| Tailwind CSS | 3.4 | Utility-first CSS |
| shadcn/ui | Latest | Component library (50+ components) |
| React Router | 6.30 | Client-side routing |
| TanStack React Query | 5.83 | Server state management |
| Recharts | 2.15 | Chart visualizations |
| Framer Motion | 12.35 | Animations |
| Zustand | 5.0 | Client state management |
| Zod | 3.25 | Schema validation |
| React Hook Form | 7.61 | Form management |
| Sonner | 1.7 | Toast notifications |
| Lucide React | 0.462 | Icon library |
| date-fns | 3.6 | Date utilities |

### 3.2 Backend (Supabase)

| Service | Purpose |
|---|---|
| PostgreSQL | Relational database with RLS |
| Auth | Email/password authentication with email verification |
| Edge Functions | Serverless Deno functions for admin ops & AI |
| Storage | File storage for avatars, CVs, course materials |
| Realtime | WebSocket subscriptions for live messaging |

### 3.3 AI Services

| Model | Use Case |
|---|---|
| google/gemini-2.5-flash | Smart job matching, interview coaching |
| openai/gpt-5-mini | CV generation, course recommendations |

---

## 4. Design System

### 4.1 Color Palette (HSL)

```css
/* Light Mode */
--background: 0 0% 99%;                /* Near white */
--foreground: 150 25% 12%;             /* Deep green-black */
--primary: 145 63% 22%;                /* Government green */
--primary-foreground: 0 0% 100%;       /* White */
--secondary: 43 76% 50%;               /* Official gold */
--secondary-foreground: 0 0% 100%;     /* White */
--muted: 140 15% 95%;                  /* Light green-gray */
--muted-foreground: 150 10% 45%;       /* Medium gray */
--accent: 145 20% 92%;                 /* Subtle green */
--destructive: 0 72% 51%;              /* Red for errors */
--border: 140 15% 89%;                 /* Light border */

/* Sidebar (Dark) */
--sidebar-background: 150 25% 12%;     /* Deep green */
--sidebar-foreground: 0 0% 95%;        /* Near white */
--sidebar-primary: 43 76% 50%;         /* Gold accent */
--sidebar-accent: 150 20% 18%;         /* Slightly lighter green */

/* Custom Tokens */
--gold: 43 76% 50%;
--emerald: 145 63% 22%;
--emerald-dark: 150 60% 14%;
--navy: 210 40% 15%;
```

### 4.2 Typography

| Role | Font | Usage |
|---|---|---|
| Display/Headings | Playfair Display | Page titles, hero sections, card headers |
| Body Text | Source Sans 3 | Paragraphs, labels, form text, navigation |

### 4.3 Shadows

```css
--shadow-soft: 0 2px 15px -3px hsl(150 25% 12% / 0.08);
--shadow-elevated: 0 10px 40px -10px hsl(150 25% 12% / 0.15);
--shadow-gold: 0 4px 20px -4px hsl(43 76% 50% / 0.3);
```

### 4.4 Gradients

```css
--gradient-hero: linear-gradient(135deg, hsl(150,25%,12%) 0%, hsl(145,63%,22%) 50%, hsl(150,60%,14%) 100%);
--gradient-gold: linear-gradient(135deg, hsl(43,76%,50%) 0%, hsl(38,80%,55%) 100%);
--gradient-card: linear-gradient(180deg, hsl(0,0%,100%) 0%, hsl(140,15%,97%) 100%);
```

### 4.5 Border Radius

```css
--radius: 0.625rem;  /* 10px base radius */
```

### 4.6 Button Variants

The Button component extends shadcn/ui with custom variants:

| Variant | Style | Usage |
|---|---|---|
| `default` | Primary green background | Primary actions |
| `destructive` | Red background | Delete, remove actions |
| `outline` | Bordered, transparent | Secondary actions |
| `secondary` | Muted background | Tertiary actions |
| `ghost` | No background | Inline actions |
| `link` | Text only, underlined | Navigation links |
| `gold` | Gold gradient background | Premium/export actions |
| `emerald` | Emerald gradient background | CTA buttons |

---

## 5. Authentication & Authorization

### 5.1 Authentication Flow

```
Registration (4-step wizard):
  Step 1: Account → email, password, confirm password (Zod validated)
  Step 2: Personal → full name, gender, DOB, LGA, phone, ward, village, NIN
  Step 3: Education → qualification type, institution, field of study, year, grade
  Step 4: Employment → status, employer, job title, sector, skills, user type

Post-Registration:
  → User receives email verification link
  → Registration data persisted in localStorage during verification gap
  → On first login, localStorage data synced to database profile
  → Redirect to /dashboard
```

### 5.2 Auth Context (`useAuth`)

```typescript
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

### 5.3 Auth Features

- Email/password sign-up with email verification (NOT auto-confirmed)
- Password reset via email link → `/reset-password` page
- Session persistence via Supabase auth tokens
- Auth state listener with `onAuthStateChange`
- Protected routes redirect to `/login` when unauthenticated

### 5.4 Auth Pages

| Route | Component | Description |
|---|---|---|
| `/login` | LoginPage | Email/password login with "Forgot password" link |
| `/register` | RegisterPage | 4-step wizard with progress stepper |
| `/reset-password` | ResetPasswordPage | New password entry after email link |

---

## 6. Role-Based Access Control (RBAC)

### 6.1 Role Hierarchy

```
super_admin (Highest)
  └── admin
        ├── citizen_db_admin
        ├── mentorship_admin
        ├── recruitment_admin
        ├── cbt_admin
        └── learning_admin
              ├── lga_officer
              ├── ward_officer
              ├── recruiter
              ├── mentor
              └── instructor
                    └── user (Citizen — default, lowest)
```

### 6.2 Role Definitions

| Role | Label | Description | Can Create Roles |
|---|---|---|---|
| `super_admin` | Super Administrator | Full platform control | admin, all module admins, all officers, all stakeholders |
| `admin` | System Admin | System-wide administration | All module admins, officers, stakeholders |
| `citizen_db_admin` | Citizen Database Admin | Manage citizen profiles & registrations | lga_officer, ward_officer |
| `mentorship_admin` | Mentorship Admin | Manage mentorship program | mentor |
| `recruitment_admin` | Recruitment Admin | Manage recruitment system | recruiter |
| `cbt_admin` | CBT Exam Admin | Manage CBT examinations | — |
| `learning_admin` | E-Learning Admin | Manage e-learning platform | instructor |
| `lga_officer` | LGA Officer | Register/manage citizens in assigned LGA | — |
| `ward_officer` | Ward Data Officer | Register citizens at ward level | — |
| `recruiter` | Recruiter / Employer | Post jobs, manage applications, conduct hiring | — |
| `mentor` | Mentor (Trailblazer) | Conduct mentoring sessions, track mentee progress | — |
| `instructor` | Instructor / Trainer | Upload courses, manage lessons, issue certifications | — |
| `user` | Citizen | General platform citizen (default) | — |

### 6.3 Role Storage

Roles are stored in a **separate `user_roles` table** (NOT on the profiles table) to prevent privilege escalation:

```sql
CREATE TYPE public.app_role AS ENUM (
  'super_admin', 'admin', 'citizen_db_admin', 'mentorship_admin',
  'recruitment_admin', 'cbt_admin', 'learning_admin', 'lga_officer',
  'ward_officer', 'recruiter', 'mentor', 'instructor', 'user'
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
```

### 6.4 Security Definer Function

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 6.5 Permission Helper Functions (Frontend)

```typescript
// src/lib/roles.ts
hasAnyRole(userRoles, checkRoles)      // Check if user has any of specified roles
canAccessAdmin(roles)                   // Can access admin panel
canManageCitizens(roles)               // Can manage citizen profiles
canManageJobs(roles)                   // Can manage job postings
canManageCourses(roles)                // Can manage courses
canManageMentors(roles)                // Can manage mentorship
canManageCBT(roles)                    // Can manage CBT exams
canAssignRoles(roles)                  // Can assign roles to users
getAssignableRoles(roles)             // Get list of roles this user can assign
getHighestRole(roles)                  // Get the user's highest-priority role
```

### 6.6 Role Badge Colors

Each role has a distinct badge color using semantic tokens:

```typescript
super_admin:       "bg-destructive/10 text-destructive border-destructive/20"
admin:             "bg-accent/50 text-accent-foreground border-accent"
citizen_db_admin:  "bg-primary/10 text-primary border-primary/20"
mentorship_admin:  "bg-secondary/50 text-secondary-foreground border-secondary"
recruitment_admin: "bg-primary/10 text-primary border-primary/20"
recruiter:         "bg-primary/10 text-primary border-primary/20"
mentor:            "bg-secondary/50 text-secondary-foreground border-secondary"
instructor:        "bg-accent/50 text-accent-foreground border-accent"
user:              "bg-muted text-muted-foreground border-border"
```

---

## 7. Database Schema

### 7.1 Tables Overview (35 tables)

| Table | Purpose | RLS |
|---|---|---|
| `profiles` | Citizen personal/employment data (mirrors auth.users) | Yes |
| `education` | Education records per citizen | Yes |
| `user_roles` | Role assignments (separate from profiles) | Yes |
| `jobs` | Job postings (internal & external) | Yes |
| `job_applications` | Applications to jobs | Yes |
| `job_offers` | Offer letters issued to candidates | Yes |
| `interview_invitations` | Interview scheduling | Yes |
| `candidate_scores` | Scoring rubric for applicants | Yes |
| `pipeline_history` | Application stage change log | Yes |
| `saved_candidates` | Recruiter's saved candidate pool | Yes |
| `company_profiles` | Employer branding profiles | Yes |
| `company_reviews` | Employee reviews of companies | Yes |
| `courses` | E-learning courses | Yes |
| `lessons` | Course lessons with content/video | Yes |
| `enrollments` | Student enrollments with progress | Yes |
| `lesson_completions` | Per-lesson completion tracking | Yes |
| `course_materials` | Downloadable course files | Yes |
| `certificates` | Issued certificates with QR verification | Yes |
| `quizzes` | Quiz/exam definitions | Yes |
| `quiz_questions` | Multiple-choice questions | Yes |
| `quiz_attempts` | Student quiz attempts and scores | Yes |
| `discussion_posts` | Course discussion forums | Yes |
| `mentors` | Mentor profiles with specialization | Yes |
| `mentorship_mappings` | Mentor-mentee pairings | Yes |
| `mentorship_sessions` | Scheduled mentoring sessions | Yes |
| `mentorship_goals` | Milestone tracking per mapping | Yes |
| `mentorship_listings` | Marketplace listings (seeking mentor/mentee) | Yes |
| `mentorship_requests` | Connection requests between users | Yes |
| `mentor_ratings` | Mentee feedback on mentors | Yes |
| `group_chatrooms` | Topic-based group chat rooms | Yes |
| `chatroom_members` | Chatroom membership | Yes |
| `chatroom_messages` | Messages within chatrooms | Yes |
| `messages` | Direct 1:1 messages | Yes |
| `notifications` | User notification inbox | Yes |
| `announcements` | System-wide announcements | Yes |
| `activity_feed` | User activity log | Yes |
| `social_posts` | Community feed posts | Yes |
| `social_comments` | Post comments (threaded) | Yes |
| `social_follows` | User follow relationships | Yes |
| `social_groups` | Community groups/pages | Yes |
| `social_group_members` | Group membership | Yes |
| `portfolio_items` | Career portfolio pieces | Yes |
| `skill_endorsements` | Peer skill endorsements | Yes |
| `approval_workflows` | Multi-entity approval pipeline | Yes |
| `audit_logs` | System-wide audit trail | Yes |
| `branding_settings` | Dynamic platform branding config | Yes |

### 7.2 Key Table: `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,               -- References auth.users(id)
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,                          -- 'Male' | 'Female'
  date_of_birth TEXT,
  marital_status TEXT,
  lga TEXT,                             -- One of 27 Jigawa LGAs
  ward TEXT,
  village TEXT,
  residential_address TEXT,
  nin TEXT,                             -- National Identification Number
  nationality TEXT,
  state_of_origin TEXT,
  employment_status TEXT,               -- 'Employed' | 'Unemployed' | 'Self-employed' | 'Retired'
  current_employer TEXT,
  job_title TEXT,
  sector TEXT,                          -- 'Public' | 'Private' | 'NGO' | etc.
  work_experience TEXT,
  skills TEXT[],                        -- Array of skill strings
  certifications TEXT[],                -- Array of certification strings
  user_type TEXT,                       -- 'job_seeker' | 'student' | 'professional' | etc.
  passport_photo_url TEXT,
  cv_file_url TEXT,
  profile_completion INTEGER DEFAULT 0, -- 0-100 auto-calculated
  approval_status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.3 Key Table: `jobs`

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  lga TEXT,
  sector TEXT,
  employment_type TEXT DEFAULT 'Full-time',  -- 'Full-time' | 'Part-time' | 'Contract' | 'Internship'
  qualification_required TEXT,
  experience_level TEXT,
  salary_range TEXT,
  skills_required TEXT[],
  deadline DATE,
  posted_by UUID,                            -- User who posted
  is_active BOOLEAN DEFAULT true,
  is_internal BOOLEAN DEFAULT false,         -- Internal vs external posting
  external_url TEXT,                         -- Link for external jobs
  custom_questions JSONB DEFAULT '[]',       -- Custom application questions
  location_scope TEXT DEFAULT 'LGA',
  applicants_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.4 Key Table: `courses`

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  level TEXT DEFAULT 'Beginner',            -- 'Beginner' | 'Intermediate' | 'Advanced'
  is_free BOOLEAN DEFAULT true,
  price NUMERIC DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  enrolled_count INTEGER DEFAULT 0,
  instructor_id UUID,
  instructor_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.5 Key Table: `mentors`

```sql
CREATE TABLE mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,                    -- From MENTOR_CATEGORIES constant
  specialization TEXT,
  bio TEXT,
  years_of_experience INTEGER,
  is_active BOOLEAN DEFAULT true,
  max_mentees INTEGER DEFAULT 5,
  current_mentees INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.6 Realtime-Enabled Tables

The following tables have realtime enabled via `supabase_realtime` publication:

- `messages` (direct messaging)
- `chatroom_messages` (group chat)
- `notifications`

---

## 8. Module 1: Landing Page & Public Interface

### 8.1 Landing Page (`/`)

**Component:** `src/pages/Index.tsx` → renders `LandingPage.tsx`

**Sections:**
1. **Hero Section** — Full-width gradient banner with system name, tagline, CTA buttons ("Get Started", "View Jobs")
2. **Statistics Bar** — Animated counters showing total citizens, jobs, courses, mentors
3. **Features Grid** — 6-card grid highlighting: Citizen Registry, Job Marketplace, E-Learning, Mentorship, Community, Analytics
4. **How It Works** — 3-step visual: Register → Build Profile → Access Opportunities
5. **Testimonials** — User success stories carousel
6. **CTA Section** — Final call-to-action with registration button
7. **Footer** — Dynamic branding, contact info, quick links, social media

### 8.2 Public Job Board (`/jobs-board`)

**Component:** `src/pages/PublicJobsPage.tsx`

**UI Pattern:** Microsoft Careers-inspired split-view layout

**Left Panel:**
- Search input (keyword)
- Filter dropdowns: LGA, Sector, Employment Type, Experience Level
- Job listing cards showing: title, company, location, salary range, posted date
- Pagination controls

**Right Panel:**
- Selected job full detail view
- Job description, requirements, qualifications
- "Apply Now" button (requires login)
- Company info link

### 8.3 Certificate Verification (`/verify-certificate` and `/verify-certificate/:certNumber`)

**Component:** `src/pages/VerifyCertificatePage.tsx`

- Input field for certificate number
- OR scan QR code to auto-populate
- Displays: holder name, course title, issue date, certificate ID
- Verification status badge (Valid/Invalid)

---

## 9. Module 2: Citizen Registration & Profiles

### 9.1 Registration Wizard (`/register`)

**Component:** `src/pages/RegisterPage.tsx`

**4-Step Wizard with Progress Stepper:**

**Step 1 — Account Creation:**
- Email address (validated, unique)
- Password (min 6 chars)
- Confirm password
- Zod schema: `accountSchema`

**Step 2 — Personal Information:**
- Full name (required, 2-100 chars)
- Gender (Male/Female, required)
- Date of birth (required)
- LGA (dropdown of 27 LGAs, required)
- Phone number (required, 7-20 chars)
- Marital status (optional)
- Ward (optional, text)
- Village (optional, text)
- Residential address (optional)
- NIN (optional, max 20 chars)
- Zod schema: `personalSchema`

**Step 3 — Education:**
- Qualification type (required, from QUALIFICATION_TYPES constant)
- Institution name (optional)
- Field of study (optional)
- Year of graduation (optional)
- Grade (optional)
- Zod schema: `educationSchema`

**Step 4 — Employment & Skills:**
- Employment status (required, from EMPLOYMENT_STATUSES)
- Current employer (optional)
- Job title (optional)
- Sector (optional, from SECTORS)
- Work experience (optional, textarea)
- Skills (optional, comma-separated)
- Certifications (optional, comma-separated)
- User type (required, from USER_TYPES)
- Zod schema: `employmentSchema`

**Post-Registration:**
- Data saved to localStorage
- Supabase `signUp()` called with email + password
- User redirected to login page
- On first login: localStorage data synced to `profiles` and `education` tables

### 9.2 User Types

```typescript
const USER_TYPES = [
  { value: "job_seeker", label: "Job Seeker" },
  { value: "student", label: "Student" },
  { value: "professional", label: "Professional" },
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "civil_servant", label: "Civil Servant" },
  { value: "artisan", label: "Artisan / Tradesperson" },
  { value: "farmer", label: "Farmer" },
  { value: "retiree", label: "Retiree" },
];
```

### 9.3 Profile Page (`/profile`)

**Component:** `src/pages/ProfilePage.tsx`

**Features:**
- Passport photo upload (to Supabase Storage)
- Editable personal info, education, employment fields
- Add/remove education records
- Skills as comma-separated → stored as TEXT[]
- Profile completion percentage auto-calculated across 12 dimensions
- CV file upload

### 9.4 Profile Completion Calculation

Tracked across these fields (each contributing ~8.3%):
`full_name, gender, date_of_birth, lga, phone, employment_status, user_type, skills, education, passport_photo_url, residential_address, sector`

### 9.5 Constants

```typescript
const JIGAWA_LGAS = [
  "Auyo", "Babura", "Biriniwa", "Birnin Kudu", "Buji", "Dutse",
  "Gagarawa", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa",
  "Hadejia", "Jahun", "Kafin Hausa", "Kaugama", "Kazaure",
  "Kiri Kasama", "Kiyawa", "Maigatari", "Malam Madori",
  "Miga", "Ringim", "Roni", "Sule Tankarkar", "Taura", "Yankwashi"
];

const SENATORIAL_ZONES = {
  "Jigawa North-West": ["Babura", "Garki", "Gumel", ...],
  "Jigawa North-East": ["Hadejia", "Kafin Hausa", ...],
  "Jigawa South": ["Dutse", "Birnin Kudu", ...],
};

const QUALIFICATION_TYPES = [
  "SSCE/WAEC", "NCE", "ND/OND", "HND", "B.Sc/B.A/B.Ed/B.Tech",
  "PGD", "M.Sc/M.A/M.Ed", "PhD", "Professor", "Other"
];

const EMPLOYMENT_STATUSES = ["Unemployed", "Self-employed", "Employed", "Retired"];

const SECTORS = ["Public", "Private", "NGO", "International Organization", "Self-employed"];

const SKILL_CATEGORIES = [
  "ICT & Technology", "Engineering", "Health & Medical", "Education & Teaching",
  "Agriculture", "Business & Finance", "Legal", "Media & Communications",
  "Arts & Creative", "Trades & Artisan", "Science & Research", "Security & Law Enforcement",
  "Administration", "Transport & Logistics", "Other"
];
```

---

## 10. Module 3: Dashboard System

### 10.1 Layout Architecture

**Component:** `src/components/dashboard/DashboardLayout.tsx`

```
┌──────────────────────────────────────────────────┐
│ DashboardLayout                                   │
│ ┌──────────┬─────────────────────────────────┐   │
│ │ Sidebar  │  Header (DashboardHeader)       │   │
│ │          ├─────────────────────────────────┤   │
│ │ (role-   │                                 │   │
│ │  based   │  Main Content Area              │   │
│ │  nav)    │  (children)                     │   │
│ │          │                                 │   │
│ │          ├─────────────────────────────────┤   │
│ │          │  Footer (version, copyright)    │   │
│ └──────────┴─────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### 10.2 Role-Based Sidebar (`DashboardSidebar.tsx`)

The sidebar renders **completely different navigation** based on the user's highest role:

#### Super Admin / System Admin
```
Command Center:
  ├── Dashboard
  ├── System Overview
  ├── Analytics & BI
  ├── User Management
  └── Role Management

Module Management:
  ├── Citizen Database
  ├── Recruitment
  ├── Recruitment Analytics
  ├── Talent Marketplace
  ├── Companies
  ├── E-Learning
  ├── Mentorship
  ├── Mentorship Market
  ├── CBT Administration
  └── Video Meetings

Operations:
  ├── Announcements
  ├── Bulk Operations
  ├── Workflows
  ├── Audit Logs
  ├── Notifications
  └── Branding
```

#### Citizen DB Admin
```
Citizen Database:
  ├── Dashboard
  ├── Citizen Management
  ├── Citizen Analytics
  ├── Reports & Export
  ├── Register Citizens
  └── Register Officers

Communication:
  ├── Citizen Chat
  └── Notifications
```

#### Mentorship Admin
```
Mentorship Management:
  ├── Dashboard
  ├── Mentor Management
  ├── Mentee Management
  ├── Mentorship Requests
  ├── Session Management
  ├── Marketplace Oversight
  ├── Group Chatrooms
  └── Mentorship Analytics

Communication:
  ├── Messages
  └── Notifications
```

#### Recruitment Admin
```
Recruitment Management:
  ├── Dashboard
  ├── Recruiter Management
  ├── Job Postings
  ├── Recruitment Analytics
  ├── Talent Marketplace
  ├── Company Profiles
  └── Video Interviews

Communication:
  ├── Messages
  └── Notifications
```

#### CBT Admin
```
CBT Administration:
  ├── Dashboard
  ├── Question Bank
  ├── Exam Templates
  └── Exam Analytics

Communication:
  └── Notifications
```

#### E-Learning Admin
```
E-Learning Management:
  ├── Dashboard
  ├── Course Management
  ├── Instructor Management
  ├── Enrollment Analytics
  └── Certificates

Communication:
  ├── Messages
  └── Notifications
```

#### LGA Officer
```
LGA Management:
  ├── Dashboard
  ├── LGA Citizens
  ├── Register Citizens
  ├── Messages
  └── Notifications
```

#### Ward Officer
```
Ward Management:
  ├── Dashboard
  ├── Ward Registry
  ├── Register Citizens
  ├── Messages
  └── Notifications
```

#### Recruiter
```
Recruiter Panel:
  ├── Dashboard
  ├── Recruiter Panel
  ├── My Job Posts
  ├── Talent Search
  ├── Applications
  ├── Company Profile
  ├── Video Meetings
  ├── Messages
  └── Notifications
```

#### Instructor
```
Creator Studio:
  ├── Dashboard
  ├── Creator Studio
  ├── Messages
  └── Notifications
```

#### Mentor
```
Mentorship:
  ├── Dashboard
  ├── My Mentees
  ├── Marketplace
  ├── Video Meetings
  ├── Messages
  └── Notifications
```

#### Citizen (Default)
```
Main Menu:
  ├── Dashboard
  ├── My Profile
  └── Search

Jobs & Career:
  ├── Job Seeker Hub
  ├── Career Profile
  ├── Smart Job Match
  ├── Browse Jobs
  ├── Companies
  ├── My Applications
  ├── AI Interview Coach
  └── CV Generator

Learning & Social:
  ├── E-Learning
  ├── Mentorship
  ├── Mentor Marketplace
  ├── Community
  └── Video Meetings

Communication:
  ├── Messages
  └── Notifications
```

### 10.3 Dashboard Content (`/dashboard`)

**Component:** `src/pages/DashboardPage.tsx`

Renders a **different dashboard component** based on highest role:

| Role | Dashboard Component | Content |
|---|---|---|
| `super_admin` / `admin` | `SuperAdminDashboard` | Platform KPIs (citizens, jobs, courses, mentors), gender/employment stats, system status, notifications |
| `citizen_db_admin` | `CitizenDBAdminDashboard` | Total citizens, pending approvals, new this week, quick links |
| `mentorship_admin` | `MentorshipAdminDashboard` | Mentor count, active mappings, sessions, quick links |
| `recruitment_admin` | `RecruitmentAdminDashboard` | Total jobs, active jobs, applications, pending count |
| `cbt_admin` / `learning_admin` | `ModuleAdminDashboard` | Generic stats for relevant module |
| `lga_officer` | `LGAOfficerDashboard` | LGA-specific citizen stats, registration links |
| `ward_officer` | `WardOfficerDashboard` | Ward-specific data, registration links |
| `recruiter` | `RecruiterDashboard` | Job posts, applications, saved candidates |
| `mentor` | `MentorDashboard` | Mentees, sessions, ratings |
| `instructor` | `InstructorDashboard` | Courses, enrollments |
| `user` (citizen) | `CitizenDashboard` | Profile completion, applications, enrollments, notifications |

### 10.4 Dashboard Header (`DashboardHeader.tsx`)

- Sidebar toggle button
- Search input
- Notification bell with unread count badge
- User avatar with dropdown menu (Profile, Settings, Logout)

---

## 11. Module 4: Recruitment & ATS

### 11.1 Overview

Full Applicant Tracking System covering the complete recruitment lifecycle:

```
Job Posting → Application → Screening → Interview → Scoring → Offer → Acceptance
```

### 11.2 Pages & Routes

| Route | Component | Access | Description |
|---|---|---|---|
| `/jobs` | JobsPage | Authenticated | Browse/search jobs (citizens) or manage posts (recruiters) |
| `/jobs-board` | PublicJobsPage | Public | Microsoft Careers-style public job board |
| `/job-seeker` | JobSeekerDashboardPage | Citizens | Job seeker hub with recommendations |
| `/applications` | MyApplicationsPage | Citizens | Track application status |
| `/recruiter` | RecruiterPage | Recruiters | Full recruiter panel |
| `/recruitment-admin` | RecruitmentAdminPage | Recruitment Admin | Admin oversight |
| `/recruitment-analytics` | RecruitmentAnalyticsPage | Admins | Hiring analytics |
| `/talent-marketplace` | TalentMarketplacePage | Recruiters/Admins | Search candidate pool |
| `/companies` | CompanyProfilesPage | All | Company profiles & reviews |
| `/smart-match` | SmartJobMatchPage | Citizens | AI-powered job matching |
| `/ai-coach` | AIInterviewCoachPage | Citizens | AI interview preparation |
| `/career-profile` | CareerProfilePage | Citizens | Professional digital identity |
| `/cv` | CVGeneratorPage | Citizens | AI-powered CV generator |

### 11.3 Job Posting Features

- Title, description, company, location, LGA
- Sector, employment type (Full-time/Part-time/Contract/Internship)
- Qualification required (from QUALIFICATION_TYPES)
- Experience level
- Salary range
- Skills required (array)
- Deadline date
- Custom application questions (JSONB)
- Internal vs External posting flag
- External URL for third-party jobs
- Active/Inactive toggle

### 11.4 Application Tracking Pipeline

```
pending → screening → shortlisted → interview → offered → accepted
                   ↘ rejected     ↘ rejected   ↘ rejected ↘ declined
```

Application includes:
- Cover letter (text)
- Resume URL (file upload)
- Custom question answers (JSONB)
- Additional documents (JSONB array)
- Status tracking with pipeline history

### 11.5 Recruiter Panel (`/recruiter`)

**Tabs:**
1. **My Jobs** — List of posted jobs with applicant counts, active/inactive toggle
2. **Applications** — All applications across jobs with status management
3. **Interview Invitations** — Schedule and manage interviews
4. **Job Offers** — Issue and track offer letters
5. **Saved Candidates** — Candidate pool with notes and tags
6. **Company Profile** — Employer branding management

**Features per application:**
- View applicant profile & CV
- Update application status (pipeline stages)
- Score candidates (category, score/100, notes)
- Send interview invitation (type, scheduled date, notes)
- Issue job offer (salary, details)
- Start video interview
- Direct message applicant

### 11.6 Candidate Scoring

```sql
CREATE TABLE candidate_scores (
  application_id UUID NOT NULL,
  job_id UUID NOT NULL,
  user_id UUID NOT NULL,
  scorer_id UUID NOT NULL,
  category TEXT DEFAULT 'overall',     -- 'overall', 'technical', 'communication', etc.
  score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 100,
  notes TEXT
);
```

### 11.7 Interview Invitations

```sql
CREATE TABLE interview_invitations (
  application_id UUID NOT NULL,
  job_id UUID NOT NULL,
  user_id UUID NOT NULL,
  recruiter_id UUID NOT NULL,
  type TEXT DEFAULT 'interview',       -- 'interview', 'screening', 'assessment'
  status TEXT DEFAULT 'pending',       -- 'pending', 'accepted', 'declined', 'completed'
  scheduled_at TIMESTAMPTZ,
  notes TEXT
);
```

### 11.8 Job Offers

```sql
CREATE TABLE job_offers (
  application_id UUID NOT NULL,
  job_id UUID NOT NULL,
  user_id UUID NOT NULL,
  recruiter_id UUID NOT NULL,
  salary_offered TEXT,
  offer_details TEXT,
  status TEXT DEFAULT 'pending',       -- 'pending', 'accepted', 'declined', 'withdrawn'
  responded_at TIMESTAMPTZ
);
```

### 11.9 Talent Marketplace (`/talent-marketplace`)

- Search citizens by skills, LGA, qualification, employment status
- Filter by availability
- View candidate profiles
- Save candidates to recruiter's pool
- Direct message candidates

### 11.10 Company Profiles (`/companies`)

- Company creation: name, industry, size, location, LGA, culture, benefits
- Logo and cover image upload
- Social links (JSONB)
- Verification status badge
- Employee reviews with rating (1-5), pros/cons
- Open jobs listing linked to company

### 11.11 Smart Job Match (`/smart-match`)

- AI-powered matching using Gemini/GPT
- Analyzes user's skills, education, experience, preferences
- Returns ranked job recommendations with match percentage
- Edge function: `smart-job-match`

### 11.12 AI Interview Coach (`/ai-coach`)

- Select job type/industry for practice
- AI generates interview questions
- User types responses
- AI provides feedback on answers
- Edge function: `ai-interview-coach`

### 11.13 CV Generator (`/cv`)

- Pull data from user's profile
- AI-enhanced content generation
- Professional formatting
- PDF generation
- Edge function: `generate-cv`

---

## 12. Module 5: E-Learning & CBT

### 12.1 Pages & Routes

| Route | Component | Access | Description |
|---|---|---|---|
| `/learning` | LearnerDashboardPage | Citizens | Browse courses, track progress |
| `/course/:courseId` | CoursePage | Enrolled users | Lesson viewer, quizzes, discussions |
| `/learning/creator` | CreatorDashboardPage | Instructors | Create & manage courses |
| `/learning/admin` | LearningAdminPage | Learning Admin | Course approval, analytics |
| `/cbt-admin` | CBTAdminPage | CBT Admin | Question bank, exam management |

### 12.2 Course Structure

```
Course
├── Title, Description, Category, Level, Duration, Price
├── Thumbnail image
├── Instructor (linked to profiles via instructor_id)
├── Published / Unpublished status
├── Instructor Approved flag
├── Lessons[]
│   ├── Title, Content (rich text), Video URL
│   ├── Order index
│   └── Duration
├── Course Materials[]
│   ├── Title, File URL, File Type, File Size
│   └── Linked to lesson (optional)
├── Quizzes[]
│   ├── Title, Description, Pass Score, Time Limit
│   └── Questions[]
│       ├── Question text
│       ├── Options (JSONB array)
│       ├── Correct answer index
│       └── Order index
└── Discussion Posts[]
    ├── Content, User, Timestamp
    ├── Pinned flag
    └── Threaded replies (parent_id)
```

### 12.3 Enrollment & Progress

- Users enroll in courses (free or paid)
- Progress tracked as percentage (0-100)
- Lesson completions recorded individually
- Course completion triggers certificate generation

### 12.4 Certificate System

- Auto-generated certificate number
- Links to course and enrollment
- QR verification URL
- Public verification page at `/verify-certificate/:certNumber`
- PDF generation support

### 12.5 CBT Administration

**Tabs:**
1. **Question Bank** — Create, edit, delete quiz questions
2. **Exam Templates** — Configure timed exams with pass scores
3. **Analytics** — Attempt statistics, pass/fail rates

### 12.6 Quiz/CBT Flow

```
Student starts quiz
→ Timer begins (time_limit_minutes)
→ Questions displayed one at a time
→ Student selects answers
→ Auto-submit on timer expiry
→ Auto-grading (score calculated)
→ Pass/Fail determined (vs pass_score)
→ Results stored in quiz_attempts
```

---

## 13. Module 6: Mentorship (Trailblazer)

### 13.1 Pages & Routes

| Route | Component | Access | Description |
|---|---|---|---|
| `/mentorship` | MentorshipPage | Citizens/Mentors | View mentor list, request mentorship |
| `/mentorship-marketplace` | MentorshipMarketplacePage | All | Bi-directional marketplace |
| `/mentorship-admin` | MentorshipAdminPage | Mentorship Admin | Mentor/mapping management |

### 13.2 Mentor Categories

```typescript
const MENTOR_CATEGORIES = [
  "Academics", "Civil Servants", "Business Owners", "ICT Experts",
  "Medical Professionals", "Engineers", "Entrepreneurs", "Diaspora Professionals"
];
```

### 13.3 Mentorship Marketplace

**Bi-directional listings:**

1. **Mentors seeking mentees** (`listing_type: 'seeking_mentee'`):
   - Title (e.g., "Experienced Software Engineer offering mentorship")
   - Description of expertise
   - Skills offered
   - Experience level
   - Expectations from mentee
   - Category

2. **Mentees seeking mentors** (`listing_type: 'seeking_mentor'`):
   - Title (e.g., "CS graduate looking for career guidance")
   - Description of goals
   - Skills to develop
   - Experience level
   - Expectations from mentor
   - Category preference

### 13.4 Mentorship Requests

```sql
CREATE TABLE mentorship_requests (
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  listing_id UUID,                    -- Optional link to marketplace listing
  message TEXT,
  request_type TEXT DEFAULT 'seeking_mentor',  -- 'seeking_mentor' | 'offering_mentorship'
  status TEXT DEFAULT 'pending'               -- 'pending' | 'accepted' | 'declined'
);
```

### 13.5 Mentor-Mentee Mapping

```sql
CREATE TABLE mentorship_mappings (
  mentor_id UUID NOT NULL,            -- References mentors(id)
  mentee_id UUID NOT NULL,            -- User ID of mentee
  status TEXT DEFAULT 'active',       -- 'active' | 'completed' | 'cancelled'
  auto_matched BOOLEAN DEFAULT false,
  match_reason TEXT,
  notes TEXT
);
```

### 13.6 Mentorship Sessions

```sql
CREATE TABLE mentorship_sessions (
  mapping_id UUID NOT NULL,
  mentor_id UUID NOT NULL,
  mentee_id UUID NOT NULL,
  title TEXT NOT NULL,
  session_type TEXT DEFAULT 'chat',    -- 'chat' | 'video' | 'in_person'
  status TEXT DEFAULT 'scheduled',     -- 'scheduled' | 'completed' | 'cancelled'
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT
);
```

### 13.7 Mentorship Goals (Milestones)

```sql
CREATE TABLE mentorship_goals (
  mapping_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',       -- 'pending' | 'in_progress' | 'completed'
  target_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL
);
```

### 13.8 Mentor Ratings

```sql
CREATE TABLE mentor_ratings (
  mentor_id UUID NOT NULL,
  mentee_id UUID NOT NULL,
  mapping_id UUID,
  rating INTEGER NOT NULL,             -- 1-5 stars
  feedback TEXT
);
```

### 13.9 AI Auto-Matching

The system can automatically match mentors to mentees based on:
- Shared skills/interests
- Compatible categories
- Mentor availability (current_mentees < max_mentees)
- LGA proximity
- Experience level alignment

### 13.10 Group Chatrooms

Mentorship-specific topic-based chatrooms:
- Created by mentors or admins
- Max member limit
- Real-time messaging with file sharing
- Linked to specific mentor

---

## 14. Module 7: Community Hub

### 14.1 Pages & Routes

| Route | Component | Access | Description |
|---|---|---|---|
| `/community` | CommunityPage | Citizens | Social networking feed |

### 14.2 Features

**Social Feed:**
- Create posts (text + media)
- Like/react to posts
- Threaded comments with nested replies
- Share posts
- Post visibility controls

**Social Groups:**
- Create public/private groups
- Category-based organization
- Group membership management
- Group feed within community

**User Connections:**
- Follow/unfollow users
- Follower/following counts
- Activity feed showing followed users' actions

**Activity Feed (Automated):**
- Database triggers log actions:
  - Job applications submitted
  - Course enrollments
  - Certificate earned
  - Mentorship connections
- Public/private visibility toggle

### 14.3 Database Tables

```sql
-- Posts
social_posts (id, user_id, content, media_url, likes_count, comments_count, shares_count, is_pinned)

-- Comments (threaded)
social_comments (id, post_id, user_id, content, parent_id, likes_count)

-- Follows
social_follows (id, follower_id, following_id)

-- Groups
social_groups (id, name, description, category, cover_image_url, is_public, member_count, created_by)

-- Group Members
social_group_members (id, group_id, user_id, role)  -- role: 'admin', 'moderator', 'member'
```

---

## 15. Module 8: Messaging & Communication

### 15.1 Pages & Routes

| Route | Component | Access | Description |
|---|---|---|---|
| `/chat` | ChatPage | Authenticated | 1:1 direct messaging |

### 15.2 Direct Messaging

- Real-time via Supabase Realtime subscriptions
- File attachment support (file_url, file_name)
- Read/unread status tracking
- User search to start new conversations
- Message history with pagination

### 15.3 Group Chat (Mentorship Module)

- Topic-based chatrooms linked to mentors
- Member management (join/leave)
- File sharing within chatrooms
- Admin moderation capabilities

### 15.4 Database Tables

```sql
-- Direct Messages (realtime enabled)
messages (id, sender_id, receiver_id, content, file_url, file_name, is_read, created_at)

-- Group Chatrooms
group_chatrooms (id, name, topic, description, created_by, mentor_id, is_active, max_members)
chatroom_members (id, chatroom_id, user_id, joined_at)
chatroom_messages (id, chatroom_id, user_id, content, file_url, file_name, created_at)
```

---

## 16. Module 9: Video Meetings

### 16.1 Pages & Routes

| Route | Component | Access | Description |
|---|---|---|---|
| `/video-meetings` | VideoMeetingsPage | Authenticated | Video conferencing hub |

### 16.2 Features

- In-app video calling (WebRTC-based)
- Screen sharing
- Used for: interview screening, mentorship sessions, group meetings
- Integrated into recruiter panel and mentorship module
- Meeting recording support

### 16.3 Components

- `VideoMeeting.tsx` — Video meeting UI component
- `useVideoMeeting.ts` — State management hook for video calls

---

## 17. Module 10: Administration

### 17.1 Super Admin Panel (`/admin`)

**Component:** `src/pages/AdminPage.tsx`

**Tabs:**

1. **Overview** — Stats grid (citizens, employed, unemployed, self-employed, male, female, jobs, courses)
2. **Citizens** — Searchable/filterable citizen list with:
   - 12 filter dimensions: search, LGA, gender, employment status, sector, qualification, senatorial zone, age range
   - Approve/reject citizen profiles
   - View education records
   - Export CSV
   - Print-friendly report generation
3. **Roles & Users** — Role assignment interface:
   - Select user from dropdown
   - Assign role from assignable roles list
   - View all role assignments grouped by user
   - Remove roles
   - Create new users via edge function
4. **Jobs** — Job moderation: create, activate/deactivate jobs
5. **Courses** — Course management: create courses, manage publishing
6. **Mentors** — Register mentors from existing citizens by email lookup
7. **CBT Exams** — Quiz/exam oversight
8. **Reports & Analytics** — Advanced reporting engine with AdvancedReporting component

### 17.2 Citizen DB Admin (`/citizen-db`)

**Component:** `src/pages/CitizenDBAdminPage.tsx`

**Tabs:**
1. **Citizens** — Full citizen table with pagination (25/page), inline editing, search
2. **Analytics** — Recharts visualizations:
   - Registration trend (6-month bar chart)
   - LGA distribution
   - Senatorial zone pie chart
   - Sector breakdown
   - Education level progress bars
3. **Demographics** — LGA table with citizen counts
4. **Chat** — Direct messaging with citizens

**Features:**
- Register single citizen (form)
- Register citizen via edge function (admin-create-user)
- Bulk CSV import
- Inline profile editing dialog
- CSV export with NIN, Ward, Village
- Pagination controls

### 17.3 Mentorship Admin (`/mentorship-admin`)

**Component:** `src/pages/MentorshipAdminPage.tsx`

**Tabs:**
1. **Mentors** — Mentor list with activate/deactivate, add new mentor
2. **Mappings** — Mentor-mentee pairs with status management
3. **Requests** — Pending mentorship requests to approve/decline
4. **Sessions** — Session scheduling and tracking
5. **Chatrooms** — Group chatroom management
6. **Reports** — Mentorship analytics

### 17.4 Recruitment Admin (`/recruitment-admin`)

**Component:** `src/pages/RecruitmentAdminPage.tsx`

**Tabs:**
1. **Recruiters** — Register/manage recruiter accounts
2. **Jobs** — Moderate all job postings
3. **Analytics** — Recruitment metrics

### 17.5 Learning Admin (`/learning/admin`)

**Component:** `src/pages/LearningAdminPage.tsx`

**Tabs:**
1. **Courses** — Approve/manage courses, instructor assignments
2. **Instructors** — Manage instructor accounts
3. **Analytics** — Enrollment and completion data
4. **Certificates** — Issued certificate management

### 17.6 CBT Admin (`/cbt-admin`)

**Component:** `src/pages/CBTAdminPage.tsx`

**Tabs:**
1. **Question Bank** — CRUD quiz questions
2. **Exams** — Configure exam templates with time limits and pass scores
3. **Analytics** — Attempt results, pass/fail rates

### 17.7 LGA Officer (`/lga-officer`)

**Component:** `src/pages/LGAOfficerPage.tsx`

- View citizens within assigned LGA
- Register new citizens
- Edit citizen profiles within LGA
- Generate LGA-level reports

### 17.8 Ward Officer (`/ward-officer`)

**Component:** `src/pages/WardOfficerPage.tsx`

- Register citizens at ward level
- Edit ward-level citizen records
- View ward-specific data

### 17.9 Bulk Operations (`/bulk-operations`)

**Component:** `src/pages/BulkOperationsPage.tsx`

- CSV bulk import for citizens
- CSV bulk import for jobs
- Template download
- Progress tracking
- Error reporting

### 17.10 Workflow Automation (`/workflows`)

**Component:** `src/pages/WorkflowAutomationPage.tsx`

- Multi-entity approval pipeline
- Supports entity types: course, job, recruiter_application, mentor_application
- SLA deadline tracking
- Escalation rules
- Priority levels (normal, high, urgent)
- Status flow: pending → approved/rejected
- Assignment to specific reviewers

### 17.11 Audit Logs (`/audit-logs`)

**Component:** `src/pages/AuditLogsPage.tsx`

- System-wide audit trail
- Tracks: action, actor, entity type, entity ID, timestamp, IP address
- Filterable by entity type, date range
- Auto-populated by database triggers
- JSONB details for additional context

### 17.12 Announcements (`/announcements`)

**Component:** `src/pages/AnnouncementsPage.tsx`

- Create system-wide announcements
- Types: info, warning, success, danger
- Audience targeting: all, admins, citizens, recruiters, mentors
- Optional link attachment

---

## 18. Module 11: Analytics & Reporting

### 18.1 Pages & Routes

| Route | Component | Access | Description |
|---|---|---|---|
| `/analytics` | AnalyticsDashboardPage | Admins | Platform-wide analytics |
| `/recruitment-analytics` | RecruitmentAnalyticsPage | Recruitment Admin | Hiring analytics |

### 18.2 Analytics Dashboard

- Total citizens trend over time
- Employment status breakdown (pie chart)
- Gender distribution
- LGA-wise registration heatmap
- Sector distribution
- Qualification levels
- Top skills
- Active jobs vs applications ratio

### 18.3 Recruitment Analytics

- Hiring funnel visualization
- Time-to-hire metrics
- Applications per job
- Sector-wise hiring trends
- Recruiter performance scorecards
- Candidate pipeline analytics

### 18.4 Advanced Reporting (`AdvancedReporting` component)

- 12 filter dimensions:
  1. Date range (from/to)
  2. LGA
  3. Gender
  4. Employment status
  5. Sector
  6. Qualification type
  7. Senatorial zone
  8. Age range (min/max)
  9. User type
  10. Skills
  11. Approval status
  12. Registration period

- Export formats: CSV, printable HTML
- Chart types: bar, line, pie (Recharts)

---

## 19. Module 12: Branding & White-Label

### 19.1 Page & Route

| Route | Component | Access | Description |
|---|---|---|---|
| `/branding` | BrandingAdminPage | Super Admin | Configure platform branding |

### 19.2 Branding Settings Table

```sql
CREATE TABLE branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name TEXT NOT NULL DEFAULT 'J-Connect',
  tagline TEXT DEFAULT 'Jigawa State''s unified platform for human capital development',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '142 72% 29%',      -- HSL values
  secondary_color TEXT DEFAULT '45 93% 47%',     -- HSL values
  meta_description TEXT,
  footer_text TEXT DEFAULT '© {year} J-Connect — Jigawa State Government. All rights reserved.',
  contact_email TEXT DEFAULT 'info@jconnect.jg.gov.ng',
  contact_phone TEXT DEFAULT '+234 800 000 0000',
  contact_address TEXT DEFAULT 'Dutse, Jigawa State',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);
```

### 19.3 Branding Hook (`useBranding`)

```typescript
// src/hooks/useBranding.tsx
const useBranding = () => {
  // Returns: system_name, tagline, logo_url, primary_color, secondary_color,
  //          meta_description, footer_text, contact_email, contact_phone, contact_address
};

const useLogoUrl = () => {
  // Returns logo_url from branding or fallback to static asset
};
```

### 19.4 Dynamic Branding Points

The system name and branding dynamically appear in:
- Navbar title
- Sidebar header
- Login page
- Registration page
- Landing page hero
- Dashboard footer
- Email templates
- Browser tab title
- SEO meta tags
- Print reports

### 19.5 Admin Controls

- Edit system name
- Upload/change logo
- Modify tagline
- Update contact information
- Change footer text
- Modify SEO meta description
- Real-time preview of changes

---

## 20. Module 13: Notifications

### 20.1 Pages & Routes

| Route | Component | Access | Description |
|---|---|---|---|
| `/notifications` | NotificationsPage | Authenticated | Full notification inbox |

### 20.2 Notification Types

- Application status updates
- Interview invitations
- Job offer notifications
- Course enrollment confirmations
- Certificate issued
- Mentorship requests
- Message alerts
- System announcements
- Approval workflow updates

### 20.3 Notification Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,                           -- 'info', 'success', 'warning', 'error'
  link TEXT,                           -- Optional deep link
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 20.4 UI Components

- **NotificationCenter** (`NotificationCenter.tsx`) — Bell icon in header with dropdown showing recent unread notifications
- **NotificationsPage** — Full list with mark as read, filter by type

---

## 21. Module 14: AI-Powered Features

### 21.1 Smart Job Matching

**Edge Function:** `smart-job-match`
- Input: User profile (skills, education, experience, preferences)
- Processing: AI analyzes compatibility with available jobs
- Output: Ranked job list with match percentage and reasoning

### 21.2 AI Interview Coach

**Edge Function:** `ai-interview-coach`
- Input: Job type, industry, difficulty level
- Processing: AI generates realistic interview questions
- Output: Questions, then feedback on user answers

### 21.3 CV Generator

**Edge Function:** `generate-cv`
- Input: User profile data
- Processing: AI enhances content, professional formatting
- Output: Generated CV document (PDF)

### 21.4 Course Recommendations

**Edge Function:** `ai-course-recommend`
- Input: User's skills, career goals, learning history
- Processing: AI matches with available courses
- Output: Personalized course recommendations

### 21.5 AI Configuration

All AI features use the **Lovable AI Gateway** which provides access to:
- Google Gemini models (2.5 Flash, 2.5 Pro)
- OpenAI GPT models (GPT-5, GPT-5-mini)

No API keys required from users — integrated via gateway.

---

## 22. Edge Functions (Serverless Backend)

### 22.1 Functions List

| Function | JWT | Purpose |
|---|---|---|
| `admin-create-user` | No | Create user accounts programmatically (admin only) |
| `smart-job-match` | No | AI-powered job matching |
| `ai-interview-coach` | No | AI interview practice |
| `generate-cv` | No | AI CV generation |
| `ai-course-recommend` | No | AI course recommendations |

### 22.2 admin-create-user

**Input:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe",
  "phone": "+234...",
  "lga": "Dutse",
  "gender": "Male",
  "role": "recruiter"        // Optional: assign role on creation
}
```

**Process:**
1. Create auth user via Supabase Admin API
2. Create profile record in `profiles` table
3. Optionally assign role in `user_roles` table

### 22.3 Configuration

```toml
# supabase/config.toml
[functions.generate-cv]
verify_jwt = false

[functions.admin-create-user]
verify_jwt = false

[functions.smart-job-match]
verify_jwt = false

[functions.ai-interview-coach]
verify_jwt = false

[functions.ai-course-recommend]
verify_jwt = false
```

---

## 23. File Storage

### 23.1 Storage Buckets

| Bucket | Purpose | Access |
|---|---|---|
| `avatars` | Passport photos / profile pictures | Authenticated users (own files) |
| `cvs` | CV/resume uploads | Authenticated users + recruiters |
| `course-materials` | Course files, videos, documents | Enrolled users + instructors |
| `chat-files` | Message attachments | Conversation participants |
| `logos` | System branding logos | Public read, admin write |

### 23.2 File Upload Pattern

```typescript
// Upload to storage
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/photo.jpg`, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/photo.jpg`);
```

---

## 24. Routing & Navigation

### 24.1 Route Map (47 routes)

#### Public Routes (no auth required)
| Route | Component | Layout |
|---|---|---|
| `/` | Index (LandingPage) | None (full page) |
| `/login` | LoginPage | Navbar |
| `/register` | RegisterPage | Navbar |
| `/jobs-board` | PublicJobsPage | None |
| `/verify-certificate/:certNumber` | VerifyCertificatePage | None |
| `/verify-certificate` | VerifyCertificatePage | None |
| `/reset-password` | ResetPasswordPage | Navbar |

#### Dashboard Routes (auth required, sidebar layout)
| Route | Component | Primary Role |
|---|---|---|
| `/dashboard` | DashboardPage | All (role-specific content) |
| `/profile` | ProfilePage | Citizens |
| `/cv` | CVGeneratorPage | Citizens |
| `/jobs` | JobsPage | Citizens, Recruiters |
| `/job-seeker` | JobSeekerDashboardPage | Citizens |
| `/applications` | MyApplicationsPage | Citizens |
| `/interview-chat` | InterviewChatPage | Citizens |
| `/mentorship` | MentorshipPage | Citizens, Mentors |
| `/chat` | ChatPage | All |
| `/learning` | LearnerDashboardPage | Citizens |
| `/learning/creator` | CreatorDashboardPage | Instructors |
| `/learning/admin` | LearningAdminPage | Learning Admin |
| `/course/:courseId` | CoursePage | Enrolled Users |
| `/search` | SearchPage | All |
| `/admin` | AdminPage | Admins |
| `/recruitment-admin` | RecruitmentAdminPage | Recruitment Admin |
| `/recruiter` | RecruiterPage | Recruiters |
| `/mentorship-admin` | MentorshipAdminPage | Mentorship Admin |
| `/analytics` | AnalyticsDashboardPage | Admins |
| `/smart-match` | SmartJobMatchPage | Citizens |
| `/ai-coach` | AIInterviewCoachPage | Citizens |
| `/announcements` | AnnouncementsPage | Admins |
| `/bulk-operations` | BulkOperationsPage | Admins |
| `/notifications` | NotificationsPage | All |
| `/workflows` | WorkflowAutomationPage | Admins |
| `/audit-logs` | AuditLogsPage | Admins |
| `/talent-marketplace` | TalentMarketplacePage | Recruiters, Admins |
| `/companies` | CompanyProfilesPage | All |
| `/recruitment-analytics` | RecruitmentAnalyticsPage | Admins |
| `/career-profile` | CareerProfilePage | Citizens |
| `/cbt-admin` | CBTAdminPage | CBT Admin |
| `/citizen-db` | CitizenDBAdminPage | Citizen DB Admin |
| `/lga-officer` | LGAOfficerPage | LGA Officers |
| `/ward-officer` | WardOfficerPage | Ward Officers |
| `/mentorship-marketplace` | MentorshipMarketplacePage | All |
| `/video-meetings` | VideoMeetingsPage | All |
| `/community` | CommunityPage | Citizens |
| `/branding` | BrandingAdminPage | Super Admin |

### 24.2 Layout Components

| Layout | Usage | Structure |
|---|---|---|
| None | Landing page, public job board | Full-page render |
| `LayoutWithNav` | Login, Register, Reset Password | Navbar + content |
| `DashLayout` | All dashboard routes | Sidebar + Header + Content + Footer |

---

## 25. UI Component Library

### 25.1 shadcn/ui Components (50+)

All components are in `src/components/ui/` and extend Radix UI primitives:

| Component | File | Usage |
|---|---|---|
| Accordion | accordion.tsx | FAQ sections, collapsible content |
| Alert | alert.tsx | Status messages |
| AlertDialog | alert-dialog.tsx | Destructive action confirmations |
| AspectRatio | aspect-ratio.tsx | Image containers |
| Avatar | avatar.tsx | User profile pictures |
| Badge | badge.tsx | Role badges, status indicators |
| Breadcrumb | breadcrumb.tsx | Navigation hierarchy |
| Button | button.tsx | Actions (7 variants + 4 sizes) |
| Calendar | calendar.tsx | Date pickers |
| Card | card.tsx | Content containers |
| Carousel | carousel.tsx | Sliding content |
| Chart | chart.tsx | Recharts wrapper |
| Checkbox | checkbox.tsx | Boolean inputs |
| Collapsible | collapsible.tsx | Toggle content |
| Command | command.tsx | Command palette |
| ContextMenu | context-menu.tsx | Right-click menus |
| Dialog | dialog.tsx | Modal windows |
| Drawer | drawer.tsx | Mobile-friendly modals |
| DropdownMenu | dropdown-menu.tsx | Action menus |
| Form | form.tsx | React Hook Form integration |
| HoverCard | hover-card.tsx | Preview on hover |
| Input | input.tsx | Text inputs |
| InputOTP | input-otp.tsx | OTP entry |
| Label | label.tsx | Form labels |
| Menubar | menubar.tsx | Menu navigation |
| NavigationMenu | navigation-menu.tsx | Complex nav |
| Pagination | pagination.tsx | Page navigation |
| Popover | popover.tsx | Floating content |
| Progress | progress.tsx | Progress bars |
| RadioGroup | radio-group.tsx | Single selection |
| Resizable | resizable.tsx | Resizable panels |
| ScrollArea | scroll-area.tsx | Custom scrollbars |
| Select | select.tsx | Dropdown selects |
| Separator | separator.tsx | Visual dividers |
| Sheet | sheet.tsx | Side panels |
| Sidebar | sidebar.tsx | Dashboard sidebar |
| Skeleton | skeleton.tsx | Loading states |
| Slider | slider.tsx | Range inputs |
| Sonner | sonner.tsx | Toast notifications |
| Switch | switch.tsx | Toggle switches |
| Table | table.tsx | Data tables |
| Tabs | tabs.tsx | Tabbed interfaces |
| Textarea | textarea.tsx | Multi-line text |
| Toast | toast.tsx | Alert toasts |
| Toggle | toggle.tsx | Toggle buttons |
| ToggleGroup | toggle-group.tsx | Button groups |
| Tooltip | tooltip.tsx | Hover tooltips |

---

## 26. Security Requirements

### 26.1 Authentication Security

- Email verification required (NOT auto-confirmed)
- Password minimum 6 characters
- Session management via Supabase JWT tokens
- Password reset via secure email link
- No anonymous sign-ups allowed

### 26.2 Row-Level Security (RLS)

Every table has RLS enabled with policies enforcing:
- Users can only access their own data (profiles, applications, messages)
- Admins have elevated access based on role
- Public tables (jobs, company profiles) allow read-only access
- Write operations require authentication and role verification
- `has_role()` security definer function prevents recursive RLS issues

### 26.3 Role Security

- Roles stored in separate table (NOT on profile) to prevent privilege escalation
- Role changes only by super_admin or admin
- Each admin tier can only assign roles within their scope
- `SECURITY DEFINER` function for role checking

### 26.4 Data Access Patterns

```
Public (no auth):        SELECT on jobs (active), company_profiles, branding_settings
Authenticated (own):     CRUD on own profile, applications, enrollments, messages
Recruiter:              SELECT on applications, profiles; CRUD on own jobs, offers
Module Admin:           CRUD within assigned module scope
Super Admin:            Full access to all tables
```

### 26.5 Edge Function Security

- `verify_jwt = false` on all functions (handled internally)
- Admin operations validate role before executing
- User creation via service role key (server-side only)

---

## 27. Non-Functional Requirements

### 27.1 Performance

- Client-side SPA with code splitting via React lazy loading
- TanStack Query for server state caching and deduplication
- Pagination on all admin data tables (25-50 items per page)
- Supabase default 1000-row query limit respected
- Optimistic UI updates where applicable

### 27.2 Responsiveness

- Fully responsive (mobile, tablet, desktop)
- Sidebar collapsible on mobile (using SidebarProvider)
- Mobile hamburger menu on Navbar
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- `use-mobile` hook for mobile detection

### 27.3 Accessibility

- Semantic HTML structure
- ARIA attributes via Radix UI primitives
- Keyboard navigation support
- Focus management in dialogs and modals
- Color contrast compliance

### 27.4 SEO

- Dynamic `<title>` via branding settings
- Meta description from branding
- Semantic HTML with single H1 per page
- Alt text on images
- robots.txt in public directory

### 27.5 State Management

| Layer | Tool | Purpose |
|---|---|---|
| Server state | TanStack React Query | Data fetching, caching, synchronization |
| Auth state | React Context (useAuth) | Session, user, auth methods |
| Branding state | React Context (useBranding) | Dynamic platform branding |
| UI state | React useState | Component-level state |
| Global state | Zustand | Cross-component state (if needed) |

### 27.6 Error Handling

- Toast notifications for user-facing errors (Sonner)
- Try/catch in all async operations
- Graceful fallbacks for missing data
- Loading states with skeleton components
- 404 page for unknown routes

### 27.7 Data Export

- CSV export from admin tables
- Printable HTML reports
- PDF generation via edge functions (CV)

---

## Appendix A: API Functions Reference

### Core API (`src/lib/api.ts`)

```typescript
fetchProfile(userId)                    // Get user profile
updateProfile(userId, data)             // Update user profile
adminUpdateProfile(profileId, data)     // Admin update any profile
fetchAllProfiles(filters)              // Fetch all profiles with 12 filters
fetchEducation(userId)                 // Get education records
addEducation(data)                     // Add education record
deleteEducation(id)                    // Remove education record
fetchUserRoles(userId)                 // Get user's roles
fetchJobs(filters?)                    // Get job listings
createJob(data)                        // Create job posting
updateJob(jobId, data)                 // Update job
fetchRecruiterJobs(userId)             // Get recruiter's job posts
fetchMyApplications(userId)            // Get user's applications
updateApplicationStatus(id, status)    // Update application status
fetchCourses()                         // Get all courses
fetchNotifications(userId)             // Get user notifications
globalSearch(query)                    // Search across profiles, jobs, courses
```

### Recruitment API (`src/lib/recruitment-api.ts`)

```typescript
createInternalJob(data)                // Create internal job posting
fetchJobApplicationsWithProfiles(jobId) // Get applications with profile data
createInterviewInvitation(data)        // Send interview invitation
createJobOffer(data)                   // Issue job offer
```

### Mentorship API (`src/lib/mentorship-api.ts`)

```typescript
fetchMentorsWithProfiles()             // Get mentors with profile info
fetchMyMentorshipsDetailed(userId)     // Get user's mentorship mappings
fetchMentorMentees(mentorId)           // Get mentor's mentees
autoMatchMentor(userId)                // AI auto-match mentor for user
```

### Learning API (`src/lib/learning-api.ts`)

```typescript
fetchDiscussions(courseId)             // Get course discussions
verifyCertificate(certNumber)          // Verify certificate authenticity
fetchAllEnrollmentsAdmin()            // Get all enrollments (admin)
```

---

## Appendix B: Pre-Configured Admin Accounts

The system should be seeded with these default admin accounts:

| Role | Email | Purpose |
|---|---|---|
| Super Admin | sadmin@jconnect.admin | Full platform control |
| Citizen DB Admin | citizendb.admin@jconnect.gov.ng | Citizen database management |
| Mentorship Admin | mentorship.admin@jconnect.gov.ng | Mentorship program management |
| Recruitment Admin | recruitment.admin@jconnect.gov.ng | Recruitment system management |
| CBT Admin | cbt.admin@jconnect.gov.ng | CBT examination management |
| Learning Admin | learning.admin@jconnect.gov.ng | E-learning management |

---

## Appendix C: Geographic Data

### LGAs (27)

Auyo, Babura, Biriniwa, Birnin Kudu, Buji, Dutse, Gagarawa, Garki, Gumel, Guri, Gwaram, Gwiwa, Hadejia, Jahun, Kafin Hausa, Kaugama, Kazaure, Kiri Kasama, Kiyawa, Maigatari, Malam Madori, Miga, Ringim, Roni, Sule Tankarkar, Taura, Yankwashi

### Senatorial Zones (3)

| Zone | LGAs |
|---|---|
| Jigawa North-West | Babura, Garki, Gumel, Gagarawa, Kaugama, Maigatari, Sule Tankarkar, Taura, Kazaure, Roni, Gwiwa, Yankwashi |
| Jigawa North-East | Hadejia, Kafin Hausa, Biriniwa, Guri, Kiri Kasama, Auyo, Malam Madori, Jahun |
| Jigawa South | Dutse, Birnin Kudu, Buji, Gwaram, Kiyawa, Miga, Ringim |

---

*End of SRS Document*
