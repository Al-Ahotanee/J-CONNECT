import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { applyForJob } from "@/lib/api";
import { fetchAllJobs, fetchRecommendedJobs } from "@/lib/recruitment-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JIGAWA_LGAS, SECTORS, QUALIFICATION_TYPES } from "@/lib/constants";
import {
  Search, MapPin, Briefcase, Clock, Building, ChevronRight, Filter,
  Globe, Lock, Star, ExternalLink, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const JobCard = ({ job, user, onApply }: { job: any; user: any; onApply: (jobId: string, coverLetter: string) => void }) => {
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const isExternal = !job.is_internal && job.external_url;

  const handleApply = async () => {
    setApplying(true);
    try {
      await onApply(job.id, coverLetter);
      setCoverLetter("");
    } catch {
      // handled in parent
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display text-base font-semibold text-foreground">{job.title}</h3>
            <Badge variant={job.is_internal ? "default" : "secondary"} className="text-[10px] h-5 shrink-0">
              {job.is_internal ? <><Lock className="h-2.5 w-2.5 mr-0.5" /> Internal</> : <><Globe className="h-2.5 w-2.5 mr-0.5" /> External</>}
            </Badge>
            {job._score > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 shrink-0 border-secondary text-secondary">
                <Star className="h-2.5 w-2.5 mr-0.5" /> {job._score}% Match
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Building className="h-3 w-3" /> {job.company}</span>
            {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>}
            {job.employment_type && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.employment_type}</span>}
            {job.sector && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.sector}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {job.skills_required?.slice(0, 4).map((skill: string) => (
              <Badge key={skill} variant="secondary" className="text-[10px] h-5">{skill}</Badge>
            ))}
            {job.qualification_required && <Badge variant="outline" className="text-[10px] h-5">{job.qualification_required}</Badge>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {job.salary_range && <span className="text-xs font-semibold text-foreground">{job.salary_range}</span>}
          {job.deadline && <span className="text-[10px] text-muted-foreground">Deadline: {new Date(job.deadline).toLocaleDateString()}</span>}

          {isExternal ? (
            <Button variant="outline" size="sm" asChild>
              <a href={job.external_url} target="_blank" rel="noopener noreferrer">
                Apply External <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="emerald" size="sm">
                  Apply <ChevronRight className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Apply for {job.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{job.company} • {job.location}</p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Cover Letter (Optional)</label>
                    <Textarea placeholder="Tell the employer why you're a great fit..." value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={4} />
                  </div>
                  <Button className="w-full" variant="emerald" onClick={handleApply} disabled={applying}>
                    {applying ? "Submitting..." : "Submit Application"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
};

const JobsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [lga, setLga] = useState("");
  const [qualification, setQualification] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { data: allJobs, isLoading } = useQuery({
    queryKey: ["jobs", { search, sector, lga, qualification }],
    queryFn: () => fetchAllJobs({
      search: search || undefined, sector: sector || undefined,
      lga: lga || undefined, qualification: qualification || undefined,
    }),
    enabled: !!user,
  });

  const { data: recommendedJobs, isLoading: recLoading } = useQuery({
    queryKey: ["recommendedJobs", user?.id],
    queryFn: () => fetchRecommendedJobs(user!.id),
    enabled: !!user,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const handleApply = async (jobId: string, coverLetter: string) => {
    try {
      await applyForJob(jobId, user.id, coverLetter);
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      if (err.message?.includes("duplicate")) toast.error("You have already applied for this job");
      else toast.error(err.message || "Failed to apply");
      throw err;
    }
  };

  const internalJobs = allJobs?.filter(j => j.is_internal) || [];
  const externalJobs = allJobs?.filter(j => !j.is_internal) || [];

  const getDisplayJobs = () => {
    switch (activeTab) {
      case "recommended": return recommendedJobs || [];
      case "internal": return internalJobs;
      case "external": return externalJobs;
      default: return allJobs || [];
    }
  };

  const displayJobs = getDisplayJobs();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Job Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Find opportunities that match your skills</p>
        </div>
        <Badge variant="outline" className="text-xs">{allJobs?.length || 0} jobs available</Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Jobs ({allJobs?.length || 0})</TabsTrigger>
          <TabsTrigger value="recommended" className="gap-1">
            <Sparkles className="h-3 w-3" /> Recommended ({recommendedJobs?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="internal">Internal ({internalJobs.length})</TabsTrigger>
          <TabsTrigger value="external">External ({externalJobs.length})</TabsTrigger>
        </TabsList>

        {/* Search & Filters */}
        <div className="bg-card rounded-xl p-4 shadow-soft border border-border space-y-3 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search jobs by title..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-3.5 w-3.5 mr-1" /> Filters
            </Button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger><SelectValue placeholder="All Sectors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={lga} onValueChange={setLga}>
                <SelectTrigger><SelectValue placeholder="All LGAs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LGAs</SelectItem>
                  {JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={qualification} onValueChange={setQualification}>
                <SelectTrigger><SelectValue placeholder="All Qualifications" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Qualifications</SelectItem>
                  {QUALIFICATION_TYPES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Recommended Tab Info */}
        {activeTab === "recommended" && (
          <div className="bg-secondary/5 rounded-xl p-4 border border-secondary/20 mt-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-secondary" />
              <h3 className="text-sm font-semibold text-foreground">Smart Recommendations</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Jobs matched to your profile skills, sector, qualification, and location. Complete your profile for better matches.
            </p>
          </div>
        )}

        {/* Job Listings */}
        <div className="mt-4">
          {(isLoading || (activeTab === "recommended" && recLoading)) ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading jobs...</div>
          ) : displayJobs.length > 0 ? (
            <div className="space-y-3">
              {displayJobs.map(job => (
                <JobCard key={job.id} job={job} user={user} onApply={handleApply} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Briefcase className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
              <h3 className="font-display text-base font-semibold text-foreground">
                {activeTab === "recommended" ? "No Recommendations Yet" : "No Jobs Found"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTab === "recommended"
                  ? "Complete your profile with skills and qualifications to get personalized recommendations."
                  : "Check back later for new opportunities."}
              </p>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default JobsPage;
