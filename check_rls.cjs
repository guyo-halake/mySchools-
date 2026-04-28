const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
client.connect().then(async () => {
  const res = await client.query("SELECT relrowsecurity FROM pg_class WHERE relname = 'admin_users';");
  console.log('RLS Enabled:', res.rows[0]?.relrowsecurity);
  
  const policies = await client.query("SELECT * FROM pg_policies WHERE tablename = 'admin_users';");
  console.log('Policies:', policies.rows);
}).catch(console.error).finally(() => client.end());
