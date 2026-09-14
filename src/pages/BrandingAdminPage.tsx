import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRoles } from "@/lib/api";
import { hasAnyRole } from "@/lib/roles";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Palette, Type, Mail, Image, Globe, Save, Upload, Eye } from "lucide-react";
import { useBranding, useLogoUrl } from "@/hooks/useBranding";

const BrandingAdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const branding = useBranding();
  const currentLogo = useLogoUrl();

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const isSuperAdmin = hasAnyRole(roles, ["super_admin"]);

  const [form, setForm] = useState({
    system_name: "",
    tagline: "",
    logo_url: "",
    favicon_url: "",
    footer_text: "",
    contact_email: "",
    contact_phone: "",
    contact_address: "",
    meta_description: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (branding.id) {
      setForm({
        system_name: branding.system_name,
        tagline: branding.tagline,
        logo_url: branding.logo_url || "",
        favicon_url: branding.favicon_url || "",
        footer_text: branding.footer_text,
        contact_email: branding.contact_email,
        contact_phone: branding.contact_phone,
        contact_address: branding.contact_address,
        meta_description: branding.meta_description,
      });
    }
  }, [branding]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !isSuperAdmin) return <Navigate to="/dashboard" />;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `branding/logo_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setForm((f) => ({ ...f, logo_url: urlData.publicUrl }));
      toast.success("Logo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("branding_settings")
        .update({
          ...form,
          logo_url: form.logo_url || null,
          favicon_url: form.favicon_url || null,
          updated_by: user.id,
        })
        .eq("id", branding.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["branding-settings"] });
      toast.success("Branding updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Branding & Customization</h1>
          <p className="text-sm text-muted-foreground">Control the system name, logo, colors, and contact information.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="identity">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="identity" className="gap-1.5"><Type className="h-3.5 w-3.5" /> Identity</TabsTrigger>
          <TabsTrigger value="logo" className="gap-1.5"><Image className="h-3.5 w-3.5" /> Logo</TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Contact</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Type className="h-5 w-5" /> System Identity</CardTitle>
              <CardDescription>Change the platform name, tagline, and descriptions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>System Name</Label>
                <Input value={form.system_name} onChange={(e) => update("system_name", e.target.value)} placeholder="J-Connect" />
                <p className="text-xs text-muted-foreground">This appears in the navbar, sidebar, login page, and footer.</p>
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder="Platform tagline..." />
              </div>
              <div className="space-y-2">
                <Label>Meta Description (SEO)</Label>
                <Textarea value={form.meta_description} onChange={(e) => update("meta_description", e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Footer Text</Label>
                <Input value={form.footer_text} onChange={(e) => update("footer_text", e.target.value)} />
                <p className="text-xs text-muted-foreground">Use {"{year}"} as a placeholder for the current year.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" /> Logo & Favicon</CardTitle>
              <CardDescription>Upload your organization's logo. Recommended: 200×200px PNG with transparent background.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted">
                  <img
                    src={form.logo_url || currentLogo}
                    alt="Current logo"
                    className="h-20 w-20 object-contain"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent transition-colors text-sm font-medium">
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload New Logo"}
                    </div>
                  </Label>
                  <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                  <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Max 2MB.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logo URL (or paste external URL)</Label>
                <Input value={form.logo_url} onChange={(e) => update("logo_url", e.target.value)} placeholder="https://..." />
              </div>

              <div className="space-y-2">
                <Label>Favicon URL</Label>
                <Input value={form.favicon_url} onChange={(e) => update("favicon_url", e.target.value)} placeholder="https://..." />
                <p className="text-xs text-muted-foreground">The small icon shown in browser tabs.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Contact Information</CardTitle>
              <CardDescription>This information appears in the footer and about sections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} type="email" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.contact_address} onChange={(e) => update("contact_address", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Live Preview</CardTitle>
              <CardDescription>See how the branding will appear across the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Navbar Preview */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Navbar</p>
                <div className="border rounded-lg p-3 bg-card flex items-center gap-3">
                  <img src={form.logo_url || currentLogo} alt="" className="h-8 w-8 object-contain" />
                  <span className="font-display font-bold text-foreground">{form.system_name || "J-Connect"}</span>
                </div>
              </div>

              {/* Footer Preview */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Footer</p>
                <div className="border rounded-lg p-4 bg-emerald-dark text-primary-foreground text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={form.logo_url || currentLogo} alt="" className="h-8 w-8 object-contain" />
                    <span className="font-display font-bold">{form.system_name}</span>
                  </div>
                  <p className="text-primary-foreground/70 text-xs">{form.tagline}</p>
                  <hr className="border-primary-foreground/10 my-3" />
                  <p className="text-primary-foreground/50 text-xs text-center">
                    {form.footer_text.replace("{year}", new Date().getFullYear().toString())}
                  </p>
                </div>
              </div>

              {/* Contact Preview */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Contact Details</p>
                <div className="border rounded-lg p-3 text-sm space-y-1">
                  <p>{form.contact_address}</p>
                  <p>{form.contact_email}</p>
                  <p>{form.contact_phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandingAdminPage;
