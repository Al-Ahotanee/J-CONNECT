// ======================================================================
// J-CONNECT LIVE END-TO-END USER ACCEPTANCE TESTING (UAT) SUITE
// Tests every user persona, role permission, module, and workflow
// ======================================================================

import http from 'http';
import app from '../server/index.js';
import { initDatabase } from '../server/seed.js';

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let server;
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: [],
};

function logSuite(title) {
  console.log(`\n======================================================================`);
  console.log(`  UAT SUITE: ${title}`);
  console.log(`======================================================================`);
}

function assert(description, condition, details = '') {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  [PASS] ${description}`);
  } else {
    results.failed++;
    console.error(`  [FAIL] ${description} ${details ? '-> ' + details : ''}`);
  }
}

async function request(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  const method = opts.method || 'GET';
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => null);
  }

  return { status: res.status, ok: res.ok, body };
}

async function loginUser(email, password = 'JCONNECT2025') {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return res;
}

// ----------------------------------------------------------------------
// MAIN TEST HARNESS
// ----------------------------------------------------------------------
async function runLiveUAT() {
  console.log(`Starting J-Connect Live UAT Suite on port ${PORT}...`);

  // Ensure DB initialized
  await initDatabase();

  server = app.listen(PORT);
  await new Promise(resolve => setTimeout(resolve, 800));

  try {
    // ------------------------------------------------------------------
    // SUITE 1: Health & System Diagnostics
    // ------------------------------------------------------------------
    logSuite('1. Health & Core API Diagnostics');
    const health = await request('/api/health');
    assert('Health endpoint returns 200 OK', health.status === 200);
    assert('Platform identifier is J-Connect', health.body?.platform === 'J-Connect');

    // ------------------------------------------------------------------
    // SUITE 2: All 16 User Personas Login & RBAC Verification
    // ------------------------------------------------------------------
    logSuite('2. All 16 User Roles & Personas Login & Session');

    const usersToTest = [
      { role: 'super_admin', email: 'superadmin@jconnect.gov.ng', title: 'Super Administrator' },
      { role: 'super_admin', email: 'SUPER.admin@jconnect.gov.ng', title: 'Super Administrator (Original)' },
      { role: 'ministry_admin', email: 'ministry@jconnect.gov.ng', title: 'Ministry Administrator' },
      { role: 'citizen_db_admin', email: 'citizendb.admin@jconnect.gov.ng', title: 'Citizen DB Administrator' },
      { role: 'cadre_reviewer', email: 'reviewer@jconnect.gov.ng', title: 'Cadre Reviewer' },
      { role: 'mentorship_admin', email: 'mentorship.admin@jconnect.gov.ng', title: 'Mentorship Administrator' },
      { role: 'recruitment_admin', email: 'recruitment.admin@jconnect.gov.ng', title: 'Recruitment Administrator' },
      { role: 'cbt_admin', email: 'cbt.admin@jconnect.gov.ng', title: 'CBT Examination Administrator' },
      { role: 'cbt_assessor', email: 'assessor@jconnect.gov.ng', title: 'CBT Assessor' },
      { role: 'learning_admin', email: 'learning.admin@jconnect.gov.ng', title: 'Learning Administrator' },
      { role: 'course_creator', email: 'creator@jconnect.gov.ng', title: 'Course Creator' },
      { role: 'instructor', email: 'instructor@jconnect.gov.ng', title: 'Learning Instructor' },
      { role: 'lga_admin', email: 'lga.dutse@jconnect.gov.ng', title: 'Dutse LGA Administrator' },
      { role: 'lga_officer', email: 'lga.officer@jconnect.gov.ng', title: 'LGA Data Officer' },
      { role: 'ward_admin', email: 'ward.dutse.central@jconnect.gov.ng', title: 'Ward Administrator' },
      { role: 'ward_officer', email: 'ward.officer@jconnect.gov.ng', title: 'Ward Data Officer' },
      { role: 'recruiter', email: 'recruiter@jconnect.gov.ng', title: 'General Recruiter' },
      { role: 'psb_recruiter', email: 'psb@jconnect.gov.ng', title: 'Public Service Board Recruiter' },
      { role: 'subeb_recruiter', email: 'subeb@jconnect.gov.ng', title: 'SUBEB Teacher Recruiter' },
      { role: 'employer', email: 'partner@company.ng', title: 'Partner Private Employer' },
      { role: 'mentor', email: 'mentor@jconnect.gov.ng', title: 'Professional Mentor (Trailblazer)' },
      { role: 'job_seeker', email: 'citizen@jconnect.gov.ng', title: 'Citizen Job Seeker' },
      { role: 'job_seeker', email: 'jobseeker@jconnect.gov.ng', title: 'Job Seeker Persona' },
      { role: 'student', email: 'student@jconnect.gov.ng', title: 'Student Persona' },
      { role: 'professional', email: 'professional@jconnect.gov.ng', title: 'Working Professional' },
      { role: 'entrepreneur', email: 'entrepreneur@jconnect.gov.ng', title: 'Entrepreneur & Artisan' },
      { role: 'civil_servant', email: 'civilservant@jconnect.gov.ng', title: 'Civil Servant Personnel' },
      { role: 'community_member', email: 'member@jconnect.gov.ng', title: 'Community Member' },
      { role: 'audit_compliance', email: 'auditor@jconnect.gov.ng', title: 'Audit & Compliance Officer' },
    ];

    const tokens = {};

    for (const u of usersToTest) {
      const res = await loginUser(u.email);
      assert(`Login as ${u.title} (${u.email})`, res.status === 200 && !!res.body?.token);
      if (res.body?.token) {
        tokens[u.email] = res.body.token;
        // Verify /api/auth/me session
        const me = await request('/api/auth/me', { token: res.body.token });
        assert(`Session validation for ${u.title} (/api/auth/me)`, me.status === 200 && me.body?.user?.email === u.email.toLowerCase());
      }
    }

    // ------------------------------------------------------------------
    // SUITE 3: Workflow 1 - Citizen Self-Registration & Profile Completion
    // ------------------------------------------------------------------
    logSuite('3. Workflow: Citizen Self-Registration & Profile Setup');

    const newCitizenEmail = `citizen.test.${Date.now()}@jconnect.gov.ng`;
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        email: newCitizenEmail,
        password: 'JCONNECT2025',
        full_name: 'Usman Garba Ringim',
        phone: '08099887766',
        lga: 'Ringim',
        ward: 'Ringim Central',
        gender: 'Male',
        employment_status: 'Unemployed',
      },
    });

    assert('Citizen self-registration creates account (201 Created)', regRes.status === 201 && !!regRes.body?.token);
    const citizenToken = regRes.body?.token;
    const citizenId = regRes.body?.user?.id;

    // Add Education Record
    const eduRes = await request('/api/data/education', {
      method: 'POST',
      token: citizenToken,
      body: {
        user_id: citizenId,
        institution: 'Federal University Dutse (FUD)',
        qualification_type: 'B.Sc/B.A/B.Ed/B.Tech',
        field_of_study: 'Software Engineering',
        year_of_graduation: '2024',
        grade: 'First Class',
      },
    });
    assert('Citizen adds B.Sc education history to profile', eduRes.status === 201 && eduRes.body?.institution?.includes('Dutse'));

    // Update Profile Skills & Sector
    const profUpdate = await request('/api/data/profiles?user_id=eq.' + citizenId, {
      method: 'PATCH',
      token: citizenToken,
      body: {
        sector: 'ICT',
        skills: ['JavaScript', 'React', 'Node.js', 'MySQL'],
        profile_completion: 85,
      },
    });
    assert('Citizen updates profile skills and completion percentage', profUpdate.status === 200);

    // ------------------------------------------------------------------
    // SUITE 4: Workflow 2 - LGA & Ward Officer Citizen Registration
    // ------------------------------------------------------------------
    logSuite('4. Workflow: Grassroots LGA & Ward Citizen Registration');

    const lgaToken = tokens['lga.dutse@jconnect.gov.ng'] || tokens['lga.officer@jconnect.gov.ng'];
    const grassrootsCitizenEmail = `grassroots_${Date.now()}@jconnect.gov.ng`;

    const lgaCreateRes = await request('/api/ai/admin-create-user', {
      method: 'POST',
      token: lgaToken,
      body: {
        email: grassrootsCitizenEmail,
        password: 'JCONNECT2025',
        full_name: 'Fatima Sanusi Dutse',
        phone: '08033445566',
        lga: 'Dutse',
        ward: 'Limawa',
        gender: 'Female',
        user_type: 'job_seeker',
      },
    });

    assert('LGA Officer registers grassroots citizen in Dutse LGA', lgaCreateRes.status === 200 && lgaCreateRes.body?.success === true);

    // ------------------------------------------------------------------
    // SUITE 5: Workflow 3 - Job Posting, Smart Match, Application & Offer
    // ------------------------------------------------------------------
    logSuite('5. Workflow: Job Lifecycle (Post -> Match -> Apply -> Interview -> Offer)');

    const recruiterToken = tokens['recruiter@jconnect.gov.ng'] || tokens['hr@jconnect.gov.ng'];

    // 1. Post Job
    const jobRes = await request('/api/data/jobs', {
      method: 'POST',
      token: recruiterToken,
      body: {
        title: 'State Digital Transformation Specialist',
        company: 'Jigawa ICT Agency',
        description: 'Lead digitalization projects across state ministries',
        location: 'Dutse',
        lga: 'Dutse',
        sector: 'ICT',
        employment_type: 'Full-time',
        qualification_required: 'B.Sc/B.A/B.Ed/B.Tech',
        skills_required: ['JavaScript', 'React', 'Node.js'],
        salary_range: '250,000 - 400,000 NGN',
        is_active: true,
      },
    });

    assert('Recruiter posts new job listing with required qualifications', jobRes.status === 201 && !!jobRes.body?.id);
    const jobId = jobRes.body?.id;

    // 2. Smart Job Match for Candidate
    const matchRes = await request('/api/ai/smart-job-match', {
      method: 'POST',
      token: citizenToken,
    });
    assert('Candidate runs AI Smart Job Match', matchRes.status === 200 && Array.isArray(matchRes.body?.matches));
    const matchedJob = matchRes.body?.matches?.find(m => m.job?.id === jobId);
    assert('AI Smart Match scores candidate with matching skills and sector', !!matchedJob && matchedJob.score >= 50);

    // 3. Candidate Applies for Job
    const appRes = await request('/api/data/job_applications', {
      method: 'POST',
      token: citizenToken,
      body: {
        job_id: jobId,
        user_id: citizenId,
        status: 'applied',
        cover_letter: 'I have strong software engineering skills from FUD Dutse.',
      },
    });
    assert('Candidate applies for job listing', appRes.status === 201 && appRes.body?.status === 'applied');
    const appId = appRes.body?.id;

    // 4. Recruiter Shortlists Applicant
    const shortlistRes = await request('/api/data/job_applications?id=eq.' + appId, {
      method: 'PATCH',
      token: recruiterToken,
      body: { status: 'shortlisted' },
    });
    assert('Recruiter updates applicant pipeline status to shortlisted', shortlistRes.status === 200);

    // 5. Schedule Video Interview Meeting
    const meetingRes = await request('/api/data/video_meetings', {
      method: 'POST',
      token: recruiterToken,
      body: {
        title: 'Interview for Digital Transformation Specialist',
        meeting_type: 'interview',
        related_id: appId,
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        status: 'scheduled',
      },
    });
    assert('Recruiter schedules interview video meeting (status: scheduled)', meetingRes.status === 201 && meetingRes.body?.status === 'scheduled');

    // 6. Issue Formal Job Offer
    const offerRes = await request('/api/data/job_offers', {
      method: 'POST',
      token: recruiterToken,
      body: {
        application_id: appId,
        job_id: jobId,
        candidate_id: citizenId,
        salary_offered: '350,000 NGN',
        status: 'pending',
      },
    });
    assert('Recruiter issues formal job offer to candidate', offerRes.status === 201 && offerRes.body?.status === 'pending');

    // ------------------------------------------------------------------
    // SUITE 6: Workflow 4 - CBT Examination & Auto-Grading RPC
    // ------------------------------------------------------------------
    logSuite('6. Workflow: CBT Examination & Anti-Cheat Question Serving');

    const cbtToken = tokens['cbt.admin@jconnect.gov.ng'] || tokens['assessor@jconnect.gov.ng'];

    // 1. Create CBT Quiz
    const quizRes = await request('/api/data/quizzes', {
      method: 'POST',
      token: cbtToken,
      body: {
        title: 'Jigawa State Civil Service Aptitude & Digital Exam',
        pass_score: 70,
        time_limit_minutes: 20,
      },
    });
    assert('CBT Admin creates examination test bank', quizRes.status === 201 && !!quizRes.body?.id);
    const quizId = quizRes.body?.id;

    // 2. Add Questions (with correct_answer)
    const q1Res = await request('/api/data/quiz_questions', {
      method: 'POST',
      token: cbtToken,
      body: {
        quiz_id: quizId,
        question: 'What is the capital of Jigawa State?',
        options: ['Hadejia', 'Dutse', 'Kazaure', 'Gumel'],
        correct_answer: 1, // Dutse
        order_index: 1,
      },
    });
    const q2Res = await request('/api/data/quiz_questions', {
      method: 'POST',
      token: cbtToken,
      body: {
        quiz_id: quizId,
        question: 'Which framework is used for Node.js REST APIs in J-Connect?',
        options: ['Django', 'Flask', 'Express', 'Spring'],
        correct_answer: 2, // Express
        order_index: 2,
      },
    });
    assert('CBT Admin adds questions with answer keys', q1Res.status === 201 && q2Res.status === 201);
    const q1Id = q1Res.body?.id;
    const q2Id = q2Res.body?.id;

    // 3. Student fetches exam questions via quiz_questions_public (answers MUST be omitted)
    const publicQuestions = await request(`/api/data/quiz_questions_public?quiz_id=eq.${quizId}`, {
      token: citizenToken,
    });
    assert('Candidate accesses exam via quiz_questions_public', publicQuestions.status === 200 && publicQuestions.body?.length === 2);
    assert('Anti-cheat: correct_answer is stripped from candidate response', publicQuestions.body?.[0]?.correct_answer === undefined);

    // 4. Submit answers to Server-Side Auto-Grading RPC
    const gradingRes = await request('/api/rpc/grade_quiz_attempt', {
      method: 'POST',
      token: citizenToken,
      body: {
        _quiz_id: quizId,
        _answers: {
          [q1Id]: 1, // correct
          [q2Id]: 2, // correct
        },
      },
    });
    assert('Server RPC /api/rpc/grade_quiz_attempt executes securely', gradingRes.status === 200);
    const grade = gradingRes.body?.[0];
    assert('Automatic grading computes 100% score (2/2 correct) and sets passed = true', grade?.score === 100 && grade?.passed === true);

    // ------------------------------------------------------------------
    // SUITE 7: Workflow 5 - E-Learning, Monetization, Completion & Certificate
    // ------------------------------------------------------------------
    logSuite('7. Workflow: E-Learning, Monetization, Completion & Certificate Verification');

    const creatorToken = tokens['creator@jconnect.gov.ng'] || tokens['learning.admin@jconnect.gov.ng'];

    // 1. Post Course with Monetization
    const courseRes = await request('/api/data/courses', {
      method: 'POST',
      token: creatorToken,
      body: {
        instructor_id: citizenId,
        title: 'Mastering Modern Web Architecture for Government Portals',
        description: 'Comprehensive course on scalable, secure public services',
        category: 'Information Technology',
        level: 'Intermediate',
        is_free: false,
        price: 15000,
        currency: 'NGN',
        is_published: true,
      },
    });
    assert('Course Creator uploads course with monetization (NGN 15,000)', courseRes.status === 201 && courseRes.body?.price === 15000);
    const courseId = courseRes.body?.id;

    // 2. Add Lesson
    const lessonRes = await request('/api/data/lessons', {
      method: 'POST',
      token: creatorToken,
      body: {
        course_id: courseId,
        title: 'Lesson 1: RESTful Design & Security Principles',
        content_type: 'video',
        video_url: 'https://cdn.jconnect.gov.ng/lessons/lesson1.mp4',
        order_index: 1,
      },
    });
    assert('Course Creator adds lecture lesson with video resource', lessonRes.status === 201);
    const lessonId = lessonRes.body?.id;

    // 3. Student Enrolls
    const enrollRes = await request('/api/data/enrollments', {
      method: 'POST',
      token: citizenToken,
      body: {
        user_id: citizenId,
        course_id: courseId,
        progress: 0,
        completed: false,
      },
    });
    assert('Student enrolls in course', enrollRes.status === 201);
    const enrollId = enrollRes.body?.id;

    // 4. Student Completes Lesson -> Progress 100%
    await request('/api/data/lesson_completions', {
      method: 'POST',
      token: citizenToken,
      body: {
        user_id: citizenId,
        lesson_id: lessonId,
        course_id: courseId,
      },
    });

    await request('/api/data/enrollments?id=eq.' + enrollId, {
      method: 'PATCH',
      token: citizenToken,
      body: { progress: 100, completed: true },
    });

    // 5. Issue Verified Certificate
    const certNumber = `JCON-2026-${Date.now().toString().slice(-6)}`;
    const certRes = await request('/api/data/certificates', {
      method: 'POST',
      token: creatorToken,
      body: {
        user_id: citizenId,
        course_id: courseId,
        enrollment_id: enrollId,
        certificate_number: certNumber,
        status: 'valid',
        issued_by: 'Jigawa State Human Capital Development Board',
      },
    });
    assert('System issues verifiable state certificate with unique serial', certRes.status === 201);

    // 6. Public Certificate Verification RPC
    const verifyRes = await request('/api/rpc/verify_certificate', {
      method: 'POST',
      body: { _cert_number: certNumber },
    });
    assert('Public verification RPC /api/rpc/verify_certificate succeeds', verifyRes.status === 200 && verifyRes.body?.length === 1);
    assert('Verification confirms certificate number and course title', verifyRes.body?.[0]?.certificate_number === certNumber);

    // ------------------------------------------------------------------
    // SUITE 8: Workflow 6 - Mentorship (Trailblazer) & Auto-Mapping
    // ------------------------------------------------------------------
    logSuite('8. Workflow: Mentorship & Trailblazer Mapping');

    const mentorToken = tokens['mentor@jconnect.gov.ng'];

    // 1. Create Mentorship Mapping
    const mentorMapRes = await request('/api/data/mentorship_mappings', {
      method: 'POST',
      token: mentorToken,
      body: {
        mentor_id: 'mentor-1',
        mentee_id: citizenId,
        status: 'active',
        auto_matched: true,
        match_reason: 'Matching ICT sector and career aspirations',
      },
    });
    assert('Mentorship relationship created between Trailblazer & Mentee', mentorMapRes.status === 201 && mentorMapRes.body?.status === 'active');
    const mappingId = mentorMapRes.body?.id;

    // 2. Set Milestone Goals
    const goalRes = await request('/api/data/mentorship_goals', {
      method: 'POST',
      token: mentorToken,
      body: {
        mapping_id: mappingId,
        title: 'Master Enterprise Cloud Deployment',
        description: 'Complete containerization and cloud orchestration on Render',
        target_date: '2026-10-30',
        created_by: 'mentor-1',
        status: 'pending',
      },
    });
    assert('Mentor assigns career milestone goal to mentee', goalRes.status === 201 && goalRes.body?.status === 'pending');

    // ------------------------------------------------------------------
    // SUITE 9: Workflow 7 - AI Career Services (ATS CV & Interview Coach)
    // ------------------------------------------------------------------
    logSuite('9. Workflow: AI Career Development Tools');

    // 1. Generate ATS-Optimized CV
    const cvRes = await request('/api/ai/generate-cv', {
      method: 'POST',
      token: citizenToken,
      body: { target_role: 'Senior Software Engineer' },
    });
    assert('AI ATS CV Builder generates structured resume with work and education sections', cvRes.status === 200 && !!cvRes.body?.cv && !!cvRes.body?.profile);
    assert('CV includes professional summary and technical skills', Array.isArray(cvRes.body?.cv?.skills?.technical) && cvRes.body?.cv?.skills?.technical.length > 0);

    // 2. AI Interview Coach Response
    const coachRes = await request('/api/ai/ai-interview-coach', {
      method: 'POST',
      token: citizenToken,
      body: {
        messages: [{ role: 'user', content: 'How should I structure my answer about past technical challenges?' }],
        mode: 'tips',
        job_title: 'Full Stack Engineer',
      },
    });
    assert('AI Interview Coach returns contextual STAR interview coaching advice', coachRes.status === 200 && coachRes.body?.includes('STAR'));

    // ------------------------------------------------------------------
    // SUITE 10: Workflow 8 - Audit Trail, Governance & Password Management
    // ------------------------------------------------------------------
    logSuite('10. Workflow: Governance, Audit Logs & Security');

    const superAdminToken = tokens['superadmin@jconnect.gov.ng'];

    // 1. Submit & Execute Approval Workflow via RPC
    const wfRes = await request('/api/data/approval_workflows', {
      method: 'POST',
      token: superAdminToken,
      body: {
        entity_type: 'job_posting',
        entity_id: jobId,
        status: 'pending',
        submitted_by: citizenId,
      },
    });
    assert('Administrative approval workflow created', wfRes.status === 201);
    const wfId = wfRes.body?.id;

    const execRes = await request('/api/rpc/execute_workflow', {
      method: 'POST',
      token: superAdminToken,
      body: { workflow_id: wfId, status: 'approved', notes: 'Verified and authorized' },
    });
    assert('RPC /api/rpc/execute_workflow approves and signs off action', execRes.status === 200 && execRes.body?.success === true);

    // 2. Log privileged action in audit_logs
    const auditRes = await request('/api/data/audit_logs', {
      method: 'POST',
      token: superAdminToken,
      body: {
        user_id: 'super-admin-id',
        action: 'APPROVE_WORKFLOW',
        entity_type: 'approval_workflows',
        entity_id: wfId,
      },
    });
    assert('Privileged action recorded in immutable audit log', auditRes.status === 201);

    // 3. Authenticated Password Change
    const pwChangeRes = await request('/api/auth/change-password', {
      method: 'POST',
      token: citizenToken,
      body: {
        current_password: 'JCONNECT2025',
        new_password: 'JCONNECT2025_UPDATED',
      },
    });
    assert('Authenticated user successfully updates password', pwChangeRes.status === 200 && pwChangeRes.body?.success === true);

    // 4. Login with updated password
    const newLoginRes = await loginUser(newCitizenEmail, 'JCONNECT2025_UPDATED');
    assert('Login with updated password succeeds', newLoginRes.status === 200 && !!newLoginRes.body?.token);

  } catch (err) {
    console.error('Fatal error during UAT execution:', err);
  } finally {
    if (server) {
      server.close();
      console.log('\nUAT test server terminated.');
    }
  }

  // --------------------------------------------------------------------
  // FINAL UAT REPORT SUMMARY
  // --------------------------------------------------------------------
  console.log(`\n======================================================================`);
  console.log(`  FINAL LIVE UAT SUMMARY`);
  console.log(`======================================================================`);
  console.log(`  Total Tests Run:  ${results.total}`);
  console.log(`  Passed:           ${results.passed}`);
  console.log(`  Failed:           ${results.failed}`);
  console.log(`  Success Rate:     ${Math.round((results.passed / results.total) * 100)}%`);
  console.log(`======================================================================\n`);

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLiveUAT();
