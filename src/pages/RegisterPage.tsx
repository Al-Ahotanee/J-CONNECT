import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { JIGAWA_LGAS } from "@/lib/constants";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Eye, EyeOff, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { z } from "zod";

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================
const accountSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match", path: ["confirmPassword"],
});

const personalSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  gender: z.enum(["Male", "Female"], { required_error: "Gender is required" }),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  lga: z.string().min(1, "LGA is required"),
  phone: z.string().trim().min(7, "Phone number is required").max(20),
  maritalStatus: z.string().optional(),
  ward: z.string().max(100).optional(),
  village: z.string().max(100).optional(),
  residentialAddress: z.string().max(255).optional(),
  nin: z.string().max(20).optional(),
});

const educationSchema = z.object({
  qualificationType: z.string().min(1, "Qualification type is required"),
  institution: z.string().max(200).optional(),
  fieldOfStudy: z.string().max(200).optional(),
  yearOfGraduation: z.string().max(4).optional(),
  grade: z.string().max(50).optional(),
});

const employmentSchema = z.object({
  employmentStatus: z.string().min(1, "Employment status is required"),
  currentEmployer: z.string().max(200).optional(),
  jobTitle: z.string().max(100).optional(),
  sector: z.string().optional(),
  skills: z.string().max(500).optional(),
});

const steps = [
  { title: "Account", description: "Create your login" },
  { title: "Personal", description: "Basic information" },
  { title: "Education", description: "Academic background" },
  { title: "Employment", description: "Work details" },
];

const RegisterPage = () => {
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    fullName: "", gender: "", dateOfBirth: "", maritalStatus: "",
    nationality: "Nigerian", stateOfOrigin: "Jigawa", lga: "",
    ward: "", village: "", phone: "", residentialAddress: "", nin: "",
    institution: "", qualificationType: "", fieldOfStudy: "",
    yearOfGraduation: "", grade: "",
    employmentStatus: "", currentEmployer: "", jobTitle: "",
    sector: "", skills: "",
  });

  const updateForm = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validateStep = (): boolean => {
    try {
      setErrors({});
      switch (step) {
        case 0: accountSchema.parse(form); break;
        case 1: personalSchema.parse(form); break;
        case 2: educationSchema.parse(form); break;
        case 3: employmentSchema.parse(form); break;
      }
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach(e => { if (e.path[0]) fieldErrors[e.path[0] as string] = e.message; });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleNext = () => {
    if (validateStep()) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    try {
      await signUp(form.email, form.password, form.fullName);
      // Save all collected registration data to localStorage so it can be applied after first login
      const pendingData = {
        gender: form.gender || null,
        date_of_birth: form.dateOfBirth || null,
        marital_status: form.maritalStatus || null,
        nationality: form.nationality || null,
        state_of_origin: form.stateOfOrigin || null,
        lga: form.lga || null,
        ward: form.ward || null,
        village: form.village || null,
        phone: form.phone || null,
        residential_address: form.residentialAddress || null,
        nin: form.nin || null,
        employment_status: form.employmentStatus || null,
        current_employer: form.currentEmployer || null,
        job_title: form.jobTitle || null,
        sector: form.sector || null,
        skills: form.skills ? form.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        // Education data to be saved separately
        _education: {
          institution: form.institution || null,
          qualification_type: form.qualificationType || null,
          field_of_study: form.fieldOfStudy || null,
          year_of_graduation: form.yearOfGraduation || null,
          grade: form.grade || null,
        },
      };
      localStorage.setItem("jconnect_pending_profile", JSON.stringify(pendingData));
      toast.success("Registration successful! Please check your email to verify your account before signing in.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key: string) => errors[key] ? (
    <p className="text-xs text-destructive">{errors[key]}</p>
  ) : null;

  return (
    <div className="min-h-screen bg-muted px-4 pt-20 pb-10">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl shadow-elevated p-8 border border-border">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <img src={logo} alt="J-Connect" className="h-12 w-12" />
            </Link>
            <h1 className="font-display text-2xl font-bold text-foreground">Join J-Connect</h1>
            <p className="text-sm text-muted-foreground mt-1">Register to access Jigawa's professional network</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((s, i) => (
              <div key={s.title} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    i < step ? "bg-primary text-primary-foreground" :
                    i === step ? "bg-secondary text-secondary-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i < step ? <Check size={14} /> : i + 1}
                  </div>
                  <span className="text-xs mt-1 text-muted-foreground hidden sm:block">{s.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 sm:w-20 h-0.5 mx-2 ${i < step ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 0: Account */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
                {fieldError("email")}
              </div>
              <div className="space-y-2">
                <Label>Password * (min 6 characters)</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={form.password} onChange={(e) => updateForm("password", e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldError("password")}
              </div>
              <div className="space-y-2">
                <Label>Confirm Password *</Label>
                <Input type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => updateForm("confirmPassword", e.target.value)} />
                {fieldError("confirmPassword")}
              </div>
            </div>
          )}

          {/* Step 1: Personal */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Full Name *</Label>
                  <Input placeholder="Enter full name" value={form.fullName} onChange={(e) => updateForm("fullName", e.target.value)} />
                  {fieldError("fullName")}
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select value={form.gender} onValueChange={(v) => updateForm("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldError("gender")}
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth *</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => updateForm("dateOfBirth", e.target.value)} />
                  {fieldError("dateOfBirth")}
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select value={form.maritalStatus} onValueChange={(v) => updateForm("maritalStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Single", "Married", "Divorced", "Widowed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>LGA *</Label>
                  <Select value={form.lga} onValueChange={(v) => updateForm("lga", v)}>
                    <SelectTrigger><SelectValue placeholder="Select LGA" /></SelectTrigger>
                    <SelectContent>
                      {JIGAWA_LGAS.map(lga => <SelectItem key={lga} value={lga}>{lga}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {fieldError("lga")}
                </div>
                <div className="space-y-2">
                  <Label>Ward</Label>
                  <Input placeholder="Enter ward" value={form.ward} onChange={(e) => updateForm("ward", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Village/Community</Label>
                  <Input placeholder="Enter village" value={form.village} onChange={(e) => updateForm("village", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input placeholder="+234..." value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
                  {fieldError("phone")}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Residential Address</Label>
                  <Input placeholder="Enter address" value={form.residentialAddress} onChange={(e) => updateForm("residentialAddress", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>NIN (Optional)</Label>
                  <Input placeholder="National ID Number" value={form.nin} onChange={(e) => updateForm("nin", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Education */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Institution Name</Label>
                  <Input placeholder="e.g. Federal University Dutse" value={form.institution} onChange={(e) => updateForm("institution", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Qualification Type *</Label>
                  <Select value={form.qualificationType} onValueChange={(v) => updateForm("qualificationType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select qualification" /></SelectTrigger>
                    <SelectContent>
                      {["SSCE/WAEC", "NCE", "ND/OND", "HND", "B.Sc/B.A/B.Ed", "PGD", "M.Sc/M.A", "PhD", "Professor", "Other"].map(q => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldError("qualificationType")}
                </div>
                <div className="space-y-2">
                  <Label>Field of Study</Label>
                  <Input placeholder="e.g. Computer Science" value={form.fieldOfStudy} onChange={(e) => updateForm("fieldOfStudy", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Year of Graduation</Label>
                  <Input placeholder="e.g. 2023" value={form.yearOfGraduation} onChange={(e) => updateForm("yearOfGraduation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Grade/Class</Label>
                  <Input placeholder="e.g. First Class" value={form.grade} onChange={(e) => updateForm("grade", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Employment */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employment Status *</Label>
                  <Select value={form.employmentStatus} onValueChange={(v) => updateForm("employmentStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {["Unemployed", "Self-employed", "Employed", "Retired"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {fieldError("employmentStatus")}
                </div>
                <div className="space-y-2">
                  <Label>Current Employer</Label>
                  <Input placeholder="Company/Organization" value={form.currentEmployer} onChange={(e) => updateForm("currentEmployer", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input placeholder="Your role" value={form.jobTitle} onChange={(e) => updateForm("jobTitle", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sector</Label>
                  <Select value={form.sector} onValueChange={(v) => updateForm("sector", v)}>
                    <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                    <SelectContent>
                      {["Public", "Private", "NGO", "International Organization", "Self-employed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Skills (comma-separated)</Label>
                  <Input placeholder="e.g. ICT, Project Management, Teaching" value={form.skills} onChange={(e) => updateForm("skills", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={16} /> Back
              </Button>
            ) : <div />}
            {step < steps.length - 1 ? (
              <Button onClick={handleNext}>
                Next <ArrowRight size={16} />
              </Button>
            ) : (
              <Button variant="emerald" size="lg" onClick={handleSubmit} disabled={loading}>
                {loading ? "Creating Account..." : "Complete Registration"}
              </Button>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already registered?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
