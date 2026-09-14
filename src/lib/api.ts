import { supabase } from "@/integrations/supabase/client";

// ==========================================
// PROFILES
// ==========================================
export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  if (error) throw error;
  return data;
};

export const updateProfile = async (userId: string, updates: Record<string, unknown>) => {
  const { data, error } = await supabase.from("profiles").update(updates as any).eq("user_id", userId).select().single();
  if (error) throw error;
  return data;
};

export const fetchAllProfiles = async (filters?: {
  lga?: string; gender?: string; employment_status?: string;
  qualification?: string; sector?: string; search?: string;
  age_min?: number; age_max?: number; senatorial_zone?: string;
  year_of_graduation?: string;
}) => {
  let query = supabase.from("profiles").select("*");

  if (filters?.lga) query = query.eq("lga", filters.lga);
  if (filters?.gender) query = query.eq("gender", filters.gender);
  if (filters?.employment_status) query = query.eq("employment_status", filters.employment_status);
  if (filters?.sector) query = query.eq("sector", filters.sector);
  if (filters?.search) query = query.ilike("full_name", `%${filters.search}%`);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;

  let results = data || [];

  // Fetch education separately for users that need it
  if (filters?.qualification || filters?.year_of_graduation) {
    const userIds = results.map(p => p.user_id);
    if (userIds.length > 0) {
      const { data: eduData } = await supabase.from("education").select("user_id, qualification_type, field_of_study, year_of_graduation").in("user_id", userIds);
      const eduMap = new Map<string, any[]>();
      (eduData || []).forEach(e => {
        if (!eduMap.has(e.user_id)) eduMap.set(e.user_id, []);
        eduMap.get(e.user_id)!.push(e);
      });
      results = results.map(p => ({ ...p, education: eduMap.get(p.user_id) || [] }));

      if (filters?.qualification) {
        results = results.filter(p =>
          (p as any).education?.some((e: any) => e.qualification_type === filters.qualification)
        );
      }
      if (filters?.year_of_graduation) {
        results = results.filter(p =>
          (p as any).education?.some((e: any) => e.year_of_graduation === filters.year_of_graduation)
        );
      }
    }
  }

  if (filters?.age_min || filters?.age_max) {
    const now = new Date();
    results = results.filter(p => {
      if (!p.date_of_birth) return false;
      const age = Math.floor((now.getTime() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (filters.age_min && age < filters.age_min) return false;
      if (filters.age_max && age > filters.age_max) return false;
      return true;
    });
  }
  if (filters?.senatorial_zone) {
    const { SENATORIAL_ZONES } = await import("@/lib/constants");
    const zoneLgas = SENATORIAL_ZONES[filters.senatorial_zone as keyof typeof SENATORIAL_ZONES] || [];
    results = results.filter(p => p.lga && (zoneLgas as readonly string[]).includes(p.lga));
  }

  return results;
};

export const adminUpdateProfile = async (profileId: string, updates: Record<string, unknown>) => {
  const { data, error } = await supabase.from("profiles").update(updates as any).eq("id", profileId).select().single();
  if (error) throw error;
  return data;
};

// ==========================================
// EDUCATION
// ==========================================
export const fetchEducation = async (userId: string) => {
  const { data, error } = await supabase.from("education").select("*").eq("user_id", userId);
  if (error) throw error;
  return data;
};

export const addEducation = async (record: {
  user_id: string; institution: string; qualification_type: string;
  field_of_study?: string; year_of_graduation?: string; grade?: string;
}) => {
  const { data, error } = await supabase.from("education").insert(record).select().single();
  if (error) throw error;
  return data;
};

export const deleteEducation = async (id: string) => {
  const { error } = await supabase.from("education").delete().eq("id", id);
  if (error) throw error;
};

// ==========================================
// JOBS
// ==========================================
export const fetchJobs = async (filters?: {
  sector?: string; lga?: string; employment_type?: string; search?: string;
}) => {
  let query = supabase.from("jobs").select("*").eq("is_active", true);
  if (filters?.sector) query = query.eq("sector", filters.sector);
  if (filters?.lga) query = query.eq("lga", filters.lga);
  if (filters?.employment_type) query = query.eq("employment_type", filters.employment_type);
  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createJob = async (job: {
  posted_by: string; title: string; description: string; company: string;
  location?: string; lga?: string; sector?: string; employment_type?: string;
  qualification_required?: string; experience_level?: string;
  skills_required?: string[]; salary_range?: string; deadline?: string;
  is_internal?: boolean;
}) => {
  const { data, error } = await supabase.from("jobs").insert(job).select().single();
  if (error) throw error;
  return data;
};

export const updateJob = async (jobId: string, updates: Record<string, unknown>) => {
  const { data, error } = await supabase.from("jobs").update(updates as any).eq("id", jobId).select().single();
  if (error) throw error;
  return data;
};

export const applyForJob = async (jobId: string, userId: string, coverLetter?: string) => {
  const { data, error } = await supabase.from("job_applications").insert({ job_id: jobId, user_id: userId, cover_letter: coverLetter });
  if (error) throw error;
  return data;
};

export const fetchMyApplications = async (userId: string) => {
  const { data, error } = await supabase.from("job_applications").select("*, jobs(*)").eq("user_id", userId);
  if (error) throw error;
  return data;
};

export const fetchJobApplications = async (jobId: string) => {
  const { data, error } = await supabase.from("job_applications")
    .select("*")
    .eq("job_id", jobId);
  if (error) throw error;
  return data;
};

export const updateApplicationStatus = async (applicationId: string, status: string) => {
  const { error } = await supabase.from("job_applications").update({ status }).eq("id", applicationId);
  if (error) throw error;
};

export const fetchRecruiterJobs = async (userId: string) => {
  const { data, error } = await supabase.from("jobs").select("*").eq("posted_by", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

// ==========================================
// MENTORSHIP (with manual profile joins)
// ==========================================
export const fetchMentors = async () => {
  const { data: mentors, error } = await supabase.from("mentors").select("*").eq("is_active", true);
  if (error) throw error;
  if (!mentors?.length) return [];

  const userIds = mentors.map(m => m.user_id);
  const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, lga, passport_photo_url").in("user_id", userIds);
  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
  return mentors.map(m => ({ ...m, profiles: profileMap.get(m.user_id) || null }));
};

export const requestMentorship = async (mentorId: string, menteeId: string) => {
  const { data, error } = await supabase.from("mentorship_mappings").insert({ mentor_id: mentorId, mentee_id: menteeId });
  if (error) throw error;
  return data;
};

export const fetchMyMentorships = async (userId: string) => {
  const { data: mappings, error } = await supabase.from("mentorship_mappings").select("*, mentors(*)").eq("mentee_id", userId);
  if (error) throw error;
  if (!mappings?.length) return [];

  // Get profiles for mentor user_ids
  const mentorUserIds = mappings.map(m => m.mentors?.user_id).filter(Boolean) as string[];
  if (!mentorUserIds.length) return mappings;
  const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, passport_photo_url").in("user_id", mentorUserIds);
  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
  return mappings.map(m => ({
    ...m,
    mentors: m.mentors ? { ...m.mentors, profiles: profileMap.get(m.mentors.user_id) || null } : null,
  }));
};

// ==========================================
// MESSAGES
// ==========================================
export const fetchMessages = async (userId: string, otherId: string) => {
  const { data, error } = await supabase.from("messages").select("*")
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
};

export const sendMessage = async (senderId: string, receiverId: string, content: string) => {
  const { data, error } = await supabase.from("messages").insert({ sender_id: senderId, receiver_id: receiverId, content });
  if (error) throw error;
  return data;
};

// ==========================================
// COURSES & LEARNING
// ==========================================
export const fetchCourses = async (filters?: { category?: string; level?: string; search?: string; }) => {
  let query = supabase.from("courses").select("*").eq("is_published", true);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.level) query = query.eq("level", filters.level);
  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const enrollInCourse = async (userId: string, courseId: string) => {
  const { data, error } = await supabase.from("enrollments").insert({ user_id: userId, course_id: courseId });
  if (error) throw error;
  return data;
};

export const fetchMyEnrollments = async (userId: string) => {
  const { data, error } = await supabase.from("enrollments").select("*, courses(*)").eq("user_id", userId);
  if (error) throw error;
  return data;
};

export const fetchLessons = async (courseId: string) => {
  const { data, error } = await supabase.from("lessons").select("*").eq("course_id", courseId).order("order_index");
  if (error) throw error;
  return data;
};

export const updateEnrollment = async (enrollmentId: string, updates: Record<string, unknown>) => {
  const { error } = await supabase.from("enrollments").update(updates as any).eq("id", enrollmentId);
  if (error) throw error;
};

// ==========================================
// QUIZZES & CBT
// ==========================================
export const fetchQuiz = async (quizId: string) => {
  const { data: quiz, error } = await supabase.from("quizzes").select("*").eq("id", quizId).single();
  if (error) throw error;
  const { data: questions } = await supabase.from("quiz_questions_public").select("*").eq("quiz_id", quizId).order("order_index");
  return { ...quiz, quiz_questions: questions || [] };
};

export const submitQuizAttempt = async (attempt: {
  quiz_id: string; user_id: string; answers: Record<string, number>;
  score: number; passed: boolean;
}) => {
  const { data, error } = await supabase.from("quiz_attempts").insert({
    ...attempt, completed_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return data;
};

export const fetchQuizAttempts = async (quizId: string, userId: string) => {
  const { data, error } = await supabase.from("quiz_attempts")
    .select("*").eq("quiz_id", quizId).eq("user_id", userId);
  if (error) throw error;
  return data;
};

// ==========================================
// NOTIFICATIONS
// ==========================================
export const fetchNotifications = async (userId: string) => {
  const { data, error } = await supabase.from("notifications").select("*")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return data;
};

export const markNotificationRead = async (id: string) => {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
};

// ==========================================
// ROLES
// ==========================================
export const fetchUserRoles = async (userId: string) => {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return data?.map(r => r.role) || [];
};

// ==========================================
// SEARCH
// ==========================================
export const globalSearch = async (query: string) => {
  const [profiles, jobs, courses] = await Promise.all([
    supabase.from("profiles").select("id, full_name, lga, employment_status").ilike("full_name", `%${query}%`).limit(5),
    supabase.from("jobs").select("id, title, company").eq("is_active", true).ilike("title", `%${query}%`).limit(5),
    supabase.from("courses").select("id, title, category").eq("is_published", true).ilike("title", `%${query}%`).limit(5),
  ]);

  // Fetch mentors separately with manual profile join
  const { data: mentorData } = await supabase.from("mentors").select("id, category, user_id").eq("is_active", true).limit(5);
  let mentorsWithProfiles: any[] = [];
  if (mentorData?.length) {
    const userIds = mentorData.map(m => m.user_id);
    const { data: mentorProfiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    const profileMap = new Map((mentorProfiles || []).map(p => [p.user_id, p]));
    mentorsWithProfiles = mentorData.map(m => ({ ...m, profiles: profileMap.get(m.user_id) || null }));
  }

  return {
    profiles: profiles.data || [],
    jobs: jobs.data || [],
    courses: courses.data || [],
    mentors: mentorsWithProfiles,
  };
};