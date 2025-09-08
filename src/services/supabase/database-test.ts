import { supabase } from "./client";
import type { Tables, Database } from "./types";

/**
 * Simple database connectivity tests
 * These functions can be used to verify the database connection and schema
 */

const TABLE_NAMES = ["profiles", "games", "players", "question_sets", "boards", "categories", "clues"] as const;
type DefaultSchema = Database[Extract<keyof Database, "public">]

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

    console.log(`✅ Database query successful - Found ${count} elements in ${TABLE_NAMES[0]} database`);
    return true;

  } catch (error) {
    console.error("❌ Connection test failed:", error);
    return false;
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSample(tableName: keyof DefaultSchema["Tables"] & DefaultSchema["Views"]): Promise<Tables<any>[]> {
  console.log(`🃏 Fetching sample ${tableName}...`);

  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .limit(5);

  if (error) {
    console.error(`❌ Failed to fetch ${tableName}:`, error.message);
    return [];
  }

  console.log(`✅ Fetched ${data.length} sample ${tableName}`);
  return data;
}

// Run all tests
export async function runDatabaseTests() {
  console.log("🚀 Running database tests...");

  const connectionOk = await testDatabaseConnection();
  if (!connectionOk) {
    console.log("❌ Database tests failed - connection issues");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const samples = await Promise.all(TABLE_NAMES.map(tableName => getSample(tableName))) as any[][]

  console.log("📊 Database test results:");
  TABLE_NAMES.forEach((tableName, index) => {
    console.log(`- ${tableName}: ${samples[index].length} samples`);
  });

  if (samples[0].length > 0) {
    console.log("🃏 Sample element:", samples[0][0].name);
  }

  console.log("✅ Database tests completed!");
}
