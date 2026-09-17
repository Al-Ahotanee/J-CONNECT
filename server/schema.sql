-- ======================================================================
-- J-CONNECT FULL MYSQL DATABASE SCHEMA
-- Compatible with Aiven Free MySQL 8.0+
-- ======================================================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  reset_token VARCHAR(255) NULL,
  reset_token_expiry DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_role (user_id, role),
  INDEX idx_user_roles_user (user_id),
  INDEX idx_user_roles_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  gender VARCHAR(20),
  date_of_birth DATE NULL,
  marital_status VARCHAR(50),
  nationality VARCHAR(100) DEFAULT 'Nigerian',
  state_of_origin VARCHAR(100) DEFAULT 'Jigawa',
  lga VARCHAR(100),
  ward VARCHAR(100),
  village VARCHAR(100),
  residential_address TEXT,
  passport_photo_url TEXT,
  nin VARCHAR(50),
  employment_status VARCHAR(50),
  current_employer VARCHAR(255),
  job_title VARCHAR(255),
  sector VARCHAR(100),
  work_experience TEXT,
  skills JSON,
  certifications JSON,
  cv_file_url TEXT,
  profile_completion INT DEFAULT 0,
  approval_status VARCHAR(50) DEFAULT 'pending',
  user_type VARCHAR(50) DEFAULT 'job_seeker',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_profiles_lga (lga),
  INDEX idx_profiles_sector (sector),
  INDEX idx_profiles_employment (employment_status),
  INDEX idx_profiles_approval (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS education (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  qualification_type VARCHAR(100) NOT NULL,
  field_of_study VARCHAR(255),
  year_of_graduation VARCHAR(20),
  grade VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_education_user (user_id),
  INDEX idx_education_qual (qualification_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(36) PRIMARY KEY,
  posted_by VARCHAR(36),
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  lga VARCHAR(100),
  sector VARCHAR(100),
  employment_type VARCHAR(50) DEFAULT 'Full-time',
  qualification_required VARCHAR(100),
  experience_level VARCHAR(100),
  salary_range VARCHAR(100),
  skills_required JSON,
  description TEXT NOT NULL,
  external_url TEXT,
  is_internal BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  applicants_count INT DEFAULT 0,
  deadline DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jobs_active (is_active),
  INDEX idx_jobs_lga (lga),
  INDEX idx_jobs_sector (sector),
  INDEX idx_jobs_posted (posted_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_applications (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  cover_letter TEXT,
  resume_url TEXT,
  documents JSON,
  screening_answers JSON,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_job (job_id),
  INDEX idx_app_user (user_id),
  INDEX idx_app_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_offers (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  application_id VARCHAR(36),
  user_id VARCHAR(36) NOT NULL,
  recruiter_id VARCHAR(36) NOT NULL,
  offer_details TEXT,
  salary_offered VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  INDEX idx_offers_user (user_id),
  INDEX idx_offers_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS interview_invitations (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  application_id VARCHAR(36),
  user_id VARCHAR(36) NOT NULL,
  recruiter_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) DEFAULT 'in-person',
  scheduled_at DATETIME NULL,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_interviews_user (user_id),
  INDEX idx_interviews_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidate_scores (
  id VARCHAR(36) PRIMARY KEY,
  application_id VARCHAR(36) NOT NULL,
  recruiter_id VARCHAR(36) NOT NULL,
  technical_score INT DEFAULT 0,
  communication_score INT DEFAULT 0,
  experience_score INT DEFAULT 0,
  cultural_fit_score INT DEFAULT 0,
  total_score INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scores_app (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pipeline_history (
  id VARCHAR(36) PRIMARY KEY,
  application_id VARCHAR(36) NOT NULL,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(36) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pipeline_app (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_candidates (
  id VARCHAR(36) PRIMARY KEY,
  recruiter_id VARCHAR(36) NOT NULL,
  candidate_id VARCHAR(36) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recruiter_candidate (recruiter_id, candidate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  description TEXT,
  industry VARCHAR(100),
  location VARCHAR(255),
  website VARCHAR(255),
  size VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_reviews (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  rating INT DEFAULT 5,
  title VARCHAR(255),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mentors (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL,
  bio TEXT,
  years_experience INT DEFAULT 0,
  current_mentees INT DEFAULT 0,
  max_mentees INT DEFAULT 5,
  rating DECIMAL(3,2) DEFAULT 5.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mentors_category (category),
  INDEX idx_mentors_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mentorship_mappings (
  id VARCHAR(36) PRIMARY KEY,
  mentor_id VARCHAR(36) NOT NULL,
  mentee_id VARCHAR(36) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  auto_matched BOOLEAN DEFAULT FALSE,
  match_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mm_mentor (mentor_id),
  INDEX idx_mm_mentee (mentee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mentorship_sessions (
  id VARCHAR(36) PRIMARY KEY,
  mapping_id VARCHAR(36) NOT NULL,
  mentor_id VARCHAR(36) NOT NULL,
  mentee_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  notes TEXT,
  session_type VARCHAR(50) DEFAULT 'virtual',
  scheduled_at DATETIME NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ms_mapping (mapping_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mentorship_goals (
  id VARCHAR(36) PRIMARY KEY,
  mapping_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_date DATE NULL,
  status VARCHAR(50) DEFAULT 'pending',
  completed_at DATETIME NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mg_mapping (mapping_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mentorship_listings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  listing_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mentorship_requests (
  id VARCHAR(36) PRIMARY KEY,
  from_user_id VARCHAR(36) NOT NULL,
  to_user_id VARCHAR(36) NOT NULL,
  listing_id VARCHAR(36),
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mentor_ratings (
  id VARCHAR(36) PRIMARY KEY,
  mentor_id VARCHAR(36) NOT NULL,
  mentee_id VARCHAR(36) NOT NULL,
  mapping_id VARCHAR(36),
  rating INT NOT NULL,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(36) PRIMARY KEY,
  instructor_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  level VARCHAR(50) DEFAULT 'Beginner',
  duration VARCHAR(50),
  is_free BOOLEAN DEFAULT TRUE,
  price DECIMAL(10,2) DEFAULT 0.00,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_courses_published (is_published),
  INDEX idx_courses_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lessons (
  id VARCHAR(36) PRIMARY KEY,
  course_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  video_url TEXT,
  duration VARCHAR(50),
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lessons_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_materials (
  id VARCHAR(36) PRIMARY KEY,
  course_id VARCHAR(36) NOT NULL,
  lesson_id VARCHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size INT DEFAULT 0,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_materials_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  UNIQUE KEY uq_user_course (user_id, course_id),
  INDEX idx_enrollments_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_completions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  lesson_id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_lesson (user_id, lesson_id),
  INDEX idx_lc_user_course (user_id, course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS certificates (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  enrollment_id VARCHAR(36),
  certificate_number VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'issued',
  issued_by VARCHAR(255) DEFAULT 'Jigawa State Human Capital Development',
  qr_verification_url TEXT,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cert_user (user_id),
  INDEX idx_cert_number (certificate_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quizzes (
  id VARCHAR(36) PRIMARY KEY,
  course_id VARCHAR(36) NULL,
  job_id VARCHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  pass_score INT DEFAULT 70,
  time_limit_minutes INT DEFAULT 30,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_quizzes_course (course_id),
  INDEX idx_quizzes_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id VARCHAR(36) PRIMARY KEY,
  quiz_id VARCHAR(36) NOT NULL,
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_answer INT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_qq_quiz (quiz_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW quiz_questions_public AS
SELECT id, quiz_id, question, options, order_index, created_at
FROM quiz_questions;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id VARCHAR(36) PRIMARY KEY,
  quiz_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  answers JSON,
  score DECIMAL(5,2) DEFAULT 0.00,
  passed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_qa_quiz_user (quiz_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discussion_posts (
  id VARCHAR(36) PRIMARY KEY,
  course_id VARCHAR(36) NOT NULL,
  lesson_id VARCHAR(36) NULL,
  user_id VARCHAR(36) NOT NULL,
  parent_id VARCHAR(36) NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dp_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_chatrooms (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  topic VARCHAR(100) NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  mentor_id VARCHAR(36) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatroom_members (
  id VARCHAR(36) PRIMARY KEY,
  chatroom_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_room_user (chatroom_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatroom_messages (
  id VARCHAR(36) PRIMARY KEY,
  chatroom_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT NULL,
  file_name VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cm_room (chatroom_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY,
  sender_id VARCHAR(36) NOT NULL,
  receiver_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT NULL,
  file_name VARCHAR(255) NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_msg_pair (sender_id, receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  link TEXT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'normal',
  target_role VARCHAR(50) NULL,
  target_lga VARCHAR(100) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ann_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS video_meetings (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  room_name VARCHAR(255) NOT NULL UNIQUE,
  meeting_type VARCHAR(50) DEFAULT 'general',
  related_id VARCHAR(36) NULL,
  created_by VARCHAR(36) NOT NULL,
  participants JSON,
  scheduled_at DATETIME NULL,
  status VARCHAR(50) DEFAULT 'active',
  ended_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skill_endorsements (
  id VARCHAR(36) PRIMARY KEY,
  endorser_id VARCHAR(36) NOT NULL,
  endorsee_id VARCHAR(36) NOT NULL,
  skill VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_se_endorsee (endorsee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolio_items (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  project_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_portfolio_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_posts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  group_id VARCHAR(36) NULL,
  content TEXT NOT NULL,
  media_urls JSON,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sp_user (user_id),
  INDEX idx_sp_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_reactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  post_id VARCHAR(36) NOT NULL,
  reaction_type VARCHAR(50) DEFAULT 'like',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_post_reaction (user_id, post_id, reaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_comments (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  post_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sc_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_groups (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by VARCHAR(36) NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_group_members (
  id VARCHAR(36) PRIMARY KEY,
  group_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_group_user (group_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_follows (
  id VARCHAR(36) PRIMARY KEY,
  follower_id VARCHAR(36) NOT NULL,
  following_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_follow (follower_id, following_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_feed (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(36),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approval_workflows (
  id VARCHAR(36) PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  submitted_by VARCHAR(36) NOT NULL,
  reviewer_id VARCHAR(36) NULL,
  reviewed_by VARCHAR(36) NULL,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_aw_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(36),
  old_data JSON,
  new_data JSON,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branding_settings (
  id VARCHAR(36) PRIMARY KEY,
  system_name VARCHAR(255) DEFAULT 'J-Connect',
  tagline VARCHAR(255) DEFAULT 'Jigawa State Human Capital Development Platform',
  logo_url TEXT,
  primary_color VARCHAR(50) DEFAULT '#0d5c3a',
  secondary_color VARCHAR(50) DEFAULT '#d4a017',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
