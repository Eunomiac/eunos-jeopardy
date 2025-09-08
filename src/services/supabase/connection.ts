import { supabase } from "./client";

/**
 * Connection utilities for Supabase
 */
export class SupabaseConnection {
  /**
   * Test the connection to Supabase
   */
  static async testConnection(): Promise<{
    connected: boolean;
    error?: string;
    latency?: number;
  }> {
    const startTime = Date.now();

    try {
      // Try to execute a simple query to test connection
      // Use auth.getSession() which is always available and lightweight
      const { error } = await supabase.auth.getSession();

      const latency = Date.now() - startTime;

      if (error) {
        return {
          connected: false,
          error: error.message,
          latency,
        };
      }

      return {
        connected: true,
        latency,
      };
    } catch (err) {
      const latency = Date.now() - startTime;
      return {
        connected: false,
        error: err instanceof Error ? err.message : String(err),
        latency,
      };
    }
  }

  /**
   * Get connection status and basic info
   */
  static async getStatus(): Promise<{
    url: string;
    connected: boolean;
    error?: string;
    timestamp: string;
  }> {
    const { connected, error } = await this.testConnection();

    return {
      url: import.meta.env.VITE_SUPABASE_URL ?? "Not configured",
      connected,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if environment variables are properly configured
   */
  static validateEnvironment(): {
    valid: boolean;
    missing: string[];
    warnings: string[];
  } {
    const missing: string[] = [];
    const warnings: string[] = [];

    if (!import.meta.env.VITE_SUPABASE_URL) {
      missing.push("VITE_SUPABASE_URL");
    }

    if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
      missing.push("VITE_SUPABASE_ANON_KEY");
    }

    // Check for common configuration issues
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (url && !url.startsWith("https://")) {
      warnings.push("VITE_SUPABASE_URL should start with https://");
    }

    if (url?.includes("your_supabase_project_url")) {
      warnings.push("VITE_SUPABASE_URL appears to be a placeholder value");
    }

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (anonKey?.includes("your_supabase_anon_key")) {
      warnings.push("VITE_SUPABASE_ANON_KEY appears to be a placeholder value");
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }

  /**
   * Get comprehensive health check information
   */
  static async healthCheck(): Promise<{
    environment: ReturnType<typeof SupabaseConnection.validateEnvironment>;
    connection: Awaited<ReturnType<typeof SupabaseConnection.testConnection>>;
    status: Awaited<ReturnType<typeof SupabaseConnection.getStatus>>;
  }> {
    const [environment, connection, status] = await Promise.all([
      Promise.resolve(this.validateEnvironment()),
      this.testConnection(),
      this.getStatus(),
    ]);

    return {
      environment,
      connection,
      status,
    };
  }
}
