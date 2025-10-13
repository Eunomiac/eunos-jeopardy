import { supabase } from "./client";
import type { Tables, Database } from "./types";

/**
 * Simple database connectivity tests
 * These functions can be used to verify the database connection and schema
 */

const TABLE_NAMES = [
  "profiles",
  "games",
  "players",
  "clue_sets",
  "boards",
  "categories",
  "clues",
] as const;
type DefaultSchema = Database[Extract<keyof Database, "public">];

export async function testDatabaseConnection() {
  console.log("🔍 Testing database connection...");

  try {
    // Test basic connection
    const { error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error("❌ Auth connection failed:", authError.message);
      return false;
    }
    console.log("✅ Auth connection successful");

    // Test database query - get count of elements in a table
    const { count, error: countError } = await supabase
      .from(TABLE_NAMES[0])
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Database query failed:", countError.message);
      return false;
    }

    console.log(
      `✅ Database query successful - Found ${count} elements in ${TABLE_NAMES[0]} database`
    );
    return true;
  } catch (error) {
    console.error("❌ Connection test failed:", error);
    return false;
  }
}

export async function getSample<T extends keyof DefaultSchema["Tables"]>(
  tableName: T
): Promise<Tables<T>[]> {
  console.log(`🃏 Fetching sample ${tableName}...`);

  const { data, error } = await supabase.from(tableName).select("*").limit(5);

  if (error) {
    console.error(`❌ Failed to fetch ${tableName}:`, error.message);
    return [];
  }

  console.log(`✅ Fetched ${data.length || 0} sample ${tableName}`);
  return data as Tables<T>[];
}

/**
 * Test authentication with our test users
 */
export async function testAuthUsers(): Promise<void> {
  console.log("🔐 Testing authentication with test users...\n");

  const testUsers = [
    { email: "host@test.com", password: "1234" },
    { email: "player1@test.com", password: "1234" },
    { email: "player2@test.com", password: "1234" },
  ];

  for (const testUser of testUsers) {
    console.log(`🧪 Testing login for: ${testUser.email}`);

    try {
      // Test login
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password,
        });

      if (authError) {
        console.log(`   ❌ Login failed: ${authError.message}`);
      } else {
        console.log(`   ✅ Login successful`);
      }
      console.log(`   User ID: ${authData.user?.id}`);

      // Test profile access (RLS policy check)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user?.id ?? "")
        .single();

      if (profileError) {
        console.log(`   ⚠️  Profile access: ${profileError.message}`);
      } else {
        console.log(`   ✅ Profile access working`);
        console.log(`   Profile: ${JSON.stringify(profileData, null, 2)}`);
      }

      // Test that user can't access other profiles (RLS security check)
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from("profiles")
        .select("*");

      if (allProfilesError) {
        console.log(`   ⚠️  RLS test failed: ${allProfilesError.message}`);
      } else {
        console.log(
          `   🔒 RLS Policy Check: Can see ${allProfiles.length} profile(s) (should be 1 - their own)`
        );
      }

      // Logout
      await supabase.auth.signOut();
      console.log(`   🚪 Logged out\n`);
    } catch (error) {
      console.log(`   ❌ Test failed: ${String(error)}`);
    }
  }
}

// Run all tests
export async function runDatabaseTests() {
  console.log("🚀 Running database tests...");

  const connectionOk = await testDatabaseConnection();
  if (!connectionOk) {
    console.log("❌ Database tests failed - connection issues");
    return;
  }

  const samples = await Promise.all(
    TABLE_NAMES.map((tableName) => getSample(tableName))
  );

  console.log("📊 Database test results:");
  TABLE_NAMES.forEach((tableName, index) => {
    console.log(`- ${tableName}: ${samples[index]?.length ?? "No"} samples`);
  });

  if ((samples[0]?.length ?? 0) > 0) {
    const sampleElement = samples[0]?.[0];
    const keys = Object.keys(sampleElement ?? {}).slice(0, 3); // Show first 3 properties
    const preview = keys.reduce<Record<string, unknown>>((obj, key) => {
      obj[key] = sampleElement?.[key as keyof typeof sampleElement];
      return obj;
    }, {});
    console.log("🃏 Sample element:", JSON.stringify(preview, null, 2));
  }

  console.log("✅ Database tests completed!");
}
