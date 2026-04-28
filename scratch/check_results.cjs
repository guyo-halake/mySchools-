
const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkResults() {
    const { data: results, error } = await supabase
        .from('exam_results')
        .select(`
            marks,
            exam:exams (
                name,
                type,
                term:terms (
                    name,
                    year
                )
            ),
            subject:subjects (
                name
            )
        `)
        .limit(20);

    if (error) {
        console.error(error);
        return;
    }

    console.log(JSON.stringify(results, null, 2));
}

checkResults();
