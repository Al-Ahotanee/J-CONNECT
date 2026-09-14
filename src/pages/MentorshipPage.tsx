import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProfile } from "@/lib/api";
import {
  fetchMentorsWithProfiles, fetchMyMentorshipsDetailed, autoMatchMentor,
  updateMentorshipStatus, fetchGoals, createGoal, updateGoalStatus,
  fetchSessions, createSession, completeSession, rateMentor,
  fetchChatrooms, joinChatroom, leaveChatroom, fetchMyChatrooms, createChatroom,
} from "@/lib/mentorship-api";
import { requestMentorship } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useVideoMeeting } from "@/hooks/useVideoMeeting";
import VideoMeeting from "@/components/VideoMeeting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search, Users, Star, MessageCircle, Award, UserCheck, Target,
  CheckCircle, Clock, Plus, Sparkles, BookOpen, ArrowRight,
  Heart, Shield, TrendingUp, XCircle, RefreshCw, Flag, Video,
} from "lucide-react";
import { toast } from "sonner";
import { MENTOR_CATEGORIES, SKILL_CATEGORIES } from "@/lib/constants";

const MentorshipPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [autoMatching, setAutoMatching] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<any>(null);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", description: "", target_date: "" });
  const [sessionForm, setSessionForm] = useState({ title: "", notes: "" });
  const [ratingForm, setRatingForm] = useState({ rating: 5, feedback: "" });
  const { meetingOpen, meetingRoom, meetingTitle, startMeeting, endMeeting } = useVideoMeeting(user?.id);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const { data: mentors, isLoading } = useQuery({
    queryKey: ["mentorsDetailed"],
    queryFn: fetchMentorsWithProfiles,
    enabled: !!user,
  });

  const { data: myMentorships, refetch: refetchMentorships } = useQuery({
    queryKey: ["myMentorshipsDetailed", user?.id],
    queryFn: () => fetchMyMentorshipsDetailed(user!.id),
    enabled: !!user,
  });

  const { data: chatrooms } = useQuery({
    queryKey: ["chatrooms"],
    queryFn: fetchChatrooms,
    enabled: !!user,
  });

  const { data: myChatrooms, refetch: refetchMyChatrooms } = useQuery({
    queryKey: ["myChatrooms", user?.id],
    queryFn: () => fetchMyChatrooms(user!.id),
    enabled: !!user,
  });

  const { data: goals } = useQuery({
    queryKey: ["mentorshipGoals", selectedMapping?.id],
    queryFn: () => fetchGoals(selectedMapping!.id),
    enabled: !!selectedMapping,
  });

  const { data: sessions } = useQuery({
    queryKey: ["mentorshipSessions", selectedMapping?.id],
    queryFn: () => fetchSessions(selectedMapping!.id),
    enabled: !!selectedMapping,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const activeMentorships = myMentorships?.filter(m => m.status === "active") || [];
  const pendingMentorships = myMentorships?.filter(m => m.status === "pending") || [];
  const myChatroomIds = new Set(myChatrooms?.map(r => r.id) || []);

  const handleRequest = async (mentorId: string) => {
    setRequestingId(mentorId);
    try {
      await requestMentorship(mentorId, user.id);
      toast.success("Mentorship request sent!");
      refetchMentorships();
    } catch (err: any) {
      if (err.message?.includes("duplicate")) toast.info("You already have a mentorship with this mentor");
      else toast.error(err.message || "Failed to send request");
    } finally { setRequestingId(null); }
  };

  const handleAutoMatch = async () => {
    setAutoMatching(true);
    try {
      const result = await autoMatchMentor(user.id, profile);
      if (result) {
        toast.success(`Auto-matched with ${(result.mentor as any).profiles?.full_name || "a mentor"}!`);
        refetchMentorships();
      } else {
        toast.info("No suitable mentor found. Try browsing manually.");
      }
    } catch (err: any) {
      if (err.message?.includes("duplicate")) toast.info("You already have a mentorship mapping");
      else toast.error(err.message || "Auto-match failed");
    } finally { setAutoMatching(false); }
  };

  const handleEndMentorship = async (mappingId: string) => {
    try {
      await updateMentorshipStatus(mappingId, "ended");
      toast.success("Mentorship ended");
      refetchMentorships();
      setSelectedMapping(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateGoal = async () => {
    if (!selectedMapping) return;
    try {
      await createGoal({
        mapping_id: selectedMapping.id,
        ...goalForm,
        created_by: user.id,
      });
      toast.success("Goal created!");
      setGoalForm({ title: "", description: "", target_date: "" });
      setShowGoalDialog(false);
      queryClient.invalidateQueries({ queryKey: ["mentorshipGoals"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      await updateGoalStatus(goalId, "completed");
      toast.success("Goal completed!");
      queryClient.invalidateQueries({ queryKey: ["mentorshipGoals"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateSession = async () => {
    if (!selectedMapping) return;
    const mentor = (selectedMapping as any).mentors;
    try {
      await createSession({
        mapping_id: selectedMapping.id,
        mentor_id: mentor?.user_id || "",
        mentee_id: user.id,
        ...sessionForm,
      });
      toast.success("Session logged!");
      setSessionForm({ title: "", notes: "" });
      setShowSessionDialog(false);
      queryClient.invalidateQueries({ queryKey: ["mentorshipSessions"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRateMentor = async () => {
    if (!selectedMapping) return;
    const mentor = (selectedMapping as any).mentors;
    try {
      await rateMentor({
        mentor_id: mentor?.id,
        mentee_id: user.id,
        mapping_id: selectedMapping.id,
        rating: ratingForm.rating,
        feedback: ratingForm.feedback,
      });
      toast.success("Rating submitted!");
      setRatingForm({ rating: 5, feedback: "" });
      setShowRatingDialog(false);
    } catch (err: any) {
      if (err.message?.includes("duplicate")) toast.info("You already rated this mentor");
      else toast.error(err.message);
    }
  };

  const handleJoinChatroom = async (roomId: string) => {
    try {
      await joinChatroom(roomId, user.id);
      toast.success("Joined chatroom!");
      refetchMyChatrooms();
    } catch (err: any) {
      if (err.message?.includes("duplicate")) toast.info("Already a member");
      else toast.error(err.message);
    }
  };

  const handleLeaveChatroom = async (roomId: string) => {
    try {
      await leaveChatroom(roomId, user.id);
      toast.success("Left chatroom");
      refetchMyChatrooms();
    } catch (err: any) { toast.error(err.message); }
  };

  const filteredMentors = mentors?.filter((m) => {
    const p = (m as any).profiles;
    const matchSearch = !search || p?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.category?.toLowerCase().includes(search.toLowerCase()) ||
      m.specialization?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || m.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const completedGoals = goals?.filter(g => g.status === "completed").length || 0;
  const totalGoals = goals?.length || 0;
  const goalProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // ─── Mentorship Detail View ───
  if (selectedMapping) {
    const mentor = (selectedMapping as any).mentors;
    const mentorProfile = mentor?.profiles;
    return (
      <div className="p-6 space-y-6">
        <Button variant="outline" size="sm" onClick={() => setSelectedMapping(null)}>← Back to Mentorship</Button>

        <div className="bg-hero-gradient rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">{mentorProfile?.full_name?.[0] || "M"}</span>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-primary-foreground">{mentorProfile?.full_name || "Mentor"}</h1>
              <p className="text-primary-foreground/70 text-sm">{mentor?.category} • {mentor?.specialization || "General"}</p>
              <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-[10px] mt-1">
                {selectedMapping.status === "active" ? "Active Mentorship" : selectedMapping.status}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-primary-foreground/10 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-primary-foreground">{sessions?.length || 0}</div>
              <div className="text-[10px] text-primary-foreground/60">Sessions</div>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-primary-foreground">{completedGoals}/{totalGoals}</div>
              <div className="text-[10px] text-primary-foreground/60">Goals</div>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl p-3 text-center">
              <Progress value={goalProgress} className="h-2 mt-1" />
              <div className="text-[10px] text-primary-foreground/60 mt-1">{goalProgress}% Progress</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" className="bg-primary text-primary-foreground" asChild>
            <Link to="/chat"><MessageCircle className="h-4 w-4 mr-1" /> Chat with Mentor</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => startMeeting({
            title: `Session with ${mentorProfile?.full_name || "Mentor"}`,
            meetingType: "mentorship",
            relatedId: selectedMapping.id,
            participants: [user.id, mentor?.user_id].filter(Boolean),
          })}>
            <Video className="h-4 w-4 mr-1" /> Video Call
          </Button>
          <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Log Session</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Mentorship Session</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Session Title *</Label><Input placeholder="e.g. Career planning discussion" value={sessionForm.title} onChange={e => setSessionForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Session summary..." value={sessionForm.notes} onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))} /></div>
                <Button className="w-full bg-primary text-primary-foreground" onClick={handleCreateSession} disabled={!sessionForm.title}>Log Session</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Target className="h-4 w-4 mr-1" /> Add Goal</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Set Mentorship Goal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Goal Title *</Label><Input placeholder="e.g. Complete Python course" value={goalForm.title} onChange={e => setGoalForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Details..." value={goalForm.description} onChange={e => setGoalForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Target Date</Label><Input type="date" value={goalForm.target_date} onChange={e => setGoalForm(p => ({ ...p, target_date: e.target.value }))} /></div>
                <Button className="w-full bg-primary text-primary-foreground" onClick={handleCreateGoal} disabled={!goalForm.title}>Create Goal</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Star className="h-4 w-4 mr-1" /> Rate Mentor</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Rate Your Mentor</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} onClick={() => setRatingForm(p => ({ ...p, rating: r }))}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${ratingForm.rating >= r ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <Star className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2"><Label>Feedback</Label><Textarea placeholder="Your experience..." value={ratingForm.feedback} onChange={e => setRatingForm(p => ({ ...p, feedback: e.target.value }))} /></div>
                <Button className="w-full bg-primary text-primary-foreground" onClick={handleRateMentor}>Submit Rating</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/20" onClick={() => handleEndMentorship(selectedMapping.id)}>
            <XCircle className="h-4 w-4 mr-1" /> End Mentorship
          </Button>
        </div>

        <Tabs defaultValue="goals" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="goals">Goals ({totalGoals})</TabsTrigger>
            <TabsTrigger value="sessions">Sessions ({sessions?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="goals" className="space-y-3">
            {goals && goals.length > 0 ? goals.map(g => (
              <div key={g.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${g.status === "completed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {g.status === "completed" ? <CheckCircle className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">{g.title}</h4>
                  {g.description && <p className="text-[11px] text-muted-foreground">{g.description}</p>}
                  {g.target_date && <p className="text-[10px] text-muted-foreground mt-1">Target: {new Date(g.target_date).toLocaleDateString()}</p>}
                </div>
                {g.status !== "completed" && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleCompleteGoal(g.id)}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Complete
                  </Button>
                )}
              </div>
            )) : (
              <div className="text-center py-8 bg-card rounded-xl border border-border">
                <Target className="mx-auto text-muted-foreground/20 mb-2 h-8 w-8" />
                <p className="text-sm text-muted-foreground">No goals set yet. Add your first goal!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-3">
            {sessions && sessions.length > 0 ? sessions.map(s => (
              <div key={s.id} className="bg-card rounded-xl p-4 shadow-soft border border-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                  <Badge variant={s.status === "completed" ? "default" : "outline"} className="text-[10px]">{s.status}</Badge>
                </div>
                {s.notes && <p className="text-[11px] text-muted-foreground mt-1">{s.notes}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">{new Date(s.created_at).toLocaleDateString()}</p>
              </div>
            )) : (
              <div className="text-center py-8 bg-card rounded-xl border border-border">
                <Clock className="mx-auto text-muted-foreground/20 mb-2 h-8 w-8" />
                <p className="text-sm text-muted-foreground">No sessions logged yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <VideoMeeting roomName={meetingRoom} displayName={profile?.full_name || user?.email || "User"} title={meetingTitle} open={meetingOpen} onClose={endMeeting} />
      </div>
    );
  }

  // ─── Main Mentorship Page ───
  return (
    <div className="p-6 space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6 md:p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-5 w-5 text-primary-foreground" />
              <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">Trailblazer</Badge>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">Mentorship Program</h1>
            <p className="text-primary-foreground/70 mt-1 text-sm">Connect with experienced Trailblazers to guide your career journey.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Active Mentors", value: activeMentorships.length, icon: UserCheck },
            { label: "Pending", value: pendingMentorships.length, icon: Clock },
            { label: "Available", value: mentors?.length || 0, icon: Users },
            { label: "Group Rooms", value: chatrooms?.length || 0, icon: MessageCircle },
          ].map((stat) => (
            <div key={stat.label} className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-3">
              <stat.icon className="h-4 w-4 text-primary-foreground/70 mb-1" />
              <div className="text-xl font-display font-bold text-primary-foreground">{stat.value}</div>
              <div className="text-[10px] text-primary-foreground/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="my-mentors" className="space-y-4">
        <TabsList className="bg-card border border-border flex-wrap">
          <TabsTrigger value="my-mentors">My Mentors ({activeMentorships.length})</TabsTrigger>
          <TabsTrigger value="browse">Browse Mentors</TabsTrigger>
          <TabsTrigger value="groups">Group Mentorship</TabsTrigger>
        </TabsList>

        {/* ─── My Mentors Tab ─── */}
        <TabsContent value="my-mentors" className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" className="bg-secondary text-secondary-foreground" onClick={handleAutoMatch} disabled={autoMatching}>
              <Sparkles className="h-4 w-4 mr-1" /> {autoMatching ? "Matching..." : "Auto-Match Me"}
            </Button>
          </div>

          {activeMentorships.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMentorships.map((mapping) => {
                const mentor = (mapping as any).mentors;
                const mentorProfile = mentor?.profiles;
                return (
                  <div key={mapping.id} className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all cursor-pointer" onClick={() => setSelectedMapping(mapping)}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{mentorProfile?.full_name?.[0] || "M"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-sm font-semibold text-foreground truncate">{mentorProfile?.full_name || "Mentor"}</h3>
                        <p className="text-[10px] text-muted-foreground">{mentor?.category} • {mentor?.specialization || "General"}</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Active</Badge>
                    </div>
                    {(mapping as any).auto_matched && (
                      <Badge variant="outline" className="text-[10px] mb-2"><Sparkles className="h-3 w-3 mr-1" /> Auto-matched</Badge>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]" asChild onClick={(e) => e.stopPropagation()}>
                        <Link to="/chat"><MessageCircle className="h-3 w-3 mr-1" /> Chat</Link>
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); setSelectedMapping(mapping); }}>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <UserCheck className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <h3 className="font-display text-sm font-semibold text-foreground">No Active Mentors</h3>
              <p className="text-xs text-muted-foreground mt-1">Use Auto-Match or browse mentors to get started.</p>
            </div>
          )}

          {pendingMentorships.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Pending Requests</h3>
              <div className="space-y-2">
                {pendingMentorships.map((m) => {
                  const mentor = (m as any).mentors;
                  return (
                    <div key={m.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-sm font-bold text-muted-foreground">{mentor?.profiles?.full_name?.[0] || "?"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{mentor?.profiles?.full_name || "Mentor"}</p>
                        <p className="text-[10px] text-muted-foreground">{mentor?.category}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Pending</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Browse Mentors Tab ─── */}
        <TabsContent value="browse" className="space-y-4">
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search mentors by name, category..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {MENTOR_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading mentors...</div>
          ) : filteredMentors && filteredMentors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMentors.map((mentor) => {
                const p = (mentor as any).profiles;
                const alreadyMapped = myMentorships?.some(m => (m as any).mentors?.id === mentor.id);
                return (
                  <div key={mentor.id} className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      {p?.passport_photo_url ? (
                        <img src={p.passport_photo_url} alt="" className="w-11 h-11 rounded-xl object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{p?.full_name?.[0] || "M"}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-semibold text-foreground truncate">{p?.full_name || "Mentor"}</h3>
                        <p className="text-[10px] text-muted-foreground">{p?.lga && `${p.lga} LGA`}</p>
                      </div>
                    </div>
                    <div className="space-y-2 mb-3">
                      <Badge variant="secondary" className="text-[10px]">{mentor.category}</Badge>
                      {mentor.specialization && <p className="text-xs text-muted-foreground">{mentor.specialization}</p>}
                      {mentor.bio && <p className="text-xs text-foreground line-clamp-2">{mentor.bio}</p>}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {mentor.years_of_experience || 0} yrs exp</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {mentor.current_mentees}/{mentor.max_mentees} mentees</span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-primary text-primary-foreground"
                      onClick={() => handleRequest(mentor.id)}
                      disabled={requestingId === mentor.id || alreadyMapped || (mentor.current_mentees || 0) >= (mentor.max_mentees || 5)}
                    >
                      {alreadyMapped ? "Already Connected" : requestingId === mentor.id ? "Sending..." : <><Heart className="h-3 w-3 mr-1" /> Request Mentorship</>}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Users className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
              <h3 className="font-display text-base font-semibold text-foreground">No Mentors Found</h3>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or category filter.</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Group Mentorship Tab ─── */}
        <TabsContent value="groups" className="space-y-4">
          <p className="text-sm text-muted-foreground">Join topic-based group mentoring rooms to learn and interact with mentors and peers.</p>

          {chatrooms && chatrooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {chatrooms.map((room: any) => {
                const isMember = myChatroomIds.has(room.id);
                return (
                  <div key={room.id} className="bg-card rounded-xl p-5 shadow-soft border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-sm font-semibold text-foreground truncate">{room.name}</h3>
                        <Badge variant="outline" className="text-[10px]">{room.topic}</Badge>
                      </div>
                    </div>
                    {room.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{room.description}</p>}
                    {isMember ? (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-8 text-xs bg-primary text-primary-foreground" asChild>
                          <Link to={`/chat?room=${room.id}`}><MessageCircle className="h-3 w-3 mr-1" /> Open Chat</Link>
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleLeaveChatroom(room.id)}>Leave</Button>
                      </div>
                    ) : (
                      <Button size="sm" className="w-full h-8 text-xs bg-secondary text-secondary-foreground" onClick={() => handleJoinChatroom(room.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Join Room
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <MessageCircle className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <h3 className="font-display text-sm font-semibold text-foreground">No Group Rooms Yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Group mentoring rooms will be created by mentors and admins.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MentorshipPage;
