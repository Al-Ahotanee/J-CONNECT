import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserRoles } from "@/lib/api";
import { hasAnyRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { JIGAWA_LGAS, SECTORS, QUALIFICATION_TYPES } from "@/lib/constants";
import {
  Search, Users, MapPin, Briefcase, GraduationCap, Star, Bookmark, BookmarkCheck,
  Eye, Phone, Mail, FileText, Filter, X, UserCheck,
} from "lucide-react";
import { toast } from "sonner";

const TalentMarketplacePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [lgaFilter, setLgaFilter] = useState("");
  const [qualFilter, setQualFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [saveNote, setSaveNote] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const isAllowed = hasAnyRole(roles, ["super_admin", "admin", "recruitment_admin", "recruiter", "psb_recruiter", "subeb_recruiter", "employer"]);

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["talentPool", search, sectorFilter, lgaFilter, qualFilter, statusFilter],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*");
      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,skills.cs.{${search}}`);
      if (sectorFilter) query = query.eq("sector", sectorFilter);
      if (lgaFilter) query = query.eq("lga", lgaFilter);
      if (statusFilter) query = query.eq("employment_status", statusFilter);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
      if (error) throw error;

      // If qualification filter, fetch education and filter
      if (qualFilter && data) {
        const userIds = data.map(p => p.user_id);
        const { data: edu } = await supabase.from("education").select("user_id, qualification_type").in("user_id", userIds);
        const qualifiedIds = new Set(edu?.filter(e => e.qualification_type === qualFilter).map(e => e.user_id));
        return data.filter(p => qualifiedIds.has(p.user_id));
      }
      return data || [];
    },
    enabled: !!user && isAllowed,
  });

  const { data: savedCandidates } = useQuery({
    queryKey: ["savedCandidates", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("saved_candidates").select("candidate_id").eq("recruiter_id", user!.id);
      return new Set(data?.map(s => s.candidate_id) || []);
    },
    enabled: !!user && isAllowed,
  });

  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !isAllowed) return <Navigate to="/dashboard" />;

  const handleSaveCandidate = async (candidateId: string) => {
    try {
      if (savedCandidates?.has(candidateId)) {
        await supabase.from("saved_candidates").delete().eq("recruiter_id", user.id).eq("candidate_id", candidateId);
        toast.success("Removed from talent pool");
      } else {
        await supabase.from("saved_candidates").insert({ recruiter_id: user.id, candidate_id: candidateId, notes: saveNote || null });
        toast.success("Added to talent pool!");
      }
      queryClient.invalidateQueries({ queryKey: ["savedCandidates"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const clearFilters = () => {
    setSearch(""); setSectorFilter(""); setLgaFilter(""); setQualFilter(""); setStatusFilter("");
  };

  const hasFilters = search || sectorFilter || lgaFilter || qualFilter || statusFilter;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Talent Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Search and discover qualified candidates across Jigawa State</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1" /> {candidates?.length || 0} candidates</Badge>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or skills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" />
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Sector" /></SelectTrigger>
              <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={lgaFilter} onValueChange={setLgaFilter}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="LGA" /></SelectTrigger>
              <SelectContent>{JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={qualFilter} onValueChange={setQualFilter}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Qualification" /></SelectTrigger>
              <SelectContent>{QUALIFICATION_TYPES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Employment Status" /></SelectTrigger>
              <SelectContent>
                {["Unemployed", "Self-employed", "Employed", "Retired"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Searching talent pool...</div>
      ) : candidates && candidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((c: any) => {
            const isSaved = savedCandidates?.has(c.user_id);
            return (
              <div key={c.id} className="bg-card rounded-xl p-4 border border-border hover:border-primary/30 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {c.passport_photo_url ? (
                      <img src={c.passport_photo_url} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">{c.full_name?.[0]}</span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{c.full_name}</h3>
                      <p className="text-[11px] text-muted-foreground">{c.job_title || c.employment_status || "Citizen"}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSaveCandidate(c.user_id)}>
                    {isSaved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>

                <div className="space-y-1.5 text-[11px] text-muted-foreground">
                  {c.lga && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.lga}, Jigawa</p>}
                  {c.sector && <p className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {c.sector}</p>}
                  {c.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</p>}
                </div>

                {c.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {c.skills.slice(0, 4).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[9px] h-5">{s}</Badge>
                    ))}
                    {c.skills.length > 4 && <Badge variant="outline" className="text-[9px] h-5">+{c.skills.length - 4}</Badge>}
                  </div>
                )}

                <div className="flex gap-1.5 mt-3 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px]" onClick={() => setSelectedCandidate(c)}>
                    <Eye className="h-3 w-3 mr-0.5" /> View Profile
                  </Button>
                  {c.cv_file_url && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px]">
                      <FileText className="h-3 w-3 mr-0.5" /> CV
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Users className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
          <h3 className="text-base font-semibold text-foreground">No candidates found</h3>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Candidate Detail Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Candidate Profile</DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedCandidate.passport_photo_url ? (
                  <img src={selectedCandidate.passport_photo_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-xl">{selectedCandidate.full_name?.[0]}</span>
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selectedCandidate.full_name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedCandidate.job_title || "N/A"} • {selectedCandidate.current_employer || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground font-medium">{selectedCandidate.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground font-medium">{selectedCandidate.phone || "N/A"}</span></div>
                <div><span className="text-muted-foreground">LGA:</span> <span className="text-foreground font-medium">{selectedCandidate.lga || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Sector:</span> <span className="text-foreground font-medium">{selectedCandidate.sector || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="text-foreground font-medium">{selectedCandidate.employment_status || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Gender:</span> <span className="text-foreground font-medium">{selectedCandidate.gender || "N/A"}</span></div>
              </div>

              {selectedCandidate.skills?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedCandidate.skills.map((s: string) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                  </div>
                </div>
              )}

              {selectedCandidate.certifications?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Certifications</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedCandidate.certifications.map((c: string) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                  </div>
                </div>
              )}

              {selectedCandidate.work_experience && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-1">Work Experience</h4>
                  <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">{selectedCandidate.work_experience}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="default" size="sm" className="flex-1" onClick={() => handleSaveCandidate(selectedCandidate.user_id)}>
                  {savedCandidates?.has(selectedCandidate.user_id) ? (
                    <><BookmarkCheck className="h-3.5 w-3.5 mr-1" /> Saved</>
                  ) : (
                    <><Bookmark className="h-3.5 w-3.5 mr-1" /> Save to Pool</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TalentMarketplacePage;
