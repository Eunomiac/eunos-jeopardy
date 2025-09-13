/**
 * Main services barrel export module for Euno's Jeopardy.
 *
 * This module provides centralized access to all external service integrations
 * used throughout the application. It serves as a single import point for
 * service-related functionality, improving code organization and maintainability.
 *
 * **Exported Services:**
 * - Supabase: Database, authentication, and real-time services
 *
 * **Usage Pattern:**
 * ```typescript
 * // Import specific services
 * import { supabase, SupabaseConnection } from '@/services';
 *
 * // Use in application code
 * const { data, error } = await supabase.from('games').select('*');
 * ```
 *
 * **Benefits:**
 * - Centralized service access point
 * - Consistent import patterns across the application
 * - Easy to add new service integrations
 * - Simplified dependency management
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

// Supabase database, authentication, and real-time services
export { supabase, supabaseClient, SupabaseConnection } from "./supabase";
