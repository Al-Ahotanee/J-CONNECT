import { supabase } from "@/integrations/supabase/client";

// Helper: fetch profiles for a list of user_ids
const fetchProfilesForUsers = async (userIds: string[]) => {
  if (!userIds.length) return new Map<string, any>();
  const { data } = await supabase.from("profiles").select("user_id, full_name, lga, passport_photo_url, sector, skills").in("user_id", userIds);
  return new Map((data || []).map(p => [p.user_id, p]));
};

// ==========================================
// MENTORS
// ==========================================
export const fetchMentorsWithProfiles = async () => {
  const { data: mentors, error } = await supabase.from("mentors").select("*").eq("is_active", true);
  if (error) throw error;
  if (!mentors?.length) return [];

  const profileMap = await fetchProfilesForUsers(mentors.map(m => m.user_id));
  return mentors.map(m => ({ ...m, profiles: profileMap.get(m.user_id) || null }));
};

// ==========================================
// MENTORSHIP MAPPINGS
// ==========================================
export const fetchMyMentorshipsDetailed = async (userId: string) => {
  const { data: mappings, error } = await supabase
    .from("mentorship_mappings")
    .select("*, mentors(*)")
    .eq("mentee_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!mappings?.length) return [];

  const mentorUserIds = mappings.map(m => m.mentors?.user_id).filter(Boolean) as string[];
  const profileMap = await fetchProfilesForUsers(mentorUserIds);
  return mappings.map(m => ({
    ...m,
    mentors: m.mentors ? { ...m.mentors, profiles: profileMap.get(m.mentors.user_id) || null } : null,
  }));
};

export const fetchMentorMentees = async (mentorTableId: string) => {
  const { data: mappings, error } = await supabase
    .from("mentorship_mappings")
    .select("*")
    .eq("mentor_id", mentorTableId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!mappings?.length) return [];

  const menteeIds = mappings.map(m => m.mentee_id);
  const profileMap = await fetchProfilesForUsers(menteeIds);
  return mappings.map(m => ({ ...m, profiles: profileMap.get(m.mentee_id) || null }));
};

export const updateMentorshipStatus = async (mappingId: string, status: string, notes?: string) => {
  const updates: Record<string, unknown> = { status };
  if (notes) updates.notes = notes;
  const { error } = await supabase.from("mentorship_mappings").update(updates as any).eq("id", mappingId);
  if (error) throw error;
};

export const requestMentorChange = async (currentMappingId: string, newMentorId: string, menteeId: string) => {
  await supabase.from("mentorship_mappings").update({ status: "ended" }).eq("id", currentMappingId);
  const { error } = await supabase.from("mentorship_mappings").insert({
    mentor_id: newMentorId,
    mentee_id: menteeId,
    notes: "Mentor change requested",
  });
  if (error) throw error;
};

// ==========================================
// AUTO-MAPPING
// ==========================================
export const autoMatchMentor = async (userId: string, profile: any) => {
  const { data: mentors, error } = await supabase.from("mentors").select("*").eq("is_active", true);
  if (error) throw error;
  if (!mentors?.length) return null;

  const profileMap = await fetchProfilesForUsers(mentors.map(m => m.user_id));

  const scored = mentors.map(m => {
    let score = 0;
    const mProfile = profileMap.get(m.user_id);
    
    if (profile?.sector && m.category?.toLowerCase().includes(profile.sector.toLowerCase())) score += 3;
    if (profile?.lga && mProfile?.lga === profile.lga) score += 2;
    if (profile?.skills && mProfile?.skills) {
      const overlap = profile.skills.filter((s: string) =>
        mProfile.skills.some((ms: string) => ms.toLowerCase() === s.toLowerCase())
      );
      score += overlap.length;
    }
    const availability = (m.max_mentees || 5) - (m.current_mentees || 0);
    if (availability > 0) score += 1;
    else score -= 10;
    
    return { mentor: { ...m, profiles: mProfile }, score, matchReason: `Score: ${score}` };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score <= 0) return null;

  const { data: mapping, error: mapErr } = await supabase
    .from("mentorship_mappings")
    .insert({
      mentor_id: best.mentor.id,
      mentee_id: userId,
      auto_matched: true,
      match_reason: best.matchReason,
    })
    .select()
    .single();
  if (mapErr) throw mapErr;
  return { mapping, mentor: best.mentor };
};

// ==========================================
// SESSIONS
// ==========================================
export const createSession = async (session: {
  mapping_id: string;
  mentor_id: string;
  mentee_id: string;
  title: string;
  notes?: string;
  session_type?: string;
  scheduled_at?: string;
}) => {
  const { data, error } = await supabase.from("mentorship_sessions").insert(session).select().single();
  if (error) throw error;
  return data;
};

export const fetchSessions = async (mappingId: string) => {
  const { data, error } = await supabase
    .from("mentorship_sessions")
    .select("*")
    .eq("mapping_id", mappingId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const completeSession = async (sessionId: string, notes?: string) => {
  const { error } = await supabase.from("mentorship_sessions").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    notes,
  }).eq("id", sessionId);
  if (error) throw error;
};

// ==========================================
// GOALS
// ==========================================
export const createGoal = async (goal: {
  mapping_id: string;
  title: string;
  description?: string;
  target_date?: string;
  created_by: string;
}) => {
  const { data, error } = await supabase.from("mentorship_goals").insert(goal).select().single();
  if (error) throw error;
  return data;
};

export const fetchGoals = async (mappingId: string) => {
  const { data, error } = await supabase
    .from("mentorship_goals")
    .select("*")
    .eq("mapping_id", mappingId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const updateGoalStatus = async (goalId: string, status: string) => {
  const updates: Record<string, unknown> = { status };
  if (status === "completed") updates.completed_at = new Date().toISOString();
  const { error } = await supabase.from("mentorship_goals").update(updates as any).eq("id", goalId);
  if (error) throw error;
};

// ==========================================
// RATINGS
// ==========================================
export const rateMentor = async (rating: {
  mentor_id: string;
  mentee_id: string;
  mapping_id: string;
  rating: number;
  feedback?: string;
}) => {
  const { data, error } = await supabase.from("mentor_ratings").insert(rating).select().single();
  if (error) throw error;
  return data;
};

export const fetchMentorRatings = async (mentorId: string) => {
  const { data, error } = await supabase
    .from("mentor_ratings")
    .select("*")
    .eq("mentor_id", mentorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

// ==========================================
// GROUP CHATROOMS
// ==========================================
export const fetchChatrooms = async () => {
  const { data, error } = await supabase
    .from("group_chatrooms")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createChatroom = async (room: {
  name: string;
  description?: string;
  topic: string;
  created_by: string;
  mentor_id?: string;
}) => {
  const { data, error } = await supabase.from("group_chatrooms").insert(room).select().single();
  if (error) throw error;
  await supabase.from("chatroom_members").insert({ chatroom_id: data.id, user_id: room.created_by });
  return data;
};

export const joinChatroom = async (chatroomId: string, userId: string) => {
  const { error } = await supabase.from("chatroom_members").insert({ chatroom_id: chatroomId, user_id: userId });
  if (error) throw error;
};

export const leaveChatroom = async (chatroomId: string, userId: string) => {
  const { error } = await supabase.from("chatroom_members").delete().eq("chatroom_id", chatroomId).eq("user_id", userId);
  if (error) throw error;
};

export const fetchChatroomMessages = async (chatroomId: string) => {
  const { data, error } = await supabase
    .from("chatroom_messages")
    .select("*")
    .eq("chatroom_id", chatroomId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  
  const userIds = [...new Set(data?.map(m => m.user_id) || [])];
  if (!userIds.length) return data || [];
  
  const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, passport_photo_url").in("user_id", userIds);
  return data?.map(m => ({
    ...m,
    profile: profiles?.find(p => p.user_id === m.user_id),
  })) || [];
};

export const sendChatroomMessage = async (chatroomId: string, userId: string, content: string, fileUrl?: string, fileName?: string) => {
  const { error } = await supabase.from("chatroom_messages").insert({
    chatroom_id: chatroomId,
    user_id: userId,
    content,
    file_url: fileUrl || null,
    file_name: fileName || null,
  });
  if (error) throw error;
};

export const fetchMyChatrooms = async (userId: string) => {
  const { data: memberships, error } = await supabase
    .from("chatroom_members")
    .select("chatroom_id")
    .eq("user_id", userId);
  if (error) throw error;
  if (!memberships?.length) return [];
  
  const ids = memberships.map(m => m.chatroom_id);
  const { data: rooms, error: err2 } = await supabase
    .from("group_chatrooms")
    .select("*")
    .in("id", ids)
    .eq("is_active", true);
  if (err2) throw err2;
  return rooms || [];
};

// ==========================================
// FILE SHARING IN CHAT
// ==========================================
export const uploadChatFile = async (file: File, senderId: string) => {
  const filePath = `${senderId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("chat-files").upload(filePath, file);
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage.from("chat-files").getPublicUrl(filePath);
  return { url: publicUrl, name: file.name };
};

export const sendMessageWithFile = async (senderId: string, receiverId: string, content: string, fileUrl?: string, fileName?: string) => {
  const { error } = await supabase.from("messages").insert({
    sender_id: senderId,
    receiver_id: receiverId,
    content,
    file_url: fileUrl || null,
    file_name: fileName || null,
  });
  if (error) throw error;
};