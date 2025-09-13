/**
 * Supabase services barrel export module for Euno's Jeopardy.
 *
 * This module provides centralized access to all Supabase-related functionality
 * including the client instance, connection utilities, and TypeScript types.
 * It serves as the main entry point for Supabase integration throughout the application.
 *
 * **Exported Services:**
 * - supabase: Main client instance for database operations
 * - supabaseClient: Alternative export name for the client
 * - SupabaseConnection: Connection testing and health monitoring utilities
 *
 * **Exported Types:**
 * - Database: Complete database schema type
 * - Tables: Individual table types for type-safe queries
 * - TablesInsert: Insert operation types
 * - TablesUpdate: Update operation types
 * - Enums: Database enum types
 *
 * **Usage Patterns:**
 * ```typescript
 * // Import client for database operations
 * import { supabase } from '@/services/supabase';
 *
 * // Import connection utilities for health checks
 * import { SupabaseConnection } from '@/services/supabase';
 *
 * // Import types for type safety
 * import type { Tables } from '@/services/supabase';
 * type Game = Tables<'games'>;
 * ```
 *
 * **Benefits:**
 * - Centralized Supabase functionality access
 * - Consistent import patterns across the application
 * - Type safety with generated database types
 * - Easy maintenance and updates
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

// Supabase client instances for database operations
export { supabase, default as supabaseClient } from "./client";

// Connection utilities for health monitoring and diagnostics
export { SupabaseConnection } from "./connection";

// TypeScript types for type-safe database operations
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "./types";
