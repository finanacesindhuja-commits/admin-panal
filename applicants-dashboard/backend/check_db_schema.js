const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.from('applicants').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    if (data.length > 0) {
      console.log('Columns in applicants table:', Object.keys(data[0]).join(', '));
      console.log('Sample Data:');
      console.log(data[0]);
    } else {
      console.log('Table is empty. No data found.');
    }
  }
}
checkSchema();
