import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllJobs } from "@/lib/recruitment-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JIGAWA_LGAS, SECTORS, QUALIFICATION_TYPES } from "@/lib/constants";
import {
  Search, MapPin, Briefcase, Clock, Building, Filter,
  Globe, Lock, ExternalLink, ChevronRight, Calendar,
  GraduationCap, Star, X, SlidersHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PublicJobsPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [lga, setLga] = useState("");
  const [qualification, setQualification] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "internal" | "external">("all");

  const { data: allJobs, isLoading } = useQuery({
    queryKey: ["publicJobs", { search, sector, lga, qualification, employmentType, experienceLevel }],
    queryFn: () => fetchAllJobs({
      search: search || undefined,
      sector: sector && sector !== "all" ? sector : undefined,
      lga: lga && lga !== "all" ? lga : undefined,
      qualification: qualification && qualification !== "all" ? qualification : undefined,
      employment_type: employmentType && employmentType !== "all" ? employmentType : undefined,
      experience_level: experienceLevel && experienceLevel !== "all" ? experienceLevel : undefined,
    }),
    refetchOnWindowFocus: true,
  });

  const displayJobs = (allJobs || []).filter(j => {
    if (activeFilter === "internal") return j.is_internal;
    if (activeFilter === "external") return !j.is_internal;
    return true;
  });

  const selectedJob = selectedJobId ? displayJobs.find(j => j.id === selectedJobId) : displayJobs[0];
  const internalCount = (allJobs || []).filter(j => j.is_internal).length;
  const externalCount = (allJobs || []).filter(j => !j.is_internal).length;

  const activeFiltersCount = [sector, lga, qualification, employmentType, experienceLevel].filter(f => f && f !== "all").length;

  const clearFilters = () => {
    setSector(""); setLga(""); setQualification(""); setEmploymentType(""); setExperienceLevel("");
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <div className="pt-16">
        {/* Microsoft-style Hero */}
        <section className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              J-Connect Careers
            </h1>
            <p className="text-muted-foreground mt-2 text-base max-w-2xl">
              Explore opportunities across Jigawa State. Find the right role for your skills and aspirations.
            </p>
            {/* Search Bar - Microsoft style */}
            <div className="mt-6 flex items-center gap-3 max-w-3xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by job title, keyword, or company"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-12 h-12 text-base bg-background border-2 border-border focus-visible:ring-primary focus-visible:border-primary rounded-lg"
                />
              </div>
              <Button variant="default" size="lg" className="h-12 px-8 rounded-lg font-semibold">
                <Search className="h-4 w-4 mr-2" /> Search
              </Button>
            </div>
            {/* Quick stats */}
            <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
              <span>{allJobs?.length || 0} jobs available</span>
              <span className="text-border">|</span>
              <button onClick={() => setActiveFilter("all")} className={`hover:text-foreground transition ${activeFilter === "all" ? "text-foreground font-medium" : ""}`}>All Jobs</button>
              <button onClick={() => setActiveFilter("internal")} className={`hover:text-foreground transition ${activeFilter === "internal" ? "text-foreground font-medium" : ""}`}>
                Internal ({internalCount})
              </button>
              <button onClick={() => setActiveFilter("external")} className={`hover:text-foreground transition ${activeFilter === "external" ? "text-foreground font-medium" : ""}`}>
                External ({externalCount})
              </button>
            </div>
          </div>
        </section>

        {/* Main Content - Microsoft 2-column layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Left Sidebar Filters */}
            {showFilters && (
              <aside className="w-72 shrink-0 hidden lg:block">
                <div className="sticky top-20 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Refine by</h2>
                    {activeFiltersCount > 0 && (
                      <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                        Clear all ({activeFiltersCount})
                      </button>
                    )}
                  </div>

                  {/* Sector Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground uppercase tracking-wider">Sector</label>
                    <Select value={sector} onValueChange={setSector}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Sectors" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sectors</SelectItem>
                        {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* LGA Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground uppercase tracking-wider">Location (LGA)</label>
                    <Select value={lga} onValueChange={setLga}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Locations" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Qualification */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground uppercase tracking-wider">Qualification</label>
                    <Select value={qualification} onValueChange={setQualification}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Qualifications" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Qualifications</SelectItem>
                        {QUALIFICATION_TYPES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Employment Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground uppercase tracking-wider">Employment Type</label>
                    <Select value={employmentType} onValueChange={setEmploymentType}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {["Full-time", "Part-time", "Contract", "Internship"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Experience Level */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground uppercase tracking-wider">Experience Level</label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Levels" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        {["Entry Level", "Mid Level", "Senior", "Executive"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sign In CTA */}
                  {!user && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                      <p className="text-xs text-foreground font-medium mb-2">Get personalized recommendations</p>
                      <p className="text-[11px] text-muted-foreground mb-3">Sign in to get job matches based on your profile.</p>
                      <Button variant="default" size="sm" className="w-full" asChild>
                        <Link to="/login">Sign In</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </aside>
            )}

            {/* Job Listings + Detail split view */}
            <div className="flex-1 flex gap-0 min-h-[70vh]">
              {/* Job List */}
              <div className={`${selectedJob && displayJobs.length > 0 ? "w-[420px] shrink-0 border-r border-border" : "flex-1"} overflow-y-auto`}>
                {/* Mobile filter toggle */}
                <div className="lg:hidden mb-4">
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                    <SlidersHorizontal className="h-4 w-4 mr-2" /> Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground mb-3 px-1">
                  {displayJobs.length} {displayJobs.length === 1 ? "job" : "jobs"} found
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="bg-card rounded-lg p-4 border border-border animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/3"></div>
                      </div>
                    ))}
                  </div>
                ) : displayJobs.length > 0 ? (
                  <div className="space-y-1">
                    {displayJobs.map(job => (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`w-full text-left p-4 rounded-lg border transition-all hover:bg-accent/50 ${
                          selectedJob?.id === job.id
                            ? "bg-primary/5 border-primary/30 shadow-sm"
                            : "bg-card border-border hover:border-primary/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-foreground leading-tight">{job.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{job.company}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                              {(job as any).location_scope && (
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" /> {(job as any).location_scope}
                                </span>
                              )}
                              {job.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {job.location}
                                </span>
                              )}
                              {job.employment_type && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {job.employment_type}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={job.is_internal ? "default" : "secondary"} className="text-[10px] h-5 font-normal">
                                {job.is_internal ? "Internal" : "External"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{getTimeAgo(job.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <Briefcase className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
                    <h3 className="text-base font-semibold text-foreground">No jobs found</h3>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or check back later.</p>
                  </div>
                )}
              </div>

              {/* Job Detail Panel - Microsoft style */}
              {selectedJob && displayJobs.length > 0 && (
                <div className="flex-1 overflow-y-auto pl-6 hidden md:block">
                  <div className="max-w-2xl">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">{selectedJob.title}</h2>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={selectedJob.is_internal ? "default" : "secondary"} className="text-xs">
                            {selectedJob.is_internal ? <><Lock className="h-3 w-3 mr-1" /> Internal</> : <><Globe className="h-3 w-3 mr-1" /> External</>}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Apply button area */}
                    <div className="flex items-center gap-3 mt-4 mb-6 pb-6 border-b border-border">
                      {!selectedJob.is_internal && selectedJob.external_url ? (
                        <Button size="lg" className="rounded-lg font-semibold px-8" asChild>
                          <a href={selectedJob.external_url} target="_blank" rel="noopener noreferrer">
                            Apply on Company Site <ExternalLink className="h-4 w-4 ml-2" />
                          </a>
                        </Button>
                      ) : user ? (
                        <Button size="lg" variant="default" className="rounded-lg font-semibold px-8" asChild>
                          <Link to={`/job-seeker?apply=${selectedJob.id}`}>
                            Apply Now <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      ) : (
                        <Button size="lg" variant="default" className="rounded-lg font-semibold px-8" asChild>
                          <Link to="/login">Sign In to Apply</Link>
                        </Button>
                      )}
                      {selectedJob.salary_range && (
                        <span className="text-sm font-semibold text-foreground bg-accent/50 px-3 py-2 rounded-lg">
                          {selectedJob.salary_range}
                        </span>
                      )}
                    </div>

                    {/* Job details grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Company</span>
                        <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
                          <Building className="h-4 w-4 text-muted-foreground" /> {selectedJob.company}
                        </p>
                      </div>
                      {selectedJob.location && (
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Location</span>
                          <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-muted-foreground" /> {selectedJob.location}{selectedJob.lga ? `, ${selectedJob.lga}` : ""}
                          </p>
                        </div>
                      )}
                      {selectedJob.employment_type && (
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employment Type</span>
                          <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-muted-foreground" /> {selectedJob.employment_type}
                          </p>
                        </div>
                      )}
                      {selectedJob.sector && (
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Sector</span>
                          <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
                            <Briefcase className="h-4 w-4 text-muted-foreground" /> {selectedJob.sector}
                          </p>
                        </div>
                      )}
                      {selectedJob.experience_level && (
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Experience Level</span>
                          <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
                            <Star className="h-4 w-4 text-muted-foreground" /> {selectedJob.experience_level}
                          </p>
                        </div>
                      )}
                      {selectedJob.qualification_required && (
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Qualification</span>
                          <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" /> {selectedJob.qualification_required}
                          </p>
                        </div>
                      )}
                      {selectedJob.deadline && (
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Deadline</span>
                          <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-muted-foreground" /> {new Date(selectedJob.deadline).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {selectedJob.skills_required && selectedJob.skills_required.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-foreground mb-2">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.skills_required.map((skill: string) => (
                            <Badge key={skill} variant="outline" className="text-xs font-normal py-1 px-3">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Job Description</h3>
                      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedJob.description}
                      </div>
                    </div>

                    {/* Posted date */}
                    <div className="text-xs text-muted-foreground border-t border-border pt-4">
                      Posted {getTimeAgo(selectedJob.created_at)} • Job ID: {selectedJob.id.slice(0, 8)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA for non-logged in users */}
        {!user && (
          <section className="py-12 bg-card border-t border-border">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Get Personalized Job Recommendations
              </h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Create your profile to receive smart job matches based on your skills, qualifications, and location.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button size="lg" asChild><Link to="/register">Create Profile</Link></Button>
                <Button variant="outline" size="lg" asChild><Link to="/login">Sign In</Link></Button>
              </div>
            </div>
          </section>
        )}

        <Footer />
      </div>
    </div>
  );
};

export default PublicJobsPage;
