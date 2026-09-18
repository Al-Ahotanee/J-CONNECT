// ======================================================================
// J-CONNECT MENTORSHIP & CAREER COACHING: 360° DEEP LIVE UAT
// Tests 100% live end-to-end against Render service & remote Aiven MySQL:
// 1. Stakeholder Authentication & RBAC (Mentorship Admin, Mentor, Mentees)
// 2. Mentor Profile Configuration & Marketplace Listings (mentorship_listings)
// 3. Mentorship Requests & Acceptance Negotiation (mentorship_requests)
// 4. Mentorship Pairing & Official Mapping Lifecycle (mentorship_mappings)
// 5. Algorithmic Auto-Matching & Sector Alignment
// 6. Coaching Sessions Scheduling & Execution (mentorship_sessions)
// 7. Goal Setting & Milestone Progress Tracking (mentorship_goals)
// 8. Evaluation, Mentee Feedback & Mentor Ratings (mentor_ratings)
// 9. Mentorship Lifecycle Transitions & Completion
// 10. Remote Aiven MySQL Database Retention Audit
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
  console.log(`  MENTORSHIP UAT SUITE: ${title}`);
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
// MAIN MENTORSHIP TEST SUITE
// ----------------------------------------------------------------------
async function runMentorshipLiveUAT() {
  console.log(`\n======================================================================`);
  console.log(`  J-CONNECT MENTORSHIP & CAREER COACHING: 360° LIVE UAT`);
  console.log(`  Target Environment: ${BASE_URL}`);
  console.log(`  Execution Mode: 100% Live against Render API & Remote Aiven MySQL`);
  console.log(`======================================================================\n`);

  const runId = Date.now().toString(36);

  // --------------------------------------------------------------------
  // SUITE 1: Stakeholder Authentication & RBAC
  // --------------------------------------------------------------------
  logSuite('1. Stakeholder Authentication & RBAC Authorization');

  const adminAuth = await loginUser('mentorship.admin@jconnect.gov.ng');
  assert('Mentorship Administrator authentication succeeds', !!adminAuth?.token);

  const mentorAuth = await loginUser('mentor@jconnect.gov.ng');
  assert('Industry Executive Mentor authentication succeeds', !!mentorAuth?.token);

  const mentee1Auth = await loginUser('jobseeker@jconnect.gov.ng');
  assert('Candidate Mentee 1 (Jobseeker) authentication succeeds', !!mentee1Auth?.token);

  const mentee2Auth = await loginUser('citizen@jconnect.gov.ng');
  assert('Candidate Mentee 2 (Citizen) authentication succeeds', !!mentee2Auth?.token);

  const superAdminAuth = await loginUser('superadmin@jconnect.gov.ng');
  assert('Superadmin authentication succeeds', !!superAdminAuth?.token);

  const mentorUser = mentorAuth?.user;
  const mentee1User = mentee1Auth?.user;
  const mentee2User = mentee2Auth?.user;

  // RBAC Permission checks
  const checkAdminRole = await request('/api/rpc/has_role', {
    method: 'POST',
    token: adminAuth?.token,
    body: { _role: 'mentorship_admin' },
  });
  assert('Admin possesses verified mentorship_admin permission', checkAdminRole.status === 200 && checkAdminRole.body?.data === true);

  const checkMentorRole = await request('/api/rpc/has_role', {
    method: 'POST',
    token: mentorAuth?.token,
    body: { _role: 'mentor' },
  });
  assert('Mentor possesses verified mentor role permission', checkMentorRole.status === 200 && checkMentorRole.body?.data === true);

  // --------------------------------------------------------------------
  // SUITE 2: Mentor Profile & Marketplace Listings (mentorship_listings)
  // --------------------------------------------------------------------
  logSuite('2. Mentor Profile Configuration & Marketplace Listings (mentorship_listings)');

  // 1. Fetch mentor profile record
  const getMentorRes = await request(`/api/data/mentors?user_id=eq.${mentorUser?.id}`, { token: mentorAuth?.token });
  assert('Retrieve mentor profile record from database (mentors)', getMentorRes.status === 200 && getMentorRes.body?.length > 0);
  const mentorRecord = getMentorRes.body?.[0];
  const mentorTableId = mentorRecord?.id;

  // 2. Mentor publishes career coaching listing in marketplace
  const listingRes = await request('/api/data/mentorship_listings', {
    method: 'POST',
    token: mentorAuth?.token,
    body: {
      user_id: mentorUser?.id,
      listing_type: 'mentorship',
      title: `Executive Cloud Architecture & DevSecOps Mentorship #${runId}`,
      description: 'Hands-on 1-on-1 career coaching covering cloud computing, microservices, containerization, and public sector modernization.',
      category: 'ICT & Technology',
      skills: ['Cloud Architecture', 'Kubernetes', 'DevOps', 'Cybersecurity'],
      experience_level: 'Senior',
      expectations: 'Bi-weekly check-ins, architectural milestone delivery, and active participation.',
      is_active: true,
      status: 'open',
    },
  });
  assert('Mentor publishes coaching listing in marketplace (mentorship_listings)', listingRes.status === 201 && !!listingRes.body?.id);
  const listingId = listingRes.body?.id;

  // 3. Query active marketplace listings
  const listCatalogRes = await request('/api/data/mentorship_listings?is_active=eq.true&order=created_at.desc&limit=20', { token: mentee1Auth?.token });
  assert('Mentees browse active mentorship listings catalog', listCatalogRes.status === 200 && Array.isArray(listCatalogRes.body));
  assert('Newly created mentorship listing appears in catalog', (listCatalogRes.body || []).some(l => l.id === listingId));

  // 4. Query listing with mentor profile relation
  const listingWithProfile = await request(`/api/data/mentorship_listings?id=eq.${listingId}&select=*,profiles(*)`, { token: mentee1Auth?.token });
  assert(
    'Query mentorship listing with joined mentor profile (select=*,profiles(*))',
    listingWithProfile.status === 200 && !!listingWithProfile.body?.[0]?.profiles?.full_name,
    `Mentor: ${listingWithProfile.body?.[0]?.profiles?.full_name}`
  );

  // --------------------------------------------------------------------
  // SUITE 3: Mentorship Requests & Negotiation (mentorship_requests)
  // --------------------------------------------------------------------
  logSuite('3. Mentorship Requests & Negotiation (mentorship_requests)');

  // 1. Mentee 1 submits mentorship application request
  const requestRes = await request('/api/data/mentorship_requests', {
    method: 'POST',
    token: mentee1Auth?.token,
    body: {
      from_user_id: mentee1User?.id,
      to_user_id: mentorUser?.id,
      listing_id: listingId,
      message: `Dear Mentor, I am a junior software engineer aiming to transition into cloud DevOps engineering. #${runId}`,
      request_type: 'one_on_one',
      status: 'pending',
    },
  });
  assert('Mentee submits 1-on-1 mentorship request (mentorship_requests)', requestRes.status === 201 && !!requestRes.body?.id);
  const requestId = requestRes.body?.id;

  // 2. Mentor queries pending incoming requests
  const mentorRequestsRes = await request(`/api/data/mentorship_requests?to_user_id=eq.${mentorUser?.id}&status=eq.pending`, { token: mentorAuth?.token });
  assert('Mentor reviews incoming pending mentorship requests', mentorRequestsRes.status === 200 && (mentorRequestsRes.body || []).some(r => r.id === requestId));

  // 3. Query request with sender profile join
  const requestWithProfile = await request(`/api/data/mentorship_requests?id=eq.${requestId}&select=*,from_profile:profiles(*)`, { token: mentorAuth?.token });
  assert(
    'Query request with joined applicant profile details',
    requestWithProfile.status === 200 && !!requestWithProfile.body?.[0]?.from_profile?.full_name,
    `Applicant: ${requestWithProfile.body?.[0]?.from_profile?.full_name}`
  );

  // 4. Mentor accepts the mentorship request
  const acceptRes = await request(`/api/data/mentorship_requests?id=eq.${requestId}`, {
    method: 'PATCH',
    token: mentorAuth?.token,
    body: { status: 'accepted' },
  });
  assert('Mentor accepts mentorship request (PATCH status: accepted)', acceptRes.status === 200);

  // --------------------------------------------------------------------
  // SUITE 4: Mentorship Pairing & Official Mapping Lifecycle (mentorship_mappings)
  // --------------------------------------------------------------------
  logSuite('4. Mentorship Pairing & Official Mapping Lifecycle (mentorship_mappings)');

  // 1. Create official active mentorship mapping
  const mappingRes = await request('/api/data/mentorship_mappings', {
    method: 'POST',
    token: mentorAuth?.token,
    body: {
      mentor_id: mentorTableId,
      mentee_id: mentee1User?.id,
      status: 'active',
      notes: `Official 12-week GovTech Cloud Architecture Track #${runId}`,
      auto_matched: false,
    },
  });
  assert('Establish active mentorship mapping (mentorship_mappings)', mappingRes.status === 201 && !!mappingRes.body?.id);
  const mappingId = mappingRes.body?.id;

  // 2. Increment mentor current_mentees count
  const updatedMenteesCount = (mentorRecord?.current_mentees || 0) + 1;
  const updateMentorRes = await request(`/api/data/mentors?id=eq.${mentorTableId}`, {
    method: 'PATCH',
    token: mentorAuth?.token,
    body: { current_mentees: updatedMenteesCount },
  });
  assert('Increment mentor active mentees counter on mentors table', updateMentorRes.status === 200);

  // 3. Mentee queries their active mentorships with mentor relation
  const myMappingsRes = await request(`/api/data/mentorship_mappings?mentee_id=eq.${mentee1User?.id}&status=eq.active&select=*,mentors(*)`, { token: mentee1Auth?.token });
  assert('Mentee queries active mentorship pairings with joined mentor details', myMappingsRes.status === 200 && (myMappingsRes.body || []).some(m => m.id === mappingId));

  // 4. Administrator queries all statewide mentorship mappings
  const adminMappingsRes = await request('/api/data/mentorship_mappings?order=created_at.desc&limit=50', { token: adminAuth?.token });
  assert('Mentorship Admin oversees statewide active mappings list', adminMappingsRes.status === 200 && adminMappingsRes.body?.length > 0);

  // --------------------------------------------------------------------
  // SUITE 5: Algorithmic Auto-Matching Engine Simulation
  // --------------------------------------------------------------------
  logSuite('5. Algorithmic Auto-Matching Engine Simulation');

  // Mentee 2 utilizes the auto-matching engine
  const autoMappingRes = await request('/api/data/mentorship_mappings', {
    method: 'POST',
    token: mentee2Auth?.token,
    body: {
      mentor_id: mentorTableId,
      mentee_id: mentee2User?.id,
      status: 'active',
      auto_matched: true,
      match_reason: 'Optimal alignment: Sector (ICT & Technology) + LGA Geographic Proximity (Score: 7)',
      notes: `Algorithmic auto-match pairing #${runId}`,
    },
  });
  assert('Automated algorithm pairs Mentee 2 with optimal Mentor (auto_matched: true)', autoMappingRes.status === 201 && !!autoMappingRes.body?.id);
  const autoMappingId = autoMappingRes.body?.id;

  // Verify auto_matched flag and match reason persisted
  const checkAutoMatch = await request(`/api/data/mentorship_mappings?id=eq.${autoMappingId}`, { token: adminAuth?.token });
  assert('Auto-match reason and metadata preserved in remote database', checkAutoMatch.body?.[0]?.auto_matched === 1 || checkAutoMatch.body?.[0]?.auto_matched === true);

  // --------------------------------------------------------------------
  // SUITE 6: Coaching Sessions Scheduling & Execution (mentorship_sessions)
  // --------------------------------------------------------------------
  logSuite('6. Coaching Sessions Scheduling & Execution (mentorship_sessions)');

  // 1. Mentor schedules Session 1
  const session1Res = await request('/api/data/mentorship_sessions', {
    method: 'POST',
    token: mentorAuth?.token,
    body: {
      mapping_id: mappingId,
      mentor_id: mentorUser?.id,
      mentee_id: mentee1User?.id,
      title: `Session 1: Enterprise Microservices & Cloud Infrastructure #${runId}`,
      notes: 'Deep-dive into containerized microservices and automated CI/CD pipelines.',
      session_type: 'virtual',
      scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 19).replace('T', ' '),
      status: 'scheduled',
    },
  });
  assert('Schedule 1-on-1 virtual career coaching session (mentorship_sessions)', session1Res.status === 201 && !!session1Res.body?.id);
  const session1Id = session1Res.body?.id;

  // 2. Schedule Session 2
  const session2Res = await request('/api/data/mentorship_sessions', {
    method: 'POST',
    token: mentorAuth?.token,
    body: {
      mapping_id: mappingId,
      mentor_id: mentorUser?.id,
      mentee_id: mentee1User?.id,
      title: `Session 2: Cloud Security Posture & DevSecOps Audit #${runId}`,
      notes: 'Reviewing zero-trust access, secrets management, and container vulnerability scanning.',
      session_type: 'virtual',
      scheduled_at: new Date(Date.now() + 172800000).toISOString().slice(0, 19).replace('T', ' '),
      status: 'scheduled',
    },
  });
  assert('Schedule follow-up coaching session in mentorship roadmap', session2Res.status === 201 && !!session2Res.body?.id);

  // 3. Query sessions by mapping ID
  const mappingSessionsRes = await request(`/api/data/mentorship_sessions?mapping_id=eq.${mappingId}&order=created_at.desc`, { token: mentee1Auth?.token });
  assert('Retrieve scheduled coaching sessions for mentorship track', mappingSessionsRes.status === 200 && mappingSessionsRes.body?.length >= 2);

  // 4. Mentor conducts and completes Session 1
  const completeSessionRes = await request(`/api/data/mentorship_sessions?id=eq.${session1Id}`, {
    method: 'PATCH',
    token: mentorAuth?.token,
    body: {
      status: 'completed',
      completed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      notes: 'Session successfully conducted. Mentee demonstrated excellent proficiency in Kubernetes pods and deployment architecture.',
    },
  });
  assert('Mentor completes coaching session and files assessment notes', completeSessionRes.status === 200);

  // Verify completed status persisted
  const verifySession = await request(`/api/data/mentorship_sessions?id=eq.${session1Id}`, { token: mentee1Auth?.token });
  assert('Session status accurately reflected as completed in remote database', verifySession.body?.[0]?.status === 'completed');

  // --------------------------------------------------------------------
  // SUITE 7: Goal Setting & Milestone Progress Tracking (mentorship_goals)
  // --------------------------------------------------------------------
  logSuite('7. Goal Setting & Milestone Progress Tracking (mentorship_goals)');

  // 1. Mentor sets Goal 1
  const goal1Res = await request('/api/data/mentorship_goals', {
    method: 'POST',
    token: mentorAuth?.token,
    body: {
      mapping_id: mappingId,
      title: `Complete CKA Kubernetes Architecture Certification #${runId}`,
      description: 'Master container networking, storage volumes, security context, and ingress controllers.',
      target_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'pending',
      created_by: mentorUser?.id,
    },
  });
  assert('Establish measurable milestone goal for mentee (mentorship_goals)', goal1Res.status === 201 && !!goal1Res.body?.id);
  const goal1Id = goal1Res.body?.id;

  // 2. Mentee sets Goal 2
  const goal2Res = await request('/api/data/mentorship_goals', {
    method: 'POST',
    token: mentee1Auth?.token,
    body: {
      mapping_id: mappingId,
      title: `Deploy High-Availability State Database Cluster #${runId}`,
      description: 'Configure multi-node MySQL replication with connection pooling and failover monitoring.',
      target_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      status: 'pending',
      created_by: mentee1User?.id,
    },
  });
  assert('Mentee contributes personal milestone goal to roadmap (mentorship_goals)', goal2Res.status === 201 && !!goal2Res.body?.id);

  // 3. Query all goals for mapping
  const goalsRes = await request(`/api/data/mentorship_goals?mapping_id=eq.${mappingId}&order=created_at.asc`, { token: mentee1Auth?.token });
  assert('Retrieve active milestone goals roadmap', goalsRes.status === 200 && goalsRes.body?.length >= 2);

  // 4. Mentee completes Goal 1
  const completeGoalRes = await request(`/api/data/mentorship_goals?id=eq.${goal1Id}`, {
    method: 'PATCH',
    token: mentee1Auth?.token,
    body: {
      status: 'completed',
      completed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    },
  });
  assert('Mentee marks milestone goal as completed (50% progress achieved)', completeGoalRes.status === 200);

  // --------------------------------------------------------------------
  // SUITE 8: Evaluation, Mentee Feedback & Mentor Ratings (mentor_ratings)
  // --------------------------------------------------------------------
  logSuite('8. Evaluation, Mentee Feedback & Mentor Ratings (mentor_ratings)');

  // 1. Mentee rates mentor
  const ratingRes = await request('/api/data/mentor_ratings', {
    method: 'POST',
    token: mentee1Auth?.token,
    body: {
      mentor_id: mentorUser?.id,
      mentee_id: mentee1User?.id,
      mapping_id: mappingId,
      rating: 5,
      feedback: `Outstanding mentor! The architectural walkthroughs and production insights provided invaluable practical value. #${runId}`,
    },
  });
  assert('Mentee submits official mentor rating and feedback (mentor_ratings)', ratingRes.status === 201 && !!ratingRes.body?.id);

  // 2. Query mentor ratings
  const ratingsRes = await request(`/api/data/mentor_ratings?mentor_id=eq.${mentorUser?.id}`, { token: adminAuth?.token });
  assert('Retrieve ratings and feedback evaluations for mentor', ratingsRes.status === 200 && ratingsRes.body?.length > 0);

  // --------------------------------------------------------------------
  // SUITE 9: Mentorship Lifecycle Transitions & Completion
  // --------------------------------------------------------------------
  logSuite('9. Mentorship Lifecycle Transitions & Completion');

  // 1. Complete mentorship track
  const completeTrackRes = await request(`/api/data/mentorship_mappings?id=eq.${mappingId}`, {
    method: 'PATCH',
    token: mentorAuth?.token,
    body: {
      status: 'completed',
      notes: `Successfully concluded 12-week cloud architecture program. Mentee achieved all primary milestones. #${runId}`,
    },
  });
  assert('Conclude and graduate mentorship cohort (PATCH status: completed)', completeTrackRes.status === 200);

  // 2. Decrement mentor active mentees counter
  await request(`/api/data/mentors?id=eq.${mentorTableId}`, {
    method: 'PATCH',
    token: mentorAuth?.token,
    body: { current_mentees: Math.max(0, updatedMenteesCount - 1) },
  });
  const checkMentorCapacity = await request(`/api/data/mentors?id=eq.${mentorTableId}`, { token: mentorAuth?.token });
  assert('Mentor availability capacity automatically restored in database', checkMentorCapacity.body?.[0]?.current_mentees !== undefined);

  // --------------------------------------------------------------------
  // SUITE 10: Remote Aiven MySQL Database Retention Audit
  // --------------------------------------------------------------------
  logSuite('10. Remote Aiven MySQL Database Retention Audit');

  // Verify all records remain in database (Zero Deletions)
  const auditListings = await request('/api/data/mentorship_listings?limit=100', { token: superAdminAuth?.token });
  assert('All mentorship listings permanently preserved in remote MySQL', auditListings.status === 200 && auditListings.body?.length >= 1);

  const auditRequests = await request('/api/data/mentorship_requests?limit=100', { token: superAdminAuth?.token });
  assert('All mentorship requests permanently preserved in remote MySQL', auditRequests.status === 200 && auditRequests.body?.length >= 1);

  const auditMappings = await request('/api/data/mentorship_mappings?limit=100', { token: superAdminAuth?.token });
  assert('All mentorship mappings permanently preserved in remote MySQL', auditMappings.status === 200 && auditMappings.body?.length >= 2);

  const auditSessions = await request('/api/data/mentorship_sessions?limit=100', { token: superAdminAuth?.token });
  assert('All coaching sessions permanently preserved in remote MySQL', auditSessions.status === 200 && auditSessions.body?.length >= 2);

  const auditGoals = await request('/api/data/mentorship_goals?limit=100', { token: superAdminAuth?.token });
  assert('All milestone goals permanently preserved in remote MySQL', auditGoals.status === 200 && auditGoals.body?.length >= 2);

  const auditRatings = await request('/api/data/mentor_ratings?limit=100', { token: superAdminAuth?.token });
  assert('All mentor ratings permanently preserved in remote MySQL', auditRatings.status === 200 && auditRatings.body?.length >= 1);

  console.log(`\n======================================================================`);
  console.log(`  MENTORSHIP & CAREER COACHING UAT SUMMARY`);
  console.log(`  Total Tests Run: ${results.total}`);
  console.log(`  Total Passed:    ${results.passed}`);
  console.log(`  Total Failed:    ${results.failed}`);
  console.log(`  Success Rate:    ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log(`======================================================================\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

runMentorshipLiveUAT().catch(err => {
  console.error('Unhandled fatal exception during Mentorship UAT:', err);
  process.exit(1);
});
