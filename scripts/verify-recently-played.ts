import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyRecentlyPlayedTable() {
  try {
    console.log("Checking if recently_played table exists...")

    // Try to query the table
    const { data, error } = await supabase.from("recently_played").select("count", { count: "exact", head: true })

    if (error) {
      console.error("Table does not exist or error occurred:", error.message)
      console.log("You need to run the SQL migration: scripts/003_create_recently_played.sql")
      console.log("Go to your Supabase dashboard and run the SQL in the SQL Editor")
      return false
    }

    console.log("✓ recently_played table exists!")
    return true
  } catch (error) {
    console.error("Error checking table:", error)
    return false
  }
}

verifyRecentlyPlayedTable().then((exists) => {
  if (!exists) {
    console.log("\nSETUP REQUIRED:")
    console.log("1. Go to your Supabase dashboard")
    console.log("2. Open the SQL Editor")
    console.log("3. Copy and paste the contents of scripts/003_create_recently_played.sql")
    console.log("4. Click 'Run' to execute the migration")
    console.log("5. Refresh your app and try playing a song")
  }
  process.exit(exists ? 0 : 1)
})
