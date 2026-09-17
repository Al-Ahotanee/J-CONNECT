import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyApplications, fetchProfile } from "@/lib/api";
import { fetchRecommendedJobs, fetchMyInvitations, fetchMyOffers, respondToOffer, applyForJobWithCount } from "@/lib/recruitment-api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase, Star, ClipboardList, Calendar, Award, MessageCircle,
  CheckCircle, XCircle, Clock, FileText, ExternalLink, ChevronRight,
  Sparkles, Building, MapPin, ThumbsUp, ThumbsDown, Target, Upload,
  User, GraduationCap, Phone, Mail, ChevronDown, Video,
} from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Under Review", color: "bg-accent text-accent-foreground", icon: Clock },
  shortlisted: { label: "Shortlisted", color: "bg-primary/10 text-primary", icon: CheckCircle },
  rejected: { label: "Not Selected", color: "bg-destructive/10 text-destructive", icon: XCircle },
  hired: { label: "Hired", color: "bg-primary text-primary-foreground", icon: Award },
  offered: { label: "Offer Received", color: "bg-secondary/10 text-secondary", icon: Star },
  interviewed: { label: "Interviewed", color: "bg-accent text-accent-foreground", icon: Calendar },
};

const JobSeekerDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const applyJobId = searchParams.get("apply");

  // Application form state - Microsoft style multi-section
  const [showApplyDialog, setShowApplyDialog] = useState(!!applyJobId);
  const [applyStep, setApplyStep] = useState(0);
  const [applicationData, setApplicationData] = useState({
    cover_letter: "",
    resume_file: null as File | null,
    additional_info: "",
    custom_answers: {} as Record<string, string>,
    uploaded_docs: {} as Record<string, File | null>,
  });
  const [submitting, setSubmitting] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ["myApplications", user?.id],
    queryFn: () => fetchMyApplications(user!.id),
    enabled: !!user,
  });

  const { data: recommendedJobs, isLoading: recLoading } = useQuery({
    queryKey: ["recommendedJobs", user?.id],
    queryFn: () => fetchRecommendedJobs(user!.id),
    enabled: !!user,
  });

  const { data: invitations } = useQuery({
    queryKey: ["myInvitations", user?.id],
    queryFn: () => fetchMyInvitations(user!.id),
    enabled: !!user,
  });

  const { data: offers } = useQuery({
    queryKey: ["myOffers", user?.id],
    queryFn: () => fetchMyOffers(user!.id),
    enabled: !!user,
  });

  // Fetch the job being applied to
  const { data: applyJob } = useQuery({
    queryKey: ["applyJob", applyJobId],
    queryFn: async () => {
      if (!applyJobId) return null;
      const { data, error } = await supabase.from("jobs").select("*").eq("id", applyJobId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!applyJobId,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const handleSubmitApplication = async () => {
    if (!applyJobId) return;
    setSubmitting(true);
    try {
      // Upload resume if provided
      let resumeUrl = profile?.cv_file_url || "";
      if (applicationData.resume_file) {
        const fileExt = applicationData.resume_file.name.split('.').pop();
        const filePath = `${user.id}/resume_${applyJobId}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage.from("application-documents").upload(filePath, applicationData.resume_file, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from("application-documents").getPublicUrl(filePath);
        resumeUrl = publicUrl;
      }

      // Upload any file-type custom question docs
      const docsList: Array<{ name: string; url: string }> = [];
      for (const [key, file] of Object.entries(applicationData.uploaded_docs)) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const filePath = `${user.id}/doc_${applyJobId}_${key}.${fileExt}`;
          const { error: upErr } = await supabase.storage.from("application-documents").upload(filePath, file, { upsert: true });
          if (!upErr) {
            const { data: { publicUrl } } = supabase.storage.from("application-documents").getPublicUrl(filePath);
            docsList.push({ name: file.name, url: publicUrl });
          }
        }
      }

      const { data, error } = await supabase.from("job_applications").insert({
        job_id: applyJobId,
        user_id: user.id,
        cover_letter: applicationData.cover_letter || null,
        resume_url: resumeUrl || null,
        custom_answers: applicationData.custom_answers,
        documents: docsList,
      }).select().single();
      if (error) throw error;

      // Increment applicants_count
      const { data: job } = await supabase.from("jobs").select("applicants_count").eq("id", applyJobId).single();
      if (job) {
        await supabase.from("jobs").update({ applicants_count: (job.applicants_count || 0) + 1 }).eq("id", applyJobId);
      }

      queryClient.invalidateQueries({ queryKey: ["myApplications"] });
      queryClient.invalidateQueries({ queryKey: ["recommendedJobs"] });
      setShowApplyDialog(false);
      setApplicationData({ cover_letter: "", resume_file: null, additional_info: "", custom_answers: {}, uploaded_docs: {} });
      setApplyStep(0);
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      if (err.message?.includes("duplicate")) toast.error("You have already applied for this job");
      else toast.error(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfferResponse = async (offerId: string, status: "accepted" | "declined") => {
    try {
      await respondToOffer(offerId, status);
      queryClient.invalidateQueries({ queryKey: ["myOffers"] });
      toast.success(`Offer ${status}!`);
    } catch (err: any) { toast.error(err.message); }
  };

  const pendingApps = applications?.filter(a => a.status === "pending").length || 0;
  const shortlistedApps = applications?.filter(a => a.status === "shortlisted").length || 0;
  const pendingInvitations = (invitations as any[])?.filter((i: any) => i.status === "pending").length || 0;
  const pendingOffers = (offers as any[])?.filter((o: any) => o.status === "pending").length || 0;

  const applicationSteps = [
    { title: "Review Your Info", icon: User },
    { title: "Resume & Cover Letter", icon: FileText },
    { title: "Additional Questions", icon: ClipboardList },
    { title: "Review & Submit", icon: CheckCircle },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Career Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome, {profile?.full_name || "Job Seeker"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/profile"><User className="h-3.5 w-3.5 mr-1" /> Profile</Link>
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link to="/jobs-board"><Briefcase className="h-3.5 w-3.5 mr-1" /> Browse Jobs</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Applications", value: applications?.length || 0, icon: ClipboardList },
          { label: "Shortlisted", value: shortlistedApps, icon: CheckCircle },
          { label: "Interviews", value: pendingInvitations, icon: Calendar },
          { label: "Offers", value: pendingOffers, icon: Award },
          { label: "Recommended", value: recommendedJobs?.length || 0, icon: Sparkles },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 border border-border text-center">
            <s.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-xl font-bold text-foreground">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Profile completion */}
      {profile && (profile.profile_completion || 0) < 70 && (
        <div className="bg-accent/50 border border-border rounded-xl p-4 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4" /> Complete Your Profile
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Better profiles get more job matches.</p>
            <Progress value={profile.profile_completion || 0} className="h-1.5 mt-2 max-w-xs" />
            <span className="text-[10px] text-muted-foreground">{profile.profile_completion || 0}% complete</span>
          </div>
          <Button variant="outline" size="sm" asChild><Link to="/profile">Update</Link></Button>
        </div>
      )}

      <Tabs defaultValue={applyJobId ? "recommended" : "recommended"}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="recommended" className="gap-1"><Sparkles className="h-3 w-3" /> Recommended</TabsTrigger>
          <TabsTrigger value="applications" className="gap-1"><ClipboardList className="h-3 w-3" /> Applications ({applications?.length || 0})</TabsTrigger>
          <TabsTrigger value="invitations" className="gap-1"><Calendar className="h-3 w-3" /> Interviews ({pendingInvitations})</TabsTrigger>
          <TabsTrigger value="offers" className="gap-1"><Award className="h-3 w-3" /> Offers ({pendingOffers})</TabsTrigger>
        </TabsList>

        {/* Recommended Jobs */}
        <TabsContent value="recommended" className="mt-4">
          <div className="bg-accent/30 rounded-xl p-4 border border-accent mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Smart Matches</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on your skills ({profile?.skills?.slice(0, 3).join(", ") || "none set"}), sector ({profile?.sector || "not set"}), and location ({profile?.lga || "not set"}).
            </p>
          </div>
          {recLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Finding matches...</div>
          ) : recommendedJobs && recommendedJobs.length > 0 ? (
            <div className="space-y-2">
              {recommendedJobs.map((job: any) => (
                <div key={job.id} className="bg-card rounded-lg p-4 border border-border hover:border-primary/20 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                        <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary">
                          {job._score}% Match
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{job.company} • {job.location || "Jigawa"} • {job.employment_type || "Full-time"}</p>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{job.description}</p>
                    </div>
                    <Button variant="default" size="sm" onClick={() => { setShowApplyDialog(true); /* set applyJobId via URL */ }}
                      asChild>
                      <Link to={`/job-seeker?apply=${job.id}`}>Apply</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Sparkles className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
              <h3 className="text-base font-semibold text-foreground">No Recommendations Yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Complete your profile to get personalized matches.</p>
              <Button variant="outline" size="sm" className="mt-3" asChild><Link to="/profile">Update Profile</Link></Button>
            </div>
          )}
        </TabsContent>

        {/* Applications */}
        <TabsContent value="applications" className="mt-4">
          {appsLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
          ) : applications && applications.length > 0 ? (
            <div className="space-y-2">
              {applications.map(app => {
                const job = (app as any).jobs;
                const cfg = statusConfig[app.status || "pending"] || statusConfig.pending;
                const StatusIcon = cfg.icon;
                return (
                  <div key={app.id} className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">{job?.title || "Job"}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{job?.company} • {job?.location}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                        {/* Progress bar */}
                        <div className="flex items-center gap-1 mt-3">
                          {["Applied", "Shortlisted", "Interview", "Offer", "Hired"].map((stage, i) => {
                            const stageOrder = ["pending", "shortlisted", "interviewed", "offered", "hired"];
                            const currentIdx = stageOrder.indexOf(app.status || "pending");
                            const isCompleted = i <= currentIdx;
                            const isRejected = app.status === "rejected";
                            return (
                              <div key={stage} className="flex items-center gap-0.5">
                                <div className={`w-2 h-2 rounded-full ${isRejected ? "bg-destructive/30" : isCompleted ? "bg-primary" : "bg-border"}`} />
                                {i < 4 && <div className={`w-5 h-0.5 ${isRejected ? "bg-destructive/20" : isCompleted ? "bg-primary" : "bg-border"}`} />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium shrink-0 ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" /> {cfg.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <ClipboardList className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
              <h3 className="text-base font-semibold">No Applications Yet</h3>
              <p className="text-xs text-muted-foreground mt-1">
                <Link to="/jobs-board" className="text-primary hover:underline">Browse jobs</Link> and start applying!
              </p>
            </div>
          )}
        </TabsContent>

        {/* Invitations */}
        <TabsContent value="invitations" className="mt-4">
          {(invitations as any[]) && (invitations as any[]).length > 0 ? (
            <div className="space-y-2">
              {(invitations as any[]).map((inv: any) => (
                <div key={inv.id} className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Badge variant={inv.type === "exam" ? "secondary" : "default"} className="text-[10px] h-5 mb-2 gap-1 inline-flex items-center">
                        {inv.type === "exam" ? (
                          <>
                            <FileText className="h-2.5 w-2.5" />
                            <span>CBT Exam</span>
                          </>
                        ) : (
                          <>
                            <Video className="h-2.5 w-2.5" />
                            <span>Interview</span>
                          </>
                        )}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] h-5 ml-1">{inv.status}</Badge>
                      {inv.scheduled_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(inv.scheduled_at).toLocaleString()}
                        </p>
                      )}
                      {inv.notes && <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">{inv.notes}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {inv.type === "interview" && inv.status === "pending" && (
                        <Button variant="default" size="sm" asChild>
                          <Link to={`/interview-chat?recruiter=${inv.recruiter_id}`}>
                            <MessageCircle className="h-3 w-3 mr-1" /> Join Chat
                          </Link>
                        </Button>
                      )}
                      {inv.type === "exam" && inv.status === "pending" && (
                        <Button variant="default" size="sm" asChild>
                          <Link to={`/jobs?exam=${inv.job_id}`}>
                            <FileText className="h-3 w-3 mr-1" /> Take Exam
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Calendar className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
              <h3 className="text-base font-semibold">No Invitations Yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Interview and exam invitations appear here.</p>
            </div>
          )}
        </TabsContent>

        {/* Offers */}
        <TabsContent value="offers" className="mt-4">
          {(offers as any[]) && (offers as any[]).length > 0 ? (
            <div className="space-y-2">
              {(offers as any[]).map((offer: any) => (
                <div key={offer.id} className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" /> Job Offer
                      </h3>
                      <p className="text-xs text-foreground font-medium mt-1">
                        {(offer as any).jobs?.title || "Position"} — {(offer as any).jobs?.company || ""}
                      </p>
                      {offer.salary_offered && <p className="text-xs text-foreground font-semibold mt-1">Salary: {offer.salary_offered}</p>}
                      {offer.offer_details && <p className="text-xs text-muted-foreground mt-2 bg-muted p-3 rounded">{offer.offer_details}</p>}
                      <p className="text-[10px] text-muted-foreground mt-2">Received: {new Date(offer.created_at).toLocaleDateString()}</p>
                      <Badge variant={offer.status === "accepted" ? "default" : offer.status === "declined" ? "destructive" : "secondary"} className="text-[10px] mt-2">
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </Badge>
                    </div>
                    {offer.status === "pending" && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button variant="default" size="sm" onClick={() => handleOfferResponse(offer.id, "accepted")}>
                          <ThumbsUp className="h-3 w-3 mr-1" /> Accept
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOfferResponse(offer.id, "declined")}>
                          <ThumbsDown className="h-3 w-3 mr-1" /> Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Award className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
              <h3 className="text-base font-semibold">No Offers Yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Job offers will appear here.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Microsoft-style Application Dialog */}
      <Dialog open={showApplyDialog && !!applyJob} onOpenChange={(open) => { if (!open) { setShowApplyDialog(false); setApplyStep(0); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Apply for {applyJob?.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">{applyJob?.company} • {applyJob?.location}</p>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 py-4 border-b border-border">
            {applicationSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => setApplyStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    i === applyStep ? "bg-primary text-primary-foreground" : i < applyStep ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <step.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
                {i < applicationSteps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {/* Step 0: Review Profile Info */}
          {applyStep === 0 && (
            <div className="space-y-4 py-4">
              <h3 className="text-sm font-semibold">Your Information</h3>
              <p className="text-xs text-muted-foreground">This information from your profile will be shared with the recruiter.</p>
              <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Name</span>
                  <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Email</span>
                  <p className="text-sm font-medium text-foreground">{profile?.email}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Phone</span>
                  <p className="text-sm font-medium text-foreground">{profile?.phone || "Not set"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Location</span>
                  <p className="text-sm font-medium text-foreground">{profile?.lga || "Not set"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-muted-foreground uppercase">Skills</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile?.skills?.map((s: string) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>) || <span className="text-xs text-muted-foreground">No skills set</span>}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                <Link to="/profile" className="text-primary hover:underline">Update your profile</Link> if any information is outdated.
              </p>
              <Button className="w-full" onClick={() => setApplyStep(1)}>Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          )}

          {/* Step 1: Resume & Cover Letter */}
          {applyStep === 1 && (
            <div className="space-y-4 py-4">
              <h3 className="text-sm font-semibold">Resume & Cover Letter</h3>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Upload Resume / CV</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground mb-2">
                    {applicationData.resume_file ? applicationData.resume_file.name : "Drop your resume here or click to browse"}
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    id="resume-upload"
                    onChange={e => setApplicationData(prev => ({ ...prev, resume_file: e.target.files?.[0] || null }))}
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('resume-upload')?.click()}>
                    Choose File
                  </Button>
                  {profile?.cv_file_url && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Or use your existing CV from profile
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Cover Letter</Label>
                <Textarea
                  placeholder="Tell the recruiter why you're a great fit for this role..."
                  value={applicationData.cover_letter}
                  onChange={e => setApplicationData(prev => ({ ...prev, cover_letter: e.target.value }))}
                  rows={6}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setApplyStep(0)}>Back</Button>
                <Button className="flex-1" onClick={() => setApplyStep(2)}>Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* Step 2: Custom Questions from Recruiter */}
          {applyStep === 2 && (
            <div className="space-y-4 py-4">
              <h3 className="text-sm font-semibold">Screening Questions</h3>
              {(applyJob as any)?.custom_questions && (applyJob as any).custom_questions.length > 0 ? (
                <div className="space-y-4">
                  {(applyJob as any).custom_questions.map((cq: any, idx: number) => (
                    <div key={idx} className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        {cq.question} {cq.required && <span className="text-destructive">*</span>}
                      </Label>
                      {cq.type === "text" && (
                        <Input
                          value={applicationData.custom_answers[`q${idx}`] || ""}
                          onChange={e => setApplicationData(prev => ({ ...prev, custom_answers: { ...prev.custom_answers, [`q${idx}`]: e.target.value } }))}
                          className="text-sm"
                        />
                      )}
                      {cq.type === "textarea" && (
                        <Textarea
                          value={applicationData.custom_answers[`q${idx}`] || ""}
                          onChange={e => setApplicationData(prev => ({ ...prev, custom_answers: { ...prev.custom_answers, [`q${idx}`]: e.target.value } }))}
                          rows={3} className="text-sm"
                        />
                      )}
                      {cq.type === "yes_no" && (
                        <div className="flex gap-4">
                          {["Yes", "No"].map(opt => (
                            <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="radio" name={`cq-${idx}`} value={opt}
                                checked={applicationData.custom_answers[`q${idx}`] === opt}
                                onChange={() => setApplicationData(prev => ({ ...prev, custom_answers: { ...prev.custom_answers, [`q${idx}`]: opt } }))}
                              /> {opt}
                            </label>
                          ))}
                        </div>
                      )}
                      {cq.type === "file" && (
                        <div className="border border-dashed border-border rounded-lg p-3 text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">
                            {applicationData.uploaded_docs[`q${idx}`]?.name || "No file selected"}
                          </p>
                          <input type="file" className="hidden" id={`cq-file-${idx}`}
                            onChange={e => setApplicationData(prev => ({ ...prev, uploaded_docs: { ...prev.uploaded_docs, [`q${idx}`]: e.target.files?.[0] || null } }))}
                          />
                          <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => document.getElementById(`cq-file-${idx}`)?.click()}>
                            <Upload className="h-3 w-3 mr-1" /> Choose File
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Why are you interested in this role?</Label>
                  <Textarea
                    placeholder="Share your motivation and relevant experience..."
                    value={applicationData.additional_info}
                    onChange={e => setApplicationData(prev => ({ ...prev, additional_info: e.target.value }))}
                    rows={4} className="text-sm"
                  />
                </div>
              )}
              {applyJob?.qualification_required && (
                <div className="bg-accent/30 p-3 rounded-lg">
                  <p className="text-xs text-foreground font-medium">Required Qualification: {applyJob.qualification_required}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Make sure you meet this requirement.</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setApplyStep(1)}>Back</Button>
                <Button className="flex-1" onClick={() => setApplyStep(3)}>Review Application <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {applyStep === 3 && (
            <div className="space-y-4 py-4">
              <h3 className="text-sm font-semibold">Review Your Application</h3>

              <div className="space-y-3">
                <div className="bg-muted p-3 rounded-lg">
                  <span className="text-[10px] uppercase text-muted-foreground font-medium">Position</span>
                  <p className="text-sm font-semibold text-foreground">{applyJob?.title}</p>
                  <p className="text-xs text-muted-foreground">{applyJob?.company}</p>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <span className="text-[10px] uppercase text-muted-foreground font-medium">Applicant</span>
                  <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>

                {applicationData.resume_file && (
                  <div className="bg-muted p-3 rounded-lg">
                    <span className="text-[10px] uppercase text-muted-foreground font-medium">Resume</span>
                    <p className="text-xs text-foreground">{applicationData.resume_file.name}</p>
                  </div>
                )}

                {applicationData.cover_letter && (
                  <div className="bg-muted p-3 rounded-lg">
                    <span className="text-[10px] uppercase text-muted-foreground font-medium">Cover Letter</span>
                    <p className="text-xs text-muted-foreground line-clamp-3">{applicationData.cover_letter}</p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground">By submitting, you agree to share your profile information with the recruiter.</p>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setApplyStep(2)}>Back</Button>
                <Button className="flex-1" onClick={handleSubmitApplication} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobSeekerDashboardPage;
