import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserRoles } from "@/lib/api";
import { hasAnyRole, canAccessAdmin } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Heart, MessageCircle, Share2, ThumbsUp, Users, Plus,
  Send, Globe, Lock, User, Image, Video, Loader2, Smile, MoreHorizontal,
  UserPlus, Search, UserCheck, X,
} from "lucide-react";

const CommunityPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [mediaFiles, setMediaFiles] = useState<{ url: string; name: string; type: "image" | "video" }[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", category: "" });
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [discoverSearch, setDiscoverSearch] = useState("");

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const isAdmin = canAccessAdmin(roles);

  // Posts with profiles
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["socialPosts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("social_posts").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, passport_photo_url").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return (data || []).map(p => ({ ...p, profile: profileMap.get(p.user_id) }));
    },
    enabled: !!user,
  });

  // My reactions
  const { data: myReactions = [] } = useQuery({
    queryKey: ["myReactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("social_reactions").select("post_id").eq("user_id", user!.id);
      return (data || []).map(r => r.post_id);
    },
    enabled: !!user,
  });

  // Comments for expanded posts
  const { data: allComments = {} } = useQuery({
    queryKey: ["socialComments", Array.from(expandedComments)],
    queryFn: async () => {
      if (expandedComments.size === 0) return {};
      const postIds = Array.from(expandedComments);
      const { data, error } = await supabase.from("social_comments").select("*").in("post_id", postIds).order("created_at", { ascending: true });
      if (error) throw error;
      // Fetch comment author profiles
      const authorIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = authorIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name, passport_photo_url").in("user_id", authorIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const grouped: Record<string, any[]> = {};
      for (const c of (data || [])) {
        if (!grouped[c.post_id]) grouped[c.post_id] = [];
        grouped[c.post_id].push({ ...c, profile: profileMap.get(c.user_id) });
      }
      return grouped;
    },
    enabled: expandedComments.size > 0,
  });

  // Groups
  const { data: groups = [] } = useQuery({
    queryKey: ["socialGroups"],
    queryFn: async () => {
      const { data } = await supabase.from("social_groups").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: myGroups = [] } = useQuery({
    queryKey: ["myGroupMemberships", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("social_group_members").select("group_id").eq("user_id", user!.id);
      return (data || []).map(g => g.group_id);
    },
    enabled: !!user,
  });

  // Following
  const { data: following = [] } = useQuery({
    queryKey: ["myFollowing", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("social_follows").select("following_id").eq("follower_id", user!.id);
      return (data || []).map(f => f.following_id);
    },
    enabled: !!user,
  });

  // Discover people search
  const { data: discoverPeople = [] } = useQuery({
    queryKey: ["discoverPeople", discoverSearch],
    queryFn: async () => {
      if (!discoverSearch || discoverSearch.length < 2) {
        // Show random profiles
        const { data } = await supabase.from("profiles").select("user_id, full_name, passport_photo_url, lga, employment_status")
          .neq("user_id", user!.id).limit(20);
        return data || [];
      }
      const { data } = await supabase.from("profiles").select("user_id, full_name, passport_photo_url, lga, employment_status")
        .ilike("full_name", `%${discoverSearch}%`).neq("user_id", user!.id).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingMedia(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || (type === "image" ? "png" : "mp4");
        const filePath = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("community-media").upload(filePath, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("community-media").getPublicUrl(filePath);
        setMediaFiles(prev => [...prev, { url: publicUrl, name: file.name, type }]);
      }
      toast.success(`${type === "image" ? "Image" : "Video"} attached!`);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message || "Failed to upload file"}`);
    } finally {
      setUploadingMedia(false);
      if (e.target) e.target.value = "";
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && mediaFiles.length === 0) return;
    try {
      const mediaUrls = mediaFiles.map(m => m.url);
      const { error } = await supabase.from("social_posts").insert({
        user_id: user.id,
        content: newPost.trim() || (mediaUrls.length > 0 ? "Shared media" : ""),
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        visibility: "public",
      });
      if (error) throw error;
      setNewPost("");
      setMediaFiles([]);
      queryClient.invalidateQueries({ queryKey: ["socialPosts"] });
      toast.success("Post published!");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleLike = async (postId: string) => {
    try {
      if (myReactions.includes(postId)) {
        await supabase.from("social_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
        await supabase.from("social_posts").update({ likes_count: Math.max(0, (posts.find(p => p.id === postId)?.likes_count || 1) - 1) }).eq("id", postId);
      } else {
        await supabase.from("social_reactions").insert({ post_id: postId, user_id: user.id, reaction_type: "like" });
        await supabase.from("social_posts").update({ likes_count: (posts.find(p => p.id === postId)?.likes_count || 0) + 1 }).eq("id", postId);
      }
      queryClient.invalidateQueries({ queryKey: ["socialPosts"] });
      queryClient.invalidateQueries({ queryKey: ["myReactions"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    try {
      const { error } = await supabase.from("social_comments").insert({ post_id: postId, user_id: user.id, content });
      if (error) throw error;
      await supabase.from("social_posts").update({ comments_count: (posts.find(p => p.id === postId)?.comments_count || 0) + 1 }).eq("id", postId);
      setCommentInputs(prev => ({ ...prev, [postId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["socialComments"] });
      queryClient.invalidateQueries({ queryKey: ["socialPosts"] });
      toast.success("Comment added!");
    } catch (err: any) { toast.error(err.message); }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
  };

  const handleFollow = async (userId: string) => {
    try {
      if (following.includes(userId)) {
        await supabase.from("social_follows").delete().eq("follower_id", user.id).eq("following_id", userId);
        toast.success("Unfollowed");
      } else {
        await supabase.from("social_follows").insert({ follower_id: user.id, following_id: userId });
        toast.success("Following!");
      }
      queryClient.invalidateQueries({ queryKey: ["myFollowing"] });
    } catch (err: any) {
      if (err.message?.includes("duplicate")) toast.info("Already following");
      else toast.error(err.message);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) return;
    try {
      const { data: group, error } = await supabase.from("social_groups").insert({
        name: groupForm.name, description: groupForm.description || null,
        category: groupForm.category || null, created_by: user.id,
      }).select().single();
      if (error) throw error;
      await supabase.from("social_group_members").insert({ group_id: group.id, user_id: user.id, role: "admin" });
      setShowCreateGroup(false);
      setGroupForm({ name: "", description: "", category: "" });
      queryClient.invalidateQueries({ queryKey: ["socialGroups"] });
      queryClient.invalidateQueries({ queryKey: ["myGroupMemberships"] });
      toast.success("Group created!");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      if (myGroups.includes(groupId)) {
        await supabase.from("social_group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
      } else {
        await supabase.from("social_group_members").insert({ group_id: groupId, user_id: user.id });
      }
      queryClient.invalidateQueries({ queryKey: ["socialGroups"] });
      queryClient.invalidateQueries({ queryKey: ["myGroupMemberships"] });
      toast.success(myGroups.includes(groupId) ? "Left group" : "Joined group!");
    } catch (err: any) { toast.error(err.message); }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Community</h1>
        <p className="text-sm text-muted-foreground">Connect, share, and engage with the J-Connect community</p>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed"><Globe className="h-3.5 w-3.5 mr-1" /> Feed</TabsTrigger>
          <TabsTrigger value="groups"><Users className="h-3.5 w-3.5 mr-1" /> Groups</TabsTrigger>
          <TabsTrigger value="discover"><Search className="h-3.5 w-3.5 mr-1" /> Discover</TabsTrigger>
        </TabsList>

        {/* FEED */}
        <TabsContent value="feed" className="mt-4 space-y-4">
          {/* Compose */}
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Textarea placeholder="What's on your mind?" value={newPost} onChange={e => setNewPost(e.target.value)}
                  className="min-h-[80px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-sm" />

                {/* Uploaded media previews */}
                {mediaFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                    {mediaFiles.map((m, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-border w-20 h-20 bg-muted flex items-center justify-center">
                        {m.type === "image" ? (
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={m.url} className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(idx)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full p-0.5 transition-colors"
                          title="Remove media"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadingMedia && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Uploading media...</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => handleFileUpload(e, "image")}
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={e => handleFileUpload(e, "video")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingMedia}
                    >
                      <Image className="h-3.5 w-3.5 mr-1 text-primary" /> Photo
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingMedia}
                    >
                      <Video className="h-3.5 w-3.5 mr-1 text-primary" /> Video
                    </Button>
                  </div>
                  <Button size="sm" onClick={handleCreatePost} disabled={(!newPost.trim() && mediaFiles.length === 0) || uploadingMedia}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Post
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts */}
          {postsLoading ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Loading feed...</p>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Globe className="mx-auto h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            posts.map((post: any) => (
              <div key={post.id} className="bg-card rounded-xl shadow-soft border border-border overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {post.profile?.passport_photo_url ? (
                        <img src={post.profile.passport_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{post.profile?.full_name || "User"}</p>
                          {!following.includes(post.user_id) && post.user_id !== user.id && (
                            <button onClick={() => handleFollow(post.user_id)} className="text-[10px] text-primary font-semibold hover:underline">Follow</button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)} • <Globe className="inline h-2.5 w-2.5" /> Public</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>

                  {/* Media attachments */}
                  {(() => {
                    let urls: string[] = [];
                    if (Array.isArray(post.media_urls)) {
                      urls = post.media_urls;
                    } else if (typeof post.media_urls === "string") {
                      try {
                        const parsed = JSON.parse(post.media_urls);
                        if (Array.isArray(parsed)) urls = parsed;
                        else if (parsed) urls = [parsed];
                      } catch {
                        if (post.media_urls.startsWith("http") || post.media_urls.startsWith("/")) {
                          urls = [post.media_urls];
                        }
                      }
                    }
                    if (urls.length === 0) return null;
                    return (
                      <div className="mt-3">
                        <div className={`grid gap-2 ${urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                          {urls.map((url, idx) => {
                            const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
                            return isVideo ? (
                              <video key={idx} src={url} controls className="rounded-lg w-full max-h-80 bg-black" />
                            ) : (
                              <a key={idx} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border">
                                <img src={url} alt="" className="w-full h-64 object-cover hover:scale-105 transition-transform duration-200" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Engagement counts */}
                <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{post.likes_count || 0} likes</span>
                  <button onClick={() => toggleComments(post.id)} className="hover:underline">
                    {post.comments_count || 0} comments
                  </button>
                </div>

                {/* Action buttons */}
                <div className="px-4 py-2 border-t border-border flex items-center gap-1">
                  <Button variant="ghost" size="sm" className={`flex-1 text-xs ${myReactions.includes(post.id) ? "text-primary" : "text-muted-foreground"}`}
                    onClick={() => handleLike(post.id)}>
                    <ThumbsUp className="h-3.5 w-3.5 mr-1" /> {myReactions.includes(post.id) ? "Liked" : "Like"}
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 text-xs text-muted-foreground" onClick={() => toggleComments(post.id)}>
                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> Comment
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 text-xs text-muted-foreground" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/community?post=${post.id}`);
                    toast.success("Link copied!");
                  }}>
                    <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                  </Button>
                </div>

                {/* Comments section */}
                {expandedComments.has(post.id) && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    {/* Existing comments */}
                    {(allComments as any)[post.id]?.map((comment: any) => (
                      <div key={comment.id} className="flex items-start gap-2">
                        {comment.profile?.passport_photo_url ? (
                          <img src={comment.profile.passport_photo_url} alt="" className="w-7 h-7 rounded-full object-cover mt-0.5" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center mt-0.5 shrink-0">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 bg-muted rounded-xl px-3 py-2">
                          <p className="text-xs font-semibold text-foreground">{comment.profile?.full_name || "User"}</p>
                          <p className="text-xs text-foreground mt-0.5">{comment.content}</p>
                          <p className="text-[9px] text-muted-foreground mt-1">{timeAgo(comment.created_at)}</p>
                        </div>
                      </div>
                    ))}
                    {/* New comment input */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <Input
                        placeholder="Write a comment..."
                        value={commentInputs[post.id] || ""}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") handleComment(post.id); }}
                        className="flex-1 h-8 text-xs"
                      />
                      <Button size="icon" className="h-7 w-7 shrink-0" onClick={() => handleComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim()}>
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>

        {/* GROUPS */}
        <TabsContent value="groups" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-foreground">Community Groups</h2>
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Create Group</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New Group</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Group Name *</Label><Input value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label>Description</Label><Textarea value={groupForm.description} onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))} /></div>
                  <div><Label>Category</Label><Input placeholder="e.g. Technology, Business" value={groupForm.category} onChange={e => setGroupForm(p => ({ ...p, category: e.target.value }))} /></div>
                  <Button className="w-full" onClick={handleCreateGroup} disabled={!groupForm.name.trim()}>Create Group</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-card rounded-xl border border-border">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No groups yet. Create the first one!</p>
              </div>
            ) : (
              groups.map((group: any) => (
                <div key={group.id} className="bg-card rounded-xl p-5 shadow-soft border border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                      {group.category && <Badge variant="secondary" className="text-[10px] mt-1">{group.category}</Badge>}
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{group.description || "No description"}</p>
                      <p className="text-[10px] text-muted-foreground mt-2"><Users className="inline h-3 w-3 mr-0.5" /> {group.member_count} members</p>
                    </div>
                    <Button variant={myGroups.includes(group.id) ? "outline" : "default"} size="sm" onClick={() => handleJoinGroup(group.id)}>
                      {myGroups.includes(group.id) ? "Leave" : "Join"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* DISCOVER */}
        <TabsContent value="discover" className="mt-4 space-y-4">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h2 className="font-display text-sm font-semibold text-foreground mb-3">Discover People</h2>
            <Input placeholder="Search by name..." value={discoverSearch} onChange={e => setDiscoverSearch(e.target.value)} className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {discoverPeople.map((person: any) => (
                <div key={person.user_id} className="flex items-center gap-3 bg-muted rounded-xl p-3">
                  {person.passport_photo_url ? (
                    <img src={person.passport_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{person.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{person.lga || ""} {person.employment_status ? `• ${person.employment_status}` : ""}</p>
                  </div>
                  <Button
                    variant={following.includes(person.user_id) ? "outline" : "default"}
                    size="sm"
                    className="h-7 text-[10px] shrink-0"
                    onClick={() => handleFollow(person.user_id)}
                  >
                    {following.includes(person.user_id) ? (
                      <><UserCheck className="h-3 w-3 mr-0.5" /> Following</>
                    ) : (
                      <><UserPlus className="h-3 w-3 mr-0.5" /> Follow</>
                    )}
                  </Button>
                </div>
              ))}
              {discoverPeople.length === 0 && (
                <p className="col-span-full text-xs text-muted-foreground text-center py-4">No users found</p>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h2 className="font-display text-sm font-semibold text-foreground mb-2">Following</h2>
            <p className="text-xs text-muted-foreground">{following.length} people followed</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunityPage;
