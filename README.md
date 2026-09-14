# J-Connect: Jigawa State Human Capital & Professional Ecosystem Platform

> A Unified Web Platform for the Complete Human Resource and Professional Development Ecosystem of Jigawa State across all 27 LGAs.

[![Render Blueprint](https://img.shields.io/badge/Render-Blueprint%20Ready-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Database](https://img.shields.io/badge/Database-Aiven%20MySQL%208.0-FF4F00?logo=mysql&logoColor=white)](https://aiven.io)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript%205-61DAFB?logo=react&logoColor=black)](https://react.dev)

---

## 1. System Overview

**J-Connect** is a centralized, web-based Human Capital Repository and Professional Development Platform engineered for students, job seekers, working professionals, entrepreneurs, artisans, civil servants, and government administrators across all **27 Local Government Areas (LGAs)** in Jigawa State.

### Major Core Modules

1. **Citizen Database & Profile Management**: Complete digital profiling (demographics, SSCE-to-PhD education, skills, employment records, passport photo, auto-generated ATS CVs).
2. **Advanced Records & Dynamic Reporting**: Filtered human capital querying by LGA, Ward, Senatorial Zone, qualification level, sector, gender, and age with export to CSV/PDF/Excel.
3. **Trailblazer Mentorship System**: AI-powered auto-matching and manual pairing between experienced mentors and mentees, progress tracking, goals, and 1:1/group chatrooms.
4. **Job Directory & Internal ATS Recruitment**: Dual-job directory (external and internal recruitment workflows), applicant screening, scoring rubric, interview pipeline, and CBT exams.
5. **Computer-Based Testing (CBT) Engine**: Timed tests, randomized question banks, auto-grading, and instant cutoff analysis.
6. **E-Learning & Skill Acquisition Platform**: Course management, video lessons, downloadable materials, quizzes, discussion forums, and automated certificate generation with QR code verification.
7. **White-Label & Dynamic Branding**: Real-time government identity customization (system title, logo, primary/secondary palette).

---

## 2. Updated Role Hierarchy & Seed Test Accounts

The platform includes 16 pre-configured stakeholder and citizen accounts. Every account is pre-seeded with the default password:

**Default Password:** `JCONNECT2025`

### 2.1 Super Administrator (System Owner)
*Level: Highest Authority — Full control, policy configuration, module activation, and analytics*
- **Email:** `SUPER.admin@jconnect.gov.ng`
- **Name:** MUHD ABUBAKAR MUHD
- **Role:** `super_admin`

### 2.2 Module Administrators (Sub Admins)
*Created and overseen by Super Admin to manage discrete functional modules*
| Module Admin | Email | Name | Role |
|---|---|---|---|
| **Citizen Database Admin** | `citizendb.admin@jconnect.gov.ng` | Abubakar Musa | `citizen_db_admin` |
| **Mentorship Admin** | `mentorship.admin@jconnect.gov.ng` | Fatima Abdullahi | `mentorship_admin` |
| **Recruitment Admin** | `recruitment.admin@jconnect.gov.ng` | Ibrahim Sani | `recruitment_admin` |
| **CBT Admin** | `cbt.admin@jconnect.gov.ng` | Hauwa Garba | `cbt_admin` |
| **Learning Platform Admin** | `learning.admin@jconnect.gov.ng` | Yusuf Bello | `learning_admin` |

### 2.3 Regional Operational Officers
*Grassroots data collection, LGA registry, and citizen verification*
| Role | Email | Name | Assigned LGA/Ward | Role Code |
|---|---|---|---|---|
| **LGA Officer** | `lga.officer@jconnect.gov.ng` | Amina Danladi | Dutse LGA | `lga_officer` |
| **Ward Data Officer** | `ward.officer@jconnect.gov.ng` | Musa Adamu | Limawa Ward, Dutse | `ward_officer` |

### 2.4 External Stakeholders
| Stakeholder | Email | Name | Capabilities | Role Code |
|---|---|---|---|---|
| **Recruiter / Employer** | `recruiter@jconnect.gov.ng` | Suleiman Jibril | Post jobs, evaluate applicants, interview pipeline, issue offers | `recruiter` |
| **Mentor (Trailblazer)** | `mentor@jconnect.gov.ng` | Zainab Umar | Mentor sessions, chat, group rooms, track mentee goals | `mentor` |
| **Instructor / Trainer** | `instructor@jconnect.gov.ng` | Aliyu Mohammed | Upload courses, create lessons, issue certificates | `instructor` |

### 2.5 General Platform Citizens
| Citizen Persona | Email | Name | Category | User Type |
|---|---|---|---|---|
| **Student** | `student@jconnect.gov.ng` | Ahmad Isah | Student | `student` |
| **Graduate / Job Seeker** | `jobseeker@jconnect.gov.ng` | Halima Bala | Job Seeker | `job_seeker` |
| **Professional** | `professional@jconnect.gov.ng` | Kabiru Aliyu | Working Professional | `professional` |
| **Entrepreneur / Artisan** | `entrepreneur@jconnect.gov.ng` | Rashida Garba | Entrepreneur | `entrepreneur` |
| **Civil Servant** | `civilservant@jconnect.gov.ng` | Nuhu Danjuma | Public Sector Personnel | `civil_servant` |

---

## 3. Technology Stack

- **Backend:** Node.js, Express, `mysql2/promise` (connection pooling & SSL), `jsonwebtoken`, `bcryptjs`, `multer`.
- **Database:** MySQL 8.0+ (Fully compatible with **Aiven Free MySQL** with SSL).
- **Frontend:** React 18, TypeScript 5, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Recharts, Lucide Icons.
- **Storage:** Multipart upload pipeline via `/api/upload/:bucket` saving to persistent uploads.
- **Deployment:** Render Blueprint (`render.yaml`) serving unified API and Vite production SPA.

---

## 4. Connecting Aiven Free MySQL Database

1. Create a free MySQL database on [Aiven](https://aiven.io).
2. Copy the **Service URI** or the individual connection parameters (Host, Port, User, Password, Database).
3. Set your environment variables in `.env` (or in the Render Dashboard):

```env
# Option A: Full Connection URI
MYSQL_URL=mysql://avnadmin:YOUR_PASSWORD@mysql-xxxx-jconnect.a.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED

# Option B: Individual Variables
MYSQL_HOST=mysql-xxxx-jconnect.a.aivencloud.com
MYSQL_PORT=12345
MYSQL_USER=avnadmin
MYSQL_PASSWORD=YOUR_PASSWORD
MYSQL_DATABASE=defaultdb
MYSQL_SSL=true
MYSQL_REJECT_UNAUTHORIZED=false

# App Secret
JWT_SECRET=your_strong_jwt_secret_key_here
```

The server automatically runs `server/schema.sql` and `server/seed.js` on boot if tables are empty, creating all 48 tables and seeding all 16 accounts immediately.

---

## 5. Deployment with Render Blueprint (`render.yaml`)

This repository is pre-configured with a zero-cost Render Blueprint in `render.yaml`.

### Steps to Deploy:
1. Fork or push this repository to GitHub: `https://github.com/Al-Ahotanee/J-CONNECT`.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint**.
3. Connect your repository.
4. Set the `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_PORT`, and `MYSQL_DATABASE` variables when prompted.
5. Click **Apply**. Render will automatically build the frontend, launch the Node server, initialize tables, seed the 16 users, and provide your live HTTPS URL.

---

## 6. Local Development

### 1. Install Dependencies
```bash
npm install
# or
bun install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

### 3. Initialize & Seed Database
```bash
npm run db:init
```

### 4. Start Development Servers
In terminal 1 (Backend API):
```bash
npm run server
```

In terminal 2 (Vite Frontend):
```bash
npm run dev
```

Visit `http://localhost:8080` in your browser.

---

## 7. Change Password Feature

- Authenticated users can change their password at any time by clicking **Change Password** on their profile page (`/profile`).
- If a user forgets their password, they can set a new password on `/reset-password` using their verified account email.

---

## 8. License

Government Enterprise Platform for Jigawa State, Nigeria. All rights reserved.
