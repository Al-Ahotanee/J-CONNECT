import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send, Bot, User, Sparkles, Target, BookOpen,
  MessageCircle, Loader2, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = "/api/ai/ai-interview-coach";

const AIInterviewCoachPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"practice" | "tips" | "chat">("chat");
  const [jobTitle, setJobTitle] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const streamChat = async (msgs: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jconnect_auth_token") || ""}`,
        },
        body: JSON.stringify({ messages: msgs, job_title: jobTitle, mode }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to connect");
      }

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to get response");
    }
    setIsLoading(false);
  };

  const handleStart = () => {
    setStarted(true);
    setMessages([]);
    const initialMsg: Msg = mode === "practice"
      ? { role: "user", content: `I want to practice for a ${jobTitle || "general"} interview. Please start the mock interview.` }
      : mode === "tips"
      ? { role: "user", content: `Give me interview preparation tips for a ${jobTitle || "general"} position.` }
      : { role: "user", content: "Hi, I'd like help preparing for job interviews." };

    setMessages([initialMsg]);
    streamChat([initialMsg]);
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    streamChat(newMsgs);
  };

  const handleReset = () => {
    setMessages([]);
    setStarted(false);
    setInput("");
  };

  if (!started) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">AI Interview Coach</h1>
          <p className="text-sm text-muted-foreground mt-2">Practice interviews, get tips, and build confidence with AI-powered coaching</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Role (Optional)</label>
            <Input
              placeholder="e.g., Software Engineer, Accountant, Teacher..."
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Choose Mode</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: "practice" as const, icon: Target, title: "Mock Interview", desc: "Full practice session with Q&A and feedback" },
                { id: "tips" as const, icon: BookOpen, title: "Interview Tips", desc: "Get specific preparation tips and strategies" },
                { id: "chat" as const, icon: MessageCircle, title: "Free Chat", desc: "Ask anything about interview preparation" },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${mode === m.id ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-card hover:border-primary/20"}`}
                >
                  <m.icon className={`h-5 w-5 mb-2 ${mode === m.id ? "text-primary" : "text-muted-foreground"}`} />
                  <h3 className="text-sm font-semibold text-foreground">{m.title}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleStart} className="w-full" size="lg">
            <Sparkles className="h-4 w-4 mr-2" /> Start Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Interview Coach</h3>
            <p className="text-[10px] text-muted-foreground">
              {mode === "practice" ? "Mock Interview" : mode === "tips" ? "Tips & Strategies" : "Free Chat"}
              {jobTitle && ` • ${jobTitle}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px]">{mode}</Badge>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 mr-1" /> New Session
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary" : "bg-accent"}`}>
                  {msg.role === "user" ? <User className="h-3.5 w-3.5 text-primary-foreground" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className={`rounded-2xl px-4 py-2.5 ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border text-foreground rounded-bl-md"}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="bg-card border-t border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <Input
            placeholder="Type your answer or question..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIInterviewCoachPage;
