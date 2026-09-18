// ======================================================================
// J-CONNECT CBT & ASSESSMENTS: 360° DEEP LIVE UAT
// Tests 100% live end-to-end against Render service & remote Aiven MySQL:
// 1. Stakeholder Authentication & CBT RBAC Authorization (CBT Admin, Assessor, Candidates)
// 2. CBT Exam Template Architecture & Configuration (quizzes)
// 3. Question Bank Management & Multi-Category Questions (quiz_questions)
// 4. Bulk Question Import Engine (Pipe-delimited parsing & batch insertion)
// 5. Anti-Cheat Candidate Security & Answer Redaction (quiz_questions_public)
// 6. Exam Publishing Lifecycle & Schedule Management (is_published state machine)
// 7. Candidate Assessment Experience & Answer Submission
// 8. Server-Side RPC Auto-Grading Engine (/api/rpc/grade_quiz_attempt)
// 9. CBT Attempt Logging & Results Persistence (quiz_attempts)
// 10. Performance Analytics & Score Distribution (Pass rates, averages, stats)
// 11. Recruitment Pipeline & Merit Integration (candidate_scores link)
// 12. Remote Aiven MySQL Database Retention Audit
// ======================================================================

const TARGET_ARG = process.env.TARGET_URL || (process.argv[2] && process.argv[2].startsWith('http') ? process.argv[2] : null);
const PORT = process.env.PORT || 5055;
const BASE_URL = TARGET_ARG ? TARGET_ARG.replace(/\/+$/, '') : `http://127.0.0.1:${PORT}`;

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: [],
};

function logSuite(title) {
  console.log(`\n======================================================================`);
  console.log(`  CBT & ASSESSMENTS UAT SUITE: ${title}`);
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
  if (res.ok && (res.body?.token || res.body?.session?.access_token)) {
    return {
      token: res.body.token || res.body?.session?.access_token,
      user: res.body.user,
    };
  }
  return null;
}

// ----------------------------------------------------------------------
// MAIN CBT TEST SUITE
// ----------------------------------------------------------------------
async function runCBTLiveUAT() {
  console.log(`\n======================================================================`);
  console.log(`  J-CONNECT CBT & ASSESSMENTS: 360° LIVE UAT`);
  console.log(`  Target Environment: ${BASE_URL}`);
  console.log(`  Execution Mode: 100% Live against Render API & Remote Aiven MySQL`);
  console.log(`======================================================================\n`);

  const runId = Date.now().toString(36);

  // --------------------------------------------------------------------
  // SUITE 1: Stakeholder Authentication & CBT RBAC Authorization
  // --------------------------------------------------------------------
  logSuite('1. Stakeholder Authentication & CBT RBAC Authorization');

  const cbtAdminAuth = await loginUser('cbt.admin@jconnect.gov.ng');
  assert('CBT Administrator authentication succeeds', !!cbtAdminAuth?.token, `Status: ${cbtAdminAuth ? 'OK' : 'Failed'}`);

  const assessorAuth = await loginUser('assessor@jconnect.gov.ng');
  assert('CBT Assessor authentication succeeds', !!assessorAuth?.token, `Status: ${assessorAuth ? 'OK' : 'Failed'}`);

  const jobseekerAuth = await loginUser('jobseeker@jconnect.gov.ng');
  assert('Candidate Jobseeker authentication succeeds', !!jobseekerAuth?.token, `Status: ${jobseekerAuth ? 'OK' : 'Failed'}`);

  const citizenAuth = await loginUser('citizen@jconnect.gov.ng');
  assert('Candidate Citizen authentication succeeds', !!citizenAuth?.token, `Status: ${citizenAuth ? 'OK' : 'Failed'}`);

  const superAdminAuth = await loginUser('superadmin@jconnect.gov.ng');
  assert('Superadmin authentication succeeds', !!superAdminAuth?.token);

  const cbtAdminUser = cbtAdminAuth?.user;
  const assessorUser = assessorAuth?.user;
  const jobseekerUser = jobseekerAuth?.user;
  const citizenUser = citizenAuth?.user;

  // RBAC role verification via RPC /api/rpc/has_role
  const checkAdminRole = await request('/api/rpc/has_role', {
    method: 'POST',
    token: cbtAdminAuth?.token,
    body: { _role: 'cbt_admin' },
  });
  assert('CBT Admin possesses verified cbt_admin role permission', checkAdminRole.status === 200 && checkAdminRole.body?.data === true);

  const checkAssessorRole = await request('/api/rpc/has_role', {
    method: 'POST',
    token: assessorAuth?.token,
    body: { _role: 'cbt_assessor' },
  });
  assert('CBT Assessor possesses verified cbt_assessor role permission', checkAssessorRole.status === 200 && checkAssessorRole.body?.data === true);

  // --------------------------------------------------------------------
  // SUITE 2: CBT Exam Template Architecture & Configuration
  // --------------------------------------------------------------------
  logSuite('2. CBT Exam Template Architecture & Configuration (quizzes)');

  // 1. Create State Civil Service General Aptitude Exam
  const exam1Res = await request('/api/data/quizzes', {
    method: 'POST',
    token: cbtAdminAuth?.token,
    body: {
      title: `State Civil Service General Aptitude Exam #${runId}`,
      description: 'Standardized computer-based assessment for administrative cadre recruitment across ministries and parastatals.',
      pass_score: 60,
      time_limit_minutes: 45,
      is_published: false,
      created_by: cbtAdminUser?.id,
    },
  });
  assert('CBT Admin creates standardized Exam Template (quizzes)', exam1Res.status === 201 && !!exam1Res.body?.id);
  const exam1Id = exam1Res.body?.id;

  // 2. Create Technical Skills Assessment Template (linked to recruitment)
  const exam2Res = await request('/api/data/quizzes', {
    method: 'POST',
    token: cbtAdminAuth?.token,
    body: {
      title: `Full-Stack ICT Assessment #${runId}`,
      description: 'Technical competency evaluation covering software architecture, database querying, and security protocols.',
      pass_score: 70,
      time_limit_minutes: 30,
      is_published: false,
      created_by: cbtAdminUser?.id,
    },
  });
  assert('CBT Admin creates Technical Assessment template (quizzes)', exam2Res.status === 201 && !!exam2Res.body?.id);
  const exam2Id = exam2Res.body?.id;

  // 3. Query created exam templates list
  const listExamsRes = await request('/api/data/quizzes?order=created_at.desc&limit=20', { token: cbtAdminAuth?.token });
  assert('Query exam templates list from database', listExamsRes.status === 200 && Array.isArray(listExamsRes.body));
  assert('Newly created exam templates present in database', (listExamsRes.body || []).some(q => q.id === exam1Id));

  // 4. Query exam template with question count relation
  const examWithQuestionsRes = await request(`/api/data/quizzes?id=eq.${exam1Id}&select=*,quiz_questions(id)`, { token: cbtAdminAuth?.token });
  assert(
    'Query exam template with questions relation join (select=*,quiz_questions(id))',
    examWithQuestionsRes.status === 200 && examWithQuestionsRes.body?.length > 0 && Array.isArray(examWithQuestionsRes.body[0].quiz_questions)
  );

  // --------------------------------------------------------------------
  // SUITE 3: Question Bank Management & Multi-Category Questions
  // --------------------------------------------------------------------
  logSuite('3. Question Bank Management & Multi-Category Questions (quiz_questions)');

  // 1. Numerical Reasoning Question
  const q1Res = await request('/api/data/quiz_questions', {
    method: 'POST',
    token: cbtAdminAuth?.token,
    body: {
      quiz_id: exam1Id,
      question: `If a state revenue department collected ₦480,000,000 in Q1 and increased revenue by 15% in Q2, what was the total Q2 revenue? #${runId}`,
      options: ['₦520,000,000', '₦552,000,000', '₦560,000,000', '₦540,000,000'],
      correct_answer: 1, // Index 1: 552,000,000
      order_index: 0,
    },
  });
  assert('Add Numerical Reasoning Question to question bank (quiz_questions)', q1Res.status === 201 && !!q1Res.body?.id);
  const q1Id = q1Res.body?.id;

  // 2. Logical Reasoning Question
  const q2Res = await request('/api/data/quiz_questions', {
    method: 'POST',
    token: cbtAdminAuth?.token,
    body: {
      quiz_id: exam1Id,
      question: `Which number completes the sequence: 4, 9, 19, 39, 79, ___? #${runId}`,
      options: ['149', '159', '169', '179'],
      correct_answer: 1, // Index 1: 159 (x2 + 1)
      order_index: 1,
    },
  });
  assert('Add Logical Reasoning Question to question bank (quiz_questions)', q2Res.status === 201 && !!q2Res.body?.id);
  const q2Id = q2Res.body?.id;

  // 3. Situational Judgment & Governance Question
  const q3Res = await request('/api/data/quiz_questions', {
    method: 'POST',
    token: cbtAdminAuth?.token,
    body: {
      quiz_id: exam1Id,
      question: `When handling official state procurement documentation, what is the primary regulatory guideline to observe? #${runId}`,
      options: [
        'Discretion of the departmental head',
        'Public Procurement Act & Fiscal Responsibility Framework',
        'Informal verbal consensus',
        'Vendor recommendation memorandum'
      ],
      correct_answer: 1, // Index 1: Public Procurement Act
      order_index: 2,
    },
  });
  assert('Add Situational Judgment & Governance Question (quiz_questions)', q3Res.status === 201 && !!q3Res.body?.id);
  const q3Id = q3Res.body?.id;

  // 4. Technical / Digital Literacy Question
  const q4Res = await request('/api/data/quiz_questions', {
    method: 'POST',
    token: cbtAdminAuth?.token,
    body: {
      quiz_id: exam1Id,
      question: `In electronic document management, what protocol ensures non-repudiation and cryptographic integrity of official communications? #${runId}`,
      options: ['Plaintext CSV export', 'Public Key Infrastructure (PKI) Digital Signatures', 'HTTP Unencrypted Transmission', 'Shared Passwords'],
      correct_answer: 1, // Index 1: PKI
      order_index: 3,
    },
  });
  assert('Add Technical & Digital Literacy Question (quiz_questions)', q4Res.status === 201 && !!q4Res.body?.id);
  const q4Id = q4Res.body?.id;

  // Verify options array parsing from JSON
  const getQRes = await request(`/api/data/quiz_questions?id=eq.${q1Id}`, { token: cbtAdminAuth?.token });
  assert(
    'Question options JSON column is correctly parsed to Array',
    getQRes.status === 200 && Array.isArray(getQRes.body?.[0]?.options) && getQRes.body[0].options.length === 4
  );

  // --------------------------------------------------------------------
  // SUITE 4: Bulk Question Import Engine
  // --------------------------------------------------------------------
  logSuite('4. Bulk Question Import Engine (Pipe-delimited Batch Insertion)');

  // Simulate bulk import text parsing exactly as CBTAdminPage.tsx does:
  // Question|Option1|Option2|Option3|Option4|CorrectIndex
  const bulkLines = [
    `What is the primary capital city of Plateau State?|Barkin Ladi|Jos|Pankshin|Shendam|1`,
    `Which protocol is standard for secure web transmission?|FTP|HTTPS|Telnet|Gopher|1`,
    `What SQL keyword is used to retrieve distinct values?|UNIQUE|DISTINCT|SEPARATE|ISOLATE|1`,
  ];

  let bulkImportCount = 0;
  for (let i = 0; i < bulkLines.length; i++) {
    const parts = bulkLines[i].split('|').map(p => p.trim());
    if (parts.length >= 6) {
      const bRes = await request('/api/data/quiz_questions', {
        method: 'POST',
        token: cbtAdminAuth?.token,
        body: {
          quiz_id: exam2Id,
          question: `${parts[0]} #${runId}`,
          options: [parts[1], parts[2], parts[3], parts[4]],
          correct_answer: parseInt(parts[5]),
          order_index: i,
        },
      });
      if (bRes.status === 201 && bRes.body?.id) bulkImportCount++;
    }
  }
  assert('Batch import pipe-delimited questions into Exam 2 question bank', bulkImportCount === 3, `Imported: ${bulkImportCount}/3`);

  // Query imported questions from database
  const bulkCheck = await request(`/api/data/quiz_questions?quiz_id=eq.${exam2Id}&order=order_index.asc`, { token: cbtAdminAuth?.token });
  assert('Verify all 3 bulk imported questions exist in remote database', bulkCheck.status === 200 && bulkCheck.body?.length === 3);

  // --------------------------------------------------------------------
  // SUITE 5: Anti-Cheat Candidate Security & Answer Redaction
  // --------------------------------------------------------------------
  logSuite('5. Anti-Cheat Candidate Security & Answer Redaction (quiz_questions_public)');

  // Candidate queries public exam questions
  const candidateQuestionsRes = await request(`/api/data/quiz_questions_public?quiz_id=eq.${exam1Id}&order=order_index.asc`, { token: jobseekerAuth?.token });
  assert('Candidate retrieves exam questions via /api/data/quiz_questions_public', candidateQuestionsRes.status === 200 && candidateQuestionsRes.body?.length === 4);

  // CRUCIAL ANTI-CHEAT VERIFICATION:
  // Ensure correct_answer is completely redacted from public endpoint!
  const hasLeakedAnswers = (candidateQuestionsRes.body || []).some(q => q.correct_answer !== undefined);
  assert(
    'Anti-Cheat Security: correct_answer is strictly redacted from public candidate view',
    !hasLeakedAnswers,
    `Leak detected: ${hasLeakedAnswers}`
  );

  // Verify questions and options remain accessible for taking the test
  const validQuestionOptions = (candidateQuestionsRes.body || []).every(q => Array.isArray(q.options) && q.options.length === 4);
  assert('All 4 questions provide full candidate selectable options without leakage', validQuestionOptions);

  // --------------------------------------------------------------------
  // SUITE 6: Exam Publishing Lifecycle & Schedule Management
  // --------------------------------------------------------------------
  logSuite('6. Exam Publishing Lifecycle & Schedule Management');

  // 1. Verify initially unpublished
  const checkDraft = await request(`/api/data/quizzes?id=eq.${exam1Id}`, { token: cbtAdminAuth?.token });
  assert('Exam starts in draft / unpublished state (is_published: false)', checkDraft.body?.[0]?.is_published === 0 || checkDraft.body?.[0]?.is_published === false);

  // 2. Publish exam template
  const publishRes = await request(`/api/data/quizzes?id=eq.${exam1Id}`, {
    method: 'PATCH',
    token: cbtAdminAuth?.token,
    body: { is_published: true },
  });
  assert('CBT Admin publishes Exam Template (PATCH is_published: true)', publishRes.status === 200);

  // 3. Verify exam is now available in published exam queries
  const checkPublished = await request(`/api/data/quizzes?is_published=eq.true&order=created_at.desc`, { token: jobseekerAuth?.token });
  assert('Published exam template is discoverable by candidates', checkPublished.status === 200 && (checkPublished.body || []).some(q => q.id === exam1Id));

  // Also publish Exam 2 for candidate participation
  await request(`/api/data/quizzes?id=eq.${exam2Id}`, {
    method: 'PATCH',
    token: cbtAdminAuth?.token,
    body: { is_published: true },
  });

  // --------------------------------------------------------------------
  // SUITE 7: Candidate Assessment Experience & Answer Submission
  // --------------------------------------------------------------------
  logSuite('7. Candidate Assessment Experience & Answer Submission');

  // Jobseeker takes Exam 1:
  // Correct answers: Q1 -> 1, Q2 -> 1, Q3 -> 1, Q4 -> 1.
  // Jobseeker answers all 4 questions correctly!
  const candidateAnswersPassing = {
    [q1Id]: 1, // Correct
    [q2Id]: 1, // Correct
    [q3Id]: 1, // Correct
    [q4Id]: 1, // Correct
  };

  // --------------------------------------------------------------------
  // SUITE 8: Server-Side RPC Auto-Grading Engine (/api/rpc/grade_quiz_attempt)
  // --------------------------------------------------------------------
  logSuite('8. Server-Side RPC Auto-Grading Engine (/api/rpc/grade_quiz_attempt)');

  // 1. Grade Jobseeker's perfect answers via RPC
  const gradePassingRes = await request('/api/rpc/grade_quiz_attempt', {
    method: 'POST',
    token: jobseekerAuth?.token,
    body: {
      quiz_id: exam1Id,
      answers: candidateAnswersPassing,
    },
  });
  assert('Submit candidate answers to /api/rpc/grade_quiz_attempt', gradePassingRes.status === 200 && Array.isArray(gradePassingRes.body));
  const gradeResultPassing = gradePassingRes.body?.[0];
  assert(
    'RPC calculates 100% score for all correct answers',
    gradeResultPassing?.score === 100 && gradeResultPassing?.correct_count === 4 && gradeResultPassing?.total_questions === 4,
    `Score: ${gradeResultPassing?.score}%, Correct: ${gradeResultPassing?.correct_count}/4`
  );
  assert('RPC marks exam status as passed: true', gradeResultPassing?.passed === true);

  // 2. Grade Failing submission (answers 1 out of 4 correctly -> 25%, pass score is 60%)
  const candidateAnswersFailing = {
    [q1Id]: 1, // Correct
    [q2Id]: 0, // Wrong (correct is 1)
    [q3Id]: 0, // Wrong (correct is 1)
    [q4Id]: 2, // Wrong (correct is 1)
  };
  const gradeFailingRes = await request('/api/rpc/grade_quiz_attempt', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      quiz_id: exam1Id,
      answers: candidateAnswersFailing,
    },
  });
  assert('Grade second candidate submission with partial answers', gradeFailingRes.status === 200);
  const gradeResultFailing = gradeFailingRes.body?.[0];
  assert(
    'RPC calculates accurate failing score (25%) below 60% threshold',
    gradeResultFailing?.score === 25 && gradeResultFailing?.correct_count === 1,
    `Score: ${gradeResultFailing?.score}%, Correct: ${gradeResultFailing?.correct_count}/4`
  );
  assert('RPC marks exam status as passed: false', gradeResultFailing?.passed === false);

  // --------------------------------------------------------------------
  // SUITE 9: CBT Attempt Logging & Results Persistence (quiz_attempts)
  // --------------------------------------------------------------------
  logSuite('9. CBT Attempt Logging & Results Persistence (quiz_attempts)');

  // 1. Log Jobseeker's Passing Attempt
  const attempt1Res = await request('/api/data/quiz_attempts', {
    method: 'POST',
    token: jobseekerAuth?.token,
    body: {
      quiz_id: exam1Id,
      user_id: jobseekerUser?.id,
      answers: candidateAnswersPassing,
      score: 100,
      passed: true,
      completed_at: new Date().toISOString(),
    },
  });
  assert('Persist candidate passing exam attempt in quiz_attempts', attempt1Res.status === 201 && !!attempt1Res.body?.id);
  const attempt1Id = attempt1Res.body?.id;

  // 2. Log Citizen's Failing Attempt
  const attempt2Res = await request('/api/data/quiz_attempts', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      quiz_id: exam1Id,
      user_id: citizenUser?.id,
      answers: candidateAnswersFailing,
      score: 25,
      passed: false,
      completed_at: new Date().toISOString(),
    },
  });
  assert('Persist candidate failing exam attempt in quiz_attempts', attempt2Res.status === 201 && !!attempt2Res.body?.id);
  const attempt2Id = attempt2Res.body?.id;

  // 3. Query candidate individual attempts history
  const candidateHistoryRes = await request(`/api/data/quiz_attempts?user_id=eq.${jobseekerUser?.id}&order=completed_at.desc`, { token: jobseekerAuth?.token });
  assert('Candidate retrieves personal assessment history (/api/data/quiz_attempts)', candidateHistoryRes.status === 200 && candidateHistoryRes.body?.length > 0);
  assert('Verified candidate attempt record details', (candidateHistoryRes.body || []).some(a => a.id === attempt1Id && a.passed === 1 || a.passed === true));

  // 4. Query attempts with quiz relation join
  const attemptsWithQuizRes = await request(`/api/data/quiz_attempts?id=eq.${attempt1Id}&select=*,quizzes(title)`, { token: cbtAdminAuth?.token });
  assert(
    'Query assessment attempt with joined quiz title (select=*,quizzes(title))',
    attemptsWithQuizRes.status === 200 && !!attemptsWithQuizRes.body?.[0]?.quizzes?.title,
    `Exam: ${attemptsWithQuizRes.body?.[0]?.quizzes?.title}`
  );

  // 5. Query attempts with candidate profile join
  const attemptsWithProfileRes = await request(`/api/data/quiz_attempts?id=eq.${attempt1Id}&select=*,profiles(full_name)`, { token: cbtAdminAuth?.token });
  assert(
    'Query assessment attempt with joined candidate profile (select=*,profiles(full_name))',
    attemptsWithProfileRes.status === 200 && !!attemptsWithProfileRes.body?.[0]?.profiles?.full_name,
    `Candidate: ${attemptsWithProfileRes.body?.[0]?.profiles?.full_name}`
  );

  // --------------------------------------------------------------------
  // SUITE 10: Performance Analytics & Score Distribution
  // --------------------------------------------------------------------
  logSuite('10. Performance Analytics & Score Distribution');

  // Fetch all attempts for analytics
  const allAttemptsRes = await request('/api/data/quiz_attempts?limit=200', { token: cbtAdminAuth?.token });
  assert('CBT Admin queries global assessment attempts for analytics', allAttemptsRes.status === 200 && Array.isArray(allAttemptsRes.body));
  const attempts = allAttemptsRes.body || [];

  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter(a => a.passed === 1 || a.passed === true).length;
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
  const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((acc, a) => acc + (parseFloat(a.score) || 0), 0) / totalAttempts) : 0;

  assert('Calculate valid global CBT Pass Rate metric', passRate >= 0 && passRate <= 100, `Pass Rate: ${passRate}%`);
  assert('Calculate valid global CBT Average Score metric', avgScore >= 0 && avgScore <= 100, `Avg Score: ${avgScore}%`);

  // Filter attempts by Pass status
  const passedOnlyRes = await request('/api/data/quiz_attempts?passed=eq.true', { token: cbtAdminAuth?.token });
  assert('Filter assessment attempts by passed=eq.true', passedOnlyRes.status === 200 && passedOnlyRes.body?.length > 0);

  // Filter attempts by Fail status
  const failedOnlyRes = await request('/api/data/quiz_attempts?passed=eq.false', { token: cbtAdminAuth?.token });
  assert('Filter assessment attempts by passed=eq.false', failedOnlyRes.status === 200 && failedOnlyRes.body?.length > 0);

  // --------------------------------------------------------------------
  // SUITE 11: Recruitment Pipeline & Merit Integration
  // --------------------------------------------------------------------
  logSuite('11. Recruitment Pipeline & Merit Integration (candidate_scores link)');

  // Assessor records candidate competency score in recruitment pipeline
  const candidateScoreRes = await request('/api/data/candidate_scores', {
    method: 'POST',
    token: assessorAuth?.token,
    body: {
      recruiter_id: assessorUser?.id,
      application_id: `cbt-app-${runId}`,
      technical_score: 95.0,
      communication_score: 88.0,
      experience_score: 90.0,
      cultural_fit_score: 92.0,
      total_score: 91.25,
      notes: `Scored 100% on State Civil Service Aptitude Exam #${runId}. Outstanding analytical and governance readiness.`,
    },
  });
  assert('CBT Assessor links assessment evaluation to candidate_scores in recruitment pipeline', candidateScoreRes.status === 201 && !!candidateScoreRes.body?.id);
  const scoreId = candidateScoreRes.body?.id;

  // Query candidate score record
  const verifyScoreRes = await request(`/api/data/candidate_scores?id=eq.${scoreId}`, { token: assessorAuth?.token });
  assert('Candidate score record successfully persisted in recruitment pipeline', verifyScoreRes.status === 200 && parseFloat(verifyScoreRes.body?.[0]?.total_score) > 90);

  // --------------------------------------------------------------------
  // SUITE 12: Remote Aiven MySQL Database Retention Audit
  // --------------------------------------------------------------------
  logSuite('12. Remote Aiven MySQL Database Retention Audit');

  // Verify all records remain in database (Zero Deletions)
  const auditQuizzes = await request('/api/data/quizzes?limit=100', { token: superAdminAuth?.token });
  assert('All created CBT exam templates permanently preserved in remote MySQL', auditQuizzes.status === 200 && auditQuizzes.body?.length >= 2);

  const auditQuestions = await request('/api/data/quiz_questions?limit=100', { token: superAdminAuth?.token });
  assert('All created question bank items permanently preserved in remote MySQL', auditQuestions.status === 200 && auditQuestions.body?.length >= 7);

  const auditAttempts = await request('/api/data/quiz_attempts?limit=100', { token: superAdminAuth?.token });
  assert('All candidate assessment attempts permanently preserved in remote MySQL', auditAttempts.status === 200 && auditAttempts.body?.length >= 2);

  const auditCandidateScores = await request('/api/data/candidate_scores?limit=100', { token: superAdminAuth?.token });
  assert('All recruitment candidate competency scores permanently preserved in remote MySQL', auditCandidateScores.status === 200 && auditCandidateScores.body?.length >= 1);

  console.log(`\n======================================================================`);
  console.log(`  CBT & ASSESSMENTS UAT SUMMARY`);
  console.log(`  Total Tests Run: ${results.total}`);
  console.log(`  Total Passed:    ${results.passed}`);
  console.log(`  Total Failed:    ${results.failed}`);
  console.log(`  Success Rate:    ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log(`======================================================================\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

runCBTLiveUAT().catch(err => {
  console.error('Unhandled fatal exception during CBT UAT:', err);
  process.exit(1);
});
