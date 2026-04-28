const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function consolidate() {
    console.log('--- STARTING AGGRESSIVE DATA CONSOLIDATION ---');
    
    const { data: allClasses } = await supabase.from('classes').select('*');
    const { data: allStreams } = await supabase.from('streams').select('*');
    
    if (!allClasses || !allStreams) {
        console.error('Failed to fetch base data');
        return;
    }

    const levels = [1, 2, 3, 4];

    for (const level of levels) {
        const levelClasses = allClasses.filter(c => c.level === level);
        if (levelClasses.length <= 1) continue;

        console.log(`Cleaning Form ${level}...`);
        
        // Pick the one with the most streams as master
        const master = levelClasses.sort((a, b) => {
            const aS = allStreams.filter(s => s.class_id === a.id).length;
            const bS = allStreams.filter(s => s.class_id === b.id).length;
            return bS - aS;
        })[0];

        const duplicates = levelClasses.filter(c => c.id !== master.id);

        for (const dupe of duplicates) {
            console.log(`  Merging duplicate class ${dupe.name} (${dupe.id}) into master ${master.id}`);
            
            // Move streams
            const { error: moveError } = await supabase.from('streams').update({ class_id: master.id }).eq('class_id', dupe.id);
            if (moveError) console.error('  Error moving streams:', moveError);
            
            // Delete duplicate class
            const { error: delError } = await supabase.from('classes').delete().eq('id', dupe.id);
            if (delError) console.error('  Error deleting class:', delError);
        }
    }

    console.log('--- CLEANING DUPLICATE STREAMS ---');
    const { data: latestStreams } = await supabase.from('streams').select('*');
    const { data: latestClasses } = await supabase.from('classes').select('*');

    for (const level of levels) {
        // Find which class ID is the master for this level now
        const levelClass = latestClasses.find(c => c.level === level);
        if (!levelClass) continue;

        const levelStreams = latestStreams.filter(s => s.class_id === levelClass.id);
        const seenNames = {};

        for (const s of levelStreams) {
            if (seenNames[s.name]) {
                const masterS = seenNames[s.name];
                console.log(`  Merging duplicate stream ${s.name} (${s.id}) into master (${masterS.id})`);
                
                // Move students
                await supabase.from('students').update({ stream_id: masterS.id }).eq('stream_id', s.id);
                // Move results
                await supabase.from('exam_results').update({ stream_id: masterS.id }).eq('stream_id', s.id);
                // Delete duplicate stream
                await supabase.from('streams').delete().eq('id', s.id);
            } else {
                seenNames[s.name] = s;
            }
        }
    }

    console.log('--- CONSOLIDATION COMPLETE ---');
}

consolidate();
