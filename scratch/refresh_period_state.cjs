const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
(async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query(`SELECT refresh_school_period_state($1, $2, $3) AS result`, ['f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5', null, 'MANUAL_TEST']);
    console.dir(result.rows, { depth: null });
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
