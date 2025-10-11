/**
 * Mock implementation of the Supabase client for testing.
 * This mock uses the global @supabase/supabase-js mock to create a client instance.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types'

// Create a mock client using the mocked createClient from @supabase/supabase-js
export const supabase = createClient<Database>('http://localhost:54321', 'mock-anon-key')

export default supabase

