/**
 * Global type declarations for browser environment
 */

import { gsap } from 'gsap';

declare global {
  interface Window {
    gsap: typeof gsap;
  }

  /**
   * Vite environment variables type declaration
   *
   * Extends ImportMeta to include Vite's env property with type-safe
   * access to environment variables defined in .env files.
   */
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    // Add other env variables as needed
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
