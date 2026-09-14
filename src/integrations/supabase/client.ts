// ======================================================================
// J-CONNECT API CLIENT EXPORT
// Refactored to Node.js Express backend + Aiven MySQL DB
// ======================================================================
import { apiClient } from "@/lib/api-client";

// Export apiClient as supabase for complete 100% backward compatibility
// across all existing application components and hooks.
export const supabase = apiClient;
export default apiClient;