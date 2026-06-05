const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

const CURRICULUM = {
  'Pre-Primary': [
    { 
      name: 'Language Activities', 
      strands: [
        { name: 'Listening', sub_strands: ['Sound discrimination', 'Following instructions'] },
        { name: 'Speaking', sub_strands: ['Naming objects', 'Reciting poems'] }
      ] 
    },
    { 
      name: 'Mathematical Activities', 
      strands: [
        { name: 'Classification', sub_strands: ['Sorting by color', 'Sorting by shape'] },
        { name: 'Numbers', sub_strands: ['Counting 1-10', 'Number recognition'] }
      ] 
    }
  ],
  'Lower Primary': [
    { 
      name: 'Mathematics Activities', 
      strands: [
        { name: 'Numbers', sub_strands: ['Addition', 'Subtraction', 'Place Value'] },
        { name: 'Measurement', sub_strands: ['Length', 'Mass', 'Capacity'] }
      ] 
    },
    { 
      name: 'English Language', 
      strands: [
        { name: 'Reading', sub_strands: ['Phonics', 'Vocabulary', 'Comprehension'] },
        { name: 'Writing', sub_strands: ['Handwriting', 'Spelling'] }
      ] 
    }
  ],
  'Upper Primary': [
    { 
      name: 'Mathematics', 
      strands: [
        { name: 'Numbers', sub_strands: ['Fractions', 'Decimals', 'Multiplication'] },
        { name: 'Geometry', sub_strands: ['Angles', '2D Shapes'] }
      ] 
    },
    { 
      name: 'Science and Technology', 
      strands: [
        { name: 'Living Things', sub_strands: ['Human Body', 'Plants'] },
        { name: 'Environment', sub_strands: ['Water pollution', 'Soil conservation'] }
      ] 
    }
  ],
  'Junior High School': [
    { 
      name: 'Integrated Science', 
      strands: [
        { name: 'Scientific Inquiry', sub_strands: ['Laboratory safety', 'Basic apparatus'] },
        { name: 'Health Education', sub_strands: ['First Aid', 'Personal Hygiene'] }
      ] 
    },
    { 
      name: 'Pre-Technical Studies', 
      strands: [
        { name: 'Foundations', sub_strands: ['Safety in workshop', 'Tools and equipment'] },
        { name: 'Business', sub_strands: ['Entrepreneurship basics', 'Money management'] }
      ] 
    }
  ]
};

async function seedCurriculum() {
  try {
    await pgClient.connect();
    console.log('Connected to DB...');

    const schoolRes = await pgClient.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
    const schoolId = schoolRes.rows[0].id;
    console.log(`Targeting School ID: ${schoolId}`);

    // Wipe old learning areas to ensure clean slate
    await pgClient.query("DELETE FROM learning_areas WHERE school_id = $1", [schoolId]);
    console.log('Cleared old curriculum data.');

    let areaCount = 0;
    let strandCount = 0;
    let subStrandCount = 0;

    for (const [category, areas] of Object.entries(CURRICULUM)) {
      for (const area of areas) {
        const areaId = crypto.randomUUID();
        
        await pgClient.query(`
          INSERT INTO learning_areas (id, school_id, name, category, active)
          VALUES ($1, $2, $3, $4, true)
        `, [areaId, schoolId, area.name, category]);
        areaCount++;

        for (const strand of area.strands) {
          const strandId = crypto.randomUUID();
          
          await pgClient.query(`
            INSERT INTO cbc_strands (id, learning_area_id, name)
            VALUES ($1, $2, $3)
          `, [strandId, areaId, strand.name]);
          strandCount++;

          for (const sub of strand.sub_strands) {
            await pgClient.query(`
              INSERT INTO cbc_sub_strands (id, strand_id, name)
              VALUES ($1, $2, $3)
            `, [crypto.randomUUID(), strandId, sub]);
            subStrandCount++;
          }
        }
      }
      console.log(`✓ Seeded ${category}`);
    }

    console.log('--- CURRICULUM SEEDING COMPLETE ---');
    console.log(`Learning Areas: ${areaCount}`);
    console.log(`Strands: ${strandCount}`);
    console.log(`Sub-Strands: ${subStrandCount}`);

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await pgClient.end();
  }
}

seedCurriculum();
