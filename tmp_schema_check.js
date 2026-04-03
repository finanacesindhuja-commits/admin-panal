const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/coding/applicants-dashboard/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  const { data, error } = await supabase.from('applicants').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:');
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
      console.log('Sample Data:', data[0]);
    } else {
      console.log('No data found');
    }
  }
}
checkSchema();
