import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMessages, sendMessage } from "@/lib/api";
import {
  fetchMyChatrooms, fetchChatroomMessages, sendChatroomMessage,
  uploadChatFile, sendMessageWithFile,
} from "@/lib/mentorship-api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send, MessageCircle, Users, Paperclip, FileText, X, Hash, Search, User,
} from "lucide-react";
import { toast } from "sonner";

type ChatTarget = { type: "dm"; id: string; name: string; photo?: string } |
  { type: "room"; id: string; name: string; topic?: string };

const ChatPage = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedTarget, setSelectedTarget] = useState<ChatTarget | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string } | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch recent conversations (users I've messaged or who messaged me)
  const { data: recentContacts = [] } = useQuery({
    queryKey: ["recentContacts", user?.id],
    queryFn: async () => {
      // Get distinct user IDs from messages
      const { data: sent } = await supabase.from("messages").select("receiver_id").eq("sender_id", user!.id);
      const { data: received } = await supabase.from("messages").select("sender_id").eq("receiver_id", user!.id);
      const ids = new Set<string>();
      sent?.forEach(m => ids.add(m.receiver_id));
      received?.forEach(m => ids.add(m.sender_id));
      if (ids.size === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, passport_photo_url").in("user_id", Array.from(ids));
      return profiles || [];
    },
    enabled: !!user,
  });

  // Search for new contacts
  const { data: searchResults = [] } = useQuery({
    queryKey: ["contactSearch", contactSearch],
    queryFn: async () => {
      if (!contactSearch || contactSearch.length < 2) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name, passport_photo_url")
        .ilike("full_name", `%${contactSearch}%`).neq("user_id", user!.id).limit(10);
      return data || [];
    },
    enabled: !!user && contactSearch.length >= 2,
  });

  // Group chatrooms
  const { data: chatrooms } = useQuery({
    queryKey: ["myChatrooms", user?.id],
    queryFn: () => fetchMyChatrooms(user!.id),
    enabled: !!user,
  });

  // DM messages
  const dmUserId = selectedTarget?.type === "dm" ? selectedTarget.id : null;
  const { data: dmMessages } = useQuery({
    queryKey: ["messages", user?.id, dmUserId],
    queryFn: () => fetchMessages(user!.id, dmUserId!),
    enabled: !!user && !!dmUserId,
    refetchInterval: 3000,
  });

  // Chatroom messages
  const roomId = selectedTarget?.type === "room" ? selectedTarget.id : null;
  const { data: roomMessages } = useQuery({
    queryKey: ["chatroomMessages", roomId],
    queryFn: () => fetchChatroomMessages(roomId!),
    enabled: !!roomId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages, roomMessages]);

  // Auto-select from URL params
  useEffect(() => {
    const targetUser = searchParams.get("user");
    if (targetUser && recentContacts.length > 0) {
      const contact = recentContacts.find((c: any) => c.user_id === targetUser);
      if (contact) {
        setSelectedTarget({ type: "dm", id: contact.user_id, name: contact.full_name, photo: contact.passport_photo_url });
      }
    }
  }, [searchParams, recentContacts]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const handleSend = async () => {
    if (!message.trim() && !pendingFile) return;
    setSending(true);
    try {
      if (selectedTarget?.type === "dm") {
        if (pendingFile) {
          await sendMessageWithFile(user.id, selectedTarget.id, message || "Shared a file", pendingFile.url, pendingFile.name);
        } else {
          await sendMessage(user.id, selectedTarget.id, message);
        }
        queryClient.invalidateQueries({ queryKey: ["messages"] });
        queryClient.invalidateQueries({ queryKey: ["recentContacts"] });
      } else if (selectedTarget?.type === "room") {
        await sendChatroomMessage(selectedTarget.id, user.id, message, pendingFile?.url, pendingFile?.name);
        queryClient.invalidateQueries({ queryKey: ["chatroomMessages"] });
      }
      setMessage("");
      setPendingFile(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setUploading(true);
    try {
      const result = await uploadChatFile(file, user.id);
      setPendingFile({ url: result.url, name: result.name });
      toast.success("File ready to send");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const messages = selectedTarget?.type === "dm" ? dmMessages : roomMessages;
  const displayContacts = contactSearch.length >= 2 ? searchResults : recentContacts;

  return (
    <div className="flex h-[calc(100vh-120px)] bg-card rounded-xl shadow-soft border border-border overflow-hidden m-4">
      {/* Sidebar */}
      <div className="w-72 border-r border-border flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search people..."
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Direct Messages */}
          <div className="p-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
              {contactSearch.length >= 2 ? "Search Results" : "Recent Conversations"}
            </p>
            {displayContacts.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                {contactSearch.length >= 2 ? "No users found" : "No conversations yet. Search for users to start chatting!"}
              </p>
            ) : (
              displayContacts.map((contact: any) => (
                <button
                  key={contact.user_id}
                  onClick={() => {
                    setSelectedTarget({ type: "dm", id: contact.user_id, name: contact.full_name, photo: contact.passport_photo_url });
                    setContactSearch("");
                  }}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
                    selectedTarget?.type === "dm" && selectedTarget.id === contact.user_id
                      ? "bg-primary/10" : "hover:bg-muted"
                  }`}
                >
                  {contact.passport_photo_url ? (
                    <img src={contact.passport_photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{contact.full_name}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Group Chatrooms */}
          {chatrooms && chatrooms.length > 0 && (
            <div className="p-2 border-t border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Group Chats</p>
              {chatrooms.map((room: any) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedTarget({ type: "room", id: room.id, name: room.name, topic: room.topic })}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
                    selectedTarget?.type === "room" && selectedTarget.id === room.id
                      ? "bg-primary/10" : "hover:bg-muted"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Hash className="h-4 w-4 text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{room.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{room.topic}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedTarget ? (
          <>
            <div className="p-3 border-b border-border flex items-center gap-3">
              {selectedTarget.type === "dm" ? (
                <>
                  {(selectedTarget as any).photo ? (
                    <img src={(selectedTarget as any).photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div><p className="text-sm font-semibold text-foreground">{selectedTarget.name}</p><p className="text-[10px] text-muted-foreground">Direct Message</p></div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center"><Hash className="h-4 w-4 text-secondary" /></div>
                  <div><p className="text-sm font-semibold text-foreground">{selectedTarget.name}</p><p className="text-[10px] text-muted-foreground">{(selectedTarget as any).topic}</p></div>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages && messages.length > 0 ? messages.map((msg: any) => {
                const isMe = selectedTarget.type === "dm" ? msg.sender_id === user.id : msg.user_id === user.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.file_url && (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 mt-1.5 text-xs underline opacity-80">
                          <FileText className="h-3 w-3" /> {msg.file_name || "File"}
                        </a>
                      )}
                      <p className={`text-[9px] mt-1 ${isMe ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-12"><MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/20 mb-2" /><p className="text-xs text-muted-foreground">No messages yet. Say hello!</p></div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-border">
              {pendingFile && (
                <div className="flex items-center gap-2 mb-2 bg-muted rounded-lg px-3 py-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-foreground truncate flex-1">{pendingFile.name}</span>
                  <button onClick={() => setPendingFile(null)}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  className="flex-1 h-9"
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={sending || (!message.trim() && !pendingFile)}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/20 mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Select a conversation</h3>
              <p className="text-xs text-muted-foreground">Choose from recent contacts or search for someone new</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
