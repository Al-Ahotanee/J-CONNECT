import { supabase } from "@/integrations/supabase/client";

// ==========================================
// RECRUITMENT MODULE API
// ==========================================

// ── Jobs ──
export const fetchAllJobs = async (filters?: {
  sector?: string; lga?: string; employment_type?: string; search?: string;
  is_internal?: boolean; qualification?: string; experience_level?: string;
}) => {
  let query = supabase.from("jobs").select("*").eq("is_active", true);
  if (filters?.sector) query = query.eq("sector", filters.sector);
  if (filters?.lga) query = query.eq("lga", filters.lga);
  if (filters?.employment_type) query = query.eq("employment_type", filters.employment_type);
  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);
  if (filters?.is_internal !== undefined) query = query.eq("is_internal", filters.is_internal);
  if (filters?.qualification) query = query.eq("qualification_required", filters.qualification);
  if (filters?.experience_level) query = query.eq("experience_level", filters.experience_level);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const fetchRecommendedJobs = async (userId: string) => {
  const { data: profile } = await supabase.from("profiles").select("skills, sector, lga, employment_status").eq("user_id", userId).single();
  if (!profile) return [];
  const { data: education } = await supabase.from("education").select("qualification_type").eq("user_id", userId);
  const { data: jobs, error } = await supabase.from("jobs").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  if (!jobs) return [];

  const scored = jobs.map(job => {
    let score = 0;
    if (profile.skills && job.skills_required) {
      const userSkills = (profile.skills as string[]).map(s => s.toLowerCase());
      const jobSkills = (job.skills_required as string[]).map(s => s.toLowerCase());
      const matches = jobSkills.filter(s => userSkills.some(us => us.includes(s) || s.includes(us)));
      score += matches.length * 20;
    }
    if (profile.sector && job.sector && profile.sector === job.sector) score += 15;
    if (profile.lga && job.lga && profile.lga === job.lga) score += 10;
    if (education?.length && job.qualification_required) {
      if (education.some(e => e.qualification_type === job.qualification_required)) score += 15;
    }
    return { ...job, _score: score };
  });

  return scored.filter(j => j._score > 0).sort((a, b) => b._score - a._score).slice(0, 10);
};

// ── Recruiter Management ──
export const fetchAllRecruiters = async () => {
  const { data, error } = await supabase.from("user_roles")
    .select("user_id, role")
    .eq("role", "recruiter");
  if (error) throw error;
  if (!data?.length) return [];
  const userIds = data.map(r => r.user_id);
  const { data: profiles, error: pErr } = await supabase.from("profiles")
    .select("*")
    .in("user_id", userIds);
  if (pErr) throw pErr;
  return profiles || [];
};

export const fetchRecruiterStats = async (recruiterId: string) => {
  const { data: jobs } = await supabase.from("jobs").select("id, is_active, applicants_count").eq("posted_by", recruiterId);
  const totalJobs = jobs?.length || 0;
  const activeJobs = jobs?.filter(j => j.is_active).length || 0;
  const totalApplicants = jobs?.reduce((a, j) => a + (j.applicants_count || 0), 0) || 0;
  return { totalJobs, activeJobs, totalApplicants };
};

// ── Job Applications (Fixed: no FK join, fetch profiles separately) ──
export const fetchJobApplicationsWithProfiles = async (jobId: string) => {
  const { data: apps, error } = await supabase.from("job_applications")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!apps || apps.length === 0) return [];

  // Fetch profiles separately for each applicant
  const userIds = [...new Set(apps.map(a => a.user_id))];
  const { data: profiles } = await supabase.from("profiles")
    .select("user_id, full_name, email, phone, lga, skills, cv_file_url, passport_photo_url")
    .in("user_id", userIds);

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  return apps.map(app => ({
    ...app,
    profile: profileMap.get(app.user_id) || null,
  }));
};

// ── Interview Pipeline ──
export const createInterviewInvitation = async (data: {
  job_id: string; application_id: string; user_id: string;
  recruiter_id: string; type: string; scheduled_at?: string; notes?: string;
}) => {
  const { data: result, error } = await supabase.from("interview_invitations")
    .insert(data).select().single();
  if (error) throw error;
  return result;
};

export const fetchInterviewInvitations = async (jobId: string) => {
  const { data, error } = await supabase.from("interview_invitations")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const fetchMyInvitations = async (userId: string) => {
  const { data, error } = await supabase.from("interview_invitations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const updateInvitationStatus = async (id: string, status: string) => {
  const { error } = await supabase.from("interview_invitations")
    .update({ status }).eq("id", id);
  if (error) throw error;
};

// ── Job Offers ──
export const createJobOffer = async (data: {
  job_id: string; application_id: string; user_id: string;
  recruiter_id: string; offer_details?: string; salary_offered?: string;
}) => {
  const { data: result, error } = await supabase.from("job_offers")
    .insert(data).select().single();
  if (error) throw error;
  return result;
};

export const fetchJobOffers = async (jobId: string) => {
  const { data, error } = await supabase.from("job_offers")
    .select("*")
    .eq("job_id", jobId);
  if (error) throw error;
  return data;
};

export const fetchMyOffers = async (userId: string) => {
  const { data, error } = await supabase.from("job_offers")
    .select("*, jobs(title, company, location)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const respondToOffer = async (offerId: string, status: "accepted" | "declined") => {
  const { error } = await supabase.from("job_offers")
    .update({ status, responded_at: new Date().toISOString() }).eq("id", offerId);
  if (error) throw error;
};

// ── External Job Posting ──
export const createExternalJob = async (job: {
  posted_by: string; title: string; description: string; company: string;
  location?: string; lga?: string; sector?: string; employment_type?: string;
  qualification_required?: string; experience_level?: string;
  skills_required?: string[]; salary_range?: string; deadline?: string;
  external_url: string;
}) => {
  const { data, error } = await supabase.from("jobs").insert({
    ...job, is_internal: false, is_active: true,
  }).select().single();
  if (error) throw error;
  return data;
};

export const createInternalJob = async (job: {
  posted_by: string; title: string; description: string; company: string;
  location?: string; lga?: string; sector?: string; employment_type?: string;
  qualification_required?: string; experience_level?: string;
  skills_required?: string[]; salary_range?: string; deadline?: string;
}) => {
  const { data, error } = await supabase.from("jobs").insert({
    ...job, is_internal: true, is_active: true,
  }).select().single();
  if (error) throw error;
  return data;
};

// ── Apply for Job (with applicant count increment) ──
export const applyForJobWithCount = async (jobId: string, userId: string, coverLetter?: string) => {
  const { data, error } = await supabase.from("job_applications")
    .insert({ job_id: jobId, user_id: userId, cover_letter: coverLetter })
    .select().single();
  if (error) throw error;

  // Increment applicants_count on the job
  const { data: job } = await supabase.from("jobs").select("applicants_count").eq("id", jobId).single();
  if (job) {
    await supabase.from("jobs").update({ applicants_count: (job.applicants_count || 0) + 1 }).eq("id", jobId);
  }

  return data;
};

// ── Recruitment Reporting ──
export const fetchRecruitmentStats = async () => {
  const [jobsResult, appsResult, offersResult] = await Promise.all([
    supabase.from("jobs").select("id, is_active, is_internal, sector, lga, created_at"),
    supabase.from("job_applications").select("id, status, created_at"),
    supabase.from("job_offers").select("id, status"),
  ]);

  const jobs = jobsResult.data || [];
  const apps = appsResult.data || [];
  const offers = offersResult.data || [];

  return {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.is_active).length,
    internalJobs: jobs.filter(j => j.is_internal).length,
    externalJobs: jobs.filter(j => !j.is_internal).length,
    totalApplications: apps.length,
    pendingApplications: apps.filter(a => a.status === "pending").length,
    shortlistedApplications: apps.filter(a => a.status === "shortlisted").length,
    totalOffers: offers.length,
    acceptedOffers: offers.filter(o => o.status === "accepted").length,
    jobsBySector: jobs.reduce((acc, j) => { acc[j.sector || "Other"] = (acc[j.sector || "Other"] || 0) + 1; return acc; }, {} as Record<string, number>),
  };
};
