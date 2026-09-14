import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRecruiterJobs, updateApplicationStatus, fetchUserRoles } from "@/lib/api";
import { createInternalJob, createInterviewInvitation, createJobOffer, fetchJobApplicationsWithProfiles } from "@/lib/recruitment-api";
import { supabase } from "@/integrations/supabase/client";
import { useVideoMeeting } from "@/hooks/useVideoMeeting";
import VideoMeeting from "@/components/VideoMeeting";
import { fetchProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JIGAWA_LGAS, SECTORS, QUALIFICATION_TYPES } from "@/lib/constants";
import {
  Plus, Users, Eye, CheckCircle, XCircle, Clock, FileText, Trash2,
  Briefcase, MessageCircle, Send, Calendar, Award, UserCheck, Video, Star,
} from "lucide-react";
import { toast } from "sonner";

const SavedCandidatesTab = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const { data: saved = [] } = useQuery({
    queryKey: ["savedCandidates", userId],
    queryFn: async () => {
      const { data: candidates } = await supabase.from("saved_candidates")
        .select("*")
        .eq("recruiter_id", userId).order("created_at", { ascending: false });
      if (!candidates?.length) return [];
      const candidateIds = [...new Set(candidates.map(c => c.candidate_id))];
      const { data: profiles } = await supabase.from("profiles")
        .select("user_id, full_name, email, phone, lga, skills, employment_status, passport_photo_url")
        .in("user_id", candidateIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return candidates.map(c => ({ ...c, profile: profileMap.get(c.candidate_id) || null }));
    },
  });

  const handleRemove = async (id: string) => {
    await supabase.from("saved_candidates").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["savedCandidates"] });
    toast.success("Removed from saved");
  };

  return (
    <div className="space-y-3">
      {saved.length > 0 ? saved.map((s: any) => (
        <div key={s.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {s.profile?.passport_photo_url ? (
              <img src={s.profile.passport_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{s.profile?.full_name || "Candidate"}</p>
              <p className="text-[11px] text-muted-foreground">{s.profile?.email} • {s.profile?.lga}</p>
              {s.profile?.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {s.profile.skills.slice(0, 4).map((sk: string) => (
                    <Badge key={sk} variant="secondary" className="text-[9px] h-4">{sk}</Badge>
                  ))}
                </div>
              )}
              {s.notes && <p className="text-[10px] text-muted-foreground mt-1 italic">"{s.notes}"</p>}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <a href={`/chat?user=${s.candidate_id}`}><MessageCircle className="h-3 w-3 mr-0.5" /> Chat</a>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(s.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )) : (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Users className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
          <p className="text-sm text-muted-foreground">No saved candidates yet. Save candidates from the Applicants tab.</p>
        </div>
      )}
    </div>
  );
};

const RecruiterPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [quizJobId, setQuizJobId] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const { meetingOpen, meetingRoom, meetingTitle, startMeeting, endMeeting } = useVideoMeeting(user?.id);

  const { data: recruiterProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const [newJob, setNewJob] = useState({
    title: "", description: "", company: "", location: "", lga: "",
    sector: "", employment_type: "Full-time", qualification_required: "",
    experience_level: "", salary_range: "", deadline: "", skills: "",
    location_scope: "LGA",
    custom_questions: [] as Array<{ question: string; type: string; required: boolean }>,
  });

  const [inviteData, setInviteData] = useState({ type: "interview", scheduled_at: "", notes: "" });
  const [offerData, setOfferData] = useState({ offer_details: "", salary_offered: "" });

  const [quizTitle, setQuizTitle] = useState("");
  const [quizTimeLimit, setQuizTimeLimit] = useState("30");
  const [quizPassScore, setQuizPassScore] = useState("50");
  const [questions, setQuestions] = useState<Array<{ question: string; options: string[]; correct_answer: number }>>([
    { question: "", options: ["", "", "", ""], correct_answer: 0 },
  ]);

  const { data: roles } = useQuery({ queryKey: ["userRoles", user?.id], queryFn: () => fetchUserRoles(user!.id), enabled: !!user });
  const isRecruiterOrAdmin = roles?.includes("recruiter") || roles?.includes("admin") || roles?.includes("super_admin");
  const { data: jobs } = useQuery({ queryKey: ["recruiterJobs", user?.id], queryFn: () => fetchRecruiterJobs(user!.id), enabled: !!user && !!isRecruiterOrAdmin });
  const { data: applications } = useQuery({
    queryKey: ["jobApplicationsWithProfiles", selectedJobId],
    queryFn: () => fetchJobApplicationsWithProfiles(selectedJobId!),
    enabled: !!selectedJobId,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !isRecruiterOrAdmin) return <Navigate to="/dashboard" />;

  const handleCreateJob = async () => {
    try {
      const { data, error } = await supabase.from("jobs").insert({
        posted_by: user.id, title: newJob.title, description: newJob.description, company: newJob.company,
        location: newJob.location || undefined, lga: newJob.lga || undefined, sector: newJob.sector || undefined,
        employment_type: newJob.employment_type || undefined, qualification_required: newJob.qualification_required || undefined,
        experience_level: newJob.experience_level || undefined, salary_range: newJob.salary_range || undefined,
        deadline: newJob.deadline || undefined, skills_required: newJob.skills ? newJob.skills.split(",").map(s => s.trim()) : undefined,
        is_internal: true, is_active: true,
        location_scope: newJob.location_scope,
        custom_questions: newJob.custom_questions.length > 0 ? newJob.custom_questions : undefined,
      }).select().single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["recruiterJobs"] });
      setShowCreateDialog(false);
      setNewJob({ title: "", description: "", company: "", location: "", lga: "", sector: "", employment_type: "Full-time", qualification_required: "", experience_level: "", salary_range: "", deadline: "", skills: "", location_scope: "LGA", custom_questions: [] });
      toast.success("Internal job posted!");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleStatusUpdate = async (appId: string, status: string) => {
    try {
      await updateApplicationStatus(appId, status);
      queryClient.invalidateQueries({ queryKey: ["jobApplicationsWithProfiles"] });
      toast.success(`Application ${status}`);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleInvite = async () => {
    if (!selectedApp || !selectedJobId) return;
    try {
      await createInterviewInvitation({
        job_id: selectedJobId, application_id: selectedApp.id,
        user_id: selectedApp.user_id, recruiter_id: user.id,
        type: inviteData.type, scheduled_at: inviteData.scheduled_at || undefined,
        notes: inviteData.notes || undefined,
      });
      toast.success(`${inviteData.type === "exam" ? "Exam" : "Interview"} invitation sent!`);
      setShowInviteDialog(false);
      setInviteData({ type: "interview", scheduled_at: "", notes: "" });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleOffer = async () => {
    if (!selectedApp || !selectedJobId) return;
    try {
      await createJobOffer({
        job_id: selectedJobId, application_id: selectedApp.id,
        user_id: selectedApp.user_id, recruiter_id: user.id,
        offer_details: offerData.offer_details || undefined,
        salary_offered: offerData.salary_offered || undefined,
      });
      await handleStatusUpdate(selectedApp.id, "offered");
      toast.success("Job offer sent!");
      setShowOfferDialog(false);
      setOfferData({ offer_details: "", salary_offered: "" });
    } catch (err: any) { toast.error(err.message); }
  };

  const addQuestion = () => setQuestions([...questions, { question: "", options: ["", "", "", ""], correct_answer: 0 }]);
  const removeQuestion = (idx: number) => setQuestions(questions.filter((_, i) => i !== idx));
  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    if (field === "question") updated[idx].question = value;
    else if (field === "correct_answer") updated[idx].correct_answer = value;
    setQuestions(updated);
  };
  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions]; updated[qIdx].options[oIdx] = value; setQuestions(updated);
  };

  const handleCreateQuiz = async () => {
    if (!quizJobId || !quizTitle || questions.length === 0) { toast.error("Fill quiz title and questions"); return; }
    for (const q of questions) {
      if (!q.question.trim()) { toast.error("All questions must have text"); return; }
      if (q.options.some(o => !o.trim())) { toast.error("All options must be filled"); return; }
    }
    try {
      const { data: quiz, error: quizErr } = await supabase.from("quizzes").insert({
        title: quizTitle, job_id: quizJobId, created_by: user.id,
        time_limit_minutes: parseInt(quizTimeLimit) || 30, pass_score: parseInt(quizPassScore) || 50, is_published: true,
      }).select().single();
      if (quizErr) throw quizErr;
      const questionsToInsert = questions.map((q, i) => ({
        quiz_id: quiz.id, question: q.question, options: q.options, correct_answer: q.correct_answer, order_index: i,
      }));
      const { error: qErr } = await supabase.from("quiz_questions").insert(questionsToInsert);
      if (qErr) throw qErr;
      toast.success("CBT Quiz created!");
      setShowQuizDialog(false);
      setQuizTitle(""); setQuizTimeLimit("30"); setQuizPassScore("50");
      setQuestions([{ question: "", options: ["", "", "", ""], correct_answer: 0 }]);
    } catch (err: any) { toast.error(err.message); }
  };

  const updateNewJob = (key: string, value: string) => setNewJob(prev => ({ ...prev, [key]: value }));

  // Compute actual applicant count from live data
  const totalApplicants = applications?.length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Recruiter Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Post internal jobs, manage candidates, conduct hiring</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild><Button variant="emerald" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Post Internal Job</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Post Internal Job</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground mb-3">This job will be fully managed inside J-Connect.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Title *</Label><Input value={newJob.title} onChange={e => updateNewJob("title", e.target.value)} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Description *</Label><Textarea value={newJob.description} onChange={e => updateNewJob("description", e.target.value)} rows={3} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Company *</Label><Input value={newJob.company} onChange={e => updateNewJob("company", e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location Scope *</Label>
                <Select value={newJob.location_scope} onValueChange={v => setNewJob(prev => ({ ...prev, location_scope: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LGA", "Statewide", "Senatorial Zone", "Nationwide", "Remote"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Location</Label><Input value={newJob.location} onChange={e => updateNewJob("location", e.target.value)} placeholder="e.g. Dutse, Jigawa" /></div>
              {newJob.location_scope === "LGA" && (
                <div className="space-y-1.5"><Label className="text-xs">LGA</Label><Select value={newJob.lga} onValueChange={v => updateNewJob("lga", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
              )}
              <div className="space-y-1.5"><Label className="text-xs">Sector</Label><Select value={newJob.sector} onValueChange={v => updateNewJob("sector", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Qualification</Label><Select value={newJob.qualification_required} onValueChange={v => updateNewJob("qualification_required", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{QUALIFICATION_TYPES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={newJob.employment_type} onValueChange={v => updateNewJob("employment_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Full-time", "Part-time", "Contract", "Internship"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Experience</Label><Select value={newJob.experience_level} onValueChange={v => updateNewJob("experience_level", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{["Entry Level", "Mid Level", "Senior", "Executive"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Salary</Label><Input value={newJob.salary_range} onChange={e => updateNewJob("salary_range", e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Deadline</Label><Input type="date" value={newJob.deadline} onChange={e => updateNewJob("deadline", e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Skills (comma separated)</Label><Input value={newJob.skills} onChange={e => updateNewJob("skills", e.target.value)} /></div>
            </div>

            {/* Custom Application Questions */}
            <div className="border border-border rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Custom Application Questions</h4>
                  <p className="text-[10px] text-muted-foreground">Add screening questions applicants must answer</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setNewJob(prev => ({ ...prev, custom_questions: [...prev.custom_questions, { question: "", type: "text", required: true }] }))}>
                  <Plus className="h-3 w-3 mr-0.5" /> Add Question
                </Button>
              </div>
              {newJob.custom_questions.map((cq, idx) => (
                <div key={idx} className="flex items-start gap-2 mb-2 bg-muted p-2.5 rounded-lg">
                  <div className="flex-1 space-y-1.5">
                    <Input placeholder="e.g. Do you have NYSC certificate?" value={cq.question} onChange={e => {
                      const updated = [...newJob.custom_questions]; updated[idx].question = e.target.value;
                      setNewJob(prev => ({ ...prev, custom_questions: updated }));
                    }} className="text-xs" />
                    <div className="flex gap-2">
                      <Select value={cq.type} onValueChange={v => {
                        const updated = [...newJob.custom_questions]; updated[idx].type = v;
                        setNewJob(prev => ({ ...prev, custom_questions: updated }));
                      }}>
                        <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="yes_no">Yes/No</SelectItem>
                          <SelectItem value="file">File Upload</SelectItem>
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <input type="checkbox" checked={cq.required} onChange={e => {
                          const updated = [...newJob.custom_questions]; updated[idx].required = e.target.checked;
                          setNewJob(prev => ({ ...prev, custom_questions: updated }));
                        }} /> Required
                      </label>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => {
                    setNewJob(prev => ({ ...prev, custom_questions: prev.custom_questions.filter((_, i) => i !== idx) }));
                  }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>

            <Button variant="emerald" className="w-full mt-3" onClick={handleCreateJob} disabled={!newJob.title || !newJob.description || !newJob.company}>Post Internal Job</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats - Recruiter only */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Jobs", value: jobs?.length || 0, icon: Briefcase },
          { label: "Active Jobs", value: jobs?.filter(j => j.is_active).length || 0, icon: CheckCircle },
          { label: "Applicants", value: selectedJobId ? totalApplicants : (jobs?.reduce((a, j) => a + (j.applicants_count || 0), 0) || 0), icon: Users },
          { label: "Shortlisted", value: applications?.filter(a => a.status === "shortlisted").length || 0, icon: UserCheck },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-soft border border-border text-center">
            <s.icon className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-xl font-display font-bold text-foreground">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="jobs">
        <TabsList className="flex-wrap">
          <TabsTrigger value="jobs">My Jobs</TabsTrigger>
          <TabsTrigger value="applicants">Applicants {selectedJobId && `(${totalApplicants})`}</TabsTrigger>
          <TabsTrigger value="pipeline">Hiring Pipeline</TabsTrigger>
          <TabsTrigger value="saved">Saved Candidates</TabsTrigger>
          <TabsTrigger value="cbt">CBT Tests</TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="mt-4">
          {jobs && jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm font-semibold text-foreground">{job.title}</h3>
                      <Badge variant="default" className="text-[10px] h-5">Internal</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{job.company} • {job.employment_type}</p>
                    <div className="flex gap-1.5 mt-1.5">
                      <Badge variant={job.is_active ? "outline" : "secondary"} className="text-[10px] h-5">{job.is_active ? "Active" : "Closed"}</Badge>
                      <Badge variant="outline" className="text-[10px] h-5">{job.applicants_count || 0} applicants</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setQuizJobId(job.id); setShowQuizDialog(true); }}>
                      <FileText className="h-3 w-3 mr-0.5" /> CBT
                    </Button>
                    <Button variant="emerald" size="sm" className="h-7 text-xs" onClick={() => setSelectedJobId(job.id)}>
                      <Eye className="h-3 w-3 mr-0.5" /> View Applicants
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Briefcase className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <p className="text-sm text-muted-foreground">No jobs posted yet.</p>
            </div>
          )}
        </TabsContent>

        {/* Applicants Tab - Fixed: uses profile from separate fetch */}
        <TabsContent value="applicants" className="mt-4">
          {selectedJobId ? (
            applications && applications.length > 0 ? (
              <div className="space-y-3">
                {applications.map((app: any) => {
                  const profile = app.profile;
                  return (
                    <div key={app.id} className="bg-card rounded-xl p-4 shadow-soft border border-border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground">{profile?.full_name || "Applicant"}</h4>
                          <p className="text-[11px] text-muted-foreground">{profile?.email} • {profile?.phone || "No phone"} • {profile?.lga || "No LGA"}</p>
                          {profile?.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {profile.skills.slice(0, 5).map((s: string) => <Badge key={s} variant="secondary" className="text-[10px] h-5">{s}</Badge>)}
                            </div>
                          )}
                          {app.cover_letter && <p className="text-[11px] text-muted-foreground mt-2 bg-muted p-2 rounded">{app.cover_letter}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5 items-end shrink-0">
                          <Badge variant={app.status === "shortlisted" ? "default" : app.status === "rejected" ? "destructive" : app.status === "offered" ? "default" : "secondary"} className="text-[10px]">
                            {app.status || "pending"}
                          </Badge>
                          <div className="flex gap-1">
                            <Button variant="emerald" size="icon" className="h-7 w-7" title="Shortlist" onClick={() => handleStatusUpdate(app.id, "shortlisted")}>
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" title="Invite" onClick={() => { setSelectedApp(app); setShowInviteDialog(true); }}>
                              <Calendar className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" title="Video Interview" onClick={() => startMeeting({
                              title: `Interview: ${(app as any).profiles?.full_name || "Candidate"}`,
                              meetingType: "interview",
                              relatedId: app.id,
                              participants: [user.id, app.user_id],
                            })}>
                              <Video className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" title="Send Offer" onClick={() => { setSelectedApp(app); setShowOfferDialog(true); }}>
                              <Award className="h-3 w-3" />
                            </Button>
                            <Button variant="destructive" size="icon" className="h-7 w-7" title="Reject" onClick={() => handleStatusUpdate(app.id, "rejected")}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" title="Save Candidate" onClick={async () => {
                              try {
                                await supabase.from("saved_candidates").insert({ recruiter_id: user.id, candidate_id: app.user_id });
                                toast.success("Candidate saved!");
                                queryClient.invalidateQueries({ queryKey: ["savedCandidates"] });
                              } catch { toast.error("Already saved or error"); }
                            }}>
                              <Star className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" asChild>
                            <a href={`/interview-chat?user=${app.user_id}`}><MessageCircle className="h-3 w-3 mr-0.5" /> Chat</a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-xl border border-border"><p className="text-sm text-muted-foreground">No applicants yet.</p></div>
            )
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Users className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <p className="text-sm text-muted-foreground">Select a job from "My Jobs" tab and click "View Applicants".</p>
            </div>
          )}
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { stage: "Applied", status: "pending", color: "border-muted-foreground/30" },
              { stage: "Shortlisted", status: "shortlisted", color: "border-primary/50" },
              { stage: "Interview/Exam", status: "interviewed", color: "border-secondary/50" },
              { stage: "Offered", status: "offered", color: "border-emerald-500/50" },
            ].map(col => {
              const stageApps = applications?.filter((a: any) => a.status === col.status) || [];
              return (
                <div key={col.stage} className={`bg-card rounded-xl p-4 shadow-soft border-2 ${col.color}`}>
                  <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">{col.stage}</h3>
                  <Badge variant="outline" className="text-[10px] mb-3">{stageApps.length}</Badge>
                  <div className="space-y-2">
                    {stageApps.map((app: any) => (
                      <div key={app.id} className="bg-muted rounded-lg p-2.5">
                        <p className="text-xs font-semibold text-foreground">{app.profile?.full_name || "Applicant"}</p>
                        <p className="text-[10px] text-muted-foreground">{app.profile?.email}</p>
                      </div>
                    ))}
                    {stageApps.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">No candidates</p>}
                  </div>
                </div>
              );
            })}
          </div>
          {!selectedJobId && <p className="text-xs text-muted-foreground text-center mt-4">Select a job to view its pipeline.</p>}
        </TabsContent>

        {/* Saved Candidates Tab */}
        <TabsContent value="saved" className="mt-4">
          <SavedCandidatesTab userId={user.id} />
        </TabsContent>

        {/* CBT Tab */}
        <TabsContent value="cbt" className="mt-4">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h2 className="font-display text-sm font-semibold text-foreground mb-1">CBT Examination System</h2>
            <p className="text-xs text-muted-foreground mb-3">Create computer-based tests for screening.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {jobs?.map(job => (
                <div key={job.id} className="bg-muted rounded-lg p-3">
                  <p className="text-xs font-semibold text-foreground">{job.title}</p>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] mt-2" onClick={() => { setQuizJobId(job.id); setShowQuizDialog(true); }}>
                    <Plus className="h-3 w-3 mr-0.5" /> Create Quiz
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Send Invitation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={inviteData.type} onValueChange={v => setInviteData(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interview">Interview (Chat)</SelectItem>
                  <SelectItem value="exam">CBT Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Schedule</Label>
              <Input type="datetime-local" value={inviteData.scheduled_at} onChange={e => setInviteData(p => ({ ...p, scheduled_at: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={inviteData.notes} onChange={e => setInviteData(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
            <Button variant="emerald" className="w-full" onClick={handleInvite}>
              <Send className="h-3.5 w-3.5 mr-1" /> Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Send Job Offer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Offering to: <strong>{selectedApp?.profile?.full_name}</strong></p>
            <div className="space-y-1.5">
              <Label className="text-xs">Salary</Label>
              <Input value={offerData.salary_offered} onChange={e => setOfferData(p => ({ ...p, salary_offered: e.target.value }))} placeholder="e.g. ₦150,000/month" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Details</Label>
              <Textarea value={offerData.offer_details} onChange={e => setOfferData(p => ({ ...p, offer_details: e.target.value }))} rows={3} />
            </div>
            <Button variant="emerald" className="w-full" onClick={handleOffer}>
              <Award className="h-3.5 w-3.5 mr-1" /> Send Offer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Create CBT Quiz</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-3"><Label className="text-xs">Title *</Label><Input value={quizTitle} onChange={e => setQuizTitle(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Time (min)</Label><Input type="number" value={quizTimeLimit} onChange={e => setQuizTimeLimit(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Pass Score (%)</Label><Input type="number" value={quizPassScore} onChange={e => setQuizPassScore(e.target.value)} /></div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground">Questions ({questions.length})</h3>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addQuestion}><Plus className="h-3 w-3 mr-0.5" /> Add</Button>
              </div>
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="bg-muted rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold">Q{qIdx + 1}</span>
                    {questions.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeQuestion(qIdx)}><Trash2 className="h-3 w-3" /></Button>}
                  </div>
                  <Input placeholder="Question" value={q.question} onChange={e => updateQuestion(qIdx, "question", e.target.value)} className="text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-1.5">
                        <input type="radio" name={`q-${qIdx}`} checked={q.correct_answer === oIdx} onChange={() => updateQuestion(qIdx, "correct_answer", oIdx)} className="shrink-0" />
                        <Input placeholder={`Option ${oIdx + 1}`} value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} className="text-xs" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="emerald" className="w-full" onClick={handleCreateQuiz}>Create Quiz</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Meeting Modal */}
      <VideoMeeting
        roomName={meetingRoom}
        displayName={recruiterProfile?.full_name || user?.email || "Recruiter"}
        title={meetingTitle}
        open={meetingOpen}
        onClose={endMeeting}
      />
    </div>
  );
};

export default RecruiterPage;
