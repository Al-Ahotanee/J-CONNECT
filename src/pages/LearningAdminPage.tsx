import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllCoursesAdmin, fetchAllEnrollmentsAdmin, fetchInstructorProfiles,
  updateCourse, deleteCourse,
} from "@/lib/learning-api";
import { fetchUserRoles } from "@/lib/api";
import { hasAnyRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Users, GraduationCap, Award, BarChart3, CheckCircle,
  XCircle, Eye, EyeOff, Search, Shield, TrendingUp, UserCheck,
  Layers, Clock, Activity, UserPlus, Plus, Trash2, Ban,
  FileText, Download, AlertTriangle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const LearningAdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [showCreateInstructor, setShowCreateInstructor] = useState(false);
  const [showDeleteCourse, setShowDeleteCourse] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [instructorForm, setInstructorForm] = useState({
    email: "", password: "JCONNECT2025", full_name: "", phone: "", gender: "", lga: "",
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const isAuthorized = hasAnyRole(roles, ["super_admin", "admin", "learning_admin"]);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["adminCourses"],
    queryFn: fetchAllCoursesAdmin,
    enabled: !!user && isAuthorized,
  });

  const { data: enrollments } = useQuery({
    queryKey: ["adminEnrollments"],
    queryFn: fetchAllEnrollmentsAdmin,
    enabled: !!user && isAuthorized,
  });

  const { data: instructors, refetch: refetchInstructors } = useQuery({
    queryKey: ["instructorProfiles"],
    queryFn: fetchInstructorProfiles,
    enabled: !!user && isAuthorized,
  });

  const { data: certificates } = useQuery({
    queryKey: ["adminCertificates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificates").select("*, courses(title)").order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAuthorized,
  });

  const { data: quizAttempts } = useQuery({
    queryKey: ["adminQuizAttempts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quiz_attempts").select("*, quizzes(title, course_id)").order("started_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAuthorized,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !isAuthorized) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-destructive font-semibold">Access Denied</p></div>;
  }

  // ─── Actions ───
  const handleApproveCourse = async (courseId: string) => {
    try {
      await updateCourse(courseId, { is_published: true, instructor_approved: true });
      toast.success("Course approved and published!");
      queryClient.invalidateQueries({ queryKey: ["adminCourses"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSuspendCourse = async (courseId: string) => {
    try {
      await updateCourse(courseId, { is_published: false, instructor_approved: false });
      toast.success("Course suspended");
      queryClient.invalidateQueries({ queryKey: ["adminCourses"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await deleteCourse(courseId);
      toast.success("Course deleted permanently");
      setShowDeleteCourse(null);
      queryClient.invalidateQueries({ queryKey: ["adminCourses"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateInstructor = async () => {
    if (!instructorForm.email || !instructorForm.full_name) {
      toast.error("Email and full name are required");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: instructorForm.email,
          password: instructorForm.password,
          full_name: instructorForm.full_name,
          role: "instructor",
          phone: instructorForm.phone || undefined,
          gender: instructorForm.gender || undefined,
          lga: instructorForm.lga || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Instructor "${instructorForm.full_name}" created!`);
      setInstructorForm({ email: "", password: "JCONNECT2025", full_name: "", phone: "", gender: "", lga: "" });
      setShowCreateInstructor(false);
      refetchInstructors();
    } catch (err: any) {
      toast.error(err.message || "Failed to create instructor");
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveInstructor = async (userId: string) => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "instructor");
      if (error) throw error;
      toast.success("Instructor role removed");
      refetchInstructors();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRevokeCertificate = async (certId: string) => {
    try {
      const { error } = await supabase.from("certificates").delete().eq("id", certId);
      if (error) throw error;
      toast.success("Certificate revoked");
      queryClient.invalidateQueries({ queryKey: ["adminCertificates"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    try {
      const { error } = await supabase.from("enrollments").delete().eq("id", enrollmentId);
      if (error) throw error;
      toast.success("Enrollment removed");
      queryClient.invalidateQueries({ queryKey: ["adminEnrollments"] });
    } catch (err: any) { toast.error(err.message); }
  };

  // ─── Stats ───
  const totalCourses = courses?.length || 0;
  const publishedCourses = courses?.filter(c => c.is_published).length || 0;
  const pendingCourses = courses?.filter(c => !c.is_published && !c.instructor_approved).length || 0;
  const suspendedCourses = courses?.filter(c => !c.is_published && c.instructor_approved === false).length || 0;
  const totalEnrollments = enrollments?.length || 0;
  const completedEnrollments = enrollments?.filter((e: any) => e.completed).length || 0;
  const totalCerts = certificates?.length || 0;
  const avgProgress = enrollments?.length
    ? Math.round(enrollments.reduce((sum: number, e: any) => sum + (e.progress || 0), 0) / enrollments.length)
    : 0;

  // ─── Filter courses ───
  const filteredCourses = courses?.filter(c => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (courseFilter === "published") return c.is_published;
    if (courseFilter === "pending") return !c.is_published;
    if (courseFilter === "approved") return c.instructor_approved;
    return true;
  });

  // ─── CSV Export ───
  const exportCoursesCSV = () => {
    if (!courses?.length) return;
    const headers = ["Title", "Category", "Level", "Published", "Approved", "Lessons", "Students", "Price"];
    const rows = courses.map(c => [
      c.title, c.category || "", c.level || "", c.is_published ? "Yes" : "No",
      c.instructor_approved ? "Yes" : "No", (c as any).lessons?.length || 0,
      (c as any).enrollments?.length || 0, c.is_free ? "Free" : `₦${c.price}`,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `courses-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Report exported!");
  };

  const exportEnrollmentsCSV = () => {
    if (!enrollments?.length) return;
    const headers = ["Course", "Student", "Progress", "Completed", "Enrolled Date"];
    const rows = enrollments.map((e: any) => [
      e.courses?.title || "Unknown", e.profiles?.full_name || "Unknown",
      `${e.progress || 0}%`, e.completed ? "Yes" : "No",
      new Date(e.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `enrollments-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Report exported!");
  };

  const exportCertificatesCSV = () => {
    if (!certificates?.length) return;
    const headers = ["Certificate #", "Course", "Issued Date"];
    const rows = certificates.map((c: any) => [
      c.certificate_number, c.courses?.title || "Unknown",
      new Date(c.issued_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `certificates-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Report exported!");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-hero-gradient rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-primary-foreground" />
          <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">Learning Admin</Badge>
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">E-Learning Administration</h1>
        <p className="text-primary-foreground/70 mt-1 text-sm">Full management of courses, creators, enrollments, certifications & reports.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mt-6">
          {[
            { label: "Total Courses", value: totalCourses, icon: BookOpen },
            { label: "Published", value: publishedCourses, icon: Eye },
            { label: "Pending", value: pendingCourses, icon: Clock },
            { label: "Instructors", value: instructors?.length || 0, icon: UserCheck },
            { label: "Enrollments", value: totalEnrollments, icon: Users },
            { label: "Completions", value: completedEnrollments, icon: CheckCircle },
            { label: "Certificates", value: totalCerts, icon: Award },
            { label: "Avg Progress", value: `${avgProgress}%`, icon: TrendingUp },
          ].map((stat) => (
            <div key={stat.label} className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-3">
              <stat.icon className="h-4 w-4 text-primary-foreground/70 mb-1" />
              <div className="text-xl font-display font-bold text-primary-foreground">{stat.value}</div>
              <div className="text-[10px] text-primary-foreground/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList className="bg-card border border-border flex-wrap">
          <TabsTrigger value="courses">Courses ({totalCourses})</TabsTrigger>
          <TabsTrigger value="instructors">Creators ({instructors?.length || 0})</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({totalEnrollments})</TabsTrigger>
          <TabsTrigger value="certificates">Certificates ({totalCerts})</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ─── Courses Tab ─── */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="pending">Pending / Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCoursesCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredCourses && filteredCourses.length > 0 ? (
            <div className="space-y-3">
              {filteredCourses.map((course) => (
                <div key={course.id} className="bg-card rounded-xl p-5 shadow-soft border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-display text-sm font-semibold text-foreground truncate">{course.title}</h3>
                        <Badge variant={course.is_published ? "default" : "outline"} className="text-[10px] shrink-0">
                          {course.is_published ? "Published" : "Draft"}
                        </Badge>
                        {course.instructor_approved && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Approved</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{course.category} • {course.level} • {course.duration || "No duration"}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{course.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {(course as any).lessons?.length || 0} lessons</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {(course as any).enrollments?.length || 0} students</span>
                        <span>{course.is_free ? "Free" : `₦${course.price}`}</span>
                        <span>Created: {new Date(course.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {!course.is_published && (
                        <Button size="sm" className="h-7 text-[10px] bg-primary text-primary-foreground" onClick={() => handleApproveCourse(course.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve & Publish
                        </Button>
                      )}
                      {course.is_published && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleSuspendCourse(course.id)}>
                          <Ban className="h-3 w-3 mr-1" /> Suspend
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                        <Link to={`/course/${course.id}`}><Eye className="h-3 w-3 mr-1" /> View</Link>
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => setShowDeleteCourse(course.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <BookOpen className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <p className="text-sm text-muted-foreground">No courses found.</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Instructors / Creators Tab ─── */}
        <TabsContent value="instructors" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage course creators and instructors.</p>
            <Dialog open={showCreateInstructor} onOpenChange={setShowCreateInstructor}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground">
                  <UserPlus className="h-4 w-4 mr-1" /> Create Instructor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create New Instructor / Course Creator</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input placeholder="e.g. Abubakar Musa" value={instructorForm.full_name} onChange={e => setInstructorForm(p => ({ ...p, full_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address *</Label>
                    <Input type="email" placeholder="instructor@email.com" value={instructorForm.email} onChange={e => setInstructorForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input value={instructorForm.password} onChange={e => setInstructorForm(p => ({ ...p, password: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input placeholder="08012345678" value={instructorForm.phone} onChange={e => setInstructorForm(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={instructorForm.gender} onValueChange={v => setInstructorForm(p => ({ ...p, gender: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full bg-primary text-primary-foreground" onClick={handleCreateInstructor} disabled={creating || !instructorForm.email || !instructorForm.full_name}>
                    <UserPlus className="h-4 w-4 mr-1" /> {creating ? "Creating..." : "Create Instructor Account"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {instructors && instructors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {instructors.map((inst) => {
                const instCourses = courses?.filter(c => c.instructor_id === inst.user_id) || [];
                const instStudents = instCourses.reduce((s, c) => s + ((c as any).enrollments?.length || 0), 0);
                return (
                  <div key={inst.id} className="bg-card rounded-xl p-5 shadow-soft border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{inst.full_name?.[0] || "?"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">{inst.full_name}</h3>
                        <p className="text-[10px] text-muted-foreground">{inst.email}</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Instructor</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted rounded-lg p-2">
                        <div className="text-sm font-bold text-foreground">{instCourses.length}</div>
                        <div className="text-[10px] text-muted-foreground">Courses</div>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <div className="text-sm font-bold text-foreground">{instStudents}</div>
                        <div className="text-[10px] text-muted-foreground">Students</div>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <div className="text-sm font-bold text-foreground">{inst.phone || "—"}</div>
                        <div className="text-[10px] text-muted-foreground">Phone</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleRemoveInstructor(inst.user_id)}>
                        <XCircle className="h-3 w-3 mr-1" /> Remove Role
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <UserCheck className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <p className="text-sm text-muted-foreground">No instructors registered yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Create Instructor" to add course creators.</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Enrollments Tab ─── */}
        <TabsContent value="enrollments" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{totalEnrollments} total enrollments • {completedEnrollments} completed</p>
            <Button variant="outline" size="sm" onClick={exportEnrollmentsCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
          {enrollments && enrollments.length > 0 ? (
            <div className="space-y-2">
              {enrollments.slice(0, 100).map((enrollment: any) => (
                <div key={enrollment.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{enrollment.courses?.title || "Unknown Course"}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {enrollment.profiles?.full_name || "Unknown Student"} •
                      Enrolled {new Date(enrollment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={enrollment.progress || 0} className="h-1.5 w-20" />
                    <span className="text-xs font-bold text-foreground w-10 text-right">{enrollment.progress || 0}%</span>
                    {enrollment.completed && <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Done</Badge>}
                    <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleRemoveEnrollment(enrollment.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Users className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <p className="text-sm text-muted-foreground">No enrollments yet.</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Certificates Tab ─── */}
        <TabsContent value="certificates" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{totalCerts} certificates issued</p>
            <Button variant="outline" size="sm" onClick={exportCertificatesCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
          {certificates && certificates.length > 0 ? (
            <div className="space-y-2">
              {certificates.map((cert: any) => (
                <div key={cert.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center gap-4">
                  <Award className="h-5 w-5 text-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{cert.courses?.title || "Unknown"}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      #{cert.certificate_number} • Issued {new Date(cert.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleRevokeCertificate(cert.id)}>
                    <XCircle className="h-3 w-3 mr-1" /> Revoke
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Award className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
              <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Reports Tab ─── */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Course Summary */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Course Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Courses</span><span className="font-bold text-foreground">{totalCourses}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Published</span><span className="font-bold text-foreground">{publishedCourses}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pending Review</span><span className="font-bold text-foreground">{pendingCourses}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Free Courses</span><span className="font-bold text-foreground">{courses?.filter(c => c.is_free).length || 0}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Paid Courses</span><span className="font-bold text-foreground">{courses?.filter(c => !c.is_free).length || 0}</span></div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4" onClick={exportCoursesCSV}>
                <Download className="h-3 w-3 mr-1" /> Export Courses Report
              </Button>
            </div>

            {/* Enrollment Summary */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Enrollment Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Enrollments</span><span className="font-bold text-foreground">{totalEnrollments}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Completed</span><span className="font-bold text-foreground">{completedEnrollments}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">In Progress</span><span className="font-bold text-foreground">{totalEnrollments - completedEnrollments}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg Progress</span><span className="font-bold text-foreground">{avgProgress}%</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Completion Rate</span><span className="font-bold text-foreground">{totalEnrollments ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0}%</span></div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4" onClick={exportEnrollmentsCSV}>
                <Download className="h-3 w-3 mr-1" /> Export Enrollment Report
              </Button>
            </div>

            {/* Certification Summary */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Award className="h-4 w-4 text-secondary" /> Certification Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Certificates</span><span className="font-bold text-foreground">{totalCerts}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Instructors</span><span className="font-bold text-foreground">{instructors?.length || 0}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Quiz Attempts</span><span className="font-bold text-foreground">{quizAttempts?.length || 0}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Quiz Pass Rate</span><span className="font-bold text-foreground">
                  {quizAttempts?.length ? Math.round((quizAttempts.filter((a: any) => a.passed).length / quizAttempts.length) * 100) : 0}%
                </span></div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4" onClick={exportCertificatesCSV}>
                <Download className="h-3 w-3 mr-1" /> Export Certificates Report
              </Button>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Courses by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(
                (courses || []).reduce((acc: Record<string, number>, c) => {
                  const cat = c.category || "Uncategorized";
                  acc[cat] = (acc[cat] || 0) + 1;
                  return acc;
                }, {})
              ).map(([cat, count]) => (
                <div key={cat} className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{count}</div>
                  <div className="text-[10px] text-muted-foreground">{cat}</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Course Confirmation Dialog */}
      <Dialog open={!!showDeleteCourse} onOpenChange={() => setShowDeleteCourse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete Course
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the course and all its lessons, materials, and enrollments. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteCourse(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showDeleteCourse && handleDeleteCourse(showDeleteCourse)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LearningAdminPage;
