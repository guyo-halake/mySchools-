const { Client } = require('pg');
const fs = require('fs');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function generateReport() {
  try {
    await pgClient.connect();

    const schoolRes = await pgClient.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
    if (schoolRes.rows.length === 0) return;
    const schoolId = schoolRes.rows[0].id;

    let markdown = '# Current Giakanja Database State\n\n';

    // 1. Fetch Classes and their Students
    const classesRes = await pgClient.query("SELECT id, name, category, level FROM classes WHERE school_id = $1 ORDER BY level", [schoolId]);
    
    markdown += '## Classes and Students\n\n';

    for (const cls of classesRes.rows) {
      markdown += `### ${cls.name} (${cls.category})\n`;
      
      const streamsRes = await pgClient.query("SELECT id, name FROM streams WHERE class_id = $1", [cls.id]);
      for (const stream of streamsRes.rows) {
        markdown += `#### Stream: ${stream.name}\n`;
        
        const studentsRes = await pgClient.query(`
          SELECT s.adm_no, p.full_name 
          FROM students s
          JOIN profiles p ON s.id = p.id
          WHERE s.stream_id = $1
          ORDER BY s.adm_no
        `, [stream.id]);
        
        if (studentsRes.rows.length === 0) {
          markdown += `- *No students*\n`;
        } else {
          for (const student of studentsRes.rows) {
            markdown += `- ${student.adm_no}: ${student.full_name}\n`;
          }
        }
        markdown += '\n';
      }
    }

    // 2. Fetch Learning Areas
    markdown += '## Learning Areas\n\n';
    const categories = ['Pre-Primary', 'Lower Primary', 'Upper Primary', 'Junior High School'];

    for (const category of categories) {
      markdown += `### Category: ${category}\n`;
      
      const areasRes = await pgClient.query("SELECT id, name FROM learning_areas WHERE school_id = $1 AND category = $2", [schoolId, category]);
      
      if (areasRes.rows.length === 0) {
        markdown += `- *No learning areas seeded for this category.*\n\n`;
        continue;
      }

      for (const area of areasRes.rows) {
        markdown += `- **${area.name}**\n`;
        const strandsRes = await pgClient.query("SELECT id, name FROM cbc_strands WHERE learning_area_id = $1", [area.id]);
        
        for (const strand of strandsRes.rows) {
          markdown += `  - Strand: ${strand.name}\n`;
          const subStrandsRes = await pgClient.query("SELECT name FROM cbc_sub_strands WHERE strand_id = $1", [strand.id]);
          for (const sub of subStrandsRes.rows) {
            markdown += `    - Sub-Strand: ${sub.name}\n`;
          }
        }
      }
      markdown += '\n';
    }

    fs.writeFileSync('/home/razak/.gemini/antigravity/brain/fcca3c28-3560-43cb-a8bf-506a2cdd7eb8/current_database_state.md', markdown);
    console.log('Report generated successfully.');

  } catch (err) {
    console.error('Error generating report:', err);
  } finally {
    await pgClient.end();
  }
}

generateReport();
