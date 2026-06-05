const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

const CURRICULUM = {
  'Pre-Primary': [
    { name: 'Language Activities', strands: [{ name: 'Listening', sub_strands: ['Sound discrimination', 'Following instructions'] }, { name: 'Speaking', sub_strands: ['Naming objects', 'Reciting poems'] }, { name: 'Pre-reading', sub_strands: ['Visual discrimination', 'Left to right orientation'] }] },
    { name: 'Mathematical Activities', strands: [{ name: 'Classification', sub_strands: ['Sorting by color', 'Sorting by shape'] }, { name: 'Numbers', sub_strands: ['Counting 1-10', 'Number recognition'] }] },
    { name: 'Environmental Activities', strands: [{ name: 'Environment', sub_strands: ['Weather', 'Soil'] }, { name: 'Caring for plants', sub_strands: ['Watering', 'Weeding'] }] },
    { name: 'Psychomotor and Creative Activities', strands: [{ name: 'Art', sub_strands: ['Drawing', 'Painting'] }, { name: 'Physical Play', sub_strands: ['Running', 'Jumping'] }] },
    { name: 'Religious Education Activities', strands: [{ name: 'Creation', sub_strands: ['Gods creation', 'Self awareness'] }, { name: 'Worship', sub_strands: ['Prayers', 'Songs'] }] }
  ],
  'Lower Primary': [
    { name: 'Literacy Activities', strands: [{ name: 'Reading', sub_strands: ['Phonemic awareness', 'Vocabulary'] }] },
    { name: 'Kiswahili Language', strands: [{ name: 'Kusikiliza', sub_strands: ['Matamshi', 'Maagizo'] }, { name: 'Kusoma', sub_strands: ['Silabi', 'Maneno'] }] },
    { name: 'English Language', strands: [{ name: 'Reading', sub_strands: ['Phonics', 'Vocabulary', 'Comprehension'] }, { name: 'Writing', sub_strands: ['Handwriting', 'Spelling'] }] },
    { name: 'Mathematics Activities', strands: [{ name: 'Numbers', sub_strands: ['Addition', 'Subtraction', 'Place Value'] }, { name: 'Measurement', sub_strands: ['Length', 'Mass', 'Capacity'] }] },
    { name: 'Environmental Activities', strands: [{ name: 'Weather', sub_strands: ['Types of weather', 'Dressing for weather'] }] },
    { name: 'Hygiene and Nutrition Activities', strands: [{ name: 'Healthy Eating', sub_strands: ['Food groups', 'Clean water'] }, { name: 'Personal Hygiene', sub_strands: ['Hand washing', 'Teeth brushing'] }] },
    { name: 'Religious Education Activities', strands: [{ name: 'Holy Books', sub_strands: ['Bible stories', 'Quran stories'] }] }
  ],
  'Upper Primary': [
    { name: 'English', strands: [{ name: 'Reading', sub_strands: ['Fluency', 'Comprehension'] }, { name: 'Grammar', sub_strands: ['Nouns', 'Verbs'] }] },
    { name: 'Kiswahili', strands: [{ name: 'Kusoma', sub_strands: ['Ufahamu', 'Msamiati'] }, { name: 'Sarufi', sub_strands: ['Ngeli', 'Nyakati'] }] },
    { name: 'Mathematics', strands: [{ name: 'Numbers', sub_strands: ['Fractions', 'Decimals', 'Multiplication'] }, { name: 'Geometry', sub_strands: ['Angles', '2D Shapes'] }] },
    { name: 'Home Science', strands: [{ name: 'Healthy Living', sub_strands: ['Nutrition', 'First Aid'] }] },
    { name: 'Agriculture', strands: [{ name: 'Crop Production', sub_strands: ['Soil preparation', 'Planting'] }] },
    { name: 'Science and Technology', strands: [{ name: 'Living Things', sub_strands: ['Human Body', 'Plants'] }, { name: 'Matter', sub_strands: ['Properties of matter', 'Changes in state'] }] },
    { name: 'Physical and Health Education', strands: [{ name: 'Athletics', sub_strands: ['Sprints', 'Relays'] }] },
    { name: 'Social Studies', strands: [{ name: 'Citizenship', sub_strands: ['Rights', 'Responsibilities'] }] },
    { name: 'Religious Education', strands: [{ name: 'Faith', sub_strands: ['Beliefs', 'Practices'] }] }
  ],
  'Junior High School': [
    { name: 'English', strands: [{ name: 'Listening and Speaking', sub_strands: ['Debate', 'Public speaking'] }, { name: 'Reading', sub_strands: ['Intensive reading', 'Extensive reading'] }] },
    { name: 'Kiswahili', strands: [{ name: 'Kusikiliza na Kuzungumza', sub_strands: ['Mijadala', 'Hotuba'] }, { name: 'Fasihi', sub_strands: ['Fasihi simulizi', 'Fasihi andishi'] }] },
    { name: 'Mathematics', strands: [{ name: 'Algebra', sub_strands: ['Linear equations', 'Inequalities'] }, { name: 'Geometry', sub_strands: ['Pythagoras theorem', 'Polygons'] }] },
    { name: 'Integrated Science', strands: [{ name: 'Scientific Inquiry', sub_strands: ['Laboratory safety', 'Basic apparatus'] }, { name: 'Human Body Systems', sub_strands: ['Digestive system', 'Respiratory system'] }] },
    { name: 'Pre-Technical Studies', strands: [{ name: 'Foundations', sub_strands: ['Safety in workshop', 'Tools and equipment'] }, { name: 'Business', sub_strands: ['Entrepreneurship basics', 'Money management'] }] },
    { name: 'Social Studies', strands: [{ name: 'History', sub_strands: ['Early man', 'Trade'] }, { name: 'Geography', sub_strands: ['Map reading', 'Physical features'] }] },
    { name: 'Religious Education', strands: [{ name: 'Morality', sub_strands: ['Values', 'Ethics'] }] },
    { name: 'Agriculture and Nutrition', strands: [{ name: 'Food Security', sub_strands: ['Crop farming', 'Livestock keeping'] }] },
    { name: 'Creative Arts and Sports', strands: [{ name: 'Visual Arts', sub_strands: ['Drawing', 'Sculpture'] }, { name: 'Sports', sub_strands: ['Ball games', 'Athletics'] }] }
  ]
};

async function seedCurriculum() {
  try {
    await pgClient.connect();
    console.log('Connected to DB...');

    const schoolRes = await pgClient.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
    const schoolId = schoolRes.rows[0].id;

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
      console.log(`✓ Seeded full uncut ${category}`);
    }

    console.log(`--- FULL UNCUT CURRICULUM SEEDING COMPLETE ---`);
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
