import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, Target, Briefcase, MapPin, Building,
  ArrowRight, Loader2, Brain, TrendingUp, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface AIMatch {
  id: string;
  title: string;
  company: string;
  location?: string;
  lga?: string;
  sector?: string;
  employment_type?: string;
  salary_range?: string;
  ai_score: number;
  ai_reason: string;
  skills_matched: string[];
  gap_areas: string[];
}

const SmartJobMatchPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const findMatches = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-job-match");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMatches(data.matches || []);
      if (!data.matches?.length) toast.info("No strong matches found. Try updating your profile with more skills.");
    } catch (err: any) {
      toast.error(err.message || "Failed to find matches");
    }
    setLoading(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-500/10";
    if (score >= 60) return "text-primary bg-primary/10";
    if (score >= 40) return "text-secondary bg-secondary/10";
    return "text-muted-foreground bg-muted";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Brain className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">AI Smart Job Matching</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Our AI analyzes your skills, experience, education, and career goals to find the best job matches with detailed compatibility scores.
        </p>
        <Button onClick={findMatches} disabled={loading} className="mt-4" size="lg">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {loading ? "Analyzing..." : hasSearched ? "Re-analyze" : "Find My Best Matches"}
        </Button>
      </div>

      {/* Results */}
      {matches.length > 0 && (
        <div className="space-y-3 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-foreground">{matches.length} AI-Ranked Matches</h2>
            <Badge variant="outline" className="text-[10px]">
              <Brain className="h-3 w-3 mr-1" /> Powered by AI
            </Badge>
          </div>

          {matches.map((match, i) => (
            <div key={match.id} className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                    <h3 className="text-sm font-semibold text-foreground">{match.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span className="flex items-center gap-1"><Building className="h-3 w-3" />{match.company}</span>
                    {(match.lga || match.location) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{match.lga || match.location}</span>}
                    {match.sector && <Badge variant="outline" className="text-[9px] h-4">{match.sector}</Badge>}
                    {match.employment_type && <Badge variant="outline" className="text-[9px] h-4">{match.employment_type}</Badge>}
                  </div>

                  {/* AI Reason */}
                  <p className="text-xs text-muted-foreground mt-3 bg-accent/50 rounded-lg p-2.5">
                    <Sparkles className="h-3 w-3 inline mr-1 text-primary" />
                    {match.ai_reason}
                  </p>

                  {/* Skills matched */}
                  {match.skills_matched?.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] text-muted-foreground font-semibold">Skills Matched: </span>
                      {match.skills_matched.map(s => (
                        <Badge key={s} variant="secondary" className="text-[9px] h-4 mr-1">{s}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Gap areas */}
                  {match.gap_areas?.length > 0 && (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Areas to Develop:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {match.gap_areas.map(g => (
                          <Badge key={g} variant="outline" className="text-[9px] h-4 border-secondary/30 text-secondary">{g}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Score */}
                <div className="text-center shrink-0">
                  <div className={`text-lg font-display font-bold rounded-xl px-3 py-2 ${getScoreColor(match.ai_score)}`}>
                    {match.ai_score}%
                  </div>
                  <span className="text-[9px] text-muted-foreground">Match</span>
                  <Button variant="outline" size="sm" className="mt-2 text-[10px] w-full" asChild>
                    <Link to={`/job-seeker?apply=${match.id}`}>Apply <ArrowRight className="h-3 w-3 ml-1" /></Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasSearched && !loading && matches.length === 0 && (
        <div className="text-center py-12 max-w-md mx-auto">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/20 mb-4" />
          <h3 className="text-base font-semibold text-foreground">No Strong Matches Found</h3>
          <p className="text-xs text-muted-foreground mt-2">
            Update your profile with more skills, education, and work experience to get better matches.
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link to="/profile">Update Profile</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default SmartJobMatchPage;
