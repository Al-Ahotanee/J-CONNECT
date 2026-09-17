import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCourses, fetchMyEnrollments, enrollInCourse } from "@/lib/api";
import { fetchUserCertificates } from "@/lib/learning-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, BookOpen, Clock, Users, GraduationCap, Play, Award,
  Download, CheckCircle, Star, BarChart3, Target, TrendingUp,
  FileText, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { SKILL_CATEGORIES } from "@/lib/constants";

const LearnerDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
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

  const { data: certificates } = useQuery({
    queryKey: ["myCertificates", user?.id],
    queryFn: () => fetchUserCertificates(user!.id),
    enabled: !!user,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const enrolledCourseIds = new Set(enrollments?.map(e => e.course_id) || []);
  const completedCourses = enrollments?.filter(e => e.completed) || [];
  const inProgressCourses = enrollments?.filter(e => !e.completed) || [];
  const totalProgress = enrollments?.length
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length)
    : 0;

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      await enrollInCourse(user.id, courseId);
      toast.success("Successfully enrolled!");
      queryClient.invalidateQueries({ queryKey: ["myEnrollments"] });
    } catch (err: any) {
      if (err.message?.includes("duplicate")) toast.info("You're already enrolled");
      else toast.error(err.message || "Failed to enroll");
    } finally { setEnrollingId(null); }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Stats */}
      <div className="bg-hero-gradient rounded-2xl p-6 md:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
              E-Learning Hub
            </h1>
            <p className="text-primary-foreground/70 mt-1 text-sm">
              Develop new skills, earn certifications, and advance your career.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { label: "Enrolled Courses", value: enrollments?.length || 0, icon: BookOpen },
            { label: "In Progress", value: inProgressCourses.length, icon: Target },
            { label: "Completed", value: completedCourses.length, icon: CheckCircle },
            { label: "Certificates", value: certificates?.length || 0, icon: Award },
          ].map((stat) => (
            <div key={stat.label} className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4">
              <stat.icon className="h-5 w-5 text-primary-foreground/70 mb-2" />
              <div className="text-2xl font-display font-bold text-primary-foreground">{stat.value}</div>
              <div className="text-xs text-primary-foreground/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="browse">Browse Courses</TabsTrigger>
          <TabsTrigger value="enrolled">My Courses ({enrollments?.length || 0})</TabsTrigger>
          <TabsTrigger value="certificates">Certificates ({certificates?.length || 0})</TabsTrigger>
        </TabsList>

        {/* ─── Browse Tab ─── */}
        <TabsContent value="browse" className="space-y-4">
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
                    <div className="h-36 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center relative">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="h-12 w-12 text-primary/20" />
                      )}
                      {course.is_free ? (
                        <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px]">FREE</Badge>
                      ) : (
                        <Badge className="absolute top-3 right-3 bg-secondary text-secondary-foreground text-[10px]">₦{course.price}</Badge>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Badge variant="outline" className="text-[10px] h-5">{course.level}</Badge>
                        {course.category && <Badge variant="outline" className="text-[10px] h-5">{course.category}</Badge>}
                      </div>
                      <h3 className="font-display text-sm font-semibold text-foreground mb-1 line-clamp-2">{course.title}</h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
                        {course.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {course.duration}</span>}
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {course.enrolled_count || 0} enrolled</span>
                      </div>
                      {isEnrolled ? (
                        <Button size="sm" className="w-full h-9 text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground" asChild>
                          <Link to={`/course/${course.id}`}><Play className="h-3 w-3 mr-1" /> Continue Learning</Link>
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleEnroll(course.id)} disabled={enrollingId === course.id}>
                          {enrollingId === course.id ? "Enrolling..." : <><GraduationCap className="h-3 w-3 mr-1" /> Enroll Now</>}
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
              <p className="text-xs text-muted-foreground mt-1">New courses will be added soon. Check back later!</p>
            </div>
          )}
        </TabsContent>

        {/* ─── My Courses Tab ─── */}
        <TabsContent value="enrolled" className="space-y-4">
          {inProgressCourses.length > 0 && (
            <div>
              <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-secondary" /> In Progress
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressCourses.map((enrollment) => {
                  const course = (enrollment as any).courses;
                  return (
                    <div key={enrollment.id} className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display text-sm font-semibold text-foreground truncate">{course?.title}</h3>
                          <p className="text-[11px] text-muted-foreground">{course?.category} • {course?.level}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">{enrollment.progress || 0}%</Badge>
                      </div>
                      <Progress value={enrollment.progress || 0} className="h-2 mb-3" />
                      <Button size="sm" className="w-full h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                        <Link to={`/course/${enrollment.course_id}`}><Play className="h-3 w-3 mr-1" /> Continue</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {completedCourses.length > 0 && (
            <div>
              <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" /> Completed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedCourses.map((enrollment) => {
                  const course = (enrollment as any).courses;
                  const cert = certificates?.find(c => c.course_id === enrollment.course_id);
                  return (
                    <div key={enrollment.id} className="bg-card rounded-xl p-5 shadow-soft border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display text-sm font-semibold text-foreground truncate">{course?.title}</h3>
                          <p className="text-[11px] text-muted-foreground">{course?.category}</p>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                          <CheckCircle className="h-3 w-3 mr-1" /> Completed
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" asChild>
                          <Link to={`/course/${enrollment.course_id}`}><BookOpen className="h-3 w-3 mr-1" /> Review</Link>
                        </Button>
                        {cert && (
                          <Button size="sm" className="h-8 text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground" asChild>
                            <Link to={`/verify-certificate/${cert.certificate_number}`}>
                              <Award className="h-3 w-3 mr-1" /> View Certificate
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!enrollments?.length && (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <GraduationCap className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
              <h3 className="font-display text-base font-semibold text-foreground">No Enrollments Yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Browse courses and enroll to start learning!</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Certificates Tab ─── */}
        <TabsContent value="certificates" className="space-y-4">
          {certificates && certificates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div key={cert.id} className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <Award className="h-6 w-6 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-sm font-semibold text-foreground truncate">
                        {(cert as any).courses?.title || "Certificate"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {(cert as any).courses?.category} • Issued {new Date(cert.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Certificate #</span>
                      <span className="font-mono font-semibold text-foreground">{cert.certificate_number}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {cert.pdf_url && (
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" asChild>
                        <a href={cert.pdf_url} target="_blank" rel="noreferrer"><Download className="h-3 w-3 mr-1" /> Download PDF</a>
                      </Button>
                    )}
                    {cert.qr_verification_url && (
                      <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                        <a href={cert.qr_verification_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Award className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
              <h3 className="font-display text-base font-semibold text-foreground">No Certificates Yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Complete courses and pass exams to earn certificates!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LearnerDashboardPage;
