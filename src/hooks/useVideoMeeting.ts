import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useVideoMeeting = (userId: string | undefined) => {
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingRoom, setMeetingRoom] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");

  const startMeeting = async (opts: {
    title: string;
    meetingType: string;
    relatedId?: string;
    participants?: string[];
    scheduledAt?: string;
  }) => {
    if (!userId) return;
    const isScheduled = !!opts.scheduledAt && new Date(opts.scheduledAt).getTime() > Date.now();
    const roomName = `jconnect-${opts.meetingType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    try {
      await supabase.from("video_meetings").insert({
        title: opts.title,
        room_name: roomName,
        created_by: userId,
        meeting_type: opts.meetingType,
        related_id: opts.relatedId || null,
        participants: opts.participants || [userId],
        scheduled_at: opts.scheduledAt || new Date().toISOString(),
        status: isScheduled ? "scheduled" : "active",
      } as any);
      
      if (!isScheduled) {
        setMeetingRoom(roomName);
        setMeetingTitle(opts.title);
        setMeetingOpen(true);
      } else {
        toast.success("Meeting scheduled successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start meeting");
    }
  };

  const joinMeeting = (roomName: string, title: string) => {
    setMeetingRoom(roomName);
    setMeetingTitle(title);
    setMeetingOpen(true);
  };

  const endMeeting = async () => {
    setMeetingOpen(false);
    if (meetingRoom) {
      await supabase.from("video_meetings").update({ 
        status: "ended", 
        ended_at: new Date().toISOString() 
      } as any).eq("room_name", meetingRoom);
    }
    setMeetingRoom("");
    setMeetingTitle("");
  };

  return {
    meetingOpen,
    meetingRoom,
    meetingTitle,
    startMeeting,
    joinMeeting,
    endMeeting,
  };
};
