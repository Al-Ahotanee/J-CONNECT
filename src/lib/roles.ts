// ==========================================
// ROLE DEFINITIONS & HIERARCHY
// ==========================================

export type AppRole =
  | "super_admin"
  | "admin"
  | "citizen_db_admin"
  | "mentorship_admin"
  | "recruitment_admin"
  | "cbt_admin"
  | "learning_admin"
  | "lga_officer"
  | "ward_officer"
  | "recruiter"
  | "mentor"
  | "instructor"
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
  citizen_db_admin: "Citizen Database Admin",
  mentorship_admin: "Mentorship Admin",
  recruitment_admin: "Recruitment Admin",
  cbt_admin: "CBT Exam Admin",
  learning_admin: "E-Learning Admin",
  lga_officer: "LGA Officer",
  ward_officer: "Ward Data Officer",
  recruiter: "Recruiter / Employer",
  mentor: "Mentor (Trailblazer)",
  instructor: "Instructor / Trainer",
  user: "Citizen",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Full control of the entire J-Connect platform",
  admin: "System-wide administration access",
  citizen_db_admin: "Manage citizen profiles, registrations & bulk uploads",
  mentorship_admin: "Manage mentorship program, approve mentors & sessions",
  recruitment_admin: "Manage recruitment system, approve recruiters & job postings",
  cbt_admin: "Manage CBT examinations, question banks & exam sessions",
  learning_admin: "Manage e-learning platform, approve instructors & courses",
  lga_officer: "Register & manage citizens within assigned LGA",
  ward_officer: "Register citizens & manage data at ward level",
  recruiter: "Post jobs, manage applications & conduct hiring",
  mentor: "Conduct mentoring sessions & track mentee progress",
  instructor: "Upload courses, manage lessons & issue certifications",
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
  "citizen_db_admin",
  "mentorship_admin",
  "recruitment_admin",
  "cbt_admin",
  "learning_admin",
];

// Roles that module admins can create
export const ROLE_CAN_CREATE: Partial<Record<AppRole, AppRole[]>> = {
  super_admin: [
    "admin", "citizen_db_admin", "mentorship_admin", "recruitment_admin",
    "cbt_admin", "learning_admin", "lga_officer", "ward_officer",
    "recruiter", "mentor", "instructor",
  ],
  admin: [
    "citizen_db_admin", "mentorship_admin", "recruitment_admin",
    "cbt_admin", "learning_admin", "lga_officer", "ward_officer",
    "recruiter", "mentor", "instructor",
  ],
  recruitment_admin: ["recruiter"],
  learning_admin: ["instructor"],
  mentorship_admin: ["mentor"],
  citizen_db_admin: ["lga_officer", "ward_officer"],
};

export const ROLE_BADGE_COLORS: Partial<Record<AppRole, string>> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  admin: "bg-accent/50 text-accent-foreground border-accent",
  citizen_db_admin: "bg-primary/10 text-primary border-primary/20",
  mentorship_admin: "bg-secondary/50 text-secondary-foreground border-secondary",
  recruitment_admin: "bg-primary/10 text-primary border-primary/20",
  cbt_admin: "bg-accent/50 text-accent-foreground border-accent",
  learning_admin: "bg-primary/10 text-primary border-primary/20",
  lga_officer: "bg-secondary/50 text-secondary-foreground border-secondary",
  ward_officer: "bg-muted text-muted-foreground border-border",
  recruiter: "bg-primary/10 text-primary border-primary/20",
  mentor: "bg-secondary/50 text-secondary-foreground border-secondary",
  instructor: "bg-accent/50 text-accent-foreground border-accent",
  user: "bg-muted text-muted-foreground border-border",
};

// Check if a user has any of the specified roles
export const hasAnyRole = (userRoles: string[], checkRoles: AppRole[]): boolean => {
  if (userRoles.includes("super_admin")) return true;
  return checkRoles.some((r) => userRoles.includes(r));
};

// Check if user can access admin features
export const canAccessAdmin = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, ["super_admin", "admin", "citizen_db_admin", "mentorship_admin", "recruitment_admin", "cbt_admin", "learning_admin"]);

export const canManageCitizens = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, ["super_admin", "admin", "citizen_db_admin", "lga_officer", "ward_officer"]);

export const canManageJobs = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, ["super_admin", "admin", "recruitment_admin", "recruiter"]);

export const canManageCourses = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, ["super_admin", "admin", "learning_admin", "instructor"]);

export const canManageMentors = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, ["super_admin", "admin", "mentorship_admin"]);

export const canManageCBT = (userRoles: string[]): boolean =>
  hasAnyRole(userRoles, ["super_admin", "admin", "cbt_admin", "recruitment_admin"]);

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
    "super_admin", "admin", "citizen_db_admin", "mentorship_admin",
    "recruitment_admin", "cbt_admin", "learning_admin", "lga_officer",
    "ward_officer", "recruiter", "mentor", "instructor", "user",
  ];
  for (const role of priority) {
    if (userRoles.includes(role)) return role;
  }
  return "user";
};
