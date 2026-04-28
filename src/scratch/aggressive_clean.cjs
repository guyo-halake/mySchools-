const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function aggressiveClean() {
    console.log('--- AGGRESSIVE CLEANING PHASE 2 ---');
    
    const { data: allClasses } = await supabase.from('classes').select('*');
    const levels = [1, 2, 3, 4];

    for (const level of levels) {
        const levelClasses = allClasses.filter(c => c.level === level);
        if (levelClasses.length <= 1) continue;

        // The one with the most records wins
        const master = levelClasses[0]; // Simplified for now
        const duplicates = levelClasses.filter(c => c.id !== master.id);

        for (const dupe of duplicates) {
            console.log(`Deep cleaning duplicate: ${dupe.name} (${dupe.id})`);

            // 1. Move Exams
            await supabase.from('exams').update({ class_id: master.id }).eq('class_id', dupe.id);
            
            // 2. Move Streams
            await supabase.from('streams').update({ class_id: master.id }).eq('class_id', dupe.id);
            
            // 3. Move Assignments
            await supabase.from('assignments').update({ class_id: master.id }).eq('class_id', dupe.id);

            // 4. Delete the class
            const { error } = await supabase.from('classes').delete().eq('id', dupe.id);
            if (error) {
                console.error(`  Could not delete class ${dupe.id}: ${error.message}`);
            } else {
                console.log(`  Successfully deleted class duplicate.`);
            }
        }
    }
    console.log('--- CLEANUP FINISHED ---');
}

aggressiveClean();
