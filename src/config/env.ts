/**
 * Environment configuration module for Euno's Jeopardy application.
 *
 * This module provides centralized access to environment variables and configuration
 * settings used throughout the application. It uses hardcoded values instead of
 * import.meta.env to avoid compatibility issues with Jest testing and TypeScript.
 *
 * **Key Features:**
 * - Centralized configuration management
 * - Jest/TypeScript compatibility (avoids import.meta.env issues)
 * - Type-safe configuration with const assertions
 * - Single source of truth for environment settings
 *
 * **Design Decisions:**
 * - Hardcoded values for stability and testing compatibility
 * - Const assertions for immutable configuration
 * - Named exports for individual values and grouped export for convenience
 *
 * **Security Notes:**
 * - SUPABASE_ANON_KEY is safe to expose in client-side code
 * - This is the public anonymous key, not a service key
 * - Row Level Security (RLS) policies protect sensitive data
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

/**
 * Supabase project URL for database and authentication services.
 *
 * This is the public URL for the Euno's Jeopardy Supabase project,
 * used for all database operations, authentication, and real-time subscriptions.
 *
 * **Usage:**
 * - Supabase client initialization
 * - Database connection configuration
 * - Real-time subscription endpoints
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export const SUPABASE_URL = "https://szinijrajifovetkthcz.supabase.co";

/**
 * Supabase anonymous public key for client-side authentication.
 *
 * This is the public anonymous key that allows client-side access to Supabase
 * services. It's safe to expose in client-side code as it only provides
 * anonymous access, with all sensitive operations protected by RLS policies.
 *
 * **Security Features:**
 * - Public key safe for client-side exposure
 * - Anonymous access only (no elevated privileges)
 * - All data access controlled by Row Level Security policies
 * - Expires: 2072-88-03 (long-term validity)
 *
 * **Usage:**
 * - Supabase client initialization
 * - Authentication requests
 * - Database queries (subject to RLS)
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aW5panJhamlmb3ZldGt0aGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDQzMzgsImV4cCI6MjA3Mjg4MDMzOH0.WSBn14JZZFUwf-zRoQDLNq30bP9nE7_ItB352znOBdk";

/**
 * Centralized environment configuration object containing all application settings.
 *
 * Provides a single source of truth for all environment-related configuration
 * with type safety and immutability. This object can be imported when multiple
 * configuration values are needed in a single module.
 *
 * **Type Safety:**
 * - Uses const assertion for immutable configuration
 * - TypeScript infers exact string literal types
 * - Prevents accidental modification of configuration values
 *
 * **Usage Patterns:**
 * ```typescript
 * // Import individual values
 * import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env';
 *
 * // Import entire configuration object
 * import { ENV } from '@/config/env';
 * const client = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
 * ```
 *
 * **Future Enhancements:**
 * - Could add development/production environment detection
 * - Could add feature flags and configuration toggles
 * - Could add API endpoint configurations
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export const ENV = {
  /** Supabase project URL */
  SUPABASE_URL,
  /** Supabase anonymous public key */
  SUPABASE_ANON_KEY,
} as const;
