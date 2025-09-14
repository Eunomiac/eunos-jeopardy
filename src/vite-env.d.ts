/**
 * Vite environment type definitions for Euno's Jeopardy application.
 *
 * This module provides TypeScript type definitions for Vite's environment
 * variable system, enabling type-safe access to environment variables
 * through import.meta.env with full IntelliSense support.
 *
 * **Key Features:**
 * - Type-safe environment variable access
 * - IntelliSense support for all defined variables
 * - Compile-time validation of environment usage
 * - Clear documentation of required vs optional variables
 *
 * **Note:** This application primarily uses hardcoded configuration
 * (see config/env.ts) for Jest compatibility, but this file provides
 * type definitions for comprehensive environment variable support.
 *
 * **Usage:**
 * ```typescript
 * // Type-safe environment access
 * const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
 * const sentryDsn = import.meta.env.VITE_SENTRY_DSN; // Optional
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

/// <reference types="vite/client" />

/**
 * Environment variables interface for type-safe access to Vite environment variables.
 *
 * Defines all environment variables used by the Euno's Jeopardy application
 * with proper TypeScript typing. Variables prefixed with VITE_ are available
 * in client-side code, while others are build-time only.
 *
 * **Required Variables:**
 * - VITE_SUPABASE_URL: Supabase project URL for database connection
 * - VITE_SUPABASE_ANON_KEY: Supabase anonymous key for client authentication
 *
 * **Optional Variables:**
 * - VITE_SENTRY_DSN: Sentry error tracking DSN (production monitoring)
 *
 * **Security Notes:**
 * - All VITE_ prefixed variables are exposed to client-side code
 * - Never include sensitive keys or secrets in VITE_ variables
 * - SUPABASE_ANON_KEY is safe for client exposure (public anonymous key)
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
interface ImportMetaEnv {
  /** Supabase project URL for database and authentication services */
  readonly VITE_SUPABASE_URL: string;

  /** Supabase anonymous public key for client-side authentication */
  readonly VITE_SUPABASE_ANON_KEY: string;

  /** Optional Sentry DSN for error tracking and monitoring */
  readonly VITE_SENTRY_DSN?: string;

  // Future environment variables can be added here as needed:
  // readonly VITE_API_BASE_URL?: string;
  // readonly VITE_FEATURE_FLAGS?: string;
  // readonly VITE_ANALYTICS_ID?: string;
}

/**
 * Extended ImportMeta interface with typed environment variables.
 *
 * Augments the standard ImportMeta interface to include our custom
 * ImportMetaEnv interface, providing type safety for environment
 * variable access throughout the application.
 *
 * **Usage:**
 * ```typescript
 * // Fully typed environment access
 * const config = {
 *   supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
 *   supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
 *   sentryDsn: import.meta.env.VITE_SENTRY_DSN,
 * };
 * ```
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
