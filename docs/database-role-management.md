# User Role Management

## Setting User Roles in Supabase

Since we're manually managing user accounts until Phase 4, here are SQL queries to help manage user roles in the Supabase SQL Editor.

### View All Users and Their Roles

```sql
SELECT 
  id,
  username,
  display_name,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;
```

### Set a User as Host

```sql
-- Replace 'user-id-here' with the actual user ID
UPDATE profiles 
SET role = 'host' 
WHERE id = 'user-id-here';
```

### Set a User as Player

```sql
-- Replace 'user-id-here' with the actual user ID
UPDATE profiles 
SET role = 'player' 
WHERE id = 'user-id-here';
```

### Set Role by Email (if you know the email)

```sql
-- Replace 'user@example.com' with the actual email
UPDATE profiles 
SET role = 'host' 
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'user@example.com'
);
```

### View Users with Their Email Addresses

```sql
SELECT 
  p.id,
  p.username,
  p.display_name,
  p.role,
  au.email,
  p.created_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;
```

### Bulk Update - Set All Current Users as Hosts (if needed)

```sql
-- Use this carefully - sets ALL existing users as hosts
UPDATE profiles SET role = 'host';
```

## Role Behavior

- **Host Role**: Users see the game creation interface with CSV upload by default
- **Player Role**: Users see the player join interface where they can enter game codes
- **Default**: New users are automatically set to 'player' role when they first log in

## Manual Account Creation

When creating accounts manually in Supabase Auth:

1. Go to Authentication > Users in Supabase dashboard
2. Click "Add user" 
3. Enter email and password
4. After creation, the user profile will be automatically created with 'player' role
5. Use the SQL queries above to change their role to 'host' if needed
