
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/full system sindhuja fin/admin panal/applicants-dashboard/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectTables() {
  console.log('--- INSPECTING RECENT ACTIVITY ---');
  try {
    // 1. Get last 5 staff
    const { data: staff } = await supabase.from('staff').select('*').order('created_at', { ascending: false }).limit(5);
    console.log('Recent Staff Records:', staff);

    // 2. Get Sugumar applicant specifically
    const { data: applicant } = await supabase.from('applicants').select('*').eq('mobile', '8072534827').single();
    console.log('Sugumar (Applicant):', applicant);

  } catch (err) {
    console.error(err.message);
  }
}
inspectTables();
