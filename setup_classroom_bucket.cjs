const { createClient } = require("@supabase/supabase-js");

const url = "https://vomsaqkhtturzqfuwxsn.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5OTQyNTI0NSwiZXhwIjoyMDE5MDA1MjQ1fQ.BnYDNhZ8IB8D9xQlHLqNKdagpPqsVYX1PHUvQM7bvIg";

const supabase = createClient(url, serviceKey);

(async () => {
  try {
    console.log("Creating 'classroom-files' storage bucket...");
    const { data, error } = await supabase.storage.createBucket("classroom-files", {
      public: true,
      fileSizeLimit: 524288000, // 500MB
    });

    if (error) {
      if (error.message.includes("already exists")) {
        console.log("✅ Bucket 'classroom-files' already exists");
      } else {
        throw error;
      }
    } else {
      console.log("✅ Bucket 'classroom-files' created successfully");
      console.log("Bucket details:", data);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
