const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function test() {
  try {
    await pgClient.connect();
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5'; // Giakanja Boys High School
    
    console.log('Testing getArrearsByStream logic...');
    
    // 1. Get streams
    const streamsRes = await pgClient.query('SELECT s.id, s.name, c.name as class_name FROM streams s JOIN classes c ON s.class_id = c.id WHERE s.school_id = $1', [schoolId]);
    const streams = streamsRes.rows;
    console.log(`Found ${streams.length} streams.`);

    // 2. Get students
    const studentsRes = await pgClient.query('SELECT id, stream_id FROM students WHERE school_id = $1', [schoolId]);
    const students = studentsRes.rows;
    console.log(`Found ${students.length} students.`);

    // 3. Get fees
    const feesRes = await pgClient.query('SELECT student_id, amount_due, amount_paid FROM fees WHERE school_id = $1', [schoolId]);
    const fees = feesRes.rows;
    console.log(`Found ${fees.length} fees.`);

    // 4. Map students to streams
    const studentToStream = new Map(students.map(s => [s.id, s.stream_id]));
    
    // 5. Calculate per stream
    const metrics = new Map();
    streams.forEach(s => metrics.set(s.id, { name: s.name, className: s.class_name, due: 0, paid: 0 }));

    fees.forEach(f => {
      const streamId = studentToStream.get(f.student_id);
      if (streamId && metrics.has(streamId)) {
        const m = metrics.get(streamId);
        m.due += Number(f.amount_due || 0);
        m.paid += Number(f.amount_paid || 0);
      } else {
        // console.log(`Fee for student ${f.student_id} has no matching stream ${streamId}`);
      }
    });

    const results = Array.from(metrics.values()).map(m => ({
      name: `${m.className} ${m.name}`,
      due: m.due,
      paid: m.paid,
      arrears: m.due - m.paid
    }));

    console.table(results);

  } catch (e) {
    console.error(e);
  } finally {
    await pgClient.end();
  }
}

test();
