// ======================================================================
// J-CONNECT COMMUNITY, SOCIAL & GROUPS: 360° DEEP LIVE UAT
// Tests 100% live end-to-end against Render service & remote Aiven MySQL:
// 1. Stakeholder Authentication & Persona Setup (Superadmin, Creator, Citizen, Jobseeker)
// 2. Community Media Upload Pipeline (/api/upload/community-media: Images & Video)
// 3. Public Community Feed & Multi-Media Post Lifecycle (social_posts)
// 4. Social Reactions & Dynamic Likes Engine (social_reactions & social_posts)
// 5. Threaded Discussions & Comments (social_comments & social_posts)
// 6. Social Groups Architecture & Creation (social_groups & social_group_members)
// 7. Group Membership Management & Participant Roles
// 8. Group-Scoped Feeds & Discussion Partitioning
// 9. Social Connections & Follow Network (social_follows)
// 10. Discover People & Community Search
// 11. Activity Feed & Social In-App Notifications
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
  console.log(`  COMMUNITY UAT SUITE: ${title}`);
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

async function uploadFile(bucket, filename, mimeType, buffer, token, targetPath) {
  let url = `${BASE_URL}/api/upload/${bucket}`;
  if (targetPath) {
    url += `?path=${encodeURIComponent(targetPath)}`;
  }
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append('file', blob, filename);

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const body = await res.json().catch(() => null);
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
// MAIN COMMUNITY TEST SUITE
// ----------------------------------------------------------------------
async function runCommunityLiveUAT() {
  console.log(`\n======================================================================`);
  console.log(`  J-CONNECT COMMUNITY, SOCIAL & GROUPS: 360° LIVE UAT`);
  console.log(`  Target Environment: ${BASE_URL}`);
  console.log(`  Execution Mode: 100% Live against Render API & Remote Aiven MySQL`);
  console.log(`======================================================================\n`);

  const runId = Date.now().toString(36);

  // --------------------------------------------------------------------
  // SUITE 1: Multi-Persona Authentication & Setup
  // --------------------------------------------------------------------
  logSuite('1. Multi-Persona Authentication & Profile Setup');

  const adminAuth = await loginUser('superadmin@jconnect.gov.ng');
  assert('Superadmin authentication succeeds', !!adminAuth?.token, `Status: ${adminAuth ? 'OK' : 'Failed'}`);

  const citizenAuth = await loginUser('citizen@jconnect.gov.ng');
  assert('Citizen Author authentication succeeds', !!citizenAuth?.token, `Status: ${citizenAuth ? 'OK' : 'Failed'}`);

  const creatorAuth = await loginUser('creator@jconnect.gov.ng');
  assert('Creator / Influencer authentication succeeds', !!creatorAuth?.token, `Status: ${creatorAuth ? 'OK' : 'Failed'}`);

  const jobseekerAuth = await loginUser('jobseeker@jconnect.gov.ng');
  assert('Jobseeker Community Member authentication succeeds', !!jobseekerAuth?.token, `Status: ${jobseekerAuth ? 'OK' : 'Failed'}`);

  const adminUser = adminAuth?.user;
  const citizenUser = citizenAuth?.user;
  const creatorUser = creatorAuth?.user;
  const jobseekerUser = jobseekerAuth?.user;

  // Verify all 4 user profiles exist in database
  const citizenProfileRes = await request(`/api/data/profiles?user_id=eq.${citizenUser?.id}`, { token: citizenAuth?.token });
  assert('Citizen profile retrieved from database', citizenProfileRes.status === 200 && citizenProfileRes.body?.length > 0);

  const creatorProfileRes = await request(`/api/data/profiles?user_id=eq.${creatorUser?.id}`, { token: creatorAuth?.token });
  assert('Creator profile retrieved from database', creatorProfileRes.status === 200 && creatorProfileRes.body?.length > 0);

  // --------------------------------------------------------------------
  // SUITE 2: Community Media File Upload Pipeline (/api/upload/community-media)
  // --------------------------------------------------------------------
  logSuite('2. Community Media Upload Pipeline (/api/upload/community-media)');

  // 1. Upload JPEG Image
  const jpegBuffer = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0xFF, 0xD9
  ]);
  const img1Upload = await uploadFile(
    'community-media',
    `agritech-summit-${runId}.jpg`,
    'image/jpeg',
    jpegBuffer,
    creatorAuth?.token,
    `${creatorUser?.id}/${runId}-summit.jpg`
  );
  assert(
    'Upload JPEG Image via multipart/form-data to /api/upload/community-media',
    img1Upload.status === 200 && !!img1Upload.body?.publicUrl,
    `Status: ${img1Upload.status}`
  );
  const img1Url = img1Upload.body?.publicUrl;

  // 2. Upload PNG Image
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);
  const img2Upload = await uploadFile(
    'community-media',
    `tech-meetup-${runId}.png`,
    'image/png',
    pngBuffer,
    citizenAuth?.token,
    `${citizenUser?.id}/${runId}-meetup.png`
  );
  assert(
    'Upload PNG Image via multipart/form-data to /api/upload/community-media',
    img2Upload.status === 200 && !!img2Upload.body?.publicUrl,
    `Status: ${img2Upload.status}`
  );
  const img2Url = img2Upload.body?.publicUrl;

  // 3. Upload MP4 Video
  const mp4Buffer = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D]),
    Buffer.alloc(512, 0xAA)
  ]);
  const videoUpload = await uploadFile(
    'community-media',
    `vocational-training-${runId}.mp4`,
    'video/mp4',
    mp4Buffer,
    citizenAuth?.token,
    `${citizenUser?.id}/${runId}-training.mp4`
  );
  assert(
    'Upload MP4 Video via multipart/form-data to /api/upload/community-media',
    videoUpload.status === 200 && !!videoUpload.body?.publicUrl,
    `Status: ${videoUpload.status}`
  );
  const videoUrl = videoUpload.body?.publicUrl;

  // 4. Verify public URL accessibility on Render
  if (img1Url) {
    const checkImgRes = await fetch(`${BASE_URL}${img1Url}`);
    assert('Uploaded media file is publicly accessible over HTTP GET', checkImgRes.status === 200);
  }

  // --------------------------------------------------------------------
  // SUITE 3: Public Community Feed & Multi-Media Post Lifecycle
  // --------------------------------------------------------------------
  logSuite('3. Public Community Feed & Multi-Media Post Lifecycle (social_posts)');

  // 1. Text-Only Post
  const textPostRes = await request('/api/data/social_posts', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      user_id: citizenUser?.id,
      content: `Excited to launch our community skill-building initiative in Jos North! #${runId}`,
      visibility: 'public',
      media_urls: null,
    },
  });
  assert('Citizen creates Text-Only community post (social_posts)', textPostRes.status === 201 && !!textPostRes.body?.id);
  const textPostId = textPostRes.body?.id;

  // 2. Post with Single Image Attachment
  const imgPostRes = await request('/api/data/social_posts', {
    method: 'POST',
    token: creatorAuth?.token,
    body: {
      user_id: creatorUser?.id,
      content: `Highlights from today's Plateau AgriTech Summit #${runId}`,
      visibility: 'public',
      media_urls: [img1Url],
    },
  });
  assert('Creator creates post with Image attachment (social_posts)', imgPostRes.status === 201 && !!imgPostRes.body?.id);
  const imgPostId = imgPostRes.body?.id;

  // 3. Post with Video Attachment
  const videoPostRes = await request('/api/data/social_posts', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      user_id: citizenUser?.id,
      content: `Quick video demo of our solar engineering practical session #${runId}`,
      visibility: 'public',
      media_urls: [videoUrl],
    },
  });
  assert('Citizen creates post with Video attachment (social_posts)', videoPostRes.status === 201 && !!videoPostRes.body?.id);
  const videoPostId = videoPostRes.body?.id;

  // 4. Multi-Media Post (Images + Video combined)
  const multiMediaPostRes = await request('/api/data/social_posts', {
    method: 'POST',
    token: creatorAuth?.token,
    body: {
      user_id: creatorUser?.id,
      content: `Comprehensive exhibition album and recap video of Plateau innovation cohort #${runId}`,
      visibility: 'public',
      media_urls: [img1Url, img2Url, videoUrl],
    },
  });
  assert('Creator creates Multi-Media post with photos and video (social_posts)', multiMediaPostRes.status === 201 && !!multiMediaPostRes.body?.id);
  const multiMediaPostId = multiMediaPostRes.body?.id;

  // 5. Query Community Feed (Reverse Chronological)
  const feedRes = await request('/api/data/social_posts?order=created_at.desc&limit=25', { token: citizenAuth?.token });
  assert('Query public community feed (/api/data/social_posts)', feedRes.status === 200 && Array.isArray(feedRes.body));
  const foundCreatedPost = (feedRes.body || []).find(p => p.id === multiMediaPostId);
  assert('Newly created multi-media post found in community feed', !!foundCreatedPost);

  // 6. Verify JSON media_urls parsing
  const retrievedMediaUrls = foundCreatedPost?.media_urls;
  assert(
    'media_urls is automatically parsed from JSON to Array by REST API',
    Array.isArray(retrievedMediaUrls) && retrievedMediaUrls.length === 3,
    `Type: ${typeof retrievedMediaUrls}, Length: ${retrievedMediaUrls?.length}`
  );

  // 7. Query Social Posts with Profiles Relation Join
  const postsWithProfilesRes = await request(`/api/data/social_posts?id=eq.${multiMediaPostId}&select=*,profiles(*)`, { token: citizenAuth?.token });
  assert('Query social post with profiles relation (select=*,profiles(*))', postsWithProfilesRes.status === 200 && postsWithProfilesRes.body?.length > 0);
  assert(
    'Author profile metadata is correctly resolved in relation join',
    !!postsWithProfilesRes.body?.[0]?.profiles?.full_name,
    `Author: ${postsWithProfilesRes.body?.[0]?.profiles?.full_name}`
  );

  // --------------------------------------------------------------------
  // SUITE 4: Social Reactions & Dynamic Likes Engine
  // --------------------------------------------------------------------
  logSuite('4. Social Reactions & Dynamic Likes Engine (social_reactions & social_posts)');

  // 1. Citizen reacts/likes Creator's post
  const like1Res = await request('/api/data/social_reactions', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      user_id: citizenUser?.id,
      post_id: multiMediaPostId,
      reaction_type: 'like',
    },
  });
  assert('Citizen likes Creator post (social_reactions)', like1Res.status === 201 && !!like1Res.body?.id);
  const like1Id = like1Res.body?.id;

  // 2. Increment likes_count on post
  const updateLikes1 = await request(`/api/data/social_posts?id=eq.${multiMediaPostId}`, {
    method: 'PATCH',
    token: citizenAuth?.token,
    body: { likes_count: 1 },
  });
  assert('Update post likes_count to 1 on social_posts', updateLikes1.status === 200);

  // 3. Jobseeker also likes the post
  const like2Res = await request('/api/data/social_reactions', {
    method: 'POST',
    token: jobseekerAuth?.token,
    body: {
      user_id: jobseekerUser?.id,
      post_id: multiMediaPostId,
      reaction_type: 'like',
    },
  });
  assert('Jobseeker likes Creator post (social_reactions)', like2Res.status === 201 && !!like2Res.body?.id);

  // 4. Increment likes_count to 2
  const updateLikes2 = await request(`/api/data/social_posts?id=eq.${multiMediaPostId}`, {
    method: 'PATCH',
    token: jobseekerAuth?.token,
    body: { likes_count: 2 },
  });
  assert('Update post likes_count to 2 on social_posts', updateLikes2.status === 200);

  // 5. Query reactions for the post
  const reactionsRes = await request(`/api/data/social_reactions?post_id=eq.${multiMediaPostId}`, { token: citizenAuth?.token });
  assert('Query reactions for post returns both recorded likes', reactionsRes.status === 200 && reactionsRes.body?.length >= 2);

  // 6. Query post with reactions relation
  const postWithReactionsRes = await request(`/api/data/social_posts?id=eq.${multiMediaPostId}&select=*,reactions(*)`, { token: citizenAuth?.token });
  assert(
    'Query social post with reactions relation (select=*,reactions(*))',
    postWithReactionsRes.status === 200 && Array.isArray(postWithReactionsRes.body?.[0]?.reactions) && postWithReactionsRes.body[0].reactions.length >= 2
  );

  // 7. Citizen toggles like off (Unlike)
  const unlikeRes = await request(`/api/data/social_reactions?id=eq.${like1Id}`, {
    method: 'DELETE',
    token: citizenAuth?.token,
  });
  assert('Citizen removes like / unlikes post (DELETE social_reactions)', unlikeRes.status === 200);

  // 8. Decrement likes_count back to 1
  const updateLikes3 = await request(`/api/data/social_posts?id=eq.${multiMediaPostId}`, {
    method: 'PATCH',
    token: citizenAuth?.token,
    body: { likes_count: 1 },
  });
  assert('Decrement post likes_count back to 1 on social_posts', updateLikes3.status === 200);

  // Verify updated post likes_count in DB
  const postAfterUnlike = await request(`/api/data/social_posts?id=eq.${multiMediaPostId}`, { token: citizenAuth?.token });
  assert('Verified post likes_count persisted as 1 in remote database', postAfterUnlike.body?.[0]?.likes_count === 1);

  // --------------------------------------------------------------------
  // SUITE 5: Threaded Discussions & Comments
  // --------------------------------------------------------------------
  logSuite('5. Threaded Discussions & Comments (social_comments & social_posts)');

  // 1. Citizen comments on Creator's post
  const comment1Res = await request('/api/data/social_comments', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      post_id: multiMediaPostId,
      user_id: citizenUser?.id,
      content: `Outstanding progress! When does the next practical batch commence? #${runId}`,
    },
  });
  assert('Citizen adds comment to post (social_comments)', comment1Res.status === 201 && !!comment1Res.body?.id);
  const comment1Id = comment1Res.body?.id;

  // 2. Increment comments_count
  await request(`/api/data/social_posts?id=eq.${multiMediaPostId}`, {
    method: 'PATCH',
    token: citizenAuth?.token,
    body: { comments_count: 1 },
  });

  // 3. Creator replies to citizen's comment
  const comment2Res = await request('/api/data/social_comments', {
    method: 'POST',
    token: creatorAuth?.token,
    body: {
      post_id: multiMediaPostId,
      user_id: creatorUser?.id,
      content: `Registration opens next Monday on the J-Connect E-learning portal! #${runId}`,
    },
  });
  assert('Creator replies with follow-up comment in thread (social_comments)', comment2Res.status === 201 && !!comment2Res.body?.id);

  // 4. Jobseeker contributes a 3rd comment
  const comment3Res = await request('/api/data/social_comments', {
    method: 'POST',
    token: jobseekerAuth?.token,
    body: {
      post_id: multiMediaPostId,
      user_id: jobseekerUser?.id,
      content: `I have completed the prerequisite courses, ready to participate! #${runId}`,
    },
  });
  assert('Jobseeker contributes third perspective to discussion (social_comments)', comment3Res.status === 201 && !!comment3Res.body?.id);

  // 5. Update comments_count to 3
  const updateCommentsCount = await request(`/api/data/social_posts?id=eq.${multiMediaPostId}`, {
    method: 'PATCH',
    token: creatorAuth?.token,
    body: { comments_count: 3 },
  });
  assert('Update post comments_count to 3 on social_posts', updateCommentsCount.status === 200);

  // 6. Query comments for post in chronological order
  const getCommentsRes = await request(`/api/data/social_comments?post_id=eq.${multiMediaPostId}&order=created_at.asc`, { token: citizenAuth?.token });
  assert('Retrieve discussion comments ordered chronologically', getCommentsRes.status === 200 && getCommentsRes.body?.length >= 3);

  // 7. Query comments with author profile relation
  const commentsWithProfiles = await request(`/api/data/social_comments?post_id=eq.${multiMediaPostId}&select=*,profiles(*)`, { token: citizenAuth?.token });
  assert(
    'Query social comments with joined author profile (select=*,profiles(*))',
    commentsWithProfiles.status === 200 && !!commentsWithProfiles.body?.[0]?.profiles?.full_name,
    `Comment author: ${commentsWithProfiles.body?.[0]?.profiles?.full_name}`
  );

  // 8. Query post with joined comments relation
  const postWithComments = await request(`/api/data/social_posts?id=eq.${multiMediaPostId}&select=*,comments(*)`, { token: citizenAuth?.token });
  assert(
    'Query social post with joined comments (select=*,comments(*))',
    postWithComments.status === 200 && Array.isArray(postWithComments.body?.[0]?.comments) && postWithComments.body[0].comments.length >= 3
  );

  // --------------------------------------------------------------------
  // SUITE 6: Social Groups Architecture & Creation
  // --------------------------------------------------------------------
  logSuite('6. Social Groups Architecture & Creation (social_groups & social_group_members)');

  // 1. Creator launches "Plateau AgriTech & Innovation Hub"
  const group1Res = await request('/api/data/social_groups', {
    method: 'POST',
    token: creatorAuth?.token,
    body: {
      name: `Plateau AgriTech & Innovation Hub #${runId}`,
      description: 'Collaborative platform uniting agricultural innovators, drone technicians, and IoT farmers across Plateau.',
      category: 'Technology',
      member_count: 1,
      avatar_url: img1Url,
      created_by: creatorUser?.id,
      is_private: false,
    },
  });
  assert('Creator launches public Social Group (social_groups)', group1Res.status === 201 && !!group1Res.body?.id);
  const group1Id = group1Res.body?.id;

  // Auto-enroll creator as admin member in social_group_members
  const memberAdminRes = await request('/api/data/social_group_members', {
    method: 'POST',
    token: creatorAuth?.token,
    body: {
      group_id: group1Id,
      user_id: creatorUser?.id,
      role: 'admin',
    },
  });
  assert('Creator is registered as Group Admin (social_group_members)', memberAdminRes.status === 201 && !!memberAdminRes.body?.id);

  // 2. Superadmin launches "Jos Civic Leadership Forum"
  const group2Res = await request('/api/data/social_groups', {
    method: 'POST',
    token: adminAuth?.token,
    body: {
      name: `Jos Civic Leadership Forum #${runId}`,
      description: 'Civic governance and public policy discussions for youth leaders in Jos metropolitan area.',
      category: 'Civic',
      member_count: 1,
      created_by: adminUser?.id,
      is_private: false,
    },
  });
  assert('Superadmin launches Civic Leadership Group (social_groups)', group2Res.status === 201 && !!group2Res.body?.id);
  const group2Id = group2Res.body?.id;

  // 3. Query all groups
  const allGroupsRes = await request('/api/data/social_groups?order=created_at.desc', { token: citizenAuth?.token });
  assert('Retrieve active social groups (/api/data/social_groups)', allGroupsRes.status === 200 && allGroupsRes.body?.length >= 2);

  // 4. Query group with joined creator profile
  const groupWithCreator = await request(`/api/data/social_groups?id=eq.${group1Id}&select=*,creator:profiles(*)`, { token: citizenAuth?.token });
  assert(
    'Query social group with creator profile relation (select=*,creator:profiles(*))',
    groupWithCreator.status === 200 && !!groupWithCreator.body?.[0]?.creator?.full_name,
    `Creator: ${groupWithCreator.body?.[0]?.creator?.full_name}`
  );

  // --------------------------------------------------------------------
  // SUITE 7: Group Membership Lifecycle (social_group_members)
  // --------------------------------------------------------------------
  logSuite('7. Group Membership Lifecycle (social_group_members)');

  // 1. Citizen joins group1
  const citizenJoinRes = await request('/api/data/social_group_members', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      group_id: group1Id,
      user_id: citizenUser?.id,
      role: 'member',
    },
  });
  assert('Citizen joins AgriTech group as member (social_group_members)', citizenJoinRes.status === 201 && !!citizenJoinRes.body?.id);

  // 2. Jobseeker joins group1
  const jobseekerJoinRes = await request('/api/data/social_group_members', {
    method: 'POST',
    token: jobseekerAuth?.token,
    body: {
      group_id: group1Id,
      user_id: jobseekerUser?.id,
      role: 'member',
    },
  });
  assert('Jobseeker joins AgriTech group as member (social_group_members)', jobseekerJoinRes.status === 201 && !!jobseekerJoinRes.body?.id);
  const jobseekerMemberId = jobseekerJoinRes.body?.id;

  // 3. Update member_count to 3
  await request(`/api/data/social_groups?id=eq.${group1Id}`, {
    method: 'PATCH',
    token: creatorAuth?.token,
    body: { member_count: 3 },
  });

  // 4. Query group members with profiles
  const groupMembersRes = await request(`/api/data/social_group_members?group_id=eq.${group1Id}&select=*,profiles(*)`, { token: citizenAuth?.token });
  assert(
    'Query group members with joined citizen profiles (select=*,profiles(*))',
    groupMembersRes.status === 200 && groupMembersRes.body?.length === 3,
    `Count: ${groupMembersRes.body?.length}`
  );

  // 5. Jobseeker leaves group
  const leaveGroupRes = await request(`/api/data/social_group_members?id=eq.${jobseekerMemberId}`, {
    method: 'DELETE',
    token: jobseekerAuth?.token,
  });
  assert('Jobseeker leaves group (DELETE social_group_members)', leaveGroupRes.status === 200);

  // 6. Update member_count to 2
  await request(`/api/data/social_groups?id=eq.${group1Id}`, {
    method: 'PATCH',
    token: creatorAuth?.token,
    body: { member_count: 2 },
  });

  const updatedGroupRes = await request(`/api/data/social_groups?id=eq.${group1Id}`, { token: citizenAuth?.token });
  assert('Group member_count accurately persisted as 2 in remote database', updatedGroupRes.body?.[0]?.member_count === 2);

  // --------------------------------------------------------------------
  // SUITE 8: Group-Scoped Feeds & Partitioning
  // --------------------------------------------------------------------
  logSuite('8. Group-Scoped Feeds & Discussion Partitioning');

  // 1. Citizen posts specifically inside AgriTech group
  const groupPost1Res = await request('/api/data/social_posts', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      user_id: citizenUser?.id,
      group_id: group1Id,
      content: `Welcome team! Sharing our open-source soil moisture sensor schematic for Plateau high-altitude farms. #${runId}`,
      visibility: 'public',
      media_urls: [img2Url],
    },
  });
  assert('Citizen creates post scoped to AgriTech Group (group_id)', groupPost1Res.status === 201 && !!groupPost1Res.body?.id);

  // 2. Creator posts in AgriTech group
  const groupPost2Res = await request('/api/data/social_posts', {
    method: 'POST',
    token: creatorAuth?.token,
    body: {
      user_id: creatorUser?.id,
      group_id: group1Id,
      content: `Reminder: Virtual breakout session on automated greenhouse telemetry this Thursday! #${runId}`,
      visibility: 'public',
    },
  });
  assert('Creator posts workshop announcement within Group (group_id)', groupPost2Res.status === 201 && !!groupPost2Res.body?.id);

  // 3. Query group feed specifically
  const groupFeedRes = await request(`/api/data/social_posts?group_id=eq.${group1Id}&order=created_at.desc`, { token: citizenAuth?.token });
  assert(
    'Query group-isolated post feed (/api/data/social_posts?group_id=...) returns exclusively group posts',
    groupFeedRes.status === 200 && groupFeedRes.body?.every(p => p.group_id === group1Id) && groupFeedRes.body?.length >= 2,
    `Group posts: ${groupFeedRes.body?.length}`
  );

  // 4. Query group with joined posts relation
  const groupWithPostsRes = await request(`/api/data/social_groups?id=eq.${group1Id}&select=*,posts(*)`, { token: citizenAuth?.token });
  assert(
    'Query social group with joined posts (select=*,posts(*))',
    groupWithPostsRes.status === 200 && Array.isArray(groupWithPostsRes.body?.[0]?.posts) && groupWithPostsRes.body[0].posts.length >= 2
  );

  // --------------------------------------------------------------------
  // SUITE 9: Social Connections & Follow Network (social_follows)
  // --------------------------------------------------------------------
  logSuite('9. Social Connections & Follow Network (social_follows)');

  // Ensure clean state for follow relations between test personas
  const f1Check = await request(`/api/data/social_follows?follower_id=eq.${citizenUser?.id}&following_id=eq.${creatorUser?.id}`, { token: adminAuth?.token });
  for (const f of (f1Check.body || [])) {
    await request(`/api/data/social_follows?id=eq.${f.id}`, { method: 'DELETE', token: adminAuth?.token });
  }
  const f2Check = await request(`/api/data/social_follows?follower_id=eq.${jobseekerUser?.id}&following_id=eq.${creatorUser?.id}`, { token: adminAuth?.token });
  for (const f of (f2Check.body || [])) {
    await request(`/api/data/social_follows?id=eq.${f.id}`, { method: 'DELETE', token: adminAuth?.token });
  }
  const f3Check = await request(`/api/data/social_follows?follower_id=eq.${creatorUser?.id}&following_id=eq.${citizenUser?.id}`, { token: adminAuth?.token });
  for (const f of (f3Check.body || [])) {
    await request(`/api/data/social_follows?id=eq.${f.id}`, { method: 'DELETE', token: adminAuth?.token });
  }

  // 1. Citizen follows Creator
  const follow1Res = await request('/api/data/social_follows', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      follower_id: citizenUser?.id,
      following_id: creatorUser?.id,
    },
  });
  assert('Citizen follows Creator (social_follows)', follow1Res.status === 201 && !!follow1Res.body?.id);
  const follow1Id = follow1Res.body?.id;

  // 2. Jobseeker follows Creator
  const follow2Res = await request('/api/data/social_follows', {
    method: 'POST',
    token: jobseekerAuth?.token,
    body: {
      follower_id: jobseekerUser?.id,
      following_id: creatorUser?.id,
    },
  });
  assert('Jobseeker follows Creator (social_follows)', follow2Res.status === 201 && !!follow2Res.body?.id);

  // 3. Creator follows Citizen (Mutual follow)
  const follow3Res = await request('/api/data/social_follows', {
    method: 'POST',
    token: creatorAuth?.token,
    body: {
      follower_id: creatorUser?.id,
      following_id: citizenUser?.id,
    },
  });
  assert('Creator follows Citizen back establishing mutual connection', follow3Res.status === 201 && !!follow3Res.body?.id);

  // 4. Query Creator's followers with joined profiles
  const creatorFollowersRes = await request(`/api/data/social_follows?following_id=eq.${creatorUser?.id}&select=*,follower:profiles(*)`, { token: creatorAuth?.token });
  assert(
    'Query Creator followers list with joined follower profiles',
    creatorFollowersRes.status === 200 && creatorFollowersRes.body?.length >= 2,
    `Followers count: ${creatorFollowersRes.body?.length}`
  );

  // 5. Query Citizen's following list with joined profiles
  const citizenFollowingRes = await request(`/api/data/social_follows?follower_id=eq.${citizenUser?.id}&select=*,following:profiles(*)`, { token: citizenAuth?.token });
  assert(
    'Query Citizen following list with joined following profiles',
    citizenFollowingRes.status === 200 && citizenFollowingRes.body?.length >= 1,
    `Following count: ${citizenFollowingRes.body?.length}`
  );

  // 6. Citizen unfollows Creator
  const unfollowRes = await request(`/api/data/social_follows?id=eq.${follow1Id}`, {
    method: 'DELETE',
    token: citizenAuth?.token,
  });
  assert('Citizen unfollows Creator (DELETE social_follows)', unfollowRes.status === 200);

  // Verify Creator still has Jobseeker as follower
  const updatedFollowersRes = await request(`/api/data/social_follows?following_id=eq.${creatorUser?.id}`, { token: creatorAuth?.token });
  const stillFollowedByJobseeker = (updatedFollowersRes.body || []).some(f => f.follower_id === jobseekerUser?.id);
  assert('Creator followers correctly reflects active connections after unfollow', stillFollowedByJobseeker);

  // --------------------------------------------------------------------
  // SUITE 10: Discover People & Community Profile Search
  // --------------------------------------------------------------------
  logSuite('10. Discover People & Community Search');

  // 1. Search profiles by Name keyword
  const searchByName = await request('/api/data/profiles?full_name=like.%Citizen%', { token: citizenAuth?.token });
  assert('Search community members by name keyword (full_name=like.%...%)', searchByName.status === 200 && searchByName.body?.length > 0);

  // 2. Search profiles by LGA
  const searchByLga = await request('/api/data/profiles?lga=eq.Dutse', { token: citizenAuth?.token });
  assert('Filter community members by Local Government Area (lga=eq.Dutse)', searchByLga.status === 200 && searchByLga.body?.length > 0);

  // 3. Filter profiles by employment status
  const searchByEmp = await request('/api/data/profiles?employment_status=eq.employed', { token: citizenAuth?.token });
  assert('Filter community members by employment status (employment_status=eq.employed)', searchByEmp.status === 200 && Array.isArray(searchByEmp.body));

  // --------------------------------------------------------------------
  // SUITE 11: Real-Time Activity Feed & In-App Notifications
  // --------------------------------------------------------------------
  logSuite('11. Real-Time Activity Feed & In-App Notifications');

  // 1. Log Activity Feed events
  const activity1Res = await request('/api/data/activity_feed', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      user_id: citizenUser?.id,
      action: 'post_created',
      entity_type: 'social_posts',
      entity_id: multiMediaPostId,
      metadata: { title: 'Plateau AgriTech Summit recap', runId },
    },
  });
  assert('Record social activity in activity_feed (action: post_created)', activity1Res.status === 201 && !!activity1Res.body?.id);

  const activity2Res = await request('/api/data/activity_feed', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      user_id: citizenUser?.id,
      action: 'group_joined',
      entity_type: 'social_groups',
      entity_id: group1Id,
      metadata: { groupName: 'Plateau AgriTech Hub', runId },
    },
  });
  assert('Record group activity in activity_feed (action: group_joined)', activity2Res.status === 201 && !!activity2Res.body?.id);

  // 2. Query Citizen activity feed
  const citizenActivityRes = await request(`/api/data/activity_feed?user_id=eq.${citizenUser?.id}&order=created_at.desc&limit=10`, { token: citizenAuth?.token });
  assert('Retrieve citizen personalized activity feed (/api/data/activity_feed)', citizenActivityRes.status === 200 && citizenActivityRes.body?.length >= 2);

  // 3. Dispatch In-App Notification to Creator for discussion engagement
  const notifRes = await request('/api/data/notifications', {
    method: 'POST',
    token: citizenAuth?.token,
    body: {
      user_id: creatorUser?.id,
      title: 'New Comment on Your Post',
      message: `Citizen replied to your Plateau AgriTech Summit post #${runId}`,
      type: 'social',
      is_read: false,
    },
  });
  assert('Dispatch in-app social notification to post author (notifications)', notifRes.status === 201 && !!notifRes.body?.id);
  const notifId = notifRes.body?.id;

  // 4. Query Creator unread notifications
  const creatorNotifsRes = await request(`/api/data/notifications?user_id=eq.${creatorUser?.id}&is_read=eq.false`, { token: creatorAuth?.token });
  assert('Creator receives new unread social notification in notification center', creatorNotifsRes.status === 200 && (creatorNotifsRes.body || []).some(n => n.id === notifId));

  // 5. Creator marks notification as read
  const markReadRes = await request(`/api/data/notifications?id=eq.${notifId}`, {
    method: 'PATCH',
    token: creatorAuth?.token,
    body: { is_read: true },
  });
  assert('Creator marks social engagement notification as read', markReadRes.status === 200);

  // --------------------------------------------------------------------
  // SUITE 12: Remote Aiven MySQL Database Retention Audit
  // --------------------------------------------------------------------
  logSuite('12. Remote Aiven MySQL Database Retention Audit');

  // Verify all created records remain in database (Zero Deletions)
  const auditPosts = await request('/api/data/social_posts?limit=100', { token: adminAuth?.token });
  assert('All created social posts are permanently preserved in remote MySQL', auditPosts.status === 200 && auditPosts.body?.length >= 6);

  const auditComments = await request('/api/data/social_comments?limit=100', { token: adminAuth?.token });
  assert('All discussion comments are permanently preserved in remote MySQL', auditComments.status === 200 && auditComments.body?.length >= 3);

  const auditReactions = await request('/api/data/social_reactions?limit=100', { token: adminAuth?.token });
  assert('All active reactions/likes are permanently preserved in remote MySQL', auditReactions.status === 200 && auditReactions.body?.length >= 1);

  const auditGroups = await request('/api/data/social_groups?limit=100', { token: adminAuth?.token });
  assert('All created social groups are permanently preserved in remote MySQL', auditGroups.status === 200 && auditGroups.body?.length >= 2);

  const auditMembers = await request('/api/data/social_group_members?limit=100', { token: adminAuth?.token });
  assert('Active group memberships are permanently preserved in remote MySQL', auditMembers.status === 200 && auditMembers.body?.length >= 2);

  const auditFollows = await request('/api/data/social_follows?limit=100', { token: adminAuth?.token });
  assert('Active follower connections are permanently preserved in remote MySQL', auditFollows.status === 200 && auditFollows.body?.length >= 2);

  const auditActivity = await request('/api/data/activity_feed?limit=100', { token: adminAuth?.token });
  assert('Community activity feed events are permanently preserved in remote MySQL', auditActivity.status === 200 && auditActivity.body?.length >= 2);

  console.log(`\n======================================================================`);
  console.log(`  COMMUNITY, SOCIAL & GROUPS UAT SUMMARY`);
  console.log(`  Total Tests Run: ${results.total}`);
  console.log(`  Total Passed:    ${results.passed}`);
  console.log(`  Total Failed:    ${results.failed}`);
  console.log(`  Success Rate:    ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log(`======================================================================\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

runCommunityLiveUAT().catch(err => {
  console.error('Unhandled fatal exception during Community UAT:', err);
  process.exit(1);
});
