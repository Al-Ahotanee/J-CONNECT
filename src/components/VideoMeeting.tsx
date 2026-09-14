import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, PhoneOff, Maximize2, Minimize2 } from "lucide-react";

interface VideoMeetingProps {
  roomName: string;
  displayName: string;
  title?: string;
  open: boolean;
  onClose: () => void;
}

const VideoMeeting = ({ roomName, displayName, title, open, onClose }: VideoMeetingProps) => {
  const [fullscreen, setFullscreen] = useState(false);

  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=true`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={`${fullscreen ? "max-w-[98vw] h-[95vh]" : "max-w-4xl h-[80vh]"} p-0 gap-0 overflow-hidden`}>
        <DialogHeader className="px-4 py-2 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <DialogTitle className="text-sm font-semibold">{title || "Video Meeting"}</DialogTitle>
            <Badge variant="outline" className="text-[10px] animate-pulse">Live</Badge>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen(!fullscreen)}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onClose}>
              <PhoneOff className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 bg-background">
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            className="w-full h-full border-0"
            title="Video Meeting"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoMeeting;
