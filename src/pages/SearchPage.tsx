import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { globalSearch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Search, User, Briefcase, BookOpen, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SearchPage = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setSearching(true);
    try { const res = await globalSearch(q); setResults(res); }
    catch { }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setQuery(q); doSearch(q); }
  }, [searchParams, doSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    const timeout = setTimeout(() => doSearch(e.target.value), 400);
    return () => clearTimeout(timeout);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const hasResults = results && (results.profiles.length > 0 || results.jobs.length > 0 || results.courses.length > 0 || results.mentors.length > 0);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Search</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Find people, jobs, courses, and mentors</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="Search anything..." value={query} onChange={handleChange} className="pl-12 h-12 text-base rounded-xl shadow-soft" />
      </div>

      {searching && <p className="text-center text-muted-foreground text-sm">Searching...</p>}

      {hasResults && (
        <div className="space-y-5">
          {results.profiles.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><User className="h-4 w-4" /> People</h3>
              <div className="space-y-2">
                {results.profiles.map((p: any) => (
                  <div key={p.id} className="bg-card rounded-lg p-3.5 shadow-soft border border-border">
                    <p className="text-xs font-medium text-foreground">{p.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.lga} • {p.employment_status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {results.jobs.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Briefcase className="h-4 w-4" /> Jobs</h3>
              <div className="space-y-2">
                {results.jobs.map((j: any) => (
                  <Link key={j.id} to="/jobs" className="block bg-card rounded-lg p-3.5 shadow-soft border border-border hover:shadow-elevated transition-all">
                    <p className="text-xs font-medium text-foreground">{j.title}</p>
                    <p className="text-[10px] text-muted-foreground">{j.company}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {results.courses.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4" /> Courses</h3>
              <div className="space-y-2">
                {results.courses.map((c: any) => (
                  <Link key={c.id} to="/learning" className="block bg-card rounded-lg p-3.5 shadow-soft border border-border hover:shadow-elevated transition-all">
                    <p className="text-xs font-medium text-foreground">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground">{c.category}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {results.mentors.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Mentors</h3>
              <div className="space-y-2">
                {results.mentors.map((m: any) => (
                  <Link key={m.id} to="/mentorship" className="block bg-card rounded-lg p-3.5 shadow-soft border border-border hover:shadow-elevated transition-all">
                    <p className="text-xs font-medium text-foreground">{(m as any).profiles?.full_name || "Mentor"}</p>
                    <Badge variant="secondary" className="text-[10px]">{m.category}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {query.length >= 2 && !searching && !hasResults && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Search className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
          <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
