const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function runDetailedAudit() {
  try {
    await client.connect();
    
    // Get distinct count of learning areas per student, and group by class & stream
    const res = await client.query(`
      SELECT 
        st.id as student_id,
        p.full_name,
        c.name as class_name,
        s.name as stream_name,
        COUNT(DISTINCT a.learning_area_id) as assessed_la_count
      FROM students st
      JOIN profiles p ON st.id = p.id
      JOIN streams s ON st.stream_id = s.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN cbc_student_assessments a ON st.id = a.student_id
      GROUP BY st.id, p.full_name, c.name, s.name
      ORDER BY c.name, s.name, assessed_la_count DESC
    `);
    
    const students = res.rows;
    
    // We group by class_name + stream_name, and map the assessed_la_count count distribution
    const classDist = {};
    
    students.forEach(st => {
      const className = `${st.class_name} ${st.stream_name}`;
      if (!classDist[className]) {
        classDist[className] = {
          class: st.class_name,
          stream: st.stream_name,
          total_students: 0,
          distribution: {}
        };
      }
      classDist[className].total_students++;
      const count = st.assessed_la_count;
      classDist[className].distribution[count] = (classDist[className].distribution[count] || 0) + 1;
    });

    console.log('=== Assessment Completion Distribution by Class ===');
    for (let cName in classDist) {
      const c = classDist[cName];
      const distStr = Object.entries(c.distribution)
        .map(([laCount, studCount]) => `${laCount} LAs: ${studCount} students`)
        .join(', ');
      console.log(`- ${cName} (Total: ${c.total_students}): ${distStr}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

runDetailedAudit();
