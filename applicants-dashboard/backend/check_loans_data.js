require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkLoans() {
  console.log('Fetching loans with status not PENDING...');
  const { data, error } = await supabase
    .from('loans')
    .select('id, status, verifier_id, verified_at, updated_at')
    .neq('status', 'PENDING')
    .limit(5);
    
  if (error) {
    console.error('Error fetching loans:', error);
  } else {
    console.log('Loans data:', JSON.stringify(data, null, 2));
  }
}

checkLoans();
