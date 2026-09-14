import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProfile, updateProfile, fetchEducation, addEducation, deleteEducation } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JIGAWA_LGAS, SECTORS, EMPLOYMENT_STATUSES, QUALIFICATION_TYPES, USER_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { Save, Upload, Camera, Plus, Trash2, User } from "lucide-react";
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal";

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [newEdu, setNewEdu] = useState({ institution: "", qualification_type: "", field_of_study: "", year_of_graduation: "", grade: "" });

  const { data: profile } = useQuery({ queryKey: ["profile", user?.id], queryFn: () => fetchProfile(user!.id), enabled: !!user });
  const { data: education } = useQuery({ queryKey: ["education", user?.id], queryFn: () => fetchEducation(user!.id), enabled: !!user });

  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "", gender: profile.gender || "", date_of_birth: profile.date_of_birth || "",
        marital_status: profile.marital_status || "", lga: profile.lga || "", ward: profile.ward || "",
        village: profile.village || "", phone: profile.phone || "", residential_address: profile.residential_address || "",
        nin: profile.nin || "", employment_status: profile.employment_status || "", current_employer: profile.current_employer || "",
        job_title: profile.job_title || "", sector: profile.sector || "", work_experience: profile.work_experience || "",
        skills: profile.skills?.join(", ") || "", certifications: profile.certifications?.join(", ") || "",
        user_type: profile.user_type || "",
      });
    }
  }, [profile]);

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(user.id, {
        ...form,
        skills: form.skills ? form.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        certifications: form.certifications ? form.certifications.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        date_of_birth: form.date_of_birth || null,
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated successfully!");
    } catch (err: any) { toast.error(err.message || "Failed to update profile"); }
    finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be less than 2MB"); return; }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/passport.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile(user.id, { passport_photo_url: publicUrl });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Photo uploaded!");
    } catch (err: any) { toast.error(err.message || "Failed to upload"); }
    finally { setUploadingPhoto(false); }
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `${user.id}/${file.name}`;
    const { error } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
    if (error) { toast.error("Failed to upload CV"); return; }
    await updateProfile(user.id, { cv_file_url: path });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("CV uploaded!");
  };

  const handleAddEducation = async () => {
    if (!newEdu.institution || !newEdu.qualification_type) { toast.error("Institution and qualification required"); return; }
    try {
      await addEducation({ user_id: user.id, institution: newEdu.institution, qualification_type: newEdu.qualification_type,
        field_of_study: newEdu.field_of_study || undefined, year_of_graduation: newEdu.year_of_graduation || undefined, grade: newEdu.grade || undefined });
      queryClient.invalidateQueries({ queryKey: ["education"] });
      setNewEdu({ institution: "", qualification_type: "", field_of_study: "", year_of_graduation: "", grade: "" });
      setShowAddEdu(false);
      toast.success("Education added!");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteEducation = async (id: string) => {
    try { await deleteEducation(id); queryClient.invalidateQueries({ queryKey: ["education"] }); toast.success("Removed"); }
    catch (err: any) { toast.error(err.message); }
  };

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Edit Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Keep your information up to date</p>
        </div>
        <div className="flex items-center gap-2">
          <ChangePasswordModal />
          <Button variant="emerald" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Photo */}
      <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
        <h2 className="font-display text-sm font-semibold text-foreground mb-4">Passport Photo</h2>
        <div className="flex items-center gap-5">
          <div className="relative">
            {profile?.passport_photo_url ? (
              <img src={profile.passport_photo_url} alt="Photo" className="w-20 h-20 rounded-xl object-cover border-2 border-border" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <label className="absolute -bottom-1.5 -right-1.5 cursor-pointer">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors">
                <Camera className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </label>
          </div>
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-0.5">Upload Photo</p>
            <p>Max 2MB, JPG/PNG</p>
            {uploadingPhoto && <p className="text-primary mt-0.5">Uploading...</p>}
          </div>
        </div>
      </div>

      {/* Personal */}
      <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
        <h2 className="font-display text-sm font-semibold text-foreground mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Full Name</Label><Input value={form.full_name || ""} onChange={(e) => update("full_name", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Gender</Label>
            <Select value={form.gender || ""} onValueChange={(v) => update("gender", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Date of Birth</Label><Input type="date" value={form.date_of_birth || ""} onChange={(e) => update("date_of_birth", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Marital Status</Label>
            <Select value={form.marital_status || ""} onValueChange={(v) => update("marital_status", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{["Single","Married","Divorced","Widowed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">LGA</Label>
            <Select value={form.lga || ""} onValueChange={(v) => update("lga", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Ward</Label><Input value={form.ward || ""} onChange={(e) => update("ward", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Village</Label><Input value={form.village || ""} onChange={(e) => update("village", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Address</Label><Input value={form.residential_address || ""} onChange={(e) => update("residential_address", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">NIN</Label><Input value={form.nin || ""} onChange={(e) => update("nin", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">User Type</Label>
            <Select value={form.user_type || ""} onValueChange={(v) => update("user_type", v)}><SelectTrigger><SelectValue placeholder="Select your category" /></SelectTrigger><SelectContent>{USER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
      </div>

      {/* Employment */}
      <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
        <h2 className="font-display text-sm font-semibold text-foreground mb-4">Employment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs">Employment Status</Label>
            <Select value={form.employment_status || ""} onValueChange={(v) => update("employment_status", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Current Employer</Label><Input value={form.current_employer || ""} onChange={(e) => update("current_employer", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Job Title</Label><Input value={form.job_title || ""} onChange={(e) => update("job_title", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Sector</Label>
            <Select value={form.sector || ""} onValueChange={(v) => update("sector", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Work Experience</Label><Textarea value={form.work_experience || ""} onChange={(e) => update("work_experience", e.target.value)} rows={3} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Skills (comma-separated)</Label><Input value={form.skills || ""} onChange={(e) => update("skills", e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Certifications (comma-separated)</Label><Input value={form.certifications || ""} onChange={(e) => update("certifications", e.target.value)} /></div>
        </div>
      </div>

      {/* Education */}
      <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm font-semibold text-foreground">Education</h2>
          <Dialog open={showAddEdu} onOpenChange={setShowAddEdu}>
            <DialogTrigger asChild><Button variant="outline" size="sm" className="h-7 text-xs"><Plus className="h-3 w-3" /> Add</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add Education</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label className="text-xs">Institution *</Label><Input value={newEdu.institution} onChange={(e) => setNewEdu(p => ({ ...p, institution: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Qualification *</Label>
                  <Select value={newEdu.qualification_type} onValueChange={(v) => setNewEdu(p => ({ ...p, qualification_type: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{QUALIFICATION_TYPES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Field of Study</Label><Input value={newEdu.field_of_study} onChange={(e) => setNewEdu(p => ({ ...p, field_of_study: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Year</Label><Input value={newEdu.year_of_graduation} onChange={(e) => setNewEdu(p => ({ ...p, year_of_graduation: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Grade</Label><Input value={newEdu.grade} onChange={(e) => setNewEdu(p => ({ ...p, grade: e.target.value }))} /></div>
                </div>
                <Button variant="emerald" className="w-full" onClick={handleAddEducation}>Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {education && education.length > 0 ? (
          <div className="space-y-2.5">
            {education.map((edu) => (
              <div key={edu.id} className="p-3 bg-muted rounded-lg flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">{edu.institution}</p>
                  <p className="text-[11px] text-muted-foreground">{edu.qualification_type} — {edu.field_of_study} ({edu.year_of_graduation})</p>
                  {edu.grade && <p className="text-[10px] text-muted-foreground">Grade: {edu.grade}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteEducation(edu.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">No education records. Click "Add" to add one.</p>}
      </div>

      {/* CV Upload */}
      <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
        <h2 className="font-display text-sm font-semibold text-foreground mb-4">Upload CV</h2>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer">
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="hidden" />
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-accent transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Choose File</span>
            </div>
          </label>
          {profile?.cv_file_url && <span className="text-xs text-primary font-medium">CV uploaded ✓</span>}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
