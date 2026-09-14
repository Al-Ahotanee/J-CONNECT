// ==========================================
// ROLE DEFINITIONS & HIERARCHY
// ==========================================

export type AppRole =
  | "super_admin"
  | "admin"
  | "ministry_admin"
  | "lga_admin"
  | "lga_officer"
  | "ward_admin"
  | "ward_officer"
  | "citizen_db_admin"
  | "cadre_reviewer"
  | "cbt_admin"
  | "cbt_assessor"
  | "audit_compliance"
  | "recruitment_admin"
  | "recruiter"
  | "psb_recruiter"
  | "subeb_recruiter"
  | "employer"
  | "learning_admin"
  | "course_creator"
  | "instructor"
  | "mentorship_admin"
  | "mentor"
  | "job_seeker"
  | "community_member"
  | "user";

export type UserType =
  | "student"
  | "job_seeker"
  | "professional"
  | "entrepreneur"
  | "civil_servant";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Administrator",
  admin: "System Admin",
  ministry_admin: "Ministry Admin",
  lga_admin: "LGA Administrator",
  lga_officer: "LGA Officer",
  ward_admin: "Ward Administrator",
  ward_officer: "Ward Officer",
  citizen_db_admin: "Citizen Database Admin",
  cadre_reviewer: "Cadre Reviewer & Verifier",
  cbt_admin: "CBT Exam Admin",
  cbt_assessor: "CBT Assessor",
  audit_compliance: "Audit & Compliance Officer",
  recruitment_admin: "Recruitment Admin",
  recruiter: "Recruiter / Employer",
  psb_recruiter: "Public Service Board Recruiter",
  subeb_recruiter: "SUBEB Recruiter",
  employer: "Partner Employer",
  learning_admin: "E-Learning Admin",
  course_creator: "Course Creator",
  instructor: "Instructor / Trainer",
  mentorship_admin: "Mentorship Admin",
  mentor: "Mentor (Trailblazer)",
  job_seeker: "Job Seeker / Citizen",
  community_member: "Community Member",
  user: "Citizen",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Full control of the entire J-Connect platform",
  admin: "System-wide administration access",
  ministry_admin: "State-level oversight, policy review & ministry reporting",
  lga_admin: "LGA-wide administration and citizen registry management",
  lga_officer: "Register & manage citizens within assigned LGA",
  ward_admin: "Ward-level administration and local community oversight",
  ward_officer: "Register citizens & manage data at ward level",
  citizen_db_admin: "Manage citizen profiles, registrations & bulk uploads",
  cadre_reviewer: "Verify civil service credentials and review cadre placements",
  cbt_admin: "Manage CBT examinations, question banks & exam sessions",
  cbt_assessor: "Grade examinations, review question pools & assess candidates",
  audit_compliance: "Audit platform activity, compliance reports & system integrity",
  recruitment_admin: "Manage recruitment system, approve recruiters & job postings",
  recruiter: "Post jobs, manage applications & conduct hiring",
  psb_recruiter: "Public Service Board recruitment & quota management",
  subeb_recruiter: "SUBEB teacher recruitment & qualifications verification",
  employer: "Private sector employer posting jobs and hiring talent",
  learning_admin: "Manage e-learning platform, approve instructors & courses",
  course_creator: "Design curricula, upload course content & create quizzes",
  instructor: "Upload courses, manage lessons & issue certifications",
  mentorship_admin: "Manage mentorship program, approve mentors & sessions",
  mentor: "Conduct mentoring sessions & track mentee progress",
  job_seeker: "Search & apply for jobs, take CBT tests & build ATS resumes",
  community_member: "Participate in discussions, networking & public forums",
  user: "General platform citizen",
};

export const USER_TYPE_LABELS: Record<UserType, string> = {
  student: "Student",
  job_seeker: "Graduate / Job Seeker",
  professional: "Professional",
  entrepreneur: "Entrepreneur / Artisan",
  civil_servant: "Civil Servant",
};

// Roles that the Super Admin can create
export const MODULE_ADMIN_ROLES: AppRole[] = [
  "ministry_admin",
  "citizen_db_admin",
  "lga_admin",
  "ward_admin",
  "cadre_reviewer",
  "mentorship_admin",
  "recruitment_admin",
  "cbt_admin",
  "cbt_assessor",
  "audit_compliance",
  "learning_admin",
  "psb_recruiter",
  "subeb_recruiter",
  "course_creator",
];

// Roles that module admins can create
export const ROLE_CAN_CREATE: Partial<Record<AppRole, AppRole[]>> = {
  super_admin: [
    "admin", "ministry_admin", "citizen_db_admin", "lga_admin", "ward_admin",
    "cadre_reviewer", "mentorship_admin", "recruitment_admin", "cbt_admin",
    "cbt_assessor", "audit_compliance", "learning_admin", "lga_officer",
    "ward_officer", "recruiter", "psb_recruiter", "subeb_recruiter",
    "employer", "mentor", "instructor", "course_creator",
  ],
  admin: [
    "citizen_db_admin", "lga_admin", "ward_admin", "cadre_reviewer",
    "mentorship_admin", "recruitment_admin", "cbt_admin", "cbt_assessor",
    "audit_compliance", "learning_admin", "lga_officer", "ward_officer",
    "recruiter", "psb_recruiter", "subeb_recruiter", "employer",
    "mentor", "instructor", "course_creator",
  ],
  recruitment_admin: ["recruiter", "psb_recruiter", "subeb_recruiter", "employer"],
  learning_admin: ["instructor", "course_creator"],
  mentorship_admin: ["mentor"],
  citizen_db_admin: ["lga_officer", "ward_officer", "cadre_reviewer"],
  lga_admin: ["lga_officer", "ward_admin", "ward_officer"],
  ward_admin: ["ward_officer"],
};

export const ROLE_BADGE_COLORS: Partial<Record<AppRole, string>> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  admin: "bg-accent/50 text-accent-foreground border-accent",
  ministry_admin: "bg-primary/20 text-primary border-primary/30",
  lga_admin: "bg-secondary/50 text-secondary-foreground border-secondary",
  ward_admin: "bg-muted text-muted-foreground border-border",
  citizen_db_admin: "bg-primary/10 text-primary border-primary/20",
  cadre_reviewer: "bg-accent/40 text-accent-foreground border-accent/60",
  mentorship_admin: "bg-secondary/50 text-secondary-foreground border-secondary",
  recruitment_admin: "bg-primary/10 text-primary border-primary/20",
  cbt_admin: "bg-accent/50 text-accent-foreground border-accent",
  cbt_assessor: "bg-accent/30 text-accent-foreground border-accent/40",
  audit_compliance: "bg-destructive/10 text-destructive border-destructive/20",
  learning_admin: "bg-primary/10 text-primary border-primary/20",
  course_creator: "bg-accent/40 text-accent-foreground border-accent",
  lga_officer: "bg-secondary/50 text-secondary-foreground border-secondary",
  ward_officer: "bg-muted text-muted-foreground border-border",
  recruiter: "bg-primary/10 text-primary border-primary/20",
  psb_recruiter: "bg-primary/15 text-primary border-primary/30",
  subeb_recruiter: "bg-primary/15 text-primary border-primary/30",
  employer: "bg-secondary/40 text-secondary-foreground border-secondary",
  mentor: "bg-secondary/50 text-secondary-foreground border-secondary",
  instructor: "bg-accent/50 text-accent-foreground border-accent",
  job_seeker: "bg-primary/10 text-primary border-primary/20",
  community_member: "bg-muted text-muted-foreground border-border",
  user: "bg-muted text-muted-foreground border-border",
};

// Check if a user has any of the specified roles
export const hasAnyRole = (userRoles: string[], checkRoles: AppRole[]): boolean => {
  if (userRoles.includes("super_admin")) return true;
  return checkRoles.some((r) => userRoles.includes(r));
};

// Check if user can access admin features
export const canAccessAdmin = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, [
    "super_admin", "admin", "ministry_admin", "citizen_db_admin",
    "mentorship_admin", "recruitment_admin", "cbt_admin", "cbt_assessor",
    "audit_compliance", "learning_admin", "lga_admin"
  ]);

export const canManageCitizens = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, [
    "super_admin", "admin", "ministry_admin", "citizen_db_admin",
    "cadre_reviewer", "lga_admin", "lga_officer", "ward_admin", "ward_officer"
  ]);

export const canManageJobs = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, [
    "super_admin", "admin", "recruitment_admin", "recruiter",
    "psb_recruiter", "subeb_recruiter", "employer"
  ]);

export const canManageCourses = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, [
    "super_admin", "admin", "learning_admin", "instructor", "course_creator"
  ]);

export const canManageMentors = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, [
    "super_admin", "admin", "mentorship_admin", "mentor"
  ]);

export const canManageCBT = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, [
    "super_admin", "admin", "cbt_admin", "cbt_assessor", "recruitment_admin"
  ]);

export const canAccessAudit = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, [
    "super_admin", "admin", "audit_compliance", "ministry_admin"
  ]);

export const canAssignRoles = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, ["super_admin", "admin"]);

export const getAssignableRoles = (userRoles: string[]): AppRole[] => {
  const assignable = new Set<AppRole>();
  for (const role of userRoles) {
    const canCreate = ROLE_CAN_CREATE[role as AppRole];
    if (canCreate) canCreate.forEach((r) => assignable.add(r));
  }
  return Array.from(assignable);
};

export const getHighestRole = (userRoles: string[]): AppRole => {
  const priority: AppRole[] = [
    "super_admin", "admin", "ministry_admin", "audit_compliance",
    "citizen_db_admin", "cadre_reviewer", "recruitment_admin",
    "cbt_admin", "cbt_assessor", "learning_admin", "mentorship_admin",
    "lga_admin", "lga_officer", "ward_admin", "ward_officer",
    "psb_recruiter", "subeb_recruiter", "recruiter", "employer",
    "course_creator", "instructor", "mentor", "job_seeker", "community_member", "user",
  ];
  for (const role of priority) {
    if (userRoles.includes(role)) return role;
  }
  return "user";
};
