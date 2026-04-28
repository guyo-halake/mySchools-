const { Client } = require('pg');
const fs = require('fs');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
  await c.connect();

  const sql = fs.readFileSync('.\\supabase\\migrations\\20260416_classroom_upload_metadata.sql', 'utf8');
  await c.query(sql);

  const cols = await c.query(`
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema='public'
      and table_name in ('classroom_notes','classroom_recordings')
      and column_name in ('stream_id','class_id','subject_id','audience_scope','target_student_ids','uploaded_by_name','uploaded_at')
    order by table_name, column_name
  `);

  console.log(JSON.stringify(cols.rows, null, 2));
  await c.end();
})().catch((e)=>{console.error(e);process.exit(1)});
