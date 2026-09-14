import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCourses, enrollInCourse, fetchMyEnrollments } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Search, BookOpen, Clock, Users, GraduationCap, Play } from "lucide-react";
import { toast } from "sonner";
import { SKILL_CATEGORIES } from "@/lib/constants";

const LearningPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", { search, category, level }],
    queryFn: () => fetchCourses({ search: search || undefined, category: category && category !== "all" ? category : undefined, level: level && level !== "all" ? level : undefined }),
    enabled: !!user,
  });

  const { data: enrollments } = useQuery({
    queryKey: ["myEnrollments", user?.id],
    queryFn: () => fetchMyEnrollments(user!.id),
    enabled: !!user,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const enrolledCourseIds = new Set(enrollments?.map(e => e.course_id) || []);

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      await enrollInCourse(user.id, courseId);
      toast.success("Successfully enrolled!");
    } catch (err: any) {
      if (err.message?.includes("duplicate")) toast.info("You're already enrolled");
      else toast.error(err.message || "Failed to enroll");
    } finally { setEnrollingId(null); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">E-Learning Platform</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Develop new skills and earn certifications</p>
      </div>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse Courses</TabsTrigger>
          <TabsTrigger value="enrolled">My Courses ({enrollments?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {SKILL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue placeholder="All Levels" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading courses...</div>
          ) : courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {courses.map((course) => {
                const isEnrolled = enrolledCourseIds.has(course.id);
                return (
                  <div key={course.id} className="bg-card rounded-xl shadow-soft border border-border overflow-hidden hover:shadow-elevated transition-all group">
                    <div className="h-32 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="h-10 w-10 text-primary/20" />
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Badge variant="outline" className="text-[10px] h-5">{course.level}</Badge>
                        {course.is_free ? (
                          <Badge variant="secondary" className="text-[10px] h-5">Free</Badge>
                        ) : (
                          <Badge className="text-[10px] h-5">₦{course.price}</Badge>
                        )}
                      </div>
                      <h3 className="font-display text-sm font-semibold text-foreground mb-1 line-clamp-2">{course.title}</h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
                        {course.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {course.duration}</span>}
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {course.enrolled_count || 0}</span>
                      </div>
                      {isEnrolled ? (
                        <Button size="sm" className="w-full h-8 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
                          <Link to={`/course/${course.id}`}><Play className="h-3 w-3 mr-1" /> Continue</Link>
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleEnroll(course.id)} disabled={enrollingId === course.id}>
                          {enrollingId === course.id ? "Enrolling..." : <><GraduationCap className="h-3 w-3 mr-1" /> Enroll</>}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <BookOpen className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
              <h3 className="font-display text-base font-semibold text-foreground">No Courses Available</h3>
              <p className="text-xs text-muted-foreground mt-1">New courses will be added soon.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrolled" className="mt-4">
          {enrollments && enrollments.length > 0 ? (
            <div className="space-y-3">
              {enrollments.map((enrollment) => {
                const course = (enrollment as any).courses;
                return (
                  <div key={enrollment.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-sm font-semibold text-foreground truncate">{course?.title}</h3>
                      <p className="text-[11px] text-muted-foreground">{course?.category} • {course?.level}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <Progress value={enrollment.progress || 0} className="flex-1 max-w-[200px] h-1.5" />
                        <span className="text-[10px] font-semibold text-foreground">{enrollment.progress || 0}%</span>
                        {enrollment.completed && <Badge variant="default" className="text-[10px] h-5">Done</Badge>}
                      </div>
                    </div>
                    <Button size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0" asChild>
                      <Link to={`/course/${enrollment.course_id}`}><Play className="h-3 w-3 mr-1" /> {enrollment.completed ? "Review" : "Continue"}</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <GraduationCap className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
              <h3 className="font-display text-base font-semibold text-foreground">No Enrollments Yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Browse courses and enroll to start learning!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LearningPage;
