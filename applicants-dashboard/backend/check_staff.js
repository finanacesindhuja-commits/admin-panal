const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkStaff() {
  try {
    console.log('--- Querying Staff Table ---');
    const { data, error } = await supabase.from('staff').select('staff_id, password, name');
    
    if (error) {
       console.error('❌ Supabase Error:', error.message);
       return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ NO STAFF FOUND IN DATABASE');
    } else {
      console.log(`✅ Found ${data.length} staff records:`);
      data.forEach(s => console.log(`ID: ${s.staff_id} | Pass: ${s.password} | Name: ${s.name}`));
    }
    console.log('----------------------------');
  } catch (err) {
    console.error('❌ Script Error:', err.message);
  }
}

checkStaff().then(() => process.exit(0));
