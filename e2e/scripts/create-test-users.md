# Creating Test Users in Supabase

This guide walks you through creating dedicated test users for E2E testing.

## Why Separate Test Users?

- ✅ **Isolation**: Test data doesn't interfere with your manual testing
- ✅ **Clean state**: Tests always start from known conditions
- ✅ **Safety**: Can't accidentally delete your real data
- ✅ **Debugging**: Easy to see what tests are doing in the database

---

## Option 1: Manual Creation (Recommended for Learning)

### Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: **eunos-jeopardy**
3. Click **Authentication** in the left sidebar
4. Click **Users** tab

### Step 2: Create Test Host User

1. Click **"Add user"** button
2. Fill in:
   - **Email**: `host@e2e.com`
   - **Password**: `1234`
   - **Auto Confirm User**: ✅ Check this (skip email verification)
3. Click **"Create user"**
4. **Copy the UUID** that appears (you'll need this!)

### Step 3: Create Test Player Users

Repeat Step 2 for each player:

**Player 1:**
- Email: `player1@e2e.com`
- Password: `1234`
- Auto Confirm: ✅

**Player 2:**
- Email: `player2@e2e.com`
- Password: `1234`
- Auto Confirm: ✅

**Player 3:**
- Email: `player3@e2e.com`
- Password: `1234`
- Auto Confirm: ✅

### Step 4: Set User Roles

If your app uses the `user_roles` table:

1. Go to **Table Editor** → **user_roles**
2. Click **"Insert"** → **"Insert row"**
3. For each user, add:
   - **user_id**: (paste the UUID you copied)
   - **role**: `host` or `player`
4. Click **"Save"**

### Step 5: Update Test Configuration

1. Open `e2e/fixtures/test-users.ts`
2. Replace the empty `id` fields with the UUIDs you copied:

```typescript
export const TEST_USERS = {
  host: {
    email: 'host@e2e.com',
    password: '1234',
    id: 'abc123-your-uuid-here',  // ← Paste UUID here
    role: 'host' as const,
  },
  player1: {
    email: 'player1@e2e.com',
    password: '1234',
    id: 'def456-your-uuid-here',  // ← Paste UUID here
    role: 'player' as const,
  },
  // ... etc
};
```

3. Save the file

### Step 6: Verify Setup

Run this command to verify everything is configured:

```bash
npm run test:e2e
```

You should see:
```
✅ All 4 test users configured
✅ Test data cleaned successfully
```

---

## Option 2: SQL Script (Faster, but Less Learning)

If you prefer automation, you can create users via SQL:

### Step 1: Open SQL Editor

1. Go to Supabase Dashboard
2. Click **SQL Editor** in left sidebar
3. Click **"New query"**

### Step 2: Run This SQL

```sql
-- Create test host user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),  -- This generates a UUID
  'authenticated',
  'authenticated',
  'host@e2e.com',
  crypt('1234', gen_salt('bf')),  -- Hashed password
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) RETURNING id;  -- This shows you the UUID - copy it!

-- Repeat for each test user, changing the email
```

**Note**: This is more complex and requires understanding Supabase's auth schema. Manual creation is recommended for learning.

### UUIDs
- **host@e2e.com**: `e5194515-79bd-49f2-9356-0b954af0058b`
- **player1@e2e.com**: `fab88c6a-621f-4a83-87c3-442ba7a05d9b`
- **player2@e2e.com**: `8a3fc952-8666-44bd-ad94-02ab7ffd44c0`
- **player3@e2e.com**: `dfe0b4d8-4663-4eb3-98ee-095bcceea878`

---

## Option 3: Programmatic Creation (Advanced)

You can create a Node.js script that uses Supabase Admin API:

```typescript
// e2e/scripts/create-test-users.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Admin key, not anon key!
);

async function createTestUsers() {
  const users = [
    { email: 'host@e2e.com', password: '1234' },
    { email: 'player1@e2e.com', password: '1234' },
    // ... etc
  ];

  for (const user of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (error) {
      console.error(`Failed to create ${user.email}:`, error);
    } else {
      console.log(`✅ Created ${user.email} with ID: ${data.user.id}`);
    }
  }
}

createTestUsers();
```

**Warning**: Requires `SUPABASE_SERVICE_ROLE_KEY` which has admin privileges. Keep this secret!

---

## Troubleshooting

### "Email already exists"
- Users already created! Just get their UUIDs from the Users table
- Or delete them and recreate

### "Password too weak"
- Supabase may require strong passwords by default
- If `1234` is rejected, you may need to adjust Supabase password requirements
- Or use a stronger password like `TestPassword123!` and update test-users.ts

### "Can't find user_roles table"
- Your app might not use roles
- Skip Step 4 if you don't have this table

### Tests fail with "No test users configured"
- You forgot to update `e2e/fixtures/test-users.ts` with UUIDs
- Go back to Step 5

---

## Next Steps

Once test users are created and configured:

1. ✅ Run `npm run test:e2e` to verify setup
2. ✅ Tests will automatically clean up data before running
3. ✅ You're ready to write real tests!

**Ready to write your first real test?** Let me know when test users are set up!
