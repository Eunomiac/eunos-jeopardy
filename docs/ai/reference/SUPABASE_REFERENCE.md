# Supabase Setup Guide

This document outlines the Supabase configuration for Euno's Jeopardy.

## Summary

### Project Information

- **Project ID**: szinijrajifovetkthcz
- **Region**: ca-central-1
- **Project URL**: https://szinijrajifovetkthcz.supabase.co
- **Status**: Active

### Project Structure

The Supabase integration is organized as follows:

```
src/services/supabase/
├── client.ts          # Supabase client configuration
├── connection.ts      # Connection utilities and health checks
├── types.ts           # TypeScript type definitions (placeholder)
└── index.ts           # Main exports
```

## Setup (COMPLETED)

### 1. Activate the Supabase project
- Go to the [Supabase dashboard](https://supabase.com/dashboard)
- Sign in with your Supabase credentials
- Locate the project and click 'Activate' if necessary

### 2. Environment Configuration
The project configures the Supabase connection via environment variables stored in './.env.local' (in the project root):

```env
VITE_SUPABASE_URL=https://szinijrajifovetkthcz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aW5panJhamlmb3ZldGt0aGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDQzMzgsImV4cCI6MjA3Mjg4MDMzOH0.WSBn14JZZFUwf-zRoQDLNq30bP9nE7_ItB352znOBdk
```

**For production deployment**, use the same values in your deployment platform (Vercel, Netlify, etc.).

### 3. Database Schema

#### Goal
- Establish a minimal starter schema so we can generate TypeScript types in Step 4 and begin coding against real types
- Keep domain-specific modeling in `docs/ai/PROJECT_CHARTER.md` (not here)

#### Process Overview
1) In `docs/ai/PROJECT_CHARTER.md`, under "## Database Schema Sketch":
   - Add a subsection "Starter Entities and Relationships"
   - Add a subsection "Starter SQL (to evolve)" with minimal DDL and RLS
2) Apply that SQL in Supabase (SQL Editor)
3) Verify tables exist
4) Proceed to Step 4 to generate TypeScript types

#### Instructions
- In `docs/ai/PROJECT_CHARTER.md` → "## Database Schema Sketch" → "### Starter Entities and Relationships":
  - list initial entities and how they relate, based on the project's description. Consider:
    - profiles/users (if multi-user; mirror of auth.users)
    - primary domain objects (e.g., items/projects/boards/rooms)
    - join tables (e.g., membership with roles)
    - event/interaction tables (e.g., actions/messages/logs)
- In `docs/ai/PROJECT_CHARTER.md` → "## Database Schema Sketch" → "### Starter SQL (to evolve)":
  - include:
    - CREATE TABLE statements with primary/foreign keys and minimal constraints
    - Enable RLS for each table
    - Minimal RLS policies (e.g., owner- or participant-based access)
- Only ask the user clarifying questions if the entity list is truly ambiguous; otherwise proceed with reasonable defaults for a starter schema

#### Apply Schema in Supabase
- Copy the SQL from `docs/ai/PROJECT_CHARTER.md` into the Supabase SQL Editor and run it
- Keep it minimal and non-blocking; refine via migrations later

##### Example RLS pattern (adjust per table)

```sql
alter table my_table enable row level security;
create policy "my_table_select_own" on my_table
  for select using (owner_id = auth.uid());
create policy "my_table_modify_own" on my_table
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
```

##### Quick verification query (optional)

```sql
select table_name
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;
```

### 4. TypeScript Types
- Generate TypeScript types for your database schema:
  ```bash
  npx supabase gen types typescript --project-id szinijrajifovetkthcz > src/services/supabase/types.ts
  ```

## Recent Schema Updates

### Daily Double Flow Implementation (2025-01-20)

Added `current_player_id` field to the `games` table to support the Daily Double flow system:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE games
ADD COLUMN current_player_id UUID;
```

**Purpose**: Tracks which player gets to answer Daily Double clues
- **Type**: `UUID` (nullable)
- **References**: User ID from auth system
- **Usage**:
  - Randomly assigned at game start
  - Updated when players answer correctly
  - Used for Daily Double player selection
  - Provides visual indication in host interface

**Related Features**:
- Current player visual indicators (golden glow, crown emoji)
- Daily Double automatic player selection
- Wager system integration
- Game flow control

**TypeScript Integration**:
- Updated `src/services/supabase/types.ts`
- Added to Row, Insert, and Update types for games table
- All test mocks updated to include field

## Usage

### Basic Client Usage

```typescript
import { supabase } from '@/services/supabase';

// Example: Query a table
const { data, error } = await supabase
  .from('your_table_name')
  .select('*');
```

## Security Notes

- Never commit '.env.local' to version control
- **Multi-user app**: Row Level Security (RLS) policies implemented and working
- Authentication and authorization fully configured
- Keep the service role key secure and never expose it in client-side code
- The anon key is safe to use in client-side code as it has limited permissions

## Troubleshooting

### Connection Issues

1. Check that environment variables are set correctly
2. Verify the project is active in Supabase dashboard
3. Ensure API keys are valid and not expired
4. Check network connectivity

### Environment Variable Issues

The 'SupabaseStatus' component will show warnings for:
- Missing environment variables
- Placeholder values that haven't been replaced
- Invalid URL formats

## Development Workflow

1. The connection status is visible on the main page during development
2. Environment validation happens automatically on app startup
3. Connection errors are logged to the console
4. Use the health check utilities for debugging connection issues
