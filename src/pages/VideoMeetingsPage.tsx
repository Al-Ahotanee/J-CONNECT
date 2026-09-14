import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile } from "@/lib/api";
import { useVideoMeeting } from "@/hooks/useVideoMeeting";
import VideoMeeting from "@/components/VideoMeeting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video, Plus, Calendar, Users, Clock, Play, PhoneOff,
  Link as LinkIcon, Copy, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

const VideoMeetingsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const { meetingOpen, meetingRoom, meetingTitle, startMeeting, joinMeeting, endMeeting } = useVideoMeeting(user?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: "", type: "general", scheduled_at: "" });
  const [copied, setCopied] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["video-meetings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_meetings")
        .select("*")
        .or(`created_by.eq.${user!.id},participants.cs.{${user!.id}}`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const handleCreateMeeting = async () => {
    if (!newMeeting.title) { toast.error("Title required"); return; }
    await startMeeting({
      title: newMeeting.title,
      meetingType: newMeeting.type,
      scheduledAt: newMeeting.scheduled_at || undefined,
      participants: [user.id],
    });
    setShowCreate(false);
    setNewMeeting({ title: "", type: "general", scheduled_at: "" });
    qc.invalidateQueries({ queryKey: ["video-meetings"] });
  };

  const handleCopyLink = (roomName: string) => {
    const url = `https://meet.jit.si/${roomName}`;
    navigator.clipboard.writeText(url);
    setCopied(roomName);
    toast.success("Meeting link copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const scheduledMeetings = meetings.filter((m: any) => m.status === "scheduled");
  const pastMeetings = meetings.filter((m: any) => m.status === "ended");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" /> Video Meetings
          </h1>
          <p className="text-sm text-muted-foreground">Start or schedule video calls for interviews, mentoring, and team meetings</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => startMeeting({ title: "Quick Meeting", meetingType: "general", participants: [user.id] })}>
            <Play className="h-4 w-4 mr-1" /> Instant Meeting
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="h-4 w-4 mr-1" /> Schedule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title *</Label>
                  <Input placeholder="Meeting title" value={newMeeting.title} onChange={e => setNewMeeting(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={newMeeting.type} onValueChange={v => setNewMeeting(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="mentorship">Mentorship Session</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="screening">Screening Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date & Time</Label>
                  <Input type="datetime-local" value={newMeeting.scheduled_at} onChange={e => setNewMeeting(p => ({ ...p, scheduled_at: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={handleCreateMeeting}>Schedule Meeting</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Meetings", value: meetings.length, icon: Video },
          { label: "Scheduled", value: scheduledMeetings.length, icon: Calendar },
          { label: "Completed", value: pastMeetings.length, icon: CheckCircle },
          { label: "Active Now", value: meetings.filter((m: any) => m.status === "active").length, icon: Play },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><s.icon className="h-4 w-4" /><span className="text-xs">{s.label}</span></div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({scheduledMeetings.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastMeetings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {scheduledMeetings.length > 0 ? scheduledMeetings.map((m: any) => (
            <div key={m.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">{m.title}</h4>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="text-[10px]">{m.meeting_type}</Badge>
                  {m.scheduled_at && <span><Clock className="h-3 w-3 inline mr-0.5" />{new Date(m.scheduled_at).toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleCopyLink(m.room_name)}>
                  {copied === m.room_name ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={() => joinMeeting(m.room_name, m.title)}>
                  <Play className="h-3 w-3 mr-1" /> Join
                </Button>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Calendar className="mx-auto text-muted-foreground/20 mb-3 h-8 w-8" />
              <p className="text-sm text-muted-foreground">No upcoming meetings</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {pastMeetings.length > 0 ? pastMeetings.map((m: any) => (
            <div key={m.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center gap-4 opacity-70">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <PhoneOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground">{m.title}</h4>
                <p className="text-[10px] text-muted-foreground">
                  {m.ended_at ? new Date(m.ended_at).toLocaleString() : new Date(m.created_at).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">{m.meeting_type}</Badge>
            </div>
          )) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Video className="mx-auto text-muted-foreground/20 mb-3 h-8 w-8" />
              <p className="text-sm text-muted-foreground">No past meetings</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Video Meeting Modal */}
      <VideoMeeting
        roomName={meetingRoom}
        displayName={profile?.full_name || user?.email || "User"}
        title={meetingTitle}
        open={meetingOpen}
        onClose={endMeeting}
      />
    </div>
  );
};

export default VideoMeetingsPage;
