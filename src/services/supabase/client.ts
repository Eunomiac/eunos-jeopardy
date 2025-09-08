import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../config/env";

// Environment variables validation
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL configuration");
}

if (!supabaseAnonKey) {
  throw new Error("Missing SUPABASE_ANON_KEY configuration");
}

// Create Supabase client with proper TypeScript typing
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default supabase;
