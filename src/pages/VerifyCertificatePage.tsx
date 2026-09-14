import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.png";
import { Award, CheckCircle, XCircle, Search } from "lucide-react";

const VerifyCertificatePage = () => {
  const { certNumber } = useParams();
  const [manualCert, setManualCert] = useState(certNumber || "");
  const [searchCert, setSearchCert] = useState(certNumber || "");

  const { data: cert, isLoading } = useQuery({
    queryKey: ["verify-cert", searchCert],
    queryFn: async () => {
      if (!searchCert) return null;
      const { data, error } = await supabase.rpc("verify_certificate", {
        _cert_number: searchCert,
      });
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!searchCert,
  });

  const handleSearch = () => {
    if (manualCert.trim()) setSearchCert(manualCert.trim());
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src={logo} alt="J-Connect" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">Certificate Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">Verify the authenticity of a J-Connect certificate</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Enter certificate number (e.g. JCON-...)"
              value={manualCert}
              onChange={e => setManualCert(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={!manualCert.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {isLoading && <p className="text-center text-muted-foreground py-8">Verifying...</p>}

          {!isLoading && searchCert && cert && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
                <CheckCircle className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <p className="font-bold text-primary text-lg">Certificate Verified</p>
                  <p className="text-sm text-muted-foreground">This certificate is authentic and valid</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Certificate No.</span>
                  <span className="text-sm font-mono font-medium">{cert.certificate_number}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Holder Name</span>
                  <span className="text-sm font-medium">{cert.holder_name || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Course</span>
                  <span className="text-sm font-medium">{cert.course_title || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <Badge variant="secondary">{cert.course_category || "General"}</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Level</span>
                  <span className="text-sm">{cert.course_level || "—"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-muted-foreground">Issued On</span>
                  <span className="text-sm">{new Date(cert.issued_at).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
              </div>
            </div>
          )}

          {!isLoading && searchCert && !cert && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl border border-destructive/20">
              <XCircle className="h-8 w-8 text-destructive shrink-0" />
              <div>
                <p className="font-bold text-destructive text-lg">Not Found</p>
                <p className="text-sm text-muted-foreground">No certificate matches this number. Please check and try again.</p>
              </div>
            </div>
          )}

          {!searchCert && (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Enter a certificate number or scan a QR code to verify</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          J-Connect — Jigawa State Human Capital Development Platform
        </p>
      </div>
    </div>
  );
};

export default VerifyCertificatePage;
