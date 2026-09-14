import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { JIGAWA_LGAS, SENATORIAL_ZONES, QUALIFICATION_TYPES, EMPLOYMENT_STATUSES, SECTORS, SKILL_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download, Filter, FileText, Search, Users, BarChart3,
  PieChart, TrendingUp, MapPin, Printer, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

// ── Predefined report templates ──
const REPORT_TEMPLATES = [
  { label: "All B.Sc. holders from Buji LGA", filters: { qualification: "B.Sc/B.A/B.Ed/B.Tech", lga: "Buji" } },
  { label: "Female graduates from Kazaure with ICT skills", filters: { gender: "Female", lga: "Kazaure", skillType: "ICT & Technology" } },
  { label: "Unemployed ND holders in Kiyawa", filters: { qualification: "ND/OND", employmentStatus: "Unemployed", lga: "Kiyawa" } },
  { label: "All Professors from Jigawa State", filters: { qualification: "Professor" } },
  { label: "Self-employed artisans in Hadejia zone", filters: { employmentStatus: "Self-employed", senatorialZone: "Jigawa North-East" } },
  { label: "All PhD holders across Jigawa", filters: { qualification: "PhD" } },
  { label: "Employed professionals in Public sector", filters: { employmentStatus: "Employed", sector: "Public" } },
  { label: "Female ICT experts aged 20-35", filters: { gender: "Female", skillType: "ICT & Technology", ageMin: "20", ageMax: "35" } },
];

type Filters = {
  search: string; lga: string; ward: string; senatorialZone: string;
  gender: string; qualification: string; fieldOfStudy: string;
  employmentStatus: string; skillType: string; ageMin: string; ageMax: string;
  certType: string; sector: string; yearOfGraduation: string;
};

const emptyFilters: Filters = {
  search: "", lga: "", ward: "", senatorialZone: "",
  gender: "", qualification: "", fieldOfStudy: "",
  employmentStatus: "", skillType: "", ageMin: "", ageMax: "",
  certType: "", sector: "", yearOfGraduation: "",
};

const AdvancedReporting = () => {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [activeView, setActiveView] = useState<"table" | "charts">("table");

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value === "all" ? "" : value }));

  const clearFilters = () => setFilters(emptyFilters);

  const activeFilterCount = Object.values(filters).filter(v => v && v.length > 0).length;

  // Fetch all profiles with education data
  const { data: rawProfiles = [], isLoading } = useQuery({
    queryKey: ["advancedReportProfiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, education(qualification_type, field_of_study, year_of_graduation)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Apply all filters client-side for maximum flexibility
  const filteredProfiles = useMemo(() => {
    let results = [...rawProfiles];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(p =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    }
    if (filters.lga) results = results.filter(p => p.lga === filters.lga);
    if (filters.ward) results = results.filter(p => p.ward?.toLowerCase().includes(filters.ward.toLowerCase()));
    if (filters.gender) results = results.filter(p => p.gender === filters.gender);
    if (filters.employmentStatus) results = results.filter(p => p.employment_status === filters.employmentStatus);
    if (filters.sector) results = results.filter(p => p.sector === filters.sector);
    if (filters.skillType) {
      results = results.filter(p =>
        p.skills?.some((s: string) => s.toLowerCase().includes(filters.skillType.toLowerCase()))
      );
    }
    if (filters.senatorialZone) {
      const zoneLgas = SENATORIAL_ZONES[filters.senatorialZone as keyof typeof SENATORIAL_ZONES] || [];
      results = results.filter(p => p.lga && (zoneLgas as readonly string[]).includes(p.lga));
    }
    if (filters.qualification) {
      results = results.filter(p =>
        (p as any).education?.some((e: any) => e.qualification_type === filters.qualification)
      );
    }
    if (filters.fieldOfStudy) {
      const q = filters.fieldOfStudy.toLowerCase();
      results = results.filter(p =>
        (p as any).education?.some((e: any) => e.field_of_study?.toLowerCase().includes(q))
      );
    }
    if (filters.yearOfGraduation) {
      results = results.filter(p =>
        (p as any).education?.some((e: any) => e.year_of_graduation === filters.yearOfGraduation)
      );
    }
    if (filters.certType) {
      results = results.filter(p =>
        p.certifications?.some((c: string) => c.toLowerCase().includes(filters.certType.toLowerCase()))
      );
    }
    if (filters.ageMin || filters.ageMax) {
      const now = new Date();
      results = results.filter(p => {
        if (!p.date_of_birth) return false;
        const age = Math.floor((now.getTime() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (filters.ageMin && age < parseInt(filters.ageMin)) return false;
        if (filters.ageMax && age > parseInt(filters.ageMax)) return false;
        return true;
      });
    }

    return results;
  }, [rawProfiles, filters]);

  // ── Stats for charts view ──
  const stats = useMemo(() => {
    const byLga: Record<string, number> = {};
    const byGender: Record<string, number> = {};
    const byEmployment: Record<string, number> = {};
    const bySector: Record<string, number> = {};
    const byQualification: Record<string, number> = {};
    const byZone: Record<string, number> = {};

    filteredProfiles.forEach(p => {
      byLga[p.lga || "Unknown"] = (byLga[p.lga || "Unknown"] || 0) + 1;
      byGender[p.gender || "Unknown"] = (byGender[p.gender || "Unknown"] || 0) + 1;
      byEmployment[p.employment_status || "Unknown"] = (byEmployment[p.employment_status || "Unknown"] || 0) + 1;
      bySector[p.sector || "Unknown"] = (bySector[p.sector || "Unknown"] || 0) + 1;

      const edus = (p as any).education || [];
      edus.forEach((e: any) => {
        byQualification[e.qualification_type] = (byQualification[e.qualification_type] || 0) + 1;
      });

      // Map to zone
      for (const [zone, lgas] of Object.entries(SENATORIAL_ZONES)) {
        if (p.lga && (lgas as readonly string[]).includes(p.lga)) {
          byZone[zone] = (byZone[zone] || 0) + 1;
        }
      }
    });

    return { byLga, byGender, byEmployment, bySector, byQualification, byZone };
  }, [filteredProfiles]);

  // ── Export functions ──
  const exportCSV = () => {
    if (!filteredProfiles.length) { toast.error("No data to export"); return; }
    const headers = ["Full Name", "Gender", "Date of Birth", "LGA", "Ward", "Phone", "Email", "Employment Status", "Sector", "Current Employer", "Job Title", "Skills", "Qualifications", "Field of Study", "NIN"];
    const rows = filteredProfiles.map(p => {
      const edus = (p as any).education || [];
      return [
        p.full_name, p.gender || "", p.date_of_birth || "", p.lga || "", p.ward || "",
        p.phone || "", p.email || "", p.employment_status || "", p.sector || "",
        p.current_employer || "", p.job_title || "",
        (p.skills || []).join("; "),
        edus.map((e: any) => e.qualification_type).join("; "),
        edus.map((e: any) => e.field_of_study || "").filter(Boolean).join("; "),
        p.nin || "",
      ];
    });
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jconnect-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredProfiles.length} records as CSV`);
  };

  const exportExcel = () => {
    // Excel-compatible CSV with BOM for proper encoding
    if (!filteredProfiles.length) { toast.error("No data to export"); return; }
    const headers = ["Full Name", "Gender", "Date of Birth", "LGA", "Ward", "Village", "Phone", "Email", "Employment Status", "Sector", "Current Employer", "Job Title", "Skills", "Qualifications", "Field of Study", "Year of Graduation", "NIN", "Marital Status", "State of Origin"];
    const rows = filteredProfiles.map(p => {
      const edus = (p as any).education || [];
      return [
        p.full_name, p.gender || "", p.date_of_birth || "", p.lga || "", p.ward || "", p.village || "",
        p.phone || "", p.email || "", p.employment_status || "", p.sector || "",
        p.current_employer || "", p.job_title || "",
        (p.skills || []).join("; "),
        edus.map((e: any) => e.qualification_type).join("; "),
        edus.map((e: any) => e.field_of_study || "").filter(Boolean).join("; "),
        edus.map((e: any) => e.year_of_graduation || "").filter(Boolean).join("; "),
        p.nin || "", p.marital_status || "", p.state_of_origin || "",
      ];
    });
    const BOM = "\uFEFF";
    const tsv = BOM + [headers.join("\t"), ...rows.map(r => r.map(v => `${(v || "").replace(/\t/g, " ")}`).join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jconnect-report-${new Date().toISOString().split("T")[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredProfiles.length} records as Excel`);
  };

  const exportPDF = () => {
    if (!filteredProfiles.length) { toast.error("No data to export"); return; }
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Popup blocked"); return; }

    const filterSummary = Object.entries(filters)
      .filter(([, v]) => v)
      .map(([k, v]) => `<strong>${k.replace(/([A-Z])/g, " $1").trim()}</strong>: ${v}`)
      .join(" &bull; ") || "None";

    const html = `<!DOCTYPE html><html><head><title>J-Connect Advanced Report</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:20px;color:#1a2e1a}
      .header{text-align:center;border-bottom:3px solid #1a5c2e;padding-bottom:15px;margin-bottom:15px}
      .header h1{color:#1a5c2e;font-size:20px;margin-bottom:4px}
      .header .sub{color:#666;font-size:11px}
      .meta{background:#f5f9f5;padding:10px;border-radius:6px;margin-bottom:15px;font-size:11px;color:#444}
      .stats{display:flex;gap:15px;margin-bottom:15px;flex-wrap:wrap}
      .stat{background:#1a5c2e;color:white;padding:8px 14px;border-radius:6px;font-size:11px}
      .stat strong{font-size:16px;display:block}
      table{width:100%;border-collapse:collapse;font-size:10px;margin-top:10px}
      th{background:#1a5c2e;color:white;padding:6px 8px;text-align:left;font-weight:600}
      td{border-bottom:1px solid #e0e0e0;padding:5px 8px}
      tr:nth-child(even){background:#f9fdf9}
      .footer{margin-top:20px;text-align:center;font-size:9px;color:#999;border-top:1px solid #ddd;padding-top:10px}
      @media print{body{padding:10px}.header h1{font-size:16px}table{font-size:9px}}
    </style></head><body>
    <div class="header">
      <h1>🇳🇬 J-Connect — Human Capital Report</h1>
      <div class="sub">Jigawa State Human Capital Development Portal</div>
    </div>
    <div class="meta">
      <strong>Report Generated:</strong> ${new Date().toLocaleString()} &bull;
      <strong>Total Records:</strong> ${filteredProfiles.length}<br/>
      <strong>Applied Filters:</strong> ${filterSummary}
    </div>
    <div class="stats">
      <div class="stat"><strong>${filteredProfiles.filter(p => p.gender === "Male").length}</strong>Male</div>
      <div class="stat"><strong>${filteredProfiles.filter(p => p.gender === "Female").length}</strong>Female</div>
      <div class="stat"><strong>${filteredProfiles.filter(p => p.employment_status === "Employed").length}</strong>Employed</div>
      <div class="stat"><strong>${filteredProfiles.filter(p => p.employment_status === "Unemployed").length}</strong>Unemployed</div>
      <div class="stat"><strong>${filteredProfiles.filter(p => p.employment_status === "Self-employed").length}</strong>Self-Employed</div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Full Name</th><th>Gender</th><th>LGA</th><th>Phone</th><th>Email</th><th>Employment</th><th>Sector</th><th>Qualifications</th><th>Skills</th></tr></thead>
      <tbody>
      ${filteredProfiles.map((p, i) => {
        const edus = (p as any).education || [];
        return `<tr>
          <td>${i + 1}</td>
          <td>${p.full_name}</td>
          <td>${p.gender || "—"}</td>
          <td>${p.lga || "—"}</td>
          <td>${p.phone || "—"}</td>
          <td>${p.email || "—"}</td>
          <td>${p.employment_status || "—"}</td>
          <td>${p.sector || "—"}</td>
          <td>${edus.map((e: any) => e.qualification_type).join(", ") || "—"}</td>
          <td>${(p.skills || []).join(", ") || "—"}</td>
        </tr>`;
      }).join("")}
      </tbody>
    </table>
    <div class="footer">
      J-Connect &copy; ${new Date().getFullYear()} Jigawa State Government. This report is confidential and intended for authorized use only.
    </div>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
    toast.success("PDF report generated — use browser print to save");
  };

  const applyTemplate = (template: typeof REPORT_TEMPLATES[0]) => {
    const newF = { ...emptyFilters, ...template.filters };
    setFilters(newF as Filters);
    toast.success(`Applied template: ${template.label}`);
  };

  const renderBarChart = (data: Record<string, number>, title: string, color: string) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return (
      <div className="bg-card rounded-xl p-4 shadow-soft border border-border">
        <h3 className="font-display text-xs font-semibold text-foreground mb-3">{title}</h3>
        <div className="space-y-1.5">
          {entries.map(([label, count]) => (
            <div key={label} className="flex items-center gap-2 text-[11px]">
              <span className="w-28 text-muted-foreground truncate text-right">{label}</span>
              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all duration-500 flex items-center justify-end pr-1.5`}
                  style={{ width: `${Math.max((count / max) * 100, 8)}%` }}
                >
                  <span className="text-[9px] font-bold text-primary-foreground">{count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Generate graduation years for filter
  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 50 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Advanced Analytics & Reporting
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate targeted human capital reports with multi-dimensional filtering
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filteredProfiles.length}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!filteredProfiles.length}>
            <FileText className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={!filteredProfiles.length}>
            <Printer className="h-3.5 w-3.5" /> PDF / Print
          </Button>
        </div>
      </div>

      {/* Quick Report Templates */}
      <div className="bg-card rounded-xl p-4 shadow-soft border border-border">
        <h3 className="font-display text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <PieChart className="h-3.5 w-3.5" /> Quick Report Templates
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {REPORT_TEMPLATES.map((tpl, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-[10px] h-7"
              onClick={() => applyTemplate(tpl)}
            >
              {tpl.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-card rounded-xl p-4 shadow-soft border border-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Filters
            {activeFilterCount > 0 && (
              <Badge variant="default" className="text-[9px] h-4 px-1.5 ml-1">{activeFilterCount} active</Badge>
            )}
          </h3>
          <div className="flex gap-2">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="text-[10px] h-6 text-destructive" onClick={clearFilters}>
                <X className="h-3 w-3" /> Clear All
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => setShowAllFilters(!showAllFilters)}>
              {showAllFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showAllFilters ? "Less" : "More"} Filters
            </Button>
          </div>
        </div>

        {/* Row 1: Core filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Search Name/Email</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input className="pl-8 h-8 text-xs" placeholder="Search..." value={filters.search} onChange={e => setFilter("search", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">LGA</Label>
            <Select value={filters.lga || "all"} onValueChange={v => setFilter("lga", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All LGAs</SelectItem>
                {JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Senatorial Zone</Label>
            <Select value={filters.senatorialZone || "all"} onValueChange={v => setFilter("senatorialZone", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {Object.keys(SENATORIAL_ZONES).map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Gender</Label>
            <Select value={filters.gender || "all"} onValueChange={v => setFilter("gender", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Employment Status</Label>
            <Select value={filters.employmentStatus || "all"} onValueChange={v => setFilter("employmentStatus", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Qualification</Label>
            <Select value={filters.qualification || "all"} onValueChange={v => setFilter("qualification", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {QUALIFICATION_TYPES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Advanced filters */}
        {showAllFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-border">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Ward</Label>
              <Input className="h-8 text-xs" placeholder="Enter ward..." value={filters.ward} onChange={e => setFilter("ward", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Field of Study</Label>
              <Input className="h-8 text-xs" placeholder="e.g. Computer Science" value={filters.fieldOfStudy} onChange={e => setFilter("fieldOfStudy", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Skill Category</Label>
              <Select value={filters.skillType || "all"} onValueChange={v => setFilter("skillType", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Skills</SelectItem>
                  {SKILL_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Sector</Label>
              <Select value={filters.sector || "all"} onValueChange={v => setFilter("sector", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Year of Graduation</Label>
              <Select value={filters.yearOfGraduation || "all"} onValueChange={v => setFilter("yearOfGraduation", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {graduationYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Certificate Type</Label>
              <Input className="h-8 text-xs" placeholder="e.g. CISCO, PMP" value={filters.certType} onChange={e => setFilter("certType", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Min Age</Label>
              <Input type="number" className="h-8 text-xs" placeholder="18" value={filters.ageMin} onChange={e => setFilter("ageMin", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Max Age</Label>
              <Input type="number" className="h-8 text-xs" placeholder="65" value={filters.ageMax} onChange={e => setFilter("ageMax", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs h-6">
            <Users className="h-3 w-3 mr-1" /> {filteredProfiles.length} records found
          </Badge>
          {activeFilterCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              from {rawProfiles.length} total citizens
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant={activeView === "table" ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => setActiveView("table")}
          >
            <FileText className="h-3 w-3" /> Table
          </Button>
          <Button
            variant={activeView === "charts" ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => setActiveView("charts")}
          >
            <BarChart3 className="h-3 w-3" /> Charts
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading citizen data...</div>
      ) : activeView === "charts" ? (
        /* ═══ CHARTS VIEW ═══ */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderBarChart(stats.byGender, "Distribution by Gender", "bg-primary")}
          {renderBarChart(stats.byEmployment, "Distribution by Employment Status", "bg-secondary")}
          {renderBarChart(stats.byZone, "Distribution by Senatorial Zone", "bg-primary")}
          {renderBarChart(stats.byLga, "Distribution by LGA (Top 15)", "bg-primary")}
          {renderBarChart(stats.byQualification, "Distribution by Qualification", "bg-secondary")}
          {renderBarChart(stats.bySector, "Distribution by Sector", "bg-primary")}
        </div>
      ) : (
        /* ═══ TABLE VIEW ═══ */
        <div className="bg-card rounded-xl shadow-soft border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left p-2.5 font-semibold text-foreground">#</th>
                  <th className="text-left p-2.5 font-semibold text-foreground">Name</th>
                  <th className="text-left p-2.5 font-semibold text-foreground hidden md:table-cell">Gender</th>
                  <th className="text-left p-2.5 font-semibold text-foreground">LGA</th>
                  <th className="text-left p-2.5 font-semibold text-foreground hidden lg:table-cell">Phone</th>
                  <th className="text-left p-2.5 font-semibold text-foreground hidden md:table-cell">Employment</th>
                  <th className="text-left p-2.5 font-semibold text-foreground hidden lg:table-cell">Sector</th>
                  <th className="text-left p-2.5 font-semibold text-foreground hidden xl:table-cell">Qualifications</th>
                  <th className="text-left p-2.5 font-semibold text-foreground hidden xl:table-cell">Skills</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.slice(0, 200).map((p, i) => {
                  const edus = (p as any).education || [];
                  return (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="p-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="p-2.5">
                        <div>
                          <span className="font-medium text-foreground block">{p.full_name}</span>
                          <span className="text-[10px] text-muted-foreground">{p.email}</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-muted-foreground hidden md:table-cell">{p.gender || "—"}</td>
                      <td className="p-2.5">
                        {p.lga ? <Badge variant="outline" className="text-[10px] h-5">{p.lga}</Badge> : "—"}
                      </td>
                      <td className="p-2.5 text-muted-foreground hidden lg:table-cell">{p.phone || "—"}</td>
                      <td className="p-2.5 hidden md:table-cell">
                        {p.employment_status ? (
                          <Badge
                            variant={p.employment_status === "Employed" ? "default" : "secondary"}
                            className="text-[10px] h-5"
                          >
                            {p.employment_status}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="p-2.5 text-muted-foreground hidden lg:table-cell">{p.sector || "—"}</td>
                      <td className="p-2.5 hidden xl:table-cell">
                        <div className="flex flex-wrap gap-0.5">
                          {edus.slice(0, 2).map((e: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-[9px] h-4">
                              {e.qualification_type}
                            </Badge>
                          ))}
                          {edus.length > 2 && <span className="text-[9px] text-muted-foreground">+{edus.length - 2}</span>}
                        </div>
                      </td>
                      <td className="p-2.5 hidden xl:table-cell">
                        <span className="text-[10px] text-muted-foreground truncate block max-w-[120px]">
                          {(p.skills || []).slice(0, 3).join(", ") || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm font-medium">No records match your filters</p>
                      <p className="text-[11px] mt-1">Try adjusting or clearing filters to see more results</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredProfiles.length > 200 && (
            <div className="p-3 border-t border-border text-[10px] text-muted-foreground text-center">
              Showing first 200 of {filteredProfiles.length} results. Export to view all records.
            </div>
          )}
          {filteredProfiles.length > 0 && filteredProfiles.length <= 200 && (
            <div className="p-3 border-t border-border text-[10px] text-muted-foreground">
              Showing all {filteredProfiles.length} results
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedReporting;
