import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { fetchAllJobs } from "@/lib/recruitment-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { JIGAWA_LGAS, SENATORIAL_ZONES, SECTORS, QUALIFICATION_TYPES } from "@/lib/constants";
import {
  Search, MapPin, Briefcase, Clock, Building, Building2,
  Globe, Lock, ExternalLink, ChevronRight, Calendar,
  GraduationCap, Star, X, SlidersHorizontal, Bookmark,
  BookmarkCheck, Share2, Check, Copy, ArrowUpRight,
  ShieldCheck, Printer, DollarSign, Award, Users,
  CheckCircle2, AlertCircle, Eye, Sparkles, Filter,
  Layers, ArrowRight, Landmark, Laptop, Sprout, HeartPulse
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Preset Quick Filter Pills for Hero Section
const QUICK_PILLS = [
  { label: "All Roles", value: "all", icon: Briefcase },
  { label: "Civil Service & MDAs", value: "Civil Service", icon: Landmark },
  { label: "SUBEB & Education", value: "Education", icon: GraduationCap },
  { label: "ICT & Innovation", value: "ICT", icon: Laptop },
  { label: "Agriculture & Food", value: "Agriculture", icon: Sprout },
  { label: "Healthcare", value: "Health", icon: HeartPulse },
  { label: "Private & Enterprise", value: "Private", icon: Building2 },
];

const PublicJobsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query params synchronization
  const initialJobId = searchParams.get("job");
  const initialSector = searchParams.get("sector") || "";
  const initialLga = searchParams.get("lga") || "";
  const initialSearch = searchParams.get("search") || "";

  const [search, setSearch] = useState(initialSearch);
  const [sector, setSector] = useState(initialSector);
  const [lga, setLga] = useState(initialLga);
  const [senatorialZone, setSenatorialZone] = useState("");
  const [qualification, setQualification] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "internal" | "external" | "saved">("all");
  const [sortBy, setSortBy] = useState<"newest" | "title">("newest");
  
  // UI states
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Bookmarking in localStorage
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("jconnect_bookmarked_jobs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleBookmark = (jobId: string, jobTitle: string) => {
    setBookmarkedIds(prev => {
      let updated: string[];
      if (prev.includes(jobId)) {
        updated = prev.filter(id => id !== jobId);
        toast({
          title: "Removed from Saved Jobs",
          description: `"${jobTitle}" has been removed from your saved list.`,
        });
      } else {
        updated = [...prev, jobId];
        toast({
          title: "Job Saved",
          description: `"${jobTitle}" has been added to your saved list.`,
        });
      }
      try {
        localStorage.setItem("jconnect_bookmarked_jobs", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Fetch jobs from backend
  const { data: allJobs = [], isLoading, refetch } = useQuery({
    queryKey: ["publicJobs"],
    queryFn: () => fetchAllJobs(),
    refetchOnWindowFocus: true,
  });

  // Client-side filtering for ultra-fast, multi-faceted filtering
  const filteredJobs = useMemo(() => {
    return allJobs.filter(job => {
      // Tab filter
      if (activeTab === "internal" && !job.is_internal) return false;
      if (activeTab === "external" && job.is_internal) return false;
      if (activeTab === "saved" && !bookmarkedIds.includes(job.id)) return false;

      // Text search in title, company, description, lga, sector, and skills
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const inTitle = (job.title || "").toLowerCase().includes(q);
        const inCompany = (job.company || "").toLowerCase().includes(q);
        const inDesc = (job.description || "").toLowerCase().includes(q);
        const inLga = (job.lga || "").toLowerCase().includes(q);
        const inSector = (job.sector || "").toLowerCase().includes(q);
        
        let inSkills = false;
        if (job.skills_required) {
          try {
            const skillsArr = Array.isArray(job.skills_required) 
              ? job.skills_required 
              : JSON.parse(job.skills_required);
            inSkills = skillsArr.some((s: string) => s.toLowerCase().includes(q));
          } catch {
            inSkills = String(job.skills_required).toLowerCase().includes(q);
          }
        }

        if (!inTitle && !inCompany && !inDesc && !inLga && !inSector && !inSkills) {
          return false;
        }
      }

      // Sector filter
      if (sector && sector !== "all") {
        const secLower = sector.toLowerCase();
        const jobSec = (job.sector || "").toLowerCase();
        const jobComp = (job.company || "").toLowerCase();
        if (!jobSec.includes(secLower) && !jobComp.includes(secLower)) {
          return false;
        }
      }

      // Senatorial Zone filter
      if (senatorialZone && senatorialZone !== "all") {
        const zoneLgas = SENATORIAL_ZONES[senatorialZone as keyof typeof SENATORIAL_ZONES] || [];
        if (!zoneLgas.includes(job.lga as any)) {
          return false;
        }
      }

      // LGA filter
      if (lga && lga !== "all" && job.lga !== lga) {
        return false;
      }

      // Qualification filter
      if (qualification && qualification !== "all") {
        if (job.qualification_required && job.qualification_required !== qualification) {
          return false;
        }
      }

      // Employment type
      if (employmentType && employmentType !== "all") {
        if (job.employment_type && job.employment_type !== employmentType) {
          return false;
        }
      }

      // Experience level
      if (experienceLevel && experienceLevel !== "all") {
        if (job.experience_level && job.experience_level !== experienceLevel) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
    });
  }, [allJobs, search, sector, senatorialZone, lga, qualification, employmentType, experienceLevel, activeTab, sortBy, bookmarkedIds]);

  // Selected job resolution
  const selectedJob = useMemo(() => {
    if (selectedJobId) {
      const found = allJobs.find(j => j.id === selectedJobId);
      if (found) return found;
    }
    return filteredJobs[0] || allJobs[0] || null;
  }, [selectedJobId, filteredJobs, allJobs]);

  // Select first job if none selected
  useEffect(() => {
    if (!selectedJobId && filteredJobs.length > 0) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  // Sync URL search params when key filters change
  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set("job", jobId);
      return p;
    }, { replace: true });
  };

  const handleShareJob = async (job: typeof selectedJob) => {
    if (!job) return;
    const url = `${window.location.origin}/jobs-board?job=${job.id}`;
    const shareData = {
      title: `${job.title} at ${job.company}`,
      text: `Check out this opening for ${job.title} in ${job.location || job.lga || "Jigawa State"} on J-CONNECT:`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      toast({
        title: "Link Copied!",
        description: "Direct job link has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Share Job",
        description: `Direct Link: ${url}`,
      });
    }
  };

  const activeFiltersCount = [
    sector && sector !== "all",
    lga && lga !== "all",
    senatorialZone && senatorialZone !== "all",
    qualification && qualification !== "all",
    employmentType && employmentType !== "all",
    experienceLevel && experienceLevel !== "all",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSector("");
    setLga("");
    setSenatorialZone("");
    setQualification("");
    setEmploymentType("");
    setExperienceLevel("");
    setSearch("");
  };

  // Safe skills parser
  const getSkillsList = (skillsData: any): string[] => {
    if (!skillsData) return [];
    if (Array.isArray(skillsData)) return skillsData;
    try {
      const parsed = JSON.parse(skillsData);
      return Array.isArray(parsed) ? parsed : [skillsData];
    } catch {
      return String(skillsData).split(",").map(s => s.trim()).filter(Boolean);
    }
  };

  const getTimeAgo = (date?: string) => {
    if (!date) return "Recently";
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const getDeadlineStatus = (deadline?: string) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: "Expired", isUrgent: false, isClosed: true };
    }
    if (diffDays === 0) {
      return { label: "Closes Today", isUrgent: true, isClosed: false };
    }
    if (diffDays <= 5) {
      return { label: `Closes in ${diffDays} day${diffDays > 1 ? "s" : ""}`, isUrgent: true, isClosed: false };
    }
    return { label: `Deadline: ${deadlineDate.toLocaleDateString()}`, isUrgent: false, isClosed: false };
  };

  // Stats calculation
  const totalCount = allJobs.length;
  const internalCount = allJobs.filter(j => j.is_internal !== false).length;
  const externalCount = allJobs.filter(j => j.is_internal === false).length;
  const savedCount = bookmarkedIds.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500/20 selection:text-emerald-700">
      <Navbar />

      <main className="flex-1 pt-16">
        {/* ========================================================
            HERO HEADER - Enterprise GovTech Jigawa Portal
           ======================================================== */}
        <section className="relative border-b border-border bg-gradient-to-b from-emerald-950/10 via-background to-background py-10 lg:py-14 overflow-hidden">
          {/* Subtle decorative background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-emerald-500/10 blur-3xl pointer-events-none -z-10" />

          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-border/60">
              <div className="space-y-2 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Official Jigawa State Employment & Public Vacancy Portal</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
                  Find Verified Career Opportunities Across Jigawa
                </h1>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                  Connecting citizens and professionals with open positions in the Jigawa State Civil Service, SUBEB, State MDAs, healthcare facilities, and accredited private employers across all 27 Local Government Areas.
                </p>
              </div>

              {/* Recruiter / Post a Job Callout */}
              <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button 
                  size="lg" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20 gap-2 h-11"
                  asChild
                >
                  <Link to="/recruiter">
                    <Building2 className="h-4 w-4" /> Post a Vacancy (MDAs & Employers)
                  </Link>
                </Button>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-5">
              <div className="bg-card/60 backdrop-blur-sm border border-border/80 rounded-xl p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold tracking-tight">{totalCount}</div>
                  <div className="text-xs text-muted-foreground font-medium">Active Openings</div>
                </div>
              </div>

              <div className="bg-card/60 backdrop-blur-sm border border-border/80 rounded-xl p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold tracking-tight">{internalCount}</div>
                  <div className="text-xs text-muted-foreground font-medium">Civil Service & MDAs</div>
                </div>
              </div>

              <div className="bg-card/60 backdrop-blur-sm border border-border/80 rounded-xl p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold tracking-tight">{externalCount}</div>
                  <div className="text-xs text-muted-foreground font-medium">Partner Enterprises</div>
                </div>
              </div>

              <div className="bg-card/60 backdrop-blur-sm border border-border/80 rounded-xl p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold tracking-tight">27 / 27</div>
                  <div className="text-xs text-muted-foreground font-medium">LGAs Represented</div>
                </div>
              </div>
            </div>

            {/* Main Interactive Search Bar */}
            <div className="mt-2 bg-card border border-border rounded-2xl p-2 md:p-3 shadow-lg shadow-black/5">
              <div className="flex flex-col md:flex-row items-stretch gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by job title, MDA / company, required skill, or keyword..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-12 h-12 text-base bg-background/50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl"
                  />
                  {search && (
                    <button 
                      onClick={() => setSearch("")} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-border pt-2 md:pt-0 md:pl-2">
                  <Select value={lga} onValueChange={setLga}>
                    <SelectTrigger className="h-12 border-0 bg-background/50 focus:ring-0">
                      <MapPin className="h-4 w-4 mr-2 text-emerald-600 shrink-0" />
                      <SelectValue placeholder="All 27 LGAs" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">All Jigawa LGAs (27)</SelectItem>
                      {JIGAWA_LGAS.map(l => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  size="lg" 
                  className="h-12 px-7 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shrink-0"
                  onClick={() => refetch()}
                >
                  <Search className="h-4 w-4" />
                  <span>Find Jobs</span>
                </Button>
              </div>

              {/* Quick Sector Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 border-t border-border/50 text-xs no-scrollbar">
                <span className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider pl-1 mr-1 shrink-0">
                  Quick Filter:
                </span>
                {QUICK_PILLS.map(pill => {
                  const isSelected = pill.value === "all" ? (!sector || sector === "all") : sector.toLowerCase().includes(pill.value.toLowerCase());
                  const Icon = pill.icon;
                  return (
                    <button
                      key={pill.value}
                      onClick={() => setSector(pill.value === "all" ? "" : pill.value)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg font-medium transition-all text-xs shrink-0 ${
                        isSelected
                          ? "bg-emerald-600 text-white font-semibold shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                      <span>{pill.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            MAIN LAYOUT: Master-Detail Split with Refinement Sidebar
           ======================================================== */}
        <div className="container mx-auto px-4 max-w-7xl py-8">
          {/* Top Bar with Classification Tabs & Mobile Filter Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "all"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                All Opportunities ({totalCount})
              </button>

              <button
                onClick={() => setActiveTab("internal")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === "internal"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Lock className="h-3.5 w-3.5" /> Civil Service & MDAs ({internalCount})
              </button>

              <button
                onClick={() => setActiveTab("external")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === "external"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="h-3.5 w-3.5" /> Partner Employers ({externalCount})
              </button>

              <button
                onClick={() => setActiveTab("saved")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === "saved"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" /> Saved Jobs ({savedCount})
              </button>
            </div>

            {/* Sort & Mobile Filter Trigger */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden h-9 text-xs font-medium gap-1.5"
                onClick={() => setMobileFilterOpen(true)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">Sort:</span>
                <Select value={sortBy} onValueChange={(v: "newest" | "title") => setSortBy(v)}>
                  <SelectTrigger className="h-9 w-36 text-xs bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="title">Job Title (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Master-Detail Split Grid */}
          <div className="flex items-start gap-8">
            {/* ========================================================
                DESKTOP FILTERS SIDEBAR
               ======================================================== */}
            <aside className="w-72 shrink-0 hidden lg:block sticky top-24 space-y-6">
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-bold tracking-tight text-foreground">Refine Vacancies</h2>
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-emerald-600 hover:underline font-semibold"
                    >
                      Reset ({activeFiltersCount})
                    </button>
                  )}
                </div>

                {/* Sector / Industry */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Sector / Ministry
                  </label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="All Sectors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sectors</SelectItem>
                      {SECTORS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                      <SelectItem value="Civil Service">Civil Service (PSB)</SelectItem>
                      <SelectItem value="SUBEB">SUBEB (Education)</SelectItem>
                      <SelectItem value="ICT">ICT & Innovation</SelectItem>
                      <SelectItem value="Agriculture">Agriculture</SelectItem>
                      <SelectItem value="Health">Health & Medical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Senatorial Zone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Senatorial Zone
                  </label>
                  <Select value={senatorialZone} onValueChange={setSenatorialZone}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="All Senatorial Zones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All 3 Zones</SelectItem>
                      <SelectItem value="Jigawa North-West">Jigawa North-West (12 LGAs)</SelectItem>
                      <SelectItem value="Jigawa North-East">Jigawa North-East (8 LGAs)</SelectItem>
                      <SelectItem value="Jigawa South">Jigawa South (7 LGAs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* LGA Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Local Government Area (LGA)
                  </label>
                  <Select value={lga} onValueChange={setLga}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="All 27 LGAs" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All 27 LGAs</SelectItem>
                      {JIGAWA_LGAS.map(l => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Qualification Required */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Minimum Qualification
                  </label>
                  <Select value={qualification} onValueChange={setQualification}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="All Qualifications" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Qualifications</SelectItem>
                      {QUALIFICATION_TYPES.map(q => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Employment Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Employment Type
                  </label>
                  <Select value={employmentType} onValueChange={setEmploymentType}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Internship">Internship / Volunteer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Experience Level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Experience Level
                  </label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="Entry Level">Entry Level</SelectItem>
                      <SelectItem value="Mid Level">Mid Level</SelectItem>
                      <SelectItem value="Senior">Senior Level</SelectItem>
                      <SelectItem value="Executive">Executive / Director</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Employer / Recruiter Callout Banner */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-left space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  <span>For Employers & MDAs</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  Recruiting in Jigawa State?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Post verified public openings or corporate vacancies directly to Jigawa's official talent database.
                </p>
                <Button size="sm" variant="outline" className="w-full text-xs font-semibold border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/10" asChild>
                  <Link to="/recruiter">
                    Access Recruiter Hub <ArrowRight className="h-3 w-3 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </aside>

            {/* ========================================================
                JOB LISTINGS (MASTER VIEW)
               ======================================================== */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Showing <strong className="text-foreground">{filteredJobs.length}</strong> {filteredJobs.length === 1 ? "vacancy" : "vacancies"}
                  {activeFiltersCount > 0 && ` matching ${activeFiltersCount} active filter${activeFiltersCount > 1 ? "s" : ""}`}
                </span>
                {activeFiltersCount > 0 && (
                  <button onClick={clearAllFilters} className="text-emerald-600 hover:underline font-medium">
                    Clear filters
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-card rounded-xl p-5 border border-border animate-pulse space-y-3">
                      <div className="flex justify-between">
                        <div className="h-5 bg-muted rounded w-2/5"></div>
                        <div className="h-5 bg-muted rounded w-1/6"></div>
                      </div>
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-3 bg-muted rounded w-4/5"></div>
                      <div className="flex gap-2 pt-2">
                        <div className="h-6 bg-muted rounded w-16"></div>
                        <div className="h-6 bg-muted rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredJobs.length > 0 ? (
                <div className="space-y-3">
                  {filteredJobs.map(job => {
                    const isSelected = selectedJob?.id === job.id;
                    const isBookmarked = bookmarkedIds.includes(job.id);
                    const skills = getSkillsList(job.skills_required);
                    const deadlineStatus = getDeadlineStatus(job.deadline);

                    return (
                      <div
                        key={job.id}
                        onClick={() => {
                          handleSelectJob(job.id);
                          // Open drawer on mobile devices
                          if (window.innerWidth < 1024) {
                            setMobileDetailOpen(true);
                          }
                        }}
                        className={`group relative rounded-xl border p-5 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-card border-emerald-600/50 shadow-md ring-1 ring-emerald-600/30"
                            : "bg-card border-border hover:border-emerald-500/30 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Badges row */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {job.is_internal !== false ? (
                                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold py-0.5">
                                  <ShieldCheck className="h-3 w-3 mr-1" /> Jigawa State Public Service
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] font-semibold py-0.5">
                                  <Globe className="h-3 w-3 mr-1" /> Verified Partner
                                </Badge>
                              )}

                              {deadlineStatus && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] py-0.5 ${
                                    deadlineStatus.isUrgent 
                                      ? "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/20 font-semibold" 
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  <Clock className="h-3 w-3 mr-1" /> {deadlineStatus.label}
                                </Badge>
                              )}
                            </div>

                            {/* Job Title & Company */}
                            <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-emerald-600 transition-colors line-clamp-1">
                              {job.title}
                            </h3>
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{job.company}</span>
                            </p>

                            {/* Metadata Pills */}
                            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 mt-3 text-xs text-muted-foreground">
                              {job.lga && (
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  {job.lga}, Jigawa
                                </span>
                              )}
                              {job.employment_type && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  {job.employment_type}
                                </span>
                              )}
                              {job.salary_range && (
                                <span className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                                  <DollarSign className="h-3.5 w-3.5 shrink-0" />
                                  {job.salary_range}
                                </span>
                              )}
                            </div>

                            {/* Skills snippet */}
                            {skills.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
                                {skills.slice(0, 3).map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 text-[11px] rounded bg-muted text-muted-foreground font-medium"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {skills.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground font-semibold">
                                    +{skills.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action icons */}
                          <div className="shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => toggleBookmark(job.id, job.title)}
                              title={isBookmarked ? "Remove from saved" : "Save this job"}
                              className={`p-2 rounded-lg border transition-all ${
                                isBookmarked
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                  : "text-muted-foreground hover:text-foreground border-transparent hover:border-border"
                              }`}
                            >
                              {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                            </button>

                            <button
                              onClick={() => handleShareJob(job)}
                              title="Share vacancy"
                              className="p-2 rounded-lg border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Footer info: Posted date */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
                          <span>Posted {getTimeAgo(job.created_at)}</span>
                          <span className="text-emerald-600 font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            View details <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card/50">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                    <Briefcase className="h-7 w-7 opacity-50" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No Matching Vacancies Found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                    We couldn't find any job openings matching your current search criteria. Try modifying your filters or search keywords.
                  </p>
                  <Button variant="outline" size="sm" onClick={clearAllFilters} className="font-semibold">
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>

            {/* ========================================================
                DESKTOP DETAIL PANE (STICKY SPLIT VIEW)
               ======================================================== */}
            {selectedJob && (
              <div className="w-[480px] shrink-0 hidden lg:block sticky top-24">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm max-h-[calc(100vh-7rem)] overflow-y-auto space-y-6">
                  {/* Agency / Role Header */}
                  <div className="space-y-3 pb-5 border-b border-border">
                    <div className="flex items-center justify-between gap-2">
                      {selectedJob.is_internal !== false ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold py-1">
                          <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Jigawa State Public Service
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-semibold py-1">
                          <Globe className="h-3.5 w-3.5 mr-1.5" /> Verified Partner Employer
                        </Badge>
                      )}

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => toggleBookmark(selectedJob.id, selectedJob.title)}
                          title="Save Job"
                        >
                          {bookmarkedIds.includes(selectedJob.id) ? (
                            <BookmarkCheck className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleShareJob(selectedJob)}
                          title="Share"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => window.print()}
                          title="Print Job Specification"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-foreground leading-tight">
                        {selectedJob.title}
                      </h2>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                        <Building className="h-4 w-4 shrink-0" />
                        <span>{selectedJob.company}</span>
                      </p>
                    </div>

                    {/* Deadline Urgency Banner */}
                    {selectedJob.deadline && (
                      <div className="bg-muted/60 border border-border/80 rounded-lg p-2.5 text-xs flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-muted-foreground">
                          Application Deadline: <strong className="text-foreground">{new Date(selectedJob.deadline).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>
                        </span>
                      </div>
                    )}

                    {/* Primary Apply Action Bar */}
                    <div className="pt-2">
                      {!selectedJob.is_internal && selectedJob.external_url ? (
                        <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-md gap-2" asChild>
                          <a href={selectedJob.external_url} target="_blank" rel="noopener noreferrer">
                            <span>Apply on Official Employer Site</span>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : user ? (
                        <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-md shadow-emerald-600/20 gap-2" asChild>
                          <Link to={`/job-seeker?apply=${selectedJob.id}`}>
                            <span>Apply with Verified Profile</span>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-md shadow-emerald-600/20 gap-2" asChild>
                            <Link to={`/login?redirect=/job-seeker?apply=${selectedJob.id}`}>
                              <span>Sign In to Apply</span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                          <p className="text-[11px] text-center text-muted-foreground">
                            Registered Jigawa citizens can apply in 1-click with their pre-verified profile.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Specifications Grid */}
                  <div className="grid grid-cols-2 gap-3.5 bg-muted/40 rounded-xl p-4 border border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground font-medium text-[11px] block uppercase tracking-wider">
                        Location / LGA
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        {selectedJob.lga ? `${selectedJob.lga}, Jigawa` : selectedJob.location || "Jigawa State"}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-medium text-[11px] block uppercase tracking-wider">
                        Sector / Dept
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        {selectedJob.sector || "Public Administration"}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-medium text-[11px] block uppercase tracking-wider">
                        Employment Type
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        {selectedJob.employment_type || "Full-time"}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-medium text-[11px] block uppercase tracking-wider">
                        Experience Level
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                        <Award className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        {selectedJob.experience_level || "Not specified"}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-medium text-[11px] block uppercase tracking-wider">
                        Min. Qualification
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        {selectedJob.qualification_required || "SSCE / ND / Degree"}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-medium text-[11px] block uppercase tracking-wider">
                        Remuneration
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        {selectedJob.salary_range || "Official Grade Level"}
                      </span>
                    </div>
                  </div>

                  {/* Skills Section */}
                  {getSkillsList(selectedJob.skills_required).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Required Skills & Competencies</span>
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {getSkillsList(selectedJob.skills_required).map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-background py-1 px-2.5 font-medium">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Job Description */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Position Overview & Responsibilities
                    </h4>
                    <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-normal">
                      {selectedJob.description}
                    </div>
                  </div>

                  {/* Jigawa State Anti-Fraud & Transparency Notice */}
                  <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-[11px] space-y-1 text-muted-foreground">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <span>E-Recruitment Safety & Anti-Fraud Notice</span>
                    </div>
                    <p>
                      All official recruitment exercises through the Jigawa State Government and J-CONNECT are completely free of charge. Never pay any recruitment fees or charges to any individual.
                    </p>
                  </div>

                  {/* Footer metadata */}
                  <div className="text-[11px] text-muted-foreground border-t border-border pt-4 flex items-center justify-between">
                    <span>Job ID: {selectedJob.id.slice(0, 8)}</span>
                    <span>Posted {getTimeAgo(selectedJob.created_at)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            MOBILE DRAWER (SHEET) FOR JOB DETAILS
           ======================================================== */}
        <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl px-4 py-6 overflow-y-auto">
            {selectedJob && (
              <div className="space-y-5 max-w-lg mx-auto">
                <SheetHeader className="text-left space-y-2 pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    {selectedJob.is_internal !== false ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs">
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Public Service
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <Globe className="h-3.5 w-3.5 mr-1" /> Partner Role
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="text-xl font-bold">{selectedJob.title}</SheetTitle>
                  <SheetDescription className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {selectedJob.company} • {selectedJob.lga ? `${selectedJob.lga}, Jigawa` : "Jigawa State"}
                  </SheetDescription>
                </SheetHeader>

                {/* Apply Button */}
                <div>
                  {!selectedJob.is_internal && selectedJob.external_url ? (
                    <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl" asChild>
                      <a href={selectedJob.external_url} target="_blank" rel="noopener noreferrer">
                        Apply on Official Site <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  ) : user ? (
                    <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl" asChild>
                      <Link to={`/job-seeker?apply=${selectedJob.id}`}>
                        Apply with Profile <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  ) : (
                    <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl" asChild>
                      <Link to={`/login?redirect=/job-seeker?apply=${selectedJob.id}`}>
                        Sign In to Apply <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Mobile Specs */}
                <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-xl p-3.5 text-xs border border-border/60">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">LGA / Location</span>
                    <span className="font-semibold text-foreground">{selectedJob.lga || "Jigawa"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Sector</span>
                    <span className="font-semibold text-foreground">{selectedJob.sector || "Public"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Type</span>
                    <span className="font-semibold text-foreground">{selectedJob.employment_type || "Full-time"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Qualification</span>
                    <span className="font-semibold text-foreground">{selectedJob.qualification_required || "Degree"}</span>
                  </div>
                </div>

                {/* Skills */}
                {getSkillsList(selectedJob.skills_required).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Required Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {getSkillsList(selectedJob.skills_required).map((s, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Job Description</h4>
                  <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedJob.description}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-xs gap-2"
                    onClick={() => toggleBookmark(selectedJob.id, selectedJob.title)}
                  >
                    {bookmarkedIds.includes(selectedJob.id) ? (
                      <><BookmarkCheck className="h-4 w-4 text-amber-600" /> Saved</>
                    ) : (
                      <><Bookmark className="h-4 w-4" /> Save Job</>
                    )}
                  </Button>

                  <Button 
                    variant="outline" 
                    className="flex-1 text-xs gap-2"
                    onClick={() => handleShareJob(selectedJob)}
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* ========================================================
            MOBILE FILTER SHEET
           ======================================================== */}
        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetContent side="left" className="w-80 p-6 overflow-y-auto space-y-5">
            <SheetHeader className="text-left pb-3 border-b border-border">
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-emerald-600" /> Refine Vacancies
              </SheetTitle>
              <SheetDescription className="text-xs">
                Filter public and partner job postings.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider">Sector</label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Sectors" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider">LGA</label>
                <Select value={lga} onValueChange={setLga}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All LGAs" /></SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">All LGAs</SelectItem>
                    {JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider">Senatorial Zone</label>
                <Select value={senatorialZone} onValueChange={setSenatorialZone}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Zones" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    <SelectItem value="Jigawa North-West">Jigawa North-West</SelectItem>
                    <SelectItem value="Jigawa North-East">Jigawa North-East</SelectItem>
                    <SelectItem value="Jigawa South">Jigawa South</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider">Qualification</label>
                <Select value={qualification} onValueChange={setQualification}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Qualifications" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Qualifications</SelectItem>
                    {QUALIFICATION_TYPES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 flex gap-2">
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" 
                  onClick={() => setMobileFilterOpen(false)}
                >
                  Apply Filters
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => { clearAllFilters(); setMobileFilterOpen(false); }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* ========================================================
            ENTERPRISE RECRUITER / EMPLOYER FOOTER BANNER
           ======================================================== */}
        <section className="border-t border-border bg-gradient-to-r from-emerald-950/20 via-background to-background py-14">
          <div className="container mx-auto px-4 max-w-6xl text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <Building2 className="h-3.5 w-3.5" />
              <span>J-CONNECT For State MDAs, Boards & Corporate Recruiters</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Looking to Hire Qualified Talent in Jigawa State?
            </h2>
            <p className="text-muted-foreground text-sm max-w-2xl mx-auto leading-relaxed">
              Publish verified vacancies, conduct online computer-based tests (CBT), manage multi-stage interview pipelines, and extend formal job offers to pre-screened citizens across all 27 Local Government Areas.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 h-12 rounded-xl shadow-md gap-2" asChild>
                <Link to="/recruiter">
                  <span>Enter Recruiter Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="font-semibold h-12 rounded-xl" asChild>
                <Link to="/register">
                  <span>Register as Employer</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PublicJobsPage;
