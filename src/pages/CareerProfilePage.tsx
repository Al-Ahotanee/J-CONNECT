import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProfile, fetchEducation } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  User, Briefcase, GraduationCap, Award, MapPin, Mail, Phone,
  Globe, Plus, Trash2, ExternalLink, Code, Image, FileText, Star,
} from "lucide-react";
import { toast } from "sonner";

const CareerProfilePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({ title: "", description: "", project_url: "", category: "", tags: "" });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const { data: education } = useQuery({
    queryKey: ["education", user?.id],
    queryFn: () => fetchEducation(user!.id),
    enabled: !!user,
  });

  const { data: portfolio } = useQuery({
    queryKey: ["portfolio", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("portfolio_items").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: endorsements } = useQuery({
    queryKey: ["endorsements", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("skill_endorsements").select("*, endorser:endorser_id(full_name)").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: certificates } = useQuery({
    queryKey: ["userCerts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("certificates").select("*, courses(title, category, level)").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: appStats } = useQuery({
    queryKey: ["appStats", user?.id],
    queryFn: async () => {
      const { data: apps } = await supabase.from("job_applications").select("status").eq("user_id", user!.id);
      return {
        total: apps?.length || 0,
        shortlisted: apps?.filter(a => a.status === "shortlisted").length || 0,
        offered: apps?.filter(a => a.status === "offered").length || 0,
      };
    },
    enabled: !!user,
  });

  if (!user) return <Navigate to="/login" />;

  const handleAddPortfolio = async () => {
    try {
      const { error } = await supabase.from("portfolio_items").insert({
        user_id: user.id,
        title: portfolioForm.title,
        description: portfolioForm.description || null,
        project_url: portfolioForm.project_url || null,
        category: portfolioForm.category || null,
        tags: portfolioForm.tags ? portfolioForm.tags.split(",").map(t => t.trim()) : [],
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      setShowAddPortfolio(false);
      setPortfolioForm({ title: "", description: "", project_url: "", category: "", tags: "" });
      toast.success("Portfolio item added!");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeletePortfolio = async (id: string) => {
    await supabase.from("portfolio_items").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    toast.success("Removed");
  };

  const completionScore = Math.min(100, (
    (profile?.full_name ? 10 : 0) + (profile?.email ? 10 : 0) + (profile?.phone ? 10 : 0) +
    (profile?.lga ? 10 : 0) + (profile?.skills?.length ? 15 : 0) + (profile?.work_experience ? 15 : 0) +
    (education?.length ? 10 : 0) + (profile?.cv_file_url ? 10 : 0) + (portfolio?.length ? 10 : 0)
  ));

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-primary/10 via-card to-secondary/10 rounded-2xl p-6 border border-border relative overflow-hidden">
        <div className="flex items-start gap-5">
          {profile?.passport_photo_url ? (
            <img src={profile.passport_photo_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-background shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center border-2 border-background">
              <User className="h-10 w-10 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-foreground">{profile?.full_name || "Your Name"}</h1>
            <p className="text-sm text-muted-foreground">{profile?.job_title || "Add your title"} {profile?.current_employer ? `at ${profile.current_employer}` : ""}</p>
            <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-muted-foreground">
              {profile?.lga && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.lga}, Jigawa</span>}
              {profile?.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{profile.email}</span>}
              {profile?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{profile.phone}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-display font-bold text-primary">{completionScore}%</div>
            <div className="text-[10px] text-muted-foreground">Profile Score</div>
            <Progress value={completionScore} className="h-1.5 w-24 mt-1" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Applications", value: appStats?.total || 0, icon: FileText },
          { label: "Shortlisted", value: appStats?.shortlisted || 0, icon: Star },
          { label: "Certificates", value: certificates?.length || 0, icon: Award },
          { label: "Portfolio", value: portfolio?.length || 0, icon: Code },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 border border-border text-center">
            <s.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-xl font-bold text-foreground">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Skills */}
      {profile?.skills?.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="font-display text-sm font-semibold text-foreground mb-3">Skills & Expertise</h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
          </div>
        </div>
      )}

      {/* Endorsements */}
      {endorsements && endorsements.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Star className="h-4 w-4" /> Skill Endorsements ({endorsements.length})</h2>
          <div className="space-y-2">
            {Object.entries(
              endorsements.reduce((acc: Record<string, any[]>, e: any) => {
                if (!acc[e.skill]) acc[e.skill] = [];
                acc[e.skill].push(e);
                return acc;
              }, {})
            ).map(([skill, items]) => (
              <div key={skill} className="bg-muted rounded-lg p-3 flex items-center justify-between">
                <div>
                  <Badge variant="secondary" className="text-xs">{skill}</Badge>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(items as any[]).map((e: any) => (
                      <span key={e.id} className="text-[10px] text-muted-foreground">{e.endorser?.full_name || "Someone"}</span>
                    ))}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">{(items as any[]).length} endorsement{(items as any[]).length > 1 ? "s" : ""}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work Experience */}
      {profile?.work_experience && (
        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Briefcase className="h-4 w-4" /> Experience</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.work_experience}</p>
        </div>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Education</h2>
          <div className="space-y-3">
            {education.map((edu: any) => (
              <div key={edu.id} className="bg-muted rounded-lg p-3">
                <p className="text-sm font-semibold text-foreground">{edu.institution}</p>
                <p className="text-xs text-muted-foreground">{edu.qualification_type} — {edu.field_of_study} ({edu.year_of_graduation})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificates */}
      {certificates && certificates.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Award className="h-4 w-4" /> Certifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {certificates.map((cert: any) => (
              <div key={cert.id} className="bg-muted rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{cert.courses?.title}</p>
                  <p className="text-[10px] text-muted-foreground">{cert.certificate_number} • {new Date(cert.issued_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2"><Code className="h-4 w-4" /> Portfolio</h2>
          <Dialog open={showAddPortfolio} onOpenChange={setShowAddPortfolio}>
            <DialogTrigger asChild><Button variant="outline" size="sm" className="h-7 text-xs"><Plus className="h-3 w-3 mr-0.5" /> Add Project</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add Portfolio Item</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Title *</Label><Input value={portfolioForm.title} onChange={e => setPortfolioForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea value={portfolioForm.description} onChange={e => setPortfolioForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Project URL</Label><Input value={portfolioForm.project_url} onChange={e => setPortfolioForm(p => ({ ...p, project_url: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Category</Label><Input value={portfolioForm.category} onChange={e => setPortfolioForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Web Development" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Tags (comma-separated)</Label><Input value={portfolioForm.tags} onChange={e => setPortfolioForm(p => ({ ...p, tags: e.target.value }))} /></div>
                <Button className="w-full" onClick={handleAddPortfolio} disabled={!portfolioForm.title}>Add Project</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {portfolio && portfolio.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {portfolio.map((item: any) => (
              <div key={item.id} className="bg-muted rounded-lg p-4 group">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                    {item.category && <Badge variant="outline" className="text-[9px] h-5 mt-1">{item.category}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    {item.project_url && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={item.project_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDeletePortfolio(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {item.description && <p className="text-xs text-muted-foreground mt-2">{item.description}</p>}
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((t: string) => <Badge key={t} variant="secondary" className="text-[9px] h-4">{t}</Badge>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No portfolio items yet. Add your projects to showcase your work!</p>
        )}
      </div>
    </div>
  );
};

export default CareerProfilePage;
