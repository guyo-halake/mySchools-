const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

const JSS_AREAS = [
  { name: 'Integrated Science', category: 'JUNIOR_SECONDARY', strands: [
    { name: 'Mixtures, Elements and Compounds', subStrands: ['Separation Techniques', 'Chemical Symbols'] },
    { name: 'Living Things and Their Environment', subStrands: ['Cell Structure', 'Reproduction in Plants'] }
  ]},
  { name: 'Social Studies', category: 'JUNIOR_SECONDARY', strands: [
    { name: 'African Geography', subStrands: ['Physical Features', 'Climatic Zones'] },
    { name: 'History and Citizenship', subStrands: ['Pre-colonial Societies', 'Governance'] }
  ]},
  { name: 'Pre-Technical Studies', category: 'JUNIOR_SECONDARY', strands: [
    { name: 'Materials and Tools', subStrands: ['Hand Tools', 'Safety Precautions'] }
  ]}
];

async function seedJSS() {
  try {
    await client.connect();
    console.log('Connected to Database...');

    const schoolRes = await client.query('SELECT id FROM schools LIMIT 1');
    const schoolId = schoolRes.rows[0].id;

    for (const area of JSS_AREAS) {
      const areaRes = await client.query(`
        INSERT INTO learning_areas (school_id, name, category)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [schoolId, area.name, area.category]);
      
      let areaId = areaRes.rows[0]?.id;
      if (!areaId) {
        const check = await client.query('SELECT id FROM learning_areas WHERE name = $1 AND school_id = $2', [area.name, schoolId]);
        areaId = check.rows[0].id;
      }

      for (const strand of area.strands) {
        const strandRes = await client.query(`
          INSERT INTO cbc_strands (learning_area_id, name)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [areaId, strand.name]);
        
        let strandId = strandRes.rows[0]?.id;
        if (!strandId) {
          const check = await client.query('SELECT id FROM cbc_strands WHERE name = $1 AND learning_area_id = $2', [strand.name, areaId]);
          strandId = check.rows[0].id;
        }

        for (const sub of strand.subStrands) {
          await client.query(`
            INSERT INTO cbc_sub_strands (strand_id, name)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [strandId, sub]);
        }
      }
    }
    console.log('JSS Curriculum seeded.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

seedJSS();
