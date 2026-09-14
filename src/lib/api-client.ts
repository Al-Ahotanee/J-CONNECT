// ======================================================================
// J-CONNECT UNIVERSAL NODE BACKEND API CLIENT
// Replaces @supabase/supabase-js with native Node/Express REST API
// ======================================================================

const TOKEN_KEY = "jconnect_auth_token";
const USER_KEY = "jconnect_auth_user";

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  roles?: string[];
  user_metadata?: {
    full_name?: string;
    [key: string]: any;
  };
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

class QueryBuilder {
  private table: string;
  private method: "GET" | "POST" | "PATCH" | "DELETE" = "GET";
  private queryParams: Record<string, string> = {};
  private bodyData: any = null;
  private isSingle = false;
  private isUpsert = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*") {
    this.queryParams.select = columns;
    return this;
  }

  insert(data: any | any[]) {
    this.method = "POST";
    this.bodyData = data;
    return this;
  }

  update(data: any) {
    this.method = "PATCH";
    this.bodyData = data;
    return this;
  }

  delete() {
    this.method = "DELETE";
    return this;
  }

  upsert(data: any | any[], _opts?: { onConflict?: string }) {
    this.method = "POST";
    this.isUpsert = true;
    this.queryParams.upsert = "true";
    this.bodyData = data;
    return this;
  }

  eq(column: string, value: any) {
    this.queryParams[column] = `eq.${value}`;
    return this;
  }

  neq(column: string, value: any) {
    this.queryParams[column] = `neq.${value}`;
    return this;
  }

  in(column: string, values: any[]) {
    this.queryParams[column] = `in.${values.join(",")}`;
    return this;
  }

  is(column: string, value: any) {
    this.queryParams[column] = `is.${value === null ? "null" : value}`;
    return this;
  }

  like(column: string, pattern: string) {
    this.queryParams[column] = `like.${pattern}`;
    return this;
  }

  ilike(column: string, pattern: string) {
    this.queryParams[column] = `ilike.${pattern}`;
    return this;
  }

  gte(column: string, value: any) {
    this.queryParams[column] = `gte.${value}`;
    return this;
  }

  gt(column: string, value: any) {
    this.queryParams[column] = `gt.${value}`;
    return this;
  }

  lte(column: string, value: any) {
    this.queryParams[column] = `lte.${value}`;
    return this;
  }

  lt(column: string, value: any) {
    this.queryParams[column] = `lt.${value}`;
    return this;
  }

  contains(column: string, value: any) {
    const v = Array.isArray(value) ? `{${value.join(",")}}` : `{${value}}`;
    this.queryParams[column] = `cs.${v}`;
    return this;
  }

  or(condition: string) {
    this.queryParams.or = condition;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const dir = options?.ascending === false ? "desc" : "asc";
    this.queryParams.order = `${column}.${dir}`;
    return this;
  }

  limit(count: number) {
    this.queryParams.limit = String(count);
    return this;
  }

  range(from: number, to: number) {
    this.queryParams.offset = String(from);
    this.queryParams.limit = String(to - from + 1);
    return this;
  }

  single() {
    this.isSingle = true;
    this.queryParams.single = "true";
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    this.queryParams.single = "true";
    return this;
  }

  async execute(): Promise<{ data: any; error: any }> {
    try {
      const url = new URL(`/api/data/${this.table}`, window.location.origin);
      for (const [k, v] of Object.entries(this.queryParams)) {
        url.searchParams.set(k, v);
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const fetchOpts: RequestInit = {
        method: this.method,
        headers,
      };

      if (this.bodyData && this.method !== "GET") {
        fetchOpts.body = JSON.stringify(this.bodyData);
      }

      const res = await fetch(url.toString(), fetchOpts);
      const resJson = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          data: null,
          error: new Error(resJson?.error || `Request failed with status ${res.status}`),
        };
      }

      return { data: resJson, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  then(resolve: (value: { data: any; error: any }) => any, reject?: (reason: any) => any) {
    return this.execute().then(resolve, reject);
  }
}

class AuthClient {
  private authListeners: Array<(event: string, session: AuthSession | null) => void> = [];

  constructor() {
    // Initial verification
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      this.refreshSession();
    }
  }

  private async refreshSession() {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const session: AuthSession = {
          access_token: token,
          token_type: "bearer",
          user: data.user,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        this.notifyListeners("SIGNED_IN", session);
      } else {
        this.signOut();
      }
    } catch (e) {
      // offline or server unavailable, maintain cached user
    }
  }

  private notifyListeners(event: string, session: AuthSession | null) {
    this.authListeners.forEach((cb) => cb(event, session));
  }

  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
    this.authListeners.push(callback);
    const session = this.getCachedSession();
    if (session) {
      setTimeout(() => callback("INITIAL_SESSION", session), 0);
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.authListeners = this.authListeners.filter((cb) => cb !== callback);
          },
        },
      },
    };
  }

  private getCachedSession(): AuthSession | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    if (!token || !userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return {
        access_token: token,
        token_type: "bearer",
        user,
      };
    } catch {
      return null;
    }
  }

  async getSession(): Promise<{ data: { session: AuthSession | null }; error: any }> {
    const session = this.getCachedSession();
    return { data: { session }, error: null };
  }

  async getUser(): Promise<{ data: { user: AuthUser | null }; error: any }> {
    const session = this.getCachedSession();
    return { data: { user: session?.user || null }, error: null };
  }

  async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
    try {
      const fullName = options?.data?.full_name || email.split("@")[0];
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        const session: AuthSession = { access_token: data.token, token_type: "bearer", user: data.user };
        this.notifyListeners("SIGNED_IN", session);
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid credentials");

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      const session: AuthSession = { access_token: data.token, token_type: "bearer", user: data.user };
      this.notifyListeners("SIGNED_IN", session);

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async signOut() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.notifyListeners("SIGNED_OUT", null);
    return { error: null };
  }

  async updateUser({ password }: { password?: string }) {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
}

class StorageClient {
  from(bucket: string) {
    return {
      upload: async (filePath: string, file: File, _options?: { upsert?: boolean }) => {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const token = localStorage.getItem(TOKEN_KEY);
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const reqPath = encodeURIComponent(filePath);
          const res = await fetch(`/api/upload/${bucket}?path=${reqPath}`, {
            method: "POST",
            headers,
            body: formData,
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Upload failed");

          return { data, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      getPublicUrl: (filePath: string) => {
        if (filePath && (filePath.startsWith("http://") || filePath.startsWith("https://"))) {
          return { data: { publicUrl: filePath } };
        }
        const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
        const publicUrl = `/uploads/${bucket}/${cleanPath}`;
        return { data: { publicUrl } };
      },
    };
  }
}

class FunctionsClient {
  async invoke(functionName: string, options?: { body?: any }) {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/ai/${functionName}`, {
        method: "POST",
        headers,
        body: JSON.stringify(options?.body || {}),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Function ${functionName} returned error`);

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
}

class RealtimeChannel {
  private channelName: string;
  private intervalId: any = null;

  constructor(channelName: string) {
    this.channelName = channelName;
  }

  on(_event: string, _filter: any, callback: () => void) {
    // Lightweight polling mechanism to simulate real-time updates without Supabase
    this.intervalId = setInterval(() => {
      // Periodic check if tab is active
      if (document.visibilityState === "visible") {
        callback();
      }
    }, 12000);
    return this;
  }

  subscribe(callback?: (status: string) => void) {
    if (callback) callback("SUBSCRIBED");
    return {
      unsubscribe: () => {
        if (this.intervalId) clearInterval(this.intervalId);
      },
    };
  }
}

export class ApiClient {
  public auth = new AuthClient();
  public storage = new StorageClient();
  public functions = new FunctionsClient();

  from(table: string) {
    return new QueryBuilder(table);
  }

  channel(channelName: string) {
    return new RealtimeChannel(channelName);
  }

  removeChannel(channel: any) {
    if (channel && typeof channel.unsubscribe === "function") {
      channel.unsubscribe();
    }
  }

  async rpc(functionName: string, args?: Record<string, any>) {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/rpc/${functionName}`, {
        method: "POST",
        headers,
        body: JSON.stringify(args || {}),
      });

      if (res.ok) {
        const data = await res.json();
        return { data, error: null };
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `RPC ${functionName} failed with status ${res.status}`);
    } catch (err: any) {
      // Fallback for local role checks if offline
      if (functionName === "has_role") {
        const { data } = await this.auth.getUser();
        const userRoles = (data?.user as any)?.roles || [];
        const roleToCheck = args?._role;
        return { data: userRoles.includes(roleToCheck) || userRoles.includes("super_admin"), error: null };
      }
      return { data: null, error: err };
    }
  }
}

export const apiClient = new ApiClient();
