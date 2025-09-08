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

export async function getSample<T extends (keyof DefaultSchema["Tables"])>(tableName: T): Promise<Tables<T>[]> {
  console.log(`🃏 Fetching sample ${tableName}...`);

  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .limit(5);

  if (error) {
    console.error(`❌ Failed to fetch ${tableName}:`, error.message);
    return [];
  }

  console.log(`✅ Fetched ${data?.length || 0} sample ${tableName}`);
  return (data as Tables<T>[]) || [];
}

// Run all tests
export async function runDatabaseTests() {
  console.log("🚀 Running database tests...");

  const connectionOk = await testDatabaseConnection();
  if (!connectionOk) {
    console.log("❌ Database tests failed - connection issues");
    return;
  }

  const samples = await Promise.all(TABLE_NAMES.map((tableName) => getSample(tableName)));

  console.log("📊 Database test results:");
  TABLE_NAMES.forEach((tableName, index) => {
    console.log(`- ${tableName}: ${samples[index].length} samples`);
  });

  if (samples[0].length > 0) {
    const sampleElement = samples[0][0];
    const keys = Object.keys(sampleElement).slice(0, 3); // Show first 3 properties
    const preview = keys.reduce<Record<string, unknown>>((obj, key) => {
      obj[key] = sampleElement[key as keyof typeof sampleElement];
      return obj;
    }, {});
    console.log("🃏 Sample element:", JSON.stringify(preview, null, 2));
  }

  console.log("✅ Database tests completed!");
}
