import { supabase } from "./client";

/**
 * Supabase connection utilities and health monitoring for Euno's Jeopardy.
 *
 * This module provides utilities for testing Supabase connectivity, validating
 * configuration, and monitoring connection health. Useful for debugging
 * connection issues and ensuring proper Supabase integration.
 *
 * **Key Features:**
 * - Connection testing with latency measurement
 * - Environment configuration validation
 * - Comprehensive health check reporting
 * - Error handling and diagnostics
 *
 * **Use Cases:**
 * - Development debugging and troubleshooting
 * - Production health monitoring
 * - Configuration validation during setup
 * - Connection diagnostics for support
 *
 * **Note:** This module uses import.meta.env for environment validation,
 * which differs from the hardcoded configuration approach used in client.ts.
 * This is intentional for comprehensive environment checking capabilities.
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export class SupabaseConnection {
  /**
   * Tests the connection to Supabase with latency measurement.
   *
   * Performs a lightweight connection test by calling the Supabase Auth
   * getSession() method, which is always available and doesn't require
   * authentication. Measures response time for performance monitoring.
   *
   * **Test Method:**
   * - Uses auth.getSession() as a lightweight connectivity test
   * - Measures round-trip latency in milliseconds
   * - Handles both Supabase errors and network exceptions
   * - Returns structured result for easy consumption
   *
   * **Use Cases:**
   * - Development environment validation
   * - Production health monitoring
   * - Debugging connection issues
   * - Performance monitoring
   *
   * @returns Promise resolving to connection test results
   *
   * @example
   * ```typescript
   * const result = await SupabaseConnection.testConnection();
   * if (result.connected) {
   *   console.log(`Connected in ${result.latency}ms`);
   * } else {
   *   console.error(`Connection failed: ${result.error}`);
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async testConnection(): Promise<{
    connected: boolean;
    error?: string;
    latency?: number;
  }> {
    // Start timing for latency measurement
    const startTime = Date.now();

    try {
      // Execute lightweight connection test using auth.getSession()
      // This method is always available and doesn't require authentication
      const { error } = await supabase.auth.getSession();

      // Calculate round-trip latency
      const latency = Date.now() - startTime;

      // Check for Supabase-specific errors
      if (error) {
        return {
          connected: false,
          error: error.message,
          latency,
        };
      }

      // Connection successful
      return {
        connected: true,
        latency,
      };
    } catch (err) {
      // Handle network errors and other exceptions
      const latency = Date.now() - startTime;
      return {
        connected: false,
        error: err instanceof Error ? err.message : String(err),
        latency,
      };
    }
  }

  /**
   * Retrieves comprehensive connection status and configuration information.
   *
   * Combines connection testing with configuration details to provide
   * a complete status report. Useful for debugging and monitoring
   * the Supabase integration health.
   *
   * **Status Information:**
   * - Configured Supabase URL
   * - Current connection state
   * - Error details if connection failed
   * - Timestamp of status check
   *
   * **Use Cases:**
   * - Health check endpoints
   * - Development debugging
   * - Configuration verification
   * - Support diagnostics
   *
   * @returns Promise resolving to status information object
   *
   * @example
   * ```typescript
   * const status = await SupabaseConnection.getStatus();
   * console.log(`Supabase URL: ${status.url}`);
   * console.log(`Connected: ${status.connected}`);
   * console.log(`Checked at: ${status.timestamp}`);
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async getStatus(): Promise<{
    url: string;
    connected: boolean;
    error?: string;
    timestamp: string;
  }> {
    // Test current connection status
    const { connected, error } = await this.testConnection();

    return {
      // Note: Uses import.meta.env for environment validation purposes
      url: import.meta.env.VITE_SUPABASE_URL,
      connected,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validates Supabase environment configuration and detects common issues.
   *
   * Performs comprehensive validation of environment variables used for
   * Supabase configuration, checking for missing values, placeholder content,
   * and common configuration mistakes. Useful for setup validation and
   * troubleshooting configuration issues.
   *
   * **Validation Checks:**
   * - Required environment variables presence
   * - URL format validation (https:// prefix)
   * - Placeholder value detection
   * - Common configuration mistakes
   *
   * **Note:** This method checks import.meta.env variables for comprehensive
   * environment validation, which differs from the hardcoded configuration
   * used in client.ts. This is intentional for debugging capabilities.
   *
   * **Use Cases:**
   * - Development environment setup validation
   * - Configuration troubleshooting
   * - Deployment verification
   * - Support diagnostics
   *
   * @returns Environment validation results with missing variables and warnings
   *
   * @example
   * ```typescript
   * const validation = SupabaseConnection.validateEnvironment();
   * if (!validation.valid) {
   *   console.error('Missing variables:', validation.missing);
   *   console.warn('Warnings:', validation.warnings);
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static validateEnvironment(): {
    valid: boolean;
    missing: string[];
    warnings: string[];
  } {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check for required environment variables
    if (!import.meta.env.VITE_SUPABASE_URL) {
      missing.push("VITE_SUPABASE_URL");
    }

    if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
      missing.push("VITE_SUPABASE_ANON_KEY");
    }

    // Validate URL format and content
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (url && !url.startsWith("https://")) {
      warnings.push("VITE_SUPABASE_URL should start with https://");
    }

    // Check for placeholder values that weren't replaced
    if (url.includes("your_supabase_project_url")) {
      warnings.push("VITE_SUPABASE_URL appears to be a placeholder value");
    }

    // Validate anonymous key content
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (anonKey.includes("your_supabase_anon_key")) {
      warnings.push("VITE_SUPABASE_ANON_KEY appears to be a placeholder value");
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }

  /**
   * Performs a comprehensive health check of the Supabase integration.
   *
   * Combines environment validation, connection testing, and status reporting
   * into a single comprehensive health check. This method runs all diagnostic
   * checks in parallel for efficiency and provides a complete picture of
   * the Supabase integration health.
   *
   * **Health Check Components:**
   * - Environment configuration validation
   * - Live connection testing with latency
   * - Status reporting with timestamps
   *
   * **Parallel Execution:**
   * - All checks run concurrently for performance
   * - Environment validation is synchronous (resolved immediately)
   * - Connection and status checks are asynchronous
   *
   * **Use Cases:**
   * - Comprehensive system health monitoring
   * - Deployment verification
   * - Support diagnostics and troubleshooting
   * - Development environment validation
   *
   * @returns Promise resolving to comprehensive health check results
   *
   * @example
   * ```typescript
   * const health = await SupabaseConnection.healthCheck();
   *
   * console.log('Environment valid:', health.environment.valid);
   * console.log('Connection status:', health.connection.connected);
   * console.log('Latency:', health.connection.latency, 'ms');
   * console.log('Status timestamp:', health.status.timestamp);
   *
   * if (!health.environment.valid) {
   *   console.error('Missing env vars:', health.environment.missing);
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async healthCheck(): Promise<{
    environment: ReturnType<typeof SupabaseConnection.validateEnvironment>;
    connection: Awaited<ReturnType<typeof SupabaseConnection.testConnection>>;
    status: Awaited<ReturnType<typeof SupabaseConnection.getStatus>>;
  }> {
    // Run all health checks in parallel for efficiency
    const [environment, connection, status] = await Promise.all([
      // Environment validation is synchronous, wrap in resolved promise
      Promise.resolve(this.validateEnvironment()),
      // Connection test is async
      this.testConnection(),
      // Status check is async
      this.getStatus(),
    ]);

    return {
      environment,
      connection,
      status,
    };
  }
}
