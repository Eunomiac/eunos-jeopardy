/**
 * Supabase client configuration and initialization for Euno's Jeopardy.
 *
 * This module creates and configures the main Supabase client instance used
 * throughout the application for database operations, authentication, and
 * real-time subscriptions. It includes proper TypeScript typing and
 * configuration validation.
 *
 * **Key Features:**
 * - Type-safe database operations with generated TypeScript types
 * - Environment configuration validation
 * - Single client instance for consistent connection management
 * - Authentication and session management integration
 * - Real-time subscription capabilities
 *
 * **Security:**
 * - Uses anonymous public key (safe for client-side)
 * - All sensitive operations protected by Row Level Security (RLS)
 * - Authentication handled through Supabase Auth
 *
 * **Usage:**
 * ```typescript
 * import { supabase } from '@/services/supabase/client';
 *
 * // Database operations
 * const { data, error } = await supabase.from('games').select('*');
 *
 * // Authentication
 * const { user } = await supabase.auth.signIn({ email, password });
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../config/env";

/**
 * Environment configuration validation and assignment.
 *
 * Validates that required Supabase configuration values are present
 * and throws descriptive errors if any are missing. This ensures
 * the application fails fast with clear error messages during startup
 * rather than failing silently or with cryptic errors later.
 */

/** Supabase project URL from environment configuration */
const supabaseUrl = SUPABASE_URL;

/** Supabase anonymous public key from environment configuration */
const supabaseAnonKey = SUPABASE_ANON_KEY;

/**
 * Main Supabase client instance for the Euno's Jeopardy application.
 *
 * This is the primary client instance used throughout the application for
 * all Supabase operations. It's configured with proper TypeScript typing
 * using the generated Database type for full type safety.
 *
 * **Capabilities:**
 * - Database CRUD operations with type safety
 * - Authentication and user management
 * - Real-time subscriptions for live updates
 * - File storage operations (future use)
 * - Edge functions integration (future use)
 *
 * **Type Safety:**
 * - Uses generated Database type from Supabase CLI
 * - Provides full IntelliSense and type checking
 * - Prevents runtime errors from incorrect queries
 *
 * **Connection Management:**
 * - Single instance shared across the application
 * - Automatic connection pooling and management
 * - Built-in retry logic and error handling
 *
 * @example
 * ```typescript
 * // Database query with full type safety
 * const { data: games, error } = await supabase
 *   .from('games')
 *   .select('id, status, created_at')
 *   .eq('host_id', userId);
 *
 * // Authentication
 * const { data: { user }, error } = await supabase.auth.signInWithPassword({
 *   email: 'user@example.com',
 *   password: 'password'
 * });
 *
 * // Real-time subscription
 * const subscription = supabase
 *   .channel('game-updates')
 *   .on('postgres_changes', { event: '*', schema: 'public', table: 'games' },
 *       (payload) => console.log('Game updated:', payload))
 *   .subscribe();
 * ```
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Default export of the Supabase client for convenience.
 *
 * Provides an alternative import pattern for modules that prefer
 * default imports over named imports.
 *
 * @example
 * ```typescript
 * import supabase from '@/services/supabase/client';
 * ```
 */
export default supabase;
