const { Client } = require('pg');
const fs = require('fs');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });
async function run() {
  await client.connect();
  let output = '';
  const tables = ['students', 'cbc_student_assessments', 'cbc_projects', 'cbc_project_submissions', 'fees', 'disciplinary_records', 'exam_results'];
  for (const table of tables) {
    const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]);
    output += `Table ${table}: ` + res.rows.map(r => r.column_name).join(', ') + '\n';
  }
  fs.writeFileSync('schema_out.txt', output);
  await client.end();
}
run();
