const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log('--- INSPECTING STAFF LOCATIONS TABLE ---');
  const { data, error } = await supabase
    .from('staff_locations')
    .select('*')
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log(`Records fetched: ${data.length}`);
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
      data.forEach(r => console.log(JSON.stringify(r)));
    } else {
      console.log('No records found.');
    }
  }
}
checkSchema();
