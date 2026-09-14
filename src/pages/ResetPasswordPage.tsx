import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

const ResetPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
        if (session.user?.email) setEmail(session.user.email);
      }
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Please enter your account email"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    
    setLoading(true);
    try {
      if (hasSession) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      } else {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), new_password: password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to reset password");
      }

      toast.success("Password updated successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4 pt-16">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-sm p-8 border border-border">
          <div className="text-center mb-8">
            <img src={logo} alt="J-Connect" className="h-12 w-12 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-foreground">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your account details to set a new password</p>
          </div>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Account Email</Label>
              <Input 
                id="reset-email"
                type="email" 
                placeholder="name@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <div className="relative">
                <Input 
                  id="reset-password"
                  type={showPassword ? "text" : "password"} 
                  placeholder="Min. 6 characters" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Confirm Password</Label>
              <Input 
                id="reset-confirm"
                type={showPassword ? "text" : "password"} 
                placeholder="Confirm new password" 
                value={confirm} 
                onChange={e => setConfirm(e.target.value)} 
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading} variant="emerald">
              {loading ? "Updating..." : "Reset Password"}
            </Button>
            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                <ArrowLeft size={12} /> Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
