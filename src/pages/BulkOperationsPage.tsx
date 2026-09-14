import { useState, useRef, ChangeEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserRoles, createJob } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { canAccessAdmin, hasAnyRole, canManageJobs, canAssignRoles, AppRole, ROLE_LABELS } from "@/lib/roles";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Users, Briefcase, Shield, Download, FileSpreadsheet,
  CheckCircle, XCircle, AlertTriangle, Play, RotateCcw, Info,
} from "lucide-react";
import { toast } from "sonner";

type ImportResult = {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
};

const BulkOperationsPage = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeOp, setActiveOp] = useState<"citizens" | "jobs" | "roles">("citizens");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Batch role assignment
  const [roleAssignEmails, setRoleAssignEmails] = useState("");
  const [batchRole, setBatchRole] = useState<string>("");
  const [assigningRoles, setAssigningRoles] = useState(false);

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !canAccessAdmin(roles)) return <Navigate to="/dashboard" />;

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
    const rows = lines.slice(1).map(line => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
        current += char;
      }
      values.push(current.trim());
      return values;
    });
    return { headers, rows };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (!headers.length) { toast.error("Could not parse CSV"); return; }
      setCsvHeaders(headers);
      setCsvData(rows);
      setResult(null);
      toast.success(`Parsed ${rows.length} rows from CSV`);
    };
    reader.readAsText(file);
  };

  const importCitizens = async () => {
    if (!csvData.length) return;
    setImporting(true);
    setProgress(0);
    const errors: { row: number; message: string }[] = [];
    let success = 0;

    const nameIdx = csvHeaders.findIndex(h => ["full_name", "name", "fullname"].includes(h));
    const emailIdx = csvHeaders.findIndex(h => ["email", "email_address"].includes(h));
    const phoneIdx = csvHeaders.findIndex(h => ["phone", "phone_number", "mobile"].includes(h));
    const genderIdx = csvHeaders.findIndex(h => ["gender", "sex"].includes(h));
    const lgaIdx = csvHeaders.findIndex(h => ["lga", "local_government"].includes(h));
    const dobIdx = csvHeaders.findIndex(h => ["dob", "date_of_birth", "birth_date"].includes(h));
    const empIdx = csvHeaders.findIndex(h => ["employment_status", "status"].includes(h));
    const sectorIdx = csvHeaders.findIndex(h => ["sector"].includes(h));

    if (nameIdx === -1) {
      toast.error("CSV must have a 'full_name' or 'name' column");
      setImporting(false);
      return;
    }

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        const fullName = row[nameIdx];
        const email = emailIdx >= 0 ? row[emailIdx] : undefined;
        const password = "JConnect2026!";

        if (!fullName) { errors.push({ row: i + 2, message: "Missing name" }); continue; }

        // Create user via edge function
        const res = await supabase.functions.invoke("admin-create-user", {
          body: {
            email: email || `citizen_${Date.now()}_${i}@jconnect.placeholder`,
            password,
            full_name: fullName,
            phone: phoneIdx >= 0 ? row[phoneIdx] : undefined,
            lga: lgaIdx >= 0 ? row[lgaIdx] : undefined,
            gender: genderIdx >= 0 ? row[genderIdx] : undefined,
          },
        });
        if (res.error || res.data?.error) {
          errors.push({ row: i + 2, message: res.error?.message || res.data?.error || "Unknown error" });
        } else {
          success++;
        }
      } catch (err: any) {
        errors.push({ row: i + 2, message: err.message });
      }
      setProgress(Math.round(((i + 1) / csvData.length) * 100));
    }

    setResult({ total: csvData.length, success, failed: errors.length, errors });
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
    toast.success(`Import complete: ${success} success, ${errors.length} failed`);
  };

  const importJobs = async () => {
    if (!csvData.length) return;
    setImporting(true);
    setProgress(0);
    const errors: { row: number; message: string }[] = [];
    let success = 0;

    const titleIdx = csvHeaders.findIndex(h => ["title", "job_title"].includes(h));
    const descIdx = csvHeaders.findIndex(h => ["description", "job_description"].includes(h));
    const companyIdx = csvHeaders.findIndex(h => ["company", "organization", "employer"].includes(h));
    const locationIdx = csvHeaders.findIndex(h => ["location"].includes(h));
    const lgaIdx = csvHeaders.findIndex(h => ["lga"].includes(h));
    const sectorIdx = csvHeaders.findIndex(h => ["sector"].includes(h));
    const typeIdx = csvHeaders.findIndex(h => ["employment_type", "type"].includes(h));
    const salaryIdx = csvHeaders.findIndex(h => ["salary", "salary_range"].includes(h));
    const deadlineIdx = csvHeaders.findIndex(h => ["deadline"].includes(h));
    const qualIdx = csvHeaders.findIndex(h => ["qualification", "qualification_required"].includes(h));
    const skillsIdx = csvHeaders.findIndex(h => ["skills", "skills_required"].includes(h));

    if (titleIdx === -1 || companyIdx === -1) {
      toast.error("CSV must have 'title' and 'company' columns");
      setImporting(false);
      return;
    }

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        await createJob({
          posted_by: user!.id,
          title: row[titleIdx],
          description: descIdx >= 0 ? row[descIdx] : row[titleIdx],
          company: row[companyIdx],
          location: locationIdx >= 0 ? row[locationIdx] : undefined,
          lga: lgaIdx >= 0 ? row[lgaIdx] : undefined,
          sector: sectorIdx >= 0 ? row[sectorIdx] : undefined,
          employment_type: typeIdx >= 0 ? row[typeIdx] : "Full-time",
          salary_range: salaryIdx >= 0 ? row[salaryIdx] : undefined,
          deadline: deadlineIdx >= 0 ? row[deadlineIdx] : undefined,
          qualification_required: qualIdx >= 0 ? row[qualIdx] : undefined,
          skills_required: skillsIdx >= 0 ? row[skillsIdx]?.split(";").map(s => s.trim()) : undefined,
        });
        success++;
      } catch (err: any) {
        errors.push({ row: i + 2, message: err.message });
      }
      setProgress(Math.round(((i + 1) / csvData.length) * 100));
    }

    setResult({ total: csvData.length, success, failed: errors.length, errors });
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
    toast.success(`Import complete: ${success} jobs created, ${errors.length} failed`);
  };

  const handleBatchRoleAssign = async () => {
    if (!roleAssignEmails.trim() || !batchRole) {
      toast.error("Enter emails and select a role");
      return;
    }
    setAssigningRoles(true);
    const emails = roleAssignEmails.split("\n").map(e => e.trim()).filter(Boolean);
    const errors: { row: number; message: string }[] = [];
    let success = 0;

    for (let i = 0; i < emails.length; i++) {
      try {
        const { data: profile, error: findErr } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("email", emails[i])
          .single();
        if (findErr || !profile) {
          errors.push({ row: i + 1, message: `User not found: ${emails[i]}` });
          continue;
        }
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: profile.user_id, role: batchRole as any });
        if (error) {
          if (error.message?.includes("duplicate")) {
            errors.push({ row: i + 1, message: `${emails[i]} already has this role` });
          } else throw error;
        } else {
          success++;
        }
      } catch (err: any) {
        errors.push({ row: i + 1, message: err.message });
      }
    }

    setResult({ total: emails.length, success, failed: errors.length, errors });
    setAssigningRoles(false);
    queryClient.invalidateQueries({ queryKey: ["allUserRolesAdmin"] });
    toast.success(`Assigned roles: ${success} success, ${errors.length} failed`);
  };

  const resetImport = () => {
    setCsvData([]);
    setCsvHeaders([]);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = (type: "citizens" | "jobs") => {
    const templates: Record<string, string> = {
      citizens: "full_name,email,phone,gender,lga,date_of_birth,employment_status,sector\nAhmad Ibrahim,ahmad@example.com,08012345678,Male,Dutse,1990-05-15,Unemployed,ICT",
      jobs: "title,company,description,location,lga,sector,employment_type,salary_range,deadline,qualification_required,skills\nSoftware Developer,TechCorp,Build web apps,Dutse,Dutse,Private,Full-time,150000-300000,2026-06-30,B.Sc/B.A/B.Ed/B.Tech,JavaScript;React;Node.js",
    };
    const blob = new Blob([templates[type]], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="h-6 w-6 text-primary" /> Bulk Operations
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Import citizens, jobs, and assign roles in bulk via CSV upload
        </p>
      </div>

      <Tabs value={activeOp} onValueChange={v => { setActiveOp(v as any); resetImport(); }}>
        <TabsList>
          <TabsTrigger value="citizens"><Users className="h-3.5 w-3.5 mr-1" /> Bulk Citizens</TabsTrigger>
          {canManageJobs(roles) && <TabsTrigger value="jobs"><Briefcase className="h-3.5 w-3.5 mr-1" /> Bulk Jobs</TabsTrigger>}
          {canAssignRoles(roles) && <TabsTrigger value="roles"><Shield className="h-3.5 w-3.5 mr-1" /> Batch Roles</TabsTrigger>}
        </TabsList>

        {/* ═══ BULK CITIZENS TAB ═══ */}
        <TabsContent value="citizens" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">CSV Citizen Registration</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Upload a CSV file with citizen data for bulk registration</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadTemplate("citizens")}>
                <Download className="h-3.5 w-3.5 mr-1" /> Download Template
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Required columns:</p>
                <p><code className="bg-muted px-1 rounded">full_name</code> (required)</p>
                <p className="mt-0.5">Optional: <code className="bg-muted px-1 rounded">email</code>, <code className="bg-muted px-1 rounded">phone</code>, <code className="bg-muted px-1 rounded">gender</code>, <code className="bg-muted px-1 rounded">lga</code>, <code className="bg-muted px-1 rounded">date_of_birth</code>, <code className="bg-muted px-1 rounded">employment_status</code>, <code className="bg-muted px-1 rounded">sector</code></p>
              </div>
            </div>

            <div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>

            {csvData.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{csvData.length} rows parsed</Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetImport}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                    </Button>
                    <Button size="sm" onClick={importCitizens} disabled={importing}>
                      <Play className="h-3.5 w-3.5 mr-1" /> {importing ? "Importing..." : "Start Import"}
                    </Button>
                  </div>
                </div>

                {/* Preview */}
                <ScrollArea className="max-h-48 border border-border rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted">
                        {csvHeaders.map(h => <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          {row.map((cell, j) => <td key={j} className="px-2 py-1 truncate max-w-32">{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvData.length > 5 && (
                    <p className="text-[10px] text-muted-foreground text-center py-1">...and {csvData.length - 5} more rows</p>
                  )}
                </ScrollArea>
              </>
            )}

            {importing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{progress}% complete</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ BULK JOBS TAB ═══ */}
        <TabsContent value="jobs" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">CSV Job Posting</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Upload a CSV to create multiple job postings at once</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadTemplate("jobs")}>
                <Download className="h-3.5 w-3.5 mr-1" /> Download Template
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Required columns:</p>
                <p><code className="bg-muted px-1 rounded">title</code>, <code className="bg-muted px-1 rounded">company</code> (required)</p>
                <p className="mt-0.5">Optional: <code className="bg-muted px-1 rounded">description</code>, <code className="bg-muted px-1 rounded">location</code>, <code className="bg-muted px-1 rounded">lga</code>, <code className="bg-muted px-1 rounded">sector</code>, <code className="bg-muted px-1 rounded">employment_type</code>, <code className="bg-muted px-1 rounded">salary_range</code>, <code className="bg-muted px-1 rounded">deadline</code>, <code className="bg-muted px-1 rounded">qualification</code>, <code className="bg-muted px-1 rounded">skills</code> (semicolon-separated)</p>
              </div>
            </div>

            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />

            {csvData.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{csvData.length} jobs parsed</Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetImport}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                    </Button>
                    <Button size="sm" onClick={importJobs} disabled={importing}>
                      <Play className="h-3.5 w-3.5 mr-1" /> {importing ? "Posting..." : "Post All Jobs"}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="max-h-48 border border-border rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted">
                        {csvHeaders.map(h => <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          {row.map((cell, j) => <td key={j} className="px-2 py-1 truncate max-w-32">{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </>
            )}

            {importing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{progress}% complete</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ BATCH ROLES TAB ═══ */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border space-y-4">
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">Batch Role Assignment</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Assign a role to multiple users at once by entering their email addresses</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">User Emails (one per line)</Label>
                <textarea
                  className="w-full min-h-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={"user1@example.com\nuser2@example.com\nuser3@example.com"}
                  value={roleAssignEmails}
                  onChange={e => setRoleAssignEmails(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {roleAssignEmails.split("\n").filter(e => e.trim()).length} emails entered
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold">Role to Assign</Label>
                  <Select value={batchRole} onValueChange={setBatchRole}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as AppRole[]).filter(r => r !== "super_admin" && r !== "user").map(r => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full gap-2" onClick={handleBatchRoleAssign} disabled={assigningRoles}>
                  <Shield className="h-4 w-4" />
                  {assigningRoles ? "Assigning..." : "Assign Role to All"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Results Panel */}
      {result && (
        <div className="bg-card rounded-xl p-5 shadow-soft border border-border space-y-3">
          <h3 className="font-display text-sm font-semibold text-foreground">Import Results</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <FileSpreadsheet className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="font-display text-lg font-bold text-foreground">{result.total}</p>
              <p className="text-[10px] text-muted-foreground">Total Rows</p>
            </div>
            <div className="bg-primary/5 rounded-lg p-3 text-center">
              <CheckCircle className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="font-display text-lg font-bold text-primary">{result.success}</p>
              <p className="text-[10px] text-primary">Successful</p>
            </div>
            <div className="bg-destructive/5 rounded-lg p-3 text-center">
              <XCircle className="h-5 w-5 mx-auto text-destructive mb-1" />
              <p className="font-display text-lg font-bold text-destructive">{result.failed}</p>
              <p className="text-[10px] text-destructive">Failed</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-secondary" /> Errors
              </h4>
              <ScrollArea className="max-h-40">
                <div className="space-y-1">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] bg-destructive/5 px-3 py-1.5 rounded">
                      <span className="font-semibold text-destructive shrink-0">Row {err.row}:</span>
                      <span className="text-muted-foreground">{err.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkOperationsPage;
