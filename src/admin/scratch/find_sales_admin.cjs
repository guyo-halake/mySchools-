const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function findSalesAdmin() {
  try {
    await client.connect();
    const res = await client.query("SELECT email, password FROM admin_users WHERE admin_role = 'SALES_ADMIN' LIMIT 1");
    if (res.rows.length > 0) {
      console.log('CREDENTIALS_FOUND');
      console.log('Email:', res.rows[0].email);
      console.log('Password:', res.rows[0].password);
    } else {
      console.log('No Sales Admin found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

findSalesAdmin();
