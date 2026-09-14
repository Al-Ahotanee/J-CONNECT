import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool, query, checkConnection } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase() {
  console.log('[Seed] Checking database connection...');
  const isConnected = await checkConnection();
  if (!isConnected) {
    console.warn('[Seed] Warning: Database connection is not available. Please verify your MySQL credentials in .env.');
    return;
  }

  console.log('[Seed] Executing schema DDL...');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  
  // Strip multi-line and single-line comments first
  const cleanSql = schemaSql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');

  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await query(statement);
    } catch (err) {
      console.error(`[Seed] Error executing statement: ${statement.slice(0, 80)}... ->`, err.message);
    }
  }
  console.log('[Seed] Schema created successfully.');

  // Check if users already seeded
  const existingUsers = await query('SELECT COUNT(*) as cnt FROM users');
  if (existingUsers?.[0]?.cnt > 0) {
    console.log(`[Seed] Database already contains ${existingUsers[0].cnt} users. Skipping user seeding.`);
    return;
  }

  console.log('[Seed] Seeding 16 role accounts with password JCONNECT2025...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('JCONNECT2025', salt);

  const seedUsers = [
    { email: 'SUPER.admin@jconnect.gov.ng', name: 'MUHD ABUBAKAR MUHD', role: 'super_admin', type: 'professional', lga: 'Dutse', phone: '08012345601' },
    { email: 'citizendb.admin@jconnect.gov.ng', name: 'Abubakar Musa', role: 'citizen_db_admin', type: 'civil_servant', lga: 'Hadejia', phone: '08012345602' },
    { email: 'mentorship.admin@jconnect.gov.ng', name: 'Fatima Abdullahi', role: 'mentorship_admin', type: 'professional', lga: 'Kazaure', phone: '08012345603' },
    { email: 'recruitment.admin@jconnect.gov.ng', name: 'Ibrahim Sani', role: 'recruitment_admin', type: 'professional', lga: 'Gumel', phone: '08012345604' },
    { email: 'cbt.admin@jconnect.gov.ng', name: 'Hauwa Garba', role: 'cbt_admin', type: 'professional', lga: 'Birnin Kudu', phone: '08012345605' },
    { email: 'learning.admin@jconnect.gov.ng', name: 'Yusuf Bello', role: 'learning_admin', type: 'professional', lga: 'Ringim', phone: '08012345606' },
    { email: 'lga.officer@jconnect.gov.ng', name: 'Amina Danladi', role: 'lga_officer', type: 'civil_servant', lga: 'Dutse', phone: '08012345607' },
    { email: 'ward.officer@jconnect.gov.ng', name: 'Musa Adamu', role: 'ward_officer', type: 'civil_servant', lga: 'Dutse', ward: 'Limawa', phone: '08012345608' },
    { email: 'recruiter@jconnect.gov.ng', name: 'Suleiman Jibril', role: 'recruiter', type: 'professional', lga: 'Dutse', phone: '08012345609' },
    { email: 'mentor@jconnect.gov.ng', name: 'Zainab Umar', role: 'mentor', type: 'professional', lga: 'Kazaure', phone: '08012345610' },
    { email: 'instructor@jconnect.gov.ng', name: 'Aliyu Mohammed', role: 'instructor', type: 'professional', lga: 'Hadejia', phone: '08012345611' },
    { email: 'student@jconnect.gov.ng', name: 'Ahmad Isah', role: 'user', type: 'student', lga: 'Kiyawa', phone: '08012345612' },
    { email: 'jobseeker@jconnect.gov.ng', name: 'Halima Bala', role: 'user', type: 'job_seeker', lga: 'Buji', phone: '08012345613' },
    { email: 'professional@jconnect.gov.ng', name: 'Kabiru Aliyu', role: 'user', type: 'professional', lga: 'Gumel', phone: '08012345614' },
    { email: 'entrepreneur@jconnect.gov.ng', name: 'Rashida Garba', role: 'user', type: 'entrepreneur', lga: 'Hadejia', phone: '08012345615' },
    { email: 'civilservant@jconnect.gov.ng', name: 'Nuhu Danjuma', role: 'user', type: 'civil_servant', lga: 'Dutse', phone: '08012345616' },
    // Also include the role-based emails from credentials table
    { email: 'superadmin@jconnect.gov.ng', name: 'Super Administrator', role: 'super_admin', type: 'professional', lga: 'Dutse', phone: '08012345601' },
    { email: 'ministry@jconnect.gov.ng', name: 'Ministry Admin', role: 'ministry_admin', type: 'civil_servant', lga: 'Dutse', phone: '08012345617' },
    { email: 'lga.dutse@jconnect.gov.ng', name: 'Dutse LGA Administrator', role: 'lga_admin', type: 'civil_servant', lga: 'Dutse', phone: '08012345618' },
    { email: 'ward.dutse.central@jconnect.gov.ng', name: 'Dutse Central Ward Officer', role: 'ward_admin', type: 'civil_servant', lga: 'Dutse', ward: 'Central', phone: '08012345619' },
    { email: 'reviewer@jconnect.gov.ng', name: 'Cadre Reviewer', role: 'cadre_reviewer', type: 'civil_servant', lga: 'Dutse', phone: '08012345620' },
    { email: 'assessor@jconnect.gov.ng', name: 'CBT Assessor', role: 'cbt_assessor', type: 'professional', lga: 'Dutse', phone: '08012345621' },
    { email: 'auditor@jconnect.gov.ng', name: 'Audit & Compliance Officer', role: 'audit_compliance', type: 'professional', lga: 'Dutse', phone: '08012345622' },
    { email: 'hr@jconnect.gov.ng', name: 'General Recruiter HR', role: 'recruiter', type: 'professional', lga: 'Dutse', phone: '08012345623' },
    { email: 'psb@jconnect.gov.ng', name: 'Public Service Board Recruiter', role: 'psb_recruiter', type: 'civil_servant', lga: 'Dutse', phone: '08012345624' },
    { email: 'subeb@jconnect.gov.ng', name: 'SUBEB Recruiter', role: 'subeb_recruiter', type: 'civil_servant', lga: 'Dutse', phone: '08012345625' },
    { email: 'creator@jconnect.gov.ng', name: 'Course Creator', role: 'course_creator', type: 'professional', lga: 'Dutse', phone: '08012345626' },
    { email: 'partner@company.ng', name: 'Partner Employer', role: 'employer', type: 'employer', lga: 'Dutse', phone: '08012345627' },
    { email: 'citizen@jconnect.gov.ng', name: 'Citizen Job Seeker', role: 'job_seeker', type: 'job_seeker', lga: 'Dutse', phone: '08012345628' },
    { email: 'member@jconnect.gov.ng', name: 'Community Member', role: 'community_member', type: 'community_member', lga: 'Dutse', phone: '08012345629' },
  ];

  const userIds = {};

  for (const u of seedUsers) {
    const userId = uuidv4();
    userIds[u.email.toLowerCase()] = userId;

    await query(
      'INSERT IGNORE INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, u.email.toLowerCase(), passwordHash]
    );

    await query(
      'INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
      [uuidv4(), userId, u.role]
    );

    await query(
      `INSERT IGNORE INTO profiles 
       (id, user_id, full_name, email, phone, gender, marital_status, lga, ward, state_of_origin, nationality, employment_status, user_type, profile_completion, approval_status, skills, certifications) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        userId,
        u.name,
        u.email.toLowerCase(),
        u.phone,
        u.email.includes('fatima') || u.email.includes('amina') || u.email.includes('hauwa') || u.email.includes('zainab') || u.email.includes('halima') || u.email.includes('rashida') ? 'Female' : 'Male',
        'Single',
        u.lga || 'Dutse',
        u.ward || 'Central',
        'Jigawa',
        'Nigerian',
        u.type === 'job_seeker' ? 'Unemployed' : (u.type === 'student' ? 'Student' : (u.type === 'entrepreneur' ? 'Self-employed' : 'Employed')),
        u.type || 'job_seeker',
        85,
        'approved',
        JSON.stringify(['Management', 'ICT', 'Communication']),
        JSON.stringify(['Civil Service Certificate', 'Digital Skills Certificate'])
      ]
    );
  }

  // Seed Mentor Record for Zainab Umar
  const mentorUserId = userIds['mentor@jconnect.gov.ng'];
  if (mentorUserId) {
    await query(
      `INSERT INTO mentors (id, user_id, category, bio, years_experience, current_mentees, max_mentees, rating, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        mentorUserId,
        'ICT experts',
        'Senior Software Architect and Digital Skills Mentor dedicated to empowering Jigawa youth in technology.',
        8,
        2,
        10,
        4.9,
        true
      ]
    );
  }

  // Seed default branding settings
  await query(
    `INSERT INTO branding_settings (id, system_name, tagline, primary_color, secondary_color)
     VALUES (?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      'J-Connect',
      'Unified Human Capital Repository & Professional Ecosystem of Jigawa State',
      '#0d5c3a',
      '#d4a017'
    ]
  );

  // Seed demo announcements
  const superAdminId = userIds['SUPER.admin@jconnect.gov.ng'];
  await query(
    `INSERT INTO announcements (id, title, content, priority, target_role, created_by, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      'Welcome to J-Connect Jigawa State',
      'Welcome to the unified digital portal for citizen development, recruitment, e-learning, and professional mentorship across all 27 LGAs.',
      'high',
      'all',
      superAdminId,
      true
    ]
  );

  // Seed starter courses
  const instructorId = userIds['instructor@jconnect.gov.ng'];
  if (instructorId) {
    const courseId1 = uuidv4();
    await query(
      `INSERT INTO courses (id, instructor_id, title, description, category, level, duration, is_free, price, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId1,
        instructorId,
        'Web Development & Modern Digital Skills',
        'Comprehensive guide to frontend and backend web development using modern technologies for beginners and job seekers.',
        'ICT',
        'Beginner',
        '8 weeks',
        true,
        0,
        true
      ]
    );

    await query(
      `INSERT INTO lessons (id, course_id, title, content, duration, order_index)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        courseId1,
        'Introduction to the Web and HTML5',
        'In this lesson we cover the basics of the internet, browsers, HTML5 elements, and page structures.',
        '45 mins',
        1
      ]
    );

    const courseId2 = uuidv4();
    await query(
      `INSERT INTO courses (id, instructor_id, title, description, category, level, duration, is_free, price, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId2,
        instructorId,
        'Agribusiness and Supply Chain Management',
        'Learn high-yield agricultural strategies, logistics, and market access specifically tailored for northern agricultural corridors.',
        'Agriculture',
        'Intermediate',
        '6 weeks',
        true,
        0,
        true
      ]
    );
  }

  // Seed starter jobs
  const recruiterId = userIds['recruiter@jconnect.gov.ng'];
  if (recruiterId) {
    await query(
      `INSERT INTO jobs (id, posted_by, title, company, location, lga, sector, employment_type, qualification_required, experience_level, salary_range, skills_required, description, is_internal, is_active, applicants_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        recruiterId,
        'Junior IT Support Specialist',
        'Jigawa State Innovation Hub',
        'Dutse Central',
        'Dutse',
        'ICT',
        'Full-time',
        'B.Sc',
        'Entry Level',
        '₦120,000 - ₦180,000 / month',
        JSON.stringify(['Networking', 'Hardware', 'Linux', 'Troubleshooting']),
        'We are hiring an enthusiastic IT Support Specialist to assist with government digital infrastructure and workstation management in Dutse.',
        true,
        true,
        1
      ]
    );

    await query(
      `INSERT INTO jobs (id, posted_by, title, company, location, lga, sector, employment_type, qualification_required, experience_level, salary_range, skills_required, description, is_internal, is_active, applicants_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        recruiterId,
        'Agricultural Extension Field Officer',
        'Jigawa Ministry of Agriculture',
        'Hadejia Zone',
        'Hadejia',
        'Agriculture',
        'Contract',
        'ND',
        '1-2 years',
        '₦90,000 - ₦140,000 / month',
        JSON.stringify(['Agronomy', 'Field Research', 'Community Outreach', 'Reporting']),
        'Conduct grassroots farmer workshops, modern irrigation technique training, and pest management reporting.',
        true,
        true,
        0
      ]
    );
  }

  console.log('[Seed] Database initialization and seeding completed successfully!');
}

// Allow direct execution: node server/seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  initDatabase()
    .then(() => {
      console.log('[Seed] Finished. Exiting.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Fatal error:', err);
      process.exit(1);
    });
}
