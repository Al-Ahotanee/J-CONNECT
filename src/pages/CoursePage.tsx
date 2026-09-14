import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLessons, fetchQuiz, submitQuizAttempt, fetchQuizAttempts, updateEnrollment } from "@/lib/api";
import { markLessonComplete, fetchLessonCompletions, fetchCourseMaterials } from "@/lib/learning-api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, Play, CheckCircle, Clock, ArrowLeft, ArrowRight,
  Award, Timer, AlertCircle, FileText, Download,
} from "lucide-react";
import { toast } from "sonner";

const CoursePage = () => {
  const { user, loading: authLoading } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);

  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: () => fetchLessons(courseId!),
    enabled: !!courseId && !!user,
  });

  const { data: course } = useQuery({
    queryKey: ["courseDetail", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!user,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("*")
        .eq("course_id", courseId!).eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!courseId && !!user,
  });

  // Persisted lesson completions
  const { data: completedLessonsSet } = useQuery({
    queryKey: ["lessonCompletions", user?.id, courseId],
    queryFn: () => fetchLessonCompletions(user!.id, courseId!),
    enabled: !!user && !!courseId,
  });

  const completedLessons = completedLessonsSet || new Set<string>();

  // Course materials
  const { data: materials } = useQuery({
    queryKey: ["courseMaterials", courseId],
    queryFn: () => fetchCourseMaterials(courseId!),
    enabled: !!courseId && !!user,
  });

  // Fetch quiz for course
  const { data: quizData } = useQuery({
    queryKey: ["courseQuiz", courseId],
    queryFn: async () => {
      const { data: quiz } = await supabase.from("quizzes")
        .select("*")
        .eq("course_id", courseId!)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (!quiz) return null;
      // Fetch questions from the public view (no correct_answer exposed)
      const { data: questions } = await supabase.from("quiz_questions_public")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("order_index", { ascending: true });
      return { ...quiz, quiz_questions: questions || [] };
    },
    enabled: !!courseId && !!user,
  });

  const { data: quizAttempts } = useQuery({
    queryKey: ["quizAttempts", quizData?.id, user?.id],
    queryFn: () => fetchQuizAttempts(quizData!.id, user!.id),
    enabled: !!quizData?.id && !!user,
  });

  // Timer
  useEffect(() => {
    if (!quizStarted || timeLeft === null || timeLeft <= 0 || quizSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev !== null && prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [quizStarted, timeLeft, quizSubmitted]);

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const currentLesson = lessons?.[selectedLessonIdx];

  const handleMarkComplete = async (lessonId: string) => {
    if (!courseId) return;
    try {
      await markLessonComplete(user.id, lessonId, courseId);
      queryClient.invalidateQueries({ queryKey: ["lessonCompletions", user.id, courseId] });

      // Update enrollment progress
      if (lessons && enrollment) {
        const newCompletedCount = completedLessons.size + 1;
        const progress = Math.round((newCompletedCount / lessons.length) * 100);
        await updateEnrollment(enrollment.id, {
          progress,
          completed: progress === 100,
        });
        queryClient.invalidateQueries({ queryKey: ["enrollment"] });
      }
      toast.success("Lesson marked complete!");
    } catch (err: any) {
      if (err.message?.includes("duplicate")) {
        toast.info("Already completed");
      } else {
        toast.error(err.message || "Failed to mark complete");
      }
    }
  };

  const startQuiz = () => {
    if (!quizData) return;
    setQuizStarted(true);
    setShowQuiz(true);
    setQuizSubmitted(false);
    setQuizAnswers({});
    setQuizScore(null);
    setTimeLeft((quizData.time_limit_minutes || 30) * 60);
  };

  const handleSubmitQuiz = async () => {
    if (!quizData || quizSubmitted) return;
    setQuizSubmitted(true);
    setQuizStarted(false);

    // Use server-side grading to prevent answer exposure
    try {
      const { data: gradeResult, error: gradeError } = await supabase.rpc("grade_quiz_attempt", {
        _quiz_id: quizData.id,
        _answers: quizAnswers,
      });
      
      if (gradeError) throw gradeError;
      const result = gradeResult?.[0] || { score: 0, passed: false, total_questions: 0 };
      const score = result.score;
      const passed = result.passed;
      setQuizScore(score);

      await submitQuizAttempt({
        quiz_id: quizData.id,
        user_id: user.id,
        answers: quizAnswers,
        score,
        passed,
      });
      queryClient.invalidateQueries({ queryKey: ["quizAttempts"] });
      if (passed) {
        toast.success(`Congratulations! You passed with ${score}%`);
      } else {
        toast.error(`You scored ${score}%. Pass score is ${quizData.pass_score}%`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quiz");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const bestAttempt = quizAttempts?.sort((a, b) => (b.score || 0) - (a.score || 0))?.[0];
  const overallProgress = lessons?.length ? Math.round((completedLessons.size / lessons.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/learning"><ArrowLeft size={16} className="mr-1" /> Back to Courses</Link>
        </Button>
      </div>

      {course && (
        <div className="bg-hero-gradient rounded-2xl p-6">
          <h1 className="font-display text-2xl font-bold text-primary-foreground">{course.title}</h1>
          <p className="text-primary-foreground/70 mt-1 text-sm">{course.description}</p>
          <div className="mt-4 flex items-center gap-4">
            <Progress value={overallProgress} className="flex-1 max-w-md h-2" />
            <span className="text-sm font-semibold text-primary-foreground">{overallProgress}% complete</span>
          </div>
        </div>
      )}

      {!showQuiz ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lesson List */}
          <div className="bg-card rounded-xl shadow-soft border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-display font-semibold text-foreground">Lessons</h3>
              <p className="text-xs text-muted-foreground">{lessons?.length || 0} lessons • {completedLessons.size} completed</p>
            </div>
            <div className="divide-y divide-border max-h-[50vh] overflow-y-auto">
              {isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading...</p>
              ) : lessons && lessons.length > 0 ? (
                lessons.map((lesson, idx) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonIdx(idx)}
                    className={`w-full text-left p-4 hover:bg-muted transition-colors flex items-center gap-3 ${
                      selectedLessonIdx === idx ? "bg-accent" : ""
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      completedLessons.has(lesson.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {completedLessons.has(lesson.id) ? <CheckCircle size={14} /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                      {lesson.duration && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={10} /> {lesson.duration}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="p-4 text-sm text-muted-foreground">No lessons available yet.</p>
              )}
            </div>

            {/* Course Materials */}
            {materials && materials.length > 0 && (
              <div className="p-4 border-t border-border">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Materials</h4>
                <div className="space-y-2">
                  {materials.map((mat) => (
                    <a key={mat.id} href={mat.file_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-primary hover:underline">
                      <FileText size={12} /> {mat.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Quiz button */}
            {quizData && (
              <div className="p-4 border-t border-border">
                <Button
                  size="sm"
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={startQuiz}
                >
                  <Award size={14} className="mr-1" /> Take Exam
                </Button>
                {bestAttempt && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Best score: {bestAttempt.score}% {bestAttempt.passed ? "✓ Passed" : "✗ Failed"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Lesson Content */}
          <div className="lg:col-span-3">
            {currentLesson ? (
              <div className="bg-card rounded-xl shadow-soft border border-border">
                {/* Video */}
                {currentLesson.video_url && (
                  <div className="aspect-video bg-foreground/5 rounded-t-xl overflow-hidden">
                    <iframe
                      src={currentLesson.video_url}
                      className="w-full h-full"
                      allowFullScreen
                      title={currentLesson.title}
                    />
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl font-bold text-foreground">{currentLesson.title}</h2>
                    {currentLesson.duration && (
                      <Badge variant="outline" className="text-xs">
                        <Clock size={12} className="mr-1" /> {currentLesson.duration}
                      </Badge>
                    )}
                  </div>

                  <div className="prose prose-sm max-w-none text-foreground">
                    {currentLesson.content ? (
                      <div className="whitespace-pre-wrap">{currentLesson.content}</div>
                    ) : (
                      <p className="text-muted-foreground italic">No content available for this lesson.</p>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLessonIdx(Math.max(0, selectedLessonIdx - 1))}
                      disabled={selectedLessonIdx === 0}
                    >
                      <ArrowLeft size={14} className="mr-1" /> Previous
                    </Button>

                    {!completedLessons.has(currentLesson.id) ? (
                      <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => handleMarkComplete(currentLesson.id)}>
                        <CheckCircle size={14} className="mr-1" /> Mark Complete
                      </Button>
                    ) : (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle size={12} className="mr-1" /> Completed
                      </Badge>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLessonIdx(Math.min((lessons?.length || 1) - 1, selectedLessonIdx + 1))}
                      disabled={!lessons || selectedLessonIdx >= lessons.length - 1}
                    >
                      Next <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-xl shadow-soft border border-border p-12 text-center">
                <BookOpen size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select a lesson to start learning.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Quiz View */
        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-xl shadow-soft border border-border">
            {/* Quiz Header */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">{quizData?.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {(quizData as any)?.quiz_questions?.length || 0} questions • Pass score: {quizData?.pass_score}%
                </p>
              </div>
              {timeLeft !== null && !quizSubmitted && (
                <div className={`flex items-center gap-2 text-lg font-mono font-bold ${
                  timeLeft < 60 ? "text-destructive" : "text-foreground"
                }`}>
                  <Timer size={20} />
                  {formatTime(timeLeft)}
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              {!quizSubmitted ? (
                <>
                  {(quizData as any)?.quiz_questions
                    ?.sort((a: any, b: any) => a.order_index - b.order_index)
                    .map((q: any, idx: number) => (
                    <div key={q.id} className="bg-muted rounded-lg p-4">
                      <p className="font-semibold text-foreground mb-3">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="space-y-2">
                        {(q.options as string[]).map((opt: string, oIdx: number) => (
                          <label
                            key={oIdx}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                              quizAnswers[q.id] === oIdx
                                ? "bg-primary/10 border-primary"
                                : "bg-card border-border hover:bg-accent"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={quizAnswers[q.id] === oIdx}
                              onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: oIdx }))}
                              className="accent-primary"
                            />
                            <span className="text-sm text-foreground">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => { setShowQuiz(false); setQuizStarted(false); }}>
                      Cancel
                    </Button>
                    <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleSubmitQuiz}>
                      Submit Quiz
                    </Button>
                  </div>
                </>
              ) : (
                /* Results */
                <div className="text-center py-8">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    (quizScore || 0) >= (quizData?.pass_score || 50)
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {(quizScore || 0) >= (quizData?.pass_score || 50)
                      ? <Award size={48} />
                      : <AlertCircle size={48} />
                    }
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                    {(quizScore || 0) >= (quizData?.pass_score || 50) ? "Congratulations!" : "Try Again"}
                  </h3>
                  <p className="text-3xl font-display font-bold text-foreground mb-2">{quizScore}%</p>
                  <p className="text-muted-foreground mb-6">
                    {(quizScore || 0) >= (quizData?.pass_score || 50)
                      ? "You passed the quiz!"
                      : `You need ${quizData?.pass_score}% to pass.`}
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => setShowQuiz(false)}>
                      Back to Lessons
                    </Button>
                    {(quizScore || 0) < (quizData?.pass_score || 50) && (
                      <Button className="bg-primary text-primary-foreground" onClick={startQuiz}>
                        Retry Quiz
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursePage;
