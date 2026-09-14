import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserRoles } from "@/lib/api";
import { hasAnyRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Monitor, Plus, Trash2, Search, FileText, Users, BarChart3,
  CheckCircle, Clock, Settings, HelpCircle, Upload, Download,
  Shield, Brain, Tag, Layers, Filter, Eye, Save,
} from "lucide-react";
import { toast } from "sonner";

const QUESTION_CATEGORIES = [
  "Behavioral", "Cognitive", "Technical", "Logical Reasoning", "Situational Judgment",
  "Verbal Reasoning", "Numerical Reasoning", "Abstract Reasoning",
];

const JOB_ROLES = [
  "Software Engineer", "Accountant", "Civil Servant", "Teacher", "Nurse",
  "Engineer", "Project Manager", "Data Analyst", "HR Officer", "Legal Officer",
  "Administrative Officer", "Security Officer", "Agricultural Officer", "General",
];

const SENIORITY_LEVELS = ["Entry Level", "Mid Level", "Senior", "Executive"];
const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard", "Expert"];

const CBTAdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [searchQ, setSearchQ] = useState("");

  const [questionForm, setQuestionForm] = useState({
    question: "", options: ["", "", "", ""], correct_answer: 0,
    category: "Technical", job_role: "General", seniority_level: "Entry Level",
    difficulty_level: "Medium", tags: "",
  });

  const [examForm, setExamForm] = useState({
    title: "", description: "", pass_score: 50, time_limit_minutes: 30,
    job_role: "General", seniority_level: "Entry Level",
    randomize: true, anti_cheat: true, question_count: 20,
  });

  const [bulkText, setBulkText] = useState("");

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const isAllowed = hasAnyRole(roles, ["super_admin", "admin", "cbt_admin"]);

  // Fetch all quizzes (question bank containers)
  const { data: allQuizzes } = useQuery({
    queryKey: ["cbtAllQuizzes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*, quiz_questions(id)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAllowed,
  });

  // Fetch all questions
  const { data: allQuestions } = useQuery({
    queryKey: ["cbtAllQuestions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quiz_questions").select("*, quizzes(title, job_id, course_id)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAllowed,
  });

  // Fetch quiz attempts for analytics
  const { data: allAttempts } = useQuery({
    queryKey: ["cbtAllAttempts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quiz_attempts").select("*").order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAllowed,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !isAllowed) return <Navigate to="/dashboard" />;

  const handleAddQuestion = async () => {
    if (!questionForm.question.trim() || questionForm.options.some(o => !o.trim())) {
      toast.error("Question and all options required"); return;
    }
    try {
      // Create or find a question bank quiz for this category
      let quizId: string;
      const bankTitle = `Question Bank: ${questionForm.job_role} - ${questionForm.seniority_level}`;
      const existing = allQuizzes?.find(q => q.title === bankTitle);
      if (existing) {
        quizId = existing.id;
      } else {
        const { data: newQuiz, error: qErr } = await supabase.from("quizzes").insert({
          title: bankTitle, description: `${questionForm.category} questions for ${questionForm.job_role}`,
          created_by: user.id, is_published: false, pass_score: 50, time_limit_minutes: 30,
        }).select().single();
        if (qErr) throw qErr;
        quizId = newQuiz.id;
      }

      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: quizId, question: questionForm.question,
        options: questionForm.options, correct_answer: questionForm.correct_answer,
        order_index: (allQuestions?.length || 0),
      });
      if (error) throw error;

      toast.success("Question added to bank!");
      setQuestionForm({ question: "", options: ["", "", "", ""], correct_answer: 0, category: "Technical", job_role: "General", seniority_level: "Entry Level", difficulty_level: "Medium", tags: "" });
      setShowAddQuestion(false);
      queryClient.invalidateQueries({ queryKey: ["cbtAllQuestions"] });
      queryClient.invalidateQueries({ queryKey: ["cbtAllQuizzes"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateExam = async () => {
    if (!examForm.title) { toast.error("Title required"); return; }
    try {
      const { error } = await supabase.from("quizzes").insert({
        title: examForm.title, description: examForm.description || null,
        created_by: user.id, pass_score: examForm.pass_score,
        time_limit_minutes: examForm.time_limit_minutes, is_published: false,
      });
      if (error) throw error;
      toast.success("Exam template created!");
      setShowCreateExam(false);
      setExamForm({ title: "", description: "", pass_score: 50, time_limit_minutes: 30, job_role: "General", seniority_level: "Entry Level", randomize: true, anti_cheat: true, question_count: 20 });
      queryClient.invalidateQueries({ queryKey: ["cbtAllQuizzes"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleBulkImport = async () => {
    try {
      const lines = bulkText.trim().split("\n").filter(l => l.trim());
      let imported = 0;
      // Simple format: Question|Option1|Option2|Option3|Option4|CorrectIndex
      for (const line of lines) {
        const parts = line.split("|").map(p => p.trim());
        if (parts.length >= 6) {
          const bankTitle = "Question Bank: General - Entry Level";
          let quizId: string;
          const existing = allQuizzes?.find(q => q.title === bankTitle);
          if (existing) { quizId = existing.id; } else {
            const { data: nq, error: e } = await supabase.from("quizzes").insert({
              title: bankTitle, description: "Bulk imported questions", created_by: user.id, is_published: false, pass_score: 50, time_limit_minutes: 30,
            }).select().single();
            if (e) throw e;
            quizId = nq.id;
          }
          await supabase.from("quiz_questions").insert({
            quiz_id: quizId, question: parts[0], options: [parts[1], parts[2], parts[3], parts[4]],
            correct_answer: parseInt(parts[5]) || 0, order_index: imported,
          });
          imported++;
        }
      }
      toast.success(`${imported} questions imported!`);
      setBulkText("");
      setShowBulkImport(false);
      queryClient.invalidateQueries({ queryKey: ["cbtAllQuestions"] });
      queryClient.invalidateQueries({ queryKey: ["cbtAllQuizzes"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await supabase.from("quiz_questions").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["cbtAllQuestions"] });
      toast.success("Question deleted");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleTogglePublish = async (quizId: string, current: boolean) => {
    await supabase.from("quizzes").update({ is_published: !current }).eq("id", quizId);
    queryClient.invalidateQueries({ queryKey: ["cbtAllQuizzes"] });
    toast.success(current ? "Unpublished" : "Published");
  };

  const totalQuestions = allQuestions?.length || 0;
  const totalExams = allQuizzes?.length || 0;
  const publishedExams = allQuizzes?.filter(q => q.is_published).length || 0;
  const totalAttempts = allAttempts?.length || 0;
  const passedAttempts = allAttempts?.filter(a => a.passed).length || 0;
  const avgScore = totalAttempts > 0 ? Math.round((allAttempts?.reduce((s, a) => s + (a.score || 0), 0) || 0) / totalAttempts) : 0;

  // Filter questions
  const filteredQuestions = allQuestions?.filter(q => {
    if (searchQ && !q.question.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">CBT Administration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage question banks, exam templates, and assessment analytics</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Upload className="h-3.5 w-3.5 mr-1" /> Bulk Import</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Bulk Import Questions</DialogTitle></DialogHeader>
              <p className="text-xs text-muted-foreground">Format: Question|Option1|Option2|Option3|Option4|CorrectIndex (0-3)</p>
              <Textarea rows={10} placeholder="What is 2+2?|3|4|5|6|1" value={bulkText} onChange={e => setBulkText(e.target.value)} />
              <Button onClick={handleBulkImport} disabled={!bulkText.trim()}>Import Questions</Button>
            </DialogContent>
          </Dialog>
          <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Question</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Question to Bank</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Job Role</Label>
                    <Select value={questionForm.job_role} onValueChange={v => setQuestionForm(p => ({ ...p, job_role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{JOB_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Seniority</Label>
                    <Select value={questionForm.seniority_level} onValueChange={v => setQuestionForm(p => ({ ...p, seniority_level: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SENIORITY_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select value={questionForm.category} onValueChange={v => setQuestionForm(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{QUESTION_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Difficulty</Label>
                    <Select value={questionForm.difficulty_level} onValueChange={v => setQuestionForm(p => ({ ...p, difficulty_level: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DIFFICULTY_LEVELS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea placeholder="Enter question text *" value={questionForm.question} onChange={e => setQuestionForm(p => ({ ...p, question: e.target.value }))} />
                {questionForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={questionForm.correct_answer === i} onChange={() => setQuestionForm(p => ({ ...p, correct_answer: i }))} />
                    <Input placeholder={`Option ${i + 1} *`} value={opt} onChange={e => {
                      const opts = [...questionForm.options]; opts[i] = e.target.value;
                      setQuestionForm(p => ({ ...p, options: opts }));
                    }} />
                  </div>
                ))}
                <Input placeholder="Tags (comma separated)" value={questionForm.tags} onChange={e => setQuestionForm(p => ({ ...p, tags: e.target.value }))} />
                <Button className="w-full" onClick={handleAddQuestion}><Save className="h-4 w-4 mr-1" /> Add to Question Bank</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showCreateExam} onOpenChange={setShowCreateExam}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Create Exam</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Exam Template</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Exam Title *" value={examForm.title} onChange={e => setExamForm(p => ({ ...p, title: e.target.value }))} />
                <Textarea placeholder="Description" value={examForm.description} onChange={e => setExamForm(p => ({ ...p, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pass Score (%)</Label>
                    <Input type="number" value={examForm.pass_score} onChange={e => setExamForm(p => ({ ...p, pass_score: parseInt(e.target.value) || 50 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Time Limit (min)</Label>
                    <Input type="number" value={examForm.time_limit_minutes} onChange={e => setExamForm(p => ({ ...p, time_limit_minutes: parseInt(e.target.value) || 30 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Job Role</Label>
                    <Select value={examForm.job_role} onValueChange={v => setExamForm(p => ({ ...p, job_role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{JOB_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Seniority</Label>
                    <Select value={examForm.seniority_level} onValueChange={v => setExamForm(p => ({ ...p, seniority_level: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SENIORITY_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreateExam}><Save className="h-4 w-4 mr-1" /> Create Exam</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Questions", value: totalQuestions, icon: HelpCircle },
          { label: "Exam Templates", value: totalExams, icon: Layers },
          { label: "Published Exams", value: publishedExams, icon: Eye },
          { label: "Total Attempts", value: totalAttempts, icon: Users },
          { label: "Pass Rate", value: totalAttempts > 0 ? `${Math.round(passedAttempts / totalAttempts * 100)}%` : "—", icon: CheckCircle },
          { label: "Avg Score", value: avgScore ? `${avgScore}%` : "—", icon: BarChart3 },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-soft border border-border">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <div className="text-xl font-display font-bold text-foreground">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Question Bank ({totalQuestions})</TabsTrigger>
          <TabsTrigger value="exams">Exam Templates ({totalExams})</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

        {/* Question Bank */}
        <TabsContent value="questions" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search questions..." className="pl-9" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            {filteredQuestions.length > 0 ? filteredQuestions.slice(0, 50).map((q, i) => (
              <div key={q.id} className="bg-card rounded-xl p-4 shadow-soft border border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(q.options as string[])?.map((opt: string, j: number) => (
                        <Badge key={j} variant={q.correct_answer === j ? "default" : "outline"} className="text-[10px]">
                          {String.fromCharCode(65 + j)}. {opt}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Bank: {(q as any).quizzes?.title || "Unknown"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleDeleteQuestion(q.id!)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <HelpCircle className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
                <p className="text-sm text-muted-foreground">No questions in the bank yet</p>
                <Button size="sm" className="mt-3" onClick={() => setShowAddQuestion(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add First Question
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Exam Templates */}
        <TabsContent value="exams" className="mt-4 space-y-3">
          {allQuizzes && allQuizzes.length > 0 ? allQuizzes.map(quiz => (
            <div key={quiz.id} className="bg-card rounded-xl p-4 shadow-soft border border-border">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{quiz.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {(quiz as any).quiz_questions?.length || 0} questions • Pass: {quiz.pass_score}% • Time: {quiz.time_limit_minutes} min
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={quiz.is_published ? "default" : "outline"} className="text-[10px]">
                    {quiz.is_published ? "Published" : "Draft"}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleTogglePublish(quiz.id, !!quiz.is_published)}>
                    {quiz.is_published ? "Unpublish" : "Publish"}
                  </Button>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Layers className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <p className="text-sm text-muted-foreground">No exam templates yet</p>
            </div>
          )}
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Score Distribution</h3>
              <div className="space-y-3">
                {["0-25%", "26-50%", "51-75%", "76-100%"].map((range, i) => {
                  const mins = [0, 26, 51, 76];
                  const maxs = [25, 50, 75, 100];
                  const count = allAttempts?.filter(a => (a.score || 0) >= mins[i] && (a.score || 0) <= maxs[i]).length || 0;
                  const pct = totalAttempts > 0 ? Math.round(count / totalAttempts * 100) : 0;
                  return (
                    <div key={range}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{range}</span>
                        <span className="font-semibold text-foreground">{count} ({pct}%)</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Recent Attempts</h3>
              <div className="space-y-2">
                {allAttempts?.slice(0, 10).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <span className="text-xs text-muted-foreground">{new Date(a.started_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{a.score}%</span>
                      <Badge variant={a.passed ? "default" : "destructive"} className="text-[10px]">{a.passed ? "Pass" : "Fail"}</Badge>
                    </div>
                  </div>
                )) || <p className="text-xs text-muted-foreground text-center py-4">No attempts yet</p>}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CBTAdminPage;
