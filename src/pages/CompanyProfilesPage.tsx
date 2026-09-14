import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserRoles } from "@/lib/api";
import { hasAnyRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Plus, Star, Globe, MapPin, Users, Briefcase, Edit, Eye, ThumbsUp, ThumbsDown, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

const CompanyProfilesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [reviewData, setReviewData] = useState({ rating: 5, title: "", pros: "", cons: "", is_current: false });

  const [form, setForm] = useState({
    company_name: "", description: "", industry: "", company_size: "",
    founded_year: "", website: "", location: "", lga: "", culture: "", benefits: "",
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const isRecruiter = hasAnyRole(roles, ["super_admin", "admin", "recruitment_admin", "recruiter", "psb_recruiter", "subeb_recruiter", "employer"]);

  const { data: companies } = useQuery({
    queryKey: ["companyProfiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_profiles").select("*").order("company_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: myCompany } = useQuery({
    queryKey: ["myCompany", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("company_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user && isRecruiter,
  });

  const { data: reviews } = useQuery({
    queryKey: ["companyReviews", selectedCompany?.id],
    queryFn: async () => {
      const { data } = await supabase.from("company_reviews").select("*").eq("company_id", selectedCompany.id).order("created_at", { ascending: false });
      return data;
    },
    enabled: !!selectedCompany,
  });

  const { data: companyJobs } = useQuery({
    queryKey: ["companyJobs", selectedCompany?.company_name],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*").eq("company", selectedCompany.company_name).eq("is_active", true).limit(10);
      return data;
    },
    enabled: !!selectedCompany,
  });

  if (!user) return <Navigate to="/login" />;

  const handleCreateCompany = async () => {
    try {
      const { error } = await supabase.from("company_profiles").insert({
        user_id: user.id,
        company_name: form.company_name,
        description: form.description || null,
        industry: form.industry || null,
        company_size: form.company_size || null,
        founded_year: form.founded_year || null,
        website: form.website || null,
        location: form.location || null,
        lga: form.lga || null,
        culture: form.culture || null,
        benefits: form.benefits ? form.benefits.split(",").map(b => b.trim()) : [],
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["companyProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["myCompany"] });
      setShowCreateDialog(false);
      toast.success("Company profile created!");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSubmitReview = async () => {
    if (!selectedCompany) return;
    try {
      const { error } = await supabase.from("company_reviews").insert({
        company_id: selectedCompany.id,
        user_id: user.id,
        rating: reviewData.rating,
        title: reviewData.title || null,
        pros: reviewData.pros || null,
        cons: reviewData.cons || null,
        is_current_employee: reviewData.is_current,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["companyReviews"] });
      setReviewData({ rating: 5, title: "", pros: "", cons: "", is_current: false });
      toast.success("Review submitted!");
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Employer Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Explore companies, culture, benefits & open positions</p>
        </div>
        {isRecruiter && !myCompany && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Create Company Profile</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">Create Company Profile</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Company Name *</Label><Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Industry</Label><Input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} /></div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Size</Label>
                    <Select value={form.company_size} onValueChange={v => setForm(p => ({ ...p, company_size: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["1-10", "11-50", "51-200", "201-500", "500+"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Founded</Label><Input value={form.founded_year} onChange={e => setForm(p => ({ ...p, founded_year: e.target.value }))} placeholder="e.g. 2015" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Website</Label><Input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Location</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Culture</Label><Textarea value={form.culture} onChange={e => setForm(p => ({ ...p, culture: e.target.value }))} rows={2} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Benefits (comma-separated)</Label><Input value={form.benefits} onChange={e => setForm(p => ({ ...p, benefits: e.target.value }))} placeholder="HMO, Transport, 13th Month" /></div>
                <Button variant="default" className="w-full" onClick={handleCreateCompany} disabled={!form.company_name}>Create Profile</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Company Cards */}
      {companies && companies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company: any) => (
            <div key={company.id} className="bg-card rounded-xl p-5 border border-border hover:border-primary/30 transition-all cursor-pointer" onClick={() => setSelectedCompany(company)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{company.company_name}</h3>
                  <p className="text-[11px] text-muted-foreground">{company.industry || "General"} • {company.company_size || "N/A"} employees</p>
                </div>
              </div>
              {company.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{company.description}</p>}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {company.location && <Badge variant="outline" className="text-[9px] h-5"><MapPin className="h-2.5 w-2.5 mr-0.5" />{company.location}</Badge>}
                  {company.is_verified && <Badge variant="default" className="text-[9px] h-5"><CheckCircle className="h-2.5 w-2.5 mr-0.5" />Verified</Badge>}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Star className="h-3 w-3 text-yellow-500" /> {Number(company.rating || 0).toFixed(1)}
                </div>
              </div>
              {company.benefits?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {company.benefits.slice(0, 3).map((b: string) => <Badge key={b} variant="secondary" className="text-[9px] h-5">{b}</Badge>)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Building2 className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
          <h3 className="text-base font-semibold text-foreground">No Company Profiles Yet</h3>
          <p className="text-xs text-muted-foreground mt-1">Companies will appear here once recruiters create profiles</p>
        </div>
      )}

      {/* Company Detail Dialog */}
      <Dialog open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{selectedCompany?.company_name}</DialogTitle></DialogHeader>
          {selectedCompany && (
            <Tabs defaultValue="about">
              <TabsList>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="jobs">Open Jobs ({companyJobs?.length || 0})</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({reviews?.length || 0})</TabsTrigger>
              </TabsList>
              <TabsContent value="about" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">{selectedCompany.description || "No description provided."}</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Industry:</span> <span className="font-medium text-foreground">{selectedCompany.industry || "N/A"}</span></div>
                  <div><span className="text-muted-foreground">Size:</span> <span className="font-medium text-foreground">{selectedCompany.company_size || "N/A"}</span></div>
                  <div><span className="text-muted-foreground">Founded:</span> <span className="font-medium text-foreground">{selectedCompany.founded_year || "N/A"}</span></div>
                  <div><span className="text-muted-foreground">Location:</span> <span className="font-medium text-foreground">{selectedCompany.location || "N/A"}</span></div>
                  {selectedCompany.website && <div className="col-span-2"><span className="text-muted-foreground">Website:</span> <a href={selectedCompany.website} target="_blank" rel="noreferrer" className="text-primary hover:underline ml-1">{selectedCompany.website}</a></div>}
                </div>
                {selectedCompany.culture && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1">Culture</h4>
                    <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">{selectedCompany.culture}</p>
                  </div>
                )}
                {selectedCompany.benefits?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2">Benefits & Perks</h4>
                    <div className="flex flex-wrap gap-1">{selectedCompany.benefits.map((b: string) => <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>)}</div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="jobs" className="mt-4 space-y-2">
                {companyJobs && companyJobs.length > 0 ? companyJobs.map((job: any) => (
                  <div key={job.id} className="bg-muted rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-foreground">{job.title}</h4>
                    <p className="text-[11px] text-muted-foreground">{job.employment_type} • {job.location} • {job.salary_range || "Salary not specified"}</p>
                  </div>
                )) : <p className="text-xs text-muted-foreground text-center py-8">No open positions</p>}
              </TabsContent>
              <TabsContent value="reviews" className="mt-4 space-y-4">
                {/* Submit Review */}
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground">Write a Review</h4>
                  <div className="flex gap-1">{[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setReviewData(p => ({ ...p, rating: n }))} className={`${n <= reviewData.rating ? 'text-yellow-500' : 'text-muted-foreground/30'}`}>
                      <Star className="h-5 w-5 fill-current" />
                    </button>
                  ))}</div>
                  <Input placeholder="Review title" value={reviewData.title} onChange={e => setReviewData(p => ({ ...p, title: e.target.value }))} className="text-xs" />
                  <Textarea placeholder="What's great about working here?" value={reviewData.pros} onChange={e => setReviewData(p => ({ ...p, pros: e.target.value }))} rows={2} className="text-xs" />
                  <Textarea placeholder="What could be improved?" value={reviewData.cons} onChange={e => setReviewData(p => ({ ...p, cons: e.target.value }))} rows={2} className="text-xs" />
                  <Button size="sm" onClick={handleSubmitReview}>Submit Review</Button>
                </div>
                {reviews?.map((r: any) => (
                  <div key={r.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">{Array.from({length: 5}).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/20'}`} />)}</div>
                    {r.title && <h5 className="text-xs font-semibold text-foreground">{r.title}</h5>}
                    {r.pros && <p className="text-[11px] text-muted-foreground mt-1"><ThumbsUp className="h-3 w-3 inline mr-1 text-primary" />{r.pros}</p>}
                    {r.cons && <p className="text-[11px] text-muted-foreground mt-1"><ThumbsDown className="h-3 w-3 inline mr-1 text-destructive" />{r.cons}</p>}
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyProfilesPage;
