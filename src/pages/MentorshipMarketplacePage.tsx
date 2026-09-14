import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { MENTOR_CATEGORIES, SKILL_CATEGORIES } from "@/lib/constants";
import {
  Search, Plus, Users, UserCheck, Heart, Send, Star, Clock,
  CheckCircle, XCircle, MessageCircle, Sparkles, Target, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

const MentorshipMarketplacePage = () => {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [form, setForm] = useState({
    listing_type: "seeking_mentor",
    title: "",
    description: "",
    skills: "",
    experience_level: "",
    expectations: "",
    category: "",
  });
  const [requestMsg, setRequestMsg] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["mentorship-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorship_listings")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch profiles for each listing
      const uids = [...new Set(data?.map((l: any) => l.user_id) || [])];
      if (!uids.length) return data || [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, passport_photo_url, lga, sector, skills").in("user_id", uids);
      return data?.map((l: any) => ({ ...l, profile: profiles?.find((p: any) => p.user_id === l.user_id) })) || [];
    },
    enabled: !!user,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ["my-mentorship-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorship_requests")
        .select("*")
        .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch profiles
      const uids = [...new Set(data?.flatMap((r: any) => [r.from_user_id, r.to_user_id]) || [])];
      if (!uids.length) return data || [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, passport_photo_url").in("user_id", uids);
      return data?.map((r: any) => ({
        ...r,
        from_profile: profiles?.find((p: any) => p.user_id === r.from_user_id),
        to_profile: profiles?.find((p: any) => p.user_id === r.to_user_id),
      })) || [];
    },
    enabled: !!user,
  });

  const { data: myListings = [] } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorship_listings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const handleCreate = async () => {
    if (!form.title) { toast.error("Title is required"); return; }
    try {
      await supabase.from("mentorship_listings").insert({
        user_id: user.id,
        listing_type: form.listing_type,
        title: form.title,
        description: form.description || null,
        skills: form.skills ? form.skills.split(",").map(s => s.trim()) : [],
        experience_level: form.experience_level || null,
        expectations: form.expectations || null,
        category: form.category || null,
      } as any);
      toast.success("Listing created!");
      setShowCreate(false);
      setForm({ listing_type: "seeking_mentor", title: "", description: "", skills: "", experience_level: "", expectations: "", category: "" });
      qc.invalidateQueries({ queryKey: ["mentorship-listings"] });
      qc.invalidateQueries({ queryKey: ["my-listings"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSendRequest = async () => {
    if (!selectedListing) return;
    const reqType = selectedListing.listing_type === "seeking_mentor" ? "mentor_to_mentee" : "mentee_to_mentor";
    try {
      await supabase.from("mentorship_requests").insert({
        from_user_id: user.id,
        to_user_id: selectedListing.user_id,
        listing_id: selectedListing.id,
        request_type: reqType,
        message: requestMsg || null,
      } as any);
      toast.success("Request sent!");
      setShowRequest(false);
      setRequestMsg("");
      setSelectedListing(null);
      qc.invalidateQueries({ queryKey: ["my-mentorship-requests"] });
    } catch (err: any) {
      if (err.message?.includes("duplicate")) toast.info("You already sent a request");
      else toast.error(err.message);
    }
  };

  const handleRespondRequest = async (requestId: string, status: string) => {
    try {
      await supabase.from("mentorship_requests").update({ status } as any).eq("id", requestId);
      toast.success(`Request ${status}!`);
      qc.invalidateQueries({ queryKey: ["my-mentorship-requests"] });

      if (status === "accepted") {
        const req = myRequests.find((r: any) => r.id === requestId);
        if (req) {
          // Determine who is mentor and mentee
          const mentorUserId = req.request_type === "mentee_to_mentor" ? req.to_user_id : req.from_user_id;
          const menteeUserId = req.request_type === "mentee_to_mentor" ? req.from_user_id : req.to_user_id;
          // Find mentor record
          const { data: mentorRecord } = await supabase.from("mentors").select("id").eq("user_id", mentorUserId).single();
          let mentorId = mentorRecord?.id;
          if (!mentorId) {
            const { data: newMentor } = await supabase.from("mentors").insert({
              user_id: mentorUserId,
              category: "General Mentorship",
              is_active: true,
            }).select().single();
            mentorId = (newMentor as any)?.id;
          }
          if (mentorId) {
            await supabase.from("mentorship_mappings").insert({
              mentor_id: mentorId,
              mentee_id: menteeUserId,
              match_reason: "Marketplace request accepted",
            });
          }
        }
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteListing = async (id: string) => {
    await supabase.from("mentorship_listings").update({ is_active: false } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["mentorship-listings"] });
    qc.invalidateQueries({ queryKey: ["my-listings"] });
    toast.success("Listing removed");
  };

  const filtered = listings.filter((l: any) => {
    if (l.user_id === user.id) return false;
    const matchSearch = !search || l.title?.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || l.listing_type === typeFilter;
    const matchCat = catFilter === "all" || l.category === catFilter;
    return matchSearch && matchType && matchCat;
  });

  const incomingRequests = myRequests.filter((r: any) => r.to_user_id === user.id && r.status === "pending");
  const sentRequests = myRequests.filter((r: any) => r.from_user_id === user.id);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-5 w-5 text-primary-foreground" />
              <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">Marketplace</Badge>
            </div>
            <h1 className="font-display text-2xl font-bold text-primary-foreground">Mentorship Marketplace</h1>
            <p className="text-primary-foreground/70 mt-1 text-sm">Find mentors or mentees. Post your availability and connect.</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 border-0">
                <Plus className="h-4 w-4 mr-1" /> Post Listing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Mentorship Listing</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">I am...</Label>
                  <Select value={form.listing_type} onValueChange={v => setForm(p => ({ ...p, listing_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seeking_mentor">Looking for a Mentor</SelectItem>
                      <SelectItem value="seeking_mentee">Looking for Mentees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Title *</Label>
                  <Input placeholder="e.g. Seeking ICT mentor for web development" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea placeholder="Describe what you're looking for..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{MENTOR_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Skills (comma-separated)</Label>
                  <Input placeholder="e.g. Python, Data Science, Leadership" value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Experience Level</Label>
                  <Select value={form.experience_level} onValueChange={v => setForm(p => ({ ...p, experience_level: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Beginner", "Intermediate", "Advanced", "Expert"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expectations</Label>
                  <Textarea placeholder="What do you expect from this partnership?" value={form.expectations} onChange={e => setForm(p => ({ ...p, expectations: e.target.value }))} rows={2} />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={!form.title}>Post Listing</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Active Listings", value: listings.length, icon: Target },
            { label: "Seeking Mentors", value: listings.filter((l: any) => l.listing_type === "seeking_mentor").length, icon: Users },
            { label: "Seeking Mentees", value: listings.filter((l: any) => l.listing_type === "seeking_mentee").length, icon: UserCheck },
            { label: "My Requests", value: myRequests.length, icon: Send },
          ].map(s => (
            <div key={s.label} className="bg-primary-foreground/10 rounded-xl p-3">
              <s.icon className="h-4 w-4 text-primary-foreground/70 mb-1" />
              <div className="text-xl font-display font-bold text-primary-foreground">{s.value}</div>
              <div className="text-[10px] text-primary-foreground/60">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="browse">Browse Listings</TabsTrigger>
          <TabsTrigger value="requests">Requests ({incomingRequests.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings ({myListings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search listings..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="seeking_mentor">Seeking Mentors</SelectItem>
                <SelectItem value="seeking_mentee">Seeking Mentees</SelectItem>
              </SelectContent>
            </Select>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {MENTOR_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((listing: any) => (
                <div key={listing.id} className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    {listing.profile?.passport_photo_url ? (
                      <img src={listing.profile.passport_photo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{listing.profile?.full_name?.[0] || "?"}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-sm font-semibold text-foreground truncate">{listing.profile?.full_name || "User"}</h3>
                      <p className="text-[10px] text-muted-foreground">{listing.profile?.lga && `${listing.profile.lga} LGA`}</p>
                    </div>
                    <Badge variant={listing.listing_type === "seeking_mentor" ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {listing.listing_type === "seeking_mentor" ? "Needs Mentor" : "Offers Mentoring"}
                    </Badge>
                  </div>

                  <h4 className="font-semibold text-sm text-foreground mb-1">{listing.title}</h4>
                  {listing.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{listing.description}</p>}

                  <div className="flex flex-wrap gap-1 mb-2">
                    {listing.category && <Badge variant="outline" className="text-[10px]">{listing.category}</Badge>}
                    {listing.experience_level && <Badge variant="outline" className="text-[10px]">{listing.experience_level}</Badge>}
                  </div>

                  {listing.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {listing.skills.slice(0, 4).map((s: string, i: number) => (
                        <Badge key={i} className="bg-primary/5 text-primary border-primary/10 text-[10px]">{s}</Badge>
                      ))}
                      {listing.skills.length > 4 && <Badge variant="outline" className="text-[10px]">+{listing.skills.length - 4}</Badge>}
                    </div>
                  )}

                  {listing.expectations && (
                    <p className="text-[11px] text-muted-foreground italic mb-3 line-clamp-2">"{listing.expectations}"</p>
                  )}

                  <Button size="sm" className="w-full" onClick={() => { setSelectedListing(listing); setShowRequest(true); }}>
                    <Send className="h-3 w-3 mr-1" /> Send Request
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Target className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
              <h3 className="font-display text-base font-semibold text-foreground">No Listings Found</h3>
              <p className="text-xs text-muted-foreground mt-1">Be the first to post a listing!</p>
            </div>
          )}
        </TabsContent>

        {/* Incoming Requests */}
        <TabsContent value="requests" className="space-y-3">
          {incomingRequests.length > 0 ? incomingRequests.map((req: any) => (
            <div key={req.id} className="bg-card rounded-xl p-4 shadow-soft border border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{req.from_profile?.full_name?.[0] || "?"}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{req.from_profile?.full_name || "User"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {req.request_type === "mentee_to_mentor" ? "Wants you as mentor" : "Wants to mentor you"}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">{req.status}</Badge>
              </div>
              {req.message && <p className="text-xs text-muted-foreground mb-3 bg-muted p-2 rounded-lg">"{req.message}"</p>}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => handleRespondRequest(req.id, "accepted")}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Accept
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => handleRespondRequest(req.id, "rejected")}>
                  <XCircle className="h-3 w-3 mr-1" /> Decline
                </Button>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <MessageCircle className="mx-auto text-muted-foreground/20 mb-3 h-8 w-8" />
              <p className="text-sm text-muted-foreground">No incoming requests</p>
            </div>
          )}
        </TabsContent>

        {/* Sent Requests */}
        <TabsContent value="sent" className="space-y-3">
          {sentRequests.length > 0 ? sentRequests.map((req: any) => (
            <div key={req.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-secondary-foreground">{req.to_profile?.full_name?.[0] || "?"}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">To: {req.to_profile?.full_name || "User"}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
              </div>
              <Badge variant={req.status === "accepted" ? "default" : req.status === "rejected" ? "destructive" : "outline"} className="text-[10px]">
                {req.status}
              </Badge>
            </div>
          )) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Send className="mx-auto text-muted-foreground/20 mb-3 h-8 w-8" />
              <p className="text-sm text-muted-foreground">No sent requests</p>
            </div>
          )}
        </TabsContent>

        {/* My Listings */}
        <TabsContent value="my-listings" className="space-y-3">
          {myListings.length > 0 ? myListings.map((l: any) => (
            <div key={l.id} className="bg-card rounded-xl p-4 shadow-soft border border-border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-foreground">{l.title}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant={l.listing_type === "seeking_mentor" ? "default" : "secondary"} className="text-[10px]">
                    {l.listing_type === "seeking_mentor" ? "Seeking Mentor" : "Offering Mentoring"}
                  </Badge>
                  <Badge variant={l.is_active ? "default" : "outline"} className="text-[10px]">{l.is_active ? "Active" : "Closed"}</Badge>
                </div>
              </div>
              {l.description && <p className="text-xs text-muted-foreground mb-2">{l.description}</p>}
              <div className="flex gap-2">
                {l.is_active && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive" onClick={() => handleDeleteListing(l.id)}>
                    <XCircle className="h-3 w-3 mr-1" /> Close
                  </Button>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Target className="mx-auto text-muted-foreground/20 mb-3 h-8 w-8" />
              <p className="text-sm text-muted-foreground">You haven't posted any listings yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Send Request Dialog */}
      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Mentorship Request</DialogTitle>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-3">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">{selectedListing.profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{selectedListing.title}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message (optional)</Label>
                <Textarea placeholder="Introduce yourself and explain why you'd be a good match..." value={requestMsg} onChange={e => setRequestMsg(e.target.value)} rows={3} />
              </div>
              <Button className="w-full" onClick={handleSendRequest}>
                <Send className="h-4 w-4 mr-1" /> Send Request
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MentorshipMarketplacePage;
