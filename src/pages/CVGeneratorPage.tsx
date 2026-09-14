import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { fetchProfile, fetchEducation } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Sparkles, FileText, Loader2, RefreshCw, Target } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

interface CVData {
  professional_summary: string;
  work_experience: {
    title: string;
    company: string;
    location?: string;
    period?: string;
    achievements: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    year?: string;
    details?: string;
  }[];
  skills: {
    technical: string[];
    soft: string[];
  };
  certifications?: string[];
}

interface CVProfile {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  passport_photo_url?: string;
}

const CVGeneratorPage = () => {
  const { user, loading } = useAuth();
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [cvProfile, setCvProfile] = useState<CVProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [targetRole, setTargetRole] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const { data: education } = useQuery({
    queryKey: ["education", user?.id],
    queryFn: () => fetchEducation(user!.id),
    enabled: !!user,
  });

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" />;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cv", {
        body: { target_role: targetRole || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCvData(data.cv || data);
      setCvProfile(data.profile || profile);
      toast.success("CV generated successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate CV");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!cvData || !cvProfile) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `<!DOCTYPE html><html><head><title>CV - ${cvProfile.full_name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Calibri','Segoe UI',Arial,sans-serif;color:#222;line-height:1.5;max-width:800px;margin:0 auto;padding:32px 40px;font-size:11pt}
.header{margin-bottom:16px}
.header h1{font-size:22pt;font-weight:700;color:#1a1a1a;letter-spacing:0.5px}
.contact{display:flex;gap:16px;margin-top:4px;font-size:10pt;color:#555;flex-wrap:wrap}
.section{margin-bottom:16px}
.section h2{font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a5c2e;border-bottom:2px solid #1a5c2e;padding-bottom:3px;margin-bottom:8px}
.summary{font-size:10.5pt;color:#333;line-height:1.6}
.exp-item{margin-bottom:10px}
.exp-header{display:flex;justify-content:space-between;align-items:baseline}
.exp-title{font-weight:700;font-size:10.5pt}
.exp-company{font-size:10pt;color:#444}
.exp-period{font-size:9.5pt;color:#666;white-space:nowrap}
ul{padding-left:18px;margin-top:3px}
li{font-size:10pt;margin-bottom:2px;color:#333}
.edu-item{margin-bottom:6px}
.edu-degree{font-weight:600;font-size:10.5pt}
.edu-school{font-size:10pt;color:#444}
.skills-grid{display:flex;gap:24px}
.skills-col h3{font-size:9.5pt;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
.skills-list{font-size:10pt;color:#333}
.cert-list{list-style:disc;padding-left:18px}
.cert-list li{font-size:10pt;color:#333;margin-bottom:2px}
@media print{body{padding:16px 24px}}
</style></head><body>
<div class="header">
  <h1>${cvProfile.full_name}</h1>
  <div class="contact">
    ${cvProfile.email ? `<span>${cvProfile.email}</span>` : ""}
    ${cvProfile.phone ? `<span>| ${cvProfile.phone}</span>` : ""}
    ${cvProfile.location ? `<span>| ${cvProfile.location}</span>` : ""}
  </div>
</div>

<div class="section">
  <h2>Professional Summary</h2>
  <p class="summary">${cvData.professional_summary}</p>
</div>

${cvData.work_experience.length ? `<div class="section">
  <h2>Work Experience</h2>
  ${cvData.work_experience.map(w => `<div class="exp-item">
    <div class="exp-header">
      <div><span class="exp-title">${w.title}</span> <span class="exp-company">| ${w.company}${w.location ? `, ${w.location}` : ""}</span></div>
      ${w.period ? `<span class="exp-period">${w.period}</span>` : ""}
    </div>
    <ul>${w.achievements.map(a => `<li>${a}</li>`).join("")}</ul>
  </div>`).join("")}
</div>` : ""}

<div class="section">
  <h2>Education</h2>
  ${cvData.education.map(e => `<div class="edu-item">
    <span class="edu-degree">${e.degree}</span> — <span class="edu-school">${e.institution}${e.year ? ` (${e.year})` : ""}</span>
    ${e.details ? `<br><span style="font-size:9.5pt;color:#555">${e.details}</span>` : ""}
  </div>`).join("")}
</div>

<div class="section">
  <h2>Skills</h2>
  <div class="skills-grid">
    <div class="skills-col"><h3>Technical</h3><p class="skills-list">${cvData.skills.technical.join(" • ")}</p></div>
    <div class="skills-col"><h3>Interpersonal</h3><p class="skills-list">${cvData.skills.soft.join(" • ")}</p></div>
  </div>
</div>

${cvData.certifications?.length ? `<div class="section">
  <h2>Certifications</h2>
  <ul class="cert-list">${cvData.certifications.map(c => `<li>${c}</li>`).join("")}</ul>
</div>` : ""}
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const profileComplete = profile && (profile.full_name && (profile.skills?.length || profile.employment_status || education?.length));

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI CV Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate an ATS-compliant professional CV powered by AI
          </p>
        </div>
        {cvData && (
          <Button variant="emerald" size="sm" onClick={handlePrint}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        )}
      </div>

      {/* Generation Controls */}
      {!cvData && (
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Generate Your Professional CV
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Our AI analyzes your profile, education, skills, and experience to create
                a professionally written, ATS-optimized resume that passes applicant tracking systems.
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Target role (optional, e.g. 'Software Engineer')"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button
                className="w-full"
                variant="emerald"
                onClick={handleGenerate}
                disabled={generating || !profileComplete}
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating with AI...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate ATS-Compliant CV</>
                )}
              </Button>
              {!profileComplete && (
                <p className="text-xs text-center text-destructive">
                  Please complete your profile (name, skills, or education) before generating.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {[
                "ATS Optimized",
                "AI-Written Summary",
                "Keyword Rich",
                "Print Ready",
              ].map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {f}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CV Preview */}
      {cvData && cvProfile && (
        <>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setCvData(null); setCvProfile(null); }}>
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </Button>
            <Badge variant="secondary" className="text-xs">ATS Compliant</Badge>
          </div>

          <Card className="shadow-elevated">
            <CardContent className="p-6 md:p-10 space-y-6">
              {/* Header */}
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">
                  {cvProfile.full_name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {cvProfile.email && <span>{cvProfile.email}</span>}
                  {cvProfile.phone && <span>• {cvProfile.phone}</span>}
                  {cvProfile.location && <span>• {cvProfile.location}</span>}
                </div>
              </div>

              <Separator />

              {/* Professional Summary */}
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-[0.15em] mb-2">
                  Professional Summary
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {cvData.professional_summary}
                </p>
              </div>

              {/* Work Experience */}
              {cvData.work_experience.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-[0.15em] mb-3">
                    Work Experience
                  </h3>
                  <div className="space-y-4">
                    {cvData.work_experience.map((w, i) => (
                      <div key={i}>
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5">
                          <div>
                            <span className="text-sm font-semibold text-foreground">{w.title}</span>
                            <span className="text-sm text-muted-foreground ml-1">
                              | {w.company}{w.location ? `, ${w.location}` : ""}
                            </span>
                          </div>
                          {w.period && (
                            <span className="text-[11px] text-muted-foreground shrink-0">{w.period}</span>
                          )}
                        </div>
                        <ul className="mt-1.5 space-y-0.5 pl-4 list-disc">
                          {w.achievements.map((a, j) => (
                            <li key={j} className="text-xs text-foreground/75">{a}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {cvData.education.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-[0.15em] mb-3">
                    Education
                  </h3>
                  <div className="space-y-2">
                    {cvData.education.map((e, i) => (
                      <div key={i}>
                        <span className="text-sm font-semibold text-foreground">{e.degree}</span>
                        <span className="text-sm text-muted-foreground"> — {e.institution}</span>
                        {e.year && <span className="text-xs text-muted-foreground ml-1">({e.year})</span>}
                        {e.details && <p className="text-[11px] text-muted-foreground mt-0.5">{e.details}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-[0.15em] mb-3">
                  Skills
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Technical</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cvData.skills.technical.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px] font-normal">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Interpersonal</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cvData.skills.soft.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px] font-normal">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Certifications */}
              {cvData.certifications && cvData.certifications.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-[0.15em] mb-2">
                    Certifications
                  </h3>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {cvData.certifications.map((c, i) => (
                      <li key={i} className="text-xs text-foreground/75">{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CVGeneratorPage;
