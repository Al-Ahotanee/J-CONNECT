import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchInstructorCourses, createCourse, updateCourse, createLesson, updateLesson,
  deleteLesson, fetchCourseMaterials, uploadCourseMaterial, deleteCourseMaterial,
  createQuiz, addQuizQuestion, deleteQuizQuestion, fetchCourseQuizzes, updateQuiz,
  issueCertificate,
} from "@/lib/learning-api";
import { fetchLessons } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  BookOpen, Plus, Pencil, Trash2, Upload, FileText, Video, Users,
  GraduationCap, Award, BarChart3, Eye, EyeOff, CheckCircle, Clock,
  Settings, HelpCircle, Layers, FolderOpen, Play, Save, X,
} from "lucide-react";
import { toast } from "sonner";
import { SKILL_CATEGORIES } from "@/lib/constants";

const CreatorDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [showAddQuiz, setShowAddQuiz] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [courseForm, setCourseForm] = useState({ title: "", description: "", category: "", level: "Beginner", duration: "", is_free: true, price: 0 });
  const [lessonForm, setLessonForm] = useState({ title: "", content: "", video_url: "", duration: "" });
  const [quizForm, setQuizForm] = useState({ title: "", description: "", pass_score: 50, time_limit_minutes: 30 });
  const [questionForm, setQuestionForm] = useState({ question: "", options: ["", "", "", ""], correct_answer: 0 });

  const { data: courses, isLoading } = useQuery({
    queryKey: ["instructorCourses", user?.id],
    queryFn: () => fetchInstructorCourses(user!.id),
    enabled: !!user,
  });

  const selectedCourse = courses?.find(c => c.id === selectedCourseId);

  const { data: lessons } = useQuery({
    queryKey: ["lessons", selectedCourseId],
    queryFn: () => fetchLessons(selectedCourseId!),
    enabled: !!selectedCourseId,
  });

  const { data: materials } = useQuery({
    queryKey: ["materials", selectedCourseId],
    queryFn: () => fetchCourseMaterials(selectedCourseId!),
    enabled: !!selectedCourseId,
  });

  const { data: quizzes } = useQuery({
    queryKey: ["courseQuizzes", selectedCourseId],
    queryFn: () => fetchCourseQuizzes(selectedCourseId!),
    enabled: !!selectedCourseId,
  });

  // Fetch enrollments for selected course
  const { data: courseEnrollments } = useQuery({
    queryKey: ["courseEnrollments", selectedCourseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments")
        .select("*")
        .eq("course_id", selectedCourseId!);
      if (error) throw error;
      // Fetch profiles separately
      const userIds = data?.map(e => e.user_id) || [];
      if (!userIds.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      return data?.map(e => ({ ...e, profile: profiles?.find(p => p.user_id === e.user_id) })) || [];
    },
    enabled: !!selectedCourseId,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const handleCreateCourse = async () => {
    try {
      await createCourse({ ...courseForm, instructor_id: user.id });
      toast.success("Course created!");
      setCourseForm({ title: "", description: "", category: "", level: "Beginner", duration: "", is_free: true, price: 0 });
      setShowCreateCourse(false);
      queryClient.invalidateQueries({ queryKey: ["instructorCourses"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleTogglePublish = async (courseId: string, current: boolean) => {
    try {
      await updateCourse(courseId, { is_published: !current });
      toast.success(current ? "Course unpublished" : "Course published!");
      queryClient.invalidateQueries({ queryKey: ["instructorCourses"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddLesson = async () => {
    if (!selectedCourseId) return;
    try {
      await createLesson({
        course_id: selectedCourseId,
        ...lessonForm,
        order_index: (lessons?.length || 0),
      });
      toast.success("Lesson added!");
      setLessonForm({ title: "", content: "", video_url: "", duration: "" });
      setShowAddLesson(false);
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteLesson(lessonId);
      toast.success("Lesson deleted");
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCourseId || !e.target.files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        await uploadCourseMaterial(file, selectedCourseId);
      }
      toast.success("Materials uploaded!");
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handleCreateQuiz = async () => {
    if (!selectedCourseId) return;
    try {
      const quiz = await createQuiz({ ...quizForm, course_id: selectedCourseId, created_by: user.id });
      toast.success("Quiz created!");
      setQuizForm({ title: "", description: "", pass_score: 50, time_limit_minutes: 30 });
      setShowAddQuiz(false);
      setActiveQuizId(quiz.id);
      queryClient.invalidateQueries({ queryKey: ["courseQuizzes"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddQuestion = async () => {
    if (!activeQuizId) return;
    try {
      await addQuizQuestion({
        quiz_id: activeQuizId,
        ...questionForm,
        order_index: 0,
      });
      toast.success("Question added!");
      setQuestionForm({ question: "", options: ["", "", "", ""], correct_answer: 0 });
      setShowAddQuestion(false);
      queryClient.invalidateQueries({ queryKey: ["courseQuizzes"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handlePublishQuiz = async (quizId: string, current: boolean) => {
    try {
      await updateQuiz(quizId, { is_published: !current });
      toast.success(current ? "Quiz unpublished" : "Quiz published!");
      queryClient.invalidateQueries({ queryKey: ["courseQuizzes"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleIssueCertificate = async (userId: string, enrollmentId: string) => {
    if (!selectedCourseId) return;
    try {
      await issueCertificate({ user_id: userId, course_id: selectedCourseId, enrollment_id: enrollmentId, issued_by: user.id });
      toast.success("Certificate issued!");
    } catch (err: any) {
      if (err.message?.includes("duplicate")) toast.info("Certificate already issued");
      else toast.error(err.message);
    }
  };

  const totalStudents = courses?.reduce((sum, c) => sum + ((c as any).enrollments?.length || 0), 0) || 0;

  // ─── No course selected: show overview ───
  if (!selectedCourseId) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-hero-gradient rounded-2xl p-6 md:p-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">Creator Studio</h1>
          <p className="text-primary-foreground/70 mt-1 text-sm">Create, manage, and publish your courses.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { label: "Total Courses", value: courses?.length || 0, icon: BookOpen },
              { label: "Published", value: courses?.filter(c => c.is_published).length || 0, icon: Eye },
              { label: "Total Students", value: totalStudents, icon: Users },
              { label: "Total Lessons", value: courses?.reduce((s, c) => s + ((c as any).lessons?.length || 0), 0) || 0, icon: Layers },
            ].map((stat) => (
              <div key={stat.label} className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4">
                <stat.icon className="h-5 w-5 text-primary-foreground/70 mb-2" />
                <div className="text-2xl font-display font-bold text-primary-foreground">{stat.value}</div>
                <div className="text-xs text-primary-foreground/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">My Courses</h2>
          <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> New Course</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create New Course</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Course Title *" value={courseForm.title} onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} />
                <Textarea placeholder="Course Description" value={courseForm.description} onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={courseForm.category} onValueChange={v => setCourseForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {SKILL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={courseForm.level} onValueChange={v => setCourseForm(p => ({ ...p, level: v }))}>
                    <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Duration (e.g., 8 hours)" value={courseForm.duration} onChange={e => setCourseForm(p => ({ ...p, duration: e.target.value }))} />
                <div className="flex items-center gap-3">
                  <Switch checked={courseForm.is_free} onCheckedChange={v => setCourseForm(p => ({ ...p, is_free: v }))} />
                  <span className="text-sm text-foreground">{courseForm.is_free ? "Free Course" : "Paid Course"}</span>
                  {!courseForm.is_free && (
                    <Input type="number" placeholder="Price (₦)" className="w-32" value={courseForm.price} onChange={e => setCourseForm(p => ({ ...p, price: Number(e.target.value) }))} />
                  )}
                </div>
                <Button className="w-full bg-primary text-primary-foreground" onClick={handleCreateCourse} disabled={!courseForm.title}>
                  <Save className="h-4 w-4 mr-1" /> Create Course
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-card rounded-xl shadow-soft border border-border p-5 hover:shadow-elevated transition-all cursor-pointer group"
                onClick={() => setSelectedCourseId(course.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-sm font-semibold text-foreground truncate">{course.title}</h3>
                    <p className="text-[11px] text-muted-foreground">{course.category} • {course.level}</p>
                  </div>
                  <Badge variant={course.is_published ? "default" : "outline"} className="text-[10px] shrink-0">
                    {course.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted rounded-lg p-2">
                    <div className="text-sm font-bold text-foreground">{(course as any).lessons?.length || 0}</div>
                    <div className="text-[10px] text-muted-foreground">Lessons</div>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <div className="text-sm font-bold text-foreground">{(course as any).enrollments?.length || 0}</div>
                    <div className="text-[10px] text-muted-foreground">Students</div>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <div className="text-sm font-bold text-foreground">{course.is_free ? "Free" : `₦${course.price}`}</div>
                    <div className="text-[10px] text-muted-foreground">Price</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <BookOpen className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
            <h3 className="font-display text-base font-semibold text-foreground">No Courses Yet</h3>
            <p className="text-xs text-muted-foreground mt-1">Create your first course to start teaching!</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Course Detail Management View ───
  return (
    <div className="p-6 space-y-6">
      {/* Course Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedCourseId(null)}>← Back</Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold text-foreground truncate">{selectedCourse?.title}</h1>
          <p className="text-xs text-muted-foreground">{selectedCourse?.category} • {selectedCourse?.level}</p>
        </div>
        <Button
          size="sm"
          variant={selectedCourse?.is_published ? "outline" : "default"}
          onClick={() => handleTogglePublish(selectedCourseId!, selectedCourse?.is_published || false)}
          className={selectedCourse?.is_published ? "" : "bg-primary text-primary-foreground"}
        >
          {selectedCourse?.is_published ? <><EyeOff className="h-3 w-3 mr-1" /> Unpublish</> : <><Eye className="h-3 w-3 mr-1" /> Publish</>}
        </Button>
      </div>

      <Tabs defaultValue="lessons" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="lessons">Lessons ({lessons?.length || 0})</TabsTrigger>
          <TabsTrigger value="materials">Materials ({materials?.length || 0})</TabsTrigger>
          <TabsTrigger value="quizzes">Exams ({quizzes?.length || 0})</TabsTrigger>
          <TabsTrigger value="students">Students ({courseEnrollments?.length || 0})</TabsTrigger>
        </TabsList>

        {/* ─── Lessons Tab ─── */}
        <TabsContent value="lessons" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddLesson} onOpenChange={setShowAddLesson}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add Lesson</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Lesson Title *" value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} />
                  <Textarea placeholder="Lesson Content (text/notes)" rows={6} value={lessonForm.content} onChange={e => setLessonForm(p => ({ ...p, content: e.target.value }))} />
                  <Input placeholder="Video URL (YouTube/Vimeo embed link)" value={lessonForm.video_url} onChange={e => setLessonForm(p => ({ ...p, video_url: e.target.value }))} />
                  <Input placeholder="Duration (e.g., 15 min)" value={lessonForm.duration} onChange={e => setLessonForm(p => ({ ...p, duration: e.target.value }))} />
                  <Button className="w-full bg-primary text-primary-foreground" onClick={handleAddLesson} disabled={!lessonForm.title}>
                    <Save className="h-4 w-4 mr-1" /> Save Lesson
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {lessons && lessons.length > 0 ? (
            <div className="space-y-2">
              {lessons.map((lesson, idx) => (
                <div key={lesson.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{lesson.title}</h3>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      {lesson.video_url && <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Video</span>}
                      {lesson.content && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Text</span>}
                      {lesson.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {lesson.duration}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteLesson(lesson.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Layers className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <p className="text-sm text-muted-foreground">No lessons yet. Add your first lesson!</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Materials Tab ─── */}
        <TabsContent value="materials" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Upload PDFs, documents, videos, and other course materials.</p>
            <label className="cursor-pointer">
              <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mp3,.zip,.txt" />
              <Button size="sm" className="bg-primary text-primary-foreground" disabled={uploading} asChild>
                <span><Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading..." : "Upload Files"}</span>
              </Button>
            </label>
          </div>

          {materials && materials.length > 0 ? (
            <div className="space-y-2">
              {materials.map((mat) => (
                <div key={mat.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{mat.title}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase">{mat.file_type} • {mat.file_size ? `${(mat.file_size / 1024 / 1024).toFixed(1)} MB` : "Unknown size"}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { deleteCourseMaterial(mat.id); queryClient.invalidateQueries({ queryKey: ["materials"] }); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <FolderOpen className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <p className="text-sm text-muted-foreground">No materials uploaded yet.</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Quizzes/Exams Tab ─── */}
        <TabsContent value="quizzes" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddQuiz} onOpenChange={setShowAddQuiz}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Create Exam</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Exam/Quiz</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Exam Title *" value={quizForm.title} onChange={e => setQuizForm(p => ({ ...p, title: e.target.value }))} />
                  <Textarea placeholder="Description" value={quizForm.description} onChange={e => setQuizForm(p => ({ ...p, description: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Pass Score (%)</label>
                      <Input type="number" value={quizForm.pass_score} onChange={e => setQuizForm(p => ({ ...p, pass_score: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Time Limit (min)</label>
                      <Input type="number" value={quizForm.time_limit_minutes} onChange={e => setQuizForm(p => ({ ...p, time_limit_minutes: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <Button className="w-full bg-primary text-primary-foreground" onClick={handleCreateQuiz} disabled={!quizForm.title}>
                    <Save className="h-4 w-4 mr-1" /> Create Exam
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {quizzes && quizzes.length > 0 ? (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="bg-card rounded-xl p-5 shadow-soft border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-foreground">{quiz.title}</h3>
                      <p className="text-[11px] text-muted-foreground">{(quiz as any).quiz_questions?.length || 0} questions • Pass: {quiz.pass_score}% • {quiz.time_limit_minutes} min</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={quiz.is_published ? "outline" : "default"}
                        className={`text-xs h-7 ${!quiz.is_published ? "bg-primary text-primary-foreground" : ""}`}
                        onClick={() => handlePublishQuiz(quiz.id, quiz.is_published || false)}
                      >
                        {quiz.is_published ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => { setActiveQuizId(quiz.id); setShowAddQuestion(true); }}>
                    <Plus className="h-3 w-3 mr-1" /> Add Question
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <HelpCircle className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <p className="text-sm text-muted-foreground">No exams created yet.</p>
            </div>
          )}

          {/* Add Question Dialog */}
          <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Textarea placeholder="Question text *" value={questionForm.question} onChange={e => setQuestionForm(p => ({ ...p, question: e.target.value }))} />
                {questionForm.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={questionForm.correct_answer === idx}
                      onChange={() => setQuestionForm(p => ({ ...p, correct_answer: idx }))}
                      className="accent-primary"
                    />
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={e => {
                        const opts = [...questionForm.options];
                        opts[idx] = e.target.value;
                        setQuestionForm(p => ({ ...p, options: opts }));
                      }}
                    />
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground">Select the radio button next to the correct answer.</p>
                <Button className="w-full bg-primary text-primary-foreground" onClick={handleAddQuestion} disabled={!questionForm.question || questionForm.options.some(o => !o)}>
                  <Save className="h-4 w-4 mr-1" /> Add Question
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── Students Tab ─── */}
        <TabsContent value="students" className="space-y-4">
          {courseEnrollments && courseEnrollments.length > 0 ? (
            <div className="space-y-2">
              {courseEnrollments.map((enrollment: any) => (
                <div key={enrollment.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{enrollment.profile?.full_name?.[0] || "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{enrollment.profile?.full_name || "Unknown"}</h3>
                    <p className="text-[10px] text-muted-foreground">{enrollment.profile?.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">{enrollment.progress || 0}%</div>
                      <Progress value={enrollment.progress || 0} className="h-1.5 w-20" />
                    </div>
                    {enrollment.completed ? (
                      <Button size="sm" className="h-7 text-[10px] bg-secondary text-secondary-foreground" onClick={() => handleIssueCertificate(enrollment.user_id, enrollment.id)}>
                        <Award className="h-3 w-3 mr-1" /> Issue Cert
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">In Progress</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Users className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreatorDashboardPage;
