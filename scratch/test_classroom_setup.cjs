// Test classroom_notes RLS and storage
const { createClient } = require("@supabase/supabase-js");

const url = "https://vomsaqkhtturzqfuwxsn.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk0MjUyNDUsImV4cCI6MjAxOTAwNTI0NX0.sKbU_O_1rjqL2WMXrmLDDWR8sKT1WRnDBwB4T-FWSJA";

const client = createClient(url, anonKey);

(async () => {
  try {
    const schoolId = "f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5";
    
    // Test 1: Check if classroom_notes table is accessible
    console.log("TEST 1: Checking classroom_notes table access...");
    const { data: notes, error: notesErr } = await client
      .from("classroom_notes")
      .select("id")
      .eq("school_id", schoolId)
      .limit(1);
    
    if (notesErr) {
      console.log("❌ SELECT failed:", notesErr.message);
    } else {
      console.log("✅ SELECT works. Found", notes.length, "existing notes");
    }

    // Test 2: Try inserting a test policy
    console.log("\nTEST 2: Attempting test INSERT into classroom_notes...");
    const { data: inserted, error: insertErr } = await client
      .from("classroom_notes")
      .insert({
        school_id: schoolId,
        session_id: "test-session-123",
        teacher_id: "test-teacher-id",
        title: "Test Note",
        note_type: "PDF",
        content: "test",
        file_url: "https://example.com/test.pdf"
      })
      .select();
    
    if (insertErr) {
      console.log("❌ INSERT failed:", insertErr.message);
      console.log("   Details:", insertErr.details || insertErr.hint);
    } else {
      console.log("✅ INSERT successful:", inserted);
      // Clean up
      if (inserted[0]) {
        await client.from("classroom_notes").delete().eq("id", inserted[0].id);
        console.log("   Cleaned up test record");
      }
    }

    // Test 3: Check bucket list
    console.log("\nTEST 3: Checking storage buckets...");
    const { data: buckets, error: bucketErr } = await client.storage.listBuckets();
    if (bucketErr) {
      console.log("❌ Failed to list buckets:", bucketErr.message);
    } else {
      console.log("✅ Available buckets:");
      buckets.forEach(b => console.log(`   - ${b.name}`));
    }

  } catch (e) {
    console.error("Fatal error:", e.message);
    process.exit(1);
  }
})();
