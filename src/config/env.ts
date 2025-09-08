// Environment Configuration
// Exports environment variables for use throughout the application
// This approach avoids import.meta.env issues in Jest tests

/**
 * Supabase configuration
 * These values are hardcoded since they won't change throughout this project
 * and this avoids Jest/TypeScript issues with import.meta.env
 */
export const SUPABASE_URL = "https://szinijrajifovetkthcz.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aW5panJhamlmb3ZldGt0aGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDQzMzgsImV4cCI6MjA3Mjg4MDMzOH0.WSBn14JZZFUwf-zRoQDLNq30bP9nE7_ItB352znOBdk";

/**
 * Environment configuration object
 * Provides a centralized place for all environment-related settings
 */
export const ENV = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} as const;
