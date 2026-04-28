const { createClient } = require("@supabase/supabase-js");
const url = "https://vomsaqkhtturzqfuwxsn.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk0MjUyNDUsImV4cCI6MjAxOTAwNTI0NX0.sKbU_O_1rjqL2WMXrmLDDWR8sKT1WRnDBwB4T-FWSJA";
const supabase = createClient(url, key);
(async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    console.log("BUCKETS:");
    data.forEach(b => console.log(`  ${b.name}`));
  } catch (e) {
    console.error("ERROR:", e.message);
    process.exit(1);
  }
})();
