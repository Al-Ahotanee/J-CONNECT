import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, Paperclip, Image, FileText, Video, Download,
  User, MessageCircle, Phone, MoreVertical, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  file_url?: string | null;
  file_name?: string | null;
  created_at: string;
  is_read?: boolean | null;
}

const InterviewChatPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const recruiterId = searchParams.get("recruiter");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const otherId = recruiterId || "";

  const { data: otherProfile } = useQuery({
    queryKey: ["profile", otherId],
    queryFn: () => fetchProfile(otherId),
    enabled: !!otherId,
  });

  // Fetch initial messages & polling
  const fetchMessages = async () => {
    if (!user || !otherId) return;
    const { data } = await supabase.from("messages").select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [user, otherId]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !otherId) return;
    const channel = supabase
      .channel(`chat-${user.id}-${otherId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (
          (msg.sender_id === user.id && msg.receiver_id === otherId) ||
          (msg.sender_id === otherId && msg.receiver_id === user.id)
        ) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, otherId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read
  useEffect(() => {
    if (!user || !otherId) return;
    supabase.from("messages").update({ is_read: true })
      .eq("receiver_id", user.id).eq("sender_id", otherId).eq("is_read", false).then(() => {});
  }, [messages, user, otherId]);

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  if (!otherId) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <MessageCircle className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
          <h3 className="font-display text-lg font-semibold text-foreground">Interview Chat</h3>
          <p className="text-sm text-muted-foreground mt-1">Select an interview invitation to start chatting with the recruiter.</p>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!message.trim()) return;
    const text = message.trim();
    setMessage("");
    setSending(true);
    try {
      const { data, error } = await supabase.from("messages").insert({
        sender_id: user.id, receiver_id: otherId, content: text,
      });
      if (error) throw error;
      const optimisticMsg: ChatMessage = {
        id: (data as any)?.[0]?.id || `tmp-${Date.now()}`,
        sender_id: user.id,
        receiver_id: otherId,
        content: text,
        created_at: new Date().toISOString(),
        is_read: false,
      };
      setMessages(prev => [...prev, optimisticMsg]);
    } catch (err: any) { 
      toast.error("Failed to send message"); 
      setMessage(text);
    }
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large (max 20MB)"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);

      const { data: inserted } = await supabase.from("messages").insert({
        sender_id: user.id, receiver_id: otherId,
        content: `📎 ${file.name}`,
        file_url: urlData.publicUrl,
        file_name: file.name,
      });
      const newMsg: ChatMessage = {
        id: (inserted as any)?.[0]?.id || `tmp-${Date.now()}`,
        sender_id: user.id,
        receiver_id: otherId,
        content: `📎 ${file.name}`,
        file_url: urlData.publicUrl,
        file_name: file.name,
        created_at: new Date().toISOString(),
        is_read: false,
      };
      setMessages(prev => [...prev, newMsg]);
      toast.success("File sent!");
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const renderFilePreview = (msg: ChatMessage) => {
    if (!msg.file_url) return null;
    const fileName = msg.file_name?.toLowerCase() || msg.file_url.toLowerCase();
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)/.test(fileName);
    const isVideo = /\.(mp4|webm|mov|avi)/.test(fileName);
    if (isImage) {
      return <img src={msg.file_url} alt={msg.file_name || "Image"} className="max-w-xs rounded-lg mt-2 cursor-pointer" onClick={() => window.open(msg.file_url!, "_blank")} />;
    }
    if (isVideo) {
      return <video src={msg.file_url} controls className="max-w-xs rounded-lg mt-2" />;
    }
    return (
      <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 mt-2 px-3 py-2 bg-muted rounded-lg text-xs hover:bg-muted/80 transition-colors">
        <FileText className="h-4 w-4 text-primary" />
        <span className="truncate">{msg.file_name || "Document"}</span>
        <Download className="h-3 w-3 ml-auto" />
      </a>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Chat Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{otherProfile?.full_name || "Recruiter"}</h3>
            <p className="text-[10px] text-muted-foreground">{otherProfile?.current_employer || "Interview Chat"}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">
          <MessageCircle className="h-2.5 w-2.5 mr-1" /> Interview
        </Badge>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <MessageCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              Start the conversation. You can share documents, images, and videos.
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border text-foreground rounded-bl-md"
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {renderFilePreview(msg)}
                  <p className={`text-[9px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-card border-t border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input placeholder={uploading ? "Uploading file..." : "Type a message..."}
            value={message} onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyPress} disabled={sending || uploading} className="flex-1" />
          <Button variant="emerald" size="icon" className="shrink-0" onClick={handleSend} disabled={!message.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InterviewChatPage;
