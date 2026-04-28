// Check the terms table schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    // Fetch one term with all columns to see structure
    const { data: term, error } = await supabase
      .from('terms')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;

    console.log('=== TERMS TABLE SCHEMA ===\n');
    console.log('Available columns:');
    Object.keys(term).forEach(col => {
      const value = term[col];
      const type = typeof value;
      console.log(`  • ${col}: ${type} = ${JSON.stringify(value)}`);
    });

    // Try to get the actual RLS-hidden schema info
    console.log('\n\n=== CHECKING INFORMATION_SCHEMA ===\n');
    const { data: schema, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'terms' })
      .catch(() => null);

    if (!schema) {
      console.log('Could not fetch detailed schema via RPC');
    }

    // Try to see if there's created_by or user_id
    const { data: allTerms } = await supabase
      .from('terms')
      .select('*');

    const sampleTerm = allTerms[0];
    console.log('\nSample term structure:');
    console.log(JSON.stringify(sampleTerm, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
