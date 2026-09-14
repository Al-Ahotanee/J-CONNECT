import { supabase } from "@/integrations/supabase/client";

// ==========================================
// COURSES (Instructor/Creator)
// ==========================================
export const fetchInstructorCourses = async (instructorId: string) => {
  const { data, error } = await supabase
    .from("courses")
    .select("*, lessons(id), enrollments(id)")
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createCourse = async (course: {
  title: string;
  description?: string;
  category?: string;
  level?: string;
  duration?: string;
  is_free?: boolean;
  price?: number;
  thumbnail_url?: string;
  instructor_id: string;
}) => {
  const { data, error } = await supabase.from("courses").insert(course).select().single();
  if (error) throw error;
  return data;
};

export const updateCourse = async (courseId: string, updates: Record<string, unknown>) => {
  const { data, error } = await supabase.from("courses").update(updates as any).eq("id", courseId).select().single();
  if (error) throw error;
  return data;
};

export const deleteCourse = async (courseId: string) => {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw error;
};

// ==========================================
// LESSONS
// ==========================================
export const createLesson = async (lesson: {
  course_id: string;
  title: string;
  content?: string;
  video_url?: string;
  duration?: string;
  order_index: number;
}) => {
  const { data, error } = await supabase.from("lessons").insert(lesson).select().single();
  if (error) throw error;
  return data;
};

export const updateLesson = async (lessonId: string, updates: Record<string, unknown>) => {
  const { data, error } = await supabase.from("lessons").update(updates as any).eq("id", lessonId).select().single();
  if (error) throw error;
  return data;
};

export const deleteLesson = async (lessonId: string) => {
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw error;
};

// ==========================================
// COURSE MATERIALS
// ==========================================
export const fetchCourseMaterials = async (courseId: string) => {
  const { data, error } = await supabase
    .from("course_materials")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index");
  if (error) throw error;
  return data;
};

export const uploadCourseMaterial = async (file: File, courseId: string, lessonId?: string) => {
  const ext = file.name.split('.').pop();
  const filePath = `${courseId}/${Date.now()}-${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from("course-materials")
    .upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from("course-materials")
    .getPublicUrl(filePath);

  const { data, error } = await supabase.from("course_materials").insert({
    course_id: courseId,
    lesson_id: lessonId || null,
    title: file.name,
    file_url: publicUrl,
    file_type: ext || 'unknown',
    file_size: file.size,
  }).select().single();
  if (error) throw error;
  return data;
};

export const deleteCourseMaterial = async (materialId: string) => {
  const { error } = await supabase.from("course_materials").delete().eq("id", materialId);
  if (error) throw error;
};

// ==========================================
// LESSON COMPLETIONS
// ==========================================
export const markLessonComplete = async (userId: string, lessonId: string, courseId: string) => {
  const { data, error } = await supabase
    .from("lesson_completions")
    .upsert({ user_id: userId, lesson_id: lessonId, course_id: courseId }, { onConflict: "user_id,lesson_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const fetchLessonCompletions = async (userId: string, courseId: string) => {
  const { data, error } = await supabase
    .from("lesson_completions")
    .select("lesson_id")
    .eq("user_id", userId)
    .eq("course_id", courseId);
  if (error) throw error;
  return new Set(data?.map(d => d.lesson_id) || []);
};

// ==========================================
// DISCUSSIONS
// ==========================================
export const fetchDiscussions = async (courseId: string) => {
  const { data, error } = await supabase
    .from("discussion_posts")
    .select("*")
    .eq("course_id", courseId)
    .is("parent_id", null)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data?.length) return [];

  const userIds = [...new Set(data.map(d => d.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, passport_photo_url").in("user_id", userIds);
  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
  return data.map(d => ({ ...d, profiles: profileMap.get(d.user_id) || null }));
};

export const createDiscussionPost = async (post: {
  course_id: string;
  user_id: string;
  content: string;
  lesson_id?: string;
  parent_id?: string;
}) => {
  const { data, error } = await supabase.from("discussion_posts").insert(post).select().single();
  if (error) throw error;
  return data;
};

// ==========================================
// CERTIFICATES
// ==========================================
export const fetchUserCertificates = async (userId: string) => {
  const { data, error } = await supabase
    .from("certificates")
    .select("*, courses(title, category)")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const issueCertificate = async (cert: {
  user_id: string;
  course_id: string;
  enrollment_id?: string;
  issued_by?: string;
}) => {
  const certNumber = `JC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const verifyUrl = `${window.location.origin}/verify-certificate/${certNumber}`;

  const { data, error } = await supabase.from("certificates").insert({
    ...cert,
    certificate_number: certNumber,
    qr_verification_url: verifyUrl,
  }).select().single();
  if (error) throw error;
  return data;
};

export const verifyCertificate = async (certNumber: string) => {
  const { data, error } = await supabase
    .from("certificates")
    .select("*, courses(title, category)")
    .eq("certificate_number", certNumber)
    .single();
  if (error) throw error;

  // Manual profile join
  if (data?.user_id) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", data.user_id).single();
    return { ...data, profiles: profile || null };
  }
  return data;
};

// ==========================================
// QUIZZES (Creator)
// ==========================================
export const createQuiz = async (quiz: {
  title: string;
  description?: string;
  course_id: string;
  created_by: string;
  pass_score?: number;
  time_limit_minutes?: number;
}) => {
  const { data, error } = await supabase.from("quizzes").insert(quiz).select().single();
  if (error) throw error;
  return data;
};

export const updateQuiz = async (quizId: string, updates: Record<string, unknown>) => {
  const { data, error } = await supabase.from("quizzes").update(updates as any).eq("id", quizId).select().single();
  if (error) throw error;
  return data;
};

export const addQuizQuestion = async (question: {
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  order_index: number;
}) => {
  const { data, error } = await supabase.from("quiz_questions").insert(question).select().single();
  if (error) throw error;
  return data;
};

export const deleteQuizQuestion = async (questionId: string) => {
  const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
  if (error) throw error;
};

export const fetchCourseQuizzes = async (courseId: string) => {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*, quiz_questions(id)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

// ==========================================
// ADMIN
// ==========================================
export const fetchAllCoursesAdmin = async () => {
  const { data, error } = await supabase
    .from("courses")
    .select("*, lessons(id), enrollments(id)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const fetchAllEnrollmentsAdmin = async () => {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*, courses(title, category)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data?.length) return [];

  const userIds = [...new Set(data.map(e => e.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
  return data.map(e => ({ ...e, profiles: profileMap.get(e.user_id) || null }));
};

export const fetchInstructorProfiles = async () => {
  // Get all users with instructor role
  const { data: instructorRoles, error: err1 } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "instructor");
  if (err1) throw err1;
  
  if (!instructorRoles?.length) return [];
  
  const userIds = instructorRoles.map(r => r.user_id);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("user_id", userIds);
  if (error) throw error;
  return data;
};
